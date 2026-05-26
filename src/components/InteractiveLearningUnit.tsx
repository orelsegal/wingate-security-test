import { useState, useCallback } from "react";
import confetti from "canvas-confetti";
import type { UnitDef } from "@/lib/courseContent";
import {
  ChevronDown, ChevronUp, CheckCircle2, BookOpen,
  Lightbulb, PenLine, HelpCircle, Sparkles, PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import FailureFeedback from "@/components/FailureFeedback";

const FEEDBACK_MESSAGES = {
  correct: [
    "מצוין — שלטת היטב במושג הזה",
    "יפה מאוד — תשובה מדויקת",
    "נכון! הבנה מעולה",
    "בול — ממשיכים קדימה",
  ],
  incorrect: [
    "כמעט שם — קרא שוב את ההסבר ונסה שנית",
    "לא בדיוק — שים לב לפרטים",
    "נסה שוב — התשובה הנכונה מופיעה בהסבר למעלה",
  ],
};

const randomFeedback = (correct: boolean) => {
  const arr = correct ? FEEDBACK_MESSAGES.correct : FEEDBACK_MESSAGES.incorrect;
  return arr[Math.floor(Math.random() * arr.length)];
};

const fireConfetti = () => {
  const colors = ["#10b981", "#a78bfa", "#fbbf24", "#f472b6", "#34d399", "#60a5fa"];
  confetti({ particleCount: 70, angle: 60,  spread: 52, origin: { x: 0,   y: 0.72 }, colors, startVelocity: 52, ticks: 90, scalar: 0.9, zIndex: 9999 });
  confetti({ particleCount: 70, angle: 120, spread: 52, origin: { x: 1,   y: 0.72 }, colors, startVelocity: 52, ticks: 90, scalar: 0.9, zIndex: 9999 });
  setTimeout(() => confetti({ particleCount: 40, spread: 80, origin: { x: 0.5, y: 0 }, colors: ["#fbbf24","#f59e0b","#fcd34d","#fff"], shapes: ["star"], scalar: 1.3, startVelocity: 20, ticks: 120, gravity: 0.6, zIndex: 9999 }), 180);
};


interface Props {
  unit: UnitDef;
  coveredTopics: string[];
  onTopicComplete?: (topicTitle: string) => void;
}

const InteractiveLearningUnit = ({ unit, coveredTopics, onTopicComplete }: Props) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(
    unit.items.find(i => !coveredTopics.includes(i.title))?.id || null
  );
  // Which answer the student currently has selected for each question (null = nothing)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number | null>>({});
  // Questions permanently solved (correct answer given — locked forever)
  const [quizSolved, setQuizSolved] = useState<Set<string>>(new Set());
  const [quizFeedback, setQuizFeedback] = useState<Record<string, { correct: boolean; message: string } | null>>({});
  const [practiceText, setPracticeText] = useState<Record<string, string>>({});

  /* Failure feedback animation state */
  const [failureVisible, setFailureVisible] = useState(false);
  const [failureAttempt, setFailureAttempt] = useState(1);
  const [wrongAttempts, setWrongAttempts] = useState<Record<string, number>>({});


  const completedCount = unit.items.filter(i => coveredTopics.includes(i.title)).length;
  const pct = unit.items.length > 0 ? Math.round((completedCount / unit.items.length) * 100) : 0;

  const handleQuizAnswer = useCallback((itemId: string, quizIdx: number, selectedIdx: number, correctIdx: number) => {
    const key = `${itemId}-${quizIdx}`;
    const isCorrect = selectedIdx === correctIdx;

    // Always record the current selection (replaces previous — no need to clear)
    setQuizAnswers(prev => ({ ...prev, [key]: selectedIdx }));
    setQuizFeedback(prev => ({ ...prev, [key]: { correct: isCorrect, message: randomFeedback(isCorrect) } }));

    if (isCorrect) {
      // Lock permanently — correct answer, we're done with this question
      setQuizSolved(prev => { const s = new Set(prev); s.add(key); return s; });
      fireConfetti();
    } else {
      // Wrong — trigger fun animation, but DON'T lock the buttons.
      // The user can click another option immediately (no timeout, no disabled state).
      setWrongAttempts(prev => {
        const next = { ...prev, [key]: (prev[key] || 0) + 1 };
        setFailureAttempt(next[key]);
        setFailureVisible(true);
        return next;
      });
    }
  }, []);

  return (
    <div className="space-y-3">
      {/* Failure feedback overlay */}
      <FailureFeedback
        visible={failureVisible}
        attemptCount={failureAttempt}
        onDone={() => setFailureVisible(false)}
      />

      {/* Unit header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
          <BookOpen className="h-4 w-4 text-primary" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-semibold text-foreground leading-tight">{unit.title}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{completedCount} מתוך {unit.items.length} נושאים</p>
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5 bg-muted/50 mb-3" />

      {/* Items */}
      {unit.items.map((item, idx) => {
        const isDone = coveredTopics.includes(item.title);
        const isOpen = expandedItem === item.id;

        return (
          <div
            key={item.id}
            className={`bg-card rounded-2xl border transition-all duration-300 ${
              isOpen ? "border-primary/20 shadow-[var(--shadow-card-hover)]" : "border-border shadow-[var(--shadow-card)]"
            }`}
          >
            {/* Topic header */}
            <button
              onClick={() => setExpandedItem(isOpen ? null : item.id)}
              className="w-full flex items-center gap-3 p-4 text-start"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isDone ? "bg-[hsl(var(--success))]/10" : "bg-muted/60"
              }`}>
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" strokeWidth={1.5} />
                ) : (
                  <span className="text-[10px] font-semibold text-muted-foreground">{idx + 1}</span>
                )}
              </div>
              <span className={`text-[12px] font-medium flex-1 ${isDone ? "text-foreground" : "text-foreground/80"}`}>
                {item.title}
              </span>
              {isOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50" strokeWidth={1.5} />
              )}
            </button>

            {/* Expanded content */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-4 animate-fade-in-up">
                {/* Explanation */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookOpen className="h-3 w-3 text-primary/60" strokeWidth={1.5} />
                    <span className="text-[10px] font-semibold text-primary/60">הסבר</span>
                  </div>
                  <p className="text-[11.5px] text-foreground leading-relaxed whitespace-pre-wrap">
                    {item.explanation}
                  </p>
                </div>

                {/* Videos */}
                {item.videos && item.videos.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <PlayCircle className="h-3 w-3 text-primary/60" strokeWidth={1.5} />
                      <span className="text-[10px] font-semibold text-primary/60">סרטוני הסבר ({item.videos.length})</span>
                    </div>
                    {item.videos.map((v, vi) => {
                      const m = v.url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
                      const id = m?.[1];
                      return (
                        <div key={vi} className="bg-card rounded-xl border border-border overflow-hidden">
                          {id ? (
                            <div className="aspect-video w-full bg-black">
                              <iframe
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${id}`}
                                title={v.label}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : null}
                          <a
                            href={v.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block px-3 py-2 text-[11px] text-foreground hover:bg-muted/30 transition-colors"
                          >
                            {v.label}
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Example */}
                {item.example && (
                  <div className="bg-primary/[0.04] rounded-xl p-4 border border-primary/8">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="h-3 w-3 text-primary/60" strokeWidth={1.5} />
                      <span className="text-[10px] font-semibold text-primary/60">דוגמה</span>
                    </div>
                    <p className="text-[11px] text-foreground leading-relaxed whitespace-pre-wrap">
                      {item.example}
                    </p>
                  </div>
                )}

                {/* Practice */}
                {item.practice && (
                  <div className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <PenLine className="h-3 w-3 text-[hsl(var(--warning))]/70" strokeWidth={1.5} />
                      <span className="text-[10px] font-semibold text-[hsl(var(--warning))]/70">תרגול</span>
                    </div>
                    <p className="text-[11px] text-foreground leading-relaxed mb-3 whitespace-pre-wrap">
                      {item.practice}
                    </p>
                    <Textarea
                      value={practiceText[item.id] || ""}
                      onChange={e => setPracticeText(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="כתוב את תשובתך כאן..."
                      className="text-[11px] min-h-[60px] rounded-lg bg-muted/20 border-border/50 resize-none"
                    />
                  </div>
                )}

                {/* Quiz */}
                {item.quiz && item.quiz.map((q, qi) => {
                  const key = `${item.id}-${qi}`;
                  const solved = quizSolved.has(key);      // got it right — locked forever
                  const selected = quizAnswers[key];       // which option is currently highlighted
                  const hasSelection = selected != null;
                  const fb = quizFeedback[key];

                  return (
                    <div key={qi} className="bg-card rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <HelpCircle className="h-3 w-3 text-primary/50" strokeWidth={1.5} />
                          <span className="text-[10px] font-semibold text-primary/50">בדיקת הבנה</span>
                        </div>
                        {/* Retry hint — shows after a wrong attempt */}
                        {hasSelection && !solved && (
                          <span className="text-[9.5px] font-semibold text-primary/40 animate-pulse">
                            ← בחר תשובה אחרת
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] font-medium text-foreground mb-3">{q.question}</p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {q.options.map((opt, oi) => {
                          const isSelected = selected === oi;
                          const isCorrectOption = oi === q.correct;

                          let btnClass = "bg-muted/30 text-foreground hover:bg-muted/50 hover:scale-[1.01]";

                          if (solved) {
                            // Question is done — highlight correct answer, grey everything else
                            if (isCorrectOption) btnClass = "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/30";
                            else btnClass = "bg-muted/20 text-muted-foreground/50";
                          } else if (isSelected) {
                            // This option was the last wrong pick — show red, still clickable
                            btnClass = "bg-destructive/10 text-destructive border-destructive/30 ring-1 ring-destructive/20";
                          }

                          return (
                            <button
                              key={oi}
                              onClick={() => !solved && handleQuizAnswer(item.id, qi, oi, q.correct)}
                              disabled={solved}
                              className={`text-start px-3 py-2 rounded-lg text-[11px] border border-transparent transition-all duration-150 ${btnClass} ${!solved ? "cursor-pointer active:scale-[0.98]" : "cursor-default"}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {/* Feedback strip */}
                      {fb && (
                        <div className={`mt-2.5 flex items-center gap-2 px-3 py-2 rounded-lg text-[10.5px] transition-all ${
                          fb.correct
                            ? "bg-[hsl(var(--success))]/8 text-[hsl(var(--success))]"
                            : hasSelection
                              ? "bg-muted/40 text-muted-foreground"
                              : "opacity-0 pointer-events-none"
                        }`}>
                          {fb.correct
                            ? <CheckCircle2 className="h-3 w-3 shrink-0 text-[hsl(var(--success))]" strokeWidth={1.5} />
                            : <span className="text-[12px]">🍅</span>}
                          <span>{fb.correct ? fb.message : "לא בדיוק — בחר תשובה אחרת!"}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Tip */}
                {item.tip && (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-[hsl(var(--warning))]/5 rounded-lg border border-[hsl(var(--warning))]/10">
                    <Sparkles className="h-3 w-3 text-[hsl(var(--warning))] shrink-0 mt-0.5" strokeWidth={1.5} />
                    <p className="text-[10px] text-foreground/80 leading-relaxed">{item.tip}</p>
                  </div>
                )}

                {/* Mark complete */}
                {!isDone && onTopicComplete && (
                  <Button
                    size="sm"
                    onClick={() => onTopicComplete(item.title)}
                    className="w-full gap-1.5 text-[11px] h-9 rounded-xl"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    סיימתי — המשך הלאה
                  </Button>
                )}

                {isDone && (
                  <div className="flex items-center gap-2 justify-center py-1">
                    <CheckCircle2 className="h-3 w-3 text-[hsl(var(--success))]" strokeWidth={1.5} />
                    <span className="text-[10px] text-[hsl(var(--success))] font-medium">נושא הושלם</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default InteractiveLearningUnit;
