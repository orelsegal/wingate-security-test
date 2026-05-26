import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, Lock, ChevronLeft, Trophy, Medal,
  Plus, Pencil, Trash2, Brain, Atom, Microscope, FlaskConical, Leaf, Lightbulb
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

/* ═══ Types ═══ */
interface LearningUnit {
  id: string;
  title: string;
  explanation: string;
  link?: string;
  assignment?: string;
}

interface TopicNode {
  id: string;
  title: string;
  emoji: string;
  units: LearningUnit[];
  quizQuestion?: string;
  quizOptions?: string[];
  quizAnswer?: number; // index of correct option
}

/* ═══ Initial data from reference mind map ═══ */
const initialTopics: TopicNode[] = [
  {
    id: "t1",
    title: "בריאות גוף ומדע בקבלת החלטות",
    emoji: "🫀",
    units: [
      { id: "u1a", title: "תפקידי מערכת החיסון", explanation: "מערכת החיסון מגנה על הגוף מפני פתוגנים באמצעות תאים לבנים ונוגדנים." },
      { id: "u1b", title: "חיסונים ובריאות הציבור", explanation: "חיסון מכין את מערכת החיסון לזהות ולתקוף נגיפים וחיידקים ספציפיים." },
    ],
    quizQuestion: "מה תפקידו העיקרי של החיסון?",
    quizOptions: ["לרפא מחלות קיימות", "להכין את מערכת החיסון מראש", "להחליף תרופות", "לחזק את השרירים"],
    quizAnswer: 1,
  },
  {
    id: "t2",
    title: "זמן תגובה וקבלת החלטות",
    emoji: "⚡",
    units: [
      { id: "u2a", title: "זמן תגובה – מהו ואיך מודדים?", explanation: "זמן תגובה הוא הזמן שלוקח לאדם להגיב לגירוי חיצוני. הוא מושפע מגיל, עייפות ומצב גופני." },
      { id: "u2b", title: "שיפור זמן תגובה בספורט", explanation: "אימון קבוע, שינה מספקת ותזונה נכונה משפרים את זמן התגובה של הספורטאי." },
      { id: "u2c", title: "קבלת החלטות מהירה בלחץ", explanation: "ספורטאים מתמודדים עם קבלת החלטות תחת לחץ – הבנת התהליך המדעי מאחורי זה מסייעת." },
    ],
    quizQuestion: "מה משפיע על זמן התגובה?",
    quizOptions: ["צבע העיניים", "עייפות ומצב גופני", "גובה האדם", "סוג הנעליים"],
    quizAnswer: 1,
  },
  {
    id: "t3",
    title: "שינוי אקלים, סביבה ואחריות אזרחית",
    emoji: "🌍",
    units: [
      { id: "u3a", title: "אפקט החממה והתחממות גלובלית", explanation: "גזי חממה לוכדים חום באטמוספירה וגורמים לעליית הטמפרטורה הממוצעת של כדור הארץ." },
      { id: "u3b", title: "השפעת שינוי האקלים על הספורט", explanation: "שינוי אקלים משפיע על תנאי אימון, בריאות ספורטאים ולוחות תחרויות." },
      { id: "u3c", title: "אחריות אזרחית וסביבתית", explanation: "לכל אדם תפקיד בשמירה על הסביבה – מיחזור, צמצום פליטות ומודעות." },
    ],
    quizQuestion: "מהו אפקט החממה?",
    quizOptions: ["קרינה שמגיעה מהחלל", "לכידת חום באטמוספירה", "תהליך גדילת צמחים", "סוג של ענן"],
    quizAnswer: 1,
  },
  {
    id: "t4",
    title: "חשיבה מדעית בעולם של החלטות",
    emoji: "🔬",
    units: [
      { id: "u4a", title: "השיטה המדעית", explanation: "השיטה המדעית כוללת: שאלה → השערה → ניסוי → ניתוח → מסקנה. זהו הבסיס לכל מחקר מדעי." },
      { id: "u4b", title: "הטיות חשיבה ומידע מטעה", explanation: "הטיית אישור, דוגמנות סלקטיבית ומידע שגוי ברשת – כלים לזהות ולהתמודד." },
      { id: "u4c", title: "יישום חשיבה ביקורתית בספורט", explanation: "ספורטאים צריכים לנתח מידע ביקורתית – ממתודות אימון ועד תזונה ומשקאות אנרגיה." },
    ],
    quizQuestion: "מהי השלב הראשון בשיטה המדעית?",
    quizOptions: ["ניסוי", "השערה", "שאלת מחקר", "מסקנה"],
    quizAnswer: 2,
  },
];

