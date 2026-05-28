import React, { useState } from 'react';
import { useApp } from '../LarutzBridge';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';

// Teachers: add, remove, or edit terms in this array.
const TERMS = [
  { term:'דובר',           emoji:'🗣️', cat:'שיר',   def:'מי שמדבר בשיר — לא בהכרח המחבר.', tip:'שאלו: "מי מדבר? מה מצבו? אל מי הוא פונה?"' },
  { term:'נמען',           emoji:'👂', cat:'שיר',   def:'מי שהדובר פונה אליו — אדם, אלוהים, הטבע, עצמו.', tip:'זיהוי הנמען מגלה על הדובר.' },
  { term:'מוטיב',          emoji:'🔁', cat:'שניהם', def:'יסוד חוזר (מילה, תמונה, מצב) לאורך יצירה שלמה.', tip:'חפשו: מה חוזר? למה?'},
  { term:'סמל',            emoji:'🔮', cat:'שניהם', def:'אובייקט שמייצג רעיון גדול מעצמו.', tip:'ריצה = לא רק פעולה. שאלו: מה עוד?' },
  { term:'דימוי / מטפורה', emoji:'🌊', cat:'שניהם', def:'השוואה בין שני דברים שאינם דומים כדי לחדד.', tip:'מטפורה = "הוא אבן." דימוי = "כמו אבן."' },
  { term:'מסר',            emoji:'💡', cat:'שניהם', def:'מה היצירה אומרת על העולם — משפט שלם עם תובנה.', tip:'נוסחה: "היצירה מעלה __ כדי להראות ש__."' },
  { term:'נושא',           emoji:'📌', cat:'שניהם', def:'תחום הנידון — מילה אחת (אהבה, מסע, גדילה).', tip:'שונה ממסר! נושא = על מה. מסר = מה הוא אומר.' },
  { term:'קונפליקט פנימי', emoji:'🧠', cat:'רומן',  def:'מתח שמתחולל בתוך הדמות בין שני רצונות / ערכים.', tip:'זה המנוע של הדמות — מה היא רוצה ומה מונע?' },
  { term:'אפיון ישיר',     emoji:'📢', cat:'רומן',  def:'הסופר אומר מה טיב הדמות במפורש.', tip:'"הוא היה ביישן" — הכותב מסביר.' },
  { term:'אפיון עקיף',     emoji:'🔍', cat:'רומן',  def:'מגלים את הדמות דרך דבריה, מעשיה, מחשבותיה.', tip:'עדיף — מחייב את הקורא להסיק.' },
  { term:'נקודת מפנה',     emoji:'🔄', cat:'רומן',  def:'אירוע שאחריו שום דבר לא חוזר להיות כפי שהיה.', tip:'לפני / אחרי: מה השתנה?' },
  { term:'עלילה פנימית',   emoji:'💫', cat:'רומן',  def:'המסע הנפשי של הדמות — שינוי בתפיסה / זהות.', tip:'מקביל לעלילה החיצונית.' },
  { term:'רומן מסע',       emoji:'🗺️', cat:'ז׳אנר', def:'ז׳אנר שהמסע הפיזי מקביל למסע פנימי של גדילה.', tip:'"מישהו לרוץ איתו" הוא רומן מסע אורבני.' },
  { term:'אלגוריה',        emoji:'🎭', cat:'שיר',   def:'כל פרטי הסיפור מסמלים רעיון גדול יותר.', tip:'שיר "איתקה" — כל פרטי המסע = הבנת עצמך.' },
  { term:'אירוניה',        emoji:'😏', cat:'שניהם', def:'פער בין מה שנאמר לבין מה שמתכוונים — לשון נוקבת.', tip:'"השחיינים" ו"המדינה שכחה" — אירוניה מרה.' },
  { term:'ביקורת חברתית',  emoji:'🌍', cat:'שיר',   def:'יצירה שתוקפת נורמה / כשל של חברה.', tip:'שאלו: מה הכותב מבקר? על מי?' },
  { term:'אנאפורה',        emoji:'🔂', cat:'שיר',   def:'חזרה על מילה / ביטוי בתחילת שורות עוקבות.', tip:'יוצרת קצב ומחדדת רעיון מרכזי.' },
  { term:'טון',            emoji:'🎚️', cat:'שיר',   def:'הגישה הרגשית של הדובר לנושא — כואב, מלגלג, עצוב.', tip:'שינוי בטון = שינוי בגישה הרגשית.' },
  { term:'השוואה ספרותית', emoji:'⚖️', cat:'שניהם', def:'מציאת רעיון משותף בין שתי יצירות ובדיקתו מכל אחת.', tip:'לא "דומות" — "שתיהן מראות ש...".' },
  { term:'פנייה ישירה',    emoji:'📩', cat:'שיר',   def:'הדובר פונה ישירות לנמען — גלויה וישירה.', tip:'מגלה על צורך, כמיהה, או כעס.' },
];

