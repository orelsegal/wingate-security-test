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
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { groupBagrut, bagrutFilled, sectionForClass, BagrutGroupsView } from "@/lib/bagrutView";
import { toast } from "sonner";
import StudentFormModal from "@/components/StudentFormModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import QuickEditDrawer from "@/components/QuickEditDrawer";
import DataExportTools from "@/components/DataExportTools";
import * as XLSX from "xlsx";
import { classToGrade } from "@/lib/schoolUtils";
import { StudentsPageSkeleton } from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";

const grades = ["ז׳", "ח׳", "ט׳", "י׳", "י״א", "י״ב"];

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

  // ── Real bagrut-roadmap data (admin-only, RLS-secured) ──
  const isBagrutViewer = user?.role === "admin" || user?.role === "developer";
  const [bagrutDialog, setBagrutDialog] = useState<Student | null>(null);
  const { data: bagrutMap } = useQuery({
    queryKey: ["all-bagrut", user?.role],
    enabled: isBagrutViewer,
    queryFn: async () => {
      // Column is `data` (flat { header: value } jsonb). Do NOT swallow errors.
      const { data, error } = await supabase.from("student_bagrut_data" as any).select("student_id, data");
      if (error) throw error;
      const m = new Map<string, Record<string, unknown>>();
      ((data as any[]) || []).forEach(r => m.set(r.student_id, r.data));
      return m;
    },
  });
  const civicsMap = useMemo(() => {
    const m = new Map<string, Record<string, string | null>>();
    (allProgress as any[]).forEach(p => { if (p.subjects?.subject_name === "אזרחות" && p.details) m.set(p.student_id, p.details); });
    return m;
  }, [allProgress]);

  // ── Admin breakdowns: factual counts only (no grades/averages/statuses) ──
  const breakdowns = useMemo(() => {
    type Row = { total: number; bagrut: number; civics: number };
    const bySport = new Map<string, Row>();
    const byClass = new Map<string, Row>();
    const byGrade = new Map<string, Row>();
    const bump = (m: Map<string, Row>, key: string, hasB: boolean, hasC: boolean) => {
      const r = m.get(key) || { total: 0, bagrut: 0, civics: 0 };
      r.total++; if (hasB) r.bagrut++; if (hasC) r.civics++;
      m.set(key, r);
    };
    students.filter(s => !(s as any).archived).forEach(s => {
      const hasB = !!bagrutMap?.has(s.id);
      const hasC = civicsMap.has(s.id);
      bump(bySport, s.sport || "לא צוין", hasB, hasC);
      bump(byClass, s.class_name || "—", hasB, hasC);
      const g = classToGrade(s.class_name || "");
      bump(byGrade, grades.includes(g) ? g : "אחר", hasB, hasC);
    });
    const sorted = (m: Map<string, Row>, order?: string[]) =>
      Array.from(m.entries()).sort((a, b) =>
        order
          ? (order.indexOf(a[0]) === -1 ? 99 : order.indexOf(a[0])) - (order.indexOf(b[0]) === -1 ? 99 : order.indexOf(b[0]))
          : b[1].total - a[1].total || a[0].localeCompare(b[0], "he"));
    return {
      sports: sorted(bySport),
      classes: Array.from(byClass.entries()).sort((a, b) => a[0].localeCompare(b[0], "he")),
      gradesRows: sorted(byGrade, [...grades, "אחר"]),
    };
  }, [students, bagrutMap, civicsMap]);
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
  const classOptions = useMemo(() => Array.from(new Set(students.map(s => s.class_name).filter(Boolean))).sort(), [students]);
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
      if (classFilter && s.class_name !== classFilter) return false;
      if (subjectFilter) {
        const rows = subjectRowsByStudent.get(s.id) || [];
        const row = rows.find((r) => r.subjectName === subjectFilter);
        if (!row || (row as any).__noData) return false;
        if (gradeEntryFilter === "with" && row.grade == null) return false;
        if (gradeEntryFilter === "without" && row.grade != null) return false;
      } else if (gradeEntryFilter !== "all") {
        const rows = subjectRowsByStudent.get(s.id) || [];
        const anyWithGrade = rows.some(r => !(r as any).__noData && r.grade != null);
        if (gradeEntryFilter === "with" && !anyWithGrade) return false;
        if (gradeEntryFilter === "without" && anyWithGrade) return false;
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
  }, [students, search, statusFilter, branchFilters, gradeFilter, classFilter, gradeEntryFilter, subjectFilter, sortBy, sortDir, user, subjectRowsByStudent]);

  const hasFilters = search || statusFilter || branchFilters.length > 0 || gradeFilter || classFilter || gradeEntryFilter !== "all" || subjectFilter || sortBy;

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
    setSearch(""); setStatusFilter(null); setBranchFilters([]); setGradeFilter(null); setClassFilter(null); setGradeEntryFilter("all"); setSubjectFilter(null); setSortBy(null); setSortDir("asc");
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

      {/* ── Factual counts (no invented status) ── */}
      <section className="mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="מספר תלמידים" value={totalStudents} icon={Users} accent="neutral" />
          <KpiCard label="עם מפת בגרות" value={bagrutMap ? bagrutMap.size : 0} icon={LayoutGrid} accent="neutral" />
          <KpiCard label="עם נתוני אזרחות" value={civicsMap.size} icon={PieChart} accent="neutral" />
          <KpiCard label="רשומות לימודיות" value={allProgress.length} icon={Rows3} accent="neutral" />
        </div>
      </section>

      {/* ── Admin breakdowns: factual counts, click to filter the list ── */}
      {isBagrutViewer && (() => {
        const numCell = "w-12 sm:w-16 text-center tabular-nums text-[12px] shrink-0";
        const headCell = "w-12 sm:w-16 text-center text-[10px] text-muted-foreground shrink-0 leading-tight";
        const BreakdownCard = ({ title, cols, rows, isActive, onPick }: {
          title: string;
          cols: [string, string, string];
          rows: { name: string; a: number; b: number; c: number; clickable?: boolean }[];
          isActive: (name: string) => boolean;
          onPick: (name: string) => void;
        }) => (
          <div className="card-premium overflow-hidden">
            <div className="px-3 py-2 bg-muted/30 border-b border-border/60 flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-foreground">{title}</p>
            </div>
            <div className="px-3 pt-1.5 flex items-center gap-2" dir="rtl">
              <span className="flex-1 min-w-0" />
              {cols.map((c) => <span key={c} className={headCell}>{c}</span>)}
            </div>
            <div className="p-1.5 space-y-0.5">
              {rows.map((r) => {
                const active = isActive(r.name);
                const clickable = r.clickable !== false;
                return (
                  <button
                    key={r.name}
                    onClick={clickable ? () => onPick(r.name) : undefined}
                    className={`w-full flex items-center gap-2 px-1.5 py-1.5 rounded-lg text-start transition-colors border ${
                      active ? "bg-primary/10 border-primary/30" : "border-transparent"
                    } ${clickable ? "hover:bg-accent/40 cursor-pointer" : "cursor-default"}`}
                    dir="rtl"
                  >
                    <span className={`flex-1 min-w-0 break-words text-[12px] leading-snug ${active ? "text-primary font-semibold" : "text-foreground"}`}>{r.name}</span>
                    <span className={`${numCell} font-semibold text-foreground`}>{r.a}</span>
                    <span className={`${numCell} text-muted-foreground`}>{r.b}</span>
                    <span className={`${numCell} text-muted-foreground`}>{r.c}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
        return (
          <section className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold text-foreground">פילוח נתונים · לחיצה על שורה מסננת את הרשימה</p>
              {hasFilters && (
                <button onClick={clearAll} className="text-[11px] font-medium text-destructive/80 hover:text-destructive transition-colors px-2">ניקוי פילטרים</button>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <BreakdownCard
                title="לפי ענף ספורט"
                cols={["תלמידים", "מפת בגרות", "אזרחות"]}
                rows={breakdowns.sports.map(([name, r]) => ({ name, a: r.total, b: r.bagrut, c: r.civics }))}
                isActive={(n) => branchFilters.length === 1 && branchFilters[0] === n}
                onPick={(n) => setBranchFilters(branchFilters.length === 1 && branchFilters[0] === n ? [] : [n])}
              />
              <BreakdownCard
                title="לפי כיתה"
                cols={["תלמידים", "עם מפה", "ללא מפה"]}
                rows={breakdowns.classes.map(([name, r]) => ({ name, a: r.total, b: r.bagrut, c: r.total - r.bagrut }))}
                isActive={(n) => classFilter === n}
                onPick={(n) => setClassFilter(classFilter === n ? null : n)}
              />
              <BreakdownCard
                title="לפי שכבה"
                cols={["תלמידים", "עם מפה", "ללא מפה"]}
                rows={breakdowns.gradesRows.map(([name, r]) => ({ name, a: r.total, b: r.bagrut, c: r.total - r.bagrut, clickable: name !== "אחר" }))}
                isActive={(n) => gradeFilter === n}
                onPick={(n) => setGradeFilter(gradeFilter === n ? null : n)}
              />
            </div>
          </section>
        );
      })()}

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
            {(["name"] as const).map((col) => (
              <button key={col} onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:bg-accent transition-colors">
                שם
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
          /* ── SUMMARY: factual roster (real bagrut record counts, no invented status) ── */
          <div className="card-premium overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse" dir="rtl">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-right p-3 font-semibold text-foreground border-b border-border min-w-[180px]">שם התלמיד</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground border-b border-border whitespace-nowrap">כיתה</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground border-b border-border whitespace-nowrap">ענף</th>
                    <th className="text-center p-3 font-semibold text-muted-foreground border-b border-border whitespace-nowrap">רשומות בגיליון</th>
                    <th className="text-center p-3 font-semibold text-muted-foreground border-b border-border whitespace-nowrap">מקצועות</th>
                    <th className="text-center p-3 font-semibold text-muted-foreground border-b border-border whitespace-nowrap">נתוני אזרחות</th>
                    <th className="text-center p-3 font-semibold text-muted-foreground border-b border-border">מפת בגרות</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student, idx) => {
                    const bd = bagrutMap?.get(student.id);
                    const groups = bd ? groupBagrut(sectionForClass(student.class_name), bd, civicsMap.get(student.id)) : [];
                    const filled = bagrutFilled(groups);
                    const hasCivics = civicsMap.has(student.id);
                    return (
                      <tr key={student.id} className={`hover:bg-accent/30 transition-colors ${idx % 2 === 0 ? "bg-card" : "bg-muted/10"}`}>
                        <td onClick={() => navigate(`/students/${student.id}`)} className="p-3 font-medium text-foreground border-b border-border/60 whitespace-nowrap cursor-pointer">
                          <div className="flex items-center gap-2">
                            <InitialsAvatar name={student.full_name} size="sm" />
                            <span className="truncate">{student.full_name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground border-b border-border/60 whitespace-nowrap">{student.class_name}</td>
                        <td className="p-3 text-muted-foreground border-b border-border/60 whitespace-nowrap">{student.sport}</td>
                        <td className="p-3 text-center border-b border-border/60 tabular-nums">{filled.length > 0 ? filled.length : "—"}</td>
                        <td className="p-3 text-center border-b border-border/60 tabular-nums">{groups.length > 0 ? groups.length : "—"}</td>
                        <td className="p-3 text-center border-b border-border/60">{hasCivics ? "✓" : "—"}</td>
                        <td className="p-3 text-center border-b border-border/60">
                          {isBagrutViewer && groups.length > 0 ? (
                            <button onClick={() => setBagrutDialog(student)} className="text-[11px] text-primary hover:underline">הצג הכל</button>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
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
                    <TableHead className="text-right hidden sm:table-cell">רשומות בגיליון</TableHead>
                    <TableHead className="text-right">בגרות</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student) => {
                    const bd = bagrutMap?.get(student.id);
                    const groups = bd ? groupBagrut(sectionForClass(student.class_name), bd, civicsMap.get(student.id)) : [];
                    const filled = bagrutFilled(groups);
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
                        <TableCell className="text-[12px] font-semibold hidden sm:table-cell tabular-nums">{filled.length > 0 ? filled.length : "—"}</TableCell>
                        <TableCell>
                          {isBagrutViewer && groups.length > 0 ? (
                            <button onClick={(e) => { e.stopPropagation(); setBagrutDialog(student); }} className="text-[11px] text-primary hover:underline">
                              הצג הכל ({groups.length})
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/50">—</span>
                          )}
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
              const bd = bagrutMap?.get(student.id);
              const groups = bd ? groupBagrut(sectionForClass(student.class_name), bd, civicsMap.get(student.id)) : [];
              const filled = bagrutFilled(groups);

              return (
                <div
                  key={student.id}
                  onClick={() => navigate(`/students/${student.id}`)}
                  className="bg-card rounded-2xl border border-border p-4 cursor-pointer hover:shadow-md transition-all"
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

                  {/* Real bagrut categories — compact preview (verbatim, no invented status) */}
                  <div className="space-y-1 mb-2" dir="rtl">
                    {filled.slice(0, 6).map((it, i) => (
                      <div key={i} className="flex items-start justify-between gap-2">
                        <span className="text-[10.5px] text-muted-foreground leading-snug truncate">{it.label}</span>
                        <span className="text-[11.5px] text-foreground font-medium shrink-0">{it.value}</span>
                      </div>
                    ))}
                    {filled.length === 0 && (
                      <p className="text-[11px] text-muted-foreground/60">{isBagrutViewer ? "אין נתונים בגיליון" : "—"}</p>
                    )}
                  </div>

                  {isBagrutViewer && groups.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setBagrutDialog(student); }}
                      className="w-full text-[11px] text-primary hover:underline pt-2 border-t border-border/60"
                    >
                      הצג הכל ({filled.length} רשומות · {groups.length} מקצועות)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Full bagrut roadmap — every original column, verbatim, grouped by subject */}
      <Dialog open={!!bagrutDialog} onOpenChange={(o) => !o && setBagrutDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>בגרות — מפת הדרך · {bagrutDialog?.full_name}</DialogTitle>
            <DialogDescription>{bagrutDialog?.class_name} · {bagrutDialog?.sport}</DialogDescription>
          </DialogHeader>
          {bagrutDialog && (() => {
            const bd = bagrutMap?.get(bagrutDialog.id);
            const groups = bd ? groupBagrut(sectionForClass(bagrutDialog.class_name), bd, civicsMap.get(bagrutDialog.id)) : [];
            return groups.length ? <BagrutGroupsView groups={groups} /> : <p className="text-muted-foreground text-sm">אין נתוני בגרות</p>;
          })()}
        </DialogContent>
      </Dialog>

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
