import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Info, Loader2 } from "lucide-react";
import { useStudents, statusConfig, type StatusType } from "@/hooks/useStudents";
import { StatusBadge } from "@/components/StatusBadge";
import InitialsAvatar from "@/components/InitialsAvatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";

const branches = ["שחייה", "טניס", "כדורסל", "אתלטיקה", "התעמלות"];
const grades = ["י׳", "י״א", "י״ב"];

// Map DB class_name to display grade for filtering
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
  const initialStatus = searchParams.get("status") as StatusType | null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusType | null>(initialStatus);
  const [branchFilters, setBranchFilters] = useState<string[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "avg" | "status" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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

      {/* ── SECTION 1: SUMMARY ── */}
      <section className="mb-8 md:mb-10">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl md:text-[1.65rem] font-semibold text-foreground tracking-tight">בקרת התקדמות ספורטאים</h2>
            <p className="text-muted-foreground text-[13px] mt-1">
              {students.length} ספורטאים {user?.role === "coach" ? `בענף ${user.scopeFilter?.[0]}` : ""} &middot; מוצגים {filtered.length}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent transition-colors">
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

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {(["green", "yellow", "red"] as StatusType[]).map((type) => {
            const config = statusConfig[type];
            const count = students.filter(s => s.overall_status === type).length;
            const isActive = statusFilter === type;
            return (
              <button
                key={type}
                onClick={() => setStatusFilter(isActive ? null : type)}
                className={`card-premium p-4 md:p-5 text-start transition-all duration-200 cursor-pointer group ${
                  isActive ? "ring-2 ring-offset-1 " + (type === "green" ? "ring-success/40" : type === "yellow" ? "ring-warning/40" : "ring-destructive/40") : "hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center ${config.bgClass}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${config.dotClass}`} />
                  </div>
                  {isActive && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${config.activeBg} ${config.textClass}`}>מסונן</span>
                  )}
                </div>
                <p className={`text-[28px] md:text-[34px] font-semibold leading-none tracking-tight ${config.textClass}`}>{count}</p>
                <p className="text-[12px] text-muted-foreground mt-1.5">{config.label}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 2: FILTERS ── */}
      <section className="mb-8 md:mb-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-medium text-foreground">סינון וחיפוש</h3>
          <span className="text-[11px] text-muted-foreground">{filtered.length} תוצאות</span>
        </div>
        <div className="card-premium p-4 md:p-5 space-y-3.5">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3.5 h-4 w-4 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש ספורטאי..."
              className="w-full h-10 ps-10 pe-4 bg-accent/50 border border-border rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-150"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-muted-foreground/70 w-14 shrink-0">סטטוס:</span>
              {(["green", "yellow", "red"] as StatusType[]).map((type) => {
                const config = statusConfig[type];
                const active = statusFilter === type;
                return (
                  <button
                    key={type}
                    onClick={() => setStatusFilter(active ? null : type)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 ${
                      active ? config.activeBg + " " + config.textClass : "bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <span className={`w-[6px] h-[6px] rounded-full ${active ? config.dotClass : "bg-muted-foreground/40"}`} />
                    {config.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-muted-foreground/70 w-14 shrink-0">בחירת ענפים:</span>
              {branches.map((b) => {
                const active = branchFilters.includes(b);
                return (
                  <button
                    key={b}
                    onClick={() => setBranchFilters(prev => active ? prev.filter(x => x !== b) : [...prev, b])}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 ${
                      active ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <span className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 transition-colors duration-150 ${
                      active ? "bg-primary border-primary" : "border-muted-foreground/30"
                    }`}>
                      {active && <span className="text-primary-foreground text-[8px] font-bold">✓</span>}
                    </span>
                    {b}
                  </button>
                );
              })}
              {branchFilters.length > 0 && (
                <button onClick={() => setBranchFilters([])} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1">
                  <X className="h-3 w-3" strokeWidth={1.5} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-muted-foreground/70 w-14 shrink-0">כיתה:</span>
              {grades.map((g) => {
                const active = gradeFilter === g;
                return (
                  <button
                    key={g}
                    onClick={() => setGradeFilter(active ? null : g)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 ${
                      active ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {hasFilters && (
            <div className="pt-1">
              <button onClick={clearAll} className="px-3 py-1.5 rounded-full text-[12px] font-medium text-destructive hover:bg-destructive/10 transition-all duration-150">
                נקה הכל
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 3: STUDENTS ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-medium text-foreground">ספורטאים</h3>
          <div className="flex items-center gap-2">
            {(["name", "avg", "status"] as const).map((col) => (
              <button key={col} onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:bg-accent transition-colors">
                {col === "name" ? "שם" : col === "avg" ? "ממוצע" : "סטטוס"}
                <SortIcon col={col} />
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card-premium py-16 text-center text-[13px] text-muted-foreground">
            לא נמצאו תוצאות — נסו לשנות את הסינון
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filtered.map((student) => {
              const status = student.overall_status as StatusType;
              const config = statusConfig[status];
              return (
                <div
                  key={student.id}
                  onClick={() => navigate(`/students/${student.id}`)}
                  className="card-premium p-0 overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 group"
                >
                  <div className="px-5 pt-5 pb-4">
                    <div className="flex items-start gap-3">
                      <InitialsAvatar name={student.full_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-foreground leading-tight truncate group-hover:text-primary transition-colors duration-150">
                          {student.full_name}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          {student.sport} · כיתה {student.class_name}
                        </p>
                      </div>
                      <span className="text-[18px] font-semibold text-foreground tabular-nums shrink-0">{student.avg_score}</span>
                    </div>
                  </div>

                  <div className={`mx-5 mb-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl ${config.bgClass}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${config.dotClass} shrink-0`} />
                    <span className={`text-[13px] font-medium ${config.textClass}`}>{config.label}</span>
                    {status === "red" && (
                      <AlertTriangle className="h-3.5 w-3.5 ms-auto text-destructive/60" strokeWidth={1.5} />
                    )}
                  </div>

                  {/* Completion bar */}
                  <div className="mx-5 mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-muted-foreground">התקדמות כוללת</span>
                      <span className="text-[11px] font-medium text-foreground">{student.completion_percent}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-accent overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${config.dotClass}`}
                        style={{ width: `${student.completion_percent}%` }}
                      />
                    </div>
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
