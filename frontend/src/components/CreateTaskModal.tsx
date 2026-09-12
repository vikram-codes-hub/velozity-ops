import { useEffect, useState, type FormEvent } from "react";
import { apiClient, getApiErrorMessage } from "../lib/api";
import { useProjects } from "../hooks/useProjects";
import type { Priority, UserSummary } from "../types/domain";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultProjectId?: string;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
  defaultProjectId,
}: CreateTaskModalProps) {
  const { projects } = useProjects();
  const [users, setUsers] = useState<UserSummary[]>([]);

  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultProjectId) {
      setProjectId(defaultProjectId);
    } else if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [defaultProjectId, projects, projectId]);

  useEffect(() => {
    if (isOpen) {
      apiClient
        .get<{ users: UserSummary[] }>("/api/users")
        .then(({ data }) => setUsers(data.users || []))
        .catch(() => setUsers([]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      setError("Please select a project.");
      return;
    }
    if (!dueDate) {
      setError("Please select a due date.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Format due date to ISO datetime
      const isoDueDate = new Date(`${dueDate}T23:59:59.000Z`).toISOString();

      await apiClient.post("/api/tasks", {
        projectId,
        title,
        description: description || undefined,
        assignedToId: assignedToId || undefined,
        priority,
        dueDate: isoDueDate,
      });

      // Reset form
      setTitle("");
      setDescription("");
      setAssignedToId("");
      setPriority("MEDIUM");
      setDueDate("");

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div>
              <h2 className="modal-title">Create New Task</h2>
              <p className="modal-subtitle">Assign work items to developers & set target deadlines</p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-grid">
            <div className="modal-field full-width">
              <label htmlFor="task-title">Task Title *</label>
              <input
                id="task-title"
                type="text"
                className="input"
                placeholder="e.g. Implement OAuth SSO authentication flow"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="modal-field">
              <label htmlFor="task-project">Project *</label>
              <div className="select-wrapper">
                <select
                  id="task-project"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <svg className="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            <div className="modal-field">
              <label htmlFor="task-assignee">Assignee</label>
              <div className="select-wrapper">
                <select
                  id="task-assignee"
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                <svg className="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            <div className="modal-field">
              <label htmlFor="task-priority">Priority</label>
              <div className="select-wrapper">
                <select
                  id="task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <svg className="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            <div className="modal-field">
              <label htmlFor="task-due-date">Due Date *</label>
              <input
                id="task-due-date"
                type="date"
                className="input input--date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div className="modal-field full-width">
              <label htmlFor="task-description">Description</label>
              <textarea
                id="task-description"
                className="input textarea"
                rows={3}
                placeholder="Optional details, acceptance criteria, or specification notes…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="button__spinner-flex">
                  <span className="spinner spinner--sm" />
                  <span>Creating…</span>
                </span>
              ) : (
                "Create Task"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
