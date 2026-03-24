import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight, Send, Loader2, Award, CheckCircle2, AlertTriangle,
  BookOpen, FileText, Copy, MessageCircle, Download, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface RubricItem {
  score: number;
  max: number;
  comment: string;
}

interface GradingResult {
  grade: number;
  rubric: {
    content_accuracy: RubricItem;
    task_completion: RubricItem;
    structure: RubricItem;
    language: RubricItem;
    precision: RubricItem;
  };
  feedback: string;
  improved_answer: string;
}

const RUBRIC_LABELS: Record<string, string> = {
  content_accuracy: "דיוק תוכני",
  task_completion: "מילוי המשימה",
  structure: "מבנה וארגון",
  language: "איכות שפה",
  precision: "דיוק",
};

const SUBJECTS = ["היסטוריה", "אזרחות", "ספרות", "לשון", "מתמטיקה", "אנגלית", "מבוא למדעים"];
const TASK_TYPES = [
  { value: "essay", label: "חיבור / כתיבה" },
  { value: "reading", label: "הבנת הנקרא" },
  { value: "open", label: "שאלה פתוחה" },
  { value: "analysis", label: "ניתוח טקסט / מקור" },
  { value: "short", label: "שאלות קצרות" },
];

const BagrutGradingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin" || user?.role === "coach";

  const [subject, setSubject] = useState(searchParams.get("subject") || "");
  const [taskType, setTaskType] = useState("open");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);

  const handleGrade = async () => {
    if (!question.trim() || !answer.trim()) {
      toast({ title: "שגיאה", description: "יש למלא שאלה ותשובה", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("bagrut-grading", {
        body: { question, answer, subject, taskType },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResult(data);
      toast({ title: "ההערכה הושלמה", description: `ציון: ${data.grade}/100` });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message || "לא ניתן להעריך כרגע", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const gradeColor = (grade: number) =>
    grade >= 80 ? "text-[hsl(var(--success))]" : grade >= 55 ? "text-[hsl(var(--warning))]" : "text-destructive";

  const copyFeedback = () => {
    if (!result) return;
    const text = `📋 הערכת בגרות — ${subject || "כללי"}\n\n📊 ציון: ${result.grade}/100\n\n${Object.entries(result.rubric).map(([k, v]) => `• ${RUBRIC_LABELS[k]}: ${v.score}/${v.max}`).join("\n")}\n\n💬 משוב:\n${result.feedback}\n\n✅ תשובה משופרת:\n${result.improved_answer}`;
    navigator.clipboard.writeText(text);
    toast({ title: "הועתק" });
  };

  const sendWhatsApp = () => {
    if (!result) return;
    const text = `📋 הערכת בגרות — ${subject || "כללי"}\n\n📊 ציון: ${result.grade}/100\n\n${Object.entries(result.rubric).map(([k, v]) => `• ${RUBRIC_LABELS[k]}: ${v.score}/${v.max}`).join("\n")}\n\n💬 משוב:\n${result.feedback}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const exportExcel = () => {
    if (!result) return;
    const rows = Object.entries(result.rubric).map(([k, v]) => ({
      "קטגוריה": RUBRIC_LABELS[k],
      "ציון": v.score,
      "מקסימום": v.max,
      "הערה": v.comment,
    }));
    rows.push({ "קטגוריה": "ציון סופי", "ציון": result.grade, "מקסימום": 100, "הערה": "" });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "הערכה");
    XLSX.writeFile(wb, `הערכת_בגרות_${subject || "כללי"}.xlsx`);
  };

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[760px] mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" strokeWidth={1.5} />
            בוחן בגרות חכם
          </h1>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">הערכה ברמת בגרות אמיתית עם AI</p>
        </div>
      </div>

      {/* Input Form */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10.5px] font-medium text-muted-foreground mb-1.5 block">מקצוע</label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="h-9 text-[11px] rounded-xl">
                <SelectValue placeholder="בחר מקצוע" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => <SelectItem key={s} value={s} className="text-[11px]">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10.5px] font-medium text-muted-foreground mb-1.5 block">סוג משימה</label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger className="h-9 text-[11px] rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-[11px]">{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-[10.5px] font-medium text-muted-foreground mb-1.5 block">
            <BookOpen className="h-3 w-3 inline ml-1" strokeWidth={1.5} />
            שאלה / משימה
          </label>
          <Textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            className="text-[11.5px] min-h-[80px] rounded-xl bg-muted/20 border-border/50 resize-none"
            placeholder="הדבק כאן את השאלה או המשימה..."
          />
        </div>

        <div>
          <label className="text-[10.5px] font-medium text-muted-foreground mb-1.5 block">
            <FileText className="h-3 w-3 inline ml-1" strokeWidth={1.5} />
            תשובת התלמיד
          </label>
          <Textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            className="text-[11.5px] min-h-[120px] rounded-xl bg-muted/20 border-border/50 resize-none"
            placeholder="הדבק כאן את תשובת התלמיד..."
          />
        </div>

        <Button
          onClick={handleGrade}
          disabled={loading || !question.trim() || !answer.trim()}
          className="w-full gap-2 text-[12px] h-10 rounded-xl"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              מעריך...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
              הערך תשובה
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Grade Hero */}
          <div className="bg-card rounded-2xl border border-border p-5 text-center shadow-[var(--shadow-card)]">
            <p className="text-[10px] text-muted-foreground font-medium mb-1">ציון סופי</p>
            <p className={`text-[36px] font-bold leading-none ${gradeColor(result.grade)}`}>
              {result.grade}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">מתוך 100</p>
            <Progress value={result.grade} className="h-2 mt-3 bg-muted/50" />
          </div>

          {/* Rubric */}
          <div className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)]">
            <h3 className="text-[12px] font-semibold text-primary/60 mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              פירוט מחוון
            </h3>
            <div className="space-y-3">
              {Object.entries(result.rubric).map(([key, item]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10.5px] font-medium text-foreground">{RUBRIC_LABELS[key]}</span>
                    <span className={`text-[11px] font-semibold tabular-nums ${gradeColor((item.score / item.max) * 100)}`}>
                      {item.score}/{item.max}
                    </span>
                  </div>
                  <Progress value={(item.score / item.max) * 100} className="h-1.5 bg-muted/50 mb-1" />
                  <p className="text-[9.5px] text-muted-foreground leading-relaxed">{item.comment}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)]">
            <h3 className="text-[12px] font-semibold text-primary/60 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.5} />
              משוב לתלמיד
            </h3>
            <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{result.feedback}</p>
          </div>

          {/* Improved Answer */}
          <div className="bg-primary/5 rounded-2xl border border-primary/10 p-4">
            <h3 className="text-[12px] font-semibold text-primary/60 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
              תשובה משופרת
            </h3>
            <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">{result.improved_answer}</p>
          </div>

          {/* Export Actions */}
          {isTeacher && (
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={copyFeedback} className="gap-1.5 text-[10px] h-8 rounded-xl">
                <Copy className="h-3 w-3" strokeWidth={1.5} />
                העתק משוב
              </Button>
              <Button variant="outline" size="sm" onClick={sendWhatsApp} className="gap-1.5 text-[10px] h-8 rounded-xl">
                <MessageCircle className="h-3 w-3" strokeWidth={1.5} />
                שלח לוואטסאפ
              </Button>
              <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1.5 text-[10px] h-8 rounded-xl">
                <Download className="h-3 w-3" strokeWidth={1.5} />
                ייצא לאקסל
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BagrutGradingPage;
