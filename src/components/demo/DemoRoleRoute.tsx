/**
 * Role-protected wrapper for the demo dashboards.
 * - If no user: redirect to /login (the demo entry screen).
 * - If wrong role: redirect to that user's own demo home.
 */
import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { demoRoleHome } from "@/lib/demoUsers";

const DemoRoleRoute = ({ role, children }: { role: UserRole; children: ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    const home = demoRoleHome[user.role] ?? "/login";
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
};

export default DemoRoleRoute;
