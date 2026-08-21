import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useApp } from "./data/appContext";
import { LoginScreen } from "./screens/LoginScreen";
import { StudentHome } from "./screens/StudentHome";
import { UnitScreen } from "./screens/UnitScreen";
import { TeacherStudents } from "./screens/TeacherStudents";
import { TeacherStudent } from "./screens/TeacherStudent";

function useThemeVars() {
  const { theme } = useApp();
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--accent-soft", theme.accentSoft);
    root.style.setProperty("--accent-strong", theme.accentStrong);
    document.title = theme.subjectName;
  }, [theme]);
}

function useScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
}

export default function App() {
  useThemeVars();
  useScrollTop();
  const { session } = useApp();

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const home = session.role === "teacher" ? "/teacher" : "/student";

  return (
    <Routes>
      <Route path="/student" element={<StudentHome />} />
      <Route path="/student/unit/:unitId" element={<UnitScreen />} />
      <Route path="/teacher" element={<TeacherStudents />} />
      <Route path="/teacher/:studentId" element={<TeacherStudent />} />
      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}
