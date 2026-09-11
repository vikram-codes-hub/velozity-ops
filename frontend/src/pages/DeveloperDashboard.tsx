// frontend/src/pages/DeveloperDashboardPage.tsx
//
// Developer dashboard per spec §2.4: "their assigned tasks, sorted by
// priority then due date." The backend already scopes GET /api/tasks to
// the caller's own assignments for a Developer token (per the ownership
// pattern in the doc — no projectId needed here, unlike a PM/Admin view),
// so this page just adds the priority-then-due-date ordering on top of
// what useTasks + useTaskFilters already give TaskList.tsx.

import { FilterBar } from "../components/FilterBar";
import { TaskCard } from "../components/TaskCard";
import { useTasks } from "../hooks/useTasks";
import { useTaskFilters } from "../hooks/useTaskFilters";
import type { Priority, Task, TaskStatus } from "../hooks/Domain";

const PRIORITY_RANK: Record<Priority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

function sortByPriorityThenDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}

export default function DeveloperDashboardPage() {
  const { filters } = useTaskFilters();
  const { tasks, isLoading, isLoadingMore, hasMore, error, loadMore, updateTaskStatus } =
    useTasks({ filters });

  const sortedTasks = sortByPriorityThenDueDate(tasks);

  return (
    <div className="developer-dashboard">
      <header className="developer-dashboard__header">
        <h1 className="developer-dashboard__title">My tasks</h1>
        <p className="developer-dashboard__subtitle">
          Sorted by priority, then due date.
        </p>
      </header>

      <FilterBar />

      {error && <p className="developer-dashboard__error">{error}</p>}

      {isLoading ? (
        <p className="developer-dashboard__status-text">Loading your tasks…</p>
      ) : sortedTasks.length === 0 ? (
        <p className="developer-dashboard__status-text">
          Nothing assigned to you matches these filters.
        </p>
      ) : (
        <>
          <div className="developer-dashboard__task-list">
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={(_taskId: string, newStatus: TaskStatus) => updateTaskStatus(task.id, newStatus)}
              />
            ))}
          </div>

          {hasMore && (
            <button
              type="button"
              className="developer-dashboard__load-more"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}