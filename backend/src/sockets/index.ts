

import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AccessTokenPayload, Role } from '../types/auth';

const ACCESS_TOKEN_SECRET = (process.env.ACCESS_TOKEN_SECRET || process.env.JWT_ACCESS_SECRET) as string;

interface AuthenticatedSocket extends Socket {
  data: {
    user: AccessTokenPayload;
  };
}


const onlineUsers = new Map<string, number>();



function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  const token =
    (socket.handshake.auth?.token as string | undefined) ??
    (socket.handshake.headers.authorization?.startsWith('Bearer ')
      ? socket.handshake.headers.authorization.slice(7)
      : undefined);

  if (!token) {
    return next(new Error('UNAUTHORIZED'));
  }

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as AccessTokenPayload;
    if (!payload?.id || !payload?.role) {
      return next(new Error('UNAUTHORIZED'));
    }
    (socket as AuthenticatedSocket).data.user = payload;
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
}

// ---------------------------------------------------------------------------
// Presence helpers
// ---------------------------------------------------------------------------

function markOnline(userId: string) {
  onlineUsers.set(userId, (onlineUsers.get(userId) ?? 0) + 1);
}

function markOffline(userId: string) {
  const count = onlineUsers.get(userId) ?? 0;
  if (count <= 1) {
    onlineUsers.delete(userId);
  } else {
    onlineUsers.set(userId, count - 1);
  }
}

function broadcastPresence(io: Server) {
  io.to('admin:global').emit('presence:update', {
    onlineCount: onlineUsers.size,
  });
}

// ---------------------------------------------------------------------------
// Main entrypoint — called once from server.ts
// ---------------------------------------------------------------------------

export function initSocket(io: Server) {
  io.use(authenticateSocket);

  io.on('connection', async (socket: Socket) => {
    const { id: userId, role } = (socket as AuthenticatedSocket).data.user;

    markOnline(userId);

    // Every user auto-joins their own notification room.
    socket.join(`user:${userId}:notifications`);

    if (role === 'ADMIN') {
      socket.join('admin:global');
      broadcastPresence(io); // an admin just connected — refresh their own count immediately
    }

    if (role === 'DEVELOPER') {
      socket.join(`user:${userId}:feed`);
    }

    // Admins should also see presence update when ANY user connects, not
    // just when an admin connects.
    broadcastPresence(io);

    // ---------------------------------------------------------------------
    // PM explicitly requests to watch a project's feed. Ownership is
    // verified server-side here — a PM cannot join another PM's project
    // room just by sending a different projectId over the socket, same
    // guarantee as the REST ownership checks.
    // ---------------------------------------------------------------------
    socket.on('project:join', async (projectId: string, ack?: (err?: string) => void) => {
      if (typeof projectId !== 'string') {
        return ack?.('INVALID_PROJECT_ID');
      }

      if (role === 'ADMIN') {
        socket.join(`project:${projectId}`);
        return ack?.();
      }

      if (role === 'PM') {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { createdById: true },
        });

        if (!project || project.createdById !== userId) {
          return ack?.('FORBIDDEN');
        }

        socket.join(`project:${projectId}`);
        return ack?.();
      }

      // Developers don't join project rooms at all — their visibility is
      // scoped to their own task feed room, joined automatically above.
      return ack?.('FORBIDDEN');
    });

    socket.on('project:leave', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on('disconnect', () => {
      markOffline(userId);
      broadcastPresence(io);
    });
  });
}



export interface ActivityEventPayload {
  id: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
  assignedToId: string | null;
  actorName: string;
  action: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string; // ISO timestamp; client renders "2 mins ago" itself
  message: string; // pre-formatted: "Ravi moved Task #12 from In Progress → In Review"
}

export function emitActivityEvent(io: Server, event: ActivityEventPayload) {
  // Admin: everything.
  io.to('admin:global').emit('activity:new', event);

  // PM: only if a PM is actively watching this specific project room
  // (joined via project:join above, which already enforced ownership).
  io.to(`project:${event.projectId}`).emit('activity:new', event);

  // Developer: only the assignee's own feed, regardless of project.
  if (event.assignedToId) {
    io.to(`user:${event.assignedToId}:feed`).emit('activity:new', event);
  }
}

export interface NotificationEventPayload {
  id: string;
  userId: string;
  message: string;
  taskId: string | null;
  createdAt: string;
}

export function emitNotification(io: Server, event: NotificationEventPayload) {
  io.to(`user:${event.userId}:notifications`).emit('notification:new', event);
}

export function emitUnreadCount(io: Server, userId: string, count: number) {
  io.to(`user:${userId}:notifications`).emit('notification:unread-count', { count });
}

/** Exposed mainly for the Admin dashboard's REST fallback / initial paint. */
export function getOnlineUserCount(): number {
  return onlineUsers.size;
}