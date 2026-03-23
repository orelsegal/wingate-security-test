import { useState, useMemo } from "react";
import { ArrowRight, Plus, Trash2, GripVertical, Save, Loader2, BookOpen, Globe, Calculator, Languages, Scroll, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

/* ── Static rubric definitions (editable in-memory for now) ── */
interface RubricItem {
  id: string;
  title: string;
  weight: string;
  topics: string[];
}

const initialRubrics: Record<string, RubricItem[]> = {
  "היסטוריה": [
    { id: "hist-30", title: "רובריקת 30%", weight: "30%", topics: ["הלאומיות באירופה", "מלחמת העולם הראשונה", "התקופה שבין המלחמות"] },
    { id: "hist-70", title: "רובריקת 70%", weight: "70%", topics: ["מלחמת העולם השנייה", "השואה", "הקמת המדינה", "סכסוך ערבי-ישראלי"] },
  ],
  "אזרחות": [
    { id: "civ-30", title: "רובריקת 30%", weight: "30%", topics: ["עקרונות הדמוקרטיה", "זכויות האדם", "הכרזת העצמאות"] },
    { id: "civ-70", title: "רובריקת 70%", weight: "70%", topics: ["מוסדות השלטון", "חוקה ומשפט", "אזרחות פעילה", "מיעוטים בישראל"] },
  ],
  "לשון": [
    { id: "heb-20", title: "רובריקת 20%", weight: "20%", topics: ["תחביר בסיסי", "חלקי דיבר", "פיסוק"] },
    { id: "heb-80", title: "רובריקת 80%", weight: "80%", topics: ["הבנת הנקרא", "כתיבה אקדמית", "לשון פורמלית", "מבנה טקסט"] },
  ],
  "מתמטיקה": [
    { id: "math-1", title: "אלגברה ופונקציות", weight: "~35%", topics: ["משוואות", "פונקציה ליניארית", "פונקציה ריבועית"] },
    { id: "math-2", title: "גיאומטריה וטריגונומטריה", weight: "~35%", topics: ["משולשים", "מעגל", "טריגונומטריה"] },
    { id: "math-3", title: "הסתברות וסטטיסטיקה", weight: "~30%", topics: ["הסתברות", "התפלגויות", "סטטיסטיקה תיאורית"] },
  ],
  "אנגלית": [
    { id: "eng-e", title: "Module E", weight: "Literature", topics: ["Unseen passages", "Literature – Play", "Literature – Poem"] },
    { id: "eng-f", title: "Module F", weight: "Writing", topics: ["Essay writing", "Formal letter", "Report"] },
    { id: "eng-g", title: "Module G", weight: "Oral", topics: ["Oral presentation", "Listening comprehension"] },
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

  const handleAddRubric = (subject: string) => {
    const newId = `${subject}-${Date.now()}`;
    setRubrics(prev => ({
      ...prev,
      [subject]: [...(prev[subject] || []), { id: newId, title: "רובריקה חדשה", weight: "", topics: [] }],
    }));
  };

  const handleDeleteRubric = (subject: string, rubricId: string) => {
    setRubrics(prev => ({
      ...prev,
      [subject]: prev[subject].filter(r => r.id !== rubricId),
    }));
  };

  const handleUpdateRubric = (subject: string, rubricId: string, field: "title" | "weight", value: string) => {
    setRubrics(prev => ({
      ...prev,
      [subject]: prev[subject].map(r => r.id === rubricId ? { ...r, [field]: value } : r),
    }));
  };

  const handleAddTopic = (subject: string, rubricId: string) => {
    setRubrics(prev => ({
      ...prev,
      [subject]: prev[subject].map(r => r.id === rubricId ? { ...r, topics: [...r.topics, ""] } : r),
    }));
  };

  const handleUpdateTopic = (subject: string, rubricId: string, topicIndex: number, value: string) => {
    setRubrics(prev => ({
      ...prev,
      [subject]: prev[subject].map(r =>
        r.id === rubricId ? { ...r, topics: r.topics.map((t, i) => i === topicIndex ? value : t) } : r
      ),
    }));
  };

  const handleDeleteTopic = (subject: string, rubricId: string, topicIndex: number) => {
    setRubrics(prev => ({
      ...prev,
      [subject]: prev[subject].map(r =>
        r.id === rubricId ? { ...r, topics: r.topics.filter((_, i) => i !== topicIndex) } : r
      ),
    }));
  };

  const handleSave = () => {
    // In a full implementation this would persist to DB
    toast({ title: "נשמר בהצלחה", description: "מבנה הלמידה עודכן" });
  };

  if (!selectedSubject) {
    return (
      <div className="p-5 md:p-10 lg:p-14 max-w-[720px] mx-auto" dir="rtl">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors duration-150">
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-[17px] font-semibold text-foreground tracking-tight leading-tight">ניהול מבנה למידה</h1>
            <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">עריכת רובריקות ויחידות לימוד לפי מקצוע</p>
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
                    <p className="text-[10.5px] text-muted-foreground font-normal mt-0.5">{rubrics[name]?.length || 0} רובריקות</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

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
          <p className="text-[11px] text-muted-foreground/60 mt-1 font-normal">ניהול רובריקות, נושאים ומבנה למידה</p>
        </div>
        <Button size="sm" onClick={handleSave} className="gap-1.5 text-[11px] h-8 rounded-xl">
          <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
          שמירה
        </Button>
      </div>

      {/* Rubrics */}
      <div className="flex flex-col gap-4 mb-6">
        {currentRubrics.map((rubric, ri) => (
          <div key={rubric.id} className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)] animate-fade-in-up" style={{ animationDelay: `${ri * 50}ms` }}>
            <div className="flex items-center gap-2 mb-3">
              <GripVertical className="h-4 w-4 text-muted-foreground/30 shrink-0" strokeWidth={1.5} />
              <Input
                value={rubric.title}
                onChange={e => handleUpdateRubric(selectedSubject, rubric.id, "title", e.target.value)}
                className="text-[12.5px] font-semibold h-8 border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                placeholder="שם הרובריקה"
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

            <div className="flex flex-col gap-1.5 mr-6">
              {rubric.topics.map((topic, ti) => (
                <div key={ti} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/30 shrink-0" />
                  <Input
                    value={topic}
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
        ))}
      </div>

      {/* Add rubric */}
      <button
        onClick={() => handleAddRubric(selectedSubject)}
        className="w-full bg-card rounded-2xl border border-dashed border-primary/20 p-4 text-center hover:border-primary/40 hover:bg-primary/3 transition-all duration-200 cursor-pointer"
      >
        <div className="flex items-center justify-center gap-2 text-primary/50">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          <span className="text-[11.5px] font-medium">הוסף רובריקה</span>
        </div>
      </button>
    </div>
  );
};

export default TeacherSubjectEditorPage;
