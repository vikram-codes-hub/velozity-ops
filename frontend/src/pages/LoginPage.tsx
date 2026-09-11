// frontend/src/pages/LoginPage.tsx
//
// Consumes AuthContext.tsx's login(email, password) — per the doc, that
// context already handles the JWT access token + refresh cookie exchange
// and exposes `user`/`isLoading`; this page just wires it into a form and
// a post-login redirect.
//
// Redirect behavior:
//   - If a ProtectedRoute bounced the user here, react-router puts the
//     original destination in location.state.from — go back there on
//     success instead of always landing on the role's default dashboard.
//   - Otherwise, redirect by role to that role's dashboard route. Route
//     paths here (/admin, /pm, /developer) are a guess — update
//     ROUTE_BY_ROLE to match whatever you register in App.tsx.
//   - If already authenticated on mount (e.g. back button to /login after
//     logging in), redirect immediately rather than showing the form.
//
// ASSUMPTIONS:
//   - useAuth() is exported from context/AuthContext.tsx, returning
//     { user, isLoading, login }, where login(email, password) throws on
//     failure (bad credentials -> rejected promise) and resolves on success
//   - user.role is one of "ADMIN" | "PM" | "DEVELOPER" (Domain.ts's Role)

import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../hooks/Domain";

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

  // Already logged in (e.g. navigated back to /login manually) — bounce
  // straight to the dashboard instead of showing the form again.
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

  // Session restore (silent-refresh-on-mount) still in flight — avoid a
  // flash of the login form for someone who's actually already signed in.
  if (isLoading) {
    return (
      <div className="login-page">
        <p className="login-page__status-text">Checking your session…</p>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-page__card" onSubmit={handleSubmit}>
        <h1 className="login-page__title">Sign in</h1>
        <p className="login-page__subtitle">
          Client Project Dashboard
        </p>

        <label className="login-page__field">
          <span className="login-page__field-label">Email</span>
          <input
            className="input login-page__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="login-page__field">
          <span className="login-page__field-label">Password</span>
          <input
            className="input login-page__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="login-page__error">{error}</p>}

        <button
          type="submit"
          className="button button--primary login-page__submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}