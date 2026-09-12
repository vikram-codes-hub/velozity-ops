import { useEffect, useState, type FormEvent } from "react";
import { apiClient, getApiErrorMessage } from "../lib/api";
import type { TaskCardData } from "./TaskCard";

export interface UserDetailData {
  id: string;
  name: string;
  email: string;
  role: string;
  projectCount?: number;
}

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserDetailData | null;
}

export function UserDetailModal({ isOpen, onClose, user }: UserDetailModalProps) {
  const [tasks, setTasks] = useState<TaskCardData[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Admin password reset state
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user?.id) {
      setNewPassword("");
      setResetSuccess(null);
      setResetError(null);
      setIsLoadingTasks(true);

      apiClient
        .get<{ tasks: TaskCardData[] }>("/api/tasks", {
          params: { assignedToId: user.id, limit: 20 },
        })
        .then(({ data }) => setTasks(data.tasks || []))
        .catch(() => setTasks([]))
        .finally(() => setIsLoadingTasks(false));
    }
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setResetError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }

    setIsResetting(true);
    setResetError(null);
    setResetSuccess(null);

    try {
      const { data } = await apiClient.post<{ message: string }>(
        `/api/users/${user.id}/reset-password`,
        { newPassword: newPassword.trim() }
      );
      setResetSuccess(data.message || `Password for ${user.name} was successfully updated.`);
      setNewPassword("");
    } catch (err) {
      setResetError(getApiErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card user-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="user-detail-modal__user-info">
            <div className="user-detail-modal__avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="user-detail-modal__name-row">
                <h2 className="modal-title">{user.name}</h2>
                <span className={`badge badge--role-${user.role.toLowerCase()}`}>
                  {user.role}
                </span>
              </div>
              <p className="modal-subtitle">{user.email}</p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="user-detail-modal__body">
          {/* Admin Password Reset Box */}
          <section className="user-detail-modal__admin-section">
            <div className="user-detail-modal__section-header">
              <div className="user-detail-modal__section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>Admin Credentials Management</span>
              </div>
              <span className="badge badge--neutral">Admin Only</span>
            </div>

            <form onSubmit={handleResetPassword} className="user-detail-modal__reset-form">
              <div className="modal-field full-width">
                <label htmlFor="admin-new-password">Reset Password for {user.name}</label>
                <div className="user-detail-modal__password-input-wrapper">
                  <input
                    id="admin-new-password"
                    type={showPassword ? "text" : "password"}
                    className="input"
                    placeholder="Enter new strong password (min 8 chars)…"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="user-detail-modal__toggle-pw"
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? "Hide password" : "Show password"}
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    {showPassword ? (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span>Show</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {resetSuccess && (
                <div className="user-detail-modal__alert user-detail-modal__alert--success">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{resetSuccess}</span>
                </div>
              )}

              {resetError && (
                <div className="user-detail-modal__alert user-detail-modal__alert--error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{resetError}</span>
                </div>
              )}

              <button
                type="submit"
                className="button button--primary user-detail-modal__submit-btn"
                disabled={isResetting || !newPassword.trim()}
              >
                {isResetting ? (
                  <span className="button__spinner-flex">
                    <span className="spinner spinner--sm" />
                    <span>Resetting Password…</span>
                  </span>
                ) : (
                  "Update & Reset Password"
                )}
              </button>
            </form>
          </section>

          {/* Assigned Tasks & Activity Overview */}
          <section className="user-detail-modal__tasks-section">
            <h3 className="user-detail-modal__subheading">
              Assigned Tasks ({tasks.length})
            </h3>

            {isLoadingTasks ? (
              <div className="user-detail-modal__loading">
                <div className="spinner spinner--sm" />
                <span>Loading assigned work…</span>
              </div>
            ) : tasks.length === 0 ? (
              <p className="user-detail-modal__empty">No active tasks assigned to this developer.</p>
            ) : (
              <div className="user-detail-modal__task-list">
                {tasks.map((task) => (
                  <div key={task.id} className="user-detail-modal__task-item">
                    <div className="user-detail-modal__task-info">
                      <span className="user-detail-modal__task-title">{task.title}</span>
                      {(task.project?.name || task.projectName) && (
                        <span className="user-detail-modal__task-project">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <span>{task.project?.name || task.projectName}</span>
                        </span>
                      )}
                    </div>
                    <span className={`badge badge--status-${task.status.toLowerCase().replace('_', '-')}`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
