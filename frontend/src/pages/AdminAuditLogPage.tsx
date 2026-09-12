import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { useProjects } from "../hooks/useProjects";
import { useAuditLog, type AuditLogFilters } from "../lib/useAuditLog";
import { formatActivityLine } from "../lib/time";
import type { UserSummary } from "../types/domain";

function toDateOnly(iso: string | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function dateOnlyToStartOfDayIso(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00`).toISOString();
}

function dateOnlyToEndOfDayIso(dateOnly: string): string {
  return new Date(`${dateOnly}T23:59:59.999`).toISOString();
}

export default function AdminAuditLogPage() {
  const { projects } = useProjects();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [filters, setFilters] = useState<AuditLogFilters>({});

  useEffect(() => {
    apiClient
      .get<{ users: UserSummary[] }>("/api/users")
      .then(({ data }) => setUsers(data.users || []))
      .catch(() => setUsers([]));
  }, []);

  const { entries, isLoading, isLoadingMore, hasMore, error, loadMore } =
    useAuditLog(filters);

  const handleProjectChange = (value: string) => {
    setFilters((prev) => ({ ...prev, projectId: value || undefined }));
  };

  const handleUserChange = (value: string) => {
    setFilters((prev) => ({ ...prev, userId: value || undefined }));
  };

  const handleDateFromChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      dateFrom: value ? dateOnlyToStartOfDayIso(value) : undefined,
    }));
  };

  const handleDateToChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      dateTo: value ? dateOnlyToEndOfDayIso(value) : undefined,
    }));
  };

  const clearFilters = () => setFilters({});

  const hasActiveFilters =
    filters.projectId || filters.userId || filters.dateFrom || filters.dateTo;

  return (
    <div className="audit-log">
      <header className="audit-log__header">
        <div>
          <h1 className="audit-log__title">System Audit Log</h1>
          <p className="audit-log__subtitle">
            Complete, immutable security & activity audit trail across all organization projects
          </p>
        </div>
      </header>

      <div className="audit-log__filters card">
        <div className="audit-log__filter">
          <span className="audit-log__filter-label">Project</span>
          <div className="select-wrapper">
            <select
              className="audit-log__select"
              value={filters.projectId ?? ""}
              onChange={(e) => handleProjectChange(e.target.value)}
            >
              <option value="">All projects</option>
              {Array.isArray(projects) &&
                projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
            </select>
            <svg className="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <div className="audit-log__filter">
          <span className="audit-log__filter-label">User</span>
          <div className="select-wrapper">
            <select
              className="audit-log__select"
              value={filters.userId ?? ""}
              onChange={(e) => handleUserChange(e.target.value)}
            >
              <option value="">All users</option>
              {Array.isArray(users) &&
                users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
            </select>
            <svg className="select-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <div className="audit-log__filter">
          <span className="audit-log__filter-label">From</span>
          <input
            className="audit-log__date-input input"
            type="date"
            value={toDateOnly(filters.dateFrom)}
            onChange={(e) => handleDateFromChange(e.target.value)}
          />
        </div>

        <div className="audit-log__filter">
          <span className="audit-log__filter-label">To</span>
          <input
            className="audit-log__date-input input"
            type="date"
            value={toDateOnly(filters.dateTo)}
            onChange={(e) => handleDateToChange(e.target.value)}
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="audit-log__clear-button"
            onClick={clearFilters}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Reset</span>
          </button>
        )}
      </div>

      {error && <div className="audit-log__error-banner">{error}</div>}

      {isLoading ? (
        <div className="audit-log__loading">
          <div className="spinner" />
          <span>Fetching audit events…</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="empty-state">
          <p>
            {hasActiveFilters
              ? "No activity logs match these criteria."
              : "No system audit events recorded yet."}
          </p>
        </div>
      ) : (
        <div className="audit-log__table-container card">
          <table className="audit-log__table">
            <thead>
              <tr>
                <th>Event Activity</th>
                <th>Project Scope</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const taskLabel = entry.taskTitle
                  ? `"${entry.taskTitle}"`
                  : entry.taskId
                  ? `Task ${entry.taskId.slice(0, 8)}`
                  : "Task";

                return (
                  <tr key={entry.id} className="audit-log__row">
                    <td className="audit-log__cell audit-log__cell--activity">
                      <span className="audit-log__activity-text">
                        {formatActivityLine({
                          userName: entry.userName,
                          action: entry.action,
                          taskLabel,
                          fromValue: entry.fromValue,
                          toValue: entry.toValue,
                          createdAt: entry.createdAt,
                        })}
                      </span>
                    </td>
                    <td className="audit-log__cell audit-log__cell--project">
                      {entry.projectName ? (
                        <span className="badge badge--neutral">{entry.projectName}</span>
                      ) : (
                        <span className="audit-log__muted">—</span>
                      )}
                    </td>
                    <td className="audit-log__cell audit-log__cell--time">
                      <span className="audit-log__timestamp">
                        {new Date(entry.createdAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {hasMore && (
            <div className="audit-log__load-more-wrapper">
              <button
                type="button"
                className="button button--secondary audit-log__load-more"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "Loading entries…" : "Load More Records"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}