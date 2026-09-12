import { useEffect, useState, type FormEvent } from "react";
import { apiClient, getApiErrorMessage } from "../lib/api";
import { useProjects } from "../hooks/useProjects";
import type { TaskCardData } from "../components/TaskCard";
import type { UserSummary } from "../types/domain";

interface AssignTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  projectName?: string;
  onSuccess?: () => void;
}

export function AssignTeamMemberModal({
  isOpen,
  onClose,
  projectId: propProjectId,
  projectName: propProjectName,
  onSuccess,
}: AssignTeamMemberModalProps) {
  const { projects } = useProjects();

  const [selectedProjectId, setSelectedProjectId] = useState(propProjectId || "");
  const [developers, setDevelopers] = useState<UserSummary[]>([]);
  const [tasks, setTasks] = useState<TaskCardData[]>([]);

  const [selectedDevId, setSelectedDevId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"EXISTING_TASK" | "NEW_TASK">("NEW_TASK");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selectedProjectId when propProjectId changes
  useEffect(() => {
    if (propProjectId) {
      setSelectedProjectId(propProjectId);
    } else if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [propProjectId, projects, selectedProjectId]);

  useEffect(() => {
    if (isOpen) {
      // Fetch existing developers from platform roster
      apiClient
        .get<{ users: UserSummary[] }>("/api/users?role=DEVELOPER")
        .then(({ data }) => {
          setDevelopers(data.users || []);
          if (data.users && data.users.length > 0 && !selectedDevId) {
            setSelectedDevId(data.users[0].id);
          }
        })
        .catch(() => setDevelopers([]));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && selectedProjectId) {
      // Fetch tasks for the selected project
      apiClient
        .get<{ tasks: TaskCardData[] }>("/api/tasks", { params: { projectId: selectedProjectId, limit: 50 } })
        .then(({ data }) => {
          setTasks(data.tasks || []);
          if (data.tasks && data.tasks.length > 0) {
            setSelectedTaskId(data.tasks[0].id);
            setAssignmentMode("EXISTING_TASK");
          } else {
            setAssignmentMode("NEW_TASK");
          }
        })
        .catch(() => setTasks([]));
    }
  }, [isOpen, selectedProjectId]);

  if (!isOpen) return null;

  const currentProjectName =
    propProjectName || projects.find((p) => p.id === selectedProjectId)?.name || "Selected Project";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setError("Please select a project.");
      return;
    }
    if (!selectedDevId) {
      setError("Please select a developer to add to the team.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (assignmentMode === "EXISTING_TASK" && selectedTaskId) {
        // Assign developer to existing task
        await apiClient.patch(`/api/tasks/${selectedTaskId}`, {
          assignedToId: selectedDevId,
        });
      } else {
        // Create new task for this developer in this project
        const title = newTaskTitle.trim() || `Project Assignment: ${currentProjectName}`;
        const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await apiClient.post("/api/tasks", {
          projectId: selectedProjectId,
          title,
          assignedToId: selectedDevId,
          priority: "MEDIUM",
          dueDate: defaultDueDate,
        });
      }

      setNewTaskTitle("");
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
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <polyline points="17 11 19 13 23 9" />
              </svg>
            </div>
            <div>
              <h2 className="modal-title">Add Team Member</h2>
              <p className="modal-subtitle">Choose an existing developer from the platform roster to assign to {currentProjectName}</p>
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
            {!propProjectId && (
              <div className="modal-field full-width">
                <label htmlFor="assign-project">Target Project *</label>
                <div className="select-wrapper">
                  <select
                    id="assign-project"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select project…</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <svg className="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            )}

            <div className="modal-field full-width">
              <label htmlFor="assign-dev">Select Existing Developer *</label>
              <div className="select-wrapper">
                <select
                  id="assign-dev"
                  value={selectedDevId}
                  onChange={(e) => setSelectedDevId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select developer from platform roster…</option>
                  {developers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.email})
                    </option>
                  ))}
                </select>
                <svg className="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            <div className="modal-field full-width">
              <label>Assignment Method</label>
              <div className="modal-radio-group">
                <label className="modal-radio-label">
                  <input
                    type="radio"
                    name="mode"
                    value="NEW_TASK"
                    checked={assignmentMode === "NEW_TASK"}
                    onChange={() => setAssignmentMode("NEW_TASK")}
                  />
                  <span>Create & Assign Initial Task</span>
                </label>

                {tasks.length > 0 && (
                  <label className="modal-radio-label">
                    <input
                      type="radio"
                      name="mode"
                      value="EXISTING_TASK"
                      checked={assignmentMode === "EXISTING_TASK"}
                      onChange={() => setAssignmentMode("EXISTING_TASK")}
                    />
                    <span>Assign to Existing Task</span>
                  </label>
                )}
              </div>
            </div>

            {assignmentMode === "EXISTING_TASK" ? (
              <div className="modal-field full-width">
                <label htmlFor="assign-task">Select Project Task *</label>
                <div className="select-wrapper">
                  <select
                    id="assign-task"
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    required
                  >
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.status})
                      </option>
                    ))}
                  </select>
                  <svg className="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="modal-field full-width">
                <label htmlFor="task-assignment-title">Initial Task Title</label>
                <input
                  id="task-assignment-title"
                  type="text"
                  className="input"
                  placeholder={`e.g. Core Feature Setup for ${currentProjectName}`}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
              </div>
            )}
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
                  <span>Assigning…</span>
                </span>
              ) : (
                "Add to Project Team"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

