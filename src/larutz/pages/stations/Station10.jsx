import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useApp } from '../../LarutzBridge';
import { POEMS } from '../../data/content.js';
import { CheckCircle2, Circle } from 'lucide-react';

const REFLECTION_QUESTIONS = [
  { k:'journey',   l:'מה היה המסע שלכם ביחידה הזו?',                    ph:'מאיפה התחלתם, לאן הגעתם, מה השתנה?' },
  { k:'surprise',  l:'מה הפתיע אותכם בספר או בשירים?',                   ph:'מה לא ציפיתם לגלות?' },
  { k:'connect',   l:'איזה רעיון הכי התחבר לחייכם כספורטאים?',           ph:'פחד, אומץ, "מישהו לרוץ איתו" — מה נגע?' },
  { k:'literary',  l:'מה כלי ספרותי שלמדתם ותשתמשו בו תמיד?',           ph:'מושג, שאלה, דרך לקרוא טקסט...' },
  { k:'afterwords',l:'מה תגידו לאחר / חברה שמתחיל ליחידה הזו?',          ph:'איזו עצה תתנו?' },
];

const SUBMISSION_CHECKLIST = [
  'הרומן — סיכמתי עלילה, דמויות, קונפליקטים, סמלים (תחנות 1–6)',
  'השיר — ניתחתי לפחות שיר אחד לעומק (מסלול השירה)',
  'ההשוואה — מצאתי רעיון משותף ונימקתי (תחנה 8)',
  'הפוסט — יצרתי פוסט עם ביסוס ספרותי (תחנה 9)',
  'שני מושגים ספרותיים — הסברתי ממוקד מהטקסטים',
  'חיבור אישי — כתבתי חיבור אישי ספרטיבי אמיתי',
  'הסבר כתוב — הכנתי הסבר לבחירות העיצוביות',
];

