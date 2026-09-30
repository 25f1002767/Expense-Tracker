import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <main className="auth-loading" aria-live="polite">Checking your session…</main>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
