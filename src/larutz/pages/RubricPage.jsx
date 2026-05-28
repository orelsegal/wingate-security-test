import React, { useState } from 'react';
import { useApp } from '../LarutzBridge';
import { RUBRIC_CRITERIA } from '../data/content.js';
import { ChevronLeft } from 'lucide-react';

const LEVEL_COLORS = ['bg-emerald-100 text-emerald-700 border-emerald-300','bg-blue-100 text-blue-700 border-blue-300','bg-amber-100 text-amber-700 border-amber-300','bg-red-100 text-red-700 border-red-300'];

export default function RubricPage() {
  const { navigate } = useApp();
  const [self, setSelf] = useState({}); // { criterionId: levelIndex }

  const setLevel = (id, lvl) => setSelf(p => ({ ...p, [id]: p[id] === lvl ? undefined : lvl }));

  const score = RUBRIC_CRITERIA.reduce((sum, c) => {
    const lvl = self[c.id];
    if (lvl === undefined) return sum;
    const pts = c.levels[lvl].pts;
    const num = parseInt(pts.split('–')[0]);
    return sum + num;
  }, 0);

  const assessed = Object.keys(self).length;
  const maxScore = 100;

  return (
    <div dir="rtl" className="max-w-4xl mx-auto px-4 py-6 pb-24 lg:pb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <button onClick={() => navigate('dashboard')} className="hover:text-terracotta transition-colors">מסלול</button>
        <ChevronLeft size={12}/>
        <span className="text-navy font-semibold">מחוון</span>
      </div>

      {/* Header */}
      <div className="station-hero rounded-3xl p-5 sm:p-6 mb-6 relative overflow-hidden text-white">
        <span className="absolute left-3 bottom-3 text-8xl opacity-5 select-none">🏆</span>
        <div className="relative">
          <h1 className="text-xl sm:text-2xl font-black mb-0.5">מחוון הערכה — 100 נקודות</h1>
          <p className="text-sand-200 text-sm">ניתן לבצע הערכה עצמית — לחצו על רמה בכל קריטריון</p>
        </div>
      </div>

      {/* Score summary */}
      {assessed > 0 && (
        <div className="card p-4 mb-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `conic-gradient(#D4754E ${score * 3.6}deg, #F5EDE0 0deg)`, boxShadow: '0 2px 12px rgba(212,117,78,0.3)' }}>
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-sm font-black text-terracotta">{score}</span>
            </div>
          </div>
          <div>
            <p className="font-black text-navy">הערכה עצמית: {score} / {maxScore}</p>
            <p className="text-xs text-gray-500">{assessed}/{RUBRIC_CRITERIA.length} קריטריונים הוערכו</p>
            <div className="h-2 w-48 bg-sand-100 rounded-full overflow-hidden mt-2">
              <div className="h-full progress-fill transition-all" style={{ width: `${score}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Criteria */}
      <div className="space-y-4">
        {RUBRIC_CRITERIA.map((c, ci) => {
          const chosen = self[c.id];
          return (
            <div key={c.id} className={`card overflow-hidden ${chosen !== undefined ? 'ring-2 ring-terracotta-300' : ''}`}>
              {/* Criterion header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div>
                  <span className="text-[10px] font-bold text-terracotta uppercase tracking-wide">קריטריון {ci + 1}</span>
                  <p className="font-black text-navy text-sm">{c.criterion}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-terracotta text-base">{c.points}</p>
                  <p className="text-[10px] text-gray-400">נקודות</p>
                </div>
              </div>
              {/* Levels grid */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {c.levels.map((l, li) => (
                  <button key={li} onClick={() => setLevel(c.id, li)}
                    className={`rounded-xl border-2 p-3 text-right transition-all ${chosen === li ? `${LEVEL_COLORS[li]} ring-2 ring-offset-1 ring-current` : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-black ${chosen === li ? '' : 'text-gray-600'}`}>{l.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${chosen === li ? LEVEL_COLORS[li] : 'bg-gray-100 text-gray-500'}`}>{l.pts}</span>
                    </div>
                    <p className={`text-[10px] leading-relaxed ${chosen === li ? '' : 'text-gray-500'}`}>{l.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="mt-6 bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4">
        <h3 className="font-bold text-indigo-800 mb-3">💡 טיפים להצלחה</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ['הבנה ≠ סיכום','נתחו, לא רק סכמו. שאלו תמיד: למה? מה זה מגלה?'],
            ['ציטוט = ראיה','כל טענה צריכה ציטוט קצר ממוקד + הסבר ארוך.'],
            ['עיצוב = פרשנות','כל בחירה עיצובית חייבת הסבר ספרותי.'],
            ['רעיון משותף','השוואה = "שתי היצירות מראות ש..." — לא "דומות".'],
          ].map(([t,d]) => (
            <div key={t} className="bg-white rounded-xl p-3 border border-indigo-100">
              <p className="font-bold text-indigo-700 text-sm mb-0.5">{t}</p>
              <p className="text-xs text-indigo-600">{d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reset */}
      {assessed > 0 && (
        <button onClick={() => setSelf({})}
          className="mt-4 text-xs text-gray-400 hover:text-gray-600 underline block mx-auto">
          איפוס הערכה עצמית
        </button>
      )}
    </div>
  );
}