export default function Station10() {
  const { saveAnswer, getAnswer, markDone, navigate, isDone, stationsDone, poemsDone, pct, answers } = useApp();
  const saved = getAnswer('station-10') || {};

  const [reflection,  setReflection]  = useState(saved.reflection  || {});
  const [checklist,   setChecklist]   = useState(saved.checklist   || {});
  const [chosenPoem,  setChosenPoem]  = useState(saved.chosenPoem  || '');
  const [poemReason,  setPoemReason]  = useState(saved.poemReason  || '');
  const [finalExpl,   setFinalExpl]   = useState(saved.finalExpl   || '');
  const [submitted,   setSubmitted]   = useState(saved.submitted   || false);

  const setR = (k, v) => setReflection(p => ({ ...p, [k]: v }));
  const toggleCheck = i => setChecklist(p => ({ ...p, [i]: !p[i] }));
  const checkedCount = Object.values(checklist).filter(Boolean).length;
  const selectedPoem = POEMS.find(p => String(p.id) === String(chosenPoem));

  const handleSubmit = () => {
    saveAnswer('station-10', { reflection, checklist, chosenPoem, poemReason, finalExpl, submitted: true });
    markDone('station-10');
    setSubmitted(true);
  };

  return (
    <StationLayout stationId={10}
      onSave={handleSubmit}
      gainText="סיימתי את המסלול! עכשיו אני יודע לנתח טקסטים ספרותיים, לכתוב השוואה, וליצור פרויקט פרשני שמחבר בין ספרות, ספורט וחיים.">

      {/* Progress summary */}
      <div className={`rounded-2xl p-5 mb-5 ${pct === 100 ? 'bg-sage-50 border-2 border-sage text-sage-800' : 'bg-navy text-white'}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{pct === 100 ? '🎉' : '🎯'}</span>
          <div>
            <p className="font-black text-lg">{pct === 100 ? 'השלמתם את המסלול!' : 'סיכום ההתקדמות שלכם'}</p>
            <p className={`text-sm ${pct === 100 ? 'text-sage-600' : 'text-sand-200'}`}>{stationsDone}/10 תחנות · {poemsDone}/8 שירים · {pct}%</p>
          </div>
        </div>
        <div className={`h-3 rounded-full overflow-hidden ${pct === 100 ? 'bg-sage-200' : 'bg-white/20'}`}>
          <div className="h-full progress-fill transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        {pct < 100 && (
          <p className="text-xs text-sand-300 mt-2">כדי להגיש — מומלץ להשלים כמה שיותר תחנות. לא חובה את כולן.</p>
        )}
      </div>

      {/* Poem selection */}
      <div className="card p-4 mb-5">
        <h3 className="font-bold text-navy text-sm mb-1">🎵 בחרו את השיר להגשה</h3>
        <p className="text-xs text-gray-500 mb-3">איזה שיר ניתחתם הכי לעומק? זה יהיה השיר שתגישו</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {POEMS.map(p => {
            const done = isDone(`poem-${p.id}`);
            return (
              <button key={p.id} onClick={() => setChosenPoem(String(p.id))}
                className={`rounded-xl border-2 p-2.5 text-center transition-all ${chosenPoem === String(p.id) ? 'border-terracotta bg-terracotta-50' : done ? 'border-sage bg-sage-50' : 'border-gray-200 hover:border-terracotta-300'}`}>
                <span className="text-xl block">{p.emoji}</span>
                <p className="text-[10px] font-bold text-navy leading-tight">{p.title.split('/')[0]}</p>
                {done && <CheckCircle2 size={10} className="text-sage mx-auto mt-1"/>}
              </button>
            );
          })}
        </div>
        {selectedPoem && (
          <div>
            <div className="bg-sand-50 rounded-xl p-3 mb-2">
              <p className="text-xs font-bold text-navy">{selectedPoem.emoji} {selectedPoem.title} — {selectedPoem.author}</p>
            </div>
            <label className="block text-xs font-bold text-navy mb-1">למה בחרתם דווקא שיר זה?</label>
            <textarea value={poemReason} onChange={e => setPoemReason(e.target.value)}
              placeholder="מה הקשר שלו לרומן? מה נגע בכם? מה ניתן לנתח ממנו?"
              rows={3} className="input-field text-sm" />
          </div>
        )}
      </div>

      {/* Reflection */}
      <div className="card p-4 mb-5">
        <h3 className="font-bold text-navy text-sm mb-3">✨ רפלקציה — מסע המסלול</h3>
        <div className="space-y-4">
          {REFLECTION_QUESTIONS.map(q => (
            <div key={q.k}>
              <label className="block text-xs font-bold text-navy mb-1">{q.l}</label>
              <textarea value={reflection[q.k] || ''} onChange={e => setR(q.k, e.target.value)}
                placeholder={q.ph} rows={2} className="input-field text-sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Literary explanation */}
      <div className="card p-4 mb-5">
        <h3 className="font-bold text-navy text-sm mb-1">📝 הסבר ספרותי לפוסט</h3>
        <p className="text-xs text-gray-500 mb-2">כתבו פסקה אחת שמסבירה את הפוסט שיצרתם — מה ניתחתם, איך, ולמה</p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-3">
          <p className="text-xs font-bold text-blue-700 mb-1">🔧 תבנית לפסקת הסבר:</p>
          <p className="text-xs text-blue-600">בחרתי לנתח את __ בעזרת תבנית __. השתמשתי במושג __ מן __ וקישרתי אותו ל__ ברומן. הרעיון המשותף שמצאתי הוא __. חיברתי לעולם הספורט דרך __.</p>
        </div>
        <textarea value={finalExpl} onChange={e => setFinalExpl(e.target.value)}
          placeholder="כתבו כאן את ההסבר הספרותי שלכם..." rows={5} className="input-field text-sm" />
      </div>

      {/* Submission checklist */}
      <div className="card p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-navy text-sm">✅ רשימת הגשה</h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${checkedCount === SUBMISSION_CHECKLIST.length ? 'bg-sage-100 text-sage-700' : 'bg-sand-100 text-navy'}`}>
            {checkedCount}/{SUBMISSION_CHECKLIST.length}
          </span>
        </div>
        <div className="space-y-2">
          {SUBMISSION_CHECKLIST.map((item, i) => (
            <button key={i} onClick={() => toggleCheck(i)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-right transition-all ${checklist[i] ? 'bg-sage-50 border-sage-300' : 'bg-white border-gray-200 hover:border-sage-300'}`}>
              {checklist[i] ? <CheckCircle2 size={16} className="text-sage flex-shrink-0"/> : <Circle size={16} className="text-gray-300 flex-shrink-0"/>}
              <p className={`text-xs ${checklist[i] ? 'text-sage-700 font-semibold' : 'text-gray-600'}`}>{item}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Submission */}
      {!submitted ? (
        <div className="bg-terracotta/10 border-2 border-terracotta rounded-2xl p-5 text-center">
          <p className="text-xl mb-2">🎯</p>
          <p className="font-black text-navy text-base mb-1">מוכנים להגיש?</p>
          <p className="text-sm text-gray-600 mb-4">לאחר ההגשה תוכלו לחזור ולערוך. הכל נשמר בדפדפן.</p>
          <button onClick={handleSubmit}
            className="px-8 py-3 bg-terracotta text-white font-black rounded-full text-sm hover:bg-terracotta-600 transition-all shadow-lg active:scale-95">
            הגשת פרויקט סופי 🚀
          </button>
        </div>
      ) : (
        <div className="bg-sage-50 border-2 border-sage rounded-2xl p-6 text-center">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-black text-sage-800 text-xl mb-2">כל הכבוד! הגשתם!</p>
          <p className="text-sm text-sage-700 mb-4">המסלול הושלם. כל התשובות שמורות בדפדפן שלכם.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => navigate('portfolio')}
              className="px-5 py-2 bg-sage text-white font-bold rounded-full text-sm hover:bg-sage-600 transition-all">
              📓 מחברת המסע שלי
            </button>
            <button onClick={() => navigate('dashboard')}
              className="px-5 py-2 border-2 border-sage text-sage font-bold rounded-full text-sm hover:bg-sage-50 transition-all">
              🗺️ חזרה למסלול
            </button>
          </div>
        </div>
      )}
    </StationLayout>
  );
}
