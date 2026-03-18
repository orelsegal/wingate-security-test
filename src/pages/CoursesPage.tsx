import { useState, useMemo } from "react";
import { Search, X, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { useStudents, useAllStudentProgress, statusConfig, type StatusType } from "@/hooks/useStudents";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";

const branches = ["שחייה", "טניס", "כדורסל", "אתלטיקה", "התעמלות"];
const grades = ["י׳", "י״א", "י״ב"];

const classToGrade = (className: string): string => {
  if (className.startsWith("י״ב") || className.startsWith("יב")) return "י״ב";
  if (className.startsWith("י״א") || className.startsWith("יא")) return "י״א";
  if (className.startsWith("י׳") || className.startsWith("י")) return "י׳";
  return className;
};

interface SubjectRow {
  id: string;
  studentName: string;
  subject: string;
  status: StatusType;
  branch: string;
  grade: string;
}

const CoursesPage = () => {
  const { user } = useAuth();
  const { data: students = [], isLoading: studentsLoading } = useStudents();
  const { data: allProgress = [], isLoading: progressLoading } = useAllStudentProgress();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusType | null>(null);
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "subject" | "status" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const allRows: SubjectRow[] = useMemo(() => {
    // Filter progress by scoped students
    const studentIds = new Set(students.map(s => s.id));
    return allProgress
      .filter(p => studentIds.has(p.student_id))
      .map(p => ({
        id: p.id,
        studentName: (p as any).students?.full_name || "",
        subject: (p as any).subjects?.subject_name || "",
        status: p.status as StatusType,
        branch: (p as any).students?.sport || "",
        grade: (p as any).students?.class_name || "",
      }));
  }, [students, allProgress]);

  const filtered = useMemo(() => {
    const statusOrder: Record<string, number> = { red: 0, yellow: 1, green: 2 };
    const list = allRows.filter(r => {
      if (search && !r.studentName.includes(search) && !r.subject.includes(search) && !r.branch.includes(search)) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (branchFilter && r.branch !== branchFilter) return false;
      if (gradeFilter && classToGrade(r.grade) !== gradeFilter) return false;
      return true;
    });
    if (sortBy) {
      list.sort((a, b) => {
        let cmp = 0;
        if (sortBy === "name") cmp = a.studentName.localeCompare(b.studentName, "he");
        else if (sortBy === "subject") cmp = a.subject.localeCompare(b.subject, "he");
        else if (sortBy === "status") cmp = (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
        return sortDir === "desc" ? -cmp : cmp;
      });
    }
    return list;
  }, [allRows, search, statusFilter, branchFilter, gradeFilter, sortBy, sortDir]);

  const hasFilters = search || statusFilter || branchFilter || gradeFilter || sortBy;

  const toggleSort = (col: "name" | "subject" | "status") => {
    if (sortBy === col) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortBy(null); setSortDir("asc"); }
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: "name" | "subject" | "status" }) => {
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

  const isLoading = studentsLoading || progressLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-5 md:p-10 lg:p-12 space-y-6 md:space-y-8 max-w-[1400px]">
      <div className="space-y-1.5">
        <h2 className="text-xl md:text-[1.65rem] font-semibold text-foreground tracking-tight">סטטוס לימודי לפי מקצוע</h2>
        <p className="text-muted-foreground text-[13px] md:text-sm">
          {allRows.length} רשומות &middot; {students.length} ספורטאים &middot; מוצגות {filtered.length}
        </p>
      </div>

      {/* Filters */}
      <div className="card-premium p-4 md:p-5 space-y-4">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3.5 h-4 w-4 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש ספורטאי או מקצוע..."
            className="w-full h-10 ps-10 pe-4 bg-accent/50 border border-border rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-150"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-muted-foreground ms-1 me-1">סטטוס:</span>
            {(["green", "yellow", "red"] as StatusType[]).map((type) => {
              const config = statusConfig[type];
              const active = statusFilter === type;
              return (
                <button
                  key={type}
                  onClick={() => setStatusFilter(active ? null : type)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 ${
                    active ? config.activeBg + " " + config.textClass : "bg-accent/60 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <span className={`w-[6px] h-[6px] rounded-full ${active ? config.dotClass : "bg-muted-foreground/40"}`} />
                  {config.label}
                </button>
              );
            })}
          </div>

          <div className="hidden md:block w-px h-7 bg-border self-center" />

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] text-muted-foreground ms-1 me-1">ענף:</span>
            {branches.map((b) => {
              const active = branchFilter === b;
              return (
                <button
                  key={b}
                  onClick={() => setBranchFilter(active ? null : b)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 ${
                    active ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-accent/60 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {b}
                </button>
              );
            })}
          </div>

          <div className="hidden md:block w-px h-7 bg-border self-center" />

          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-muted-foreground ms-1 me-1">כיתה:</span>
            {grades.map((g) => {
              const active = gradeFilter === g;
              return (
                <button
                  key={g}
                  onClick={() => setGradeFilter(active ? null : g)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 ${
                    active ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-accent/60 text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>

          {hasFilters && (
            <button onClick={clearAll} className="px-3 py-1.5 rounded-full text-[12px] font-medium text-destructive hover:bg-destructive/10 transition-all duration-150">
              נקה הכל
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card-premium overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_120px_100px_100px] gap-4 px-6 py-3.5 border-b border-border bg-accent/30">
          <button onClick={() => toggleSort("name")} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            שם <SortIcon col="name" />
          </button>
          <button onClick={() => toggleSort("subject")} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            מקצוע <SortIcon col="subject" />
          </button>
          <span className="text-[12px] font-medium text-muted-foreground">ענף</span>
          <button onClick={() => toggleSort("status")} className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors">
            סטטוס <SortIcon col="status" />
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-muted-foreground">
            לא נמצאו תוצאות — נסו לשנות את הסינון
          </div>
        ) : (
          filtered.slice(0, 100).map((row, i) => (
            <div
              key={row.id}
              className={`grid grid-cols-1 md:grid-cols-[1fr_120px_100px_100px] gap-1 md:gap-4 px-5 md:px-6 py-4 md:py-3.5 ${
                i < Math.min(filtered.length, 100) - 1 ? "border-b border-border" : ""
              } hover:bg-accent/20 transition-colors duration-100`}
            >
              <div className="flex items-center justify-between md:contents">
                <span className="text-[13px] font-medium text-foreground">{row.studentName}</span>
                <div className="md:hidden">
                  <StatusBadge type={row.status} />
                </div>
              </div>
              <div className="flex items-center gap-3 md:contents text-[12px] text-muted-foreground">
                <span>{row.subject}</span>
                <span className="text-border md:hidden">·</span>
                <span>{row.branch}</span>
              </div>
              <div className="hidden md:flex items-center">
                <StatusBadge type={row.status} />
              </div>
            </div>
          ))
        )}
        {filtered.length > 100 && (
          <div className="py-3 text-center text-[12px] text-muted-foreground border-t border-border">
            מוצגות 100 מתוך {filtered.length} רשומות — צמצמו את הסינון
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;
