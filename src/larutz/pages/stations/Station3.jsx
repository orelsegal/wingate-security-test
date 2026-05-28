import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useApp } from '../../LarutzBridge';
import { CHARACTERS } from '../../data/content.js';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FIELDS = [
  { k:'wants',      l:'מה הדמות רוצה?',               ph:'המטרה הגלויה...' },
  { k:'fears',      l:'ממה היא מפחדת?',               ph:'הפחד העמוק...' },
  { k:'hides',      l:'מה היא מסתירה?',               ph:'מה לא מספרים לאחרים...' },
  { k:'strength',   l:'מה הכוח שלה?',                 ph:'האיכות הפנימית החזקה...' },
  { k:'weakness',   l:'מה החולשה שלה?',               ph:'הצד הפגיע...' },
  { k:'connection', l:'עם מי יש לה קשר משמעותי?',    ph:'ולמה קשר זה חשוב...' },
  { k:'change',     l:'איזה שינוי היא עוברת?',         ph:'מה השתנה מתחילה לסוף...' },
  { k:'quote',      l:'ציטוט מייצג',                  ph:'בחרו ציטוט קצר מן הספר...' },
];

function CharCard({ char, data, onUpdate }) {
  const [open, setOpen] = useState(false);
  const filled = FIELDS.filter(f => data[f.k]).length;
  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${char.id==='asaf'?'border-blue-300':char.id==='tamar'?'border-purple-300':char.id==='dinka'?'border-amber-300':char.id==='shai'?'border-green-300':char.id==='pesach'?'border-red-300':'border-rose-300'}`}>
      <button onClick={() => setOpen(v=>!v)} className="w-full flex items-center gap-3 p-4 text-right hover:bg-gray-50 transition-colors">
        <span className="text-2xl">{char.emoji}</span>
        <div className="flex-1">
          <p className="font-black text-navy text-sm">{char.name}</p>
          <p className="text-xs text-gray-500">{char.role}</p>
        </div>
        <div className="flex items-center gap-2">
          {filled>0 && <span className="text-[10px] bg-sage-100 text-sage-700 font-bold px-2 py-0.5 rounded-full">{filled}/{FIELDS.length}</span>}
          {open ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
        </div>
      </button>
      {open && (
        <div className="bg-white p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 italic mb-3">{char.desc}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELDS.map(f => (
              <div key={f.k}>
                <label className="block text-xs font-bold text-navy mb-1">{f.l}</label>
                <textarea value={data[f.k]||''} onChange={e => onUpdate(f.k,e.target.value)} placeholder={f.ph} rows={2} className="input-field text-xs"/>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Station3() {
  const { saveAnswer, getAnswer, markDone } = useApp();
  const saved = getAnswer('station-3') || {};
  const [chars, setChars]   = useState(saved.chars  || {});
  const [relMap,setRelMap]  = useState(saved.relMap || { c1:'',c2:'',connects:'',separates:'',impact:'',type:'' });
  const [custom,setCustom]  = useState(saved.custom || { name:'',role:'' });

  const updChar  = (id,k,v)   => setChars(p => ({ ...p, [id]:{ ...(p[id]||{}),[k]:v } }));
  const updRel   = (k,v)      => setRelMap(p => ({ ...p,[k]:v }));

  return (
    <StationLayout stationId={3} onSave={() => { saveAnswer('station-3',{chars,relMap,custom}); markDone('station-3'); }}
      gainText="למדתי לאפיין דמויות בצורה מורכבת — מה הן רוצות, מפחדות ומסתירות. גיליתי שדמויות ספרותיות מורכבות כמו אנשים אמיתיים.">

      <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-purple-800 mb-2">👥 אפיון ישיר ועקיף</h2>
        <div className="grid grid-cols-2 gap-3 text-sm text-purple-700">
          <div className="bg-white/70 rounded-xl p-3"><p className="font-bold mb-0.5">ישיר</p><p className="text-xs">הסופר אומר מה טיבה: "אסף היה ביישן ונחמד"</p></div>
          <div className="bg-white/70 rounded-xl p-3"><p className="font-bold mb-0.5">עקיף</p><p className="text-xs">מגלים דרך מעשיה, דבריה, מחשבותיה, קשריה</p></div>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {CHARACTERS.map(c => (
          <CharCard key={c.id} char={c} data={chars[c.id]||{}} onUpdate={(k,v) => updChar(c.id,k,v)} />
        ))}
        {/* Custom character */}
        <div className="rounded-2xl border-2 border-dashed border-gray-300 p-4">
          <p className="text-sm font-bold text-gray-600 mb-3">➕ הוסיפו דמות נוספת</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div><label className="block text-xs font-bold text-navy mb-1">שם</label><input type="text" value={custom.name} onChange={e=>setCustom(p=>({...p,name:e.target.value}))} placeholder="שם הדמות" className="input-field text-sm"/></div>
            <div><label className="block text-xs font-bold text-navy mb-1">תפקיד</label><input type="text" value={custom.role} onChange={e=>setCustom(p=>({...p,role:e.target.value}))} placeholder="תפקיד / יחס לגיבור" className="input-field text-sm"/></div>
          </div>
          {custom.name && <div className="grid grid-cols-2 gap-2">
            {FIELDS.slice(0,4).map(f => (
              <div key={f.k}><label className="block text-xs font-bold text-navy mb-1">{f.l}</label><textarea value={chars['custom']?.[f.k]||''} onChange={e=>updChar('custom',f.k,e.target.value)} placeholder={f.ph} rows={2} className="input-field text-xs"/></div>
            ))}
          </div>}
        </div>
      </div>

      {/* Relationship map */}
      <div className="card p-4">
        <h3 className="font-bold text-navy text-sm mb-1">🕸️ מפת יחסים</h3>
        <p className="text-xs text-gray-500 mb-3">בחרו שתי דמויות ונתחו את הקשר</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {['c1','c2'].map((k,i) => (
            <div key={k}>
              <label className="block text-xs font-bold text-navy mb-1">דמות {i+1}</label>
              <select value={relMap[k]} onChange={e=>updRel(k,e.target.value)} className="input-field text-sm">
                <option value="">בחרו...</option>
                {CHARACTERS.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          ))}
        </div>
        {[
          { k:'connects',  l:'מה מחבר ביניהם?',            ph:'מה משותף, מה מדרבן...' },
          { k:'separates', l:'מה מפריד ביניהם?',           ph:'מה גורם למתח...' },
          { k:'impact',    l:'איך הקשר משנה את העלילה?',   ph:'מה הייתה העלילה בלי הקשר הזה...' },
          { k:'type',      l:'הקשר: מרפא/מסכן/מחזק/מאתגר — ולמה?', ph:'בחרו מילה ונמקו...' },
        ].map(f => (
          <div key={f.k} className="mb-2">
            <label className="block text-xs font-bold text-navy mb-1">{f.l}</label>
            <textarea value={relMap[f.k]||''} onChange={e=>updRel(f.k,e.target.value)} placeholder={f.ph} rows={2} className="input-field text-sm"/>
          </div>
        ))}
      </div>
    </StationLayout>
  );
}
