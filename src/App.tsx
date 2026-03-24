import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";

import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

import StudentHomePage from "./pages/StudentHomePage";
import StudentProfilePage from "./pages/StudentProfilePage";
import CalendarPage from "./pages/CalendarPage";
import CoursesListPage from "./pages/CoursesListPage";
import CoursesPage from "./pages/CoursesPage";
import GradesPage from "./pages/GradesPage";
import RoadmapPage from "./pages/RoadmapPage";
import ToolsPage from "./pages/ToolsPage";

import ParentHomePage from "./pages/ParentHomePage";
import ParentProgressPage from "./pages/ParentProgressPage";
import ParentGradesPage from "./pages/ParentGradesPage";
import ParentCalendarPage from "./pages/ParentCalendarPage";
import ParentSupportPage from "./pages/ParentSupportPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* תלמיד */}
                <Route path="/" element={<StudentHomePage />} />
                <Route path="/student-home" element={<StudentHomePage />} />
                <Route path="/courses" element={<CoursesListPage />} />
                <Route path="/courses/:courseId" element={<CoursesPage />} />
                <Route path="/grades" element={<GradesPage />} />
                <Route path="/roadmap" element={<RoadmapPage />} />
                <Route path="/tools" element={<ToolsPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/students/:id" element={<StudentProfilePage />} />

                {/* הורה */}
                <Route path="/parent-home" element={<ParentHomePage />} />
                <Route path="/parent-progress" element={<ParentProgressPage />} />
                <Route path="/parent-grades" element={<ParentGradesPage />} />
                <Route path="/parent-calendar" element={<ParentCalendarPage />} />
                <Route path="/parent-support" element={<ParentSupportPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
