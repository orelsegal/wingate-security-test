import { useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, Lock, Clock, BookOpen, FileText, Plus,
  ClipboardList, Sparkles, ChevronDown, ChevronUp, Trash2, Pencil,
  Link as LinkIcon, Upload, Save, GraduationCap, TrafficCone, Map
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStudentProgress } from "@/hooks/useStudents";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { saveLastVisited } from "@/pages/RoleHomePage";
import { useEffect } from "react";
import DataExportTools from "@/components/DataExportTools";

/* ── Part definitions per subject ── */
interface TopicDef { name: string; }
interface MaterialItem { id: string; title: string; type: "file" | "link" | "text"; url?: string; }
interface AssignmentItem { id: string; title: string; grade?: number; dueDate?: string; submitted?: boolean; }

interface PartDef {
  id: string;
  title: string;
  weight: string;
  topics: TopicDef[];
  materials: MaterialItem[];
  assignments: AssignmentItem[];
  notes: string;
}

const allParts: Record<string, PartDef[]> = {
  "היסטוריה": [
    {
      id: "hist-30", title: "30%", weight: "30%",
      topics: [{ name: "הלאומיות באירופה" }, { name: "מלחמת העולם הראשונה" }, { name: "התקופה שבין המלחמות" }],
      materials: [], assignments: [], notes: ""
    },
    {
      id: "hist-70", title: "70%", weight: "70%",
      topics: [{ name: "מלחמת העולם השנייה" }, { name: "השואה" }, { name: "הקמת המדינה" }, { name: "סכסוך ערבי-ישראלי" }],
      materials: [
        { id: "m1", title: "מצגת – מלחמת העולם השנייה", type: "file" },
        { id: "m2", title: "סרטון – השואה", type: "link", url: "#" },
      ],
      assignments: [
        { id: "a1", title: "עבודה – מלחמת העולם השנייה", grade: 82, submitted: true },
        { id: "a2", title: "בוחן – השואה", grade: 75, submitted: true },
        { id: "a3", title: "מטלה – הקמת המדינה", submitted: false },
      ],
      notes: ""
    },
  ],
  "אזרחות": [
    { id: "civ-30", title: "30%", weight: "30%", topics: [{ name: "עקרונות הדמוקרטיה" }, { name: "זכויות האדם" }, { name: "הכרזת העצמאות" }], materials: [], assignments: [], notes: "" },
    { id: "civ-70", title: "70%", weight: "70%", topics: [{ name: "מוסדות השלטון" }, { name: "חוקה ומשפט" }, { name: "אזרחות פעילה" }, { name: "מיעוטים בישראל" }], materials: [], assignments: [], notes: "" },
  ],
  "לשון": [
    { id: "heb-20", title: "20%", weight: "20%", topics: [{ name: "תחביר בסיסי" }, { name: "חלקי דיבר" }, { name: "פיסוק" }], materials: [], assignments: [], notes: "" },
    { id: "heb-80", title: "80%", weight: "80%", topics: [{ name: "הבנת הנקרא" }, { name: "כתיבה אקדמית" }, { name: "לשון פורמלית" }, { name: "מבנה טקסט" }], materials: [], assignments: [], notes: "" },
  ],
  "מתמטיקה": [
    { id: "math-1", title: "אלגברה ופונקציות", weight: "~35%", topics: [{ name: "משוואות" }, { name: "פונקציה ליניארית" }, { name: "פונקציה ריבועית" }], materials: [], assignments: [], notes: "" },
    { id: "math-2", title: "גיאומטריה וטריגונומטריה", weight: "~35%", topics: [{ name: "משולשים" }, { name: "מעגל" }, { name: "טריגונומטריה" }], materials: [], assignments: [], notes: "" },
    { id: "math-3", title: "הסתברות וסטטיסטיקה", weight: "~30%", topics: [{ name: "הסתברות" }, { name: "התפלגויות" }, { name: "סטטיסטיקה תיאורית" }], materials: [], assignments: [], notes: "" },
  ],
  "אנגלית": [
    { id: "eng-e", title: "Module E", weight: "Literature", topics: [{ name: "Unseen passages" }, { name: "Literature – Play" }, { name: "Literature – Poem" }], materials: [], assignments: [], notes: "" },
    { id: "eng-f", title: "Module F", weight: "Writing", topics: [{ name: "Essay writing" }, { name: "Formal letter" }, { name: "Report" }], materials: [], assignments: [], notes: "" },
    { id: "eng-g", title: "Module G", weight: "Oral", topics: [{ name: "Oral presentation" }, { name: "Listening comprehension" }], materials: [], assignments: [], notes: "" },
  ],
};

