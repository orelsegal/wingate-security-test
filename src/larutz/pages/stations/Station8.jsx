import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useApp } from '../../LarutzBridge';
import { POEMS, COMPARISON_TEMPLATES } from '../../data/content.js';

const NOVEL_ELEMENTS = [
  'ריצה — חיפוש ותנועה','כלבת דינקה — נאמנות','תמר — קול ואמת',
  'פסח — ניצול וסכנה','אסף — גדילה ואחריות','הרחוב הירושלמי — גבולות',
  'מסע אסף — שינוי פנימי','השתיקה — מה מוסתר','ספר הסיפורים — מציאות מדומיינת',
];

const TEMPLATE_FIELDS = {
  journey:   ['מה יוצא לדרך?','מה המסע מגלה לדמות / לדובר?','מה ההגעה ל"יעד" אומרת?','רעיון משותף בשתי היצירות:'],
  character: ['תארו את הדמות / הדובר','מה הם מחפשים?','מה מונע מהם?','רעיון משותף:'],
  symbol:    ['מהו הסמל בכל יצירה?','מה הוא מייצג שם?','מה הוא מייצג כאן?','מה הרעיון המשותף?'],
  conflict:  ['מהו הקונפליקט שם?','מהו הקונפליקט כאן?','כיצד כל יצירה מתמודדת?','תובנה משותפת:'],
  body:      ['כיצד הגוף מתואר שם?','כיצד הגוף מתואר כאן?','מה הגוף מסמל בכל יצירה?','מה זה אומר על זהות?'],
};

export default function Station8() {
  const { saveAnswer, getAnswer, markDone } = useApp();
  const saved = getAnswer('station-8') || {};

  const [template, setTemplate] = useState(saved.template   || '');
  const [poem,     setPoem]     = useState(saved.poem       || '');
  const [element,  setElement]  = useState(saved.element    || '');
  const [fields,   setFields]   = useState(saved.fields     || {});
  const [thesis,   setThesis]   = useState(saved.thesis     || '');

  const setF = (k, v) => setFields(p => ({ ...p, [k]: v }));
  const selectedPoem = POEMS.find(p => String(p.id) === String(poem));
  const tmpl = COMPARISON_TEMPLATES.find(t => t.id === template);
  const fLabels = template ? TEMPLATE_FIELDS[template] : [];

  return (
    <StationLayout stationId={8}
      onSave={() => { saveAnswer('station-8', { template, poem, element, fields, thesis }); markDone('station-8'); }}
      gainText="למדתי לכתוב השוואה ספרותית מנומקת. מצאתי רעיון משותף בין הרומן לשיר שבחרתי — ויכולתי להוכיח אותו מהטקסטים.">

      {/* Intro */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-orange-800 mb-2">🔗 איך כותבים השוואה ספרותית?</h2>
        <div className="space-y-2 text-sm text-orange-700">
          <p>1. <strong>בחרו שיר ורכיב מהרומן</strong> שמזכירים זה את זה.</p>
          <p>2. <strong>מצאו רעיון משותף</strong> — לא "שתיהן על מסע" אלא "שתיהן מראות שהמסע מגדיר אותך יותר מן היעד".</p>
          <p>3. <strong>הוכיחו מכל יצירה</strong> — ציטוט + הסבר ממוקד.</p>
        </div>
        <div className="mt-3 bg-white/70 rounded-xl p-3">
          <p className="text-xs font-bold text-orange-800">נוסחה:</p>
          <p className="text-sm font-black text-orange-700 italic">"שתי היצירות מראות ש__ — ב__ (שיר) דרך __, ב__ (רומן) דרך __."</p>
        </div>
      </div>

      {/* Step 1: Choose template */}
      <div className="card p-4 mb-4">
        <h3 className="font-bold text-navy text-sm mb-1">שלב 1 — בחרו תבנית השוואה</h3>
        <div className="space-y-2">
          {COMPARISON_TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setTemplate(t.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-right transition-all ${template === t.id ? 'border-terracotta bg-terracotta-50' : 'border-gray-200 hover:border-terracotta-300'}`}>
              <span className="text-xl">{t.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-navy text-sm">{t.title}</p>
                <p className="text-xs text-gray-500">{t.desc}</p>
              </div>
              {template === t.id && <span className="text-terracotta font-black">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Choose poem */}
      <div className="card p-4 mb-4">
        <h3 className="font-bold text-navy text-sm mb-2">שלב 2 — בחרו שיר</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {POEMS.map(p => (
            <button key={p.id} onClick={() => setPoem(String(p.id))}
              className={`rounded-xl border-2 p-2.5 text-center transition-all ${poem === String(p.id) ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300'}`}>
              <span className="text-xl block mb-1">{p.emoji}</span>
              <p className="text-[10px] font-bold text-navy leading-tight">{p.title.split('/')[0]}</p>
              <p className="text-[9px] text-gray-400">{p.author.split(' ').slice(-1)[0]}</p>
            </button>
          ))}
        </div>
        {selectedPoem && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs font-bold text-green-700">{selectedPoem.emoji} {selectedPoem.title} — {selectedPoem.author}</p>
            <p className="text-xs text-green-600 mt-0.5">{selectedPoem.novelConnection}</p>
          </div>
        )}
      </div>

      {/* Step 3: Novel element */}
      <div className="card p-4 mb-4">
        <h3 className="font-bold text-navy text-sm mb-2">שלב 3 — בחרו רכיב מהרומן</h3>
        <div className="flex flex-wrap gap-2">
          {NOVEL_ELEMENTS.map(e => (
            <button key={e} onClick={() => setElement(e)}
              className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${element === e ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-gray-300 hover:border-navy'}`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Step 4: Analysis */}
      {template && poem && element && (
        <div className="card p-4 mb-4">
          <h3 className="font-bold text-navy text-sm mb-1">שלב 4 — ניתוח השוואתי</h3>
          <div className="bg-sand-50 rounded-xl p-3 mb-4">
            <p className="text-xs text-gray-500">משווים:</p>
            <p className="text-sm font-bold text-navy">{selectedPoem?.emoji} {selectedPoem?.title} ↔ {element}</p>
          </div>
          <div className="space-y-3">
            {fLabels.map((label, i) => (
              <div key={i}>
                <label className="block text-xs font-bold text-navy mb-1">{label}</label>
                <textarea value={fields[`f${i}`] || ''} onChange={e => setF(`f${i}`, e.target.value)}
                  placeholder="כתבו כאן — השתמשו בציטוטים קצרים ובמושגים ספרותיים..."
                  rows={2} className="input-field text-sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thesis */}
      {template && poem && (
        <div className="card p-4">
          <h3 className="font-bold text-navy text-sm mb-1">✍️ טענת ההשוואה שלכם — משפט אחד</h3>
          <p className="text-xs text-gray-500 mb-2">ניסחו את הרעיון המשותף במשפט אחד שלם</p>
          <textarea value={thesis} onChange={e => setThesis(e.target.value)}
            placeholder={`"${selectedPoem?.title || 'השיר'}" ו"מישהו לרוץ איתו" שניהם מראים ש...`}
            rows={3} className="input-field text-sm" />
        </div>
      )}
    </StationLayout>
  );
}
