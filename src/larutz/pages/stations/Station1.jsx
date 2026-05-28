import React, { useState } from 'react';
import StationLayout from './StationLayout.jsx';
import { useApp } from '../../LarutzBridge';
import { WORD_BANK } from '../../data/content.js';

const Qs = [
  { id:'q1', label:'מה פירוש "מישהו לרוץ איתו" בעיניך?', ph:'מה עולה לכם בראש כשאתם שומעים את הכותרת?' },
  { id:'q2', label:'מי האדם שרץ איתך ברגעים הקשים?', ph:'מאמן, הורה, חבר, אח — מה הוא עשה שהפך אותו ל"מישהו שרץ איתי"?' },
  { id:'q3', label:'האם קל לך לבקש עזרה? מדוע?', ph:'כספורטאי/ת — האם ניתן לבקש עזרה? מה מקשה?' },
  { id:'q4', label:'מה ההבדל בין לרוץ לבד לרוץ עם מישהו?', ph:'ריצה ממשית ומטפורית — בחיים, בקבוצה, בתחרות...' },
  { id:'q5', label:'איפה בעולם הספורט אתה מרגיש לבד, ואיפה שמישהו איתך?', ph:'הרגעים הספורטיביים שבהם הבדידות או השיתוף הכי חזקים...' },
];

export default function Station1() {
  const { saveAnswer, getAnswer, markDone } = useApp();
  const saved = getAnswer('station-1') || {};
  const [ans, setAns] = useState({ q1:'',q2:'',q3:'',q4:'',q5:'', words:[], reason:'', ...saved });

  const set = (k, v) => setAns(p => ({ ...p, [k]: v }));
  const toggleWord = w => set('words', ans.words.includes(w) ? ans.words.filter(x=>x!==w) : ans.words.length < 3 ? [...ans.words,w] : ans.words);

  return (
    <StationLayout stationId={1} onSave={() => { saveAnswer('station-1', ans); markDone('station-1'); }}
      gainText="הפעלתי ידע קודם וחיברתי את הנושאים של הרומן לחיים שלי. כעת אני נכנס לספר עם עיניים פתוחות יותר.">

      <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 mb-5">
        <h2 className="font-bold text-indigo-800 text-base mb-1 flex items-center gap-2">🌟 לפני שנפתח את הספר</h2>
        <p className="text-indigo-700 text-sm leading-relaxed">שאלות אלה אין להן תשובות שגויות — הן כלי לחשוב ולהרגיש לפני שמתחילים לקרוא.</p>
        <div className="mt-3 bg-white/60 rounded-xl p-3 text-sm text-indigo-600 italic">
          "כשאתם בשיא המאמץ — מה עוזר לכם להמשיך?"
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {Qs.map(q => (
          <div key={q.id} className="card p-4">
            <label className="block font-bold text-navy text-sm mb-2">{q.label}</label>
            <textarea value={ans[q.id]} onChange={e => set(q.id, e.target.value)} placeholder={q.ph} rows={2} className="input-field" />
          </div>
        ))}
      </div>

      {/* Word bank */}
      <div className="card p-4">
        <h3 className="font-bold text-navy mb-0.5 text-sm">בנק מילים — בחרו 3 מילות מפתח</h3>
        <p className="text-xs text-gray-500 mb-3">{ans.words.length}/3 נבחרו</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {WORD_BANK.map(w => (
            <button key={w} onClick={() => toggleWord(w)}
              className={`chip ${ans.words.includes(w) ? 'active' : ''}`}>{w}</button>
          ))}
        </div>
        {ans.words.length === 3 && (
          <div>
            <div className="flex gap-2 mb-2">
              {ans.words.map(w => <span key={w} className="px-3 py-1 bg-terracotta text-white rounded-full text-sm font-bold">{w}</span>)}
            </div>
            <textarea value={ans.reason} onChange={e => set('reason',e.target.value)}
              placeholder="למה בחרתם דווקא מילים אלה?" rows={2} className="input-field text-sm" />
          </div>
        )}
      </div>
    </StationLayout>
  );
}
