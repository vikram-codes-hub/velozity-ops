/**
 * src/routes/ai.routes.ts
 *
 * AI-powered endpoints:
 *   POST /api/ai/project-summary/:id  — natural-language project status report
 *   POST /api/ai/task-description     — auto-fill task description from title
 *   POST /api/ai/chat                 — assistant chat with live DB context
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ApiError } from '../middleware/errorHandler';
import { generateWithFallback } from '../lib/ai';

const router = Router();

// ── Schemas ───────────────────────────────────────────────────────────────────

const idParamSchema = z.object({ id: z.string().uuid() });

const taskDescriptionBodySchema = z.object({
  title: z.string().min(1),
  projectName: z.string().optional(),
});

const chatBodySchema = z.object({
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

// ── POST /api/ai/project-summary/:id ─────────────────────────────────────────

router.post(
  '/project-summary/:id',
  requireAuth,
  requireRole('ADMIN', 'PM'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;

      // Scope check: PM can only summarise their own projects
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          client: { select: { name: true } },
          createdBy: { select: { name: true } },
          _count: { select: { tasks: true } },
        },
      });

      if (!project) throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
      if (req.user!.role === 'PM' && project.createdById !== req.user!.id) {
        throw new ApiError(403, 'FORBIDDEN', 'Access denied.');
      }

      // Fetch task breakdown
      const tasks = await prisma.task.findMany({
        where: { projectId: id },
        select: {
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assignedTo: { select: { name: true } },
        },
      });

      const statusCounts = tasks.reduce<Record<string, number>>((acc, t) => {
        acc[t.status] = (acc[t.status] ?? 0) + 1;
        return acc;
      }, {});

      const overdueTasks = tasks.filter((t) => t.status === 'OVERDUE');
      const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS');
      const doneTasks = tasks.filter((t) => t.status === 'DONE');
      const totalTasks = tasks.length;
      const completionPct = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

      const assignees = [...new Set(tasks.map((t) => t.assignedTo?.name).filter(Boolean))];

      const prompt = `
You are a senior project management analyst. Write a concise, professional 2–3 sentence status report for the following project. Be specific with numbers. End with a one-word health label: "On Track", "At Risk", or "Critical".

Project: "${project.name}"
Client: ${project.client?.name ?? 'N/A'}
PM: ${project.createdBy?.name ?? 'N/A'}
Total Tasks: ${totalTasks}
Completion: ${completionPct}%
Status breakdown: ${JSON.stringify(statusCounts)}
Overdue tasks: ${overdueTasks.length} (${overdueTasks.map((t) => `"${t.title}"`).join(', ') || 'none'})
In-progress tasks: ${inProgressTasks.length}
Assigned developers: ${assignees.join(', ') || 'None assigned'}

Write only the status report paragraph. No headers, no bullet points.`.trim();

      let text = '';
      let provider = 'ai';
      let keyIndex = 1;

      try {
        const result = await generateWithFallback(prompt);
        text = result.text.trim();
        provider = result.provider;
        keyIndex = result.keyIndex;
      } catch (aiErr) {
        console.warn('[AI] LLM failed, using intelligent status summary fallback');
        const health = overdueTasks.length > 2 ? 'Critical' : overdueTasks.length > 0 ? 'At Risk' : 'On Track';
        text = `Project "${project.name}" is currently ${completionPct}% complete with ${doneTasks.length} of ${totalTasks} tasks finished (${inProgressTasks.length} in progress, ${overdueTasks.length} overdue). Active team members include ${assignees.join(', ') || 'none assigned'}. Health: ${health}`;
        provider = 'system';
      }

      res.json({
        summary: text,
        provider,
        keyIndex,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/ai/task-description ─────────────────────────────────────────────

router.post(
  '/task-description',
  requireAuth,
  requireRole('ADMIN', 'PM'),
  validate({ body: taskDescriptionBodySchema }),
  async (req, res, next) => {
    try {
      const { title, projectName } = req.body as z.infer<typeof taskDescriptionBodySchema>;

      const prompt = `
You are a senior software project manager. Write a clear, professional task description for the following task.

Task title: "${title}"
${projectName ? `Project: "${projectName}"` : ''}

Write 2–4 sentences covering:
1. What needs to be done
2. Acceptance criteria (what "done" looks like)
3. Any dependencies or notes if relevant

Keep it concise and actionable. No bullet points — write in plain prose.`.trim();

      let text = '';
      let provider = 'ai';

      try {
        const result = await generateWithFallback(prompt);
        text = result.text.trim();
        provider = result.provider;
      } catch (aiErr) {
        console.warn('[AI] LLM failed, using task description template fallback');
        text = `Implement and deliver "${title}"${projectName ? ` for project "${projectName}"` : ''}. Ensure implementation is verified, edge cases are handled, and code is reviewed before mark as completed.`;
        provider = 'system';
      }

      res.json({
        description: text,
        provider,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────

router.post(
  '/chat',
  requireAuth,
  requireRole('ADMIN', 'PM'),
  validate({ body: chatBodySchema }),
  async (req, res, next) => {
    try {
      const { message, history } = req.body as z.infer<typeof chatBodySchema>;

      // Gather live context for this user's accessible data
      const projectWhere =
        req.user!.role === 'PM' ? { createdById: req.user!.id } : {};

      const projects = await prisma.project.findMany({
        where: projectWhere,
        include: {
          client: { select: { name: true } },
          createdBy: { select: { name: true } },
          _count: { select: { tasks: true } },
        },
      });

      const projectIds = projects.map((p) => p.id);

      const [taskGroups, recentActivity] = await Promise.all([
        prisma.task.groupBy({
          by: ['projectId', 'status'],
          where: { projectId: { in: projectIds } },
          _count: { id: true },
        }),
        prisma.activityLog.findMany({
          where: { projectId: { in: projectIds } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            action: true,
            toValue: true,
            createdAt: true,
            user: { select: { name: true } },
            project: { select: { name: true } },
          },
        }),
      ]);

      // Build task-count map per project
      const taskMap: Record<string, Record<string, number>> = {};
      for (const row of taskGroups) {
        if (!taskMap[row.projectId]) taskMap[row.projectId] = {};
        taskMap[row.projectId][row.status] = row._count.id;
      }

      const projectSummaries = projects.map((p) => {
        const counts = taskMap[p.id] ?? {};
        return {
          name: p.name,
          client: p.client?.name,
          pm: p.createdBy?.name,
          total: p._count.tasks,
          done: counts['DONE'] ?? 0,
          inProgress: counts['IN_PROGRESS'] ?? 0,
          overdue: counts['OVERDUE'] ?? 0,
          todo: counts['TODO'] ?? 0,
        };
      });

      const contextBlock = `
=== LIVE PROJECT DATA ===
${JSON.stringify(projectSummaries, null, 2)}

=== RECENT ACTIVITY (last 10 events) ===
${recentActivity.map((a) => `[${a.createdAt.toISOString().slice(0, 10)}] ${a.user?.name ?? 'System'} → ${a.action} on "${a.project?.name ?? 'N/A'}": ${a.toValue ?? ''}`).join('\n')}
=========================`.trim();

      // Build conversation history for prompt
      const historyBlock = history
        .slice(-6) // last 3 turns each side
        .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
        .join('\n');

      const prompt = `
You are an intelligent project management assistant for Velozity Ops. You have access to live project data below. Answer the user's question concisely and accurately using that data. Be specific — cite project names and numbers. Keep answers under 4 sentences unless detail is requested.

${contextBlock}

${historyBlock ? `=== CONVERSATION HISTORY ===\n${historyBlock}\n===========================\n` : ''}
User: ${message}
Assistant:`.trim();

      let replyText = '';
      let providerName = 'ai';

      try {
        const result = await generateWithFallback(prompt);
        replyText = result.text.trim();
        providerName = result.provider;
      } catch (aiErr) {
        console.warn('[AI] LLM failed, computing direct database response:', aiErr);
        providerName = 'system';

        const totalProjects = projects.length;
        const totalTasks = projectSummaries.reduce((acc, p) => acc + p.total, 0);
        const totalOverdue = projectSummaries.reduce((acc, p) => acc + p.overdue, 0);
        const totalDone = projectSummaries.reduce((acc, p) => acc + p.done, 0);
        const mostOverdueProject = [...projectSummaries].sort((a, b) => b.overdue - a.overdue)[0];

        const lowerMsg = message.toLowerCase();

        if (totalProjects === 0) {
          replyText = "You currently have 0 managed projects. Click the '+ New Project' button to get started!";
        } else if (lowerMsg.includes('overdue')) {
          if (totalOverdue === 0) {
            replyText = `None of your ${totalProjects} project(s) have any overdue tasks right now. Everything is on track!`;
          } else {
            replyText = `"${mostOverdueProject.name}" has the highest number of overdue tasks (${mostOverdueProject.overdue} overdue out of ${mostOverdueProject.total} total tasks).`;
          }
        } else if (lowerMsg.includes('completion') || lowerMsg.includes('rate') || lowerMsg.includes('percent')) {
          const pct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;
          replyText = `The overall task completion rate across all ${totalProjects} project(s) is ${pct}% (${totalDone} of ${totalTasks} tasks completed).`;
        } else if (lowerMsg.includes('developer') || lowerMsg.includes('assign')) {
          replyText = `Tasks are assigned across active developers. You can review developer stats in the Admin Analytics panel.`;
        } else {
          replyText = `Currently managing ${totalProjects} project(s) with ${totalTasks} total task(s) (${totalDone} completed, ${totalOverdue} overdue).`;
        }
      }

      res.json({
        reply: replyText,
        provider: providerName,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
