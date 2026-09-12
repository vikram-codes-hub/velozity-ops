// frontend/src/hooks/useNotifications.ts
//
// Centralizes what NotificationBell.tsx currently does inline:
//   - unread count arrives via WebSocket push only (no polling)
//   - the dropdown list is fetched lazily (only once the bell is opened)
//   - mark-as-read (single + bulk) updates local state optimistically,
//     rolling back if the API call fails
//
// ASSUMPTIONS (adjust to match your real apiClient/SocketContext exports):
//   - apiClient: axios instance, named export from lib/apiClient.ts
//   - useSocket(): named export from context/SocketContext.tsx exposing
//     subscribeToNotifications(cb) and subscribeToUnreadCount(cb), each
//     returning an unsubscribe function
//   - GET  /api/notifications?cursor=&limit=        -> CursorPage<AppNotification>
//   - GET  /api/notifications/unread-count           -> { count: number }
//   - PATCH /api/notifications/:id/read              -> AppNotification
//   - PATCH /api/notifications/read-all               -> { updated: number }

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../lib/api";
import { useSocket } from "../context/SocketContext";
import type { AppNotification, CursorPage } from "./Domain";

const PAGE_SIZE = 20;

interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  /** Fetches the first page. Call when the dropdown is first opened. */
  loadFirstPage: () => Promise<void>;
  /** Fetches the next page using the stored cursor. */
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const { subscribeToNotifications, subscribeToUnreadCount } = useSocket();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const hasLoadedOnce = useRef(false);

  // Fetch initial unread count on mount via REST API
  useEffect(() => {
    apiClient
      .get<{ count: number }>("/api/notifications/unread-count")
      .then(({ data }) => {
        if (typeof data?.count === "number") {
          setUnreadCount(data.count);
        }
      })
      .catch(() => {});
  }, []);

  // Badge count updates via WebSocket pushes
  useEffect(() => {
    const unsubscribe = subscribeToUnreadCount((count: number) => {
      setUnreadCount(count);
    });
    return unsubscribe;
  }, [subscribeToUnreadCount]);

  // New notifications pushed live: prepend to state and update badge count
  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notification: AppNotification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });
    return unsubscribe;
  }, [subscribeToNotifications]);

  const loadFirstPage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<{ notifications: AppNotification[]; nextCursor: string | null }>(
        "/api/notifications",
        { params: { limit: PAGE_SIZE } }
      );
      setNotifications(data.notifications);
      cursorRef.current = data.nextCursor;
      hasLoadedOnce.current = true;
    } catch (err) {
      setError("Couldn't load notifications.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursorRef.current || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const { data } = await apiClient.get<{ notifications: AppNotification[]; nextCursor: string | null }>(
        "/api/notifications",
        { params: { limit: PAGE_SIZE, cursor: cursorRef.current } }
      );
      setNotifications((prev) => [...prev, ...data.notifications]);
      cursorRef.current = data.nextCursor;
    } catch (err) {
      setError("Couldn't load more notifications.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore]);

  const markAsRead = useCallback(async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.read) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await apiClient.patch(`/api/notifications/${id}/read`);
    } catch (err) {
      // Roll back on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: false } : n))
      );
      setUnreadCount((prev) => prev + 1);
      setError("Couldn't mark notification as read.");
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await apiClient.patch("/api/notifications/read-all");
    } catch (err) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setError("Couldn't mark all notifications as read.");
    }
  }, [notifications, unreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore: cursorRef.current !== null,
    error,
    loadFirstPage,
    loadMore,
    markAsRead,
    markAllAsRead,
  };
}