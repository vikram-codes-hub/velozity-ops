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
// GET /api/users/developer-stats (Admin only)
// Returns list of developers with count of distinct projects they are assigned to
// ---------------------------------------------------------------------------

router.get(
  '/developer-stats',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res, next) => {
    try {
      const developers = await prisma.user.findMany({
        where: { role: 'DEVELOPER' },
        select: SAFE_USER_SELECT,
        orderBy: { name: 'asc' },
      });

      const devIds = developers.map((d) => d.id);

      const taskAssignments = await prisma.task.findMany({
        where: {
          assignedToId: { in: devIds },
        },
        select: {
          assignedToId: true,
          projectId: true,
        },
        distinct: ['assignedToId', 'projectId'],
      });

      const projectCountMap: Record<string, number> = {};
      for (const row of taskAssignments) {
        if (row.assignedToId) {
          projectCountMap[row.assignedToId] = (projectCountMap[row.assignedToId] ?? 0) + 1;
        }
      }

      const stats = developers.map((dev) => ({
        ...dev,
        projectCount: projectCountMap[dev.id] ?? 0,
      }));

      res.json({ developers: stats });
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
  requireRole('ADMIN', 'PM'),
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
// Accessible by ADMIN only
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
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/users/:id
// ---------------------------------------------------------------------------

router.delete(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;

      await prisma.user.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/users/:id/reset-password (ADMIN only)
// Resets a user's password and increments tokenVersion to revoke old sessions.
// ---------------------------------------------------------------------------

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
});

router.post(
  '/:id/reset-password',
  requireAuth,
  requireRole('ADMIN'),
  validate({ params: idParamSchema, body: resetPasswordSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
      const { newPassword } = req.body;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new ApiError(404, 'NOT_FOUND', 'User not found.');
      }

      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

      await prisma.user.update({
        where: { id },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      });

      res.json({
        message: `Password for ${user.name} (${user.email}) has been successfully reset.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;