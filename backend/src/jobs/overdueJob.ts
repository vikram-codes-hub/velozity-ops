

import cron, { ScheduledTask } from 'node-cron';
import { Server } from 'socket.io';
import { prisma } from '../lib/prisma';
import { emitActivityEvent, emitNotification, emitUnreadCount } from '../sockets';

// Every 5 minutes by default — frequent enough that "overdue" is never
// stale for long, infrequent enough not to hammer the DB. Configurable via
// env so it can be tightened for a demo (e.g. every minute) without a
// code change.
const CRON_SCHEDULE = process.env.OVERDUE_CRON_SCHEDULE ?? '*/5 * * * *';

let task: ScheduledTask | null = null;

export function startOverdueTaskCron(io: Server): ScheduledTask {
  if (task) {
    // Guard against double-registration if startOverdueTaskCron is ever
    // accidentally called twice (e.g. hot-reload in dev).
    return task;
  }

  task = cron.schedule(CRON_SCHEDULE, () => {
    runOverdueSweep(io).catch((err) => {
      console.error('[overdue.job] sweep failed:', err);
    });
  });

  console.log(`[overdue.job] scheduled with cron "${CRON_SCHEDULE}"`);
  return task;
}

/**
 * Exported separately from the cron registration so it can be:
 *   - called directly in a unit test without waiting on a real schedule
 *   - triggered manually (e.g. an admin "run sweep now" debug endpoint)
 */
export async function runOverdueSweep(io: Server): Promise<number> {
  const now = new Date();

  // Find candidates BEFORE updating so we can log + emit a real activity
  // event per task, not just a silent bulk UPDATE. This is what makes the
  // overdue flip show up in the live feed and in the audit trail, not just
  // in the tasks table.
  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      overdueFlagged: false,
      status: { notIn: ['DONE', 'OVERDUE'] },
    },
    select: {
      id: true,
      projectId: true,
      title: true,
      assignedToId: true,
      status: true,
    },
  });

  if (overdueTasks.length === 0) {
    return 0;
  }

  for (const t of overdueTasks) {
    const previousStatus = t.status;

    await prisma.$transaction([
      prisma.task.update({
        where: { id: t.id },
        data: { status: 'OVERDUE', overdueFlagged: true },
      }),
      prisma.activityLog.create({
        data: {
          taskId: t.id,
          projectId: t.projectId,
          userId: null, // system-generated, not a user action
          action: 'AUTO_FLAGGED_OVERDUE',
          fromValue: previousStatus,
          toValue: 'OVERDUE',
        },
      }),
    ]);

    emitActivityEvent(io, {
      id: t.id,
      projectId: t.projectId,
      taskId: t.id,
      taskTitle: t.title,
      assignedToId: t.assignedToId,
      actorName: 'System',
      action: 'AUTO_FLAGGED_OVERDUE',
      fromValue: previousStatus,
      toValue: 'OVERDUE',
      createdAt: now.toISOString(),
      message: `Task "${t.title}" was automatically flagged Overdue`,
    });

    if (t.assignedToId) {
      const notification = await prisma.notification.create({
        data: {
          userId: t.assignedToId,
          taskId: t.id,
          message: `Task "${t.title}" is overdue!`,
        },
      });

      emitNotification(io, {
        id: notification.id,
        userId: t.assignedToId,
        message: notification.message,
        taskId: t.id,
        createdAt: now.toISOString(),
      });

      const unread = await prisma.notification.count({
        where: { userId: t.assignedToId, read: false },
      });
      emitUnreadCount(io, t.assignedToId, unread);
    }
  }

  console.log(`[overdue.job] flagged ${overdueTasks.length} task(s) as overdue`);
  return overdueTasks.length;
}

export function stopOverdueTaskCron() {
  task?.stop();
  task = null;
}