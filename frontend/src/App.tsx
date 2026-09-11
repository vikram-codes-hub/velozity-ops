import type { ReactElement } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth, type Role } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import AdminDashboardPage from "./pages/AdminDashboard";
import AdminAuditLogPage from "./pages/AdminAuditLogPage";
import PMDashboardPage from "./pages/PMDashboard";
import DeveloperDashboardPage from "./pages/DeveloperDashboard";

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactElement;
  allowedRoles?: Role[];
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="developer-dashboard__status-text">Checking authentication…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
    if (user.role === "PM") return <Navigate to="/pm" replace />;
    return <Navigate to="/developer" replace />;
  }

  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-log"
        element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminAuditLogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pm"
        element={
          <ProtectedRoute allowedRoles={["PM", "ADMIN"]}>
            <PMDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/developer"
        element={
          <ProtectedRoute allowedRoles={["DEVELOPER", "ADMIN"]}>
            <DeveloperDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          user ? (
            user.role === "ADMIN" ? (
              <Navigate to="/admin" replace />
            ) : user.role === "PM" ? (
              <Navigate to="/pm" replace />
            ) : (
              <Navigate to="/developer" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}
