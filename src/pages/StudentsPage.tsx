import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, X, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, AlertTriangle, Users, AlertCircle,
  UserPlus, Settings2, Pencil, Trash2, Eye, Copy, Archive, MoreHorizontal, LayoutGrid, Table as TableIcon, PieChart, ChevronDown, Check, Rows3,
} from "lucide-react";
import { useStudents, useAllStudentProgress, useDeleteStudent, useUpdateStudent, useSubjects, statusConfig, type StatusType, type Student } from "@/hooks/useStudents";
import InitialsAvatar from "@/components/InitialsAvatar";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import StudentFormModal from "@/components/StudentFormModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import QuickEditDrawer from "@/components/QuickEditDrawer";
import DataExportTools from "@/components/DataExportTools";
import * as XLSX from "xlsx";
import { classToGrade } from "@/lib/schoolUtils";
import { StudentsPageSkeleton } from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";

const grades = ["ט׳", "י׳", "י״א", "י״ב"];

type ViewMode = "cards" | "table" | "summary";
type SubjectRow = { subjectName: string; grade: number | null; bagrutPercent: number | null; status: StatusType; gradeLabel?: string | null };

const STATUS_BORDER: Record<StatusType, string> = {
  green: "border-success/45",
  yellow: "border-warning/45",
  red: "border-destructive/45",
};
const STATUS_DOT: Record<StatusType | "gray", string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-destructive",
  gray: "bg-muted-foreground/25",
};
const STATUS_CHIP_BG: Record<StatusType, string> = {
  green: "bg-success/10 text-success",
  yellow: "bg-warning/10 text-warning",
  red: "bg-destructive/10 text-destructive",
};

/** Generic dropdown multi/single select trigger styled like screenshot pills. */
const FilterSelect = ({ label, value, onClear, children }: { label: string; value: string; onClear?: () => void; children: React.ReactNode }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="h-9 px-3 inline-flex items-center justify-between gap-2 bg-card border border-border rounded-xl text-[12px] text-foreground hover:bg-accent/40 transition-colors min-w-[140px]">
        <span className="truncate">{value || label}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-[200px]">
      <DropdownMenuLabel className="text-[11px] text-muted-foreground">{label}</DropdownMenuLabel>
      {onClear && <DropdownMenuItem onClick={onClear} className="text-[11px] text-destructive/80">נקה בחירה</DropdownMenuItem>}
      <DropdownMenuSeparator />
      {children}
    </DropdownMenuContent>
  </DropdownMenu>
);

const StudentsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user && (user.role === "parent" || user.role === "student")) navigate("/", { replace: true });
  }, [user, navigate]);

  const { data: students = [], isLoading } = useStudents();
  const { data: allProgress = [] } = useAllStudentProgress();
  const { data: subjectsList = [] } = useSubjects();
  const deleteStudent = useDeleteStudent();
  const updateStudent = useUpdateStudent();

  const initialStatus = searchParams.get("status") as StatusType | null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusType | null>(initialStatus);
  const [branchFilters, setBranchFilters] = useState<string[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "avg" | "status" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [gradeEntryFilter, setGradeEntryFilter] = useState<"all" | "with" | "without">("all");

  // CRUD modals
  const [formOpen, setFormOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [duplicateStudent, setDuplicateStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [quickEditStudent, setQuickEditStudent] = useState<Student | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const branches = useMemo(() => Array.from(new Set(students.map(s => s.sport))).sort(), [students]);
  const allSubjectNames = useMemo(() => subjectsList.map((s: any) => s.subject_name as string), [subjectsList]);

  /** Map: student.id → all subject rows (one per subject in the system). */
  const subjectRowsByStudent = useMemo(() => {
    const progressMap = new Map<string, Map<string, SubjectRow>>();
    allProgress.forEach((p: any) => {
      const sid = p.student_id;
      const name = p.subjects?.subject_name;
      if (!sid || !name) return;
      if (!progressMap.has(sid)) progressMap.set(sid, new Map());
      const grade = typeof p.grade === "number" ? p.grade : Number(p.grade) || 0;
      const bagrut = typeof p.completion_percent === "number" ? p.completion_percent : Number(p.completion_percent) || 0;
      const status = (p.status as StatusType) || "green";
      progressMap.get(sid)!.set(name, {
        subjectName: name,
        grade: grade > 0 ? grade : null,
        bagrutPercent: bagrut > 0 ? bagrut : null,
        status,
        gradeLabel: bagrut > 0 ? `בגרות ${bagrut}%` : null,
      });
    });

    const result = new Map<string, SubjectRow[]>();
    students.forEach((st) => {
      const m = progressMap.get(st.id);
      const rows: SubjectRow[] = allSubjectNames.map((name) => {
        const row = m?.get(name);
        if (row) return row;
        // No data → gray placeholder. Use yellow as neutral status for sorting? — keep as a no-data row using "green" but rendered gray via flag.
        return { subjectName: name, grade: null, bagrutPercent: null, status: "green" as StatusType, gradeLabel: null };
      });
      // Mark rows with no data by null grade AND no entry — preserve a "noData" flag via gradeLabel absence + status check.
      // We'll re-tag via separate visual handling: rows missing in `m` should be rendered gray.
      result.set(st.id, rows.map((r) => {
        const has = m?.has(r.subjectName);
        return { ...r, gradeLabel: r.gradeLabel, ...((!has) ? { __noData: true } as any : {}) } as any;
      }));
    });
    return result;
  }, [allProgress, students, allSubjectNames]);

  const filtered = useMemo(() => {
    const statusOrder: Record<string, number> = { red: 0, yellow: 1, green: 2 };
    const list = students.filter((s) => {
      if ((s as any).archived) return false;
      if (user?.role === "coach" && user.scopeFilter && !user.scopeFilter.includes(s.sport)) return false;
      if (search && !s.full_name.includes(search) && !s.sport.includes(search) && !s.class_name.includes(search)) return false;
      if (statusFilter && s.overall_status !== statusFilter) return false;
      if (branchFilters.length > 0 && !branchFilters.includes(s.sport)) return false;
      if (gradeFilter && classToGrade(s.class_name) !== gradeFilter) return false;
      if (subjectFilter) {
        const rows = subjectRowsByStudent.get(s.id) || [];
        const row = rows.find((r) => r.subjectName === subjectFilter);
        if (!row || (row as any).__noData) return false;
      }
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
  }, [students, search, statusFilter, branchFilters, gradeFilter, subjectFilter, sortBy, sortDir, user, subjectRowsByStudent]);

  const hasFilters = search || statusFilter || branchFilters.length > 0 || gradeFilter || subjectFilter || sortBy;

  const toggleSort = (col: "name" | "avg" | "status") => {
    if (sortBy === col) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortBy(null); setSortDir("asc"); }
    } else { setSortBy(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: "name" | "avg" | "status" }) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" strokeWidth={1.5} />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" strokeWidth={1.5} /> : <ArrowDown className="h-3 w-3 text-primary" strokeWidth={1.5} />;
  };

  const clearAll = () => {
    setSearch(""); setStatusFilter(null); setBranchFilters([]); setGradeFilter(null); setSubjectFilter(null); setSortBy(null); setSortDir("asc");
  };

  // ─── Aggregate totals across ALL non-archived students ────────────
  const totals = useMemo(() => {
    let green = 0, yellow = 0, red = 0;
    students.filter(s => !(s as any).archived).forEach((s) => {
      const rows = subjectRowsByStudent.get(s.id) || [];
      rows.forEach((r) => {
        if ((r as any).__noData) return;
        if (r.status === "green") green++;
        else if (r.status === "yellow") yellow++;
        else if (r.status === "red") red++;
      });
    });
    return { green, yellow, red, total: green + yellow + red };
  }, [students, subjectRowsByStudent]);

  const criticalCount = students.filter(s => s.overall_status === "red" && !(s as any).archived).length;
  const totalStudents = students.filter(s => !(s as any).archived).length;

  const toggleSelect = (id: string) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(s => s.id)));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStudent.mutateAsync(deleteTarget.id);
      toast.success(`"${deleteTarget.full_name}" נמחק`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error("שגיאה: " + err.message);
    }
  };

  const handleExport = useCallback(() => {
    const data = (selected.size > 0 ? filtered.filter(s => selected.has(s.id)) : filtered).map(s => ({
      "שם מלא": s.full_name, "ענף": s.sport, "כיתה": s.class_name,
      "ממוצע": s.avg_score || 0, "סטטוס": statusConfig[s.overall_status as StatusType]?.label || s.overall_status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ספורטאים");
    XLSX.writeFile(wb, "ספורטאים_ייצוא.xlsx");
    toast.success(`${data.length} ספורטאים יוצאו`);
  }, [filtered, selected]);

  if (isLoading) return <StudentsPageSkeleton />;

  const canEdit = user?.role === "developer" || user?.role === "admin" || user?.role === "teacher";
  const isAdmin = canEdit;

  // ────────────── Render helpers ──────────────
  const KpiCard = ({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent: "green" | "red" | "destructive" | "neutral" }) => {
    const tones = {
      green: { num: "text-success", icon: "text-success bg-success/10" },
      red: { num: "text-destructive", icon: "text-destructive bg-destructive/10" },
      destructive: { num: "text-destructive", icon: "text-destructive bg-destructive/15" },
      neutral: { num: "text-foreground", icon: "text-foreground bg-accent" },
    }[accent];
    return (
      <div className="card-premium p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground font-medium mb-1 truncate">{label}</p>
          <p className={`text-[28px] leading-none font-bold tabular-nums ${tones.num}`}>{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones.icon}`}>
          <Icon className="h-5 w-5" strokeWidth={1.7} />
        </div>
      </div>
    );
  };

  const SubjectLine = ({ row }: { row: SubjectRow & { __noData?: boolean } }) => {
    const noData = (row as any).__noData;
    const dotClass = noData ? STATUS_DOT.gray : STATUS_DOT[row.status];
    return (
      <li className="flex items-center justify-between gap-2 py-[3px]">
        {/* Right side (RTL): dot + name */}
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
          <span className={`text-[12px] ${noData ? "text-muted-foreground/60" : "text-foreground"} truncate`}>{row.subjectName}</span>
        </div>
        {/* Left side: ציון | % בגרות (כותרות מופיעות פעם אחת מעל הכרטיס) */}
        {!noData ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-8 text-center text-[12px] tabular-nums text-foreground font-semibold">
              {row.grade != null ? row.grade : "—"}
            </span>
            <span className="w-12 text-center">
              {row.bagrutPercent != null ? (
                <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-md ${STATUS_CHIP_BG[row.status]}`}>
                  {row.bagrutPercent}%
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground/60">—</span>
              )}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-8 text-center text-[10px] text-muted-foreground/60">—</span>
            <span className="w-12 text-center text-[10px] text-muted-foreground/60">—</span>
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-[1400px]">

      {/* ── ACTION BAR ── */}
      <section className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Button onClick={() => { setEditStudent(null); setDuplicateStudent(null); setFormOpen(true); }} className="gap-1.5" size="sm">
              <UserPlus className="h-3.5 w-3.5" />
              הוסף ספורטאי
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/data-management")}>
              <Settings2 className="h-3.5 w-3.5" />
              ניהול נתונים
            </Button>
          )}
          <DataExportTools students={filtered} label="ספורטאים" showImport />

          {/* View toggle */}
          <div className="mr-auto flex items-center gap-1 border border-border rounded-lg p-0.5 bg-card">
            <button onClick={() => setViewMode("cards")} className={`h-7 w-7 rounded-md flex items-center justify-center transition-all ${viewMode === "cards" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`} title="כרטיסים">
              <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <button onClick={() => setViewMode("table")} className={`h-7 w-7 rounded-md flex items-center justify-center transition-all ${viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`} title="טבלה">
              <TableIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <button onClick={() => setViewMode("summary")} className={`h-7 px-2 rounded-md flex items-center gap-1 transition-all ${viewMode === "summary" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`} title="טבלת סיכום לפי מקצועות">
              <Rows3 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </section>

      {/* ── KPI 4-card strip ── */}
      <section className="mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="רמזורים ירוקים" value={totals.green} icon={CheckCircle2} accent="green" />
          <KpiCard label="רמזורים אדומים" value={totals.red} icon={AlertCircle} accent="red" />
          <KpiCard label="ספורטאים קריטיים" value={criticalCount} icon={AlertTriangle} accent="destructive" />
          <KpiCard label='סה"כ ספורטאים' value={totalStudents} icon={Users} accent="neutral" />
        </div>
      </section>

      {/* ── Overall stacked bar ── */}
      <section className="mb-4">
        <div className="card-premium p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-semibold text-foreground">תמונת מצב כוללת</p>
          </div>
          <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden flex" dir="ltr">
            {totals.total > 0 ? (
              <>
                <span className="h-full bg-destructive" style={{ width: `${(totals.red / totals.total) * 100}%` }} />
                <span className="h-full bg-warning" style={{ width: `${(totals.yellow / totals.total) * 100}%` }} />
                <span className="h-full bg-success" style={{ width: `${(totals.green / totals.total) * 100}%` }} />
              </>
            ) : null}
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
            <span>סה"כ {totals.total}</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-destructive" />{totals.red}</span>
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning" />{totals.yellow}</span>
              <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success" />{totals.green}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filters row (always visible, dropdown style) ── */}
      <section className="mb-5">
        <div className="card-premium p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={clearAll}
              className={`h-9 px-3 inline-flex items-center gap-1.5 rounded-xl text-[12px] font-medium transition-colors border ${!hasFilters ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-accent/40"}`}
              title="הצג את כל הספורטאים"
            >
              <Users className="h-3.5 w-3.5" strokeWidth={1.6} />
              כל הספורטאים
              <span className="tabular-nums opacity-80">({totalStudents})</span>
            </button>

            <FilterSelect label="כל הרמזורים" value={statusFilter ? statusConfig[statusFilter].label : ""} onClear={statusFilter ? () => setStatusFilter(null) : undefined}>
              {(["green", "yellow", "red"] as StatusType[]).map((t) => (
                <DropdownMenuItem key={t} onClick={() => setStatusFilter(t)} className="text-[12px] gap-2">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[t]}`} />
                  {statusConfig[t].label}
                </DropdownMenuItem>
              ))}
            </FilterSelect>

            <FilterSelect label="כל המקצועות" value={subjectFilter || ""} onClear={subjectFilter ? () => setSubjectFilter(null) : undefined}>
              {allSubjectNames.map((n) => (
                <DropdownMenuItem key={n} onClick={() => setSubjectFilter(n)} className="text-[12px]">{n}</DropdownMenuItem>
              ))}
            </FilterSelect>

            <FilterSelect label="כל הענפים" value={branchFilters.length > 0 ? `${branchFilters.length} ענפים` : ""} onClear={branchFilters.length ? () => setBranchFilters([]) : undefined}>
              {branches.map((b) => (
                <DropdownMenuCheckboxItem key={b} checked={branchFilters.includes(b)} onCheckedChange={(c) => setBranchFilters((prev) => c ? [...prev, b] : prev.filter(x => x !== b))} className="text-[12px]">{b}</DropdownMenuCheckboxItem>
              ))}
            </FilterSelect>

            <FilterSelect label="כל הכיתות" value={gradeFilter || ""} onClear={gradeFilter ? () => setGradeFilter(null) : undefined}>
              {grades.map((g) => (
                <DropdownMenuItem key={g} onClick={() => setGradeFilter(g)} className="text-[12px]">{g}</DropdownMenuItem>
              ))}
            </FilterSelect>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" strokeWidth={1.5} />
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="חיפוש תלמיד..."
                className="w-full h-9 ps-9 pe-3 bg-background border border-border rounded-xl text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/25 transition-all"
              />
              {search && <button onClick={() => setSearch("")} className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" strokeWidth={1.5} /></button>}
            </div>

            {hasFilters && (
              <button onClick={clearAll} className="text-[11px] font-medium text-destructive/80 hover:text-destructive transition-colors px-2">נקה הכל</button>
            )}
          </div>
        </div>
      </section>

      {/* ── Header above grid ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] text-muted-foreground">מציג {filtered.length} מתוך {totalStudents} ספורטאים</span>
          <div className="flex items-center gap-1">
            {(["name", "avg", "status"] as const).map((col) => (
              <button key={col} onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:bg-accent transition-colors">
                {col === "name" ? "שם" : col === "avg" ? "ממוצע" : "סטטוס"}
                <SortIcon col={col} />
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card-premium">
            <EmptyState icon={Search} title="לא נמצאו תלמידים" description="נסי לשנות את הסינון או חפשי שם אחר" />
          </div>
        ) : viewMode === "summary" ? (
          /* ── SUMMARY PIVOT: subjects as columns ── */
          <div className="card-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse" dir="rtl">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-right p-3 font-semibold text-foreground sticky right-0 bg-muted/40 z-10 border-b border-border min-w-[180px]">שם התלמיד</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground border-b border-border whitespace-nowrap">כיתה</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground border-b border-border whitespace-nowrap">ענף</th>
                    {allSubjectNames.map((name) => (
                      <th key={name} className="text-center p-3 font-semibold text-foreground border-b border-border whitespace-nowrap min-w-[110px]">{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student, idx) => {
                    const rows = (subjectRowsByStudent.get(student.id) || []) as (SubjectRow & { __noData?: boolean })[];
                    const byName = new Map(rows.map(r => [r.subjectName, r]));
                    return (
                      <tr
                        key={student.id}
                        onClick={() => navigate(`/students/${student.id}`)}
                        className={`cursor-pointer hover:bg-accent/30 transition-colors ${idx % 2 === 0 ? "bg-card" : "bg-muted/10"}`}
                      >
                        <td className="p-3 font-medium text-foreground sticky right-0 bg-inherit border-b border-border/60 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <InitialsAvatar name={student.full_name} size="sm" />
                            <span className="truncate">{student.full_name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground border-b border-border/60 whitespace-nowrap">{student.class_name}</td>
                        <td className="p-3 text-muted-foreground border-b border-border/60 whitespace-nowrap">{student.sport}</td>
                        {allSubjectNames.map((name) => {
                          const r = byName.get(name);
                          const noData = !r || (r as any).__noData;
                          const dot = noData ? STATUS_DOT.gray : STATUS_DOT[r!.status];
                          return (
                            <td key={name} className="p-3 text-center border-b border-border/60">
                              {noData ? (
                                <div className="inline-flex items-center justify-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                                  <span className="text-muted-foreground/50">—</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex flex-col items-center gap-0">
                                    {r!.grade != null ? (
                                      <>
                                        <span className="text-[9px] text-muted-foreground leading-none mb-0.5">ציון</span>
                                        <div className="inline-flex items-center gap-1">
                                          <span className={`w-2 h-2 rounded-full ${dot}`} />
                                          <span className="tabular-nums text-foreground font-semibold text-[13px] leading-none">{r!.grade}</span>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="inline-flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                                        <span className="tabular-nums text-foreground font-semibold">—</span>
                                      </div>
                                    )}
                                  </div>
                                  {r!.bagrutPercent != null && (
                                    <div className="flex flex-col items-center gap-0">
                                      <span className="text-[9px] text-muted-foreground leading-none mb-0.5">בגרות</span>
                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium leading-none ${STATUS_CHIP_BG[r!.status]}`}>
                                        {r!.bagrutPercent}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : viewMode === "table" ? (
          <div className="card-premium overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center hidden sm:table-cell"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right hidden md:table-cell">ענף</TableHead>
                    <TableHead className="text-right hidden lg:table-cell">כיתה</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">ממוצע</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student) => {
                    const status = student.overall_status as StatusType;
                    const config = statusConfig[status];
                    return (
                      <TableRow key={student.id} className={`cursor-pointer hover:bg-accent/30 ${selected.has(student.id) ? "bg-primary/5" : ""}`}>
                        <TableCell className="text-center hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selected.has(student.id)} onCheckedChange={() => toggleSelect(student.id)} />
                        </TableCell>
                        <TableCell className="font-medium" onClick={() => navigate(`/students/${student.id}`)}>
                          <div className="flex items-center gap-2">
                            <InitialsAvatar name={student.full_name} size="sm" />
                            <div className="min-w-0">
                              <span className="text-[13px] block truncate max-w-[140px]">{student.full_name}</span>
                              <span className="text-[10px] text-muted-foreground md:hidden">{student.sport}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[12px] hidden md:table-cell">{student.sport}</TableCell>
                        <TableCell className="text-[12px] hidden lg:table-cell">{student.class_name}</TableCell>
                        <TableCell className="text-[12px] font-semibold hidden sm:table-cell">{student.avg_score || "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bgClass} ${config.textClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
                            {config.label}
                          </span>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/students/${student.id}`)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setQuickEditStudent(student)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {isAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-3 w-3" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setDuplicateStudent(student); setEditStudent(student); setFormOpen(true); }} className="gap-2 text-xs"><Copy className="h-3 w-3" />שכפל</DropdownMenuItem>
                                  <DropdownMenuItem onClick={async () => { await updateStudent.mutateAsync({ id: student.id, data: { archived: true } }); toast.success(`"${student.full_name}" הועבר לארכיון`); }} className="gap-2 text-xs"><Archive className="h-3 w-3" />ארכיון</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setDeleteTarget(student)} className="gap-2 text-xs text-destructive"><Trash2 className="h-3 w-3" />מחק</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          /* ── CARD VIEW (screenshot style) ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((student) => {
              const status = student.overall_status as StatusType;
              const rows = (subjectRowsByStudent.get(student.id) || []) as (SubjectRow & { __noData?: boolean })[];
              const greenN = rows.filter(r => !r.__noData && r.status === "green").length;
              const yellowN = rows.filter(r => !r.__noData && r.status === "yellow").length;
              const redN = rows.filter(r => !r.__noData && r.status === "red").length;

              return (
                <div
                  key={student.id}
                  onClick={() => navigate(`/students/${student.id}`)}
                  className={`bg-card rounded-2xl border-[1.5px] ${STATUS_BORDER[status]} p-4 cursor-pointer hover:shadow-md transition-all`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3" dir="rtl">
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-foreground leading-tight truncate">{student.full_name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{student.sport} · {student.class_name}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setQuickEditStudent(student)} className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground" title="עריכה">
                        <Pencil className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  {/* Column headers (once per card) */}
                  <div className="flex items-center justify-between gap-2 pb-1 mb-1 border-b border-border/40" dir="rtl">
                    <span className="text-[10px] text-muted-foreground">מקצוע</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="w-8 text-center text-[10px] text-muted-foreground">ציון</span>
                      <span className="w-12 text-center text-[10px] text-muted-foreground">% בגרות</span>
                    </div>
                  </div>

                  {/* Subject list */}
                  <ul className="space-y-0 mb-3">
                    {rows.map((row) => <SubjectLine key={row.subjectName} row={row} />)}
                  </ul>

                  {/* Footer counts */}
                  <div className="flex items-center justify-center gap-4 pt-2 border-t border-border/60">
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT.red}`} />
                      <span className="tabular-nums font-semibold text-foreground">{redN}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT.yellow}`} />
                      <span className="tabular-nums font-semibold text-foreground">{yellowN}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT.green}`} />
                      <span className="tabular-nums font-semibold text-foreground">{greenN}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modals */}
      <StudentFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditStudent(null); setDuplicateStudent(null); }}
        student={editStudent}
        duplicate={!!duplicateStudent}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="מחיקת ספורטאי"
        description={`האם למחוק את "${deleteTarget?.full_name}"? כל הנתונים יימחקו לצמיתות.`}
        confirmLabel="מחק"
        destructive
        loading={deleteStudent.isPending}
      />
      <QuickEditDrawer open={!!quickEditStudent} onClose={() => setQuickEditStudent(null)} student={quickEditStudent} />
    </div>
  );
};

export default StudentsPage;
