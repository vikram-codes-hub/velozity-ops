import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Task, Priority as TaskPriority, TaskStatus } from '../types/domain';

export type { TaskStatus, TaskPriority };

export interface TaskCardData {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignedTo?: { id: string; name: string } | null;
  assignedToName?: string;
  projectId: string;
}

interface TaskCardProps {
  task: TaskCardData | Task;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  isUpdating?: boolean;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  OVERDUE: 'Overdue',
};

const CLIENT_SETTABLE_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export function TaskCard({ task, onStatusChange, isUpdating = false }: TaskCardProps) {
  const { user } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  const assigneeId = task.assignedTo?.id;
  const assigneeName = task.assignedTo?.name ?? ('assignedToName' in task ? (task as any).assignedToName : undefined);

  const canChangeStatus =
    user?.role === 'ADMIN' ||
    user?.role === 'PM' ||
    (user?.role === 'DEVELOPER' && assigneeId === user.id);

  const isOverdue = task.status === 'OVERDUE';
  const dueDateLabel = new Date(task.dueDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  async function handleStatusSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as TaskStatus;
    setLocalError(null);
    try {
      await onStatusChange(task.id, newStatus);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  }

  return (
    <div className={`task-card task-card--priority-${task.priority.toLowerCase()}`}>
      <div className={`task-card__priority-strip task-card__priority-strip--${task.priority.toLowerCase()}`} />
      
      <div className="task-card__content">
        <div className="task-card__header">
          <div className="task-card__main">
            <h4 className="task-card__title">{task.title}</h4>
            {task.description && <p className="task-card__description">{task.description}</p>}
          </div>

          <div className="task-card__status">
            {canChangeStatus ? (
              <div className="task-card__select-wrapper">
                <select
                  value={task.status}
                  onChange={handleStatusSelect}
                  disabled={isUpdating || isOverdue}
                  className={`task-card__status-select task-card__status-select--${task.status.toLowerCase()}`}
                >
                  {isOverdue && <option value="OVERDUE">{STATUS_LABELS.OVERDUE}</option>}
                  {CLIENT_SETTABLE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <svg className="task-card__select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            ) : (
              <span className={`task-card__status-badge task-card__status-badge--${task.status.toLowerCase()}`}>
                <span className="task-card__status-dot" />
                {STATUS_LABELS[task.status]}
              </span>
            )}
          </div>
        </div>

        <div className="task-card__meta">
          <span className={`task-card__priority badge badge--priority-${task.priority.toLowerCase()}`}>
            {task.priority}
          </span>

          <span className={`task-card__due-date ${isOverdue ? 'task-card__due-date--overdue' : ''}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{dueDateLabel}</span>
          </span>

          {assigneeName && (
            <span className="task-card__assignee">
              <span className="task-card__assignee-avatar">
                {assigneeName.charAt(0).toUpperCase()}
              </span>
              <span>{assigneeName}</span>
            </span>
          )}
        </div>

        {localError && <span className="task-card__error">{localError}</span>}
      </div>
    </div>
  );
}