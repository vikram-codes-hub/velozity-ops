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

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    } catch (err) {
      setError("Incorrect email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="login-page">
        <div className="login-page__loader">
          <div className="spinner" />
          <p className="login-page__status-text">Verifying session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-page__ambient-glow login-page__ambient-glow--1" />
      <div className="login-page__ambient-glow login-page__ambient-glow--2" />

      <form className="login-page__card" onSubmit={handleSubmit}>
        <div className="login-page__brand">
          <div className="login-page__logo-mark">
            <svg
              width="24"
              height="24"
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
          <h1 className="login-page__title">Velozity Ops</h1>
          <p className="login-page__subtitle">Enterprise Project Operations Hub</p>
        </div>

        <div className="login-page__form-fields">
          <label className="login-page__field">
            <span className="login-page__field-label">Email address</span>
            <div className="login-page__input-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <input
                className="input login-page__input"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="login-page__field">
            <span className="login-page__field-label">Password</span>
            <div className="login-page__input-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                className="input login-page__input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </label>
        </div>

        {error && (
          <div className="login-page__error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="button button--primary login-page__submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="button__spinner-flex">
              <span className="spinner spinner--sm" />
              <span>Signing in…</span>
            </span>
          ) : (
            "Sign In"
          )}
        </button>

        {/* Quick Demo Access Pills */}
        <div className="login-page__demo-section">
          <span className="login-page__demo-label">Quick Sign In</span>
          <div className="login-page__demo-pills">
            <button
              type="button"
              className="login-page__demo-pill"
              onClick={() => fillQuickLogin("admin@company.com")}
            >
              Admin
            </button>
            <button
              type="button"
              className="login-page__demo-pill"
              onClick={() => fillQuickLogin("pm@company.com")}
            >
              PM
            </button>
            <button
              type="button"
              className="login-page__demo-pill"
              onClick={() => fillQuickLogin("dev@company.com")}
            >
              Developer
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}