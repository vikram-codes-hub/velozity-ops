import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "./api";
import { useSocket } from "../context/SocketContext";
import type { ActivityEvent } from "../types/domain";

const PAGE_SIZE = 30;

export interface AuditLogFilters {
  projectId?: string;
  userId?: string;
  dateFrom?: string; // ISO
  dateTo?: string; // ISO
}

interface ActivityResponse {
  activityLogs: any[];
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

export function normalizeActivityEvent(item: any): ActivityEvent {
  return {
    id: item.id,
    taskId: item.taskId,
    taskTitle: item.taskTitle ?? item.task?.title,
    projectId: item.projectId,
    projectName: item.projectName ?? item.project?.name,
    userId: item.userId,
    userName: item.userName ?? item.user?.name,
    action: item.action,
    fromValue: item.fromValue,
    toValue: item.toValue,
    createdAt: item.createdAt,
    message: item.message,
  };
}

function matchesFilters(
  event: ActivityEvent,
  filters: AuditLogFilters,
): boolean {
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
      const { data } = await apiClient.get<ActivityResponse>(
        "/api/activity",
        {
          params: { ...filters, limit: PAGE_SIZE },
        },
      );
      const normalized = (data.activityLogs || []).map(normalizeActivityEvent);
      setEntries(normalized);
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
      const { data } = await apiClient.get<ActivityResponse>(
        "/api/activity",
        {
          params: { ...filters, limit: PAGE_SIZE, cursor: cursorRef.current },
        },
      );
      const normalized = (data.activityLogs || []).map(normalizeActivityEvent);
      setEntries((prev) => [...prev, ...normalized]);
      cursorRef.current = data.nextCursor;
    } catch (err) {
      setError("Couldn't load more entries.");
    } finally {
      setIsLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, isLoadingMore]);

  useEffect(() => {
    const unsubscribe = subscribeToActivity((rawEvent: any) => {
      const event = normalizeActivityEvent(rawEvent);
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
