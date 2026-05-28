import React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { useApp } from '../../LarutzBridge';
import { POEMS, NOVEL_STATIONS } from '../../data/content.js';

export default function Station7() {
  const { navigate, isDone, poemsDone } = useApp();
  const meta = NOVEL_STATIONS[6]; // Station 7

  return (
    <div dir="rtl" className="max-w-4xl mx-auto px-4 py-6 pb-28 lg:pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <button onClick={() => navigate('dashboard')} className="hover:text-terracotta transition-colors">מסלול</button>
        <span className="mx-1">/</span>
        <span className="text-navy font-semibold">מסלול השירה</span>
      </div>

      {/* Header */}
      <div className="station-hero rounded-3xl p-5 sm:p-6 mb-6 relative overflow-hidden text-white">
        <span className="absolute left-3 bottom-3 text-8xl opacity-5 select-none">🎵</span>
        <div className="relative">
          <span className="text-[10px] font-bold text-terracotta-400 uppercase tracking-widest">תחנה 7 / 10</span>
          <h1 className="text-xl sm:text-2xl font-black mb-0.5 mt-1">{meta?.title}</h1>
          <p className="text-sand-200 text-sm">{meta?.subtitle}</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="bg-white/15 rounded-full px-3 py-1 text-sm font-bold">
              {poemsDone}/8 שירים הושלמו
            </div>
            <div className="flex-1 max-w-[200px] h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-sage rounded-full transition-all duration-500" style={{ width: `${(poemsDone / 8) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Intro */}
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-6">
        <h2 className="font-bold text-green-800 mb-2">🗺️ מסלול השירה — קובץ ב׳</h2>
        <p className="text-sm text-green-700 mb-3">8 שירים מחכים לכם. כל שיר הוא תחנה נפרדת — עם שאלות ניתוח, חיבור לרומן, ומיני-פוסט. עברו לפי הסדר או בחרו חופשי.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          {[['📖','קריאה והבנה'],['🔍','ניתוח מושגים'],['🔗','חיבור לרומן'],['✍️','מיני פוסט']].map(([ico,lbl]) => (
            <div key={lbl} className="bg-white/70 rounded-xl p-2">
              <p className="text-lg">{ico}</p>
              <p className="font-semibold text-green-700">{lbl}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Poem cards — visual running route */}
      <h2 className="font-bold text-navy mb-3 text-sm">📍 בחרו תחנת שיר</h2>
      <div className="space-y-3">
        {POEMS.map((poem, idx) => {
          const done = isDone(`poem-${poem.id}`);
          const prev = idx === 0 || isDone(`poem-${poem.id - 1}`);
          const accessible = prev || done;
          return (
            <button key={poem.id} onClick={() => navigate(`poem-${poem.id}`)}
              className={`w-full text-right rounded-2xl border-2 overflow-hidden transition-all group ${done ? 'border-sage bg-sage-50' : 'border-gray-200 bg-white hover:border-green-400 hover:shadow-md'}`}>
              <div className="flex items-center gap-4 p-4">
                {/* Number dot */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 bg-gradient-to-br ${poem.gradient} shadow-md`}>
                  {done ? <CheckCircle2 size={18} className="text-white"/> : <span className="text-white font-black text-sm">{poem.id}</span>}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xl">{poem.emoji}</span>
                    <p className="font-black text-navy text-sm">{poem.title}</p>
                    {done && <span className="text-[10px] bg-sage-100 text-sage-700 font-bold px-2 py-0.5 rounded-full">הושלם ✓</span>}
                  </div>
                  <p className="text-xs text-gray-500">{poem.author} · {poem.period}</p>
                  <p className="text-xs text-gray-600 mt-1">{poem.stationTitle}</p>
                </div>
                {/* Arrow */}
                <div className={`text-sm font-bold px-3 py-1.5 rounded-full transition-all ${done ? 'bg-sage-100 text-sage-700' : 'bg-green-50 text-green-600 group-hover:bg-green-500 group-hover:text-white'}`}>
                  {done ? 'חזרה' : 'כניסה →'}
                </div>
              </div>
              {/* Focus strip */}
              <div className="px-4 pb-3">
                <p className="text-[10px] text-gray-400">{poem.focus}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button onClick={() => navigate('station-6')}
          className="flex items-center gap-1 px-4 py-2.5 rounded-full border-2 border-navy text-navy text-sm font-semibold hover:bg-navy hover:text-white transition-all">
          ← תחנה 6
        </button>
        {poemsDone === 8 && (
          <button onClick={() => navigate('station-8')}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-terracotta text-white text-sm font-bold hover:bg-terracotta-600 transition-all shadow-md">
            המשיכו להשוואה →
          </button>
        )}
        <button onClick={() => navigate('station-8')}
          className="flex items-center gap-1 px-4 py-2.5 rounded-full border-2 border-navy text-navy text-sm font-semibold hover:bg-navy hover:text-white transition-all">
          תחנה 8 →
        </button>
      </div>
    </div>
  );
}
