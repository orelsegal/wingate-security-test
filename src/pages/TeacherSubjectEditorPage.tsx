import { useState } from "react";
import {
  ArrowRight, Plus, Trash2, GripVertical, Save, BookOpen, Globe,
  Calculator, Languages, Scroll, Scale, FileText, ClipboardList, Pencil
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

/* ── Types ── */
interface TopicItem {
  name: string;
}

interface AssignmentItem {
  id: string;
  title: string;
  grade?: number;
  note?: string;
}

interface RubricItem {
  id: string;
  title: string;
  weight: string;
  topics: TopicItem[];
  assignments: AssignmentItem[];
  notes: string;
}

const initialRubrics: Record<string, RubricItem[]> = {
  "היסטוריה": [
    { id: "hist-30", title: "30%", weight: "30%", topics: [{ name: "הלאומיות באירופה" }, { name: "מלחמת העולם הראשונה" }, { name: "התקופה שבין המלחמות" }], assignments: [], notes: "" },
    { id: "hist-70", title: "70%", weight: "70%", topics: [{ name: "מלחמת העולם השנייה" }, { name: "השואה" }, { name: "הקמת המדינה" }, { name: "סכסוך ערבי-ישראלי" }], assignments: [], notes: "" },
  ],
  "אזרחות": [
    { id: "civ-30", title: "30%", weight: "30%", topics: [{ name: "עקרונות הדמוקרטיה" }, { name: "זכויות האדם" }, { name: "הכרזת העצמאות" }], assignments: [], notes: "" },
    { id: "civ-70", title: "70%", weight: "70%", topics: [{ name: "מוסדות השלטון" }, { name: "חוקה ומשפט" }, { name: "אזרחות פעילה" }, { name: "מיעוטים בישראל" }], assignments: [], notes: "" },
  ],
  "לשון": [
    { id: "heb-20", title: "20%", weight: "20%", topics: [{ name: "תחביר בסיסי" }, { name: "חלקי דיבר" }, { name: "פיסוק" }], assignments: [], notes: "" },
    { id: "heb-80", title: "80%", weight: "80%", topics: [{ name: "הבנת הנקרא" }, { name: "כתיבה אקדמית" }, { name: "לשון פורמלית" }, { name: "מבנה טקסט" }], assignments: [], notes: "" },
  ],
  "מתמטיקה": [
    { id: "math-1", title: "אלגברה ופונקציות", weight: "~35%", topics: [{ name: "משוואות" }, { name: "פונקציה ליניארית" }, { name: "פונקציה ריבועית" }], assignments: [], notes: "" },
    { id: "math-2", title: "גיאומטריה וטריגונומטריה", weight: "~35%", topics: [{ name: "משולשים" }, { name: "מעגל" }, { name: "טריגונומטריה" }], assignments: [], notes: "" },
    { id: "math-3", title: "הסתברות וסטטיסטיקה", weight: "~30%", topics: [{ name: "הסתברות" }, { name: "התפלגויות" }, { name: "סטטיסטיקה תיאורית" }], assignments: [], notes: "" },
  ],
  "אנגלית": [
    { id: "eng-e", title: "Module E", weight: "Literature", topics: [{ name: "Unseen passages" }, { name: "Literature – Play" }, { name: "Literature – Poem" }], assignments: [], notes: "" },
    { id: "eng-f", title: "Module F", weight: "Writing", topics: [{ name: "Essay writing" }, { name: "Formal letter" }, { name: "Report" }], assignments: [], notes: "" },
    { id: "eng-g", title: "Module G", weight: "Oral", topics: [{ name: "Oral presentation" }, { name: "Listening comprehension" }], assignments: [], notes: "" },
  ],
};

const subjectIcons: Record<string, any> = {
  "היסטוריה": Scroll,
  "אזרחות": Scale,
  "אנגלית": Globe,
  "לשון": Languages,
  "מתמטיקה": Calculator,
};

const TeacherSubjectEditorPage = () => {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [rubrics, setRubrics] = useState<Record<string, RubricItem[]>>(JSON.parse(JSON.stringify(initialRubrics)));

  const subjects = Object.keys(rubrics);

  /* ── Rubric CRUD ── */
  const handleAddRubric = (subject: string) => {
    const newId = `${subject}-${Date.now()}`;
    setRubrics(prev => ({
      ...prev,
      [subject]: [...(prev[subject] || []), { id: newId, title: "יחידה חדשה", weight: "", topics: [], assignments: [], notes: "" }],
    }));
  };

  const handleDeleteRubric = (subject: string, rubricId: string) => {
    setRubrics(prev => ({
      ...prev,
      [subject]: prev[subject].filter(r => r.id !== rubricId),
    }));
  };

  const handleUpdateRubric = (subject: string, rubricId: string, field: keyof RubricItem, value: any) => {
    setRubrics(prev => ({
      ...prev,
      [subject]: prev[subject].map(r => r.id === rubricId ? { ...r, [field]: value } : r),
    }));
  };

  /* ── Topics ── */
  const handleAddTopic = (subject: string, rubricId: string) => {
    setRubrics(prev => ({
      ...prev,
      [subject]: prev[subject].map(r => r.id === rubricId ? { ...r, topics: [...r.topics, { name: "" }] } : r),
    }));
  };

  const handleUpdateTopic = (subject: string, rubricId: string, idx: number, value: string) => {
    setRubrics(prev => ({
      ...prev,
      [subject]: prev[subject].map(r =>
        r.id === rubricId ? { ...r, topics: r.topics.map((t, i) => i === idx ? { name: value } : t) } : r
      ),
    }));
  };

  const handleDeleteTopic = (subject: string, rubricId: string, idx: number) => {
    setRubrics(prev => ({
      ...prev,
      [subject]: prev[subject].map(r =>
        r.id === rubricId ? { ...r, topics: r.topics.filter((_, i) => i !== idx) } : r
      ),
    }));
  };

  /* ── Assignments ── */
  const handleAddAssignment = (subject: string, rubricId: string) => {
    const newA: AssignmentItem = { id: `a-${Date.now()}`, title: "" };
    setRubrics(prev => ({
      ...prev,
      [subject]: prev[subject].map(r => r.id === rubricId ? { ...r, assignments: [...r.assignments, newA] } : r),
    }));
  };

  const handleUpdateAssignment = (subject: string, rubricId: string, aId: string, field: keyof AssignmentItem, value: any) => {
    setRubrics(prev => ({
      ...prev,
      [subject]: prev[subject].map(r =>
        r.id === rubricId
          ? { ...r, assignments: r.assignments.map(a => a.id === aId ? { ...a, [field]: value } : a) }
          : r
      ),
    }));
  };

  const handleDeleteAssignment = (subject: string, rubricId: string, aId: string) => {
    setRubrics(prev => ({
      ...prev,
      [subject]: prev[subject].map(r =>
        r.id === rubricId ? { ...r, assignments: r.assignments.filter(a => a.id !== aId) } : r
      ),
    }));
  };

  const handleSave = () => {
    toast({ title: "נשמר בהצלחה", description: "מבנה הלמידה עודכן" });
  };

  /* ── Subject list ── */
  if (!selectedSubject) {
    return (
      <div className="p-5 md:p-10 lg:p-14 max-w-[720px] mx-auto" dir="rtl">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150">
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-[17px] font-semibold text-foreground tracking-tight leading-tight">ניהול מבנה למידה</h1>
            <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">עריכת יחידות לימוד, מטלות והערות לפי מקצוע</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {subjects.map((name, i) => {
            const Icon = subjectIcons[name] || BookOpen;
            return (
              <button
                key={name}
                onClick={() => setSelectedSubject(name)}
                className="group bg-card rounded-2xl border border-border p-4 text-start shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${60 + i * 40}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                    <Icon className="h-[18px] w-[18px] text-primary" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[13.5px] font-semibold text-foreground leading-tight">{name}</h3>
                    <p className="text-[10.5px] text-muted-foreground font-normal mt-0.5">{rubrics[name]?.length || 0} יחידות</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Subject editor ── */
  const currentRubrics = rubrics[selectedSubject] || [];

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[720px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setSelectedSubject(null)} className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150">
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-semibold text-foreground tracking-tight leading-tight">עריכת {selectedSubject}</h1>
          <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">ניהול יחידות, נושאים, מטלות והערות</p>
        </div>
        <Button size="sm" onClick={handleSave} className="gap-1.5 text-[11px] h-8 rounded-xl">
          <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
          שמירה
        </Button>
      </div>

      {/* Rubrics */}
      <div className="flex flex-col gap-5 mb-6">
        {currentRubrics.map((rubric, ri) => (
          <div key={rubric.id} className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)] animate-fade-in-up" style={{ animationDelay: `${ri * 50}ms` }}>
            {/* Rubric header */}
            <div className="flex items-center gap-2 mb-4">
              <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0 cursor-grab" strokeWidth={1.5} />
              <Input
                value={rubric.title}
                onChange={e => handleUpdateRubric(selectedSubject, rubric.id, "title", e.target.value)}
                className="text-[12.5px] font-semibold h-8 border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                placeholder="שם היחידה"
              />
              <Input
                value={rubric.weight}
                onChange={e => handleUpdateRubric(selectedSubject, rubric.id, "weight", e.target.value)}
                className="text-[10px] w-16 h-7 text-center rounded-lg bg-muted/50 border-0 focus-visible:ring-1"
                placeholder="משקל"
              />
              <button onClick={() => handleDeleteRubric(selectedSubject, rubric.id)} className="p-1.5 rounded-lg text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Topics */}
            <div className="mb-4">
              <p className="text-[10px] font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <BookOpen className="h-3 w-3" strokeWidth={1.5} />
                נושאים
              </p>
              <div className="flex flex-col gap-1.5 mr-4">
                {rubric.topics.map((topic, ti) => (
                  <div key={ti} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/30 shrink-0" />
                    <Input
                      value={topic.name}
                      onChange={e => handleUpdateTopic(selectedSubject, rubric.id, ti, e.target.value)}
                      className="text-[11px] h-7 border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                      placeholder="שם הנושא"
                    />
                    <button onClick={() => handleDeleteTopic(selectedSubject, rubric.id, ti)} className="p-1 rounded text-muted-foreground/30 hover:text-destructive transition-colors">
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => handleAddTopic(selectedSubject, rubric.id)}
                  className="flex items-center gap-1.5 text-[10px] text-primary/60 hover:text-primary mt-1 transition-colors"
                >
                  <Plus className="h-3 w-3" strokeWidth={1.5} />
                  הוסף נושא
                </button>
              </div>
            </div>

            {/* Assignments */}
            <div className="mb-4">
              <p className="text-[10px] font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <ClipboardList className="h-3 w-3" strokeWidth={1.5} />
                מטלות
              </p>
              <div className="flex flex-col gap-2 mr-4">
                {rubric.assignments.map(a => (
                  <div key={a.id} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                    <Input
                      value={a.title}
                      onChange={e => handleUpdateAssignment(selectedSubject, rubric.id, a.id, "title", e.target.value)}
                      className="text-[10.5px] h-6 flex-1 border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                      placeholder="שם המטלה"
                    />
                    <Input
                      value={a.grade ?? ""}
                      onChange={e => handleUpdateAssignment(selectedSubject, rubric.id, a.id, "grade", e.target.value ? Number(e.target.value) : undefined)}
                      className="text-[10px] w-14 h-6 text-center rounded-md bg-card border-border focus-visible:ring-1"
                      placeholder="ציון"
                      type="number"
                    />
                    <button onClick={() => handleDeleteAssignment(selectedSubject, rubric.id, a.id)} className="p-1 rounded text-muted-foreground/30 hover:text-destructive transition-colors">
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => handleAddAssignment(selectedSubject, rubric.id)}
                  className="flex items-center gap-1.5 text-[10px] text-primary/60 hover:text-primary mt-1 transition-colors"
                >
                  <Plus className="h-3 w-3" strokeWidth={1.5} />
                  הוסף מטלה
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <FileText className="h-3 w-3" strokeWidth={1.5} />
                הערות
              </p>
              <Textarea
                value={rubric.notes}
                onChange={e => handleUpdateRubric(selectedSubject, rubric.id, "notes", e.target.value)}
                className="text-[11px] min-h-[60px] rounded-xl bg-muted/20 border-border/50 focus-visible:ring-1 resize-none mr-4"
                placeholder="הוסף הערה..."
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add rubric */}
      <button
        onClick={() => handleAddRubric(selectedSubject)}
        className="w-full bg-card rounded-2xl border border-dashed border-primary/20 p-4 text-center hover:border-primary/40 hover:bg-primary/[0.03] transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center justify-center gap-2 text-primary/50">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <span className="text-[11.5px] font-medium">הוסף יחידה</span>
        </div>
      </button>
    </div>
  );
};

export default TeacherSubjectEditorPage;
