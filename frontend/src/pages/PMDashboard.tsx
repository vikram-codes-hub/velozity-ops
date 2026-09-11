// frontend/src/pages/PMDashboardPage.tsx
//
// PM dashboard per spec §2.4: their projects summary, tasks by priority,
// upcoming due dates this week. Reuses ProjectCard.tsx for the project
// grid and TaskCard.tsx for each upcoming-due-date row.

import { Link } from "react-router-dom";
import { usePmStats, PRIORITY_ORDER } from "../hooks/usePmStats";
import { useProjects } from "../hooks/useProjects";
import { useTasks } from "../hooks/useTasks";
import { ProjectCard } from "../components/ProjectCard";
import { TaskCard } from "../components/TaskCard";
import type { Priority, TaskStatus } from "../hooks/Domain";

const PRIORITY_LABELS: Record<Priority, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export default function PMDashboardPage() {
  const stats = usePmStats();
  const { projects, isLoading: projectsLoading } = useProjects();
  const { updateTaskStatus } = useTasks({ filters: {} });

  return (
    <div className="pm-dashboard">
      <header className="pm-dashboard__header">
        <h1 className="pm-dashboard__title">PM dashboard</h1>
        <Link to="/projects/new" className="button button--primary">
          New project
        </Link>
      </header>

      <section className="pm-dashboard__stats" aria-label="Summary stats">
        <div className="pm-dashboard__stat-card">
          <span className="pm-dashboard__stat-value data-label">{stats.totalProjects}</span>
          <span className="pm-dashboard__stat-label">Your projects</span>
        </div>
        <div className="pm-dashboard__stat-card">
          <span className="pm-dashboard__stat-value data-label">{stats.totalTasks}</span>
          <span className="pm-dashboard__stat-label">Total tasks</span>
        </div>
      </section>

      <section className="pm-dashboard__priority-breakdown card">
        <h2 className="pm-dashboard__section-title">Tasks by priority</h2>
        <ul className="pm-dashboard__priority-list">
          {PRIORITY_ORDER.map((priority) => (
            <li key={priority} className="pm-dashboard__priority-row">
              <span className={`badge badge--priority-${priority.toLowerCase()}`}>
                {PRIORITY_LABELS[priority]}
              </span>
              <span className="pm-dashboard__priority-count data-label">
                {stats.tasksByPriority[priority]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="pm-dashboard__columns">
        <section className="pm-dashboard__projects">
          <h2 className="pm-dashboard__section-title">Your projects</h2>
          {projectsLoading ? (
            <p className="pm-dashboard__status-text">Loading projects…</p>
          ) : projects.length === 0 ? (
            <p className="pm-dashboard__status-text">
              You haven't created any projects yet.
            </p>
          ) : (
            <div className="pm-dashboard__project-grid">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>

        <section className="pm-dashboard__upcoming">
          <h2 className="pm-dashboard__section-title">Due this week</h2>
          {stats.isLoading ? (
            <p className="pm-dashboard__status-text">Loading…</p>
          ) : stats.upcomingDueThisWeek.length === 0 ? (
            <p className="pm-dashboard__status-text">
              Nothing due in the next 7 days.
            </p>
          ) : (
            <div className="pm-dashboard__upcoming-list">
              {stats.upcomingDueThisWeek.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={(_taskId: string, newStatus: TaskStatus) => updateTaskStatus(task.id, newStatus)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}