import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import RoleHomePage from "@/pages/RoleHomePage";
import StudentHomePage from "@/pages/StudentHomePage";

const Index = () => {
  const { user } = useAuth();

  // Student goes to student home
  if (user?.role === "student") {
    return <Navigate to="/student-home" replace />;
  }

  // All other roles get their role-based home page
  return <RoleHomePage />;
};

export default Index;
