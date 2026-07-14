import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { EditModeProvider } from "@/context/EditModeContext";
import { BuilderProvider } from "@/context/BuilderContext";
import { UiLabelsProvider } from "@/context/UiLabelsContext";
import AppLayout from "@/components/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";

// ── Lazy-loaded pages (one chunk per route) ──────────────────────────────────
const Index                      = lazy(() => import("./pages/Index"));
const LoginPage                  = lazy(() => import("./pages/LoginPage"));
const OnboardingPage             = lazy(() => import("./pages/OnboardingPage"));
// ResetPasswordPage must NOT be lazy — Supabase fires PASSWORD_RECOVERY on page
// load and a lazy component would miss the event before it mounts.
import ResetPasswordPage from "./pages/ResetPasswordPage";
const StudentsPage               = lazy(() => import("./pages/StudentsPage"));
const StudentProfilePage         = lazy(() => import("./pages/StudentProfilePage"));
const CoursesPage                = lazy(() => import("./pages/CoursesPage"));
const DataEntryPage              = lazy(() => import("./pages/DataEntryPage"));
const GradeEntryPage             = lazy(() => import("./pages/GradeEntryPage"));
const DataManagementPage         = lazy(() => import("./pages/DataManagementPage"));
const StudentHomePage            = lazy(() => import("./pages/StudentHomePage"));
const StudentLearningTrafficLight = lazy(() => import("./pages/StudentLearningTrafficLight"));
const StudentRoadmapTrafficLight  = lazy(() => import("./pages/StudentRoadmapTrafficLight"));
const RoleHomePage               = lazy(() => import("./pages/RoleHomePage"));
const DashboardContent           = lazy(() => import("./components/DashboardContent"));
const ExternalWrapperPage        = lazy(() => import("./pages/ExternalWrapperPage"));
const SubjectSelectionPage       = lazy(() => import("./pages/SubjectSelectionPage"));
const SubjectDetailPage          = lazy(() => import("./pages/SubjectDetailPage"));
const TeacherSubjectEditorPage   = lazy(() => import("./pages/TeacherSubjectEditorPage"));
const SubjectPartPage            = lazy(() => import("./pages/SubjectPartPage"));
const HistoryCoursePage          = lazy(() => import("./pages/HistoryCoursePage"));
const GroupsPage                 = lazy(() => import("./pages/GroupsPage"));
const CalendarPage               = lazy(() => import("./pages/CalendarPage"));
const ScienceIntroPage           = lazy(() => import("./pages/ScienceIntroPage"));
const BagrutGradingPage          = lazy(() => import("./pages/BagrutGradingPage"));
const BagrutRoadmapPage          = lazy(() => import("./pages/BagrutRoadmapPage"));
const TeacherCoursesPage         = lazy(() => import("./pages/TeacherCoursesPage"));
const TeacherCourseDetailPage    = lazy(() => import("./pages/TeacherCourseDetailPage"));
const UserActivityPage           = lazy(() => import("./pages/UserActivityPage"));
const YearPlan2026Page           = lazy(() => import("./pages/YearPlan2026Page"));
const AdminLabelsPage            = lazy(() => import("./pages/AdminLabelsPage"));
const AdminBuilderPage           = lazy(() => import("./pages/AdminBuilderPage"));
const UserManagementPage         = lazy(() => import("./pages/UserManagementPage"));
const DevSettingsPage            = lazy(() => import("./pages/DevSettingsPage"));
const StylePickerPage            = lazy(() => import("./pages/StylePickerPage"));
const FontLabPage                = lazy(() => import("./pages/FontLabPage"));
const RoadmapsPage               = lazy(() => import("./pages/RoadmapsPage"));
const MathRoadmapPage            = lazy(() => import("./pages/MathRoadmapPage"));
const Assessment30Page           = lazy(() => import("./pages/Assessment30Page"));
const LarutzImMilimPage          = lazy(() => import("./pages/LarutzImMilimPage"));
const LiteratureHubPage          = lazy(() => import("./pages/LiteratureHubPage"));
const Literature30RoadmapPage    = lazy(() => import("./pages/Literature30RoadmapPage"));
const Literature70RoadmapPage    = lazy(() => import("./pages/Literature70RoadmapPage"));
const Literature70UnitPage       = lazy(() => import("./pages/Literature70UnitPage"));
const CivicsAssessmentPage       = lazy(() => import("./pages/CivicsAssessmentPage"));
const CivicsJourneyPage          = lazy(() => import("./pages/CivicsJourneyPage"));
const PlayArenaPage              = lazy(() => import("./pages/PlayArenaPage"));
const PlayHubPage                = lazy(() => import("./pages/PlayHubPage"));
const BlitzPlayPage              = lazy(() => import("./pages/BlitzPlayPage"));
const BlitzBuilderPage           = lazy(() => import("./pages/BlitzBuilderPage"));
const DailyChallengePage         = lazy(() => import("./pages/DailyChallengePage"));
const DailyChallengeAdminPage    = lazy(() => import("./pages/DailyChallengeAdminPage"));
const NotFound                   = lazy(() => import("./pages/NotFound"));

