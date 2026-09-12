import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { ThemeSelector } from "./ThemeSelector";
import { CreateTaskModal } from "./CreateTaskModal";
import { CreateProjectModal } from "./CreateProjectModal";
import { CreateUserModal } from "./CreateUserModal";
import { AssignTeamMemberModal } from "./AssignTeamMemberModal";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return "badge--role-admin";
      case "PM":
        return "badge--role-pm";
      case "DEVELOPER":
        return "badge--role-developer";
      default:
        return "";
    }
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const isAdmin = user?.role === "ADMIN";
  const canCreate = isAdmin || user?.role === "PM";

  return (
    <div className="app-shell">
      {/* Background Orbs / Glow */}
      <div className="bg-glow-orb bg-glow-orb--top" />
      <div className="bg-glow-orb bg-glow-orb--bottom" />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__logo">
          <div className="sidebar__logo-mark">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div className="sidebar__brand-container">
            <span className="sidebar__logo-text">Velozity Ops</span>
            <span className="sidebar__logo-sub">Enterprise Hub</span>
          </div>
        </div>

        <nav className="sidebar__nav">
          <div className="sidebar__section-label">Navigation</div>
          
          {user?.role === "ADMIN" && (
            <>
              <Link
                to="/admin"
                className={`sidebar__link ${
                  location.pathname === "/admin" ? "sidebar__link--active" : ""
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
                <span>Dashboard</span>
              </Link>
              <Link
                to="/audit-log"
                className={`sidebar__link ${
                  location.pathname === "/audit-log" ? "sidebar__link--active" : ""
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Audit Logs</span>
              </Link>
            </>
          )}

          {user?.role === "PM" && (
            <Link
              to="/pm"
              className={`sidebar__link ${
                location.pathname === "/pm" ? "sidebar__link--active" : ""
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>Projects Dashboard</span>
            </Link>
          )}

          {user?.role === "DEVELOPER" && (
            <Link
              to="/developer"
              className={`sidebar__link ${
                location.pathname === "/developer" ? "sidebar__link--active" : ""
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span>My Tasks</span>
            </Link>
          )}
        </nav>

        {/* User Card in Sidebar */}
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">{userInitials}</div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.name}</span>
              <span className={`badge ${getRoleBadgeClass(user?.role)}`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar__logout-btn"
            onClick={handleLogout}
            title="Sign out"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="app-shell__main">
        <header className="topbar">
          <div className="topbar__status-pill">
            <span className="topbar__status-dot" />
            <span>System Live</span>
          </div>

          <div className="topbar__actions">
            {canCreate && (
              <>
                {isAdmin ? (
                  <button
                    type="button"
                    className="button button--secondary button--sm"
                    onClick={() => setIsUserModalOpen(true)}
                    title="Provision new account credentials (Admin only)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <line x1="20" y1="8" x2="20" y2="14" />
                      <line x1="17" y1="11" x2="23" y2="11" />
                    </svg>
                    <span>+ Account</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button button--secondary button--sm"
                    onClick={() => setIsAssignModalOpen(true)}
                    title="Assign existing developer from platform roster to a project"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="8.5" cy="7" r="4" />
                      <polyline points="17 11 19 13 23 9" />
                    </svg>
                    <span>+ Member</span>
                  </button>
                )}
                <button
                  type="button"
                  className="button button--secondary button--sm"
                  onClick={() => setIsProjectModalOpen(true)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Project</span>
                </button>
                <button
                  type="button"
                  className="button button--primary button--sm"
                  onClick={() => setIsTaskModalOpen(true)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Task</span>
                </button>
              </>
            )}
            <ThemeSelector />
            <NotificationBell />
          </div>
        </header>

        <main className="app-shell__content">{children}</main>
      </div>

      {/* Global Modals */}
      {canCreate && (
        <>
          <CreateTaskModal
            isOpen={isTaskModalOpen}
            onClose={() => setIsTaskModalOpen(false)}
            onSuccess={() => window.location.reload()}
          />
          <CreateProjectModal
            isOpen={isProjectModalOpen}
            onClose={() => setIsProjectModalOpen(false)}
            onSuccess={() => window.location.reload()}
          />
          {isAdmin && (
            <CreateUserModal
              isOpen={isUserModalOpen}
              onClose={() => setIsUserModalOpen(false)}
              onSuccess={() => window.location.reload()}
            />
          )}
          <AssignTeamMemberModal
            isOpen={isAssignModalOpen}
            onClose={() => setIsAssignModalOpen(false)}
            onSuccess={() => window.location.reload()}
          />
        </>
      )}
    </div>
  );
}
