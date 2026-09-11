// frontend/src/hooks/useAuditLog.ts
//
// Backs the Admin audit log page. Distinct from useTasks' activity merge
// (which patches a task list in place): this one owns its own append-only
// log list, since the audit page's job is to show history, not react to it.
//
// Admins auto-join admin:global server-side (per the doc's WS room model),
// so no explicit room join is needed here the way useProject needs one —
// subscribeToActivity just starts firing once connected. New events are
// prepended live only when they'd match the currently active filters, so
// the page doesn't silently show a Marketing-project event while someone
// has filtered down to Client Ops.
//
// ASSUMPTIONS:
//   - GET /api/activity?cursor=&limit=&projectId=&userId=&dateFrom=&dateTo=
//     -> CursorPage<ActivityEvent>, admin-only (no ownership filter applied
//     server-side beyond the role check, unlike the PM/Dev-scoped uses of
//     this same endpoint elsewhere)
//   - useSocket() exposes subscribeToActivity(cb) firing for whatever rooms
//     are currently joined (admin:global here)

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../lib/api";
import { useSocket } from "../context/SocketContext";
import type { ActivityEvent } from "./Domain";

const PAGE_SIZE = 30;

export interface AuditLogFilters {
  projectId?: string;
  userId?: string;
  dateFrom?: string; // ISO
  dateTo?: string; // ISO
}

interface CursorPage<T> {
  data: T[];
  nextCursor: string | null;
}

interface UseAuditLogResult {
  entries: ActivityEvent[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

function matchesFilters(event: ActivityEvent, filters: AuditLogFilters): boolean {
  if (filters.projectId && event.projectId !== filters.projectId) return false;
  if (filters.userId && event.userId !== filters.userId) return false;
  if (filters.dateFrom && event.createdAt < filters.dateFrom) return false;
  if (filters.dateTo && event.createdAt > filters.dateTo) return false;
  return true;
}

export function useAuditLog(filters: AuditLogFilters): UseAuditLogResult {
  const { subscribeToActivity } = useSocket();

  const [entries, setEntries] = useState<ActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);

  const filtersKey = JSON.stringify(filters);

  const fetchFirstPage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<CursorPage<ActivityEvent>>("/api/activity", {
        params: { ...filters, limit: PAGE_SIZE },
      });
      setEntries(data.data);
      cursorRef.current = data.nextCursor;
    } catch (err) {
      setError("Couldn't load the audit log.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  const loadMore = useCallback(async () => {
    if (!cursorRef.current || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const { data } = await apiClient.get<CursorPage<ActivityEvent>>("/api/activity", {
        params: { ...filters, limit: PAGE_SIZE, cursor: cursorRef.current },
      });
      setEntries((prev) => [...prev, ...data.data]);
      cursorRef.current = data.nextCursor;
    } catch (err) {
      setError("Couldn't load more entries.");
    } finally {
      setIsLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, isLoadingMore]);

  useEffect(() => {
    const unsubscribe = subscribeToActivity((event: ActivityEvent) => {
      // Only prepend a live event if it belongs on the currently filtered
      // first page — otherwise it'll show up correctly once filters change.
      if (matchesFilters(event, filters)) {
        setEntries((prev) => [event, ...prev]);
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribeToActivity, filtersKey]);

  return {
    entries,
    isLoading,
    isLoadingMore,
    hasMore: cursorRef.current !== null,
    error,
    loadMore,
    refetch: fetchFirstPage,
  };
}
