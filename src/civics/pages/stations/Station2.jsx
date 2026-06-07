import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useCivics } from '../../CivicsBridge';
import { CIVIC_CONCEPTS } from '../../data/content.js';

export default function Station2() {
  const { saveAnswer, getAnswer, markDone } = useCivics();
  const saved = getAnswer('civics-2') || {};
  const [ans, setAns] = useState({ concepts: [], question: '', sub: '', why: '', ...saved });

  const set = (k, v) => setAns(p => ({ ...p, [k]: v }));
  const toggleConcept = id =>
    set('concepts', ans.concepts.includes(id)
      ? ans.concepts.filter(x => x !== id)
      : ans.concepts.length < 3 ? [...ans.concepts, id] : ans.concepts);

  return (
    <StationLayout stationId={2} onSave={() => { saveAnswer('civics-2', ans); markDone('civics-2'); }}
      gainText="בחרתי את המושגים האזרחיים שהבעיה שלי נוגעת בהם, וניסחתי שאלת חקר ברורה שתוביל את כל המחקר.">

      <div className="bg-cyan-50 border-2 border-cyan-200 rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-cyan-800 text-base mb-1 flex items-center gap-2">🧭 מהשטח אל הספר</h2>
        <p className="text-cyan-700 text-sm leading-relaxed">כל בעיה אזרחית קשורה למושגים מתחום האזרחות. זיהוי המושגים הוא הגשר בין מה שראיתם במציאות לבין השפה האקדמית.</p>
      </div>

      {/* Concepts bank */}
      <div className="card p-4 mb-4">
        <h3 className="font-bold text-navy mb-0.5 text-sm">מושגי מפתח — בחרו עד 3 רלוונטיים לבעיה שלכם</h3>
        <p className="text-xs text-gray-500 mb-3">{ans.concepts.length}/3 נבחרו</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {CIVIC_CONCEPTS.map(c => {
            const active = ans.concepts.includes(c.id);
            return (
              <button key={c.id} onClick={() => toggleConcept(c.id)}
                className={`text-right p-3 rounded-xl border-2 transition-all ${active ? 'border-terracotta bg-terracotta/5' : 'border-sand-200 bg-sand-50 hover:border-navy-500'}`}>
                <p className="font-bold text-navy text-sm">{c.term}</p>
                <p className="text-xs text-gray-600 mt-0.5 leading-snug">{c.def}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Research question */}
      <div className="card p-4 mb-3">
        <label className="block font-bold text-navy text-sm mb-2">📝 שאלת החקר הראשית</label>
        <p className="text-xs text-gray-500 mb-2">שאלה פתוחה, ממוקדת, וניתנת לבדיקה. מתחילה ב"איך / באיזו מידה / מה הקשר בין..."</p>
        <textarea value={ans.question} onChange={e => set('question', e.target.value)}
          placeholder="לדוגמה: באיזו מידה הרשתות החברתיות משפיעות על מעורבות אזרחית של בני נוער?" rows={3} className="input-field" />
      </div>

      <div className="card p-4 mb-3">
        <label className="block font-bold text-navy text-sm mb-2">שאלות משנה (1–3)</label>
        <textarea value={ans.sub} onChange={e => set('sub', e.target.value)}
          placeholder={`1. \n2. \n3. `} rows={4} className="input-field" />
      </div>

      <div className="card p-4">
        <label className="block font-bold text-navy text-sm mb-2">למה זו שאלה טובה?</label>
        <textarea value={ans.why} onChange={e => set('why', e.target.value)}
          placeholder="מה הופך אותה לחקיר? למי התשובה רלוונטית?" rows={2} className="input-field" />
      </div>
    </StationLayout>
  );
}
