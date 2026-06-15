/**
 * LarutzImMilimPage — wrapper that renders the "לרוץ עם מילים" app
 * natively inside the Wingate platform (AppLayout provides header/sidebar).
 *
 * The original standalone app lives in src/larutz/.
 * LarutzBridge replaces Firebase auth with Wingate's auth and keeps
 * localStorage for progress (same keys → data already persisted by students).
 */

import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/* ── Bridge + CSS ── */
import { LarutzBridge, useApp } from '@/larutz/LarutzBridge';
import '@/larutz/larutz.css';

/* ── Pages from the original app ── */
import Dashboard      from '@/larutz/pages/Dashboard.jsx';
import Station1       from '@/larutz/pages/stations/Station1.jsx';
import Station2       from '@/larutz/pages/stations/Station2.jsx';
import Station3       from '@/larutz/pages/stations/Station3.jsx';
import Station4       from '@/larutz/pages/stations/Station4.jsx';
import Station5       from '@/larutz/pages/stations/Station5.jsx';
import Station6       from '@/larutz/pages/stations/Station6.jsx';
import Station7       from '@/larutz/pages/stations/Station7.jsx';
import PoemStation    from '@/larutz/pages/stations/PoemStation.jsx';
import Station8       from '@/larutz/pages/stations/Station8.jsx';
import Station9       from '@/larutz/pages/stations/Station9.jsx';
import Station10      from '@/larutz/pages/stations/Station10.jsx';
import LiteraryGuide  from '@/larutz/pages/LiteraryGuide.jsx';
import RubricPage     from '@/larutz/pages/RubricPage.jsx';
import Portfolio      from '@/larutz/pages/Portfolio.jsx';
import TeacherMode    from '@/larutz/pages/TeacherMode.jsx';
import TeacherDashboard from '@/larutz/pages/TeacherDashboard.jsx';
import Navigation     from '@/larutz/components/layout/Navigation.jsx';

/* ── Inner router — reads page from LarutzBridge context ── */
function LarutzRouter() {
  const { page, isTeacher, studentViewMode, setStudentViewMode } = useApp();

  // Teacher view (unless in student-view mode)
  if (isTeacher && !studentViewMode) {
    return (
      <div dir="rtl" className="min-h-screen font-heebo bg-[#F8F6F2]">
        {/* Teacher banner */}
        <div className="sticky top-0 z-[60] bg-amber-400 text-amber-900 px-4 py-2 flex items-center justify-between gap-3 shadow-md no-print">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span>👁️</span>
            <span>מצב מורה — דאשבורד כיתה</span>
          </div>
          <button
            onClick={() => { setStudentViewMode(true); }}
            className="shrink-0 bg-amber-900 text-amber-50 text-xs font-black px-3 py-1.5 rounded-full hover:bg-amber-800 transition-colors">
            תצוגת תלמיד →
          </button>
        </div>
        <Navigation />
        <main><TeacherDashboard /></main>
      </div>
    );
  }

  const render = () => {
    if (page.startsWith('poem-')) {
      const id = parseInt(page.split('-')[1]);
      return <PoemStation poemId={id} />;
    }
    switch (page) {
      case 'dashboard':  return <Dashboard />;
      case 'station-1':  return <Station1 />;
      case 'station-2':  return <Station2 />;
      case 'station-3':  return <Station3 />;
      case 'station-4':  return <Station4 />;
      case 'station-5':  return <Station5 />;
      case 'station-6':  return <Station6 />;
      case 'station-7':  return <Station7 />;
      case 'station-8':  return <Station8 />;
      case 'station-9':  return <Station9 />;
      case 'station-10': return <Station10 />;
      case 'guide':      return <LiteraryGuide />;
      case 'rubric':     return <RubricPage />;
      case 'teacher':    return <TeacherMode />;
      case 'portfolio':  return <Portfolio />;
      default:           return <Dashboard />;
    }
  };

  return (
    <div dir="rtl" className="min-h-screen font-heebo bg-[#F8F6F2]">
      {/* Teacher student-view banner */}
      {isTeacher && studentViewMode && (
        <div className="sticky top-0 z-[60] bg-amber-400 text-amber-900 px-4 py-2 flex items-center justify-between gap-3 shadow-md no-print">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span>👁️</span>
            <span>מצב תצוגת תלמיד — כך התלמידים רואים את האפליקציה</span>
          </div>
          <button
            onClick={() => setStudentViewMode(false)}
            className="shrink-0 bg-amber-900 text-amber-50 text-xs font-black px-3 py-1.5 rounded-full hover:bg-amber-800 transition-colors">
            ← חזרה לדאשבורד מורה
          </button>
        </div>
      )}
      <Navigation />
      <main>{render()}</main>
    </div>
  );
}

/* ── Outer wrapper — provides breadcrumb back to Wingate ── */
export default function LarutzImMilimPage() {
  const { subjectName } = useParams<{ subjectName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(subjectName || 'ספרות');
  const initialPage = searchParams.get('page') || undefined;

  return (
    <>
      {/* Wingate breadcrumb strip — sits above the larutz app's own nav */}
      <div
        dir="rtl"
        className="flex items-center gap-2 px-4 py-2 bg-white border-b border-border text-[11px] text-muted-foreground sticky top-0 z-[55]"
      >
        <button
          onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}/literature/30`)}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium"
        >
          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          חזרה למפת הדרכים — ספרות 30%
        </button>
        <span className="text-border">|</span>
        <span>{decoded}</span>
        <span>›</span>
        <span>הערכה פנימית 30%</span>
        <span>›</span>
        <span className="text-foreground font-semibold">לרוץ עם מילים</span>
      </div>

      {/* The actual larutz app */}
      <LarutzBridge initialPage={initialPage}>
        <LarutzRouter />
      </LarutzBridge>
    </>
  );
}
