import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useApp } from '../../LarutzBridge';
import { SYMBOLS } from '../../data/content.js';
import { ChevronDown, ChevronUp } from 'lucide-react';

const LIT_CONCEPTS = [
  { t:'סמל',    d:'אובייקט, מקום, דמות — שמייצג רעיון מעבר לפשרו המילולי. הריצה בספר אינה רק ריצה.' },
  { t:'מוטיב',  d:'יסוד חוזר — מילה, תמונה, מצב — שמעמיק ומחזק את המסר לאורך כל היצירה.' },
  { t:'דימוי',  d:'השוואה חיה בין דבר למה שהוא אינו ("רץ כמו הרוח"). כולל גם מטפורה.' },
  { t:'אנאפורה',d:'חזרה על מילה או ביטוי בתחילת שורות / משפטים — יוצרת קצב ומחדד רעיון.' },
];

const SYMBOL_FIELDS = [
  { k:'where',   l:'איפה הסמל מופיע בספר?',              ph:'פרק, סצנה, משפט...' },
  { k:'means',   l:'מה הוא מסמל לדעתכם?',                ph:'מה הרעיון מאחורי...' },
  { k:'repeats', l:'האם הוא חוזר? כמה פעמים?',          ph:'מוטיב חוזר? מה קורה בכל הופעה...' },
  { k:'deepen',  l:'איך הוא מעמיק את המסר?',             ph:'בלעדיו הספר היה פחות...' },
];

function SymbolCard({ symbol, data, onUpdate }) {
  const [open, setOpen] = useState(false);
  const filled = SYMBOL_FIELDS.filter(f => data[f.k]).length;
  return (
    <div className="rounded-2xl border-2 border-teal-200 overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-3 text-right hover:bg-teal-50 transition-colors">
        <span className="text-2xl">{symbol.icon}</span>
        <div className="flex-1">
          <p className="font-bold text-navy text-sm">{symbol.title}</p>
          <p className="text-xs text-gray-500">{symbol.desc}</p>
        </div>
        <div className="flex items-center gap-2">
          {filled > 0 && <span className="text-[10px] bg-teal-100 text-teal-700 font-bold px-2 py-0.5 rounded-full">{filled}/{SYMBOL_FIELDS.length}</span>}
          {open ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
        </div>
      </button>
      {open && (
        <div className="bg-white p-3 border-t border-gray-100 space-y-2">
          {SYMBOL_FIELDS.map(f => (
            <div key={f.k}>
              <label className="block text-xs font-bold text-navy mb-1">{f.l}</label>
              <textarea value={data[f.k] || ''} onChange={e => onUpdate(f.k, e.target.value)}
                placeholder={f.ph} rows={2} className="input-field text-xs"/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Station6() {
  const { saveAnswer, getAnswer, markDone } = useApp();
  const saved = getAnswer('station-6') || {};
  const [symbols,   setSymbols]  = useState(saved.symbols   || {});
  const [openC,     setOpenC]    = useState(null);
  const [mainSym,   setMainSym]  = useState(saved.mainSym   || '');
  const [mainExp,   setMainExp]  = useState(saved.mainExp   || '');
  const [titleSym,  setTitleSym] = useState(saved.titleSym  || '');

  const updSymbol = (id, k, v) => setSymbols(p => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } }));

  return (
    <StationLayout stationId={6}
      onSave={() => { saveAnswer('station-6', { symbols, mainSym, mainExp, titleSym }); markDone('station-6'); }}
      gainText="למדתי לזהות סמלים ומוטיבים ולנתח כיצד הם מעמיקים את המסר. גיליתי שגם הכותרת היא סמל מרכזי.">

      {/* Literary concepts */}
      <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-teal-800 mb-3">🔮 מושגים — סמל, מוטיב, דימוי</h2>
        <div className="space-y-2">
          {LIT_CONCEPTS.map(c => (
            <div key={c.t}>
              <button onClick={() => setOpenC(openC === c.t ? null : c.t)}
                className="w-full flex items-center justify-between bg-white rounded-xl px-4 py-2 border border-teal-100 text-right hover:border-teal-300 transition-all">
                <span className="font-bold text-teal-700 text-sm">{c.t}</span>
                <span className="text-teal-400 text-xs">{openC === c.t ? '▲' : '▼'}</span>
              </button>
              {openC === c.t && (
                <div className="bg-white border-x border-b border-teal-100 rounded-b-xl px-4 py-2 -mt-px">
                  <p className="text-sm text-teal-700">{c.d}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Symbol cards */}
      <p className="text-sm font-bold text-navy mb-1">🌊 נתחו את הסמלים בספר</p>
      <p className="text-xs text-gray-500 mb-3">לחצו על כל סמל להרחבה — נתחו כמה שרוצים</p>
      <div className="space-y-2 mb-5">
        {SYMBOLS.map(s => (
          <SymbolCard key={s.id} symbol={s} data={symbols[s.id] || {}} onUpdate={(k, v) => updSymbol(s.id, k, v)} />
        ))}
      </div>

      {/* Main symbol */}
      <div className="card p-4 mb-4">
        <h3 className="font-bold text-navy text-sm mb-1">⭐ הסמל המרכזי שלכם</h3>
        <p className="text-xs text-gray-500 mb-3">איזה סמל לדעתכם הכי חשוב בספר?</p>
        <select value={mainSym} onChange={e => setMainSym(e.target.value)} className="input-field text-sm mb-2">
          <option value="">בחרו סמל...</option>
          {SYMBOLS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
        {mainSym && (
          <textarea value={mainExp} onChange={e => setMainExp(e.target.value)}
            placeholder="הסבירו: למה זה הסמל המרכזי? איך הוא מחבר את כל רבדי הספר?"
            rows={3} className="input-field text-sm" />
        )}
      </div>

      {/* Title as symbol */}
      <div className="card p-4">
        <h3 className="font-bold text-navy text-sm mb-1">📚 הכותרת כסמל</h3>
        <div className="bg-navy text-sand-100 rounded-xl p-3 text-center mb-3">
          <p className="font-black text-base">"מישהו לרוץ איתו"</p>
        </div>
        <label className="block text-xs font-bold text-navy mb-1">מה הכותרת מסמלת? למה גרוסמן בחר דווקא בה?</label>
        <textarea value={titleSym} onChange={e => setTitleSym(e.target.value)}
          placeholder="הכותרת היא גם שם, גם רעיון, גם הבטחה. מה היא אומרת לכם?"
          rows={3} className="input-field text-sm" />
      </div>
    </StationLayout>
  );
}
