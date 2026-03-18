import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, AlertCircle, CheckCircle2, Target, AlertTriangle, ShieldAlert, ChevronDown, Loader2 } from "lucide-react";
import InitialsAvatar from "@/components/InitialsAvatar";
import { useStudent, useStudentProgress, useStudentRoadmap, statusConfig, type StatusType } from "@/hooks/useStudents";
import { StatusBadge } from "@/components/StatusBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line,
} from "recharts";

const ProgressRing = ({ value }: { value: number }) => {
  const radius = 40;
  const stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "hsl(var(--success))" : value >= 65 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth={stroke} />
        <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700 ease-out" />
      </svg>
      <span className="absolute text-[22px] font-semibold text-foreground">{value}</span>
    </div>
  );
};

const MATH_SUBJECT_ID = "a1111111-0000-0000-0000-000000000001";

const StudentProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: student, isLoading: studentLoading } = useStudent(id || "");
  const { data: subjectProgress = [], isLoading: progressLoading } = useStudentProgress(id || "");

  const [mathLevel, setMathLevel] = useState<number | null>(null);
  const effectiveMathLevel = mathLevel ?? student?.math_level ?? 3;
  const { data: roadmapItems = [] } = useStudentRoadmap(id || "", effectiveMathLevel);

  const [expanded, setExpanded] = useState<string | null>(null);

  if (studentLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground">הספורטאי לא נמצא</p>
      </div>
    );
  }

  // Access control
  const hasAccess =
    user?.role === "admin" ||
    user?.role === "teacher" ||
    (user?.role === "parent" && user.scopeFilter?.includes(student.id)) ||
    (user?.role === "coach" && user.scopeFilter?.includes(student.sport));

  if (!hasAccess) {
    return (
      <div className="p-10 text-center space-y-3">
        <ShieldAlert className="h-10 w-10 text-destructive mx-auto" strokeWidth={1.5} />
        <p className="text-foreground font-medium">אין הרשאת גישה</p>
        <p className="text-muted-foreground text-[13px]">אין לך הרשאה לצפות בפרופיל זה.</p>
        <button onClick={() => navigate("/")} className="text-primary text-[13px] hover:underline mt-2">חזרה לדף הראשי</button>
      </div>
    );
  }

  const overallProgress = subjectProgress.length > 0
    ? Math.round(subjectProgress.reduce((sum, sp) => sum + (sp.grade || 0), 0) / subjectProgress.length)
    : student.completion_percent;

  const handleToggleRoadmapItem = async (itemId: string, currentCompleted: boolean) => {
    const newCompleted = !currentCompleted;
    if (currentCompleted) {
      // Mark as incomplete - delete the progress record
      await supabase
        .from("student_roadmap_progress")
        .delete()
        .eq("student_id", student.id)
        .eq("roadmap_item_id", itemId);
    } else {
      // Mark as complete - upsert
      await supabase
        .from("student_roadmap_progress")
        .upsert({
          student_id: student.id,
          roadmap_item_id: itemId,
          completed: true,
          completion_date: new Date().toISOString(),
        }, { onConflict: "student_id,roadmap_item_id" });
    }
    queryClient.invalidateQueries({ queryKey: ["student-roadmap", student.id] });
  };

  const handleMathLevelChange = async (level: number) => {
    setMathLevel(level);
    await supabase
      .from("students")
      .update({ math_level: level })
      .eq("id", student.id);
    queryClient.invalidateQueries({ queryKey: ["student", student.id] });
  };

  // Group roadmap items by subject
  const roadmapBySubject = useMemo(() => {
    const map = new Map<string, typeof roadmapItems>();
    roadmapItems.forEach((item) => {
      const subjName = (item as any).subjects?.subject_name || "אחר";
      if (!map.has(subjName)) map.set(subjName, []);
      map.get(subjName)!.push(item);
    });
    return map;
  }, [roadmapItems]);

  return (
    <div className="p-5 md:p-10 lg:p-12 space-y-6 md:space-y-8 max-w-[1400px]">
      {/* Back button */}
      <button
        onClick={() => navigate("/students")}
        className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors duration-150"
      >
        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        <span>חזרה לרשימת ספורטאים</span>
      </button>

      {/* Hero Card */}
      <div className="card-premium p-5 md:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-5 md:gap-7">
          <InitialsAvatar name={student.full_name} size="lg" />
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground tracking-tight">{student.full_name}</h2>
              <StatusBadge type={student.overall_status as StatusType} size="md" />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" strokeWidth={1.5} />
                {student.sport}
              </span>
              <span className="text-border">·</span>
              <span>כיתה {student.class_name}</span>
              <span className="text-border">·</span>
              <span>ממוצע {student.avg_score}</span>
              <span className="text-border">·</span>
              <span>מתמטיקה {effectiveMathLevel} יח״ל</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 shrink-0">
            <ProgressRing value={overallProgress} />
            <span className="text-[12px] text-muted-foreground">ציון משוקלל</span>
          </div>
        </div>
      </div>

      {/* Math Level Selector */}
      <div className="card-premium p-5 md:p-7">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">רמת מתמטיקה</h3>
            <p className="text-[13px] text-muted-foreground mt-1">בחירת מספר יחידות לימוד משנה את דרישות ההשלמה</p>
          </div>
        </div>
        <div className="flex gap-2">
          {[3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => handleMathLevelChange(level)}
              className={`px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                effectiveMathLevel === level
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-accent text-muted-foreground hover:bg-accent/80 hover:text-foreground"
              }`}
            >
              {level} יח״ל
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      {subjectProgress.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          <div className="card-premium p-5 md:p-7">
            <div className="mb-6">
              <h3 className="text-[15px] font-semibold text-foreground">ציונים לפי מקצוע</h3>
              <p className="text-[13px] text-muted-foreground mt-1">השוואת ציונים בין המקצועות</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={subjectProgress.map(sp => ({ name: (sp as any).subjects?.subject_name || "", ציון: sp.grade || 0 }))} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, direction: "rtl" }} cursor={{ fill: "hsl(var(--accent))", radius: 8 }} />
                <Bar dataKey="ציון" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card-premium p-5 md:p-7">
            <div className="mb-6">
              <h3 className="text-[15px] font-semibold text-foreground">פרופיל אקדמי</h3>
              <p className="text-[13px] text-muted-foreground mt-1">מיפוי רמות לפי מקצוע</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={subjectProgress.map(sp => ({ subject: (sp as any).subjects?.subject_name || "", ציון: sp.grade || 0, fullMark: 100 }))}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="ציון" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      <div className="card-premium p-5 md:p-7">
        <div className="mb-6">
          <h3 className="text-[15px] font-semibold text-foreground">מגמת ממוצע</h3>
          <p className="text-[13px] text-muted-foreground mt-1">התפתחות הציון הממוצע &middot; סמסטר א׳ תשפ״ה</p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={(() => {
            const base = overallProgress;
            const months = ["ספט׳", "אוק׳", "נוב׳", "דצמ׳", "ינו׳", "פבר׳"];
            return months.map((m, i) => ({
              month: m,
              ממוצע: Math.max(40, Math.min(100, Math.round(base - 15 + i * 3 + (Math.sin(i * 1.5) * 4)))),
            }));
          })()} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis domain={[40, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
            <RechartsTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12, direction: "rtl" }} />
            <Line type="monotone" dataKey="ממוצע" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--card))", stroke: "hsl(var(--primary))", strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Subject Progress Detail */}
      <div>
        <h3 className="text-[15px] font-semibold text-foreground mb-4">פירוט לפי מקצוע</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {subjectProgress.map((sp) => {
            const subjName = (sp as any).subjects?.subject_name || "";
            const isOpen = expanded === subjName;
            const status = sp.status as StatusType;
            const subjectRoadmap = roadmapBySubject.get(subjName) || [];
            const doneCount = subjectRoadmap.filter(r => r.completed).length;
            const totalCount = subjectRoadmap.length;
            const isMath = sp.subject_id === MATH_SUBJECT_ID;

            return (
              <div key={sp.id} className={`card-premium transition-all duration-200 ${isOpen ? "sm:col-span-2 lg:col-span-3" : ""}`}>
                <button
                  onClick={() => setExpanded(isOpen ? null : subjName)}
                  className="w-full p-5 flex items-start justify-between text-start group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                      <span className="text-[14px] font-medium text-foreground">{subjName}</span>
                      {isMath && (
                        <span className="text-[12px] text-muted-foreground">{effectiveMathLevel} יח״ל</span>
                      )}
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[12px] text-muted-foreground">ציון</p>
                        <p className="text-[28px] font-semibold text-foreground leading-none mt-1">{sp.grade}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {sp.absences > 0 && (
                          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span>{sp.absences} חיסורים</span>
                          </div>
                        )}
                        {totalCount > 0 && (
                          <span className="text-[11px] text-muted-foreground">{doneCount}/{totalCount} שלבים</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 rounded-full bg-accent overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${statusConfig[status].dotClass}`} style={{ width: `${sp.grade || 0}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ms-4 shrink-0">
                    <StatusBadge type={status} />
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-border animate-fade-in-up" style={{ animationDuration: "200ms" }}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
                      {/* Roadmap */}
                      {subjectRoadmap.length > 0 && (
                        <div>
                          <p className="text-[12px] font-medium text-muted-foreground mb-3">שלבי התקדמות</p>
                          <div className="space-y-0">
                            {subjectRoadmap.map((item, idx) => {
                              const isLast = idx === subjectRoadmap.length - 1;
                              return (
                                <div key={item.id} className="flex items-start gap-3">
                                  <div className="flex flex-col items-center">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleToggleRoadmapItem(item.id, item.completed); }}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer hover:scale-110 ${
                                        item.completed ? "bg-success/15 hover:bg-success/25" : "bg-accent hover:bg-accent/80"
                                      }`}
                                      title={item.completed ? "סמן כלא הושלם" : "סמן כהושלם"}
                                    >
                                      {item.completed ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-success" strokeWidth={1.5} />
                                      ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                                      )}
                                    </button>
                                    {!isLast && (
                                      <div className={`w-px h-5 ${item.completed ? "bg-success/30" : "bg-border"}`} />
                                    )}
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleToggleRoadmapItem(item.id, item.completed); }}
                                    className={`text-[13px] pt-1 text-start transition-colors duration-150 cursor-pointer hover:text-foreground ${
                                      item.completed ? "text-muted-foreground line-through decoration-success/40" : "text-muted-foreground/60"
                                    }`}
                                  >
                                    {item.topic_name}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                            <span className="text-[11px] text-muted-foreground">הושלמו {doneCount} מתוך {totalCount}</span>
                            <div className="w-20 h-1.5 rounded-full bg-accent overflow-hidden">
                              <div className="h-full rounded-full bg-success transition-all duration-500" style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Topics */}
                      <div>
                        {sp.covered_topics && sp.covered_topics.length > 0 && (
                          <div className="mb-4">
                            <p className="text-[12px] font-medium text-muted-foreground mb-2">נושאים שנלמדו</p>
                            <div className="flex flex-wrap gap-1.5">
                              {sp.covered_topics.map((topic) => (
                                <span key={topic} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-success/10 text-[12px] text-success font-medium">
                                  <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {sp.missing_items && sp.missing_items.length > 0 && (
                          <div>
                            <p className="text-[12px] font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-warning" strokeWidth={1.5} />
                              נושאים להשלמה
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {sp.missing_items.map((topic) => (
                                <span key={topic} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warning/10 text-[12px] text-warning font-medium">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {sp.notes && (
                          <div className="mt-4 p-3 rounded-lg bg-accent/50 border border-border/50">
                            <p className="text-[11px] text-muted-foreground mb-1 font-medium">הערות</p>
                            <p className="text-[12px] text-foreground">{sp.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="space-y-4">
                        <div className="card-premium p-4 bg-accent/30 border-border/50">
                          <p className="text-[11px] text-muted-foreground mb-1">ציון נוכחי</p>
                          <p className="text-[32px] font-bold text-foreground leading-none">{sp.grade}</p>
                        </div>
                        <div className="card-premium p-4 bg-accent/30 border-border/50">
                          <p className="text-[11px] text-muted-foreground mb-1">היעדרויות</p>
                          <p className={`text-[24px] font-bold leading-none ${sp.absences > 3 ? "text-destructive" : "text-foreground"}`}>{sp.absences}</p>
                        </div>
                        <div className="card-premium p-4 bg-accent/30 border-border/50">
                          <p className="text-[11px] text-muted-foreground mb-1">התקדמות</p>
                          <p className="text-[24px] font-bold text-foreground leading-none">{sp.completion_percent}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentProfilePage;
