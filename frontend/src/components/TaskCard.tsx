// frontend/src/components/TaskCard.tsx
//
// Single task row/card. The status control is role-aware:
//   - The assigned Developer can change status via the dropdown.
//   - The owning PM or an Admin can also change it (matches the backend:
//     PATCH /:id/status is open to all three roles, with ownership
//     enforced server-side per-task, not by a blanket role check).
//   - Anyone else viewing sees a read-only status badge instead of a control.
//
// OVERDUE is never offered as a selectable option — per spec it's only
// ever set by the cron job, never by a client action.

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
  const assigneeName = task.assignedTo?.name ?? ('assignedToName' in task ? task.assignedToName : undefined);

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
      <div className="task-card__main">
        <h4 className="task-card__title">{task.title}</h4>
        {task.description && <p className="task-card__description">{task.description}</p>}
      </div>

      <div className="task-card__meta">
        <span className={`task-card__priority task-card__priority--${task.priority.toLowerCase()}`}>
          {task.priority}
        </span>

        <span className={`task-card__due-date ${isOverdue ? 'task-card__due-date--overdue' : ''}`}>
          Due {dueDateLabel}
        </span>

        {assigneeName && (
          <span className="task-card__assignee">{assigneeName}</span>
        )}
      </div>

      <div className="task-card__status">
        {canChangeStatus ? (
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
        ) : (
          <span className={`task-card__status-badge task-card__status-badge--${task.status.toLowerCase()}`}>
            {STATUS_LABELS[task.status]}
          </span>
        )}
        {localError && <span className="task-card__error">{localError}</span>}
      </div>
    </div>
  );
}