import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useCivics } from '../../CivicsBridge';
import { RESEARCH_TOOLS } from '../../data/content.js';

export default function Station4() {
  const { saveAnswer, getAnswer, markDone } = useCivics();
  const saved = getAnswer('civics-4') || {};
  const [ans, setAns] = useState({
    tool: '',
    population: '',
    sampleSize: '',
    questions: '',
    ethics: '',
    plan: '',
    ...saved,
  });
  const set = (k, v) => setAns(p => ({ ...p, [k]: v }));

  return (
    <StationLayout stationId={4} onSave={() => { saveAnswer('civics-4', ans); markDone('civics-4'); }}
      gainText="בחרתי כלי מחקר מתאים, הגדרתי קהל יעד, ובניתי תוכנית איסוף נתונים שמכבדת את משתתפי המחקר.">

      <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-violet-800 text-base mb-1 flex items-center gap-2">🔬 איך אאסוף נתונים?</h2>
        <p className="text-violet-700 text-sm leading-relaxed">בחירת כלי המחקר נגזרת מהשאלה. שאלה כמותית → שאלון. שאלה איכותנית → ראיון / תצפית.</p>
      </div>

      <div className="card p-4 mb-4">
        <h3 className="font-bold text-navy text-sm mb-3">בחרו כלי מחקר עיקרי</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {RESEARCH_TOOLS.map(t => {
            const active = ans.tool === t.id;
            return (
              <button key={t.id} onClick={() => set('tool', t.id)}
                className={`text-right p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${active ? 'border-terracotta bg-terracotta/5' : 'border-sand-200 bg-sand-50 hover:border-navy-500'}`}>
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <p className="font-bold text-navy text-sm">{t.title}</p>
                  <p className="text-xs text-gray-600 leading-snug">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <div className="card p-4">
          <label className="block font-bold text-navy text-sm mb-2">קהל יעד</label>
          <textarea value={ans.population} onChange={e => set('population', e.target.value)}
            placeholder="מי המשתתפים? גיל, מגדר, רקע..." rows={2} className="input-field" />
        </div>
        <div className="card p-4">
          <label className="block font-bold text-navy text-sm mb-2">גודל המדגם</label>
          <input value={ans.sampleSize} onChange={e => set('sampleSize', e.target.value)}
            placeholder="כמה אנשים? למה דווקא?" className="input-field" />
        </div>
      </div>

      <div className="card p-4 mb-3">
        <label className="block font-bold text-navy text-sm mb-2">שאלות / נקודות תצפית מרכזיות</label>
        <textarea value={ans.questions} onChange={e => set('questions', e.target.value)}
          placeholder={`1. \n2. \n3. \n4. \n5. `} rows={5} className="input-field" />
      </div>

      <div className="card p-4 mb-3">
        <label className="block font-bold text-navy text-sm mb-2">🛡️ אתיקה מחקרית</label>
        <textarea value={ans.ethics} onChange={e => set('ethics', e.target.value)}
          placeholder="איך תשמרו על אנונימיות? איך תקבלו הסכמה? איך תמנעו הטיה?" rows={2} className="input-field" />
      </div>

      <div className="card p-4">
        <label className="block font-bold text-navy text-sm mb-2">לוח זמנים מתוכנן</label>
        <textarea value={ans.plan} onChange={e => set('plan', e.target.value)}
          placeholder="מתי תאספו? איפה? כמה זמן זה ייקח?" rows={2} className="input-field" />
      </div>
    </StationLayout>
  );
}
