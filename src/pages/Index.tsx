import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Index = () => {
  const { user } = useAuth();

  if (user?.role === "student") return <Navigate to="/student-home" replace />;
  if (user?.role === "teacher") return <Navigate to="/teacher-home" replace />;
  if (user?.role === "admin") return <Navigate to="/admin-dashboard" replace />;

  // fallback — show welcome/role selection
  return <Navigate to="/welcome" replace />;
};

export default Index;
