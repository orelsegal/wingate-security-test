import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import DashboardContent from "@/components/DashboardContent";

const Index = () => {
  const { user } = useAuth();

  // Parent goes directly to child's profile
  if (user?.role === "parent" && user.scopeFilter?.[0]) {
    return <Navigate to={`/students/${user.scopeFilter[0]}`} replace />;
  }

  return <DashboardContent />;
};

export default Index;
