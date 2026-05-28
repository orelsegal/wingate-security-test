import React, { useState } from 'react';
import { BookOpen, Award, Users, Home, Camera, GitMerge, Music, Menu, X, Notebook, Map, LogOut } from 'lucide-react';
import { useApp } from '../../LarutzBridge';

// Teachers: edit nav items here. 'teacher' key is hidden from students automatically.
const TOP_NAV = [
  { key: 'landing',   label: 'פתיחה',       icon: Home      },
  { key: 'dashboard', label: 'לוח בקרה',    icon: Map       },
  { key: 'station-1', label: 'הרומן',        icon: BookOpen  },
  { key: 'station-7', label: 'השירה',        icon: Music     },
  { key: 'station-8', label: 'השוואה',       icon: GitMerge  },
  { key: 'station-9', label: 'פוסט מסכם',   icon: Camera    },
  { key: 'guide',     label: 'מדריך ניתוח', icon: BookOpen  },
  { key: 'rubric',    label: 'מחוון',        icon: Award     },
];

const BOTTOM_NAV = [
  { key: 'dashboard', label: 'מסלול',     icon: Map      },
  { key: 'station-7', label: 'שירה',      icon: Music    },
  { key: 'station-8', label: 'השוואה',    icon: GitMerge },
  { key: 'station-9', label: 'פוסט',      icon: Camera   },
  { key: 'portfolio', label: 'מחברת',     icon: Notebook },
];

export default function Navigation() {
  const { navigate, page, pct, stationsDone, poemsDone, user, isTeacher } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const handleLogout = () => {}; // logout handled by Wingate platform

  const isPoem    = page.startsWith('poem-');
  const isStation = page.startsWith('station-');
  const stNum     = isStation ? parseInt(page.split('-')[1]) : null;

  return (
    <>
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 bg-navy text-white shadow-xl no-print" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Brand */}
          <button onClick={() => navigate('landing')} className="flex items-center gap-2 shrink-0 hover:opacity-80">
            <span className="text-xl">🏃</span>
            <span className="font-black text-sm hidden sm:block text-white">לרוץ עם מילים</span>
          </button>

          {/* Progress pill */}
          <div className="hidden md:flex items-center gap-2 bg-navy-700 rounded-full px-3 py-1">
            <div className="w-20 h-1.5 bg-navy-600 rounded-full overflow-hidden">
              <div className="h-full progress-fill" style={{ width:`${pct}%` }} />
            </div>
            <span className="text-[11px] text-sand-200">{stationsDone}/10 תחנות · {poemsDone}/8 שירים</span>
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

          {/* User avatar + logout */}
          {user && (
            <div className="flex items-center gap-2 shrink-0">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName||'?')}&background=D4754E&color=fff`}
                alt="" className="w-7 h-7 rounded-full border border-sand-300 hidden sm:block"/>
              <span className="text-xs text-sand-200 hidden md:block max-w-[100px] truncate">{user.displayName?.split(' ')[0]}</span>
              {isTeacher && <span className="text-[9px] bg-terracotta px-1.5 py-0.5 rounded-full font-bold hidden sm:block">מורה</span>}
              <button onClick={handleLogout} title="יציאה" className="p-1.5 rounded-lg hover:bg-navy-700 text-sand-300 hover:text-white">
                <LogOut size={14}/>
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button className="lg:hidden p-2 rounded-lg hover:bg-navy-700" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Station breadcrumb */}
        {(isStation || isPoem) && (
          <div className="bg-navy-700 border-t border-navy-600 px-4 py-1.5 flex items-center gap-2 overflow-x-auto">
            <button onClick={() => navigate('dashboard')} className="text-[11px] text-sand-300 hover:text-white shrink-0">← מסלול</button>
            {Array.from({ length: 10 }, (_, i) => (
              <button key={i+1} onClick={() => navigate(`station-${i+1}`)}
                className={`shrink-0 w-5 h-5 rounded-full text-[9px] font-black transition-all ${stNum === i+1 ? 'bg-terracotta text-white' : 'bg-navy-600 text-sand-300 hover:bg-navy-500'}`}>
                {i+1}
              </button>
            ))}
          </div>
        )}

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="lg:hidden bg-navy-800 border-t border-navy-600 px-4 py-3 grid grid-cols-2 gap-2">
            {[...TOP_NAV, { key:'portfolio', label:'מחברת', icon: BookOpen }].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { navigate(key); setMenuOpen(false); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${page === key ? 'bg-terracotta text-white' : 'text-sand-200 hover:bg-navy-700'}`}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── Mobile bottom bar ── */}
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
