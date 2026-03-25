import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index.tsx";
import StudentsPage from "./pages/StudentsPage.tsx";
import StudentProfilePage from "./pages/StudentProfilePage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import CoursesPage from "./pages/CoursesPage.tsx";
import DataEntryPage from "./pages/DataEntryPage.tsx";
import DataManagementPage from "./pages/DataManagementPage.tsx";
import StudentHomePage from "./pages/StudentHomePage.tsx";
import StudentLearningTrafficLight from "./pages/StudentLearningTrafficLight.tsx";
import StudentRoadmapTrafficLight from "./pages/StudentRoadmapTrafficLight.tsx";
import RoleHomePage from "./pages/RoleHomePage.tsx";
import DashboardContent from "./components/DashboardContent.tsx";
import ExternalWrapperPage from "./pages/ExternalWrapperPage.tsx";
import SubjectSelectionPage from "./pages/SubjectSelectionPage.tsx";
import SubjectDetailPage from "./pages/SubjectDetailPage.tsx";
import TeacherSubjectEditorPage from "./pages/TeacherSubjectEditorPage.tsx";
import SubjectPartPage from "./pages/SubjectPartPage.tsx";
import HistoryCoursePage from "./pages/HistoryCoursePage.tsx";
import GroupsPage from "./pages/GroupsPage.tsx";
import CalendarPage from "./pages/CalendarPage.tsx";
import ScienceIntroPage from "./pages/ScienceIntroPage.tsx";
import BagrutGradingPage from "./pages/BagrutGradingPage.tsx";
import TeacherCoursesPage from "./pages/TeacherCoursesPage.tsx";
import TeacherCourseDetailPage from "./pages/TeacherCourseDetailPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const roleHomeMap: Record<string, string> = {
  teacher: "/teacher-home",
  student: "/student-home",
  admin: "/admin-dashboard",
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RoleRoute = ({ roles, children }: { roles: string[]; children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <Navigate to={roleHomeMap[user.role] || "/"} replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/admin-dashboard" element={<RoleRoute roles={["admin"]}><DashboardContent /></RoleRoute>} />
              <Route path="/dashboard" element={<RoleRoute roles={["admin"]}><DashboardContent /></RoleRoute>} />
              <Route path="/students" element={<RoleRoute roles={["admin", "teacher", "coach"]}><StudentsPage /></RoleRoute>} />
              <Route path="/students/:id" element={<RoleRoute roles={["admin", "teacher", "coach"]}><StudentProfilePage /></RoleRoute>} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/data-entry" element={<RoleRoute roles={["admin", "teacher", "coach"]}><DataEntryPage /></RoleRoute>} />
              <Route path="/data-management" element={<RoleRoute roles={["admin"]}><DataManagementPage /></RoleRoute>} />
              <Route path="/student-home" element={<RoleRoute roles={["student"]}><StudentHomePage /></RoleRoute>} />
              <Route path="/student-learning" element={<RoleRoute roles={["admin", "teacher"]}><StudentLearningTrafficLight /></RoleRoute>} />
              <Route path="/student-roadmap" element={<RoleRoute roles={["admin", "teacher"]}><StudentRoadmapTrafficLight /></RoleRoute>} />
              <Route path="/external" element={<ExternalWrapperPage />} />
              <Route path="/subjects" element={<SubjectSelectionPage />} />
              <Route path="/subjects/:subjectName" element={<SubjectDetailPage />} />
              <Route path="/subjects/:subjectName/:partId" element={<SubjectPartPage />} />
              <Route path="/teacher-subjects" element={<RoleRoute roles={["admin", "teacher"]}><TeacherSubjectEditorPage /></RoleRoute>} />
              <Route path="/teacher-home" element={<RoleRoute roles={["teacher"]}><TeacherCoursesPage /></RoleRoute>} />
              <Route path="/history-course" element={<HistoryCoursePage />} />
              <Route path="/groups" element={<RoleRoute roles={["admin", "teacher", "coach"]}><GroupsPage /></RoleRoute>} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/science-intro" element={<ScienceIntroPage />} />
              <Route path="/bagrut-grading" element={<BagrutGradingPage />} />
              <Route path="/teacher-courses" element={<RoleRoute roles={["teacher"]}><TeacherCoursesPage /></RoleRoute>} />
              <Route path="/teacher-course/:courseId" element={<RoleRoute roles={["teacher"]}><TeacherCourseDetailPage /></RoleRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
