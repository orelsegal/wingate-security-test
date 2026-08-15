import { useState } from "react";
import {
  Sparkles, Loader2, Copy, Send, FileText,
  ClipboardList, BookOpen, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CONTENT_TYPES = [
  { value: "quiz", label: "בוחן / מבדק", icon: ClipboardList },
  { value: "assignment", label: "מטלה / עבודה", icon: FileText },
  { value: "rubric", label: "מחוון (רובריקה)", icon: CheckCircle2 },
  { value: "worksheet", label: "דף עבודה", icon: BookOpen },
  { value: "review", label: "שאלות חזרה", icon: BookOpen },
];

const SUBJECTS = ["אנגלית", "מתמטיקה", "היסטוריה", "אזרחות", "ספרות", "לשון", "מבוא למדעים"];

const QUICK_PROMPTS = [
  "צור בוחן עם 5 שאלות על הנושא שלמדנו",
  "צור מטלת כתיבה ל-70-90 מילים",
  "צור מחוון לבדיקת חיבור",
  "צור שאלות חזרה לקראת מבחן",
  "צור דף עבודה מותאם לתלמידים חלשים",
  "צור מפתח תשובות למבחן",
];

interface Props {
  defaultSubject?: string;
  compact?: boolean;
}

const TeacherAIAssistant = ({ defaultSubject, compact }: Props) => {
  const [prompt, setPrompt] = useState("");
  const [subject, setSubject] = useState(defaultSubject || "");
  const [contentType, setContentType] = useState("quiz");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; content: string; type: string } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "שגיאה", description: "יש לכתוב בקשה", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("teacher-ai", {
        body: { prompt, subject, contentType, level: "" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResult(data);
      toast({ title: "התוכן נוצר בהצלחה" });
    } catch (e: any) {
      toast({ title: "שגיאה", description: e.message || "לא ניתן ליצור כרגע", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyContent = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.content);
    toast({ title: "הועתק" });
  };

  /* wa.me sharing removed (security): AI-generated content is never pushed
     to an external channel; the teacher copies and decides what to share. */

  // Collapsed view — just a button
  if (!isExpanded && compact) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full bg-gradient-to-l from-primary/8 to-primary/[0.03] rounded-2xl border border-primary/12 p-4 text-start hover:from-primary/12 hover:to-primary/5 transition-all duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/12 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-foreground leading-tight">עוזר AI למורה</p>
            <p className="text-[10px] text-muted-foreground font-normal mt-0.5">צור בחנים, מטלות, מחוונים ודפי עבודה</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[12.5px] font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.5} />
          עוזר AI למורה
        </h3>
        {compact && (
          <button onClick={() => setIsExpanded(false)} className="text-[10px] text-muted-foreground hover:text-foreground">
            סגור
          </button>
        )}
      </div>

      {!result ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="h-8 text-[10.5px] rounded-lg">
                <SelectValue placeholder="מקצוע" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map(s => <SelectItem key={s} value={s} className="text-[10.5px]">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="h-8 text-[10.5px] rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-[10.5px]">{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.slice(0, 4).map((qp, i) => (
              <button
                key={i}
                onClick={() => setPrompt(qp)}
                className="text-[9px] px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {qp}
              </button>
            ))}
          </div>

          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="מה תרצה ליצור? לדוגמה: ׳צור בוחן על Main Idea ברמת 5 יחידות׳"
            className="text-[11px] min-h-[70px] rounded-xl bg-muted/20 border-border/50 resize-none"
          />

          <Button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full gap-2 text-[11px] h-9 rounded-xl"
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> יוצר תוכן...</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} /> צור תוכן</>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3 animate-fade-in-up">
          <div className="bg-muted/30 rounded-xl p-4 max-h-[400px] overflow-y-auto">
            <h4 className="text-[12px] font-semibold text-foreground mb-2">{result.title}</h4>
            <div className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">
              {result.content}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={copyContent} className="gap-1.5 text-[10px] h-7 rounded-lg">
              <Copy className="h-3 w-3" strokeWidth={1.5} />
              העתק
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setResult(null)} className="text-[10px] h-7 rounded-lg mr-auto">
              צור תוכן חדש
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAIAssistant;
