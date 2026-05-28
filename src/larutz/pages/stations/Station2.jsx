import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useApp } from '../../LarutzBridge';
import { Plus, X } from 'lucide-react';

const EVENT_TYPES = [
  { id:'opening',  label:'אירוע פתיחה',     emoji:'🎬', color:'bg-blue-100 text-blue-700 border-blue-200' },
  { id:'mission',  label:'משימה / חיפוש',   emoji:'🔍', color:'bg-purple-100 text-purple-700 border-purple-200' },
  { id:'encounter',label:'מפגש משמעותי',    emoji:'🤝', color:'bg-green-100 text-green-700 border-green-200' },
  { id:'danger',   label:'סכנה / קונפליקט', emoji:'⚡', color:'bg-red-100 text-red-700 border-red-200' },
  { id:'discovery',label:'גילוי',            emoji:'💡', color:'bg-amber-100 text-amber-700 border-amber-200' },
  { id:'turning',  label:'נקודת מפנה',      emoji:'🔄', color:'bg-orange-100 text-orange-700 border-orange-200' },
  { id:'inner',    label:'שינוי פנימי',      emoji:'✨', color:'bg-teal-100 text-teal-700 border-teal-200' },
  { id:'ending',   label:'סיום / תובנה',    emoji:'🌅', color:'bg-indigo-100 text-indigo-700 border-indigo-200' },
];

const CONCEPTS = [
  { t:'רומן מסע',       d:'ז\'אנר שבו המסע הפיזי מקביל למסע פנימי של גדילה.' },
  { t:'עלילה חיצונית', d:'רצף האירועים שקורים בפועל.' },
  { t:'עלילה פנימית',  d:'המסע הנפשי של הדמות — שינוי בתפיסה ובזהות.' },
  { t:'נקודת מפנה',    d:'אירוע שאחריו שום דבר לא חוזר להיות כפי שהיה.' },
];

export default function Station2() {
  const { saveAnswer, getAnswer, markDone } = useApp();
  const saved = getAnswer('station-2') || {};
  const [timeline, setTimeline]    = useState(saved.timeline || []);
  const [inner,    setInner]       = useState(saved.inner    || '');
  const [turning,  setTurning]     = useState(saved.turning  || '');
  const [open,     setOpen]        = useState(null);

  const addEvent = t => setTimeline(p => p.length >= 8 ? p : [...p, { id:Date.now(), type:t, what:'', why:'', change:'', reveal:'' }]);
  const rmEvent  = id => setTimeline(p => p.filter(e => e.id !== id));
  const updEvent = (id, f, v) => setTimeline(p => p.map(e => e.id===id ? {...e,[f]:v} : e));
  const meta = id => EVENT_TYPES.find(t => t.id === id) || EVENT_TYPES[0];

  return (
    <StationLayout stationId={2} onSave={() => { saveAnswer('station-2',{timeline,inner,turning}); markDone('station-2'); }}
      gainText="למדתי להבחין בין עלילה חיצונית לעלילה פנימית ולזהות נקודות מפנה — הכלים שמראים כיצד מסע פיזי הופך לשינוי נפשי.">

      {/* Concepts */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-blue-800 mb-3">📚 מושגים לפני הניתוח</h2>
        <div className="space-y-2">
          {CONCEPTS.map(c => (
            <div key={c.t}>
              <button onClick={() => setOpen(open===c.t?null:c.t)}
                className="w-full flex items-center justify-between bg-white rounded-xl px-4 py-2 border border-blue-100 text-right hover:border-blue-300 transition-all">
                <span className="font-bold text-blue-700 text-sm">{c.t}</span>
                <span className="text-blue-400 text-xs">{open===c.t?'▲':'▼'}</span>
              </button>
              {open===c.t && <div className="bg-white border-x border-b border-blue-100 rounded-b-xl px-4 py-2 -mt-px"><p className="text-sm text-blue-700">{c.d}</p></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Mini guide */}
      <div className="card p-4 mb-5">
        <h3 className="font-bold text-navy text-sm mb-2">🔬 4 שאלות לניתוח אירוע</h3>
        <div className="grid grid-cols-2 gap-2">
          {['מה קרה?','למה זה חשוב?','מה השתנה?','מה נחשף?'].map((q,i) => (
            <div key={q} className="bg-sand-50 rounded-xl p-2.5 flex items-start gap-1.5">
              <span className="w-4 h-4 rounded-full bg-terracotta text-white text-[9px] flex items-center justify-center font-black flex-shrink-0 mt-0.5">{i+1}</span>
              <p className="text-xs font-medium text-navy">{q}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline builder */}
      <div className="card p-4 mb-5">
        <h3 className="font-bold text-navy text-sm mb-1">🗺️ בנו את ציר האירועים שלכם</h3>
        <p className="text-xs text-gray-500 mb-3">בחרו סוג אירוע להוספה — עד 8 אירועים</p>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {EVENT_TYPES.map(t => (
            <button key={t.id} onClick={() => addEvent(t.id)} disabled={timeline.length >= 8}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold transition-all hover:shadow active:scale-95 disabled:opacity-40 ${t.color}`}>
              <Plus size={10}/>{t.emoji} {t.label}
            </button>
          ))}
        </div>
        {timeline.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
            לחצו על סוגי האירועים למעלה כדי לבנות את הציר
          </div>
        )}
        <div className="space-y-3 relative">
          {timeline.length > 0 && <div className="absolute right-5 top-4 bottom-4 w-px bg-sand-200" />}
          {timeline.map((ev, idx) => {
            const m = meta(ev.type);
            return (
              <div key={ev.id} className="flex gap-3 relative">
                <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm flex-shrink-0 ${m.color}`}>{m.emoji}</div>
                <div className="flex-1 bg-sand-50 rounded-xl p-3 border border-sand-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.color}`}>{m.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">{idx+1}</span>
                      <button onClick={() => rmEvent(ev.id)} className="text-gray-300 hover:text-red-400"><X size={13}/></button>
                    </div>
                  </div>
                  {['what','why','change','reveal'].map((f,fi) => (
                    <input key={f} type="text" value={ev[f]||''} onChange={e => updEvent(ev.id,f,e.target.value)}
                      placeholder={['מה קרה?','למה זה חשוב?','מה השתנה?','מה נחשף על הדמות?'][fi]}
                      className="input-field text-xs mb-1.5 last:mb-0" />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card p-4">
          <h4 className="font-bold text-navy text-sm mb-2">🌍 עלילה חיצונית מול פנימית</h4>
          <textarea value={inner} onChange={e=>setInner(e.target.value)} placeholder="תארו את המסלול הפיזי והנפשי של אסף..." rows={3} className="input-field text-sm"/>
        </div>
        <div className="card p-4">
          <h4 className="font-bold text-navy text-sm mb-2">🔄 נקודת המפנה הגדולה</h4>
          <textarea value={turning} onChange={e=>setTurning(e.target.value)} placeholder="האירוע שאחריו שום דבר לא חזר להיות כמו קודם..." rows={3} className="input-field text-sm"/>
        </div>
      </div>
    </StationLayout>
  );
}
