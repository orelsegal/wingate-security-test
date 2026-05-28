import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Save, CheckCircle2, BookOpen } from 'lucide-react';
import { useApp } from '../../LarutzBridge';
import { NOVEL_STATIONS } from '../../data/content.js';

export default function StationLayout({ stationId, children, onSave, gainText }) {
  const { navigate, isDone } = useApp();
  const [saved, setSaved] = useState(false);
  const meta = NOVEL_STATIONS[stationId - 1];
  const done = isDone(`station-${stationId}`);

  const handleSave = () => {
    if (onSave) onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div dir="rtl" className="max-w-4xl mx-auto px-4 py-6 pb-28 lg:pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <button onClick={() => navigate('dashboard')} className="hover:text-terracotta transition-colors">מסלול</button>
        <ChevronLeft size={12}/>
        <span className="text-navy font-semibold">תחנה {stationId}</span>
      </div>

      {/* Station header */}
      <div className="station-hero rounded-3xl p-5 sm:p-6 mb-6 relative overflow-hidden text-white">
        <span className="absolute left-3 bottom-3 text-8xl opacity-5 select-none">{meta?.emoji}</span>
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-terracotta-400 uppercase tracking-widest">תחנה {stationId} / 10</span>
            {done && <span className="flex items-center gap-1 bg-sage text-white text-xs font-bold px-2 py-0.5 rounded-full"><CheckCircle2 size={11}/>הושלמה</span>}
          </div>
          <h1 className="text-xl sm:text-2xl font-black mb-0.5">{meta?.title}</h1>
          <p className="text-sand-200 text-sm">{meta?.subtitle}</p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {meta?.skills.map(sk => <span key={sk} className="text-[10px] bg-white/15 text-sand-100 px-2 py-0.5 rounded-full font-semibold">{sk}</span>)}
          </div>
        </div>
      </div>

      {/* Content */}
      {children}

      {/* Gain section */}
      {gainText && (
        <div className="mt-5 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex gap-3">
          <BookOpen size={18} className="text-amber-600 shrink-0 mt-0.5"/>
          <div>
            <p className="font-bold text-amber-800 text-sm mb-1">מה רכשתי בתחנה הזו?</p>
            <p className="text-sm text-amber-700 leading-relaxed">{gainText}</p>
          </div>
        </div>
      )}

      {/* Save feedback */}
      {saved && (
        <div className="mt-3 p-3 bg-sage-50 border border-sage-300 rounded-xl text-center animate-fade-in">
          <p className="text-sage-700 font-bold text-sm">✅ שמרנו לך את המחשבה</p>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button onClick={() => navigate(stationId > 1 ? `station-${stationId-1}` : 'dashboard')}
          className="flex items-center gap-1 px-4 py-2.5 rounded-full border-2 border-navy text-navy text-sm font-semibold hover:bg-navy hover:text-white transition-all">
          <ChevronRight size={15}/>תחנה קודמת
        </button>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-terracotta text-white text-sm font-bold hover:bg-terracotta-600 transition-all shadow-md hover:shadow-lg active:scale-95">
          <Save size={15}/>שמור תשובה
        </button>
        <button onClick={() => navigate(stationId < 10 ? `station-${stationId+1}` : 'dashboard')}
          className="flex items-center gap-1 px-4 py-2.5 rounded-full border-2 border-navy text-navy text-sm font-semibold hover:bg-navy hover:text-white transition-all">
          תחנה הבאה<ChevronLeft size={15}/>
        </button>
      </div>
      <p className="text-center text-[10px] text-gray-400 mt-2">כל תשובה נשמרת בדפדפן שלך 💾</p>
    </div>
  );
}
