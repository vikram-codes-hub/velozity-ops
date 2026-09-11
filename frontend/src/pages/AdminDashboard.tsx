// frontend/src/pages/AdminDashboardPage.tsx
//
// Admin dashboard per spec §2.4: total projects, total tasks by status,
// overdue count, live active-users-online count. Reuses ActivityFeed.tsx
// for the global feed (Admins auto-join admin:global, so it needs no
// project scoping here) and ProjectCard.tsx for the project list —
// assuming both are self-contained/take a `project` prop respectively,
// per their one-line descriptions in the project doc. Adjust the props on
// either if their real signatures differ.
//
// Route guard: wrap with ProtectedRoute(role="ADMIN") at the router level,
// matching the pattern used elsewhere — this component trusts the router
// for that and doesn't re-check the role itself.

import { Link } from "react-router-dom";
import { useAdminStats } from "../hooks/useAdminStats";
import {ActivityFeed} from "../components/ActivityFeed";
import {ProjectCard} from "../components/ProjectCard";
import { useProjects } from "../hooks/useProjects";
import type { TaskStatus } from "../hooks/Domain";

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
  OVERDUE: "Overdue",
};

const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "OVERDUE"];

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "overdue" }) {
  return (
    <div className={`admin-dashboard__stat-card${tone ? ` admin-dashboard__stat-card--${tone}` : ""}`}>
      <span className="admin-dashboard__stat-value data-label">{value}</span>
      <span className="admin-dashboard__stat-label">{label}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const stats = useAdminStats();
  const { projects, isLoading: projectsLoading } = useProjects();

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__header">
        <h1 className="admin-dashboard__title">Admin dashboard</h1>
        <Link to="/audit-log" className="button">
          View audit log
        </Link>
      </header>

      <section className="admin-dashboard__stats" aria-label="Summary stats">
        <StatCard label="Projects" value={stats.totalProjects} />
        <StatCard label="Total tasks" value={stats.totalTasks} />
        <StatCard label="Overdue tasks" value={stats.overdueCount} tone="overdue" />
        <StatCard label="Active users online" value={stats.activeUsersOnline} />
      </section>

      <section className="admin-dashboard__status-breakdown card">
        <h2 className="admin-dashboard__section-title">Tasks by status</h2>
        <ul className="admin-dashboard__status-list">
          {STATUS_ORDER.map((status) => (
            <li key={status} className="admin-dashboard__status-row">
              <span className={`badge badge--status-${status.toLowerCase().replace("_", "-")}`}>
                {STATUS_LABELS[status]}
              </span>
              <span className="admin-dashboard__status-count data-label">
                {stats.tasksByStatus[status]}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="admin-dashboard__columns">
        <section className="admin-dashboard__projects">
          <h2 className="admin-dashboard__section-title">All projects</h2>
          {projectsLoading ? (
            <p className="admin-dashboard__status-text">Loading projects…</p>
          ) : projects.length === 0 ? (
            <p className="admin-dashboard__status-text">No projects yet.</p>
          ) : (
            <div className="admin-dashboard__project-grid">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>

        <section className="admin-dashboard__feed">
          <h2 className="admin-dashboard__section-title">Live activity</h2>
          <ActivityFeed />
        </section>
      </div>
    </div>
  );
}