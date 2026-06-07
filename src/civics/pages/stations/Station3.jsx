import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useCivics } from '../../CivicsBridge';
import { SOURCE_TYPES } from '../../data/content.js';

export default function Station3() {
  const { saveAnswer, getAnswer, markDone } = useCivics();
  const saved = getAnswer('civics-3') || {};
  const [ans, setAns] = useState({
    sources: [{ title: '', author: '', type: '', credibility: '', insight: '' }],
    summary: '',
    ...saved,
  });

  const setField = (i, k, v) =>
    setAns(p => ({ ...p, sources: p.sources.map((s, idx) => idx === i ? { ...s, [k]: v } : s) }));
  const addSource = () =>
    setAns(p => ({ ...p, sources: [...p.sources, { title: '', author: '', type: '', credibility: '', insight: '' }] }));

  return (
    <StationLayout stationId={3} onSave={() => { saveAnswer('civics-3', ans); markDone('civics-3'); }}
      gainText="אספתי מקורות מגוונים, בדקתי את אמינותם, וסיכמתי מה כבר ידוע על הנושא לפני שאני יוצא לחקור בעצמי.">

      <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-indigo-800 text-base mb-1 flex items-center gap-2">📚 מה כבר נכתב על זה?</h2>
        <p className="text-indigo-700 text-sm leading-relaxed">לפני שאוספים נתונים חדשים — בודקים מה כבר ידוע. סקירה טובה כוללת מקורות מסוגים שונים.</p>
      </div>

      <div className="card p-4 mb-4">
        <h3 className="font-bold text-navy text-sm mb-3">סוגי מקורות — מה האמינות של כל אחד?</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {SOURCE_TYPES.map(t => (
            <div key={t.id} className="flex items-start gap-2 p-2.5 bg-sand-50 rounded-xl border border-sand-200">
              <span className="text-xl shrink-0">{t.icon}</span>
              <div>
                <p className="font-bold text-navy text-xs">{t.title}</p>
                <p className="text-[11px] text-gray-600 leading-snug">{t.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {ans.sources.map((s, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-navy text-sm">מקור {i + 1}</p>
              {ans.sources.length > 1 && (
                <button onClick={() => setAns(p => ({ ...p, sources: p.sources.filter((_, idx) => idx !== i) }))}
                  className="text-xs text-gray-400 hover:text-red-500">הסר</button>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-2 mb-2">
              <input value={s.title} onChange={e => setField(i, 'title', e.target.value)} placeholder="כותרת המקור" className="input-field text-sm" />
              <input value={s.author} onChange={e => setField(i, 'author', e.target.value)} placeholder="מחבר / גוף מפרסם" className="input-field text-sm" />
            </div>
            <div className="grid sm:grid-cols-2 gap-2 mb-2">
              <select value={s.type} onChange={e => setField(i, 'type', e.target.value)} className="input-field text-sm">
                <option value="">סוג המקור...</option>
                {SOURCE_TYPES.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <select value={s.credibility} onChange={e => setField(i, 'credibility', e.target.value)} className="input-field text-sm">
                <option value="">רמת אמינות...</option>
                <option value="high">גבוהה</option>
                <option value="medium">בינונית</option>
                <option value="low">נמוכה</option>
              </select>
            </div>
            <textarea value={s.insight} onChange={e => setField(i, 'insight', e.target.value)}
              placeholder="מה למדתי מהמקור הזה? איך הוא תורם לשאלת החקר?" rows={2} className="input-field text-sm" />
          </div>
        ))}
      </div>

      <button onClick={addSource} className="btn-outline w-full mb-4">+ הוסף מקור</button>

      <div className="card p-4">
        <label className="block font-bold text-navy text-sm mb-2">סיכום הסקירה — מה הציור הכללי?</label>
        <textarea value={ans.summary} onChange={e => setAns(p => ({ ...p, summary: e.target.value }))}
          placeholder="מה הקווים המשותפים? איפה יש מחלוקות בין המקורות? מה עוד חסר?" rows={3} className="input-field" />
      </div>
    </StationLayout>
  );
}
