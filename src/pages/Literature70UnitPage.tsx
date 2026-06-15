/**
 * Literature70UnitPage — עמוד יחידת בגרות 70%, מציג את התוכן המלא של היחידה:
 * תיאור, מטרות, מושגים, משימות, רובריקה, כתיבת בגרות.
 */
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, Target, Sparkles, CheckCircle2, Circle, ChevronDown } from "lucide-react";

import units from "@/lib/literature70Units.json";
import Literature70Shell from "@/components/Literature70Shell";


type Task = {
  id: string;
  title: string;
  instructions?: string;
  hint?: string;
  submission?: string;
};
type Concept = { term: string; meaning: string };
type Unit = {
  id: string;
  number: number;
  title: string;
  author: string;
  type: string;
  description: string;
  estimatedTime?: string;
  difficulty?: string;
  themes?: string[];
  goals?: string[];
  concepts?: Concept[];
  reading?: string;
  tasks?: Task[];
  bagrut?: { prompt?: string; tips?: string[]; structure?: string[] } | any;
  rubric?: any;
  reflectionPrompt?: string;
};

const Literature70UnitPage = () => {
  const { subjectName, unitId } = useParams<{ subjectName: string; unitId: string }>();
  const navigate = useNavigate();
  const decoded = decodeURIComponent(subjectName || "ספרות");
  const decodedUnit = decodeURIComponent(unitId || "");

  const unit = (units as Unit[]).find((u) => u.id === decodedUnit);

  const storageKey = `lit70-tasks-${decodedUnit}`;
  const [doneTasks, setDoneTasks] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); } catch { return {}; }
  });
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const toggleTask = (id: string) => {
    const next = { ...doneTasks, [id]: !doneTasks[id] };
    setDoneTasks(next);
    localStorage.setItem(storageKey, JSON.stringify(next));

    // Mark unit complete in master map when all tasks done
    if (unit?.tasks && Object.values(next).filter(Boolean).length >= unit.tasks.length) {
      try {
        const overall = JSON.parse(localStorage.getItem("lit70-done") || "{}");
        overall[decodedUnit] = true;
        localStorage.setItem("lit70-done", JSON.stringify(overall));
      } catch {}
    }
  };

  const completedCount = useMemo(
    () => (unit?.tasks ? unit.tasks.filter((t) => doneTasks[t.id]).length : 0),
    [unit, doneTasks],
  );
  const totalTasks = unit?.tasks?.length || 0;
  const pct = totalTasks ? Math.round((completedCount / totalTasks) * 100) : 0;

  if (!unit) {
    return (
      <div className="p-10 text-center text-muted-foreground" dir="rtl">
        היחידה לא נמצאה.
      </div>
    );
  }

  return (
    <Literature70Shell active="unit" currentUnitId={unit.id}>
    <div className="p-5 md:p-8 lg:p-10 max-w-[980px] mx-auto" dir="rtl">


      {/* Title card */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[hsl(35,30%,94%)] flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-[hsl(35,40%,45%)]" strokeWidth={1.6} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium">
              יחידה {unit.number} · {unit.type}
              {unit.estimatedTime ? ` · ${unit.estimatedTime}` : ""}
              {unit.difficulty ? ` · ${unit.difficulty}` : ""}
            </p>
            <h1 className="text-[22px] font-semibold text-foreground tracking-tight leading-tight font-heading mt-1">
              {unit.title}
            </h1>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">{unit.author}</p>
            <p className="text-[13px] text-foreground/85 mt-3 leading-relaxed">{unit.description}</p>

            {unit.themes && unit.themes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {unit.themes.map((t) => (
                  <span key={t} className="text-[11px] bg-muted text-muted-foreground rounded-full px-2.5 py-1">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Progress ring */}
          <div className="shrink-0 text-end">
            <p className="text-[10px] text-muted-foreground">השלמה</p>
            <p className="text-[22px] font-semibold text-foreground">{pct}%</p>
            <p className="text-[10px] text-muted-foreground">
              {completedCount}/{totalTasks} משימות
            </p>
          </div>
        </div>
      </div>

      {/* Goals */}
      {unit.goals && unit.goals.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-5 mb-4">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground mb-3">
            <Target className="h-4 w-4 text-emerald-600" strokeWidth={1.8} />
            מטרות הלמידה
          </h2>
          <ul className="space-y-2">
            {unit.goals.map((g, i) => (
              <li key={i} className="text-[12.5px] text-foreground/85 leading-relaxed flex gap-2">
                <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Concepts */}
      {unit.concepts && unit.concepts.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-5 mb-4">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-foreground mb-3">
            <Sparkles className="h-4 w-4 text-violet-600" strokeWidth={1.8} />
            מושגי יסוד
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {unit.concepts.map((c) => (
              <div key={c.term} className="rounded-xl bg-muted/40 border border-border/60 p-3">
                <p className="text-[12.5px] font-semibold text-foreground">{c.term}</p>
                <p className="text-[11.5px] text-muted-foreground leading-relaxed mt-0.5">{c.meaning}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reading guidance */}
      {unit.reading && (
        <section className="bg-amber-50/70 border border-amber-100 rounded-2xl p-4 mb-4">
          <p className="text-[12.5px] text-amber-900/90 leading-relaxed">
            <span className="font-semibold">לפני שמתחילים — </span>
            {unit.reading}
          </p>
        </section>
      )}

      {/* Tasks */}
      {unit.tasks && unit.tasks.length > 0 && (
        <section className="bg-card border border-border rounded-2xl p-5 mb-4">
          <h2 className="text-[14px] font-semibold text-foreground mb-3">משימות היחידה</h2>
          <div className="space-y-2">
            {unit.tasks.map((t, i) => {
              const done = Boolean(doneTasks[t.id]);
              const open = openTaskId === t.id;
              return (
                <div
                  key={t.id}
                  className={`rounded-xl border transition-colors ${
                    done ? "bg-emerald-50/60 border-emerald-200" : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <button
                      onClick={() => toggleTask(t.id)}
                      className="shrink-0"
                      aria-label={done ? "סמן כלא הושלם" : "סמן כהושלם"}
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/60" />
                      )}
                    </button>
                    <button
                      onClick={() => setOpenTaskId(open ? null : t.id)}
                      className="flex-1 text-start min-w-0"
                    >
                      <p className="text-[12.5px] font-medium text-foreground">
                        <span className="text-muted-foreground me-1">משימה {i + 1} —</span>
                        {t.title}
                      </p>
                    </button>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </div>
                  {open && (t.instructions || t.hint || t.submission) && (
                    <div className="px-4 pb-4 pt-1 space-y-2 border-t border-border/60">
                      {t.instructions && (
                        <p className="text-[12.5px] text-foreground/85 leading-relaxed">{t.instructions}</p>
                      )}
                      {t.hint && (
                        <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                          <span className="font-semibold">רמז: </span>
                          {t.hint}
                        </p>
                      )}
                      {t.submission && (
                        <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                          <span className="font-semibold">הגשה: </span>
                          {t.submission}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Reflection */}
      {unit.reflectionPrompt && (
        <section className="bg-card border border-border rounded-2xl p-5 mb-10">
          <h2 className="text-[14px] font-semibold text-foreground mb-2">רפלקציה</h2>
          <p className="text-[12.5px] text-foreground/85 leading-relaxed">{unit.reflectionPrompt}</p>
        </section>
      )}
    </div>
    </Literature70Shell>
  );

};

export default Literature70UnitPage;
