import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useApp } from '../../LarutzBridge';
import { POST_TYPES, CHARACTERS, POEMS } from '../../data/content.js';

// ── Per-template field definitions ──────────────────────────────
const TEMPLATE_FORMS = {
  A: [
    { k:'char',     l:'בחרו דמות',         type:'char-select' },
    { k:'caption',  l:'הקפשן (קול הדמות)', ph:'מה הדמות כותבת על עצמה?',          rows:3 },
    { k:'hashtags', l:'האשטגים',            ph:'#ריצה #ירושלים #מישהולרוץאיתו',    rows:1 },
    { k:'literary', l:'ביסוס ספרותי',      ph:'אילו מאפייני הדמות / מושגים מוכחים כאן?', rows:2 },
  ],
  B: [
    { k:'topic',    l:'נושא הקרוסלה',      ph:'על מה הקרוסלה?',                    rows:1 },
    { k:'slide1',   l:'שקף 1',             ph:'פתיחה — הנושא / השאלה',             rows:2 },
    { k:'slide2',   l:'שקף 2',             ph:'טענה ראשונה + ציטוט קצר',          rows:2 },
    { k:'slide3',   l:'שקף 3',             ph:'טענה שנייה — מושג ספרותי',         rows:2 },
    { k:'slide4',   l:'שקף 4',             ph:'חיבור אישי / לספורט',              rows:2 },
    { k:'slide5',   l:'שקף 5',             ph:'סיכום — מה למדתי?',                rows:2 },
  ],
  C: [
    { k:'moment',   l:'הרגע המכריע',        ph:'מה הרגע שבחרתם?',                  rows:1 },
    { k:'s1',       l:'סטורי 1 — לפני',    ph:'מה קרה ממש לפני הרגע?',            rows:2 },
    { k:'s2',       l:'סטורי 2 — הרגע',    ph:'תארו את הרגע עצמו',               rows:2 },
    { k:'s3',       l:'סטורי 3 — תחושה',   ph:'מה הרגישה הדמות?',                rows:2 },
    { k:'s4',       l:'סטורי 4 — שינוי',   ph:'מה השתנה אחרי?',                   rows:2 },
    { k:'s5',       l:'סטורי 5 — תובנה',   ph:'שאלה / ציטוט / מסר',              rows:2 },
  ],
  D: [
    { k:'char1',    l:'דמות 1',             type:'char-select' },
    { k:'char2',    l:'דמות 2',             type:'char-select' },
    { k:'comment1', l:'תגובת דמות 1',       ph:'מה היא הייתה כותבת?',             rows:2 },
    { k:'comment2', l:'תגובת דמות 2',       ph:'מה היא הייתה עונה?',              rows:2 },
    { k:'comment3', l:'תגובה נוספת',        ph:'דמות אחרת / מישהו מהכיתה...',    rows:2 },
    { k:'literary', l:'ביסוס ספרותי',      ph:'אילו מושגים / קונפליקטים מוכחים?', rows:2 },
  ],
  E: [
    { k:'char',     l:'בחרו דמות',         type:'char-select' },
    { k:'outside',  l:'מה הצד הנראה',      ph:'מה כולם חושבים עליה?',             rows:2 },
    { k:'inside',   l:'הצד הנסתר',         ph:'מה שלא רואים — פחד, כמיהה, חלום', rows:3 },
    { k:'why',      l:'למה היא מסתירה?',   ph:'מה גורם להסתרה?',                 rows:2 },
    { k:'literary', l:'ביסוס ספרותי',      ph:'אפיון ישיר/עקיף, קונפליקט פנימי...', rows:2 },
  ],
  F: [
    { k:'who',      l:'מי המישהו שלכם?',    ph:'דמות מהספר / מישהו אמיתי',        rows:1 },
    { k:'run',      l:'מה זה אומר "לרוץ"?', ph:'בספר? בחייכם? מטפורה?',          rows:2 },
    { k:'together', l:'מה מאפשרת הריצה יחד?', ph:'מה שאי אפשר לעשות לבד',       rows:2 },
    { k:'alone',    l:'מה קורה כשרצים לבד?', ph:'בריחה, עצמאות, בדידות...',      rows:2 },
    { k:'quote',    l:'שורה מייצגת',        ph:'בחרו ציטוט קצר מן הספר',         rows:1 },
  ],
  G: [
    { k:'poem',     l:'בחרו שיר',          type:'poem-select' },
    { k:'shared',   l:'הרעיון המשותף',      ph:'שתי היצירות מראות ש...',          rows:2 },
    { k:'fromPoem', l:'מן השיר',           ph:'שורה קצרה + הסבר ספרותי',        rows:2 },
    { k:'fromNovel',l:'מן הרומן',          ph:'ציטוט קצר + הסבר',               rows:2 },
    { k:'me',       l:'חיבור אישי',        ph:'מה זה אומר לי כספורטאי/ת?',      rows:2 },
    { k:'hashtags', l:'האשטגים',           ph:'#שיריםשרצים #לרוץעםמילים',        rows:1 },
  ],
};

