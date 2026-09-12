import { useEffect, useState } from "react";
import { usePmStats, PRIORITY_ORDER } from "../hooks/usePmStats";
import { useProjects } from "../hooks/useProjects";
import { useTasks } from "../hooks/useTasks";
import { ProjectCard } from "../components/ProjectCard";
import { TaskCard } from "../components/TaskCard";
import { CreateProjectModal } from "../components/CreateProjectModal";
import { CreateTaskModal } from "../components/CreateTaskModal";
import { AIChatPanel } from "../components/AIChatPanel";
import { AIProjectSummary } from "../components/AIProjectSummary";
import type { Priority, TaskStatus } from "../types/domain";

const PRIORITY_LABELS: Record<Priority, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export default function PMDashboardPage() {
  const stats = usePmStats();
  const { projects, isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { updateTaskStatus } = useTasks({ filters: {} });

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  useEffect(() => {
    const handleDataChanged = () => {
      refetchProjects();
    };
    window.addEventListener("velozity:data-changed", handleDataChanged);
    return () => window.removeEventListener("velozity:data-changed", handleDataChanged);
  }, [refetchProjects]);

  const totalTasksCount = stats.totalTasks || 1;

  return (
    <div className="pm-dashboard">
      <header className="pm-dashboard__header">
        <div>
          <h1 className="pm-dashboard__title">Project Manager Hub</h1>
          <p className="pm-dashboard__subtitle">Track managed projects, task priorities, and immediate deliverables</p>
        </div>
        <div className="pm-dashboard__header-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setIsTaskModalOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New Task</span>
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => setIsProjectModalOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            <span>New Project</span>
          </button>
        </div>
      </header>

      <section className="pm-dashboard__stats" aria-label="Summary stats">
        <div className="pm-dashboard__stat-card">
          <div className="pm-dashboard__stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="pm-dashboard__stat-body">
            <span className="pm-dashboard__stat-value data-label">{stats.totalProjects}</span>
            <span className="pm-dashboard__stat-label">Managed Projects</span>
          </div>
        </div>

        <div className="pm-dashboard__stat-card">
          <div className="pm-dashboard__stat-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div className="pm-dashboard__stat-body">
            <span className="pm-dashboard__stat-value data-label">{stats.totalTasks}</span>
            <span className="pm-dashboard__stat-label">Total Active Tasks</span>
          </div>
        </div>
      </section>

      <section className="pm-dashboard__priority-breakdown card">
        <div className="pm-dashboard__section-header">
          <h2 className="pm-dashboard__section-title">Tasks by Priority Level</h2>
          <span className="badge badge--neutral">Priority Distribution</span>
        </div>

        <div className="pm-dashboard__priority-bars">
          {PRIORITY_ORDER.map((priority) => {
            const count = stats.tasksByPriority[priority] || 0;
            const pct = Math.round((count / totalTasksCount) * 100);

            return (
              <div key={priority} className="pm-dashboard__priority-item">
                <div className="pm-dashboard__priority-info">
                  <span className={`badge badge--priority-${priority.toLowerCase()}`}>
                    {PRIORITY_LABELS[priority]}
                  </span>
                  <span className="pm-dashboard__priority-count">
                    {count} <span className="pm-dashboard__priority-pct">({pct}%)</span>
                  </span>
                </div>
                <div className="pm-dashboard__progress-track">
                  <div
                    className={`pm-dashboard__progress-fill pm-dashboard__progress-fill--${priority.toLowerCase()}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="pm-dashboard__columns">
        <section className="pm-dashboard__projects">
          <h2 className="pm-dashboard__section-title">Your Projects</h2>
          {projectsLoading ? (
            <div className="pm-dashboard__loading">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="empty-state">
              <p>You haven't created any projects yet.</p>
              <button
                type="button"
                className="button button--primary"
                onClick={() => setIsProjectModalOpen(true)}
              >
                Create First Project
              </button>
            </div>
          ) : (
            <div className="pm-dashboard__project-grid">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>

        <section className="pm-dashboard__upcoming">
          <h2 className="pm-dashboard__section-title">Due This Week</h2>
          {stats.isLoading ? (
            <div className="pm-dashboard__loading">Loading upcoming tasks…</div>
          ) : stats.upcomingDueThisWeek.length === 0 ? (
            <div className="empty-state">
              <p>No deliverables due in the next 7 days.</p>
            </div>
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

      <CreateProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSuccess={() => refetchProjects()}
      />
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => refetchProjects()}
      />

      {/* Floating AI Assistant */}
      <AIChatPanel />
    </div>
  );
}