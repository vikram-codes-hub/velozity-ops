import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const listQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().uuid().optional(),
});

// GET /api/activity
// Query activity logs feed with filtering and cursor pagination
router.get(
  '/',
  requireAuth,
  validate({ query: listQuerySchema }),
  async (req, res, next) => {
    try {
      const { projectId, taskId, userId, dateFrom, dateTo, limit, cursor } =
        req.query as unknown as z.infer<typeof listQuerySchema>;

      const where: Record<string, unknown> = {
        ...(projectId ? { projectId } : {}),
        ...(taskId ? { taskId } : {}),
        ...(userId ? { userId } : {}),
        ...((dateFrom || dateTo)
          ? {
              createdAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
              },
            }
          : {}),
      };

      // Scope feed based on user role
      if (req.user!.role === 'PM') {
        where.project = { createdById: req.user!.id };
      } else if (req.user!.role === 'DEVELOPER') {
        where.OR = [
          { task: { assignedToId: req.user!.id } },
          { project: { tasks: { some: { assignedToId: req.user!.id } } } },
        ];
      }

      const activityLogs = await prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          user: { select: { id: true, name: true, role: true } },
          task: { select: { id: true, title: true } },
          project: { select: { id: true, name: true } },
        },
      });

      const nextCursor =
        activityLogs.length === limit
          ? activityLogs[activityLogs.length - 1].id
          : null;

      res.json({ activityLogs, nextCursor });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