const PARA_TEMPLATE = `[מושג ספרותי] הוא ________ (הגדרה).
ב[שם היצירה], [המחבר] משתמש בו כאשר ________ (ציטוט קצר / תיאור).
השימוש בו מראה ש________ (הסבר ומשמעות).
בדרך זו, [המחבר] מחזק את המסר לפיו ________ (קשר למסר).`;

const CATS = ['הכל','שיר','רומן','ז׳אנר','שניהם'];

export default function LiteraryGuide() {
  const { navigate } = useApp();
  const [search,  setSearch]  = useState('');
  const [cat,     setCat]     = useState('הכל');
  const [openTerm,setOpenTerm]= useState(null);

  const filtered = TERMS.filter(t =>
    (cat === 'הכל' || t.cat === cat) &&
    (t.term.includes(search) || t.def.includes(search))
  );

  return (
    <div dir="rtl" className="max-w-4xl mx-auto px-4 py-6 pb-24 lg:pb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <button onClick={() => navigate('dashboard')} className="hover:text-terracotta transition-colors">מסלול</button>
        <ChevronLeft size={12}/>
        <span className="text-navy font-semibold">מדריך ניתוח</span>
      </div>

      {/* Header */}
      <div className="station-hero rounded-3xl p-5 sm:p-6 mb-6 relative overflow-hidden text-white">
        <span className="absolute left-3 bottom-3 text-8xl opacity-5 select-none">📖</span>
        <div className="relative">
          <h1 className="text-xl sm:text-2xl font-black mb-0.5">מדריך ניתוח ספרותי</h1>
          <p className="text-sand-200 text-sm">20 מושגים · נוסחאות · תבנית פסקה</p>
        </div>
      </div>

      {/* Paragraph template */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-6">
        <h2 className="font-bold text-blue-800 mb-3">✍️ תבנית לפסקת ניתוח מושג ספרותי</h2>
        <div className="bg-white rounded-xl p-4 font-mono text-sm text-blue-900 leading-relaxed whitespace-pre-line border border-blue-100">
          {PARA_TEMPLATE}
        </div>
        <p className="text-xs text-blue-600 mt-2">💡 השתמשו בתבנית זו בכל פוסט, השוואה, ורפלקציה.</p>
      </div>

      {/* Formula box */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-6">
        <h2 className="font-bold text-amber-800 mb-3">🔧 נוסחאות חיוניות</h2>
        <div className="space-y-3">
          {[
            { label:'ניסוח מסר',    formula:'"היצירה מעלה את נושא __ כדי להראות ש__."' },
            { label:'השוואה',       formula:'"שתי היצירות מראות ש__ — ב__ דרך __, ב__ דרך __."' },
            { label:'ניתוח סמל',    formula:'"__ מסמל __ מפני ש__. בדרך זו הכותב מחזק __."' },
            { label:'אפיון עקיף',   formula:'"דרך [מעשה/דיבור/מחשבה], הסופר מגלה ש__ הוא __ מפני ש__."' },
          ].map(f => (
            <div key={f.label} className="bg-white rounded-xl p-3 border border-amber-100">
              <p className="text-xs font-bold text-amber-700 mb-1">{f.label}:</p>
              <p className="text-sm italic text-amber-800 font-semibold">{f.formula}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 חיפוש מושג..." className="input-field text-sm flex-1" />
        <div className="flex gap-1 flex-wrap">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${cat === c ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-gray-300 hover:border-navy'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Terms list */}
      <p className="text-xs text-gray-400 mb-3">{filtered.length} מושגים</p>
      <div className="space-y-2">
        {filtered.map(t => (
          <div key={t.term} className="card overflow-hidden">
            <button onClick={() => setOpenTerm(openTerm === t.term ? null : t.term)}
              className="w-full flex items-center gap-3 p-4 text-right hover:bg-gray-50 transition-colors">
              <span className="text-xl">{t.emoji}</span>
              <div className="flex-1">
                <p className="font-black text-navy text-sm">{t.term}</p>
                <p className="text-[10px] text-gray-400">{t.cat}</p>
              </div>
              {openTerm === t.term ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
            </button>
            {openTerm === t.term && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
                <p className="text-sm text-gray-700">{t.def}</p>
                <div className="bg-sand-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-terracotta mb-0.5">💡 טיפ:</p>
                  <p className="text-xs text-gray-600">{t.tip}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
