import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const idParamSchema = z.object({ id: z.string().uuid() });

const listQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
});

const createProjectSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().uuid(),
  createdById: z.string().uuid().optional(),
});

const updateProjectSchema = z
  .object({
    name: z.string().min(1).optional(),
    clientId: z.string().uuid().optional(),
    createdById: z.string().uuid().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.',
  });

// ---------------------------------------------------------------------------
// Shared authorization helper
// ---------------------------------------------------------------------------

async function loadAuthorizedProject(
  projectId: string,
  user: { id: string; role: 'ADMIN' | 'PM' | 'DEVELOPER' }
) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
  }

  if (user.role === 'PM' && project.createdById !== user.id) {
    throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
  }

  if (user.role === 'DEVELOPER') {
    const hasTaskHere = await prisma.task.findFirst({
      where: { projectId, assignedToId: user.id },
      select: { id: true },
    });
    if (!hasTaskHere) {
      throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
    }
  }

  return project;
}

// ---------------------------------------------------------------------------
// GET /api/projects
// ---------------------------------------------------------------------------

router.get(
  '/',
  requireAuth,
  validate({ query: listQuerySchema }),
  async (req, res, next) => {
    try {
      const { clientId } = req.query as unknown as z.infer<typeof listQuerySchema>;

      const where: Record<string, unknown> = {
        ...(clientId ? { clientId } : {}),
      };

      if (req.user!.role === 'PM') {
        where.createdById = req.user!.id;
      } else if (req.user!.role === 'DEVELOPER') {
        where.tasks = { some: { assignedToId: req.user!.id } };
      }

      const projects = await prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true, role: true } },
          _count: { select: { tasks: true } },
        },
      });

      // ---- per-project task analytics ----------------------------------------
      // One grouped query for all projects returned above — avoids N+1 fetches.
      const projectIds = projects.map((p) => p.id);

      const [taskGroups, memberGroups] = await Promise.all([
        // Task status breakdown per project
        prisma.task.groupBy({
          by: ['projectId', 'status'],
          where: { projectId: { in: projectIds } },
          _count: { id: true },
        }),
        // Distinct assignees per project (member count)
        prisma.task.findMany({
          where: {
            projectId: { in: projectIds },
            assignedToId: { not: null },
          },
          select: { projectId: true, assignedToId: true },
          distinct: ['projectId', 'assignedToId'],
        }),
      ]);

      // Build lookup maps
      const taskCountsMap: Record<string, Record<string, number>> = {};
      for (const row of taskGroups) {
        if (!taskCountsMap[row.projectId]) taskCountsMap[row.projectId] = {};
        taskCountsMap[row.projectId][row.status] = row._count.id;
      }

      const memberCountMap: Record<string, number> = {};
      for (const row of memberGroups) {
        memberCountMap[row.projectId] = (memberCountMap[row.projectId] ?? 0) + 1;
      }

      const enrichedProjects = projects.map((p) => {
        const counts = taskCountsMap[p.id] ?? {};
        const taskCounts = {
          TODO:        counts['TODO']        ?? 0,
          IN_PROGRESS: counts['IN_PROGRESS'] ?? 0,
          IN_REVIEW:   counts['IN_REVIEW']   ?? 0,
          DONE:        counts['DONE']        ?? 0,
          OVERDUE:     counts['OVERDUE']     ?? 0,
        };
        return {
          ...p,
          taskCounts,
          overdueCount: taskCounts.OVERDUE,
          memberCount:  memberCountMap[p.id] ?? 0,
        };
      });

      res.json({ projects: enrichedProjects });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/projects/:id
// ---------------------------------------------------------------------------

router.get(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      await loadAuthorizedProject(id, req.user!);

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          client: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true, role: true } },
          _count: { select: { tasks: true } },
        },
      });

      res.json({ project });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/projects
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'PM'),
  validate({ body: createProjectSchema }),
  async (req, res, next) => {
    try {
      const { name, clientId, createdById } = req.body;

      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) {
        throw new ApiError(404, 'NOT_FOUND', 'Client not found.');
      }

      let ownerId = req.user!.id;
      if (req.user!.role === 'ADMIN' && createdById) {
        const pmUser = await prisma.user.findUnique({ where: { id: createdById } });
        if (!pmUser) {
          throw new ApiError(404, 'NOT_FOUND', 'Assigned Project Manager not found.');
        }
        ownerId = createdById;
      }

      const project = await prisma.project.create({
        data: { name, clientId, createdById: ownerId },
        include: {
          client: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      res.status(201).json({ project });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/projects/:id
// ---------------------------------------------------------------------------

router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'PM'),
  validate({ params: idParamSchema, body: updateProjectSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const updates = req.body as z.infer<typeof updateProjectSchema>;

      const existing = await prisma.project.findUnique({ where: { id } });
      if (!existing) {
        throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
      }
      if (req.user!.role === 'PM' && existing.createdById !== req.user!.id) {
        throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
      }

      if (updates.clientId) {
        const client = await prisma.client.findUnique({ where: { id: updates.clientId } });
        if (!client) {
          throw new ApiError(404, 'NOT_FOUND', 'Client not found.');
        }
      }

      if (updates.createdById && req.user!.role === 'ADMIN') {
        const pmUser = await prisma.user.findUnique({ where: { id: updates.createdById } });
        if (!pmUser) {
          throw new ApiError(404, 'NOT_FOUND', 'Assigned Project Manager not found.');
        }
      }

      const project = await prisma.project.update({
        where: { id },
        data: updates,
        include: {
          client: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true, role: true } },
        },
      });

      res.json({ project });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id
// ---------------------------------------------------------------------------

router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'PM'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;

      const existing = await prisma.project.findUnique({ where: { id } });
      if (!existing) {
        throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
      }
      if (req.user!.role === 'PM' && existing.createdById !== req.user!.id) {
        throw new ApiError(404, 'NOT_FOUND', 'Project not found.');
      }

      await prisma.project.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;