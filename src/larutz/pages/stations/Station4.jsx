import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useApp } from '../../LarutzBridge';
import { CONFLICTS } from '../../data/content.js';
import { ChevronDown, ChevronUp } from 'lucide-react';

const CONFLICT_TYPES = [
  { id:'inner',    label:'קונפליקט פנימי',           emoji:'🧠', color:'bg-purple-100 text-purple-700 border-purple-300', desc:'מתח שמתחולל בתוך הדמות עצמה — בין ערכים, רצונות, פחדים.' },
  { id:'between',  label:'קונפליקט בין דמויות',       emoji:'🤝', color:'bg-blue-100 text-blue-700 border-blue-300',   desc:'מתח בין שתי דמויות — שונות, תחרות, אי-הבנה.' },
  { id:'society',  label:'קונפליקט מול חברה / סביבה', emoji:'🌍', color:'bg-orange-100 text-orange-700 border-orange-300', desc:'הדמות מתנגשת עם נורמות, כוחות חיצוניים, מציאות קשה.' },
  { id:'moral',    label:'קונפליקט מוסרי',            emoji:'⚖️', color:'bg-red-100 text-red-700 border-red-300',      desc:'בחירה קשה בין טוב לרע, בין אחריות לאינטרס אישי.' },
];

const ANALYSIS_FIELDS = [
  { k:'where',   l:'איפה הקונפליקט מופיע בספר?',              ph:'פרק, רגע, סיטואציה...' },
  { k:'who',     l:'מי מעורב?',                                ph:'הדמויות שבמוקד המתח...' },
  { k:'price',   l:'מה המחיר של הקונפליקט?',                  ph:'מה הדמות מפסידה, מה היא מרוויחה...' },
  { k:'plot',    l:'איך הוא מקדם את העלילה?',                 ph:'מה היה קורה בלעדיו...' },
  { k:'athlete', l:'איך הוא מתחבר לעולם הספורטאי ההישגי?',   ph:'ממה זה מזכיר לכם...' },
];

function ConflictCard({ conflict, data, onUpdate }) {
  const [open, setOpen] = useState(false);
  const filled = ANALYSIS_FIELDS.filter(f => data[f.k]).length;

  const borderColor = conflict.id === 'alone-together' ? 'border-blue-300'
    : conflict.id === 'fear-courage' ? 'border-red-300'
    : conflict.id === 'truth-hiding' ? 'border-amber-300'
    : conflict.id === 'freedom-danger' ? 'border-teal-300'
    : conflict.id === 'body-soul' ? 'border-purple-300'
    : conflict.id === 'trust-suspicion' ? 'border-green-300'
    : conflict.id === 'identity-label' ? 'border-pink-300'
    : 'border-orange-300';

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${borderColor}`}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-right hover:bg-gray-50 transition-colors">
        <span className="text-2xl">{conflict.icon}</span>
        <div className="flex-1">
          <p className="font-black text-navy text-sm">{conflict.title}</p>
          <p className="text-xs text-gray-500 italic">{conflict.sport}</p>
        </div>
        <div className="flex items-center gap-2">
          {filled > 0 && <span className="text-[10px] bg-sand-100 text-navy font-bold px-2 py-0.5 rounded-full">{filled}/{ANALYSIS_FIELDS.length}</span>}
          {open ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
        </div>
      </button>
      {open && (
        <div className="bg-white p-4 border-t border-gray-100 space-y-3">
          {ANALYSIS_FIELDS.map(f => (
            <div key={f.k}>
              <label className="block text-xs font-bold text-navy mb-1">{f.l}</label>
              <textarea value={data[f.k] || ''} onChange={e => onUpdate(f.k, e.target.value)}
                placeholder={f.ph} rows={2} className="input-field text-xs" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Station4() {
  const { saveAnswer, getAnswer, markDone } = useApp();
  const saved = getAnswer('station-4') || {};
  const [conflicts, setConflicts] = useState(saved.conflicts || {});
  const [chosen,    setChosen]    = useState(saved.chosen    || '');
  const [analysis,  setAnalysis]  = useState(saved.analysis  || '');

  const updConflict = (id, k, v) => setConflicts(p => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } }));

  return (
    <StationLayout stationId={4}
      onSave={() => { saveAnswer('station-4', { conflicts, chosen, analysis }); markDone('station-4'); }}
      gainText="למדתי לזהות ארבעה סוגי קונפליקטים ולנתח כיצד המתח מניע את הדמויות. הבנתי שגם בחיי הספורט יש קונפליקטים זהים.">

      {/* Conflict type cards */}
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-red-800 mb-3">⚡ 4 סוגי קונפליקט — הכירו לפני הניתוח</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONFLICT_TYPES.map(t => (
            <div key={t.id} className={`rounded-xl p-3 border ${t.color}`}>
              <p className="font-bold text-sm mb-1">{t.emoji} {t.label}</p>
              <p className="text-xs opacity-80">{t.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 bg-white/60 rounded-xl p-3">
          <p className="text-xs font-bold text-red-700 mb-1">🏅 לספורטאי הישגי</p>
          <p className="text-xs text-red-600">אתם מכירים את כל הסוגים: בין לרוץ לנוח (פנימי), עם מאמן (בין דמויות), מול ציפיות חברתיות (מול חברה), ולהודות בכישלון (מוסרי).</p>
        </div>
      </div>

      {/* Conflict analysis cards */}
      <p className="text-sm font-bold text-navy mb-2">🔍 נתחו את הקונפליקטים בספר — לחצו על כל כרטיס</p>
      <div className="space-y-3 mb-5">
        {CONFLICTS.map(c => (
          <ConflictCard key={c.id} conflict={c} data={conflicts[c.id] || {}} onUpdate={(k, v) => updConflict(c.id, k, v)} />
        ))}
      </div>

      {/* Central conflict */}
      <div className="card p-4">
        <h3 className="font-bold text-navy text-sm mb-1">🎯 הקונפליקט המרכזי</h3>
        <p className="text-xs text-gray-500 mb-3">לדעתכם, מהו הקונפליקט החשוב ביותר בספר?</p>
        <select value={chosen} onChange={e => setChosen(e.target.value)} className="input-field text-sm mb-3">
          <option value="">בחרו קונפליקט מרכזי...</option>
          {CONFLICTS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        {chosen && (
          <div>
            <label className="block text-xs font-bold text-navy mb-1">הסבירו מדוע בחרתם דווקא את הקונפליקט הזה</label>
            <textarea value={analysis} onChange={e => setAnalysis(e.target.value)}
              placeholder="איזה קונפליקט הכי מקדם את הרומן? למה? איך הוא נפתר (או לא נפתר)?"
              rows={3} className="input-field text-sm" />
          </div>
        )}
      </div>
    </StationLayout>
  );
}
