// frontend/src/pages/AdminAuditLogPage.tsx
//
// Full audit trail for Admins: every ActivityLog row across every project,
// filterable and paginated, with new events appearing live. This is
// distinct from ActivityFeed.tsx (the compact live widget on a dashboard) —
// this page is the "go back and look something up" view, so it leads with
// filters and a dense table rather than a scrolling feed.
//
// Route guard: wrap this with your ProtectedRoute(role="ADMIN") — it
// doesn't check the role itself, matching the pattern of your other
// dashboard pages trusting the router for that.
//
// ASSUMPTIONS:
//   - GET /api/users?role=&limit= -> UserSummary[] (for the "user" filter
//     dropdown; admin-only per user.routes.ts's "Admin CRUD" note in the doc)

import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { useProjects } from "../hooks/useProjects";
import { useAuditLog, type AuditLogFilters } from "../lib/useAuditLog"
import { formatActivityLine } from "../lib/time";
import type { UserSummary } from "../hooks/Domain";

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
      .get<UserSummary[]>("/api/users")
      .then(({ data }) => setUsers(data))
      .catch(() => {
        // Non-fatal: the user filter just won't populate. The log itself
        // still loads independently.
      });
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
        <h1 className="audit-log__title">Audit log</h1>
        <p className="audit-log__subtitle">
          Every task status change and assignment, across every project.
        </p>
      </header>

      <div className="audit-log__filters">
        <label className="audit-log__filter">
          <span className="audit-log__filter-label">Project</span>
          <select
            className="audit-log__select"
            value={filters.projectId ?? ""}
            onChange={(e) => handleProjectChange(e.target.value)}
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="audit-log__filter">
          <span className="audit-log__filter-label">User</span>
          <select
            className="audit-log__select"
            value={filters.userId ?? ""}
            onChange={(e) => handleUserChange(e.target.value)}
          >
            <option value="">All users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>

        <label className="audit-log__filter">
          <span className="audit-log__filter-label">From</span>
          <input
            className="audit-log__date-input"
            type="date"
            value={toDateOnly(filters.dateFrom)}
            onChange={(e) => handleDateFromChange(e.target.value)}
          />
        </label>

        <label className="audit-log__filter">
          <span className="audit-log__filter-label">To</span>
          <input
            className="audit-log__date-input"
            type="date"
            value={toDateOnly(filters.dateTo)}
            onChange={(e) => handleDateToChange(e.target.value)}
          />
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            className="audit-log__clear-button"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <p className="audit-log__error">{error}</p>}

      {isLoading ? (
        <p className="audit-log__status">Loading audit log…</p>
      ) : entries.length === 0 ? (
        <p className="audit-log__empty">
          {hasActiveFilters
            ? "No activity matches these filters."
            : "No activity recorded yet."}
        </p>
      ) : (
        <>
          <table className="audit-log__table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Project</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="audit-log__row">
                  <td className="audit-log__cell">
                    {formatActivityLine({
                      userName: entry.userName,
                      action: entry.action,
                      taskLabel: entry.taskTitle
                        ? `"${entry.taskTitle}"`
                        : `Task ${entry.taskId.slice(0, 8)}`,
                      fromValue: entry.fromValue,
                      toValue: entry.toValue,
                      createdAt: entry.createdAt,
                    })}
                  </td>
                  <td className="audit-log__cell audit-log__cell--project">
                    {entry.projectName ?? "—"}
                  </td>
                  <td className="audit-log__cell audit-log__cell--time">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMore && (
            <button
              type="button"
              className="audit-log__load-more"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}