// ── Shared route-level loading fallback ─────────────────────────────────────
import OlympicLoader from "@/components/OlympicLoader";
const PageLoader = () => <OlympicLoader message="טוען..." />;

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <UiLabelsProvider>
        <EditModeProvider>
        <BuilderProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public routes ──────────────────────────────── */}
            <Route path="/login"          element={<LoginPage />} />
            <Route path="/onboarding"     element={<OnboardingPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* ── Full-screen protected (no AppLayout) ───────── */}
            <Route path="/admin/builder"  element={<ProtectedRoute><AdminBuilderPage /></ProtectedRoute>} />
            <Route path="/style-preview"  element={<ProtectedRoute><StylePickerPage /></ProtectedRoute>} />
            <Route path="/font-lab"       element={<ProtectedRoute><FontLabPage /></ProtectedRoute>} />

            {/* ── Main app (with AppLayout sidebar) ──────────── */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/"                                   element={<Index />} />
              <Route path="/dashboard"                          element={<DashboardContent />} />
              <Route path="/students"                           element={<StudentsPage />} />
              <Route path="/students/:id"                       element={<StudentProfilePage />} />
              <Route path="/courses"                            element={<CoursesPage />} />
              <Route path="/data-entry"                         element={<DataEntryPage />} />
              <Route path="/grade-entry"                        element={<GradeEntryPage />} />
              <Route path="/data-management"                    element={<DataManagementPage />} />
              <Route path="/student-home"                       element={<StudentHomePage />} />
              <Route path="/student-learning"                   element={<StudentLearningTrafficLight />} />
              <Route path="/student-roadmap"                    element={<StudentRoadmapTrafficLight />} />
              <Route path="/external"                           element={<ExternalWrapperPage />} />
              <Route path="/subjects"                           element={<SubjectSelectionPage />} />
              <Route path="/subjects/:subjectName"              element={<SubjectDetailPage />} />
              {/* Literature-specific deep routes — must come BEFORE the generic :partId catch-all */}
              <Route path="/subjects/:subjectName/literature"                       element={<LiteratureHubPage />} />
              <Route path="/subjects/:subjectName/literature/30"                    element={<Literature30RoadmapPage />} />
              <Route path="/subjects/:subjectName/literature/70"                    element={<Literature70RoadmapPage />} />
              <Route path="/subjects/:subjectName/literature/70/:unitId"            element={<Literature70UnitPage />} />
              <Route path="/subjects/:subjectName/assessment-30"                    element={<Assessment30Page />} />
              <Route path="/subjects/:subjectName/assessment-30/larutz-im-milim"   element={<LarutzImMilimPage />} />
              {/* Civics deep routes — mirror literature structure */}
              <Route path="/subjects/:subjectName/civics-30"                       element={<CivicsAssessmentPage />} />
              <Route path="/subjects/:subjectName/civics-30/journey"               element={<CivicsJourneyPage />} />
              <Route path="/subjects/:subjectName/:partId"      element={<SubjectPartPage />} />
              <Route path="/teacher-subjects"                   element={<TeacherSubjectEditorPage />} />
              <Route path="/history-course"                     element={<HistoryCoursePage />} />
              <Route path="/groups"                             element={<GroupsPage />} />
              <Route path="/calendar"                           element={<CalendarPage />} />
              <Route path="/science-intro"                      element={<ScienceIntroPage />} />
              <Route path="/bagrut-grading"                     element={<BagrutGradingPage />} />
              <Route path="/bagrut-roadmap"                     element={<BagrutRoadmapPage />} />
              <Route path="/teacher-courses"                    element={<TeacherCoursesPage />} />
              <Route path="/teacher-course/:courseId"           element={<TeacherCourseDetailPage />} />
              <Route path="/user-activity"                      element={<UserActivityPage />} />
              <Route path="/year-plan-2026"                     element={<YearPlan2026Page />} />
              <Route path="/admin/labels"                       element={<AdminLabelsPage />} />
              <Route path="/admin/users"                        element={<UserManagementPage />} />
              <Route path="/admin/settings"                     element={<DevSettingsPage />} />
              <Route path="/roadmaps"                           element={<RoadmapsPage />} />
              <Route path="/roadmaps/math"                      element={<Navigate to={`/subjects/${encodeURIComponent("מתמטיקה")}`} replace />} />
             <Route path="/play"                               element={<PlayHubPage />} />
              <Route path="/play/daily"                         element={<DailyChallengePage />} />
              <Route path="/play/daily/admin"                   element={<DailyChallengeAdminPage />} />
              <Route path="/play/blitz/builder"                 element={<BlitzBuilderPage />} />
              <Route path="/play/blitz/:id"                     element={<BlitzPlayPage />} />
              <Route path="/play/:subject"                      element={<PlayArenaPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
          </BrowserRouter>
        </BuilderProvider>
        </EditModeProvider>
        </UiLabelsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
