import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useCivics } from '../../CivicsBridge';

export default function Station5() {
  const { saveAnswer, getAnswer, markDone } = useCivics();
  const saved = getAnswer('civics-5') || {};
  const [ans, setAns] = useState({
    findings: '',
    surprise: '',
    patterns: '',
    contradictions: '',
    conclusions: '',
    answer: '',
    limits: '',
    ...saved,
  });
  const set = (k, v) => setAns(p => ({ ...p, [k]: v }));

  const fields = [
    { k: 'findings',      label: '📊 ממצאים מרכזיים', ph: 'מה עלה מהנתונים? תארו את ה-3 הממצאים החזקים ביותר.', rows: 4 },
    { k: 'surprise',      label: '😲 מה הפתיע אתכם?', ph: 'מה הייתה הסתירה הכי גדולה בין מה שחשבתם לבין מה שגיליתם?', rows: 2 },
    { k: 'patterns',      label: '🔄 דפוסים חוזרים',   ph: 'אילו דברים חזרו על עצמם? אצל אילו קבוצות?', rows: 3 },
    { k: 'contradictions',label: '⚖️ סתירות וגוונים',  ph: 'איפה הנתונים מספרים סיפורים שונים? מה זה אומר?', rows: 2 },
  ];

  return (
    <StationLayout stationId={5} onSave={() => { saveAnswer('civics-5', ans); markDone('civics-5'); }}
      gainText="ניתחתי את הנתונים שאספתי, זיהיתי דפוסים, וגיבשתי תשובה מבוססת לשאלת החקר שלי.">

      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-amber-800 text-base mb-1 flex items-center gap-2">📊 מה הנתונים מספרים?</h2>
        <p className="text-amber-700 text-sm leading-relaxed">ניתוח טוב לא רק מציג מספרים — הוא מסביר מה הם אומרים, ולמה זה חשוב.</p>
      </div>

      <div className="space-y-3 mb-4">
        {fields.map(f => (
          <div key={f.k} className="card p-4">
            <label className="block font-bold text-navy text-sm mb-2">{f.label}</label>
            <textarea value={ans[f.k]} onChange={e => set(f.k, e.target.value)} placeholder={f.ph} rows={f.rows} className="input-field" />
          </div>
        ))}
      </div>

      <div className="bg-sage-50 border-2 border-sage-300 rounded-2xl p-4 mb-3">
        <label className="block font-bold text-sage-800 text-sm mb-2">✅ התשובה לשאלת החקר — במשפט אחד</label>
        <textarea value={ans.answer} onChange={e => set('answer', e.target.value)}
          placeholder="אחרי כל מה שאספתי וניתחתי, התשובה שלי לשאלה היא..." rows={3} className="input-field" />
      </div>

      <div className="card p-4 mb-3">
        <label className="block font-bold text-navy text-sm mb-2">מסקנות רחבות</label>
        <textarea value={ans.conclusions} onChange={e => set('conclusions', e.target.value)}
          placeholder="מה הממצאים אומרים על החברה הישראלית? על קבוצת היעד?" rows={3} className="input-field" />
      </div>

      <div className="card p-4">
        <label className="block font-bold text-navy text-sm mb-2">🚧 מגבלות המחקר</label>
        <textarea value={ans.limits} onChange={e => set('limits', e.target.value)}
          placeholder="מה לא הצלחתם לבדוק? איזה הטיות יכלו להשפיע? מה הייתם משנים?" rows={2} className="input-field" />
      </div>
    </StationLayout>
  );
}
