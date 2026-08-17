import { useParams, useNavigate, Navigate } from "react-router-dom";
import { ArrowRight, Loader2, BookOpen, Play, ClipboardList, Pencil, Home, MessageCircleQuestion, Trophy, Zap, GraduationCap, CheckCircle2, Lock, Flame, Gift, BarChart3, Star, Map as MapIcon, Calculator, Sparkles, Award, ChevronLeft, Crown, Shield, Target } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudentProgress } from "@/hooks/useStudents";
import { useMemo, useEffect, useState, useRef } from "react";
import { saveLastVisited } from "@/pages/RoleHomePage";
import DataExportTools from "@/components/DataExportTools";
import TeacherAIAssistant from "@/components/TeacherAIAssistant";
import { courseContent } from "@/lib/courseContent";
import ScenicRoadmap from "@/components/ScenicRoadmap";
import { subjectAppUrl, openSubjectAppSameWindow } from "@/lib/openSubjectApp";

const SubjectDetailPage = () => {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: progress = [], isLoading } = useStudentProgress(studentId);
  const decoded = decodeURIComponent(subjectName || "");

  // Phase A: external subject-app links from the registry. Validated + fail-closed:
  // a null url hides the banner rather than rendering a broken link.
  const literature70Url = subjectAppUrl("literature-70");
  const civics70Url = subjectAppUrl("civics-70");

  useEffect(() => {
    if (decoded) saveLastVisited(`/subjects/${encodeURIComponent(decoded)}`, decoded);
  }, [decoded]);

  // אזרחות: a canonical app exists (israel-civics-coach) — the internal units
  // view is frozen. Any arrival here (direct URL, old link) is forwarded
  // safely to the canonical app, same-window, via the validated registry —
  // the same pattern approved for literature.
  useEffect(() => {
    if (decoded === "אזרחות") openSubjectAppSameWindow("civics-70");
    if (decoded === "אנגלית") openSubjectAppSameWindow("english-11");
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
    const isCivics = decoded === "אזרחות";
    parts.forEach(part => {
      part.units.forEach(unit => {
        const unitTopics = unit.items.map(it => it.title);
        const allDone = unitTopics.length > 0 && unitTopics.every(t => coveredTopics.includes(t));
        let status: "done" | "current" | "locked" = "locked";
        if (allDone) status = "done";
        else if (!foundCurrent) { status = "current"; foundCurrent = true; }
        else if (isCivics) status = "current"; // אזרחות: כל היחידות פתוחות לתצוגה
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
  }, [parts, coveredTopics, decoded]);


  // Active unit shown below roadmap (default: current node, fallback to first)
  const [activeUnitIdx, setActiveUnitIdx] = useState(0);
  const unitDetailRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const currentIdx = nodes.findIndex(n => n.status === "current");
    if (currentIdx >= 0) setActiveUnitIdx(currentIdx);
  }, [nodes.length]);
  const activeNode = nodes[activeUnitIdx];
  const activePart = activeNode ? parts.find(p => p.id === activeNode.partId) : undefined;
  const activeUnit = activePart?.units.find(u => u.id === activeNode?.unitId);

  const handleNodeSelect = (i: number) => {
    const n = nodes[i];
    if (!n) return;
    navigate(`/subjects/${encodeURIComponent(decoded)}/${n.partId}#${n.unitId}`);
  };

  // ספרות has REAL canonical apps (לרוץ עם מילים 30% + ספרות לבגרות 70%).
  // The internal "יחידות לימוד" view duplicated them, so every entry point
  // (subjects grid, student home, direct URL) redirects to the clean
  // literature gate, which sends students to the canonical apps.
  // Placed AFTER all hooks so the hook order stays stable when this same
  // mounted component re-renders with a different :subjectName param.
  if (decoded === "ספרות") {
    return <Navigate to={`/subjects/${encodeURIComponent("ספרות")}/literature`} replace />;
  }

  // אזרחות: the effect above already navigates same-window; render an honest
  // interstitial with a manual fallback instead of the frozen internal view.
  if (decoded === "אזרחות") {
    return (
      <div className="p-10 text-center" dir="rtl">
        <p className="text-[14px] font-medium text-foreground">מעבירים אתכם לאפליקציית האזרחות</p>
        <p className="text-[12px] text-muted-foreground mt-1.5">האפליקציה נפתחת באותו חלון; חזרה עם כפתור החזרה בדפדפן.</p>
        <button
          onClick={() => openSubjectAppSameWindow("civics-70")}
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-primary hover:bg-primary/90 px-5 py-2.5 rounded-full transition-colors"
        >
          מעבר לאפליקציה
        </button>
      </div>
    );
  }

  // אנגלית: פיילוט. ה-effect שלמעלה כבר מנווט באותו חלון; מוצג interstitial
  // כן, ולא התוכן הפנימי הגנרי שהוקפא.
  if (decoded === "אנגלית") {
    return (
      <div className="p-10 text-center" dir="rtl">
        <p className="text-[14px] font-medium text-foreground">מעבירים אתכם לאפליקציית האנגלית</p>
        <p className="text-[12px] text-muted-foreground mt-1.5">האפליקציה נפתחת באותו חלון; חזרה עם כפתור החזרה בדפדפן.</p>
        <p className="text-[12px] text-muted-foreground mt-1">פיילוט: הדגמה חזותית של מפת הדרכים. אין בה עדיין שמירה, הגשה או בדיקת מורה.</p>
        <button
          onClick={() => openSubjectAppSameWindow("english-11")}
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-primary hover:bg-primary/90 px-5 py-2.5 rounded-full transition-colors"
        >
          מעבר לאפליקציה
        </button>
      </div>
    );
  }

  const doneCount = nodes.filter(n => n.status === "done").length;
  const totalCount = nodes.length || 1;
  /* No XP / levels / streaks: those were fabricated client-side numbers with
     no approved product contract behind them (removed per product glossary).
     The stats below are all derived from real progress data. */
  const currentNode = nodes.find(n => n.status === "current") || null;
  const currentIdx = currentNode ? nodes.indexOf(currentNode) : -1;
  const nextNode = currentIdx >= 0 ? nodes[currentIdx + 1] || null : null;

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (!subjectData) {
    return (
      <div className="p-10 text-center" dir="rtl">
        <p className="text-[13px] text-muted-foreground">הקורס יתווסף בקרוב</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-[11px] text-primary">חזרה</button>
      </div>
    );
  }

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
          <div className="text-center">
            <p className="text-[26px] font-bold text-foreground tabular-nums leading-none">{doneCount}/{totalCount}</p>
            <p className="text-[10.5px] text-muted-foreground mt-1.5">נושאים הושלמו</p>
          </div>
          <div className="text-center md:col-span-2">
            <p className="text-[14px] font-bold text-foreground leading-snug">
              {currentNode ? currentNode.title : "כל היחידות הושלמו"}
            </p>
            <p className="text-[10.5px] text-muted-foreground mt-1.5">היחידה הנוכחית</p>
          </div>
          {/* Next station — shown only with its real unlock condition */}
          <div className="bg-muted/40 rounded-2xl p-3 text-center border border-border">
            <p className="text-[9.5px] text-muted-foreground">התחנה הבאה</p>
            <p className="text-[13px] font-bold text-foreground leading-snug mt-1">
              {nextNode ? nextNode.title : "אין תחנה נוספת"}
            </p>
            {nextNode && (
              <p className="text-[9px] text-muted-foreground mt-1.5 leading-relaxed">
                השלימו את היחידה הנוכחית כדי לפתוח את התחנה הבאה
              </p>
            )}
          </div>
        </div>
      </div>

      {/* מפת קורס ספרות — ספרות 70% כאפליקציה חיצונית (Phase A, registry) */}
      {decoded === "ספרות" && literature70Url && (
        <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-200 shadow-[var(--shadow-card)] p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[32px]">📚</span>
              <div>
                <h3 className="text-[16px] font-bold text-foreground">מפת קורס ספרות לבגרות</h3>
                <p className="text-[12px] text-muted-foreground mt-1">30 יחידות עם 10 יצירות חובה ואפליקציות אינטראקטיביות</p>
                <span className="inline-block mt-2 text-[11px] bg-amber-200 text-amber-900 px-3 py-1 rounded-full font-semibold">70% — חלק שני · נפתח בטאב חדש</span>
              </div>
            </div>
            <a
              href={literature70Url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-2xl font-semibold text-[13px] hover:bg-primary/90 transition-colors shrink-0"
            >
              <span>פתח מפת קורס</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      )}

      {/* אזרחות 70% כאפליקציה חיצונית (Phase A, registry) */}
      {decoded === "אזרחות" && civics70Url && (
        <div className="mb-6 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-3xl border border-teal-200 shadow-[var(--shadow-card)] p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[32px]">⚖️</span>
              <div>
                <h3 className="text-[16px] font-bold text-foreground">מסלול אזרחות לבגרות</h3>
                <p className="text-[12px] text-muted-foreground mt-1">מרחב למידה ותרגול לבגרות באזרחות</p>
                <span className="inline-block mt-2 text-[11px] bg-teal-200 text-teal-900 px-3 py-1 rounded-full font-semibold">70% — בגרות חיצונית · נפתח בטאב חדש</span>
              </div>
            </div>
            <a
              href={civics70Url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-2xl font-semibold text-[13px] hover:bg-primary/90 transition-colors shrink-0"
            >
              <span>פתח את האפליקציה</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      )}

      {/* Scenic roadmap (full width) */}
      <div className="mb-6">
        <ScenicRoadmap
          nodes={nodes.map(n => ({
            id: n.id,
            title: n.title,
            subtitle: n.subtitle,
            status: n.status,
          }))}
          onSelect={handleNodeSelect}
          onContinue={() => {
            const next = nodes.find(n => n.status === "current") || nodes[0];
            if (next) navigate(`/subjects/${encodeURIComponent(decoded)}/${next.partId}#${next.unitId}`);
          }}
        />
      </div>

      {/* Active unit detail (appears on node click) */}
      {activeNode && activeUnit && activePart && (
        <div ref={unitDetailRef} className="mb-6 bg-card rounded-3xl border border-border p-5 md:p-6 shadow-[var(--shadow-card)] scroll-mt-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 text-end">
              <div>
                <p className="text-[10.5px] font-semibold text-violet-700">{activePart.title}</p>
                <h2 className="text-[17px] font-bold text-foreground tracking-tight mt-0.5">{activeUnit.title}</h2>
                <p className="text-[11px] text-muted-foreground mt-1">{activeUnit.items.length} תתי-יחידות</p>
              </div>
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-violet-500 text-white text-[14px] font-bold shrink-0 shadow-sm">
                {activeNode.index}
              </span>
            </div>
            <button
              onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}/${activePart.id}#${activeUnit.id}`)}
              className="inline-flex items-center gap-1.5 bg-violet-500 hover:bg-violet-600 text-white text-[11.5px] font-semibold px-3.5 py-2 rounded-full transition-colors"
            >
              כניסה ליחידה
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>

          {activeUnit.items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {activeUnit.items.map((it, i) => {
                const done = coveredTopics.includes(it.title);
                return (
                  <button
                    key={i}
                    onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}/${activePart.id}#${activeUnit.id}`)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-background hover:bg-accent transition-colors text-end"
                  >
                    <span className={[
                      "shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                      done ? "bg-emerald-400 text-white" : "bg-muted text-muted-foreground",
                    ].join(" ")}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} /> : i + 1}
                    </span>
                    <span className="flex-1 text-[12px] font-medium text-foreground leading-snug">{it.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* רשימת כל היחידות — תצוגה רציפה */}
      {decoded === "אזרחות" && nodes.length > 0 && (
        <div className="mb-6 bg-card rounded-3xl border border-border p-5 md:p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10.5px] text-muted-foreground">{nodes.length} יחידות · לחיצה פותחת את היחידה</p>
            <h2 className="text-[15px] font-bold text-foreground tracking-tight">כל יחידות הלימוד</h2>
          </div>
          <ol className="flex flex-col gap-2">
            {nodes.map((n, i) => {
              const isDone = n.status === "done";
              const isCurrent = n.status === "current" && !isDone;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}/${n.partId}#${n.unitId}`)}
                    className={[
                      "w-full flex items-center gap-3 p-3.5 rounded-2xl border text-end transition-all",
                      isDone ? "bg-emerald-50/60 border-emerald-100 hover:bg-emerald-50" :
                      isCurrent ? "bg-violet-50/60 border-violet-200 hover:bg-violet-50" :
                      "bg-background border-border hover:bg-accent",
                    ].join(" ")}
                  >
                    <span className={[
                      "shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold",
                      isDone ? "bg-emerald-400 text-white" :
                      isCurrent ? "bg-violet-500 text-white" :
                      "bg-muted text-muted-foreground",
                    ].join(" ")}>
                      {isDone ? <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} /> : String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0 text-end">
                      <p className="text-[12.5px] font-semibold text-foreground leading-tight truncate">{n.title}</p>
                      {n.subtitle && <p className="text-[10.5px] text-muted-foreground mt-0.5 truncate">{n.subtitle}</p>}
                    </div>
                    <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.6} />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* (ארון המדליות הוסר: הציג ערכים קבועים שאינם נתונים אמיתיים.) */}

      {/* Bagrut grading shortcut — staff tool, honest AI framing:
          the AI only proposes; the teacher decides what reaches a student. */}
      {isTeacher && (
        <button onClick={() => navigate(`/bagrut-grading?subject=${encodeURIComponent(decoded)}`)}
          className="w-full bg-gradient-to-l from-primary/8 to-primary/[0.03] rounded-2xl border border-primary/12 p-4 text-start hover:from-primary/12 transition-all mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/12 flex items-center justify-center shrink-0">
              <Award className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-foreground">בדיקת תשובות בסגנון בגרות</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">כלי עזר למורה · ההצעה של המערכת אינה ציון; המורה מחליט מה מגיע לתלמיד</p>
            </div>
          </div>
        </button>
      )}

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
