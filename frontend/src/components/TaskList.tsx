// frontend/src/components/TaskList.tsx
//
// Reads filters straight from the URL (same useSearchParams source that
// FilterBar.tsx writes to) and fetches GET /api/tasks accordingly — this
// is the piece that makes the filters actually shareable: reloading a
// URL with ?status=todo&priority=high reproduces the exact same list.
//
// Converts FilterBar's plain YYYY-MM-DD date inputs into full ISO
// datetimes here (task.routes.ts's listQuerySchema expects
// z.string().datetime()) — start-of-day for dueFrom, end-of-day for
// dueTo, so a range like 2026-09-01..2026-09-01 actually includes the
// whole day instead of matching nothing.

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient, getApiErrorMessage } from '../lib/apiClient';
import { TaskCard, TaskCardData, TaskStatus } from './TaskCard';

interface TaskListProps {
  projectId?: string; // scope to one project (e.g. a project detail page); omit for "my tasks" / global lists
}

interface TasksResponse {
  tasks: TaskCardData[];
  nextCursor: string | null;
}

function toIsoRangeStart(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00.000Z`).toISOString();
}

function toIsoRangeEnd(dateOnly: string): string {
  return new Date(`${dateOnly}T23:59:59.999Z`).toISOString();
}

export function TaskList({ projectId }: TaskListProps) {
  const [searchParams] = useSearchParams();

  const [tasks, setTasks] = useState<TaskCardData[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const status = searchParams.get('status') || undefined;
  const priority = searchParams.get('priority') || undefined;
  const dueFrom = searchParams.get('dueFrom') || undefined;
  const dueTo = searchParams.get('dueTo') || undefined;

  const buildParams = useCallback(
    (cursor?: string) => ({
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(dueFrom ? { dueFrom: toIsoRangeStart(dueFrom) } : {}),
      ...(dueTo ? { dueTo: toIsoRangeEnd(dueTo) } : {}),
      ...(cursor ? { cursor } : {}),
      limit: 20,
    }),
    [projectId, status, priority, dueFrom, dueTo]
  );

  // Re-fetch from scratch whenever the filters (or project scope) change.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    apiClient
      .get<TasksResponse>('/tasks', { params: buildParams() })
      .then((res) => {
        if (cancelled) return;
        setTasks(res.data.tasks);
        setNextCursor(res.data.nextCursor);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [buildParams]);

  async function loadMore() {
    if (!nextCursor) return;
    setIsLoadingMore(true);
    try {
      const res = await apiClient.get<TasksResponse>('/tasks', {
        params: buildParams(nextCursor),
      });
      setTasks((prev) => [...prev, ...res.data.tasks]);
      setNextCursor(res.data.nextCursor);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    setUpdatingTaskId(taskId);
    const previous = tasks;
    // Optimistic update — reconciled by the real-time feed / a failed
    // request rolling it back below.
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status: newStatus });
    } catch (err) {
      setTasks(previous); // roll back on failure
      throw new Error(getApiErrorMessage(err));
    } finally {
      setUpdatingTaskId(null);
    }
  }

  if (isLoading) {
    return <div className="task-list task-list--loading">Loading tasks…</div>;
  }

  if (error) {
    return <div className="task-list task-list--error">{error}</div>;
  }

  if (tasks.length === 0) {
    return <div className="task-list task-list--empty">No tasks match these filters.</div>;
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onStatusChange={handleStatusChange}
          isUpdating={updatingTaskId === task.id}
        />
      ))}

      {nextCursor && (
        <button
          type="button"
          className="task-list__load-more"
          onClick={loadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}