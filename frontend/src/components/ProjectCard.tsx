// frontend/src/components/ProjectCard.tsx
//
// Summary card for one project — used in the PM's "my projects" list and
// the Admin's global project list.

import { Link } from 'react-router-dom';
import type { Project } from '../types/domain';

export interface ProjectCardData {
  id: string;
  name: string;
  createdAt: string;
  client?: { id: string; name: string };
  clientName?: string;
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
  const overdueCount = taskStats?.OVERDUE ?? 0;
  const clientName = project.client?.name ?? ('clientName' in project ? project.clientName : undefined) ?? '—';
  const taskCount = project._count?.tasks ?? 0;

  return (
    <Link to={`/projects/${project.id}`} className="project-card">
      <div className="project-card__header">
        <h3 className="project-card__name">{project.name}</h3>
        {overdueCount > 0 && (
          <span className="project-card__overdue-badge">
            {overdueCount} overdue
          </span>
        )}
      </div>

      <p className="project-card__client">{clientName}</p>

      <div className="project-card__footer">
        <span className="project-card__task-count">
          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </span>
        <span className="project-card__created">
          Created {new Date(project.createdAt).toLocaleDateString()}
        </span>
      </div>

      {taskStats && taskCount > 0 && (
        <div className="project-card__status-bar" role="img" aria-label="Task status breakdown">
          {(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'OVERDUE'] as const).map((status) => {
            const count = taskStats[status];
            if (count === 0) return null;
            const percent = (count / taskCount) * 100;
            return (
              <div
                key={status}
                className={`project-card__status-segment project-card__status-segment--${status.toLowerCase()}`}
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