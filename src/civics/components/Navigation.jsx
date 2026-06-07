import React, { useState } from 'react';
import { BookOpen, Award, Home, Map, Menu, X, Notebook, LogOut, Target, Compass, Microscope, BarChart3, Send, FolderOpen } from 'lucide-react';
import { useCivics } from '../CivicsBridge';

const TOP_NAV = [
  { key: 'dashboard', label: 'מסלול',         icon: Map        },
  { key: 'station-1', label: 'בחירת בעיה',     icon: Target     },
  { key: 'station-2', label: 'שאלת חקר',       icon: Compass    },
  { key: 'station-3', label: 'מקורות',         icon: BookOpen   },
  { key: 'station-4', label: 'איסוף נתונים',   icon: Microscope },
  { key: 'station-5', label: 'ניתוח',          icon: BarChart3  },
  { key: 'station-6', label: 'תוצר ורפלקציה', icon: Send       },
  { key: 'guide',     label: 'מדריך החקר',     icon: BookOpen   },
  { key: 'rubric',    label: 'מחוון',          icon: Award      },
];

const BOTTOM_NAV = [
  { key: 'dashboard', label: 'מסלול',  icon: Map        },
  { key: 'station-2', label: 'שאלה',   icon: Compass    },
  { key: 'station-4', label: 'איסוף',  icon: Microscope },
  { key: 'station-5', label: 'ניתוח',  icon: BarChart3  },
  { key: 'portfolio', label: 'מחברת',  icon: Notebook   },
];

export default function CivicsNavigation() {
  const { navigate, page, pct, stationsDone, user, isTeacher } = useCivics();
  const [menuOpen, setMenuOpen] = useState(false);

  const isStation = page.startsWith('station-');
  const stNum     = isStation ? parseInt(page.split('-')[1]) : null;

  return (
    <>
      <header className="sticky top-0 z-50 bg-navy text-white shadow-xl no-print" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Brand */}
          <button onClick={() => navigate('dashboard')} className="flex items-center gap-2 shrink-0 hover:opacity-80">
            <span className="text-xl">⚖️</span>
            <span className="font-black text-sm hidden sm:block text-white">מסע חקר אזרחי</span>
          </button>

          {/* Progress pill */}
          <div className="hidden md:flex items-center gap-2 bg-navy-700 rounded-full px-3 py-1">
            <div className="w-20 h-1.5 bg-navy-600 rounded-full overflow-hidden">
              <div className="h-full progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] text-sand-200">{stationsDone}/6 שלבים</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {TOP_NAV.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => navigate(key)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${page === key ? 'bg-terracotta text-white' : 'text-sand-200 hover:bg-navy-700 hover:text-white'}`}>
                <Icon size={12} />{label}
              </button>
            ))}
            <button onClick={() => navigate('portfolio')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${page === 'portfolio' ? 'bg-sage text-white' : 'text-sand-200 hover:bg-navy-700 hover:text-white'}`}>
              📓 מחברת
            </button>
          </nav>

          {/* User */}
          {user && (
            <div className="flex items-center gap-2 shrink-0">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || '?')}&background=D4754E&color=fff`}
                alt="" className="w-7 h-7 rounded-full border border-sand-300 hidden sm:block" />
              <span className="text-xs text-sand-200 hidden md:block max-w-[100px] truncate">{user.displayName?.split(' ')[0]}</span>
              {isTeacher && <span className="text-[9px] bg-terracotta px-1.5 py-0.5 rounded-full font-bold hidden sm:block">מורה</span>}
              <button title="יציאה" className="p-1.5 rounded-lg hover:bg-navy-700 text-sand-300 hover:text-white">
                <LogOut size={14} />
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button className="lg:hidden p-2 rounded-lg hover:bg-navy-700" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Station breadcrumb */}
        {isStation && (
          <div className="bg-navy-700 border-t border-navy-600 px-4 py-1.5 flex items-center gap-2 overflow-x-auto">
            <button onClick={() => navigate('dashboard')} className="text-[11px] text-sand-300 hover:text-white shrink-0">← מסלול</button>
            {Array.from({ length: 6 }, (_, i) => (
              <button key={i + 1} onClick={() => navigate(`station-${i + 1}`)}
                className={`shrink-0 w-5 h-5 rounded-full text-[9px] font-black transition-all ${stNum === i + 1 ? 'bg-terracotta text-white' : 'bg-navy-600 text-sand-300 hover:bg-navy-500'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="lg:hidden bg-navy-800 border-t border-navy-600 px-4 py-3 grid grid-cols-2 gap-2">
            {[...TOP_NAV, { key: 'portfolio', label: 'מחברת', icon: FolderOpen }].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { navigate(key); setMenuOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${page === key ? 'bg-terracotta text-white' : 'text-sand-200 hover:bg-navy-700'}`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Mobile bottom bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-sand-200 flex no-print" dir="rtl">
        {BOTTOM_NAV.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => navigate(key)}
            className={`flex-1 flex flex-col items-center py-2 text-[10px] font-bold gap-0.5 transition-all ${page === key ? 'text-terracotta' : 'text-gray-500'}`}>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}
