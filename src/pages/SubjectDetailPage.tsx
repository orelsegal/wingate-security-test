import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, BookOpen, Play, ClipboardList, Pencil, Home, MessageCircleQuestion, Trophy, Zap, GraduationCap, CheckCircle2, Lock, Flame, Gift, BarChart3, Star, Map as MapIcon, Calculator, Sparkles, Award, ChevronLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudentProgress } from "@/hooks/useStudents";
import { useMemo, useEffect, useState, useRef } from "react";
import { saveLastVisited } from "@/pages/RoleHomePage";
import DataExportTools from "@/components/DataExportTools";
import TeacherAIAssistant from "@/components/TeacherAIAssistant";
import { courseContent } from "@/lib/courseContent";
import ScenicRoadmap from "@/components/ScenicRoadmap";

const SubjectDetailPage = () => {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: progress = [], isLoading } = useStudentProgress(studentId);
  const decoded = decodeURIComponent(subjectName || "");

  useEffect(() => {
    if (decoded) saveLastVisited(`/subjects/${encodeURIComponent(decoded)}`, decoded);
  }, [decoded]);

  const subjectProgress = useMemo(
    () => progress.find((p: any) => p.subjects?.subject_name === decoded),
    [progress, decoded]
  );

  const subjectData = courseContent[decoded];
  const parts = subjectData?.parts || [];
  const pct = subjectProgress?.completion_percent ?? 0;
  const grade = subjectProgress?.grade;
  const coveredTopics: string[] = subjectProgress?.covered_topics || [];

  // Build roadmap nodes from individual UNITS (not parts) — each unit is a step,
  // gated so the next opens only after the previous one is fully completed.
  const nodes = useMemo(() => {
    const out: { id: string; index: number; title: string; subtitle?: string; partId: string; unitId: string; status: "done" | "current" | "locked" }[] = [];
    let i = 1;
    let foundCurrent = false;
    parts.forEach(part => {
      part.units.forEach(unit => {
        const unitTopics = unit.items.map(it => it.title);
        const allDone = unitTopics.length > 0 && unitTopics.every(t => coveredTopics.includes(t));
        let status: "done" | "current" | "locked" = "locked";
        if (allDone) status = "done";
        else if (!foundCurrent) { status = "current"; foundCurrent = true; }
        out.push({
          id: `${part.id}-${unit.id}`,
          index: i++,
          title: unit.title,
          subtitle: part.title,
          partId: part.id,
          unitId: unit.id,
          status,
        });
      });
    });
    return out;
  }, [parts, coveredTopics]);

  const doneCount = nodes.filter(n => n.status === "done").length;
  const totalCount = nodes.length || 1;
  const xp = Math.round(pct * 11.4);
  const level = Math.max(1, Math.floor(pct / 12) + 1);
  const nextLevel = level + 1;
  const xpToNext = Math.max(0, nextLevel * 200 - xp);
  const streak = 7;

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!subjectData) {
    return (
      <div className="p-10 text-center" dir="rtl">
        <p className="text-[13px] text-muted-foreground">הקורס יתווסף בקרוב</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-[11px] text-primary">חזרה</button>
      </div>
    );
  }

  const componentRows = [
    { icon: Play,                  title: "שיעור וידאו",   sub: "הסבר מלא על הנושא",       done: doneCount > 0 },
    { icon: ClipboardList,         title: "כרטיסי סיכום",  sub: "עיקרי הדברים בקצרה",       done: doneCount > 0 },
    { icon: Pencil,                title: "תרגול מודרך",   sub: "דוגמאות ופתרונות שלב אחר שלב", done: doneCount > 0 },
    { icon: Home,                  title: "תרגול בית",      sub: "משימות לתרגול עצמאי",       done: doneCount > 1 },
    { icon: MessageCircleQuestion, title: "שאלות פתוחות",   sub: "תרגול חשיבה ויישום",        done: false },
    { icon: Trophy,                title: "חידון",          sub: "בדיקת הבנה",                done: false },
    { icon: Zap,                   title: "שאלות אתגר",     sub: "יישום מתקדם",               done: false, locked: true },
    { icon: GraduationCap,         title: "מבחן סיום",      sub: "סיכום והערכה",              done: false, locked: true },
  ];

  return (
    <div className="p-5 md:p-8 lg:p-10 max-w-[1280px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate("/subjects")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-[11px] text-muted-foreground hover:bg-accent transition-colors">
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          חזרה למסלול
        </button>
        <div className="text-end">
          <h1 className="text-[22px] font-bold text-foreground tracking-tight flex items-center gap-3 justify-end">
            <span>{decoded} — יחידות לימוד</span>
            <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-violet-600" strokeWidth={2} />
            </div>
          </h1>
          <p className="text-[12px] text-muted-foreground mt-1">{subjectData.subtitle}</p>
        </div>
      </div>

      {/* Top stats strip */}
      <div className="bg-card rounded-3xl border border-border p-5 shadow-[var(--shadow-card)] mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-center">
          {/* Donut */}
          <div className="flex items-center gap-3 justify-center">
            <div className="relative w-[88px] h-[88px]">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(270 70% 60%)" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - pct / 100)}
                  className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[18px] font-bold text-foreground tabular-nums leading-none">{pct}%</p>
                <p className="text-[8.5px] text-muted-foreground mt-1">השלמה</p>
              </div>
            </div>
          </div>
          {[
            { label: "נקודות ניסיון", value: xp, suffix: "XP", color: "text-violet-600" },
            { label: "היכן אתה נמצא", value: level, prefix: "רמה ", color: "text-amber-600" },
            { label: "נושאים הושלמו", value: `${doneCount}/${totalCount}`, color: "text-emerald-600" },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-[26px] font-bold text-foreground tabular-nums leading-none">
                {s.prefix}{s.value} {s.suffix && <span className={`text-[11px] font-semibold ${s.color} mr-1`}>{s.suffix}</span>}
              </p>
              <p className="text-[10.5px] text-muted-foreground mt-1.5">{s.label}</p>
            </div>
          ))}
          {/* Next goal */}
          <div className="bg-gradient-to-l from-amber-50 to-rose-50 rounded-2xl p-3 text-center border border-amber-100">
            <p className="text-[9.5px] text-muted-foreground">היעד הבא</p>
            <p className="text-[20px] font-bold text-foreground leading-none mt-1 tabular-nums">{nextLevel}</p>
            <div className="mt-2 h-1.5 bg-white/80 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 transition-all duration-700" style={{ width: `${Math.min(100, (xp % 200) / 2)}%` }} />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1.5">נשארו {xpToNext} XP</p>
          </div>
        </div>
      </div>

      {/* Scenic roadmap + Units list */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 mb-6">
        <ScenicRoadmap
          nodes={nodes.map(n => ({
            id: n.id,
            title: n.title,
            subtitle: n.subtitle,
            status: n.status,
          }))}
          onSelect={(i) => {
            const n = nodes[i];
            if (n) navigate(`/subjects/${encodeURIComponent(decoded)}/${n.partId}#${n.unitId}`);
          }}
          onContinue={() => {
            const next = nodes.find(n => n.status === "current") || nodes[0];
            if (next) navigate(`/subjects/${encodeURIComponent(decoded)}/${next.partId}#${next.unitId}`);
          }}
        />

        {/* Units list */}
        <div className="bg-card rounded-3xl border border-border p-4 shadow-[var(--shadow-card)] lg:max-h-[calc(100vh-220px)] lg:overflow-auto">
          <h2 className="text-[13px] font-bold text-foreground mb-3 px-2 flex items-center gap-2 justify-end">
            רשימת יחידות הלימוד
            <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
          </h2>
          <div className="space-y-4">
            {parts.map((part) => (
              <div key={part.id}>
                <p className="text-[10.5px] font-bold text-violet-700 mb-2 px-2 text-end">{part.title}</p>
                <div className="space-y-1.5">
                  {part.units.map((unit) => {
                    const unitTopics = unit.items.map(it => it.title);
                    const allDone = unitTopics.length > 0 && unitTopics.every(t => coveredTopics.includes(t));
                    const someDone = unitTopics.some(t => coveredTopics.includes(t));
                    const node = nodes.find(nn => nn.unitId === unit.id && nn.partId === part.id);
                    const isLocked = node?.status === "locked";
                    const isCurrent = node?.status === "current";
                    return (
                      <button
                        key={unit.id}
                        disabled={isLocked}
                        onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}/${part.id}#${unit.id}`)}
                        className={[
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-end",
                          isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-accent cursor-pointer",
                          isCurrent && "bg-violet-50 ring-1 ring-violet-200",
                        ].filter(Boolean).join(" ")}
                      >
                        <span className={[
                          "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold",
                          allDone ? "bg-emerald-400 text-white" :
                          isCurrent ? "bg-violet-500 text-white" :
                          someDone ? "bg-violet-200 text-violet-700" :
                          "bg-muted text-muted-foreground",
                        ].join(" ")}>
                          {isLocked ? <Lock className="h-3.5 w-3.5" strokeWidth={2.2} /> : (node?.index ?? "")}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12.5px] font-semibold text-foreground leading-tight">{unit.title}</p>
                          {unit.items.length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">
                              {unit.items.slice(0, 3).map(it => it.title).join(" · ")}
                              {unit.items.length > 3 && ` · +${unit.items.length - 3}`}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Motivation */}
      <div className="mb-6 bg-gradient-to-br from-amber-50 via-rose-50 to-violet-50 rounded-3xl border border-amber-100 p-5">
        <h2 className="text-[13px] font-bold text-foreground mb-4 flex items-center gap-2 justify-end">
          מוטיבציה והישגים
          <Flame className="h-3.5 w-3.5 text-rose-500" strokeWidth={2} />
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: BarChart3, label: "התקדמות כללית ביחידה", value: `${pct}%`, color: "text-emerald-600" },
            { icon: Gift,      label: `תגמול הבא · ברמה ${nextLevel}`, value: `+120 XP`, color: "text-violet-600" },
            { icon: Flame,     label: "ימים ברצף", value: streak, color: "text-rose-500" },
          ].map((m, i) => (
            <div key={i} className="bg-white/70 rounded-2xl p-2.5 text-center">
              <p className={`text-[16px] font-bold ${m.color} tabular-nums leading-none`}>{m.value}</p>
              <p className="text-[9px] text-muted-foreground mt-1.5 leading-tight">{m.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[10.5px] text-muted-foreground text-center mt-3">👏 כל צעד מקרב אותך להצלחה!</p>
      </div>



      {/* Bagrut grading shortcut */}
      <button onClick={() => navigate(`/bagrut-grading?subject=${encodeURIComponent(decoded)}`)}
        className="w-full bg-gradient-to-l from-primary/8 to-primary/[0.03] rounded-2xl border border-primary/12 p-4 text-start hover:from-primary/12 transition-all mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/12 flex items-center justify-center shrink-0">
            <Award className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-foreground">בוחן בגרות חכם</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">הערכה ברמת בגרות אמיתית עם AI</p>
          </div>
        </div>
      </button>

      {/* Staff tools */}
      {(user?.role === "admin" || user?.role === "teacher" || user?.role === "coach") && (
        <div className="mb-5">
          <DataExportTools
            subjectProgress={[{
              subjectName: decoded,
              grade: grade ?? undefined,
              status: subjectProgress?.status,
              completionPercent: pct,
              missingItems: subjectProgress?.missing_items || [],
              coveredTopics,
            }]}
            label={decoded}
            contextLabel={decoded}
            compact
          />
        </div>
      )}

      {isTeacher && <TeacherAIAssistant defaultSubject={decoded} compact />}

      {/* Bottom tip */}
      <div className="mt-6 bg-violet-50/60 border border-violet-100 rounded-2xl p-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-foreground/80 flex-1 text-end">הקדש כמה דקות בכל יום והוותקדם צעד צעד. התמדה קטנה — תוצאות גדולות!</p>
        <div className="flex items-center gap-2 text-violet-700">
          <span className="text-[11.5px] font-bold">טיפ להצלחה</span>
          <Star className="h-4 w-4 fill-violet-400 text-violet-500" strokeWidth={0} />
        </div>
      </div>
    </div>
  );
};

export default SubjectDetailPage;
