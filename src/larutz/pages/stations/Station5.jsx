import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useApp } from '../../LarutzBridge';
import { THEMES } from '../../data/content.js';
import { ChevronDown, ChevronUp } from 'lucide-react';

const CONCEPTS = [
  { t:'נושא',  d:'על מה היצירה? נושא הוא תחום עניין — גדילה, אהבה, חיפוש. ניתן לתאר במילה אחת.' },
  { t:'מסר',   d:'מה היצירה אומרת על הנושא? מסר = משפט שלם עם תובנה. "הריצה מגלה מי אתה" — זה מסר.' },
  { t:'רעיון מרכזי', d:'הרעיון שמחזיק את כל הרבדים יחד — הסיפור, הדמויות, הסמלים כולם מובילים אליו.' },
];

const FORMULA = 'היצירה מעלה את נושא __ כדי להראות ש__';

function ThemeCard({ theme, data, onUpdate, selected, onToggle }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${selected ? 'border-amber-400 shadow-md' : 'border-gray-200'}`}>
      <button onClick={() => { onToggle(); setOpen(true); }}
        className={`w-full flex items-center gap-3 p-3 text-right transition-colors ${selected ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
        <span className="text-xl">{theme.icon}</span>
        <div className="flex-1">
          <p className="font-bold text-navy text-sm">{theme.title}</p>
          <p className="text-xs text-gray-500">{theme.desc}</p>
        </div>
        <div className="flex items-center gap-1">
          {selected && <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full">נבחר</span>}
          <button onClick={e => { e.stopPropagation(); setOpen(v => !v); }} className="p-1">
            {open ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
          </button>
        </div>
      </button>
      {open && (
        <div className="bg-white p-3 border-t border-gray-100 space-y-2">
          {[
            { k:'where',   l:'איפה נושא זה מופיע בספר?',     ph:'פרק, אירוע, דמות...' },
            { k:'message', l:'מה הספר אומר על נושא זה?',     ph:'ניסחו משפט מסר שלם...' },
            { k:'sport',   l:'איך נושא זה מתחבר לספורט?',    ph:'חוויה, מצב, ריצה...' },
          ].map(f => (
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

export default function Station5() {
  const { saveAnswer, getAnswer, markDone } = useApp();
  const saved = getAnswer('station-5') || {};
  const [themeData,  setThemeData]  = useState(saved.themeData  || {});
  const [selected,   setSelected]   = useState(saved.selected   || []);
  const [openConcept,setOpenConcept]= useState(null);
  const [formula,    setFormula]    = useState(saved.formula    || '');
  const [compare,    setCompare]    = useState(saved.compare    || { t1:'', t2:'', link:'' });

  const toggleTheme = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : p.length < 3 ? [...p, id] : p);
  const updTheme = (id, k, v) => setThemeData(p => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } }));

  return (
    <StationLayout stationId={5}
      onSave={() => { saveAnswer('station-5', { themeData, selected, formula, compare }); markDone('station-5'); }}
      gainText="למדתי להבחין בין נושא למסר, ולנסח מסר ספרותי שלם. מצאתי את הרעיונות המרכזיים שעולים גם מן הספר וגם מחיי הספורט.">

      {/* Concept accordion */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-amber-800 mb-3">💡 נושא מול מסר — ההבדל שמשנה הכל</h2>
        <div className="space-y-2 mb-3">
          {CONCEPTS.map(c => (
            <div key={c.t}>
              <button onClick={() => setOpenConcept(openConcept === c.t ? null : c.t)}
                className="w-full flex items-center justify-between bg-white rounded-xl px-4 py-2 border border-amber-100 text-right hover:border-amber-300 transition-all">
                <span className="font-bold text-amber-700 text-sm">{c.t}</span>
                <span className="text-amber-400 text-xs">{openConcept === c.t ? '▲' : '▼'}</span>
              </button>
              {openConcept === c.t && (
                <div className="bg-white border-x border-b border-amber-100 rounded-b-xl px-4 py-2 -mt-px">
                  <p className="text-sm text-amber-700">{c.d}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="bg-white/70 rounded-xl p-3 border border-amber-200">
          <p className="text-xs font-bold text-amber-800 mb-1">✏️ הנוסחה לניסוח מסר:</p>
          <p className="text-sm font-black text-amber-700 italic">"{FORMULA}"</p>
        </div>
      </div>

      {/* My formula */}
      <div className="card p-4 mb-5">
        <h3 className="font-bold text-navy text-sm mb-2">✍️ נסחו את המסר המרכזי של הרומן</h3>
        <textarea value={formula} onChange={e => setFormula(e.target.value)}
          placeholder={`"מישהו לרוץ איתו" מעלה את נושא __ כדי להראות ש__`}
          rows={3} className="input-field text-sm" />
      </div>

      {/* Theme cards */}
      <p className="text-sm font-bold text-navy mb-1">🎯 בחרו עד 3 נושאים לניתוח עמוק — לחצו על נושא לפתיחה</p>
      <p className="text-xs text-gray-500 mb-3">{selected.length}/3 נבחרו</p>
      <div className="space-y-2 mb-5">
        {THEMES.map(t => (
          <ThemeCard key={t.id} theme={t}
            data={themeData[t.id] || {}}
            selected={selected.includes(t.id)}
            onToggle={() => toggleTheme(t.id)}
            onUpdate={(k, v) => updTheme(t.id, k, v)} />
        ))}
      </div>

      {/* Two themes comparison */}
      {selected.length >= 2 && (
        <div className="card p-4">
          <h3 className="font-bold text-navy text-sm mb-1">🔗 קשר בין שני נושאים</h3>
          <p className="text-xs text-gray-500 mb-3">בחרו שני נושאים שאתם חושבים שקשורים זה לזה</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {['t1','t2'].map((k, i) => (
              <div key={k}>
                <label className="block text-xs font-bold text-navy mb-1">נושא {i + 1}</label>
                <select value={compare[k]} onChange={e => setCompare(p => ({ ...p, [k]: e.target.value }))} className="input-field text-sm">
                  <option value="">בחרו...</option>
                  {THEMES.filter(t => selected.includes(t.id)).map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <label className="block text-xs font-bold text-navy mb-1">כיצד הנושאים מחזקים זה את זה בספר?</label>
          <textarea value={compare.link} onChange={e => setCompare(p => ({ ...p, link: e.target.value }))}
            placeholder="הסבירו קשר בין שני הנושאים — איפה הם נפגשים?" rows={3} className="input-field text-sm" />
        </div>
      )}
    </StationLayout>
  );
}
