import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiClient } from "../lib/api";
import { FilterBar } from "../components/FilterBar";
import { TaskList } from "../components/TaskList";
import { ActivityFeed } from "../components/ActivityFeed";
import { CreateTaskModal } from "../components/CreateTaskModal";
import { AssignTeamMemberModal } from "../components/AssignTeamMemberModal";
import { useAuth } from "../context/AuthContext";
import type { Project } from "../types/domain";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    apiClient
      .get<{ project: Project }>(`/api/projects/${id}`)
      .then(({ data }) => setProject(data.project))
      .catch(() => setError("Project not found or accessible."))
      .finally(() => setIsLoading(false));
  }, [id, refreshKey]);

  const canCreateTask = user?.role === "ADMIN" || user?.role === "PM";

  if (isLoading) {
    return (
      <div className="project-detail__loading">
        <div className="spinner" />
        <span>Loading project details…</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="empty-state">
        <h3>Project not found</h3>
        <p>{error || "You might not have permission to view this project."}</p>
        <Link to="/" className="button button--secondary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const pmUser = (project as any).createdBy;

  return (
    <div className="project-detail">
      {/* Top Header */}
      <header className="project-detail__header">
        <div>
          <div className="project-detail__breadcrumb">
            <Link to="/" className="project-detail__back">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back to Overview</span>
            </Link>
            <span className="project-detail__slash">/</span>
            <span className="badge badge--neutral">
              {project.client?.name || "Client"}
            </span>
          </div>

          <h1 className="project-detail__title">{project.name}</h1>
          <p className="project-detail__subtitle">
            Created on {new Date(project.createdAt).toLocaleDateString(undefined, { dateStyle: "long" })}
          </p>
        </div>

        {canCreateTask && (
          <div className="project-detail__action-buttons">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => setIsAssignModalOpen(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="17" y1="11" x2="23" y2="11" />
              </svg>
              <span>+ Member</span>
            </button>

            <button
              type="button"
              className="button button--primary"
              onClick={() => setIsTaskModalOpen(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Add Task</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Grid */}
      <div className="project-detail__grid">
        <div className="project-detail__main">
          <section className="project-detail__filters card">
            <FilterBar />
          </section>

          <section className="project-detail__tasks">
            <TaskList key={refreshKey} projectId={project.id} />
          </section>
        </div>

        <aside className="project-detail__sidebar">
          {pmUser && (
            <div className="card project-detail__pm-card">
              <span className="project-detail__pm-label">Project Lead</span>
              <div className="project-detail__pm-user">
                <div className="sidebar__avatar">
                  {pmUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="project-detail__pm-info">
                  <span className="project-detail__pm-name">{pmUser.name}</span>
                  <span className="project-detail__pm-email">{pmUser.email}</span>
                </div>
                <span className="badge badge--role-pm">PM</span>
              </div>
            </div>
          )}

          <h2 className="project-detail__sidebar-title">Project Activity</h2>
          <ActivityFeed projectId={project.id} />
        </aside>
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        defaultProjectId={project.id}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      <AssignTeamMemberModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        projectId={project.id}
        projectName={project.name}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
