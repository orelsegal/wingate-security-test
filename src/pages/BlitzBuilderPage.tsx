import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Trash2, Save, Zap, Sparkles, ChevronLeft, Play, Crown, Edit3, Copy, Wand2, Loader2, X,
} from "lucide-react";
import {
  listBlitzGames, upsertBlitzGame, deleteBlitzGame, newBlitzGame, blankQuestion,
  type BlitzGame, type BlitzQuestion,
} from "@/lib/blitzGames";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const BlitzBuilderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || "";
  const canEdit = role === "admin" || role === "teacher";

  const [games, setGames] = useState<BlitzGame[]>([]);
  const [editing, setEditing] = useState<BlitzGame | null>(null);

  useEffect(() => { setGames(listBlitzGames()); }, []);
  const refresh = () => setGames(listBlitzGames());

  if (!canEdit) {
    return (
      <div className="p-10 text-center" dir="rtl">
        <p className="text-[14px] text-muted-foreground mb-4">המסך זמין רק למורים ומנהלים</p>
        <button onClick={() => navigate("/play")} className="text-violet-600 text-[13px] font-semibold">חזרה</button>
      </div>
    );
  }

  /* ── editor view ── */
  if (editing) {
    return (
      <BlitzEditor
        game={editing}
        onSave={(g) => { upsertBlitzGame(g); refresh(); setEditing(null); toast({ title: "נשמר", description: `קרב הבזק "${g.name}" נשמר.` }); }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/40 via-white to-white p-5 md:p-8" dir="rtl">
      <div className="max-w-[960px] mx-auto">
        <button onClick={() => navigate("/play")} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-3.5 w-3.5" /> חזרה
        </button>

        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full mb-2">
              <Zap className="h-3 w-3" /> מקצה הבזק · מצב מורה
            </span>
            <h1 className="text-[26px] font-bold text-foreground">בניית קרבות בזק</h1>
            <p className="text-[13px] text-muted-foreground mt-1">צרו משחק לימודי קצר, מהיר ותחרותי לתלמידים.</p>
          </div>
          <button
            onClick={() => setEditing(newBlitzGame())}
            className="inline-flex items-center gap-2 bg-gradient-to-l from-violet-500 to-fuchsia-500 text-white text-[14px] font-bold px-5 py-3 rounded-2xl shadow-[0_12px_28px_-12px_rgba(140,80,220,0.6)] hover:scale-[1.02] transition-all"
          >
            <Plus className="h-4 w-4" /> צור משחק חדש
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {games.map((g) => (
            <div key={g.id} className="bg-white rounded-3xl ring-1 ring-border p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 mb-1">
                    {g.seed && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">דוגמה</span>}
                    <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">{g.subject || "ללא מקצוע"}</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-foreground truncate">{g.name || "ללא שם"}</h3>
                  <p className="text-[11.5px] text-muted-foreground mt-1">
                    {g.questions.length} שאלות · {Math.round(g.totalSeconds / 60)} דק׳ · {g.topic || "—"}
                  </p>
                </div>
                <Crown className="h-5 w-5 text-amber-400 shrink-0" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => navigate(`/play/blitz/${g.id}`)}
                  className="inline-flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-[12px] font-semibold px-3 py-1.5 rounded-full"
                >
                  <Play className="h-3 w-3 fill-white" strokeWidth={0} /> שחק
                </button>
                <button
                  onClick={() => setEditing(g.seed ? { ...g, id: `blitz-${Date.now()}`, seed: false, name: `${g.name} (עותק)` } : g)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground border border-border hover:bg-muted/40 px-3 py-1.5 rounded-full"
                >
                  {g.seed ? <><Copy className="h-3 w-3" /> שכפול לעריכה</> : <><Edit3 className="h-3 w-3" /> ערוך</>}
                </button>
                {!g.seed && (
                  <button
                    onClick={() => { if (confirm(`למחוק את "${g.name}"?`)) { deleteBlitzGame(g.id); refresh(); } }}
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-full"
                  >
                    <Trash2 className="h-3 w-3" /> מחק
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-violet-50/70 rounded-2xl p-4 ring-1 ring-violet-100">
          <p className="text-[12.5px] text-violet-900 inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" />
            טיפ: 5 שאלות · 5 דקות · קרב אחד. תלמידים יכולים לשחק בכל זמן — הזמן נמדד פר-תלמיד.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ─── Editor ──────────────────────────────────────────── */
const BlitzEditor = ({ game, onSave, onCancel }: { game: BlitzGame; onSave: (g: BlitzGame) => void; onCancel: () => void }) => {
  const [g, setG] = useState<BlitzGame>(game);

  const update = (patch: Partial<BlitzGame>) => setG((prev) => ({ ...prev, ...patch }));
  const updateQ = (i: number, patch: Partial<BlitzQuestion>) =>
    setG((prev) => ({ ...prev, questions: prev.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) }));
  const removeQ = (i: number) => setG((prev) => ({ ...prev, questions: prev.questions.filter((_, j) => j !== i) }));
  const addQ = () => setG((prev) => ({ ...prev, questions: [...prev.questions, blankQuestion()] }));

  const generateFive = () => {
    // simple "AI mock": 5 generic questions in chosen topic
    const sample: BlitzQuestion[] = Array.from({ length: 5 }).map((_, i) => ({
      ...blankQuestion(),
      text: `שאלה ${i + 1} בנושא ${g.topic || "כללי"}`,
      options: ["אפשרות א", "אפשרות ב", "אפשרות ג", "אפשרות ד"],
      correctIndex: 0,
      bossDouble: i === 4,
    }));
    setG((prev) => ({ ...prev, questions: sample }));
  };

  const validateAndSave = () => {
    if (!g.name.trim()) return toast({ title: "חסר שם", description: "תנו שם לקרב.", variant: "destructive" });
    if (g.questions.length === 0) return toast({ title: "אין שאלות", description: "הוסיפו לפחות שאלה אחת.", variant: "destructive" });
    onSave(g);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/40 via-white to-white p-5 md:p-8" dir="rtl">
      <div className="max-w-[860px] mx-auto">
        <button onClick={onCancel} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-3.5 w-3.5" /> חזרה לרשימה
        </button>

        <h1 className="text-[24px] font-bold text-foreground mb-1">עריכת מקצה הבזק</h1>
        <p className="text-[13px] text-muted-foreground mb-5">הגדירו פרטים, הוסיפו שאלות ושמרו.</p>

        {/* meta */}
        <div className="bg-white rounded-3xl ring-1 ring-border p-5 shadow-[var(--shadow-card)] mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="שם הקרב">
              <input value={g.name} onChange={(e) => update({ name: e.target.value })} className={inputCls} placeholder="לדוגמה: ציידי השירה" />
            </Field>
            <Field label="מקצוע">
              <input value={g.subject} onChange={(e) => update({ subject: e.target.value })} className={inputCls} placeholder="ספרות / מתמטיקה ..." />
            </Field>
            <Field label="נושא">
              <input value={g.topic} onChange={(e) => update({ topic: e.target.value })} className={inputCls} placeholder="שירה, גאומטריה ..." />
            </Field>
            <Field label="שכבת גיל">
              <input value={g.grade || ""} onChange={(e) => update({ grade: e.target.value })} className={inputCls} placeholder="י׳ / י״א" />
            </Field>
            <Field label="זמן למשחק (דקות)">
              <input type="number" min={1} value={Math.round(g.totalSeconds / 60)}
                onChange={(e) => update({ totalSeconds: Math.max(1, Number(e.target.value)) * 60 })} className={inputCls} />
            </Field>
            <Field label="זמן לשאלה (שניות)">
              <input type="number" min={5} value={g.perQuestionSeconds || 30}
                onChange={(e) => update({ perQuestionSeconds: Math.max(5, Number(e.target.value)) })} className={inputCls} />
            </Field>
            <Field label="תאריך פתיחה">
              <input type="date" value={g.startsAt?.slice(0, 10) || ""} onChange={(e) => update({ startsAt: e.target.value })} className={inputCls} />
            </Field>
            <Field label="תאריך סיום">
              <input type="date" value={g.endsAt?.slice(0, 10) || ""} onChange={(e) => update({ endsAt: e.target.value })} className={inputCls} />
            </Field>
            <Field label="סוג תחרות">
              <select value={g.competition} onChange={(e) => update({ competition: e.target.value as any })} className={inputCls}>
                <option value="personal">אישי</option>
                <option value="class">כיתתי</option>
                <option value="sport">לפי ענף</option>
                <option value="group">לפי קבוצה</option>
              </select>
            </Field>
            <Field label="פרס XP">
              <input type="number" min={0} value={g.prizeXp || 0} onChange={(e) => update({ prizeXp: Number(e.target.value) })} className={inputCls} />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={addQ}
              className="inline-flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-[12.5px] font-semibold px-3.5 py-2 rounded-xl">
              <Plus className="h-3.5 w-3.5" /> הוסף שאלה
            </button>
            <button onClick={generateFive}
              className="inline-flex items-center gap-1.5 bg-gradient-to-l from-violet-500 to-fuchsia-500 text-white text-[12.5px] font-semibold px-3.5 py-2 rounded-xl">
              <Sparkles className="h-3.5 w-3.5" /> צור לי 5 שאלות אוטומטית
            </button>
          </div>
        </div>

        {/* questions */}
        <div className="space-y-4">
          {g.questions.map((q, i) => (
            <div key={q.id} className="bg-white rounded-3xl ring-1 ring-border p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-bold text-violet-700">שאלה {i + 1}</span>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                    <input type="checkbox" checked={!!q.bossDouble} onChange={(e) => updateQ(i, { bossDouble: e.target.checked })} />
                    בוס הגמר (×2)
                  </label>
                  <select value={q.type} onChange={(e) => {
                    const type = e.target.value as BlitzQuestion["type"];
                    updateQ(i, {
                      type,
                      options: type === "truefalse" ? ["אמת", "בלוף"] : (q.options.length === 4 ? q.options : ["", "", "", ""]),
                      correctIndex: 0,
                    });
                  }} className={`${inputCls} !py-1 !text-[11.5px] w-auto`}>
                    <option value="multi">רב־ברירה</option>
                    <option value="truefalse">אמת / בלוף</option>
                  </select>
                  <button onClick={() => removeQ(i)} className="text-rose-600 hover:bg-rose-50 p-1 rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <Field label="טקסט השאלה">
                <textarea rows={2} value={q.text} onChange={(e) => updateQ(i, { text: e.target.value })} className={inputCls} placeholder="כתבו את השאלה..." />
              </Field>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                {q.options.map((opt, j) => (
                  <label key={j} className={`flex items-center gap-2 border rounded-xl p-2.5 ${q.correctIndex === j ? "border-emerald-300 bg-emerald-50" : "border-border"}`}>
                    <input type="radio" name={`correct-${q.id}`} checked={q.correctIndex === j} onChange={() => updateQ(i, { correctIndex: j })} />
                    <input value={opt} onChange={(e) => {
                      const opts = q.options.slice(); opts[j] = e.target.value; updateQ(i, { options: opts });
                    }} className="flex-1 bg-transparent text-[13px] outline-none" placeholder={`תשובה ${j + 1}`} disabled={q.type === "truefalse"} />
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                <Field label="פידבק לתשובה נכונה">
                  <input value={q.feedbackRight || ""} onChange={(e) => updateQ(i, { feedbackRight: e.target.value })} className={inputCls} placeholder="בול!" />
                </Field>
                <Field label="פידבק לתשובה שגויה">
                  <input value={q.feedbackWrong || ""} onChange={(e) => updateQ(i, { feedbackWrong: e.target.value })} className={inputCls} placeholder="כמעט..." />
                </Field>
              </div>
            </div>
          ))}
          {g.questions.length === 0 && (
            <div className="text-center text-[13px] text-muted-foreground py-8 bg-white rounded-3xl ring-1 ring-dashed ring-border">
              אין עדיין שאלות. הוסיפו ידנית או השתמשו ב״צור לי 5 שאלות אוטומטית״.
            </div>
          )}
        </div>

        <div className="sticky bottom-4 mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="bg-white border border-border text-[13px] font-semibold px-4 py-2.5 rounded-xl">ביטול</button>
          <button onClick={validateAndSave}
            className="inline-flex items-center gap-1.5 bg-gradient-to-l from-violet-500 to-fuchsia-500 text-white text-[13px] font-bold px-5 py-2.5 rounded-xl shadow-[0_10px_24px_-10px_rgba(140,80,220,0.6)]">
            <Save className="h-4 w-4" /> שמור קרב
          </button>
        </div>
      </div>
    </div>
  );
};

const inputCls = "w-full bg-white border border-border rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-violet-200";
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-[11px] font-semibold text-muted-foreground mb-1">{label}</span>
    {children}
  </label>
);

export default BlitzBuilderPage;
