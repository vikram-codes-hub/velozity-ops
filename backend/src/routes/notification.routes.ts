

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const listQuerySchema = z.object({
  read: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// GET /api/notifications
// List the authenticated user's notifications, newest first.
// Query params: ?read=false&limit=20&cursor=<notificationId>
// Cursor-based so the dropdown can "load more" without offset drift as new
// notifications arrive between pages.
// ---------------------------------------------------------------------------

router.get(
  '/',
  requireAuth,
  validate({ query: listQuerySchema }),
  async (req, res, next) => {
    try {
      const { read, limit, cursor } = req.query as unknown as z.infer<typeof listQuerySchema>;

      const notifications = await prisma.notification.findMany({
        where: {
          userId: req.user!.id,
          ...(read !== undefined ? { read: read === 'true' } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        ...(cursor
          ? { cursor: { id: cursor }, skip: 1 } // skip the cursor row itself
          : {}),
      });

      const nextCursor =
        notifications.length === limit
          ? notifications[notifications.length - 1].id
          : null;

      res.json({ notifications, nextCursor });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/notifications/unread-count
// Powers the badge on initial page load (WebSocket pushes live deltas after
// that — this route exists purely for the first paint / reconnect fallback).
// ---------------------------------------------------------------------------

router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, read: false },
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/notifications/:id/read
// Mark a single notification as read. Ownership check prevents a user from
// marking (or even confirming the existence of) another user's notification.
// ---------------------------------------------------------------------------

router.patch(
  '/:id/read',
  requireAuth,
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof idParamSchema>;

      const notification = await prisma.notification.findUnique({ where: { id } });

      if (!notification || notification.userId !== req.user!.id) {
        // Same 404 whether it doesn't exist or belongs to someone else —
        // don't leak which case it is.
        throw new ApiError(404, 'NOT_FOUND', 'Notification not found.');
      }

      const updated = await prisma.notification.update({
        where: { id },
        data: { read: true },
      });

      res.json({ notification: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PATCH /api/notifications/read-all
// Mark every unread notification for this user as read in one call.
// ---------------------------------------------------------------------------

router.patch('/read-all', requireAuth, async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });

    res.json({ updatedCount: result.count });
  } catch (err) {
    next(err);
  }
});

export default router;