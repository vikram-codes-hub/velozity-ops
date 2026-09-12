import { FilterBar } from "../components/FilterBar";
import { TaskCard } from "../components/TaskCard";
import { useTasks } from "../hooks/useTasks";
import { useTaskFilters } from "../hooks/useTaskFilters";
import type { Priority, Task, TaskStatus } from "../types/domain";

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
  const criticalCount = sortedTasks.filter((t) => t.priority === "CRITICAL").length;
  const overdueCount = sortedTasks.filter((t) => t.status === "OVERDUE").length;

  return (
    <div className="developer-dashboard">
      <header className="developer-dashboard__header">
        <div>
          <h1 className="developer-dashboard__title">Developer Workspace</h1>
          <p className="developer-dashboard__subtitle">
            Assigned tasks automatically prioritized by urgency & due date
          </p>
        </div>
        <div className="developer-dashboard__summary-pills">
          <span className="badge badge--neutral">
            {sortedTasks.length} {sortedTasks.length === 1 ? "Task" : "Tasks"} Total
          </span>
          {criticalCount > 0 && (
            <span className="badge badge--priority-critical">
              {criticalCount} Critical
            </span>
          )}
          {overdueCount > 0 && (
            <span className="badge badge--status-overdue">
              {overdueCount} Overdue
            </span>
          )}
        </div>
      </header>

      <section className="developer-dashboard__filter-section card">
        <FilterBar />
      </section>

      {error && <div className="developer-dashboard__error-banner">{error}</div>}

      {isLoading ? (
        <div className="developer-dashboard__loading">
          <div className="spinner" />
          <span>Fetching assigned tasks…</span>
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h3>All caught up!</h3>
          <p>No tasks match the selected filters or assigned to your workspace.</p>
        </div>
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
            <div className="developer-dashboard__load-more-container">
              <button
                type="button"
                className="button button--secondary developer-dashboard__load-more"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "Loading tasks…" : "Load More Tasks"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}