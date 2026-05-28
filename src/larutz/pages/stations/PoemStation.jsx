import React, { useState } from 'react';
import { ChevronLeft, Save, CheckCircle2, BookOpen, ArrowRight } from 'lucide-react';
import { useApp } from '../../LarutzBridge';
import { POEMS } from '../../data/content.js';

// Generic station for any of the 8 poems. Pass poemId (1–8) as prop.
export default function PoemStation({ poemId }) {
  const { saveAnswer, getAnswer, markDone, navigate, isDone } = useApp();
  const poem = POEMS.find(p => p.id === poemId);
  const saved = getAnswer(`poem-${poemId}`) || {};
  const done  = isDone(`poem-${poemId}`);

  const [answers,    setAnswers]   = useState(saved.answers    || {});
  const [analysis,   setAnalysis]  = useState(saved.analysis   || {});
  const [miniPost,   setMiniPost]  = useState(saved.miniPost   || '');
  const [discussion, setDiscussion]= useState(saved.discussion || '');
  const [savedFlash, setSavedFlash]= useState(false);

  if (!poem) return null;

  const set = (k, v) => setAnswers(p => ({ ...p, [k]: v }));
  const setAn = (k, v) => setAnalysis(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    saveAnswer(`poem-${poemId}`, { answers, analysis, miniPost, discussion });
    markDone(`poem-${poemId}`);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 3000);
  };

  const prevPoem = poemId > 1 ? `poem-${poemId - 1}` : 'station-7';
  const nextPoem = poemId < 8 ? `poem-${poemId + 1}` : 'station-8';

  return (
    <div dir="rtl" className="max-w-4xl mx-auto px-4 py-6 pb-28 lg:pb-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <button onClick={() => navigate('dashboard')} className="hover:text-terracotta transition-colors">מסלול</button>
        <span>/</span>
        <button onClick={() => navigate('station-7')} className="hover:text-terracotta transition-colors">מסלול השירה</button>
        <span>/</span>
        <span className="text-navy font-semibold">{poem.title}</span>
      </div>

      {/* Poem hero */}
      <div className={`bg-gradient-to-br ${poem.gradient} rounded-3xl p-5 sm:p-6 mb-6 relative overflow-hidden text-white`}>
        <span className="absolute left-3 bottom-3 text-8xl opacity-10 select-none">{poem.emoji}</span>
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">שיר {poemId} / 8</span>
            {done && <span className="flex items-center gap-1 bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full"><CheckCircle2 size={11}/>הושלם</span>}
          </div>
          <h1 className="text-xl sm:text-2xl font-black mb-0.5">{poem.title}</h1>
          <p className="text-white/80 text-sm">{poem.author} · {poem.period}</p>
          <p className="text-white/90 text-sm mt-2">{poem.description}</p>
          {/* Concepts */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {poem.concepts.map(c => (
              <span key={c} className="text-[10px] bg-white/15 text-white px-2 py-0.5 rounded-full font-semibold">{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Athlete connection */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 mb-5">
        <p className="text-xs font-bold text-orange-700 mb-1">🏅 חיבור לעולם הספורט</p>
        <p className="text-sm text-orange-700">{poem.athleteConnection}</p>
      </div>

      {/* Focus */}
      <div className="bg-white border border-sand-200 rounded-2xl p-4 mb-5">
        <p className="text-xs font-bold text-gray-500 mb-1">מוקד השיר</p>
        <p className="text-sm font-medium text-navy">{poem.focus}</p>
        <div className="mt-2 bg-sand-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-0.5">שורה לדוגמה (מהטקסט המלא):</p>
          <p className="text-sm font-semibold text-navy italic">{poem.sampleLine}</p>
        </div>
      </div>

      {/* Questions */}
      <div className="card p-4 mb-5">
        <h3 className="font-bold text-navy text-sm mb-3">❓ שאלות הבנה וחיבור אישי</h3>
        <div className="space-y-4">
          {poem.questions.map((q, i) => (
            <div key={i}>
              <label className="block text-xs font-bold text-navy mb-1">
                <span className="w-4 h-4 rounded-full bg-terracotta text-white text-[9px] inline-flex items-center justify-center font-black ml-1">{i+1}</span>
                {q}
              </label>
              <textarea value={answers[`q${i}`] || ''} onChange={e => set(`q${i}`, e.target.value)}
                placeholder="כתבו כאן את תשובתכם..." rows={2} className="input-field text-sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Literary analysis */}
      <div className="card p-4 mb-5">
        <h3 className="font-bold text-navy text-sm mb-3">🔍 ניתוח ספרותי</h3>
        <div className="space-y-3">
          {poem.analysisQuestions.map((q, i) => (
            <div key={i}>
              <label className="block text-xs font-bold text-navy mb-1">{q}</label>
              <textarea value={analysis[`a${i}`] || ''} onChange={e => setAn(`a${i}`, e.target.value)}
                placeholder="נתחו בעזרת מושגים ספרותיים..." rows={3} className="input-field text-sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Novel connection */}
      <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 mb-5">
        <h3 className="font-bold text-indigo-800 text-sm mb-2">📚 חיבור ל"מישהו לרוץ איתו"</h3>
        <p className="text-sm text-indigo-700 italic mb-3">{poem.novelConnection}</p>
        <label className="block text-xs font-bold text-indigo-700 mb-1">הרחיבו: איפה עוד מתחבר השיר לרומן?</label>
        <textarea value={analysis['novel'] || ''} onChange={e => setAn('novel', e.target.value)}
          placeholder="נושא משותף, סמל דומה, דמות שמזכירה, מצב זהה..." rows={3} className="input-field text-sm" />
      </div>

      {/* Mini post */}
      <div className="card p-4 mb-5">
        <h3 className="font-bold text-navy text-sm mb-1">✨ מיני פוסט</h3>
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 mb-3 text-white text-center">
          <p className="text-xs text-gray-400 mb-2">השראה לפוסט שלכם:</p>
          <p className="text-sm italic font-medium">"{poem.miniPostPrompt}"</p>
        </div>
        <label className="block text-xs font-bold text-navy mb-1">כתבו קפשן קצר לפוסט בהשראת השיר</label>
        <textarea value={miniPost} onChange={e => setMiniPost(e.target.value)}
          placeholder="פוסט קצר — עד 3 שורות — שמתחבר לשיר ולחייכם..." rows={3} className="input-field text-sm" />
      </div>

      {/* Discussion */}
      <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 mb-5">
        <h3 className="font-bold text-purple-800 text-sm mb-2">💬 שאלת דיון כיתתית</h3>
        <p className="text-sm font-semibold text-purple-700 mb-3">{poem.discussionQ}</p>
        <textarea value={discussion} onChange={e => setDiscussion(e.target.value)}
          placeholder="כתבו את דעתכם..." rows={2} className="input-field text-sm" />
      </div>

      {/* Gain */}
      <div className="mt-5 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex gap-3">
        <BookOpen size={18} className="text-amber-600 shrink-0 mt-0.5"/>
        <div>
          <p className="font-bold text-amber-800 text-sm mb-1">מה רכשתי בתחנה הזו?</p>
          <p className="text-sm text-amber-700">ניתחתי את "{poem.title}" — הבנתי את הנושא, המושגים, והקשר לרומן וחיי הספורט.</p>
        </div>
      </div>

      {/* Save flash */}
      {savedFlash && (
        <div className="mt-3 p-3 bg-sage-50 border border-sage-300 rounded-xl text-center">
          <p className="text-sage-700 font-bold text-sm">✅ שמרנו לך את המחשבה</p>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button onClick={() => navigate(prevPoem)}
          className="flex items-center gap-1 px-4 py-2.5 rounded-full border-2 border-navy text-navy text-sm font-semibold hover:bg-navy hover:text-white transition-all">
          → {poemId > 1 ? `שיר ${poemId - 1}` : 'מסלול השירה'}
        </button>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-terracotta text-white text-sm font-bold hover:bg-terracotta-600 transition-all shadow-md active:scale-95">
          <Save size={15}/>שמור
        </button>
        <button onClick={() => navigate(nextPoem)}
          className="flex items-center gap-1 px-4 py-2.5 rounded-full border-2 border-navy text-navy text-sm font-semibold hover:bg-navy hover:text-white transition-all">
          {poemId < 8 ? `שיר ${poemId + 1}` : 'השוואה'} ←
        </button>
      </div>
      <p className="text-center text-[10px] text-gray-400 mt-2">כל תשובה נשמרת בדפדפן שלך 💾</p>
    </div>
  );
}
