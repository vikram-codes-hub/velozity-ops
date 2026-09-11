import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Validation Schemas
const idParamSchema = z.object({
  id: z.string().uuid(),
});

const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required.'),
});

const updateClientSchema = z.object({
  name: z.string().min(1, 'Client name is required.'),
});

// GET /api/clients
// List all clients (accessible to ADMIN and PM so PMs can select clients when creating projects)
router.get(
  '/',
  requireAuth,
  requireRole('ADMIN', 'PM'),
  async (req, res, next) => {
    try {
      const clients = await prisma.client.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { projects: true } },
        },
      });
      res.json({ clients });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/clients/:id
router.get(
  '/:id',
  requireAuth,
  requireRole('ADMIN', 'PM'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const client = await prisma.client.findUnique({
        where: { id },
        include: {
          projects: {
            select: { id: true, name: true, createdAt: true },
          },
        },
      });

      if (!client) {
        throw new ApiError(404, 'NOT_FOUND', 'Client not found.');
      }

      res.json({ client });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/clients
// Create a new client (ADMIN only)
router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createClientSchema }),
  async (req, res, next) => {
    try {
      const { name } = req.body;
      const client = await prisma.client.create({
        data: { name },
      });
      res.status(201).json({ client });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/clients/:id
// Update client details (ADMIN only)
router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: idParamSchema, body: updateClientSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const { name } = req.body;

      const client = await prisma.client.update({
        where: { id },
        data: { name },
      });

      res.json({ client });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/clients/:id
// Delete a client (ADMIN only)
// Note: If client has projects, Prisma will throw foreign key restriction error (P2003)
// which errorHandler maps to a 409 Conflict.
router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      await prisma.client.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
