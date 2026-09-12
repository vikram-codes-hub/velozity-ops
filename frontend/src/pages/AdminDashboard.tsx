import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminStats } from "../hooks/useAdminStats";
import { useDeveloperStats } from "../hooks/useDeveloperStats";
import { ActivityFeed } from "../components/ActivityFeed";
import { ProjectCard } from "../components/ProjectCard";
import { AdminCharts } from "../components/AdminCharts";
import { AIChatPanel } from "../components/AIChatPanel";
import { UserDetailModal, type UserDetailData } from "../components/UserDetailModal";
import { useProjects } from "../hooks/useProjects";
import type { TaskStatus } from "../types/domain";

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
  OVERDUE: "Overdue",
};

const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "OVERDUE"];

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone?: "overdue" | "online" | "projects" | "tasks";
  icon: React.ReactNode;
}) {
  return (
    <div className={`admin-dashboard__stat-card${tone ? ` admin-dashboard__stat-card--${tone}` : ""}`}>
      <div className="admin-dashboard__stat-header">
        <div className="admin-dashboard__stat-icon">{icon}</div>
        {tone === "online" && <span className="pulse-dot" />}
      </div>
      <div className="admin-dashboard__stat-body">
        <span className="admin-dashboard__stat-value data-label">{value}</span>
        <span className="admin-dashboard__stat-label">{label}</span>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const stats = useAdminStats();
  const { developers, isLoading: devsLoading, refetch: refetchDevs } = useDeveloperStats();
  const { projects, isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const [selectedUser, setSelectedUser] = useState<UserDetailData | null>(null);

  useEffect(() => {
    const handleDataChanged = () => {
      refetchProjects();
      refetchDevs();
    };
    window.addEventListener("velozity:data-changed", handleDataChanged);
    return () => window.removeEventListener("velozity:data-changed", handleDataChanged);
  }, [refetchProjects, refetchDevs]);

  const totalTasksCount = stats.totalTasks || 1; // avoid divide by zero

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div>
          <h1 className="admin-dashboard__title">Admin Overview</h1>
          <p className="admin-dashboard__subtitle">System metrics, real-time activity, and project status</p>
        </div>
        <Link to="/audit-log" className="button button--secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 2 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>View Audit Logs</span>
        </Link>
      </header>

      <section className="admin-dashboard__stats" aria-label="Summary stats">
        <StatCard
          label="Active Projects"
          value={stats.totalProjects}
          tone="projects"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          }
        />
        <StatCard
          label="Total Tasks"
          value={stats.totalTasks}
          tone="tasks"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          }
        />
        <StatCard
          label="Overdue Tasks"
          value={stats.overdueCount}
          tone="overdue"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />
        <StatCard
          label="Users Online"
          value={stats.activeUsersOnline}
          tone="online"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
      </section>

      {/* Analytics Charts Grid */}
      <AdminCharts
        tasksByStatus={stats.tasksByStatus}
        totalTasks={stats.totalTasks}
        projects={projects}
      />

      <section className="admin-dashboard__status-breakdown card">
        <div className="admin-dashboard__section-header">
          <h2 className="admin-dashboard__section-title">Tasks Distribution by Status</h2>
          <span className="badge badge--neutral">Live Metrics</span>
        </div>

        <div className="admin-dashboard__status-bars">
          {STATUS_ORDER.map((status) => {
            const count = stats.tasksByStatus[status] || 0;
            const pct = Math.round((count / totalTasksCount) * 100);

            return (
              <div key={status} className="admin-dashboard__status-bar-item">
                <div className="admin-dashboard__status-info">
                  <span className={`badge badge--status-${status.toLowerCase().replace("_", "-")}`}>
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="admin-dashboard__status-count">
                    {count} <span className="admin-dashboard__status-pct">({pct}%)</span>
                  </span>
                </div>
                <div className="admin-dashboard__progress-track">
                  <div
                    className={`admin-dashboard__progress-fill admin-dashboard__progress-fill--${status.toLowerCase().replace("_", "-")}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Developer Members & Project Associations Panel */}
      <section className="members-panel card">
        <div className="admin-dashboard__section-header">
          <div>
            <h2 className="admin-dashboard__section-title">Team Member Project Associations</h2>
            <p className="admin-dashboard__subtitle" style={{ fontSize: '13px' }}>
              Overview of developers and total projects assigned
            </p>
          </div>
          <span className="badge badge--role-developer">{developers.length} Developers</span>
        </div>

        {devsLoading ? (
          <div className="admin-dashboard__loading-state">
            <div className="spinner" />
            <span>Loading members…</span>
          </div>
        ) : developers.length === 0 ? (
          <div className="empty-state">
            <p>No developers registered in the platform yet.</p>
          </div>
        ) : (
          <div className="members-panel__grid">
            {developers.map((dev) => (
              <div
                key={dev.id}
                className="members-panel__card members-panel__card--clickable"
                onClick={() => setSelectedUser(dev)}
                title={`Click to view details or reset password for ${dev.name}`}
              >
                <div className="members-panel__avatar">
                  {dev.name.charAt(0).toUpperCase()}
                </div>
                <div className="members-panel__info">
                  <span className="members-panel__name">{dev.name}</span>
                  <span className="members-panel__email">{dev.email}</span>
                </div>
                <div className="members-panel__badge-wrapper">
                  <span className="badge badge--neutral" title={`${dev.name} is assigned to ${dev.projectCount} project(s)`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    {dev.projectCount} {dev.projectCount === 1 ? 'project' : 'projects'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="admin-dashboard__columns">
        <section className="admin-dashboard__projects">
          <h2 className="admin-dashboard__section-title">All Projects Analytics</h2>
          {projectsLoading ? (
            <div className="admin-dashboard__loading-state">
              <div className="spinner" />
              <span>Loading projects…</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <p>No projects found in the system yet.</p>
            </div>
          ) : (
            <div className="admin-dashboard__project-grid">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>

        <section className="admin-dashboard__feed">
          <h2 className="admin-dashboard__section-title">Live Activity Feed</h2>
          <ActivityFeed />
        </section>
      </div>

      {/* Admin User Detail & Password Reset Modal */}
      <UserDetailModal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />

      {/* Floating AI Assistant */}
      <AIChatPanel />
    </div>
  );
}