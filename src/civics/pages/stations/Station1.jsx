import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useCivics } from '../../CivicsBridge';
import { CIVIC_ISSUES } from '../../data/content.js';

const Qs = [
  { id: 'q1', label: 'מה הבעיה האזרחית שמעניינת אותך?',  ph: 'תארו במשפט אחד את הבעיה שאתם רוצים לחקור' },
  { id: 'q2', label: 'איפה פגשתם את הבעיה הזו במציאות?', ph: 'בבית, בפנימייה, באימונים, ברשת, באירוע שראיתם?' },
  { id: 'q3', label: 'את מי הבעיה הזו פוגעת?',             ph: 'איזו קבוצה באוכלוסייה? למה דווקא אותה?' },
  { id: 'q4', label: 'למה הנושא הזה חשוב לכם אישית?',     ph: 'מה הקשר שלכם — כספורטאים, כאזרחים צעירים?' },
];

export default function Station1() {
  const { saveAnswer, getAnswer, markDone } = useCivics();
  const saved = getAnswer('civics-1') || {};
  const [ans, setAns] = useState({ q1: '', q2: '', q3: '', q4: '', issues: [], reason: '', ...saved });

  const set = (k, v) => setAns(p => ({ ...p, [k]: v }));
  const toggleIssue = w =>
    set('issues', ans.issues.includes(w)
      ? ans.issues.filter(x => x !== w)
      : ans.issues.length < 3 ? [...ans.issues, w] : ans.issues);

  return (
    <StationLayout stationId={1} onSave={() => { saveAnswer('civics-1', ans); markDone('civics-1'); }}
      gainText="זיהיתי בעיה אזרחית אמיתית הקרובה לעולמי, וניסחתי אותה במילים שלי. זו נקודת הפתיחה של מסע החקר.">

      <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-teal-800 text-base mb-1 flex items-center gap-2">🎯 לפני שמתחילים לחקור</h2>
        <p className="text-teal-700 text-sm leading-relaxed">בחירת בעיה טובה היא חצי מהעבודה. בעיה אזרחית טובה היא כזו שיש לה השפעה ציבורית, ושאפשר לאסוף עליה מידע.</p>
        <div className="mt-3 bg-white/60 rounded-xl p-3 text-sm text-teal-600 italic">
          "מה אתם הייתם רוצים לשנות בחברה הישראלית אם הייתה לכם הזדמנות?"
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {Qs.map(q => (
          <div key={q.id} className="card p-4">
            <label className="block font-bold text-navy text-sm mb-2">{q.label}</label>
            <textarea value={ans[q.id]} onChange={e => set(q.id, e.target.value)} placeholder={q.ph} rows={2} className="input-field" />
          </div>
        ))}
      </div>

      {/* Issues bank */}
      <div className="card p-4">
        <h3 className="font-bold text-navy mb-0.5 text-sm">בנק נושאים — בחרו עד 3 שמדברים אליכם</h3>
        <p className="text-xs text-gray-500 mb-3">{ans.issues.length}/3 נבחרו</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {CIVIC_ISSUES.map(w => (
            <button key={w} onClick={() => toggleIssue(w)}
              className={`chip ${ans.issues.includes(w) ? 'active' : ''}`}>{w}</button>
          ))}
        </div>
        {ans.issues.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {ans.issues.map(w => <span key={w} className="px-3 py-1 bg-terracotta text-white rounded-full text-sm font-bold">{w}</span>)}
            </div>
            <textarea value={ans.reason} onChange={e => set('reason', e.target.value)}
              placeholder="למה דווקא הנושאים האלה? מה מחבר ביניהם?" rows={2} className="input-field text-sm" />
          </div>
        )}
      </div>
    </StationLayout>
  );
}
