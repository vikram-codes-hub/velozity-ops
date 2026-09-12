import { useState, type FormEvent } from "react";
import { apiClient, getApiErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types/domain";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateUserModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123!");
  const [role, setRole] = useState<Role>("DEVELOPER");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Name and Email are required.");
      return;
    }

    if (!isAdmin) {
      setError("Only Administrators can provision new accounts.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post("/api/users", {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });

      setName("");
      setEmail("");
      setPassword("Password123!");
      setRole("DEVELOPER");

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
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="17" y1="11" x2="23" y2="11" />
              </svg>
            </div>
            <div>
              <h2 className="modal-title">Provision User Account</h2>
              <p className="modal-subtitle">
                Create platform credentials for Project Managers, Developers, or Admins
              </p>
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
              <label htmlFor="user-name">Full Name *</label>
              <input
                id="user-name"
                type="text"
                className="input"
                placeholder="e.g. Vikram Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="modal-field full-width">
              <label htmlFor="user-email">Email Address *</label>
              <input
                id="user-email"
                type="email"
                className="input"
                placeholder="e.g. vikram@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="modal-field">
              <label htmlFor="user-role">Role *</label>
              <div className="select-wrapper">
                <select
                  id="user-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  <option value="DEVELOPER">Developer</option>
                  <option value="PM">Project Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
                <svg className="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>

            <div className="modal-field">
              <label htmlFor="user-password">Initial Password *</label>
              <input
                id="user-password"
                type="text"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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
                  <span>Provisioning…</span>
                </span>
              ) : (
                "Create Member"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
