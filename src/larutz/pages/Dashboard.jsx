import React from 'react';
import { CheckCircle2, Lock, ArrowLeft, BookOpen, Award, Calendar, Users, Notebook } from 'lucide-react';
import { useApp } from '../LarutzBridge';
import { NOVEL_STATIONS, POEMS } from '../data/content.js';

const SECTION_COLORS = [
  'border-r-4 border-indigo-400','border-r-4 border-blue-400','border-r-4 border-purple-400',
  'border-r-4 border-red-400','border-r-4 border-amber-400','border-r-4 border-teal-400',
  'border-r-4 border-green-400','border-r-4 border-orange-400','border-r-4 border-pink-400',
  'border-r-4 border-navy-500',
];

const QUICK = [
  { key:'guide',    icon:'📖', label:'מדריך ניתוח',  desc:'מושגים ונוסחאות', bg:'bg-blue-50 text-blue-700 border-blue-200' },
  { key:'rubric',   icon:'🏆', label:'מחוון',         desc:'100 נקודות',       bg:'bg-amber-50 text-amber-700 border-amber-200' },
  { key:'lessons',  icon:'📅', label:'תכנון הוראה',   desc:'10 שיעורים',       bg:'bg-green-50 text-green-700 border-green-200', page:'teacher' },
  { key:'portfolio',icon:'📓', label:'מחברת המסע',    desc:'כל תשובותיי',      bg:'bg-purple-50 text-purple-700 border-purple-200' },
];

export default function Dashboard() {
  const { navigate, isDone, pct, stationsDone, poemsDone } = useApp();

  return (
    <div dir="rtl" className="max-w-6xl mx-auto px-4 py-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🗺️</span>
        <div>
          <h1 className="text-2xl font-black text-navy">המסלול שלי</h1>
          <p className="text-sm text-gray-500">לרוץ עם מילים · יחידת 30% בספרות</p>
        </div>
      </div>

      {/* Progress */}
      <div className="card p-5 mb-7">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-black text-navy text-lg">התקדמות במסלול</p>
            <p className="text-sm text-gray-500">{stationsDone}/10 תחנות · {poemsDone}/8 שירים</p>
          </div>
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background:`conic-gradient(#D4754E ${pct*3.6}deg, #F5EDE0 0deg)`, boxShadow:'0 2px 12px rgba(212,117,78,0.3)' }}>
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-xs font-black text-terracotta">{pct}%</span>
            </div>
          </div>
        </div>
        <div className="w-full h-2.5 bg-sand-100 rounded-full overflow-hidden">
          <div className="h-full progress-fill" style={{ width:`${pct}%` }} />
        </div>
        {pct === 100 && <p className="mt-3 text-sage-600 font-bold text-sm text-center">🎉 כל הכבוד! השלמתם את המסלול כולו!</p>}
      </div>

      {/* Novel Stations Grid */}
      <h2 className="font-bold text-navy mb-3 flex items-center gap-2"><span>📚</span> תחנות הרומן</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {NOVEL_STATIONS.map((s, i) => {
          const done  = isDone(`station-${s.id}`);
          const canGo = s.id === 1 || isDone(`station-${s.id - 1}`) || done;
          return (
            <button key={s.id} onClick={() => canGo && navigate(`station-${s.id}`)} disabled={!canGo}
              className={`card text-right p-4 relative overflow-hidden group ${SECTION_COLORS[i]} ${done ? 'bg-green-50' : 'bg-white'} ${!canGo ? 'opacity-40 cursor-not-allowed' : 'card-hover cursor-pointer'}`}>
              <span className="absolute -left-1 -bottom-1 text-5xl opacity-5 group-hover:opacity-10 transition-opacity select-none">{s.emoji}</span>
              <div className="flex items-start justify-between mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white"
                  style={{ background: done ? '#4A7C59' : 'linear-gradient(135deg,#1a2744,#2B5C90)' }}>
                  {done ? <CheckCircle2 size={14}/> : s.id}
                </div>
                {!canGo && <Lock size={13} className="text-gray-300" />}
                {done && <span className="text-[10px] bg-sage-100 text-sage-700 font-bold px-2 py-0.5 rounded-full">הושלמה ✓</span>}
              </div>
              <p className="text-[10px] font-bold text-terracotta uppercase tracking-wide mb-0.5">תחנה {s.id}</p>
              <p className="font-black text-navy text-sm leading-tight mb-1">{s.title}</p>
              <p className="text-xs text-gray-500 mb-2">{s.subtitle}</p>
              <div className="flex flex-wrap gap-1">
                {s.skills.slice(0,2).map(sk => (
                  <span key={sk} className="text-[9px] bg-sand-100 text-navy-600 px-1.5 py-0.5 rounded-full font-medium">{sk}</span>
                ))}
              </div>
              {canGo && !done && <ArrowLeft size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-terracotta opacity-0 group-hover:opacity-100 transition-opacity" />}
            </button>
          );
        })}
      </div>

      {/* Poems route strip */}
      <h2 className="font-bold text-navy mb-3 flex items-center gap-2"><span>🎵</span> מסלול השירה — קובץ ב׳</h2>
      <div className="card p-4 mb-7">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {POEMS.map(p => {
            const done = isDone(`poem-${p.id}`);
            return (
              <button key={p.id} onClick={() => navigate(`poem-${p.id}`)}
                className={`shrink-0 flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all hover:shadow-md ${done ? 'bg-sage-50 border-sage-300' : 'bg-sand-50 border-sand-200 hover:border-green-400'}`}>
                <span className="text-xl">{p.emoji}</span>
                <p className="text-[10px] font-bold text-navy text-center w-16 leading-tight">{p.title.split('/')[0].trim()}</p>
                <p className="text-[9px] text-gray-500">{p.author.split('·')[0].split(' ').slice(-1)[0]}</p>
                {done && <CheckCircle2 size={12} className="text-sage-500" />}
              </button>
            );
          })}
        </div>
        <button onClick={() => navigate('station-7')} className="mt-3 text-xs text-terracotta font-bold hover:underline">
          → לתצוגת מסלול השירה המלאה
        </button>
      </div>

      {/* Quick links */}
      <h2 className="font-bold text-navy mb-3 flex items-center gap-2"><span>🔗</span> כלים ומשאבים</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK.map(({ key, icon, label, desc, bg, page: p }) => (
          <button key={key} onClick={() => navigate(p || key)}
            className={`rounded-2xl p-4 border text-right transition-all hover:shadow-md hover:-translate-y-0.5 ${bg}`}>
            <p className="text-xl mb-1">{icon}</p>
            <p className="font-bold text-sm leading-tight">{label}</p>
            <p className="text-xs opacity-70 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