// A compact live preview panel
function PostPreview({ type, data, chars }) {
  const pt = POST_TYPES.find(p => p.id === type);
  if (!pt) return null;
  const [g1, g2] = pt.grad;
  const charName = chars.find(c => c.id === data.char)?.name || data.char || '...';
  const poemObj  = POEMS.find(p => String(p.id) === String(data.poem));

  return (
    <div className="sticky top-4">
      <div className="rounded-3xl overflow-hidden shadow-xl" style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}>
        {/* Fake status bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/20">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center text-xs">{pt.emoji}</div>
            <span className="text-white text-[11px] font-bold">@larutz_im_milim</span>
          </div>
          <span className="text-white/60 text-[10px]">עכשיו</span>
        </div>

        {/* Content area */}
        <div className="p-4 min-h-[200px]">
          {type === 'A' && (
            <div className="text-white text-center">
              <p className="text-3xl mb-2">{chars.find(c => c.id === data.char)?.emoji || '👤'}</p>
              <p className="font-bold text-sm mb-2">{charName}</p>
              <p className="text-sm opacity-90 leading-relaxed">{data.caption || 'הקפשן שלכם יופיע כאן...'}</p>
              <p className="text-[10px] opacity-60 mt-2">{data.hashtags}</p>
            </div>
          )}
          {type === 'B' && (
            <div className="text-white">
              <p className="font-black text-base text-center mb-3">{data.topic || 'נושא הקרוסלה'}</p>
              {[data.slide1, data.slide2, data.slide3].filter(Boolean).map((s, i) => (
                <div key={i} className="bg-white/10 rounded-xl p-2 mb-2">
                  <span className="text-[10px] font-bold opacity-60">שקף {i+1}</span>
                  <p className="text-xs">{s}</p>
                </div>
              ))}
            </div>
          )}
          {type === 'C' && (
            <div className="text-white text-center">
              <p className="font-bold text-sm mb-3">{data.moment || 'הרגע המכריע'}</p>
              <div className="flex gap-1 justify-center mb-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className={`h-1 rounded-full flex-1 ${data[`s${i}`] ? 'bg-white' : 'bg-white/30'}`}/>
                ))}
              </div>
              <p className="text-sm opacity-90">{data.s1 || 'סטורי 1 יופיע כאן...'}</p>
            </div>
          )}
          {(type === 'D' || type === 'E') && (
            <div className="text-white">
              <p className="font-bold text-sm mb-2 text-center">{type === 'E' ? `מה שלא רואים על ${charName}` : 'שיחה מדומיינת'}</p>
              {type === 'D' && data.comment1 && <div className="bg-white/10 rounded-xl p-2 mb-2 text-xs"><span className="font-bold opacity-60">{charName}: </span>{data.comment1}</div>}
              {type === 'E' && data.outside && <div className="bg-white/10 rounded-xl p-2 mb-1 text-xs"><span className="opacity-60">נראה: </span>{data.outside}</div>}
              {type === 'E' && data.inside  && <div className="bg-white/20 rounded-xl p-2 text-xs"><span className="opacity-60">נסתר: </span>{data.inside}</div>}
            </div>
          )}
          {type === 'F' && (
            <div className="text-white text-center">
              <p className="text-3xl mb-2">🏃</p>
              <p className="font-black text-base mb-2">{data.who || 'מישהו לרוץ איתו'}</p>
              <p className="text-sm opacity-90">{data.run || 'מה הריצה אומרת לכם?'}</p>
              {data.quote && <p className="mt-2 text-[11px] opacity-60 italic">"{data.quote}"</p>}
            </div>
          )}
          {type === 'G' && (
            <div className="text-white">
              <p className="text-center font-black text-sm mb-2">{poemObj ? `${poemObj.emoji} ${poemObj.title}` : 'שיר + רומן'}</p>
              {data.shared && <div className="bg-white/15 rounded-xl p-2 mb-2 text-xs text-center italic">{data.shared}</div>}
              <div className="grid grid-cols-2 gap-2">
                {data.fromPoem  && <div className="bg-white/10 rounded-xl p-2 text-[10px]"><p className="opacity-60 font-bold mb-0.5">מן השיר</p>{data.fromPoem}</div>}
                {data.fromNovel && <div className="bg-white/10 rounded-xl p-2 text-[10px]"><p className="opacity-60 font-bold mb-0.5">מן הרומן</p>{data.fromNovel}</div>}
              </div>
              {data.hashtags && <p className="text-[10px] opacity-50 mt-2 text-center">{data.hashtags}</p>}
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-[10px] text-gray-400 mt-2">תצוגה מקדימה</p>
    </div>
  );
}

