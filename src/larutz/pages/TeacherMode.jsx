import React, { useState } from 'react';
import { useApp } from '../LarutzBridge';
import { LESSONS, TEACHER_DATA } from '../data/content.js';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';

const TABS = [
  { id:'lessons',    label:'תכנון שיעורים',  emoji:'📅' },
  { id:'why',        label:'למה יצירות אלה', emoji:'📚' },
  { id:'misconceptions',label:'טעויות נפוצות',emoji:'⚠️' },
  { id:'checklist',  label:'רשימת בדיקה',    emoji:'✅' },
];

export default function TeacherMode() {
  const { navigate } = useApp();
  const [tab,     setTab]     = useState('lessons');
  const [openL,   setOpenL]   = useState(null);
  const [checked, setChecked] = useState({});

  const toggleCheck = i => setChecked(p => ({ ...p, [i]: !p[i] }));
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <div dir="rtl" className="max-w-4xl mx-auto px-4 py-6 pb-24 lg:pb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <button onClick={() => navigate('dashboard')} className="hover:text-terracotta transition-colors">מסלול</button>
        <ChevronLeft size={12}/>
        <span className="text-navy font-semibold">מצב מורה</span>
      </div>

      {/* Header */}
      <div className="station-hero rounded-3xl p-5 sm:p-6 mb-6 relative overflow-hidden text-white">
        <span className="absolute left-3 bottom-3 text-8xl opacity-5 select-none">🧑‍🏫</span>
        <div className="relative">
          <h1 className="text-xl sm:text-2xl font-black mb-0.5">מצב מורה</h1>
          <p className="text-sand-200 text-sm">תכנון הוראה · עיצוב יחידה · הערכה</p>
          <div className="flex gap-2 mt-3">
            {['10 שיעורים','8 שירים','30% מבגרות'].map(t => (
              <span key={t} className="text-[10px] bg-white/15 text-sand-100 px-2 py-0.5 rounded-full font-semibold">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold shrink-0 border-2 transition-all ${tab === t.id ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-gray-200 hover:border-navy'}`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: LESSONS ── */}
      {tab === 'lessons' && (
        <div className="space-y-3">
          {LESSONS.map(l => (
            <div key={l.id} className="card overflow-hidden">
              <button onClick={() => setOpenL(openL === l.id ? null : l.id)}
                className="w-full flex items-center gap-3 p-4 text-right hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-navy text-white text-xs font-black flex items-center justify-center flex-shrink-0">{l.id}</div>
                <div className="flex-1">
                  <p className="font-black text-navy text-sm">{l.title}</p>
                  <p className="text-xs text-gray-500">{l.duration}</p>
                </div>
                <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{l.digital}</span>
                {openL === l.id ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0"/> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0"/>}
              </button>
              {openL === l.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[['🎯 מטרה', l.goal],['💬 פעילות', l.activity],['📱 דיגיטלי', l.digital],['🚪 exit ticket', l.exit],['💡 טיפ למורה', l.tip]].map(([label, text]) => (
                    <div key={label} className={`bg-sand-50 rounded-xl p-3 ${label.includes('טיפ') ? 'sm:col-span-2' : ''}`}>
                      <p className="text-xs font-bold text-navy mb-1">{label}</p>
                      <p className="text-xs text-gray-600">{text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: WHY ── */}
      {tab === 'why' && (
        <div className="space-y-4">
          {TEACHER_DATA.whyTheseWorks.map(w => (
            <div key={w.title} className="card p-4">
              <p className="font-black text-navy text-sm mb-3">📖 {w.title}</p>
              <ul className="space-y-1.5">
                {w.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-terracotta text-white text-[9px] flex items-center justify-center font-black flex-shrink-0 mt-0.5">{i+1}</span>
                    <p className="text-xs text-gray-700">{r}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="card p-4">
            <p className="font-black text-navy text-sm mb-3">🎯 קריטריוני הבחירה</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEACHER_DATA.selectionCriteria.map((c, i) => (
                <div key={i} className="bg-sand-50 rounded-xl p-2.5 flex items-start gap-2">
                  <span className="text-terracotta font-black text-xs mt-0.5">✓</span>
                  <p className="text-xs text-gray-700">{c}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: MISCONCEPTIONS ── */}
      {tab === 'misconceptions' && (
        <div className="space-y-3">
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-sm font-bold text-amber-800">⚠️ אלו הטעויות שחוזרות כל שנה — הכינו לכם "תגובה מוכנה" לכל אחת.</p>
          </div>
          {TEACHER_DATA.commonMisconceptions.map((m, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">❌</span>
                <div>
                  <p className="font-black text-navy text-sm mb-1">{m.issue}</p>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-green-700 mb-0.5">✅ מה לומר:</p>
                    <p className="text-xs text-green-700">{m.fix}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: CHECKLIST ── */}
      {tab === 'checklist' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-navy text-sm">רשימת בדיקה להגשת תלמיד</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${checkedCount === TEACHER_DATA.assessmentChecklist.length ? 'bg-sage-100 text-sage-700' : 'bg-sand-100 text-navy'}`}>
              {checkedCount}/{TEACHER_DATA.assessmentChecklist.length}
            </span>
          </div>
          <div className="space-y-2 mb-5">
            {TEACHER_DATA.assessmentChecklist.map((item, i) => (
              <button key={i} onClick={() => toggleCheck(i)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-right transition-all ${checked[i] ? 'bg-sage-50 border-sage-300' : 'bg-white border-gray-200 hover:border-sage-300'}`}>
                <span className={`text-lg flex-shrink-0 ${checked[i] ? '' : 'opacity-30'}`}>{checked[i] ? '✅' : '☐'}</span>
                <p className={`text-sm ${checked[i] ? 'text-sage-700 font-semibold line-through' : 'text-gray-700'}`}>{item}</p>
              </button>
            ))}
          </div>
          {checkedCount > 0 && (
            <button onClick={() => setChecked({})} className="text-xs text-gray-400 hover:text-gray-600 underline block mx-auto">
              איפוס
            </button>
          )}
        </div>
      )}
    </div>
  );
}
