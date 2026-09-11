

import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} as const;

const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const roleEnum = z.enum(['ADMIN', 'PM', 'DEVELOPER']);

const listQuerySchema = z.object({
  role: roleEnum.optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  name: z.string().min(1),
  role: roleEnum,
});

const updateUserSchema = z
  .object({
    email: z.string().email().optional(),
    name: z.string().min(1).optional(),
    role: roleEnum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.',
  });

// ---------------------------------------------------------------------------
// GET /api/users
// ---------------------------------------------------------------------------

router.get(
  '/',
  requireAuth,
  requireRole('ADMIN', 'PM'),
  validate({ query: listQuerySchema }),
  async (req, res, next) => {
    try {
      const { role } = req.query as unknown as z.infer<typeof listQuerySchema>;

      // PM cannot broaden this beyond DEVELOPER no matter what they pass —
      // enforced here, not trusted from the query string.
      const effectiveRole = req.user!.role === 'PM' ? 'DEVELOPER' : role;

      const users = await prisma.user.findMany({
        where: effectiveRole ? { role: effectiveRole } : undefined,
        select: SAFE_USER_SELECT,
        orderBy: { name: 'asc' },
      });

      res.json({ users });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/users/:id
// ---------------------------------------------------------------------------

router.get(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;

      const user = await prisma.user.findUnique({
        where: { id },
        select: SAFE_USER_SELECT,
      });

      if (!user) {
        throw new ApiError(404, 'NOT_FOUND', 'User not found.');
      }

      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/users
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: createUserSchema }),
  async (req, res, next) => {
    try {
      const { email, password, name, role } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        throw new ApiError(409, 'CONFLICT', 'A user with this email already exists.');
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      const user = await prisma.user.create({
        data: { email, passwordHash, name, role, tokenVersion: 0 },
        select: SAFE_USER_SELECT,
      });

      res.status(201).json({ user });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/users/:id
// ---------------------------------------------------------------------------

router.patch(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: idParamSchema, body: updateUserSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const updates = req.body as z.infer<typeof updateUserSchema>;

      if (updates.email) {
        const existing = await prisma.user.findFirst({
          where: { email: updates.email, NOT: { id } },
        });
        if (existing) {
          throw new ApiError(409, 'CONFLICT', 'A user with this email already exists.');
        }
      }

      const user = await prisma.user.update({
        where: { id },
        data: updates,
        select: SAFE_USER_SELECT,
      });

      res.json({ user });
    } catch (err) {
      next(err); // errorHandler maps Prisma P2025 (not found) to a clean 404
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/users/:id
//
// Hard delete. Cascade behavior comes entirely from the schema, not logic
// here: Task.assignedToId -> SET NULL (their tasks survive, unassigned),
// ActivityLog.userId -> SET NULL (audit trail survives), Notification.userId
// -> CASCADE (their own notifications are removed with them),
// Project.createdById -> RESTRICT (a PM who still owns projects cannot be
// deleted until those projects are reassigned or removed — Prisma will
// throw a foreign-key error, which the global error handler should map to
// a 409, not a 500; add that P-code mapping in error.ts if you hit it).
// ---------------------------------------------------------------------------

router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;

      if (id === req.user!.id) {
        throw new ApiError(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own account.');
      }

      await prisma.user.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;