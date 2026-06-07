/**
 * CivicsJourneyPage — wrapper that mounts the civics 30% research app
 * with full Larutz-style native UI (Dashboard + 6 interactive stations).
 *
 * Mirrors LarutzImMilimPage structurally — uses a dedicated bridge
 * (CivicsBridge) with localStorage progress, scoped to civics keys.
 */
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { CivicsBridge, useCivics } from '@/civics/CivicsBridge';
import '@/larutz/larutz.css';

import Dashboard from '@/civics/pages/Dashboard.jsx';
import Station1  from '@/civics/pages/stations/Station1.jsx';
import Station2  from '@/civics/pages/stations/Station2.jsx';
import Station3  from '@/civics/pages/stations/Station3.jsx';
import Station4  from '@/civics/pages/stations/Station4.jsx';
import Station5  from '@/civics/pages/stations/Station5.jsx';
import Station6  from '@/civics/pages/stations/Station6.jsx';

function CivicsRouter() {
  const { page } = useCivics();
  const render = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'station-1': return <Station1 />;
      case 'station-2': return <Station2 />;
      case 'station-3': return <Station3 />;
      case 'station-4': return <Station4 />;
      case 'station-5': return <Station5 />;
      case 'station-6': return <Station6 />;
      default:          return <Dashboard />;
    }
  };
  return (
    <div dir="rtl" className="min-h-screen font-heebo bg-[#F8F6F2]">
      <main>{render()}</main>
    </div>
  );
}

export default function CivicsJourneyPage() {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(subjectName || 'אזרחות');

  return (
    <>
      <div
        dir="rtl"
        className="flex items-center gap-2 px-4 py-2 bg-white border-b border-border text-[11px] text-muted-foreground sticky top-0 z-[55]"
      >
        <button
          onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}/civics-30`)}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium"
        >
          <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
          חזרה למטלת ביצוע 30%
        </button>
        <span className="text-border">|</span>
        <span>{decoded}</span>
        <span>›</span>
        <span>מטלת ביצוע 30%</span>
        <span>›</span>
        <span className="text-foreground font-semibold">מסע חקר אזרחי</span>
      </div>

      <CivicsBridge>
        <CivicsRouter />
      </CivicsBridge>
    </>
  );
}