const topicIcons = [FlaskConical, Atom, Leaf, Microscope];

/* ═══ Medal definitions ═══ */
const medals = [
  { id: "bronze", title: "מדליית ארד", req: "השלמת 85% מיחידות הלימוד", threshold: 0.85, color: "from-amber-600 to-amber-800" },
  { id: "silver", title: "מדליית כסף", req: "השלמת 95% מיחידות הלימוד", threshold: 0.95, color: "from-slate-300 to-slate-500" },
  { id: "gold", title: "מדליית זהב", req: "השלמת את כל יחידות הלימוד", threshold: 1.0, color: "from-yellow-400 to-amber-500" },
];

/* ═══ Component ═══ */
const ScienceIntroPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isTeacher = user?.role === "admin" || user?.role === "teacher";

  const [topics, setTopics] = useState<TopicNode[]>(initialTopics);
  const [completedUnits, setCompletedUnits] = useState<Set<string>>(new Set());
  const [passedQuizzes, setPassedQuizzes] = useState<Set<string>>(new Set());
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<LearningUnit | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | null>>({});
  const [showMonsters, setShowMonsters] = useState(false);

  // Teacher edit states
  const [editOpen, setEditOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<TopicNode | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const totalUnits = useMemo(() => topics.reduce((sum, t) => sum + t.units.length, 0), [topics]);
  const completedCount = completedUnits.size;
  const progressPct = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0;

  const isTopicUnlocked = (index: number) => {
    if (index === 0) return true;
    return passedQuizzes.has(topics[index - 1].id);
  };

  const handleQuizAnswer = (topicId: string, answerIndex: number) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;
    setQuizAnswers(prev => ({ ...prev, [topicId]: answerIndex }));
    if (answerIndex === topic.quizAnswer) {
      setPassedQuizzes(prev => new Set(prev).add(topicId));
      toast.success("תשובה נכונה! הנושא הבא נפתח 🎉");
    } else {
      toast.error("תשובה שגויה, נסה/י שוב");
      setShowMonsters(true);
    }
  };

  const toggleUnitComplete = (unitId: string) => {
    setCompletedUnits(prev => {
      const next = new Set(prev);
      next.has(unitId) ? next.delete(unitId) : next.add(unitId);
      return next;
    });
  };

  // Teacher: add node
  const addNode = () => {
    const newNode: TopicNode = {
      id: `t-${Date.now()}`,
      title: "נושא חדש",
      emoji: "📘",
      units: [],
    };
    setTopics(prev => [...prev, newNode]);
    toast.success("נושא חדש נוסף");
  };

  const openEditNode = (node: TopicNode) => {
    setEditingNode(node);
    setEditTitle(node.title);
    setEditOpen(true);
  };

  const saveEditNode = () => {
    if (!editingNode) return;
    setTopics(prev => prev.map(t => t.id === editingNode.id ? { ...t, title: editTitle } : t));
    setEditOpen(false);
    toast.success("עודכן בהצלחה");
  };

  const deleteNode = () => {
    if (!deleteTarget) return;
    setTopics(prev => prev.filter(t => t.id !== deleteTarget));
    setDeleteTarget(null);
    toast.success("הנושא נמחק");
  };

  return (
    <div className="p-5 md:p-10 lg:p-14 max-w-[720px] mx-auto" dir="rtl">
      {showMonsters && <MonsterBurst onDone={() => setShowMonsters(false)} />}
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/subjects")} className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] md:text-[21px] font-medium text-foreground tracking-tight leading-tight flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" strokeWidth={1.5} />
            מבוא למדעים לבגרות
          </h1>
          <p className="text-[11px] text-muted-foreground/60 mt-1">מפת הדרכים שלך</p>
        </div>
        {isTeacher && (
          <Button size="sm" onClick={addNode} className="gap-1.5 text-[11px]">
            <Plus className="h-3.5 w-3.5" />
            הוסף נושא
          </Button>
        )}
      </div>

      {/* Progress overview */}
      <div className="bg-card rounded-2xl border border-border p-5 mb-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-muted-foreground">התקדמות כללית</span>
          <span className="text-[13px] font-bold text-primary tabular-nums">{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-2.5 bg-muted/50 mb-2" />
        <p className="text-[10px] text-muted-foreground/60">{completedCount} מתוך {totalUnits} יחידות הושלמו</p>
      </div>

      {/* ═══ Mind Map / Topic Cards ═══ */}
      <h2 className="text-[12px] font-semibold text-primary/60 mb-4 tracking-tight flex items-center gap-1.5">
        <Brain className="h-3.5 w-3.5" strokeWidth={1.5} />
        נושאי הלימוד
      </h2>

      <div className="relative flex flex-col gap-4">
        {/* Visual connector line */}
        <div className="absolute top-6 bottom-6 right-[23px] w-[2px] bg-gradient-to-b from-primary/20 via-primary/10 to-transparent rounded-full" />

        {topics.map((topic, ti) => {
          const unlocked = isTopicUnlocked(ti);
          const expanded = expandedTopic === topic.id;
          const topicUnits = topic.units;
          const doneCount = topicUnits.filter(u => completedUnits.has(u.id)).length;
          const topicPct = topicUnits.length > 0 ? Math.round((doneCount / topicUnits.length) * 100) : 0;
          const quizPassed = passedQuizzes.has(topic.id);
          const TopicIcon = topicIcons[ti % topicIcons.length];

          return (
            <div key={topic.id} className="relative animate-fade-in-up" style={{ animationDelay: `${ti * 60}ms` }}>
              {/* Node dot on the line */}
              <div className={`absolute right-[15px] top-5 w-[18px] h-[18px] rounded-full border-2 z-10 flex items-center justify-center ${
                !unlocked ? "border-muted-foreground/20 bg-muted" :
                topicPct === 100 ? "border-[hsl(var(--success))] bg-[hsl(var(--success))]/15" :
                "border-primary/40 bg-primary/10"
              }`}>
                {topicPct === 100 ? (
                  <CheckCircle2 className="h-2.5 w-2.5 text-[hsl(var(--success))]" strokeWidth={2} />
                ) : !unlocked ? (
                  <Lock className="h-2.5 w-2.5 text-muted-foreground/40" strokeWidth={2} />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>

              {/* Card */}
              <div className={`mr-12 ${!unlocked ? "opacity-50 pointer-events-none" : ""}`}>
                <button
                  onClick={() => unlocked && setExpandedTopic(expanded ? null : topic.id)}
                  className={`w-full bg-card rounded-2xl border border-border p-4 text-start transition-all duration-300 ${
                    unlocked ? "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer" : ""
                  } ${expanded ? "ring-1 ring-primary/15" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      topicPct === 100 ? "bg-[hsl(var(--success))]/10" : "bg-primary/8"
                    }`}>
                      <span className="text-[18px]">{topic.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9.5px] text-muted-foreground font-medium">נושא {ti + 1}</p>
                      <h3 className="text-[13px] font-semibold text-foreground leading-tight mt-0.5">{topic.title}</h3>
                      <p className="text-[10px] text-muted-foreground mt-1">{topicUnits.length} יחידות לימוד · {doneCount} מתוך {topicUnits.length} הושלמו</p>
                    </div>
                    {isTeacher && unlocked && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); openEditNode(topic); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                          <Pencil className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(topic.id); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                    {!unlocked && <Lock className="h-4 w-4 text-muted-foreground/30 shrink-0" strokeWidth={1.5} />}
                  </div>
                  {unlocked && (
                    <div className="mt-3">
                      <Progress value={topicPct} className="h-1.5 bg-muted/50" />
                    </div>
                  )}
                </button>

                {/* Expanded content */}
                {expanded && unlocked && (
                  <div className="mt-3 space-y-3 animate-fade-in-up">
                    {/* Units */}
                    {topicUnits.map((unit, ui) => {
                      const done = completedUnits.has(unit.id);
                      return (
                        <div
                          key={unit.id}
                          className={`bg-card rounded-xl border border-border p-3.5 shadow-[var(--shadow-card)] transition-all duration-200 ${
                            done ? "border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/[0.02]" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => toggleUnitComplete(unit.id)}
                              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                done ? "border-[hsl(var(--success))] bg-[hsl(var(--success))]/15" : "border-muted-foreground/20 hover:border-primary/40"
                              }`}
                            >
                              {done && <CheckCircle2 className="h-3 w-3 text-[hsl(var(--success))]" strokeWidth={2} />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[12px] font-semibold text-foreground leading-tight">{unit.title}</h4>
                              <p className="text-[10.5px] text-muted-foreground mt-1.5 leading-relaxed">{unit.explanation}</p>
                              {unit.link && (
                                <a href={unit.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary mt-1.5 block hover:underline">
                                  חומר נוסף →
                                </a>
                              )}
                              {unit.assignment && (
                                <p className="text-[10px] text-primary/60 mt-1.5 bg-primary/5 rounded-lg px-2.5 py-1.5 inline-block">
                                  📝 {unit.assignment}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Quiz */}
                    {topic.quizQuestion && !quizPassed && (
                      <div className="bg-primary/[0.03] rounded-2xl border border-primary/10 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[14px]">📝</span>
                          <h4 className="text-[12px] font-semibold text-foreground">מבדק – {topic.title}</h4>
                        </div>
                        <p className="text-[10.5px] text-muted-foreground mb-1">ענה/י נכון כדי לפתוח את הנושא הבא</p>
                        <p className="text-[12px] font-medium text-foreground mb-3">{topic.quizQuestion}</p>
                        <div className="flex flex-col gap-2">
                          {topic.quizOptions?.map((opt, oi) => {
                            const selected = quizAnswers[topic.id] === oi;
                            const isCorrect = topic.quizAnswer === oi;
                            const answered = quizAnswers[topic.id] != null;
                            return (
                              <button
                                key={oi}
                                onClick={() => !quizPassed && handleQuizAnswer(topic.id, oi)}
                                className={`w-full text-start px-3.5 py-2.5 rounded-xl text-[11px] border transition-all ${
                                  selected && isCorrect ? "bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/30 text-[hsl(var(--success))]" :
                                  selected && !isCorrect ? "bg-destructive/10 border-destructive/30 text-destructive" :
                                  "border-border bg-card hover:bg-accent/50"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {quizPassed && (
                      <div className="flex items-center gap-2 bg-[hsl(var(--success))]/10 rounded-xl p-3 border border-[hsl(var(--success))]/15">
                        <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" strokeWidth={1.5} />
                        <span className="text-[11px] text-[hsl(var(--success))] font-medium">מבדק הושלם בהצלחה!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ Medals ═══ */}
      <section className="mt-10 mb-6">
        <h2 className="text-[12px] font-semibold text-primary/60 mb-4 tracking-tight flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5" strokeWidth={1.5} />
          ההישגים שלי
        </h2>
        <p className="text-[10px] text-muted-foreground mb-4">{medals.filter(m => progressPct / 100 >= m.threshold).length} מתוך {medals.length} מדליות הושגו</p>
        <div className="grid grid-cols-3 gap-3">
          {medals.map(m => {
            const earned = progressPct / 100 >= m.threshold;
            return (
              <div
                key={m.id}
                className={`bg-card rounded-2xl border border-border p-4 text-center shadow-[var(--shadow-card)] transition-all ${
                  earned ? "ring-1 ring-primary/20" : "opacity-50"
                }`}
              >
                <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                  earned ? `bg-gradient-to-br ${m.color}` : "bg-muted"
                }`}>
                  {earned ? (
                    <Medal className="h-5 w-5 text-white" strokeWidth={1.5} />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.5} />
                  )}
                </div>
                <h3 className="text-[11px] font-semibold text-foreground">{m.title}</h3>
                <p className="text-[9px] text-muted-foreground mt-0.5">{m.req}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Branding */}
      <div className="mt-16 text-center">
        <span className="text-[8.5px] text-muted-foreground/20 font-normal tracking-wider">
          האקדמיה למצוינות · מכון וינגייט
        </span>
      </div>

      {/* Edit Node Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent dir="rtl" className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-[15px]">עריכת נושא</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground font-medium">כותרת</label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-[13px]" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveEditNode} className="flex-1 text-[12px]" disabled={!editTitle.trim()}>שמור</Button>
              <Button variant="outline" onClick={() => setEditOpen(false)} className="text-[12px]">ביטול</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteNode}
        title="מחיקת נושא"
        description="האם למחוק את הנושא? הפעולה לא ניתנת לביטול."
        confirmLabel="מחק"
        destructive
      />
    </div>
  );
};

export default ScienceIntroPage;
