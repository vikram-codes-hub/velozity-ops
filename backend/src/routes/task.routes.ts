
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ApiError } from '../middleware/errorHandler';
import { emitActivityEvent, emitNotification, emitUnreadCount } from '../sockets';
import type { Server } from 'socket.io';

// The Socket.io server instance is attached to `app` in server.ts
// (`app.set('io', io)`) so route handlers can reach it without a circular
// import back to server.ts. Add that one line to server.ts if it isn't
// there yet: `app.set('io', io);` right after `const io = new SocketIOServer(...)`.
function getIO(req: { app: { get: (key: string) => unknown } }): Server {
  return req.app.get('io') as Server;
}

const router = Router();

const CLIENT_SETTABLE_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const listQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'OVERDUE']).optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueFrom: z.string().datetime().optional(),
  dueTo: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});

const idParamSchema = z.object({ id: z.string().uuid() });

const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
  priority: z.enum(PRIORITIES).default('MEDIUM'),
  dueDate: z.string().datetime(),
});

const updateTaskSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    assignedToId: z.string().uuid().nullable().optional(),
    priority: z.enum(PRIORITIES).optional(),
    dueDate: z.string().datetime().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.',
  });

const statusUpdateSchema = z.object({
  status: z.enum(CLIENT_SETTABLE_STATUSES),
});

// ---------------------------------------------------------------------------
// Shared authorization helper
// ---------------------------------------------------------------------------

/**
 * Loads a task with its parent project's createdById, then enforces the
 * role rule. Throws a 404 (not a 403) when a Developer/PM hits a task
 * outside their scope — same reasoning as elsewhere: don't confirm the
 * resource exists to someone who isn't allowed to see it.
 */
async function loadAuthorizedTask(
  taskId: string,
  user: { id: string; role: 'ADMIN' | 'PM' | 'DEVELOPER' }
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { createdById: true } } },
  });

  if (!task) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
  }

  if (user.role === 'PM' && task.project.createdById !== user.id) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
  }

  if (user.role === 'DEVELOPER' && task.assignedToId !== user.id) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
  }

  return task;
}

// ---------------------------------------------------------------------------
// GET /api/tasks
// ---------------------------------------------------------------------------

