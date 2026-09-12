import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types/domain";

const ROUTE_BY_ROLE: Record<Role, string> = {
  ADMIN: "/admin",
  PM: "/pm",
  DEVELOPER: "/developer",
};

interface LocationState {
  from?: { pathname: string };
}

const DEMO_ROLES = [
  {
    key: "ADMIN" as Role,
    label: "Admin",
    email: "admin@velozity.com",
    color: "var(--priority-critical)",
    bg: "rgba(244, 63, 94, 0.1)",
    border: "rgba(244, 63, 94, 0.3)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    key: "PM" as Role,
    label: "Project Manager",
    email: "pm1@velozity.com",
    color: "var(--accent)",
    bg: "rgba(99, 102, 241, 0.1)",
    border: "rgba(99, 102, 241, 0.3)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    key: "DEVELOPER" as Role,
    label: "Developer",
    email: "dev1@velozity.com",
    color: "var(--status-done)",
    bg: "rgba(16, 185, 129, 0.1)",
    border: "rgba(16, 185, 129, 0.3)",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
];

const FEATURE_PILLS = [
  { label: "Real-Time WebSocket", color: "#818cf8" },
  { label: "Role-Based Access", color: "#34d399" },
  { label: "AI Project Analysis", color: "#c084fc" },
  { label: "Auto Overdue Detection", color: "#fb923c" },
  { label: "Audit Trail Logging", color: "#60a5fa" },
  { label: "Multi-LLM Engine", color: "#f472b6" },
];

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTarget = (loggedInUser: { role: Role }) => {
    const state = location.state as LocationState | null;
    return state?.from?.pathname ?? ROUTE_BY_ROLE[loggedInUser.role];
  };

  useEffect(() => {
    if (!isLoading && user) {
      navigate(redirectTarget(user), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(email, password);
      navigate(redirectTarget(loggedInUser), { replace: true });
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="lp">
        <div className="lp__orb lp__orb--1" />
        <div className="lp__orb lp__orb--2" />
        <div className="lp__loader">
          <div className="spinner" />
          <p>Verifying session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lp">
      {/* Ambient orbs */}
      <div className="lp__orb lp__orb--1" />
      <div className="lp__orb lp__orb--2" />

      <div className="lp__split">
        {/* ── LEFT PANEL ── */}
        <div className="lp__left">
          {/* Brand */}
          <div className="lp__brand">
            <div className="lp__logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <h1 className="lp__app-name">Velozity Ops</h1>
              <p className="lp__app-sub">Real-Time Project Operations Hub</p>
            </div>
          </div>

          {/* Headline */}
          <div className="lp__headline">
            <h2 className="lp__headline-text">
              Ship faster with<br />
              <span className="lp__headline-accent">intelligent oversight.</span>
            </h2>
            <p className="lp__headline-body">
              A role-scoped, real-time operations platform for managing client projects,
              developer workloads, and live activity — all in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="lp__pills">
            {FEATURE_PILLS.map((pill) => (
              <span
                key={pill.label}
                className="lp__pill"
                style={{ '--pill-c': pill.color } as React.CSSProperties}
              >
                {pill.label}
              </span>
            ))}
          </div>

          {/* Role cards */}
          <div className="lp__roles">
            {DEMO_ROLES.map((role) => (
              <div
                key={role.key}
                className="lp__role"
                style={{
                  '--rc': role.color,
                  '--rb': role.bg,
                  '--rbo': role.border,
                } as React.CSSProperties}
              >
                <span className="lp__role-icon">{role.icon}</span>
                <span className="lp__role-label">{role.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL: Form ── */}
        <div className="lp__right">
          <form className="lp__card" onSubmit={handleSubmit} noValidate>
            {/* Card header */}
            <div className="lp__card-brand">
              <div className="lp__card-logo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h2 className="lp__card-title">Welcome back</h2>
              <p className="lp__card-sub">Sign in to your dashboard</p>
            </div>

            {/* Fields */}
            <div className="lp__fields">
              <div className="lp__field">
                <label className="lp__label" htmlFor="lp-email">Email address</label>
                <div className="lp__input-wrap">
                  <svg className="lp__input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input
                    id="lp-email"
                    className="lp__input"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="lp__field">
                <label className="lp__label" htmlFor="lp-password">Password</label>
                <div className="lp__input-wrap">
                  <svg className="lp__input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="lp-password"
                    className="lp__input lp__input--pw"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="lp__pw-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    title={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="lp__error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="lp-sign-in"
              className="lp__submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="lp__submit-inner">
                  <span className="spinner spinner--sm" />
                  <span>Signing in…</span>
                </span>
              ) : (
                <span className="lp__submit-inner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                  Sign In
                </span>
              )}
            </button>

            {/* Demo Access */}
            <div className="lp__demo">
              <div className="lp__demo-header">
                <span className="lp__demo-divider-line" />
                <span className="lp__demo-label">Quick Demo Access</span>
                <span className="lp__demo-divider-line" />
              </div>
              <div className="lp__demo-pills">
                {DEMO_ROLES.map((role) => (
                  <button
                    key={role.key}
                    type="button"
                    className="lp__demo-btn"
                    style={{
                      '--dc': role.color,
                      '--db': role.bg,
                      '--dbo': role.border,
                    } as React.CSSProperties}
                    onClick={() => fillDemo(role.email)}
                  >
                    <span className="lp__demo-icon">{role.icon}</span>
                    {role.label}
                  </button>
                ))}
              </div>
              <p className="lp__demo-hint">Password: <code>Password123!</code></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}