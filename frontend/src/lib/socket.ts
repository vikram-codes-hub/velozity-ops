// frontend/src/lib/socket.ts
//
// Owns the raw socket.io-client connection lifecycle. Deliberately dumb:
// connect/disconnect and a typed emit/on surface, nothing React-specific.
// SocketContext.tsx is expected to call connectSocket() on login (passing
// the in-memory access token for the WS handshake auth) and
// disconnectSocket() on logout, then expose room-join helpers and
// event subscriptions (joinProject, subscribeToActivity, etc.) as a
// useSocket() hook built on top of this.
//
// Server-side room model this pairs with (per the project context doc):
//   admin:global              - Admins auto-join
//   project:<projectId>       - explicit join via "project:join", re-verified
//                                server-side every time
//   user:<userId>:feed        - Developers auto-join
//   user:<userId>:notifications - everyone auto-joins

import { io, type Socket } from "socket.io-client";
import type { ActivityEvent, AppNotification } from "../types/domain";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

/**
 * Opens the WebSocket connection, authenticating the handshake with the
 * current access token. Safe to call if already connected — it's a no-op
 * in that case rather than opening a second connection.
 */
export function connectSocket(accessToken: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null {
  return socket;
}

// ---- Room joins --------------------------------------------------------
// project:join is acked by the server (ownership re-verified on every
// attempt per the doc), so this resolves only once the server confirms —
// useProject relies on that to know when it's safe to trust live updates.

export function joinProjectRoom(projectId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Socket not connected"));
      return;
    }
    socket.emit("project:join", { projectId }, (ack: { ok: boolean; error?: string }) => {
      if (ack.ok) resolve();
      else reject(new Error(ack.error ?? "Failed to join project room"));
    });
  });
}

export function leaveProjectRoom(projectId: string): void {
  socket?.emit("project:leave", { projectId });
}

// ---- Typed event subscriptions ------------------------------------------
// Each returns an unsubscribe function, matching the pattern the hooks
// (useNotifications, useTasks) already expect from useSocket().

export function onActivityEvent(callback: (event: ActivityEvent) => void): () => void {
  socket?.on("activity:event", callback);
  return () => socket?.off("activity:event", callback);
}

export function onNotification(callback: (notification: AppNotification) => void): () => void {
  socket?.on("notification:new", callback);
  return () => socket?.off("notification:new", callback);
}

export function onUnreadCount(callback: (count: number) => void): () => void {
  const handler = (data: { count: number } | number) => {
    const count = typeof data === "number" ? data : data?.count ?? 0;
    callback(count);
  };
  socket?.on("notification:unread-count", handler);
  return () => socket?.off("notification:unread-count", handler);
}

export function onPresenceUpdate(callback: (onlineCount: number) => void): () => void {
  socket?.on("presence:update", callback);
  return () => socket?.off("presence:update", callback);
}