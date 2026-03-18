import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Info } from "lucide-react";
import { studentsData, statusConfig } from "@/lib/studentData";
import { StatusBadge } from "@/components/StatusBadge";
import InitialsAvatar from "@/components/InitialsAvatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import type { StatusType } from "@/lib/studentData";

const subjectNames = ["מתמטיקה", "אנגלית", "היסטוריה", "ספרות", "מדעים", "חינ״ג", "כללי"];

const missingTopicsBySubject: Record<string, string[]> = {
  "מתמטיקה": ["טריגונומטריה", "הסתברות", "חדו״א"],
  "אנגלית": ["כתיבה אקדמית", "ספרות אנגלית"],
  "היסטוריה": ["עת חדשה", "עבודת חקר"],
  "ספרות": ["עבודת סיכום", "שירה מודרנית"],
  "מדעים": ["כימיה", "ביולוגיה"],
  "חינ״ג": ["מבחן שנתי"],
  "כללי": ["פרויקט גמר", "מעורבות חברתית"],
};

const getSubjectStatus = (student: typeof studentsData[0], subject: string): StatusType => {
  const seed = student.id.charCodeAt(0) + subject.charCodeAt(0);
  if (student.status === "red") return seed % 3 === 0 ? "red" : seed % 3 === 1 ? "yellow" : "green";
  if (student.status === "yellow") return seed % 2 === 0 ? "yellow" : "green";
  return "green";
};

/** Get missing topics for a student based on their non-green subjects */
const getMissingTopics = (student: typeof studentsData[0]): string[] => {
  const missing: string[] = [];
  for (const subj of subjectNames) {
    const status = getSubjectStatus(student, subj);
    if (status !== "green") {
      const topics = missingTopicsBySubject[subj];
      if (topics) {
        // Pick 1 topic deterministically
        const idx = (student.id.charCodeAt(0) + subj.charCodeAt(0)) % topics.length;
        missing.push(topics[idx]);
      }
    }
  }
  return missing;
};

const branches = ["שחייה", "טניס", "כדורסל", "אתלטיקה", "התעמלות"];
const grades = ["י׳", "י״א", "י״ב"];

const StudentsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const initialStatus = searchParams.get("status") as StatusType | null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusType | null>(initialStatus);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "avg" | "status" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Role-based base data
  const baseData = useMemo(() => {
    if (!user) return studentsData;
    if (user.role === "parent") return studentsData.filter(s => user.scopeFilter?.includes(s.id));
    if (user.role === "coach") return studentsData.filter(s => user.scopeFilter?.includes(s.branch));
    return studentsData; // admin, teacher
  }, [user]);

  const filtered = useMemo(() => {
    const statusOrder: Record<StatusType, number> = { red: 0, yellow: 1, green: 2 };
    const list = baseData.filter((s) => {
      if (search && !s.name.includes(search) && !s.branch.includes(search) && !s.grade.includes(search)) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      if (branchFilter && s.branch !== branchFilter) return false;
      if (gradeFilter && s.grade !== gradeFilter) return false;
      return true;
    });
    if (sortBy) {
      list.sort((a, b) => {
        let cmp = 0;
        if (sortBy === "name") cmp = a.name.localeCompare(b.name, "he");
        else if (sortBy === "avg") cmp = a.avg - b.avg;
        else if (sortBy === "status") cmp = statusOrder[a.status] - statusOrder[b.status];
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [baseData, search, statusFilter, branchFilter, gradeFilter, sortBy, sortDir]);

  const hasFilters = search || statusFilter || branchFilter || gradeFilter || sortBy;

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
    setBranchFilter(null);
    setGradeFilter(null);
    setSortBy(null);
    setSortDir("asc");
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="p-5 md:p-10 lg:p-12 max-w-[1400px]">

      {/* ── SECTION 1: SUMMARY (top, prominent) ── */}
      <section className="mb-8 md:mb-10">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl md:text-[1.65rem] font-semibold text-foreground tracking-tight">בקרת התקדמות ספורטאים</h2>
            <p className="text-muted-foreground text-[13px] mt-1">
              {baseData.length} ספורטאים {user?.role === "coach" ? `בענף ${user.scopeFilter?.[0]}` : ""} &middot; מוצגים {filtered.length}
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
                <br /><strong className="text-success">במסלול</strong> — ביצועים תקינים בכל המקצועות
                <br /><strong className="text-warning">פערים</strong> — חוסרים חלקיים הדורשים מעקב
                <br /><strong className="text-destructive">בסיכון</strong> — פערים משמעותיים, דורש טיפול
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {([
            { type: "green" as StatusType, count: baseData.filter(s => s.status === "green").length },
            { type: "yellow" as StatusType, count: baseData.filter(s => s.status === "yellow").length },
            { type: "red" as StatusType, count: baseData.filter(s => s.status === "red").length },
          ]).map((kpi) => {
            const config = statusConfig[kpi.type];
            const isActive = statusFilter === kpi.type;
            return (
              <button
                key={kpi.type}
                onClick={() => setStatusFilter(isActive ? null : kpi.type)}
                className={`card-premium p-4 md:p-5 text-start transition-all duration-200 cursor-pointer group ${
                  isActive ? "ring-2 ring-offset-1 " + (kpi.type === "green" ? "ring-success/40" : kpi.type === "yellow" ? "ring-warning/40" : "ring-destructive/40") : "hover:shadow-md"
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
                <p className={`text-[28px] md:text-[34px] font-semibold leading-none tracking-tight ${config.textClass}`}>
                  {kpi.count}
                </p>
                <p className="text-[12px] text-muted-foreground mt-1.5">{config.label}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── SECTION 2: FILTERS (middle) ── */}
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
                      active
                        ? config.activeBg + " " + config.textClass
                        : "bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <span className={`w-[6px] h-[6px] rounded-full ${active ? config.dotClass : "bg-muted-foreground/40"}`} />
                    {config.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-muted-foreground/70 w-14 shrink-0">ענף:</span>
              {branches.map((b) => {
                const active = branchFilter === b;
                return (
                  <button
                    key={b}
                    onClick={() => setBranchFilter(active ? null : b)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 ${
                      active
                        ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                        : "bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
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
                      active
                        ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                        : "bg-accent/60 text-muted-foreground hover:bg-accent hover:text-foreground"
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
              <button
                onClick={clearAll}
                className="px-3 py-1.5 rounded-full text-[12px] font-medium text-destructive hover:bg-destructive/10 transition-all duration-150"
              >
                נקה הכל
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── SECTION 3: STUDENTS (bottom) ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-medium text-foreground">ספורטאים</h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent transition-colors">
                <Info className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-start" dir="rtl">
              <p className="text-[12px] font-semibold mb-1">מה זה ״חסרים״?</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                נושאים לימודיים שטרם הושלמו או שהציון בהם נמוך מהמצופה. הרשימה נגזרת ממפת ההתקדמות של כל ספורטאי.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {filtered.length === 0 ? (
          <div className="card-premium py-16 text-center text-[13px] text-muted-foreground">
            לא נמצאו תוצאות — נסו לשנות את הסינון
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filtered.map((student) => {
              const subjects = subjectNames.map(s => ({ name: s, status: getSubjectStatus(student, s) }));
              const config = statusConfig[student.status];
              const missing = getMissingTopics(student);
              return (
                <div
                  key={student.id}
                  onClick={() => navigate(`/students/${student.id}`)}
                  className="card-premium p-0 overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200 group"
                >
                  {/* Top: Name + Sport */}
                  <div className="px-5 pt-5 pb-4">
                    <div className="flex items-start gap-3">
                      <InitialsAvatar name={student.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-foreground leading-tight truncate group-hover:text-primary transition-colors duration-150">
                          {student.name}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          {student.branch} · כיתה {student.grade}
                        </p>
                      </div>
                      <span className="text-[18px] font-semibold text-foreground tabular-nums shrink-0">{student.avg}</span>
                    </div>
                  </div>

                  {/* Middle: Status */}
                  <div className={`mx-5 mb-3 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl ${config.bgClass}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${config.dotClass} shrink-0`} />
                    <span className={`text-[13px] font-medium ${config.textClass}`}>{config.label}</span>
                    {student.status === "red" && (
                      <AlertTriangle className="h-3.5 w-3.5 ms-auto text-destructive/60" strokeWidth={1.5} />
                    )}
                  </div>

                  {/* Missing topics */}
                  {missing.length > 0 && (
                    <div className="mx-5 mb-3 px-3.5 py-2 rounded-lg bg-accent/60">
                      <p className="text-[10px] text-muted-foreground/60 font-medium mb-1">חסרים:</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed truncate">
                        {missing.join("، ")}
                      </p>
                    </div>
                  )}

                  {/* Bottom: Subjects overview */}
                  <div className="px-5 pb-4 pt-1 border-t border-border">
                    <p className="text-[10px] text-muted-foreground/60 mb-2 mt-3 font-medium tracking-wide">מקצועות</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {subjects.map((subj) => {
                        const sc = statusConfig[subj.status];
                        return (
                          <span
                            key={subj.name}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${sc.bgClass} ${sc.textClass}`}
                            title={subj.name}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dotClass}`} />
                            {subj.name}
                          </span>
                        );
                      })}
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
