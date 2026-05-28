import React, { useState } from 'react';
import { useApp } from '../LarutzBridge';
import { NOVEL_STATIONS, POEMS, CHARACTERS, CONFLICTS, THEMES, SYMBOLS } from '../data/content.js';
import { ChevronLeft, ChevronDown, ChevronUp, Printer } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────

function Section({ title, emoji, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card overflow-hidden mb-3">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-right hover:bg-gray-50 transition-colors">
        <span className="text-xl">{emoji}</span>
        <p className="flex-1 font-black text-navy text-sm">{title}</p>
        {open ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100 pt-3">{children}</div>}
    </div>
  );
}

function TextBlock({ label, value }) {
  if (!value) return null;
  return (
    <div className="mb-3">
      <p className="text-xs font-bold text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-800 bg-sand-50 rounded-xl p-3 border border-sand-200 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function WordsBlock({ words }) {
  if (!words?.length) return null;
  return (
    <div className="mb-3">
      <p className="text-xs font-bold text-gray-500 mb-1">מילות המפתח</p>
      <div className="flex gap-2">
        {words.map(w => <span key={w} className="px-3 py-1 bg-terracotta text-white rounded-full text-sm font-bold">{w}</span>)}
      </div>
    </div>
  );
}

// ── Station answer displays ───────────────────────────────────────

function Station1Display({ data }) {
  const Qs = ['מה פירוש "מישהו לרוץ איתו"?','מי רץ איתך?','האם קל לבקש עזרה?','ריצה לבד מול יחד','איפה מרגיש לבד / עם מישהו'];
  return (
    <div>
      <WordsBlock words={data.words} />
      <TextBlock label="מדוע בחרתם מילים אלה?" value={data.reason} />
      {[1,2,3,4,5].map((i) => <TextBlock key={i} label={Qs[i-1]} value={data[`q${i}`]} />)}
    </div>
  );
}

function Station2Display({ data }) {
  if (!data) return null;
  return (
    <div>
      <TextBlock label="עלילה פנימית מול חיצונית" value={data.inner} />
      <TextBlock label="נקודת המפנה הגדולה" value={data.turning} />
      {data.timeline?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2">ציר האירועים</p>
          <div className="space-y-2">
            {data.timeline.map((ev, i) => (
              <div key={ev.id} className="bg-sand-50 rounded-xl p-3 border border-sand-200">
                <p className="text-xs font-bold text-navy mb-1">אירוע {i+1}: {ev.type}</p>
                {ev.what && <p className="text-xs text-gray-600">מה קרה: {ev.what}</p>}
                {ev.why  && <p className="text-xs text-gray-600">למה חשוב: {ev.why}</p>}
                {ev.change && <p className="text-xs text-gray-600">מה השתנה: {ev.change}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Station3Display({ data }) {
  const FIELDS = [{k:'wants',l:'רוצה'},{k:'fears',l:'פוחד/ת'},{k:'hides',l:'מסתיר/ה'},{k:'strength',l:'כוח'},{k:'weakness',l:'חולשה'},{k:'change',l:'שינוי'},{k:'quote',l:'ציטוט'}];
  return (
    <div>
      {CHARACTERS.map(c => {
        const cd = data.chars?.[c.id];
        const has = cd && Object.values(cd).some(Boolean);
        if (!has) return null;
        return (
          <div key={c.id} className="mb-3 bg-sand-50 rounded-xl p-3 border border-sand-200">
            <p className="font-bold text-navy text-sm mb-2">{c.emoji} {c.name}</p>
            <div className="grid grid-cols-2 gap-1">
              {FIELDS.map(f => cd[f.k] ? (
                <div key={f.k}><span className="text-[10px] font-bold text-gray-400">{f.l}: </span><span className="text-xs text-gray-700">{cd[f.k]}</span></div>
              ) : null)}
            </div>
          </div>
        );
      })}
      {data.relMap && Object.values(data.relMap).some(Boolean) && (
        <div>
          <p className="text-xs font-bold text-gray-500 mb-1">מפת יחסים: {data.relMap.c1} ↔ {data.relMap.c2}</p>
          <TextBlock label="מה מחבר" value={data.relMap.connects} />
          <TextBlock label="מה מפריד" value={data.relMap.separates} />
        </div>
      )}
    </div>
  );
}

function GenericDisplay({ data, label }) {
  if (!data) return <p className="text-xs text-gray-400">אין תשובות שמורות</p>;
  const entries = Object.entries(data).filter(([, v]) => typeof v === 'string' && v.trim());
  if (!entries.length) return <p className="text-xs text-gray-400">אין תשובות שמורות</p>;
  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => <TextBlock key={k} label={k} value={v} />)}
    </div>
  );
}

// ── Main Portfolio ────────────────────────────────────────────────

export default function Portfolio() {
  const { navigate, getAnswer, isDone, stationsDone, poemsDone, pct } = useApp();

  const s = (key) => getAnswer(key) || {};

  return (
    <div dir="rtl" className="max-w-4xl mx-auto px-4 py-6 pb-24 lg:pb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <button onClick={() => navigate('dashboard')} className="hover:text-terracotta transition-colors">מסלול</button>
        <ChevronLeft size={12}/>
        <span className="text-navy font-semibold">מחברת המסע</span>
      </div>

      {/* Header */}
      <div className="station-hero rounded-3xl p-5 sm:p-6 mb-6 relative overflow-hidden text-white">
        <span className="absolute left-3 bottom-3 text-8xl opacity-5 select-none">📓</span>
        <div className="relative">
          <h1 className="text-xl sm:text-2xl font-black mb-0.5">מחברת המסע שלי</h1>
          <p className="text-sand-200 text-sm">כל תשובותיכם במקום אחד</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-sm font-bold">{pct}% הושלם</span>
            <div className="flex-1 max-w-[180px] h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-sage rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-sand-300">{stationsDone}/10 תחנות · {poemsDone}/8 שירים</span>
          </div>
        </div>
      </div>

      {/* Print button */}
      <div className="flex justify-end mb-4 no-print">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-navy text-navy text-sm font-semibold hover:bg-navy hover:text-white transition-all">
          <Printer size={14}/>הדפסה / PDF
        </button>
      </div>

      {/* Novel stations */}
      <h2 className="font-bold text-navy text-sm mb-3 flex items-center gap-2">📚 תחנות הרומן</h2>

      <Section title="תחנה 1 — לפני שמתחילים" emoji="🌟" defaultOpen={isDone('station-1')}>
        <Station1Display data={s('station-1')} />
      </Section>

      <Section title="תחנה 2 — עלילת הרומן" emoji="🗺️" defaultOpen={isDone('station-2')}>
        <Station2Display data={s('station-2')} />
      </Section>

      <Section title="תחנה 3 — דמויות וקשרים" emoji="👥" defaultOpen={isDone('station-3')}>
        <Station3Display data={s('station-3')} />
      </Section>

      <Section title="תחנה 4 — קונפליקטים" emoji="⚡">
        {(() => {
          const d = s('station-4');
          return (
            <div>
              {d.chosen && <p className="text-xs font-bold text-navy mb-2">קונפליקט מרכזי: {CONFLICTS.find(c => c.id === d.chosen)?.title}</p>}
              <TextBlock label="ניתוח הקונפליקט המרכזי" value={d.analysis} />
              {d.conflicts && Object.entries(d.conflicts).map(([id, cd]) => {
                const conf = CONFLICTS.find(c => c.id === id);
                const has = cd && Object.values(cd).some(Boolean);
                if (!has) return null;
                return (
                  <div key={id} className="mb-2">
                    <p className="text-xs font-bold text-navy">{conf?.title}</p>
                    {cd.where    && <TextBlock label="איפה" value={cd.where} />}
                    {cd.price    && <TextBlock label="מחיר" value={cd.price} />}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Section>

      <Section title="תחנה 5 — נושאים ורעיונות" emoji="💡">
        {(() => {
          const d = s('station-5');
          return (
            <div>
              <TextBlock label="מסר מרכזי" value={d.formula} />
              {d.themeData && Object.entries(d.themeData).map(([id, td]) => {
                const theme = THEMES.find(t => t.id === id);
                const has = td && Object.values(td).some(Boolean);
                if (!has) return null;
                return (
                  <div key={id} className="mb-2">
                    <p className="text-xs font-bold text-navy">{theme?.icon} {theme?.title}</p>
                    {td.message && <TextBlock label="מסר" value={td.message} />}
                    {td.sport   && <TextBlock label="ספורט" value={td.sport} />}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </Section>

      <Section title="תחנה 6 — סמלים ומוטיבים" emoji="🔮">
        {(() => {
          const d = s('station-6');
          return (
            <div>
              {d.mainSym && <p className="text-xs font-bold text-navy mb-1">סמל מרכזי: {SYMBOLS.find(s => s.id === d.mainSym)?.title}</p>}
              <TextBlock label="הסבר" value={d.mainExp} />
              <TextBlock label="הכותרת כסמל" value={d.titleSym} />
            </div>
          );
        })()}
      </Section>

      {/* Poetry stations */}
      <h2 className="font-bold text-navy text-sm mt-5 mb-3 flex items-center gap-2">🎵 מסלול השירה</h2>
      {POEMS.map(p => {
        const done = isDone(`poem-${p.id}`);
        const pd = s(`poem-${p.id}`);
        return (
          <Section key={p.id} title={`${p.emoji} ${p.title} — ${p.author}`} emoji={p.emoji}>
            {done ? (
              <div>
                {pd.answers && Object.entries(pd.answers).filter(([,v]) => v).map(([k, v]) => (
                  <TextBlock key={k} label={p.questions[parseInt(k.replace('q',''))] || k} value={v} />
                ))}
                <TextBlock label="ניתוח ספרותי" value={pd.analysis?.a0} />
                <TextBlock label="חיבור לרומן" value={pd.analysis?.novel} />
                <TextBlock label="מיני פוסט" value={pd.miniPost} />
              </div>
            ) : (
              <p className="text-xs text-gray-400">תחנה טרם הושלמה</p>
            )}
          </Section>
        );
      })}

      {/* Station 8 */}
      <h2 className="font-bold text-navy text-sm mt-5 mb-3 flex items-center gap-2">🔗 השוואה והגשה</h2>
      <Section title="תחנה 8 — השוואה בין יצירות" emoji="🔗">
        {(() => {
          const d = s('station-8');
          return (
            <div>
              <TextBlock label="טענת ההשוואה" value={d.thesis} />
              {d.fields && Object.values(d.fields).some(Boolean) && (
                <TextBlock label="ניתוח" value={Object.values(d.fields).filter(Boolean).join(' | ')} />
              )}
            </div>
          );
        })()}
      </Section>

      <Section title="תחנה 9 — הפוסט הספרותי" emoji="📸">
        {(() => {
          const d = s('station-9');
          return (
            <div>
              {d.postType && <p className="text-xs font-bold text-navy mb-2">סוג פוסט: {d.postType}</p>}
              {d.fields?.justify && <TextBlock label="ביסוס ספרותי" value={d.fields.justify} />}
              {d.fields?.caption && <TextBlock label="קפשן" value={d.fields.caption} />}
              {d.fields?.shared  && <TextBlock label="רעיון משותף" value={d.fields.shared} />}
            </div>
          );
        })()}
      </Section>

      <Section title="תחנה 10 — רפלקציה והגשה" emoji="🎯" defaultOpen={isDone('station-10')}>
        {(() => {
          const d = s('station-10');
          return (
            <div>
              <TextBlock label="הסבר ספרותי סופי" value={d.finalExpl} />
              {d.reflection && (
                <div>
                  <TextBlock label="המסע ביחידה" value={d.reflection.journey} />
                  <TextBlock label="מה הפתיע" value={d.reflection.surprise} />
                  <TextBlock label="חיבור לספורט" value={d.reflection.connect} />
                  <TextBlock label="כלי ספרותי לחיים" value={d.reflection.literary} />
                </div>
              )}
            </div>
          );
        })()}
      </Section>
    </div>
  );
}
