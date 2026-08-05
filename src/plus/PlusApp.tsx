/**
 * "פלוס" — הכסף שלך. הדרך שלך. העתיד שלך.
 * אפליקציה עצמאית בתוך הסופר-פרויקט: RTL, מובייל-פירסט, שמירה מקומית בלבד.
 */
import { Suspense, lazy } from "react";
import { Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import { PlusProvider, usePlus } from "./data/store";
import "./theme.css";

const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const EarnPage = lazy(() => import("./pages/EarnPage"));
const EarnIdeaPage = lazy(() => import("./pages/EarnIdeaPage"));
const FirstClientPage = lazy(() => import("./pages/FirstClientPage"));
const MoneyPage = lazy(() => import("./pages/MoneyPage"));
const GoalsPage = lazy(() => import("./pages/GoalsPage"));
const AcademyPage = lazy(() => import("./pages/AcademyPage"));
const LessonPage = lazy(() => import("./pages/LessonPage"));
const LabPage = lazy(() => import("./pages/LabPage"));
const ParentsPage = lazy(() => import("./pages/ParentsPage"));
const RightsPage = lazy(() => import("./pages/RightsPage"));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage"));
const MorePage = lazy(() => import("./pages/MorePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

const NAV_ITEMS = [
  { to: "/plus", end: true, label: "בית", emoji: "🏠" },
  { to: "/plus/earn", end: false, label: "להרוויח", emoji: "💼" },
  { to: "/plus/money", end: false, label: "הכסף שלי", emoji: "🪙" },
  { to: "/plus/academy", end: false, label: "אקדמיה", emoji: "🎓" },
  { to: "/plus/more", end: false, label: "עוד", emoji: "☰" },
];

function Shell() {
  const { state, isDemo } = usePlus();
  const location = useLocation();
  const onOnboarding = location.pathname.includes("/onboarding");

  if (!state.onboarded && !onOnboarding && !isDemo) {
    return <Navigate to="/plus/onboarding" replace />;
  }

  return (
    <div
      dir="rtl"
      lang="he"
      className="plus-theme mx-auto flex min-h-dvh w-full max-w-2xl flex-col"
      data-reduce-motion={state.reduceMotion || undefined}
    >
      {isDemo && (
        <div className="bg-warning px-4 py-1.5 text-center text-sm font-medium text-warning-foreground">
          מצב הדגמה — הנתונים לדוגמה בלבד ולא נשמרים בחשבון אמיתי
        </div>
      )}
      <main className="flex-1 px-4 pb-24 pt-5">
        <Suspense
          fallback={
            <p className="py-16 text-center text-muted-foreground" role="status">
              טוען…
            </p>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/earn" element={<EarnPage />} />
            <Route path="/earn/first-client" element={<FirstClientPage />} />
            <Route path="/earn/:ideaId" element={<EarnIdeaPage />} />
            <Route path="/money" element={<MoneyPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/academy" element={<AcademyPage />} />
            <Route path="/academy/:lessonId" element={<LessonPage />} />
            <Route path="/lab" element={<LabPage />} />
            <Route path="/parents" element={<ParentsPage />} />
            <Route path="/rights" element={<RightsPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/plus" replace />} />
          </Routes>
        </Suspense>
      </main>

      {!onOnboarding && (
        <nav
          aria-label="ניווט ראשי"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur"
        >
          <div className="mx-auto flex max-w-2xl items-stretch justify-around">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-[52px] min-w-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs ${
                    isActive
                      ? "font-semibold text-primary"
                      : "text-muted-foreground"
                  }`
                }
              >
                <span aria-hidden className="text-lg leading-none">{item.emoji}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export default function PlusApp() {
  return (
    <PlusProvider>
      <Shell />
    </PlusProvider>
  );
}
