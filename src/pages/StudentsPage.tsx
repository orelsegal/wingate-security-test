import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Info, Loader2, BookOpen, ChevronLeft, TrendingUp } from "lucide-react";
import { useStudents, useAllStudentProgress, statusConfig, type StatusType } from "@/hooks/useStudents";
import InitialsAvatar from "@/components/InitialsAvatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";

const branches = ["שחייה", "טניס", "כדורסל", "אתלטיקה", "התעמלות"];
const grades = ["י׳", "י״א", "י״ב"];

const classToGrade = (className: string): string => {
  if (className.startsWith("י״ב") || className.startsWith("יב")) return "י״ב";
  if (className.startsWith("י״א") || className.startsWith("יא")) return "י״א";
  if (className.startsWith("י׳") || className.startsWith("י")) return "י׳";
  return className;
};

const StudentsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: students = [], isLoading } = useStudents();
  const { data: allProgress = [] } = useAllStudentProgress();
  const initialStatus = searchParams.get("status") as StatusType | null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusType | null>(initialStatus);
  const [branchFilters, setBranchFilters] = useState<string[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "avg" | "status" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Group progress by student
  const progressByStudent = useMemo(() => {
    const map = new Map<string, Array<{ subjectName: string; grade: number | null; status: string; missingItems: string[] | null }>>();
    allProgress.forEach((p: any) => {
      const sid = p.student_id;
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid)!.push({
        subjectName: p.subjects?.subject_name || "",
        grade: p.grade,
        status: p.status,
        missingItems: p.missing_items,
      });
    });
    return map;
  }, [allProgress]);

  const filtered = useMemo(() => {
    const statusOrder: Record<string, number> = { red: 0, yellow: 1, green: 2 };
    const list = students.filter((s) => {
      if (search && !s.full_name.includes(search) && !s.sport.includes(search) && !s.class_name.includes(search)) return false;
      if (statusFilter && s.overall_status !== statusFilter) return false;
      if (branchFilters.length > 0 && !branchFilters.includes(s.sport)) return false;
      if (gradeFilter && classToGrade(s.class_name) !== gradeFilter) return false;
      return true;
    });
    if (sortBy) {
      list.sort((a, b) => {
        let cmp = 0;
        if (sortBy === "name") cmp = a.full_name.localeCompare(b.full_name, "he");
        else if (sortBy === "avg") cmp = (a.avg_score || 0) - (b.avg_score || 0);
        else if (sortBy === "status") cmp = (statusOrder[a.overall_status] ?? 2) - (statusOrder[b.overall_status] ?? 2);
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [students, search, statusFilter, branchFilters, gradeFilter, sortBy, sortDir]);

  const hasFilters = search || statusFilter || branchFilters.length > 0 || gradeFilter || sortBy;

  const toggleSort = (col: "name" | "avg" | "status") => {
    if (sortBy === col) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortBy(null); setSortDir("asc"); }
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: "name" | "avg" | "status" }) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" strokeWidth={1.5} />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" strokeWidth={1.5} /> : <ArrowDown className="h-3 w-3 text-primary" strokeWidth={1.5} />;
  };

  const clearAll = () => {
    setSearch("");
    setStatusFilter(null);
    setBranchFilters([]);
    setGradeFilter(null);
    setSortBy(null);
    setSortDir("asc");
  };

  const greenCount = students.filter(s => s.overall_status === "green").length;
  const yellowCount = students.filter(s => s.overall_status === "yellow").length;
  const redCount = students.filter(s => s.overall_status === "red").length;
  const avgAll = students.length > 0 ? (students.reduce((sum, s) => sum + (s.avg_score || 0), 0) / students.length).toFixed(0) : "—";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
    <div className="p-5 md:p-10 lg:p-12 max-w-[1400px]">

      {/* ── HEADER ── */}
      <section className="mb-7 md:mb-9">
        <div className="flex items-start justify-between mb-1.5">
          <div>
            <h2 className="text-[20px] md:text-[24px] font-semibold text-foreground tracking-tight leading-tight">סטטוס לימודי — ספורטאים</h2>
            <p className="text-muted-foreground text-[13px] mt-1">
              תמונת מצב עדכנית &middot; {students.length} ספורטאים
              {user?.role === "coach" ? ` · ענף ${user.scopeFilter?.[0]}` : ""}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent transition-colors mt-1">
                <Info className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[260px] text-start" dir="rtl">
              <p className="text-[12px] font-semibold mb-1">איך הסטטוס מחושב?</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                הסטטוס נקבע לפי ממוצע הציונים, נוכחות ומפת ההתקדמות בכל המקצועות.
                <br /><strong className="text-success">במסלול</strong> — ביצועים תקינים
                <br /><strong className="text-warning">פערים</strong> — חוסרים חלקיים
                <br /><strong className="text-destructive">בסיכון</strong> — פערים משמעותיים
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </section>

      {/* ── KPI CARDS ── */}
      <section className="mb-7 md:mb-9">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {/* Status cards */}
          {(["green", "yellow", "red"] as StatusType[]).map((type) => {
            const config = statusConfig[type];
            const count = type === "green" ? greenCount : type === "yellow" ? yellowCount : redCount;
            const pct = students.length > 0 ? Math.round((count / students.length) * 100) : 0;
            const isActive = statusFilter === type;
            return (
              <button
                key={type}
                onClick={() => setStatusFilter(isActive ? null : type)}
                className={`card-premium p-4 md:p-5 text-start transition-all duration-200 cursor-pointer group relative overflow-hidden ${
                  isActive ? "ring-2 ring-offset-1 " + (type === "green" ? "ring-success/40" : type === "yellow" ? "ring-warning/40" : "ring-destructive/40") : ""
                }`}
              >
                {/* Subtle bg accent */}
                <div className={`absolute inset-0 opacity-[0.03] ${config.dotClass}`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${config.bgClass}`}>
                      <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
                    </div>
                    {isActive && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${config.activeBg} ${config.textClass}`}>פעיל</span>
                    )}
                  </div>
                  <p className={`text-[28px] md:text-[32px] font-bold leading-none tracking-tight ${config.textClass}`}>{count}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-[11.5px] text-muted-foreground font-medium">{config.label}</p>
                    <span className="text-[10px] text-muted-foreground/50">{pct}%</span>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Avg score card */}
          <div className="card-premium p-4 md:p-5 text-start">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary/8">
                <TrendingUp className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-[28px] md:text-[32px] font-bold leading-none tracking-tight text-foreground">{avgAll}</p>
            <p className="text-[11.5px] text-muted-foreground font-medium mt-2">ממוצע כללי</p>
          </div>
        </div>

        {/* Distribution bar */}
        {students.length > 0 && (
          <div className="mt-3 card-premium p-3.5 md:p-4">
            <div className="flex h-2 rounded-full overflow-hidden bg-accent/60 gap-0.5">
              <div className="bg-success rounded-s-full transition-all duration-700" style={{ width: `${(greenCount / students.length) * 100}%` }} />
              <div className="bg-warning transition-all duration-700" style={{ width: `${(yellowCount / students.length) * 100}%` }} />
              <div className="bg-destructive rounded-e-full transition-all duration-700" style={{ width: `${(redCount / students.length) * 100}%` }} />
            </div>
            <div className="flex items-center gap-5 mt-2.5">
              {([
                { label: "במסלול", count: greenCount, type: "green" as StatusType },
                { label: "פערים", count: yellowCount, type: "yellow" as StatusType },
                { label: "בסיכון", count: redCount, type: "red" as StatusType },
              ]).map(s => (
                <div key={s.type} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[s.type].dotClass}`} />
                  <span className="text-[10.5px] text-muted-foreground">{s.count} {s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── FILTERS ── */}
      <section className="mb-7 md:mb-9">
        <div className="card-premium p-4 md:p-5 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3.5 h-4 w-4 text-muted-foreground/60 pointer-events-none" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם, ענף או כיתה..."
              className="w-full h-10 ps-10 pe-4 bg-background border border-border rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/25 transition-all duration-150"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status chips */}
            {(["green", "yellow", "red"] as StatusType[]).map((type) => {
              const config = statusConfig[type];
              const active = statusFilter === type;
              return (
                <button
                  key={type}
                  onClick={() => setStatusFilter(active ? null : type)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-all duration-150 ${
                    active ? config.activeBg + " " + config.textClass : "bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <span className={`w-[5px] h-[5px] rounded-full ${active ? config.dotClass : "bg-muted-foreground/30"}`} />
                  {config.label}
                </button>
              );
            })}

            <span className="w-px h-4 bg-border mx-1" />

            {/* Branch chips */}
            {branches.map((b) => {
              const active = branchFilters.includes(b);
              return (
                <button
                  key={b}
                  onClick={() => setBranchFilters(prev => active ? prev.filter(x => x !== b) : [...prev, b])}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-all duration-150 ${
                    active ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {active && <span className="text-[8px]">✓</span>}
                  {b}
                </button>
              );
            })}

            <span className="w-px h-4 bg-border mx-1" />

            {/* Grade chips */}
            {grades.map((g) => {
              const active = gradeFilter === g;
              return (
                <button
                  key={g}
                  onClick={() => setGradeFilter(active ? null : g)}
                  className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-all duration-150 ${
                    active ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>

          {/* Active filters summary */}
          {hasFilters && (
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[11px] text-muted-foreground">{filtered.length} מתוך {students.length} ספורטאים</span>
              <button onClick={clearAll} className="text-[11px] font-medium text-destructive/80 hover:text-destructive transition-colors">
                נקה הכל
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── STUDENTS GRID ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-foreground">ספורטאים</h3>
            <span className="text-[11px] text-muted-foreground/50 bg-accent/50 px-2 py-0.5 rounded-full">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-1">
            {(["name", "avg", "status"] as const).map((col) => (
              <button key={col} onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] text-muted-foreground hover:bg-accent transition-colors">
                {col === "name" ? "שם" : col === "avg" ? "ממוצע" : "סטטוס"}
                <SortIcon col={col} />
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card-premium py-20 text-center">
            <Search className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[13px] text-muted-foreground">לא נמצאו תוצאות — נסו לשנות את הסינון</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-4">
            {filtered.map((student) => {
              const status = student.overall_status as StatusType;
              const config = statusConfig[status];
              const subjects = progressByStudent.get(student.id) || [];
              const topSubjects = subjects.slice(0, 3);
              const missingCount = subjects.reduce((acc, s) => acc + (s.missingItems?.length || 0), 0);

              return (
                <div
                  key={student.id}
                  onClick={() => navigate(`/students/${student.id}`)}
                  className="card-premium p-0 overflow-hidden cursor-pointer group hover:translate-y-[-2px] transition-all duration-300"
                >
                  {/* Top stripe */}
                  <div className={`h-[3px] ${config.dotClass} opacity-60`} />

                  {/* Header */}
                  <div className="px-5 pt-4 pb-3">
                    <div className="flex items-start gap-3">
                      <InitialsAvatar name={student.full_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-foreground leading-tight truncate group-hover:text-primary transition-colors duration-200">
                          {student.full_name}
                        </p>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5">
                          {student.sport} · {student.class_name}
                        </p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[18px] font-bold text-foreground tabular-nums shrink-0 leading-none mt-0.5">{student.avg_score}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" dir="rtl" className="text-[11px]">
                          ממוצע משוקלל
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Status */}
                  <div className={`mx-4 flex items-center justify-between px-3.5 py-2.5 rounded-xl ${config.bgClass}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${config.dotClass} shrink-0`} />
                      <span className={`text-[12.5px] font-semibold ${config.textClass}`}>{config.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-medium ${config.textClass} opacity-70`}>השלמה: {student.completion_percent}%</span>
                      {status === "red" && <AlertTriangle className="h-3.5 w-3.5 text-destructive/50" strokeWidth={1.5} />}
                    </div>
                  </div>

                  {/* Completion bar */}
                  <div className="mx-4 mt-2.5">
                    <div className="h-1 rounded-full bg-accent overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${config.dotClass}`}
                        style={{ width: `${student.completion_percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Subjects preview */}
                  {topSubjects.length > 0 && (
                    <div className="px-4 mt-3 pb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {topSubjects.map((subj, i) => {
                          const subjStatus = subj.status as StatusType;
                          const subjConfig = statusConfig[subjStatus] || statusConfig.green;
                          return (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${subjConfig.bgClass} ${subjConfig.textClass}`}
                            >
                              <span className={`w-1 h-1 rounded-full ${subjConfig.dotClass}`} />
                              {subj.subjectName}
                              {subj.grade != null && <span className="opacity-60">{subj.grade}</span>}
                            </span>
                          );
                        })}
                        {subjects.length > 3 && (
                          <span className="text-[10px] text-muted-foreground/50 px-1.5 py-0.5">+{subjects.length - 3}</span>
                        )}
                      </div>
                      {missingCount > 0 && (
                        <p className="text-[10px] text-destructive/70 mt-1.5 flex items-center gap-1">
                          <AlertTriangle className="h-2.5 w-2.5" strokeWidth={1.5} />
                          חוסרים: {missingCount} פריטים
                        </p>
                      )}
                    </div>
                  )}

                  {/* Empty subjects fallback */}
                  {topSubjects.length === 0 && (
                    <div className="px-4 mt-2 pb-4">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40">
                        <BookOpen className="h-3 w-3" strokeWidth={1.5} />
                        <span>אין נתוני מקצועות</span>
                      </div>
                    </div>
                  )}

                  {/* Hover indicator */}
                  <div className="h-0 overflow-hidden group-hover:h-8 transition-all duration-200 bg-accent/30 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      צפייה בפרופיל
                      <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
    </TooltipProvider>
  );
};

export default StudentsPage;
