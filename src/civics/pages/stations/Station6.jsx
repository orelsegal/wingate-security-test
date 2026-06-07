import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useCivics } from '../../CivicsBridge';
import { ACTION_FORMATS } from '../../data/content.js';

export default function Station6() {
  const { saveAnswer, getAnswer, markDone } = useCivics();
  const saved = getAnswer('civics-6') || {};
  const [ans, setAns] = useState({
    format: '',
    audience: '',
    message: '',
    cta: '',
    learned: '',
    personal: '',
    next: '',
    ...saved,
  });
  const set = (k, v) => setAns(p => ({ ...p, [k]: v }));

  return (
    <StationLayout stationId={6} onSave={() => { saveAnswer('civics-6', ans); markDone('civics-6'); }}
      gainText="הפכתי את המחקר לכלי שינוי בפועל, ועשיתי רפלקציה על כל המסע. סיימתי את מטלת הביצוע.">

      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-emerald-800 text-base mb-1 flex items-center gap-2">📨 מהמחקר אל הפעולה</h2>
        <p className="text-emerald-700 text-sm leading-relaxed">חקר אזרחי בלי תוצר ציבורי — נשאר בארון. בחרו פורמט שבאמת ידבר אל הקהל שלכם.</p>
      </div>

      <div className="card p-4 mb-4">
        <h3 className="font-bold text-navy text-sm mb-3">בחרו פורמט תוצר</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ACTION_FORMATS.map(f => {
            const active = ans.format === f.id;
            return (
              <button key={f.id} onClick={() => set('format', f.id)}
                className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${active ? 'border-terracotta bg-terracotta/5' : 'border-sand-200 bg-sand-50 hover:border-navy-500'}`}>
                <span className="text-2xl">{f.icon}</span>
                <p className="font-bold text-navy text-xs text-center">{f.title}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <div className="card p-4">
          <label className="block font-bold text-navy text-sm mb-2">קהל היעד של התוצר</label>
          <textarea value={ans.audience} onChange={e => set('audience', e.target.value)}
            placeholder="למי אתם פונים? למה דווקא אליהם?" rows={2} className="input-field" />
        </div>
        <div className="card p-4">
          <label className="block font-bold text-navy text-sm mb-2">קריאה לפעולה</label>
          <textarea value={ans.cta} onChange={e => set('cta', e.target.value)}
            placeholder="מה אתם מבקשים מהקהל לעשות?" rows={2} className="input-field" />
        </div>
      </div>

      <div className="card p-4 mb-4">
        <label className="block font-bold text-navy text-sm mb-2">💬 המסר המרכזי — ב-2 משפטים</label>
        <textarea value={ans.message} onChange={e => set('message', e.target.value)}
          placeholder="אם הקהל יזכור רק דבר אחד — מה זה יהיה?" rows={3} className="input-field" />
      </div>

      {/* Reflection */}
      <div className="bg-sand-100 border-2 border-sand-300 rounded-2xl p-4 mb-3">
        <h3 className="font-bold text-navy text-sm mb-2">🪞 רפלקציה אישית על המסע</h3>
        <p className="text-xs text-gray-600 mb-3">חזרו לאחור — מה למדתם, מה היה קשה, מה היה משמעותי.</p>

        <label className="block font-bold text-navy text-sm mb-2 mt-3">מה למדתי על הנושא?</label>
        <textarea value={ans.learned} onChange={e => set('learned', e.target.value)}
          placeholder="ידע, מושגים, פרספקטיבות חדשות..." rows={3} className="input-field" />

        <label className="block font-bold text-navy text-sm mb-2 mt-3">מה למדתי על עצמי?</label>
        <textarea value={ans.personal} onChange={e => set('personal', e.target.value)}
          placeholder="איך תהליך החקר השפיע עלי? איזה כישורים פיתחתי?" rows={3} className="input-field" />

        <label className="block font-bold text-navy text-sm mb-2 mt-3">מה הצעד הבא שלי בנושא?</label>
        <textarea value={ans.next} onChange={e => set('next', e.target.value)}
          placeholder="איך אמשיך לעסוק בנושא הזה גם אחרי שהמטלה תיגמר?" rows={2} className="input-field" />
      </div>
    </StationLayout>
  );
}
