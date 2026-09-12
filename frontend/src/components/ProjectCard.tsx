import { Link } from 'react-router-dom';
import type { Project } from '../types/domain';

export interface ProjectCardData {
  id: string;
  name: string;
  createdAt: string;
  client?: { id: string; name: string };
  clientName?: string;
  createdBy?: { id: string; name: string; role: string };
  _count?: { tasks: number };
}

export interface TaskStatusBreakdown {
  TODO: number;
  IN_PROGRESS: number;
  IN_REVIEW: number;
  DONE: number;
  OVERDUE: number;
}

interface ProjectCardProps {
  project: ProjectCardData | Project;
  taskStats?: TaskStatusBreakdown;
}

export function ProjectCard({ project, taskStats }: ProjectCardProps) {
  const p = project as Project;
  const effectiveTaskStats = p.taskCounts ?? taskStats;
  const overdueCount = p.overdueCount ?? effectiveTaskStats?.OVERDUE ?? 0;
  const memberCount = p.memberCount ?? 0;
  const clientName = project.client?.name ?? ('clientName' in project ? (project as any).clientName : undefined) ?? '—';
  const pmName = (project as any).createdBy?.name;
  const taskCount = project._count?.tasks ?? 0;

  const doneCount = effectiveTaskStats?.DONE ?? 0;
  const pacePercent = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;

  return (
    <Link to={`/projects/${project.id}`} className="project-card">
      <div className="project-card__top">
        <div className="project-card__icon-wrapper">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        {overdueCount > 0 ? (
          <span className="project-card__overdue-badge" title={`${overdueCount} task(s) overdue`}>
            <span className="pulse-dot pulse-dot--red" />
            {overdueCount} Overdue
          </span>
        ) : (
          <span className="project-card__arrow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        )}
      </div>

      <div className="project-card__body">
        <h3 className="project-card__name">{project.name}</h3>
        <div className="project-card__meta-pills">
          <span className="project-card__client-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>{clientName}</span>
          </span>
          {pmName && (
            <span className="badge badge--role-pm" title="Assigned Project Manager">
              PM: {pmName}
            </span>
          )}
          {memberCount > 0 && (
            <span className="project-card__member-pill" title={`${memberCount} assigned developer(s)`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>{memberCount} {memberCount === 1 ? 'dev' : 'devs'}</span>
            </span>
          )}
        </div>
      </div>

      <div className="project-card__pace">
        <div className="project-card__pace-header">
          <span className="project-card__pace-label">Work Pace</span>
          <span className="project-card__pace-value">{pacePercent}% Complete</span>
        </div>
      </div>

      <div className="project-card__footer">
        <span className="project-card__task-count">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </span>
        <span className="project-card__created">
          {new Date(project.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      {effectiveTaskStats && taskCount > 0 && (
        <div className="project-card__status-bar" role="img" aria-label="Task status breakdown">
          {(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'OVERDUE'] as const).map((status) => {
            const count = effectiveTaskStats[status] ?? 0;
            if (count === 0) return null;
            const percent = (count / taskCount) * 100;
            return (
              <div
                key={status}
                className={`project-card__status-segment project-card__status-segment--${status.toLowerCase().replace('_', '-')}`}
                style={{ width: `${percent}%` }}
                title={`${status.replace('_', ' ')}: ${count}`}
              />
            );
          })}
        </div>
      )}
    </Link>
  );
}