export default function Station9() {
  const { saveAnswer, getAnswer, markDone } = useApp();
  const saved = getAnswer('station-9') || {};
  const [postType, setPostType] = useState(saved.postType || '');
  const [fields,   setFields]   = useState(saved.fields   || {});

  const setF = (k, v) => setFields(p => ({ ...p, [k]: v }));
  const formDefs = postType ? TEMPLATE_FORMS[postType] : [];

  return (
    <StationLayout stationId={9}
      onSave={() => { saveAnswer('station-9', { postType, fields }); markDone('station-9'); }}
      gainText="יצרתי פוסט ספרותי שמשלב פרשנות ויצירה. כל בחירה בפוסט — עיצוב, מילה, ציטוט — מבוססת על הבנה ספרותית.">

      {/* Type selector */}
      <div className="card p-4 mb-5">
        <h3 className="font-bold text-navy text-sm mb-1">📸 בחרו סוג פוסט</h3>
        <p className="text-xs text-gray-500 mb-3">כל אחד מייצג אסטרטגיה ספרותית שונה</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {POST_TYPES.map(pt => (
            <button key={pt.id} onClick={() => setPostType(pt.id)}
              className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-right transition-all ${postType === pt.id ? 'border-terracotta' : 'border-gray-200 hover:border-terracotta-300'}`}
              style={postType === pt.id ? { background: `linear-gradient(135deg, ${pt.grad[0]}22, ${pt.grad[1]}22)` } : {}}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${pt.grad[0]}, ${pt.grad[1]})` }}>
                {pt.emoji}
              </div>
              <div>
                <p className="font-bold text-navy text-sm">{pt.id}. {pt.title}</p>
                <p className="text-xs text-gray-500">{pt.desc}</p>
              </div>
              {postType === pt.id && <span className="mr-auto text-terracotta font-black">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Form + Preview */}
      {postType && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Form */}
          <div className="card p-4 space-y-3">
            <h3 className="font-bold text-navy text-sm">✏️ מלאו את הפוסט</h3>
            {formDefs.map(f => (
              <div key={f.k}>
                <label className="block text-xs font-bold text-navy mb-1">{f.l}</label>
                {f.type === 'char-select' ? (
                  <select value={fields[f.k] || ''} onChange={e => setF(f.k, e.target.value)} className="input-field text-sm">
                    <option value="">בחרו דמות...</option>
                    {CHARACTERS.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
                  </select>
                ) : f.type === 'poem-select' ? (
                  <select value={fields[f.k] || ''} onChange={e => setF(f.k, e.target.value)} className="input-field text-sm">
                    <option value="">בחרו שיר...</option>
                    {POEMS.map(p => <option key={p.id} value={String(p.id)}>{p.emoji} {p.title}</option>)}
                  </select>
                ) : (
                  <textarea value={fields[f.k] || ''} onChange={e => setF(f.k, e.target.value)}
                    placeholder={f.ph} rows={f.rows || 2} className="input-field text-sm" />
                )}
              </div>
            ))}
            {/* Justify design */}
            <div>
              <label className="block text-xs font-bold text-navy mb-1">🎨 נמקו את הבחירות העיצוביות</label>
              <textarea value={fields['justify'] || ''} onChange={e => setF('justify', e.target.value)}
                placeholder="למה בחרתם את הסוג הזה? מה כל מרכיב מייצג? לינק לספרות..."
                rows={3} className="input-field text-sm" />
            </div>
          </div>

          {/* Preview */}
          <div>
            <PostPreview type={postType} data={fields} chars={CHARACTERS} />
          </div>
        </div>
      )}
    </StationLayout>
  );
}
