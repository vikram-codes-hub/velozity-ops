

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
});

const updateProjectSchema = z
  .object({
    name: z.string().min(1).optional(),
    clientId: z.string().uuid().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.',
  });

// ---------------------------------------------------------------------------
// Shared authorization helper — same 404-not-403 pattern as task.routes.ts:
// don't confirm a project exists to someone outside its scope.
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
      // ADMIN: no additional scoping.

      const projects = await prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          _count: { select: { tasks: true } },
        },
      });

      res.json({ projects });
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

      // Re-fetch with the includes now that authorization has passed —
      // keeps loadAuthorizedProject's query lean for the common case
      // where callers only need the pass/fail check (create/update/delete).
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          client: { select: { id: true, name: true } },
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
// ADMIN or PM only. createdById is always the caller — a PM cannot create
// a project "on behalf of" another PM by passing a different id, because
// there's no field in the request body for it at all.
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'PM'),
  validate({ body: createProjectSchema }),
  async (req, res, next) => {
    try {
      const { name, clientId } = req.body;

      const client = await prisma.client.findUnique({ where: { id: clientId } });
      if (!client) {
        throw new ApiError(404, 'NOT_FOUND', 'Client not found.');
      }

      const project = await prisma.project.create({
        data: { name, clientId, createdById: req.user!.id },
        include: { client: { select: { id: true, name: true } } },
      });

      res.status(201).json({ project });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/projects/:id
// ADMIN or PM(owner) only.
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

      const project = await prisma.project.update({
        where: { id },
        data: updates,
        include: { client: { select: { id: true, name: true } } },
      });

      res.json({ project });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id
// ADMIN or PM(owner) only. Task.projectId -> CASCADE per schema, so this
// removes the project's tasks too — ActivityLog rows for those tasks
// cascade with them (ActivityLog.projectId -> CASCADE), which is a
// deliberate trade-off: the audit trail for a deleted project doesn't
// need to outlive the project itself. Worth a line in your README's
// known-limitations section if you'd rather it were a soft delete instead.
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