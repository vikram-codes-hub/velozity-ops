// frontend/src/hooks/useTasks.ts
//
// Centralizes what TaskList.tsx currently does inline (per the project
// context doc): reads filters, converts date-only strings to ISO, does
// optimistic status updates, and handles cursor pagination. Pulling this
// into a hook means TaskList.tsx becomes presentational, and any other
// view that needs a filtered task list (a future PMDashboard "upcoming
// due dates" panel, DeveloperDashboard's assigned-tasks list) can reuse it
// instead of re-implementing the same fetch/optimistic-update logic.
//
// This hook does NOT handle URL <-> filter-state syncing — that's the
// useTaskFilters() hook proposed separately in the doc (still unbuilt).
// Pass it plain TaskFilters and it'll fetch accordingly; wire useTaskFilters
// in above it later if you want the URL-synced version.
//
// Also subscribes to the project's activity feed (once useProject has
// joined the room) so a task's status updates live in place when someone
// else changes it — no need to refetch or wait for a page reload.
//
// ASSUMPTIONS:
//   - GET   /api/tasks?projectId=&status=&priority=&dueFrom=&dueTo=&cursor=&limit=
//           -> CursorPage<Task>
//   - PATCH /api/tasks/:id/status   (body: { status })  -> Task
//   - useSocket() exposes subscribeToActivity(cb) -> unsubscribe fn,
//     firing ActivityEvent objects for whichever rooms are currently joined
//     (project:<id> for PMs/Admins viewing a project, user:<id>:feed for Devs)

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "../lib/api";
import { useSocket } from "../context/SocketContext";
import type { ActivityEvent, CursorPage, Task, TaskFilters, TaskStatus } from "./Domain";

const PAGE_SIZE = 25;

interface UseTasksOptions {
  projectId?: string;
  filters?: TaskFilters;
}

interface UseTasksResult {
  tasks: Task[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  /** Optimistically updates status locally, PATCHes, and rolls back on failure. */
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
}

export function useTasks({ projectId, filters }: UseTasksOptions): UseTasksResult {
  const { subscribeToActivity } = useSocket();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);

  // Serialize filters so the effect only re-fires on an actual value change,
  // not a new object identity from the caller re-rendering.
  const filtersKey = JSON.stringify(filters ?? {});

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<CursorPage<Task>>("/api/tasks", {
        params: { projectId, ...filters, limit: PAGE_SIZE },
      });
      setTasks(data.data);
      cursorRef.current = data.nextCursor;
    } catch (err) {
      setError("Couldn't load tasks.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filtersKey]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const loadMore = useCallback(async () => {
    if (!cursorRef.current || isLoadingMore) return;
    setIsLoadingMore(true);
    setError(null);
    try {
      const { data } = await apiClient.get<CursorPage<Task>>("/api/tasks", {
        params: { projectId, ...filters, limit: PAGE_SIZE, cursor: cursorRef.current },
      });
      setTasks((prev) => [...prev, ...data.data]);
      cursorRef.current = data.nextCursor;
    } catch (err) {
      setError("Couldn't load more tasks.");
    } finally {
      setIsLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filtersKey, isLoadingMore]);

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    const previous = tasks.find((t) => t.id === taskId);
    if (!previous) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await apiClient.patch<Task>(`/api/tasks/${taskId}/status`, { status: newStatus });
    } catch (err) {
      // Roll back to the exact previous task rather than just the status
      // field, in case the failed request raced with something else.
      setTasks((prev) => prev.map((t) => (t.id === taskId ? previous : t)));
      setError("Couldn't update task status.");
    }
  }, [tasks]);

  // Merge live activity events into the current list. If another user
  // (or this user, from a second tab) moves a task we're currently
  // displaying, reflect it without a refetch. Events for tasks not in the
  // current page are ignored — they'll show up naturally on next fetch.
  useEffect(() => {
    const unsubscribe = subscribeToActivity((event: ActivityEvent) => {
      if (event.action !== "STATUS_CHANGE" || !event.toValue) return;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === event.taskId ? { ...t, status: event.toValue as TaskStatus } : t
        )
      );
    });
    return unsubscribe;
  }, [subscribeToActivity]);

  return {
    tasks,
    isLoading,
    isLoadingMore,
    hasMore: cursorRef.current !== null,
    error,
    loadMore,
    updateTaskStatus,
  };
}