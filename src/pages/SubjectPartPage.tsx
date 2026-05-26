import { useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, Clock, BookOpen, FileText, Plus,
  ClipboardList, Sparkles, Trash2, Pencil, Lock,
  Link as LinkIcon, Upload, Save, GraduationCap, Award
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudentProgress, useStudent } from "@/hooks/useStudents";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { saveLastVisited } from "@/pages/RoleHomePage";
import { useEffect } from "react";
import DataExportTools from "@/components/DataExportTools";
import InteractiveLearningUnit from "@/components/InteractiveLearningUnit";
import TeacherAIAssistant from "@/components/TeacherAIAssistant";
import { courseContent } from "@/lib/courseContent";

interface MaterialItem { id: string; title: string; type: "file" | "link" | "video"; url?: string; }
interface AssignmentItem { id: string; title: string; grade?: number; dueDate?: string; submitted?: boolean; }

const SubjectPartPage = () => {
  const { subjectName, partId } = useParams<{ subjectName: string; partId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const isStaff = isTeacher || user?.role === "coach";
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: progress = [] } = useStudentProgress(studentId);
  const { data: studentRow } = useStudent(studentId);
  const studentSport = (studentRow as any)?.sport ?? null;

  const decoded = decodeURIComponent(subjectName || "");
  const subjectData = courseContent[decoded];
  const part = subjectData?.parts.find(p => p.id === partId);

  const [materials, setMaterials] = useState<MaterialItem[]>(
    part?.materials.map(m => ({ ...m, type: m.type as any })) || []
  );
  const [assignments, setAssignments] = useState<AssignmentItem[]>(part?.assignments || []);
  const [noteText, setNoteText] = useState("");
  const [editingNote, setEditingNote] = useState(false);

  useEffect(() => {
    if (decoded && part) {
      saveLastVisited(`/subjects/${encodeURIComponent(decoded)}/${part.id}`, `${decoded} — ${part.title}`);
    }
  }, [decoded, part]);

  // Scroll to a specific unit when arriving from the roadmap (#unit-id)
  useEffect(() => {
    const id = location.hash?.replace(/^#/, "");
    if (!id || !part) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`unit-${id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [location.hash, part]);


  const subjectProgress = useMemo(
    () => progress.find((p: any) => p.subjects?.subject_name === decoded),
    [progress, decoded]
  );

  const coveredTopics: string[] = subjectProgress?.covered_topics || [];
  const grade = subjectProgress?.grade;
  const pct = subjectProgress?.completion_percent ?? 0;

  if (!part) {
    return (
      <div className="p-5 md:p-10 lg:p-14 max-w-[720px] mx-auto text-center" dir="rtl">
        <p className="text-[13px] text-muted-foreground mt-20">הקורס יתווסף בקרוב</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4 text-[11px]">חזרה</Button>
      </div>
    );
  }

  const allTopics = part.units.flatMap(u => u.items.map(i => i.title));
  const topicsDone = allTopics.filter(t => coveredTopics.includes(t)).length;
  const partPct = allTopics.length > 0 ? Math.round((topicsDone / allTopics.length) * 100) : 0;

  const addMaterial = () => setMaterials(prev => [...prev, { id: `mat-${Date.now()}`, title: "", type: "link" }]);
  const updateMaterial = (id: string, field: keyof MaterialItem, value: string) => setMaterials(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  const deleteMaterial = (id: string) => setMaterials(prev => prev.filter(m => m.id !== id));
  const addAssignment = () => setAssignments(prev => [...prev, { id: `asg-${Date.now()}`, title: "", submitted: false }]);
  const updateAssignment = (id: string, field: keyof AssignmentItem, value: any) => setAssignments(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  const deleteAssignment = (id: string) => setAssignments(prev => prev.filter(a => a.id !== id));
  const handleSave = () => toast({ title: "נשמר בהצלחה", description: "השינויים עודכנו" });

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[720px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}`)} className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150">
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-semibold text-foreground tracking-tight leading-tight">{decoded} — {part.title}</h1>
          <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">{part.description}</p>
        </div>
        {isTeacher && (
          <div className="flex items-center gap-2">
            <DataExportTools
              subjectProgress={[{
                subjectName: `${decoded} — ${part.title}`,
                grade: grade ?? undefined,
                status: subjectProgress?.status,
                completionPercent: partPct,
                coveredTopics,
              }]}
              label={`${decoded} ${part.title}`}
              contextLabel={`${decoded} — ${part.title}`}
              compact
            />
            <Button size="sm" onClick={handleSave} className="gap-1.5 text-[11px] h-8 rounded-xl">
              <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
              שמירה
            </Button>
          </div>
        )}
      </div>

      {/* KPI + Progress */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "התקדמות", value: `${partPct}%` },
          { label: "ציון", value: grade != null ? `${grade}` : "—" },
          { label: "נושאים", value: `${topicsDone}/${allTopics.length}` },
        ].map((kpi, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-3 text-center shadow-[var(--shadow-card)]">
            <p className="text-[16px] font-semibold text-foreground leading-none">{kpi.value}</p>
            <p className="text-[9.5px] text-muted-foreground mt-1 font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10.5px] text-muted-foreground font-medium">התקדמות ביחידה</span>
          <span className="text-[10.5px] font-semibold text-foreground tabular-nums">{partPct}%</span>
        </div>
        <Progress value={partPct} className="h-2 bg-muted/50" />
      </div>

      {/* Interactive Learning Units */}
      <section className="mb-7">
        <h2 className="text-[12px] font-semibold text-primary/60 mb-4 tracking-tight flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
          לימוד אינטראקטיבי
        </h2>
        <div className="space-y-5">
          {(() => {
            let foundLocked = false;
            return part.units.map((unit, idx) => {
              const unitTopics = unit.items.map(i => i.title);
              const allDone = unitTopics.length > 0 && unitTopics.every(t => coveredTopics.includes(t));
              const isLocked = !allDone && foundLocked;
              if (!allDone && !foundLocked) foundLocked = true; // first not-done = current; rest locked
              if (isLocked) {
                return (
                  <div
                    key={unit.id}
                    id={`unit-${unit.id}`}
                    className="relative rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center"
                  >
                    <div className="flex flex-col items-center gap-2 opacity-70">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Lock className="h-4 w-4 text-muted-foreground" strokeWidth={1.7} />
                      </div>
                      <p className="text-[12.5px] font-semibold text-foreground">
                        יחידה {idx + 1} · {unit.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground max-w-xs">
                        תיפתח אחרי שתסיים את היחידה הקודמת
                      </p>
                    </div>
                  </div>
                );
              }
              return (
                <div key={unit.id} id={`unit-${unit.id}`} className="scroll-mt-6">
                  <InteractiveLearningUnit
                    unit={unit}
                    coveredTopics={coveredTopics}
                    sport={studentSport}
                    onTopicComplete={(title) => {
                      toast({ title: "יפה — שלטת היטב במושג הזה", description: `הנושא "${title}" סומן כהושלם` });
                    }}
                  />
                </div>
              );
            });
          })()}
        </div>
      </section>

      {/* Materials */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[12px] font-semibold text-primary/60 tracking-tight flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.5} />
            חומרים וקישורים
          </h2>
          {isTeacher && (
            <button onClick={addMaterial} className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors">
              <Plus className="h-3 w-3" strokeWidth={1.5} />
              הוסף
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {materials.length === 0 && !isTeacher && (
            <div className="bg-card rounded-xl border border-border p-4 text-center shadow-[var(--shadow-card)]">
              <p className="text-[11px] text-muted-foreground/60">אין חומר לימודי עדיין</p>
            </div>
          )}
          {materials.map(mat => (
            <div key={mat.id} className="bg-card rounded-xl border border-border p-3 shadow-[var(--shadow-card)] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                {mat.type === "link" ? <LinkIcon className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} /> :
                 mat.type === "video" ? <Upload className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} /> :
                 <FileText className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />}
              </div>
              {isTeacher ? (
                <Input value={mat.title} onChange={e => updateMaterial(mat.id, "title", e.target.value)} className="text-[11px] h-7 flex-1 border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none" placeholder="שם החומר" />
              ) : (
                <span className="text-[11px] text-foreground font-medium flex-1">{mat.title}</span>
              )}
              {isTeacher && (
                <button onClick={() => deleteMaterial(mat.id)} className="p-1 rounded text-muted-foreground/30 hover:text-destructive transition-colors">
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                </button>
              )}
            </div>
          ))}
          {isTeacher && materials.length === 0 && (
            <button onClick={addMaterial} className="w-full bg-card rounded-xl border border-dashed border-primary/20 p-3 text-center hover:border-primary/40 hover:bg-primary/[0.03] transition-all cursor-pointer">
              <div className="flex items-center justify-center gap-2 text-primary/50">
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="text-[10.5px] font-medium">הוסף חומר לימודי</span>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Assignments */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[12px] font-semibold text-primary/60 tracking-tight flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" strokeWidth={1.5} />
            מטלות
          </h2>
          {isTeacher && (
            <button onClick={addAssignment} className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors">
              <Plus className="h-3 w-3" strokeWidth={1.5} />
              הוסף
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {assignments.map(a => (
            <div key={a.id} className="bg-card rounded-xl border border-border p-3 shadow-[var(--shadow-card)] flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.submitted ? "bg-[hsl(var(--success))]/10" : "bg-[hsl(var(--warning))]/10"}`}>
                {a.submitted ? <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" strokeWidth={1.5} /> : <Clock className="h-3.5 w-3.5 text-[hsl(var(--warning))]" strokeWidth={1.5} />}
              </div>
              {isTeacher ? (
                <Input value={a.title} onChange={e => updateAssignment(a.id, "title", e.target.value)} className="text-[11px] h-7 flex-1 border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none" placeholder="שם המטלה" />
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground leading-tight truncate">{a.title}</p>
                  <p className="text-[9.5px] text-muted-foreground font-normal mt-0.5">{a.submitted ? "הוגש" : "ממתין להגשה"}</p>
                </div>
              )}
              {isTeacher && (
                <Input value={a.grade ?? ""} onChange={e => updateAssignment(a.id, "grade", e.target.value ? Number(e.target.value) : undefined)} className="text-[10px] w-14 h-7 text-center rounded-md bg-muted/30 border-border" placeholder="ציון" type="number" />
              )}
              {!isTeacher && a.grade != null && (
                <span className="text-[13px] font-semibold text-foreground tabular-nums">{a.grade}</span>
              )}
              {isTeacher && (
                <button onClick={() => deleteAssignment(a.id)} className="p-1 rounded text-muted-foreground/30 hover:text-destructive transition-colors">
                  <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                </button>
              )}
            </div>
          ))}
          {assignments.length === 0 && (
            <div className="bg-card rounded-xl border border-border p-4 text-center shadow-[var(--shadow-card)]">
              <p className="text-[11px] text-muted-foreground/60">אין מטלות עדיין</p>
            </div>
          )}
        </div>
      </section>

      {/* Notes */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[12px] font-semibold text-primary/60 tracking-tight flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
            הערות
          </h2>
          {isTeacher && !editingNote && (
            <button onClick={() => setEditingNote(true)} className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors">
              <Pencil className="h-3 w-3" strokeWidth={1.5} />
              ערוך
            </button>
          )}
        </div>
        {isTeacher && editingNote ? (
          <div className="space-y-2">
            <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} className="text-[11px] min-h-[80px] rounded-xl bg-muted/20 border-border/50 resize-none" placeholder="הוסף הערה..." />
            <div className="flex gap-2">
              <Button size="sm" className="text-[10px] h-7 rounded-lg" onClick={() => { setEditingNote(false); toast({ title: "הערה נשמרה" }); }}>שמור</Button>
              <Button size="sm" variant="ghost" className="text-[10px] h-7 rounded-lg" onClick={() => setEditingNote(false)}>ביטול</Button>
            </div>
          </div>
        ) : noteText ? (
          <div className="bg-card rounded-xl border border-border p-4 shadow-[var(--shadow-card)]">
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">{noteText}</p>
          </div>
        ) : null}
      </section>

      {/* AI Tools */}
      <section className="mb-6 space-y-3">
        {/* Bagrut Grading */}
        <button
          onClick={() => navigate(`/bagrut-grading?subject=${encodeURIComponent(decoded)}`)}
          className="w-full bg-gradient-to-l from-primary/8 to-primary/[0.03] rounded-2xl border border-primary/12 p-4 text-start hover:from-primary/12 hover:to-primary/5 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/12 flex items-center justify-center shrink-0">
              <Award className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-foreground leading-tight">בוחן בגרות חכם</p>
              <p className="text-[10px] text-muted-foreground font-normal mt-0.5">הערכה ברמת בגרות אמיתית עם AI</p>
            </div>
            <Sparkles className="h-4 w-4 text-primary/40" strokeWidth={1.5} />
          </div>
        </button>

        {/* Teacher AI */}
        {isTeacher && (
          <TeacherAIAssistant defaultSubject={decoded} compact />
        )}
      </section>
    </div>
  );
};

export default SubjectPartPage;