router.get(
  '/',
  requireAuth,
  validate({ query: listQuerySchema }),
  async (req, res, next) => {
    try {
      const { projectId, status, priority, dueFrom, dueTo, limit, cursor } =
        req.query as unknown as z.infer<typeof listQuerySchema>;

      const where: Record<string, unknown> = {
        ...(projectId ? { projectId } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
        ...(dueFrom || dueTo
          ? {
              dueDate: {
                ...(dueFrom ? { gte: new Date(dueFrom) } : {}),
                ...(dueTo ? { lte: new Date(dueTo) } : {}),
              },
            }
          : {}),
      };

      // Role scoping — layered on top of whatever filters the caller sent,
      // never replaced by them.
      if (req.user!.role === 'PM') {
        where.project = { createdById: req.user!.id };
      } else if (req.user!.role === 'DEVELOPER') {
        where.assignedToId = req.user!.id;
      }
      // ADMIN: no additional scoping.

      const tasks = await prisma.task.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: limit,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      const nextCursor = tasks.length === limit ? tasks[tasks.length - 1].id : null;

      res.json({ tasks, nextCursor });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/tasks/:id
// ---------------------------------------------------------------------------

router.get(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const task = await loadAuthorizedTask(id, req.user!);
      res.json({ task });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/tasks
// ADMIN or PM only. A PM may only create a task inside a project they own.
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'PM'),
  validate({ body: createTaskSchema }),
  async (req, res, next) => {
    try {
      const { projectId, title, description, assignedToId, priority, dueDate } = req.body;

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { createdById: true },
      });

      if (!project) {
        throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
      }

      if (req.user!.role === 'PM' && project.createdById !== req.user!.id) {
        throw new ApiError(403, 'FORBIDDEN', 'You do not own this project.');
      }

      const task = await prisma.task.create({
        data: {
          projectId,
          title,
          description,
          assignedToId,
          priority,
          dueDate: new Date(dueDate),
          status: 'TODO',
        },
      });

      // Notify the assignee, if one was set at creation time.
      if (assignedToId) {
        const notification = await prisma.notification.create({
          data: {
            userId: assignedToId,
            taskId: task.id,
            message: `You were assigned to "${task.title}"`,
          },
        });
        const io = getIO(req);
        emitNotification(io, {
          id: notification.id,
          userId: assignedToId,
          message: notification.message,
          taskId: task.id,
          createdAt: notification.createdAt.toISOString(),
        });
        const unread = await prisma.notification.count({
          where: { userId: assignedToId, read: false },
        });
        emitUnreadCount(io, assignedToId, unread);
      }

      res.status(201).json({ task });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/tasks/:id
// Detail edits (title/description/assignee/priority/dueDate) — ADMIN or
// PM(owner) only. Developers do NOT use this route; they use PATCH /:id/status.
// Reassignment here also triggers the "assigned" notification, same as create.
// ---------------------------------------------------------------------------

router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'PM'),
  validate({ params: idParamSchema, body: updateTaskSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const updates = req.body as z.infer<typeof updateTaskSchema>;

      const existing = await prisma.task.findUnique({
        where: { id },
        include: { project: { select: { createdById: true } } },
      });

      if (!existing) {
        throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
      }
      if (req.user!.role === 'PM' && existing.project.createdById !== req.user!.id) {
        throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
      }

      const task = await prisma.task.update({
        where: { id },
        data: {
          ...updates,
          ...(updates.dueDate ? { dueDate: new Date(updates.dueDate) } : {}),
        },
      });

      const reassigned =
        updates.assignedToId !== undefined &&
        updates.assignedToId !== null &&
        updates.assignedToId !== existing.assignedToId;

      if (reassigned) {
        const notification = await prisma.notification.create({
          data: {
            userId: updates.assignedToId as string,
            taskId: task.id,
            message: `You were assigned to "${task.title}"`,
          },
        });
        const io = getIO(req);
        emitNotification(io, {
          id: notification.id,
          userId: updates.assignedToId as string,
          message: notification.message,
          taskId: task.id,
          createdAt: notification.createdAt.toISOString(),
        });
        const unread = await prisma.notification.count({
          where: { userId: updates.assignedToId as string, read: false },
        });
        emitUnreadCount(io, updates.assignedToId as string, unread);
      }

      res.json({ task });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/tasks/:id/status
//
// The core write path: any role can hit this route, but the ownership
// check decides whether they're allowed to touch THIS task. This is also
// where the ActivityLog row is written and the live feed event is emitted
// — status changes are never silent.
// ---------------------------------------------------------------------------

router.patch(
  '/:id/status',
  requireAuth,
  validate({ params: idParamSchema, body: statusUpdateSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const { status: newStatus } = req.body as z.infer<typeof statusUpdateSchema>;

      // loadAuthorizedTask enforces: PM must own the project, Developer
      // must be the assignee. Admin passes through unrestricted.
      const task = await loadAuthorizedTask(id, req.user!);

      if (task.status === newStatus) {
        // No-op update — return early rather than writing a redundant
        // activity log entry for "moved from X to X".
        return res.json({ task });
      }

      const previousStatus = task.status;
      const actor = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { name: true },
      });

      const [updatedTask, activityLog] = await prisma.$transaction([
        prisma.task.update({ where: { id }, data: { status: newStatus } }),
        prisma.activityLog.create({
          data: {
            taskId: id,
            projectId: task.projectId,
            userId: req.user!.id,
            action: 'STATUS_CHANGE',
            fromValue: previousStatus,
            toValue: newStatus,
          },
        }),
      ]);

      const io = getIO(req);

      emitActivityEvent(io, {
        id: activityLog.id,
        projectId: task.projectId,
        taskId: task.id,
        taskTitle: task.title,
        assignedToId: task.assignedToId,
        actorName: actor?.name ?? 'Unknown',
        action: 'STATUS_CHANGE',
        fromValue: previousStatus,
        toValue: newStatus,
        createdAt: activityLog.createdAt.toISOString(),
        message: `${actor?.name ?? 'Someone'} moved "${task.title}" from ${previousStatus} → ${newStatus}`,
      });

      // Notification rule: PM's task moving to "In Review" notifies the PM.
      if (newStatus === 'IN_REVIEW') {
        const project = await prisma.project.findUnique({
          where: { id: task.projectId },
          select: { createdById: true, createdBy: { select: { role: true } } },
        });

        if (project && project.createdBy.role === 'PM' && project.createdById !== req.user!.id) {
          const notification = await prisma.notification.create({
            data: {
              userId: project.createdById,
              taskId: task.id,
              message: `"${task.title}" was moved to In Review`,
            },
          });
          emitNotification(io, {
            id: notification.id,
            userId: project.createdById,
            message: notification.message,
            taskId: task.id,
            createdAt: notification.createdAt.toISOString(),
          });
          const unread = await prisma.notification.count({
            where: { userId: project.createdById, read: false },
          });
          emitUnreadCount(io, project.createdById, unread);
        }
      }

      res.json({ task: updatedTask });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/tasks/:id
// ADMIN or PM(owner) only.
// ---------------------------------------------------------------------------

router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'PM'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;

      const existing = await prisma.task.findUnique({
        where: { id },
        include: { project: { select: { createdById: true } } },
      });

      if (!existing) {
        throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
      }
      if (req.user!.role === 'PM' && existing.project.createdById !== req.user!.id) {
        throw new ApiError(404, 'NOT_FOUND', 'Task not found.');
      }

      await prisma.task.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;