const SubjectPartPage = () => {
  const { subjectName, partId } = useParams<{ subjectName: string; partId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const studentId = user?.scopeFilter?.[0] || "";
  const { data: progress = [] } = useStudentProgress(studentId);

  const decoded = decodeURIComponent(subjectName || "");
  const parts = allParts[decoded] || [];
  const part = parts.find(p => p.id === partId);

  // Teacher editing state
  const [materials, setMaterials] = useState<MaterialItem[]>(part?.materials || []);
  const [assignments, setAssignments] = useState<AssignmentItem[]>(part?.assignments || []);
  const [noteText, setNoteText] = useState(part?.notes || "");
  const [editingNote, setEditingNote] = useState(false);

  useEffect(() => {
    if (decoded && part) {
      saveLastVisited(`/subjects/${encodeURIComponent(decoded)}/${part.id}`, `${decoded} — ${part.title}`);
    }
  }, [decoded, part]);

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

  const topicsDone = part.topics.filter(t => coveredTopics.includes(t.name)).length;
  const partPct = part.topics.length > 0 ? Math.round((topicsDone / part.topics.length) * 100) : 0;
  const nextTopic = part.topics.find(t => !coveredTopics.includes(t.name));

  /* ── Teacher controls ── */
  const addMaterial = () => {
    setMaterials(prev => [...prev, { id: `mat-${Date.now()}`, title: "", type: "text" }]);
  };
  const updateMaterial = (id: string, field: keyof MaterialItem, value: string) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };
  const deleteMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  const addAssignment = () => {
    setAssignments(prev => [...prev, { id: `asg-${Date.now()}`, title: "", submitted: false }]);
  };
  const updateAssignment = (id: string, field: keyof AssignmentItem, value: any) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };
  const deleteAssignment = (id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const handleSave = () => {
    toast({ title: "נשמר בהצלחה", description: "השינויים עודכנו" });
  };

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[720px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`/subjects/${encodeURIComponent(decoded)}`)} className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150">
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-semibold text-foreground tracking-tight leading-tight">{decoded} — {part.title}</h1>
          <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">{part.weight}</p>
        </div>
        {isTeacher && (
          <Button size="sm" onClick={handleSave} className="gap-1.5 text-[11px] h-8 rounded-xl">
            <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
            שמירה
          </Button>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "התקדמות", value: `${partPct}%` },
          { label: "ציון", value: grade != null ? `${grade}` : "—" },
          { label: "נושאים", value: `${topicsDone}/${part.topics.length}` },
        ].map((kpi, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-3 text-center shadow-[var(--shadow-card)] animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
            <p className="text-[16px] font-semibold text-foreground leading-none">{kpi.value}</p>
            <p className="text-[9.5px] text-muted-foreground mt-1 font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10.5px] text-muted-foreground font-medium">התקדמות ביחידה</span>
          <span className="text-[10.5px] font-semibold text-foreground tabular-nums">{partPct}%</span>
        </div>
        <Progress value={partPct} className="h-2 bg-muted/50" />
      </div>

      {/* Next step */}
      {nextTopic && (
        <div className="bg-primary/5 rounded-2xl border border-primary/10 p-4 mb-6 animate-fade-in-up" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-primary/60 font-medium mb-0.5">הצעד הבא</p>
              <p className="text-[12px] font-semibold text-foreground leading-tight">{nextTopic.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Topics */}
      <section className="mb-6">
        <h2 className="text-[12px] font-semibold text-primary/60 mb-3 tracking-tight flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
          נושאי לימוד
        </h2>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-1.5">
            {part.topics.map((topic, ti) => {
              const done = coveredTopics.includes(topic.name);
              return (
                <div key={ti} className="flex items-center gap-2 py-1">
                  {done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))] shrink-0" strokeWidth={1.5} />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
                  )}
                  <span className={`text-[11px] ${done ? "text-foreground" : "text-muted-foreground/60"}`}>{topic.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Learning Materials */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[12px] font-semibold text-primary/60 tracking-tight flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" strokeWidth={1.5} />
            חומר לימודי
          </h2>
          {isTeacher && (
            <button onClick={addMaterial} className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary transition-colors">
              <Plus className="h-3 w-3" strokeWidth={1.5} />
              הוסף חומר
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
                 mat.type === "file" ? <Upload className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} /> :
                 <FileText className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />}
              </div>
              {isTeacher ? (
                <Input
                  value={mat.title}
                  onChange={e => updateMaterial(mat.id, "title", e.target.value)}
                  className="text-[11px] h-7 flex-1 border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                  placeholder="שם החומר"
                />
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
            <button onClick={addMaterial} className="w-full bg-card rounded-xl border border-dashed border-primary/20 p-3 text-center hover:border-primary/40 hover:bg-primary/[0.03] transition-all duration-200 cursor-pointer">
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
              הוסף מטלה
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {assignments.map(a => (
            <div key={a.id} className="bg-card rounded-xl border border-border p-3 shadow-[var(--shadow-card)] flex items-center gap-3 animate-fade-in-up">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.submitted ? "bg-[hsl(var(--success))]/10" : "bg-[hsl(var(--warning))]/10"}`}>
                {a.submitted ? <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" strokeWidth={1.5} /> : <Clock className="h-3.5 w-3.5 text-[hsl(var(--warning))]" strokeWidth={1.5} />}
              </div>
              {isTeacher ? (
                <Input
                  value={a.title}
                  onChange={e => updateAssignment(a.id, "title", e.target.value)}
                  className="text-[11px] h-7 flex-1 border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                  placeholder="שם המטלה"
                />
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground leading-tight truncate">{a.title}</p>
                  <p className="text-[9.5px] text-muted-foreground font-normal mt-0.5">{a.submitted ? "הוגש" : "ממתין להגשה"}</p>
                </div>
              )}
              {isTeacher && (
                <Input
                  value={a.grade ?? ""}
                  onChange={e => updateAssignment(a.id, "grade", e.target.value ? Number(e.target.value) : undefined)}
                  className="text-[10px] w-14 h-7 text-center rounded-md bg-muted/30 border-border focus-visible:ring-1"
                  placeholder="ציון"
                  type="number"
                />
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
            <Textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              className="text-[11px] min-h-[80px] rounded-xl bg-muted/20 border-border/50 focus-visible:ring-1 resize-none"
              placeholder="הוסף הערה..."
            />
            <div className="flex gap-2">
              <Button size="sm" className="text-[10px] h-7 rounded-lg" onClick={() => { setEditingNote(false); toast({ title: "הערה נשמרה" }); }}>שמור</Button>
              <Button size="sm" variant="ghost" className="text-[10px] h-7 rounded-lg" onClick={() => setEditingNote(false)}>ביטול</Button>
            </div>
          </div>
        ) : noteText ? (
          <div className="bg-card rounded-xl border border-border p-4 shadow-[var(--shadow-card)]">
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">{noteText}</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-4 text-center shadow-[var(--shadow-card)]">
            <p className="text-[11px] text-muted-foreground/60">אין הערות</p>
          </div>
        )}
      </section>

      {/* Quick links for student */}
      {!isTeacher && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => navigate("/student-learning")}
            className="group bg-card rounded-2xl border border-border p-3.5 text-start shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[hsl(var(--success))]/10 flex items-center justify-center shrink-0">
                <TrafficCone className="h-4 w-4 text-[hsl(var(--success))]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[11.5px] font-semibold text-foreground leading-tight">רמזור למידה</p>
                <p className="text-[9.5px] text-muted-foreground font-normal mt-0.5">מצב לימודי</p>
              </div>
            </div>
          </button>
          <button
            onClick={() => navigate("/student-roadmap")}
            className="group bg-card rounded-2xl border border-border p-3.5 text-start shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Map className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[11.5px] font-semibold text-foreground leading-tight">מפת דרכים</p>
                <p className="text-[9.5px] text-muted-foreground font-normal mt-0.5">נתיב בגרות</p>
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default SubjectPartPage;
