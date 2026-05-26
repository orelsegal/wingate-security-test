import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Save, Sparkles } from "lucide-react";
import { loadSettings, saveSettings, DCSettings, getTodayChallenge } from "@/lib/dailyChallenge";

const SUBJECTS = ["מתמטיקה", "ספרות", "לשון", "היסטוריה", "תנ״ך", "חזרה שבועית"];

export default function DailyChallengeAdminPage() {
  const navigate = useNavigate();
  const [s, setS] = useState<DCSettings>(loadSettings());
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const challenge = getTodayChallenge();

  const update = <K extends keyof DCSettings>(k: K, v: DCSettings[K]) => setS(p => ({ ...p, [k]: v }));

  const toggleSubject = (sub: string) => {
    update("subjects", s.subjects.includes(sub) ? s.subjects.filter(x => x !== sub) : [...s.subjects, sub]);
  };

  const save = () => { saveSettings(s); setSavedAt(Date.now()); };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/40 via-white to-violet-50/30 p-5 md:p-10" dir="rtl">
      <div className="max-w-[760px] mx-auto">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-3">
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> חזרה
        </button>
        <div className="mb-6">
          <p className="text-[10.5px] font-semibold text-violet-600 mb-1 inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" /> ניהול האתגר היומי
          </p>
          <h1 className="text-[26px] font-bold text-foreground">הגדרות האתגר היומי</h1>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            היום: <span className="font-semibold text-foreground">{challenge.subject} — {challenge.topic}</span>
          </p>
        </div>

        <div className="space-y-4">
          {/* enable */}
          <Card title="פעיל/לא פעיל">
            <Toggle checked={s.enabled} onChange={v => update("enabled", v)} label="הפעל אתגר יומי לתלמידים" />
          </Card>

          {/* subjects */}
          <Card title="מקצועות שיופיעו באתגרים">
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(sub => {
                const on = s.subjects.includes(sub);
                return (
                  <button key={sub} onClick={() => toggleSubject(sub)}
                    className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium ring-1 transition-all ${
                      on ? "bg-violet-500 text-white ring-violet-500" : "bg-white text-muted-foreground ring-border hover:ring-violet-300"
                    }`}>
                    {sub}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* difficulty + competition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="רמת קושי">
              <Segmented value={s.difficulty} onChange={v => update("difficulty", v as any)}
                options={[["easy","קל"],["medium","בינוני"],["hard","קשה"]]} />
            </Card>
            <Card title="סוג תחרות">
              <Segmented value={s.competition} onChange={v => update("competition", v as any)}
                options={[["personal","אישי"],["class","כיתתי"],["group","קבוצה"],["sport","ענף"],["grade","שכבה"],["school","ביה״ס"]]} />
            </Card>
          </div>

          {/* threshold */}
          <Card title={`רף הצלחה — ${s.passThreshold}%`}>
            <input type="range" min={50} max={100} step={5}
              value={s.passThreshold}
              onChange={e => update("passThreshold", Number(e.target.value))}
              className="w-full accent-violet-500" />
            <div className="flex justify-between text-[10.5px] text-muted-foreground mt-1.5">
              <span>50%</span><span>75%</span><span>100%</span>
            </div>
          </Card>

          {/* points */}
          <Card title="ניקוד">
            <div className="grid grid-cols-3 gap-3">
              <Field label="תשובה נכונה" value={s.pointsPerCorrect} onChange={v=>update("pointsPerCorrect", v)} />
              <Field label="שאלת בוס"     value={s.pointsBoss}        onChange={v=>update("pointsBoss", v)} />
              <Field label="סיום אתגר"    value={s.pointsCompletion}  onChange={v=>update("pointsCompletion", v)} />
            </div>
          </Card>

          {/* stats placeholder */}
          <Card title="סטטיסטיקות (אב־טיפוס)">
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat n="74%" l="השתתפו היום" />
              <Stat n="68%" l="עברו את הרף" />
              <Stat n="ספרות" l="הנושא החלש" />
            </div>
          </Card>
        </div>

        <div className="sticky bottom-3 mt-6">
          <button onClick={save}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl py-3.5 font-semibold shadow-lg shadow-violet-300/40 hover:scale-[1.005] transition-all">
            <Save className="h-4 w-4" /> שמור הגדרות
            {savedAt && <span className="text-[11px] opacity-80 ms-2">נשמר ✓</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl ring-1 ring-border p-5 shadow-sm">
    <h3 className="text-[13px] font-semibold text-foreground mb-3">{title}</h3>
    {children}
  </div>
);

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange:(v:boolean)=>void; label: string }) => (
  <label className="flex items-center justify-between gap-3 cursor-pointer">
    <span className="text-[12.5px] text-foreground">{label}</span>
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-violet-500" : "bg-muted"}`}>
      <span className={`absolute top-0.5 ${checked ? "end-0.5" : "end-[22px]"} w-5 h-5 rounded-full bg-white shadow transition-all`} />
    </button>
  </label>
);

const Segmented = ({ value, onChange, options }: { value: string; onChange:(v:string)=>void; options:[string,string][] }) => (
  <div className="inline-flex flex-wrap items-center gap-1 bg-muted/40 rounded-xl p-1">
    {options.map(([v, label]) => (
      <button key={v} onClick={() => onChange(v)}
        className={`px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-all ${
          value === v ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        }`}>{label}</button>
    ))}
  </div>
);

const Field = ({ label, value, onChange }: { label: string; value: number; onChange:(v:number)=>void }) => (
  <div>
    <label className="text-[10.5px] text-muted-foreground">{label}</label>
    <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
      className="w-full mt-1 bg-white rounded-lg ring-1 ring-border px-3 py-2 text-[13px] tabular-nums focus:ring-violet-400 outline-none" />
  </div>
);

const Stat = ({ n, l }: { n: string; l: string }) => (
  <div className="bg-muted/30 rounded-xl py-3">
    <p className="text-[18px] font-bold text-foreground">{n}</p>
    <p className="text-[10.5px] text-muted-foreground">{l}</p>
  </div>
);
