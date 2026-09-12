import { useEffect, useState, type FormEvent } from "react";
import { apiClient, getApiErrorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { UserSummary } from "../types/domain";

interface ClientOption {
  id: string;
  name: string;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProjectModalProps) {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [createdById, setCreatedById] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [pms, setPms] = useState<UserSummary[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (isOpen) {
      apiClient
        .get<{ clients: ClientOption[] }>("/api/clients")
        .then(({ data }) => setClients(data.clients || []))
        .catch(() => setClients([]));

      if (isAdmin) {
        apiClient
          .get<{ users: UserSummary[] }>("/api/users?role=PM")
          .then(({ data }) => setPms(data.users || []))
          .catch(() => setPms([]));
      }
    }
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  const handleCreateClientInline = async () => {
    if (!newClientName.trim()) return;
    try {
      const { data } = await apiClient.post<{ client: ClientOption }>("/api/clients", {
        name: newClientName.trim(),
      });
      setClients((prev) => [...prev, data.client]);
      setClientId(data.client.id);
      setIsCreatingNewClient(false);
      setNewClientName("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a project name.");
      return;
    }
    if (!clientId) {
      setError("Please select a client.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await apiClient.post("/api/projects", {
        name: name.trim(),
        clientId,
        createdById: isAdmin && createdById ? createdById : undefined,
      });

      setName("");
      setClientId("");
      setCreatedById("");
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
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </div>
            <div>
              <h2 className="modal-title">New Project</h2>
              <p className="modal-subtitle">Initialize a project workspace for a client organization</p>
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
              <label htmlFor="project-name">Project Name *</label>
              <input
                id="project-name"
                type="text"
                className="input"
                placeholder="e.g. NextGen E-Commerce Mobile App"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="modal-field full-width">
              <div className="modal-label-row">
                <label htmlFor="project-client">Client Organization *</label>
                <button
                  type="button"
                  className="modal-inline-link"
                  onClick={() => setIsCreatingNewClient(!isCreatingNewClient)}
                >
                  {isCreatingNewClient ? "Select existing client" : "+ New Client"}
                </button>
              </div>

              {isCreatingNewClient ? (
                <div className="modal-inline-input-group">
                  <input
                    type="text"
                    className="input"
                    placeholder="Enter new client organization name"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={handleCreateClientInline}
                  >
                    Add
                  </button>
                </div>
              ) : (
                <div className="select-wrapper">
                  <select
                    id="project-client"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select client organization…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <svg className="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="modal-field full-width">
                <label htmlFor="project-pm">Assign Project Manager (PM)</label>
                <div className="select-wrapper">
                  <select
                    id="project-pm"
                    value={createdById}
                    onChange={(e) => setCreatedById(e.target.value)}
                  >
                    <option value="">Default (Self - Admin)</option>
                    {pms.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.name} ({pm.email})
                      </option>
                    ))}
                  </select>
                  <svg className="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
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
                  <span>Creating…</span>
                </span>
              ) : (
                "Create Project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
