import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { EditModeProvider } from "@/context/EditModeContext";
import { BuilderProvider } from "@/context/BuilderContext";
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
import UserActivityPage from "./pages/UserActivityPage.tsx";
import YearPlan2026Page from "./pages/YearPlan2026Page.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <EditModeProvider>
        <BuilderProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<DashboardContent />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/students/:id" element={<StudentProfilePage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/data-entry" element={<DataEntryPage />} />
              <Route path="/data-management" element={<DataManagementPage />} />
              <Route path="/student-home" element={<StudentHomePage />} />
              <Route path="/student-learning" element={<StudentLearningTrafficLight />} />
              <Route path="/student-roadmap" element={<StudentRoadmapTrafficLight />} />
              <Route path="/external" element={<ExternalWrapperPage />} />
              <Route path="/subjects" element={<SubjectSelectionPage />} />
              <Route path="/subjects/:subjectName" element={<SubjectDetailPage />} />
              <Route path="/subjects/:subjectName/:partId" element={<SubjectPartPage />} />
              <Route path="/teacher-subjects" element={<TeacherSubjectEditorPage />} />
              <Route path="/history-course" element={<HistoryCoursePage />} />
              <Route path="/groups" element={<GroupsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/science-intro" element={<ScienceIntroPage />} />
              <Route path="/bagrut-grading" element={<BagrutGradingPage />} />
              <Route path="/teacher-courses" element={<TeacherCoursesPage />} />
              <Route path="/teacher-course/:courseId" element={<TeacherCourseDetailPage />} />
              <Route path="/user-activity" element={<UserActivityPage />} />
              <Route path="/year-plan-2026" element={<YearPlan2026Page />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrowserRouter>
        </BuilderProvider>
        </EditModeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
