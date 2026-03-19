import { useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, X, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Info, Loader2, BookOpen, ChevronLeft, TrendingUp,
  UserPlus, Upload, Download, Settings2, Pencil, Trash2, Eye, Copy, Archive, MoreHorizontal, RefreshCw, CheckSquare,
  SlidersHorizontal,
} from "lucide-react";
import { useStudents, useAllStudentProgress, useDeleteStudent, useUpdateStudent, statusConfig, type StatusType, type Student } from "@/hooks/useStudents";
import InitialsAvatar from "@/components/InitialsAvatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import StudentFormModal from "@/components/StudentFormModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import ManageSportsModal from "@/components/ManageSportsModal";
import QuickEditDrawer from "@/components/QuickEditDrawer";
import * as XLSX from "xlsx";

const branches = ["שחייה", "טניס", "כדורגל", "אתלטיקה", "התעמלות", "ג'ודו"];
const grades = ["ט׳", "י׳", "י״א", "י״ב"];

const classToGrade = (className: string): string => {
  if (className.startsWith("י״ב") || className.startsWith("יב")) return "י״ב";
  if (className.startsWith("י״א") || className.startsWith("יא")) return "י״א";
  if (className.startsWith("י׳") || className.startsWith("י'") || className.startsWith("י")) {
    if (className.startsWith("יא") || className.startsWith("י״א")) return "י״א";
    return "י׳";
  }
  if (className.startsWith("ט")) return "ט׳";
  return className;
};

type ViewMode = "cards" | "table";

const StudentsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: students = [], isLoading } = useStudents();
  const { data: allProgress = [] } = useAllStudentProgress();
  const deleteStudent = useDeleteStudent();

  const initialStatus = searchParams.get("status") as StatusType | null;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusType | null>(initialStatus);
  const [branchFilters, setBranchFilters] = useState<string[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "avg" | "status" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // CRUD modals
  const [formOpen, setFormOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [duplicateStudent, setDuplicateStudent] = useState<Student | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [sportsOpen, setSportsOpen] = useState(false);

  // Selection for bulk actions
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
      if ((s as any).archived) return false;
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
    } else { setSortBy(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: "name" | "avg" | "status" }) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 opacity-40" strokeWidth={1.5} />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" strokeWidth={1.5} /> : <ArrowDown className="h-3 w-3 text-primary" strokeWidth={1.5} />;
  };

  const clearAll = () => {
    setSearch(""); setStatusFilter(null); setBranchFilters([]); setGradeFilter(null); setSortBy(null); setSortDir("asc");
  };

  const greenCount = students.filter(s => s.overall_status === "green" && !(s as any).archived).length;
  const yellowCount = students.filter(s => s.overall_status === "yellow" && !(s as any).archived).length;
  const redCount = students.filter(s => s.overall_status === "red" && !(s as any).archived).length;
  const total = greenCount + yellowCount + redCount;
  const avgAll = total > 0 ? (students.filter(s => !(s as any).archived).reduce((sum, s) => sum + (s.avg_score || 0), 0) / total).toFixed(0) : "—";

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
      "שם מלא": s.full_name,
      "ענף": s.sport,
      "כיתה": s.class_name,
      "ממוצע": s.avg_score || 0,
      "סטטוס": statusConfig[s.overall_status as StatusType]?.label || s.overall_status,
      "השלמה": `${s.completion_percent}%`,
      "אבחון": (s as any).diagnosis_status || "",
      "התאמות": (s as any).bagrut_accommodations || "",
      "אנגלית": (s as any).english_support || "",
      "ספר": (s as any).book_name || "",
      "ציון ספר": (s as any).book_grade || "",
      "הערות": (s as any).notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ספורטאים");
    XLSX.writeFile(wb, "ספורטאים_ייצוא.xlsx");
    toast.success(`${data.length} ספורטאים יוצאו בהצלחה`);
  }, [filtered, selected]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
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
              תמונת מצב עדכנית &middot; {total} ספורטאים
              {user?.role === "coach" ? ` · ענף ${user.scopeFilter?.[0]}` : ""}
            </p>
          </div>
        </div>
      </section>

      {/* ── ADMIN TOOLBAR ── */}
      {(user?.role === "admin" || user?.role === "teacher") && (
        <section className="mb-5">
          <div className="card-premium p-3 flex flex-wrap items-center gap-2">
            <Button onClick={() => { setEditStudent(null); setDuplicateStudent(null); setFormOpen(true); }} className="gap-1.5" size="sm">
              <UserPlus className="h-3.5 w-3.5" />
              הוסף ספורטאי
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/data-entry")}>
              <Upload className="h-3.5 w-3.5" />
              ייבוא נתונים
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              ייצוא{selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSportsOpen(true)}>
              <Settings2 className="h-3.5 w-3.5" />
              ניהול ענפים
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => queryClient.invalidateQueries({ queryKey: ["students"] })}>
              <RefreshCw className="h-3.5 w-3.5" />
              רענן
            </Button>
            <div className="mr-auto flex items-center gap-1 border border-border rounded-lg p-0.5">
              <button onClick={() => setViewMode("cards")} className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${viewMode === "cards" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>כרטיסים</button>
              <button onClick={() => setViewMode("table")} className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>טבלה</button>
            </div>
          </div>
        </section>
      )}

      {/* ── KPI CARDS ── */}
      <section className="mb-7 md:mb-9">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {(["green", "yellow", "red"] as StatusType[]).map((type) => {
            const config = statusConfig[type];
            const count = type === "green" ? greenCount : type === "yellow" ? yellowCount : redCount;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const isActive = statusFilter === type;
            return (
              <button key={type} onClick={() => setStatusFilter(isActive ? null : type)}
                className={`card-premium p-4 md:p-5 text-start transition-all duration-200 cursor-pointer group relative overflow-hidden ${isActive ? "ring-2 ring-offset-1 " + (type === "green" ? "ring-success/40" : type === "yellow" ? "ring-warning/40" : "ring-destructive/40") : ""}`}>
                <div className={`absolute inset-0 opacity-[0.03] ${config.dotClass}`} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${config.bgClass}`}>
                      <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
                    </div>
                    {isActive && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${config.activeBg} ${config.textClass}`}>פעיל</span>}
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

        {total > 0 && (
          <div className="mt-3 card-premium p-3.5 md:p-4">
            <div className="flex h-2 rounded-full overflow-hidden bg-accent/60 gap-0.5">
              <div className="bg-success rounded-s-full transition-all duration-700" style={{ width: `${(greenCount / total) * 100}%` }} />
              <div className="bg-warning transition-all duration-700" style={{ width: `${(yellowCount / total) * 100}%` }} />
              <div className="bg-destructive rounded-e-full transition-all duration-700" style={{ width: `${(redCount / total) * 100}%` }} />
            </div>
            <div className="flex items-center gap-5 mt-2.5">
              {[{ label: "במסלול", count: greenCount, type: "green" as StatusType }, { label: "פערים", count: yellowCount, type: "yellow" as StatusType }, { label: "בסיכון", count: redCount, type: "red" as StatusType }].map(s => (
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
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3.5 h-4 w-4 text-muted-foreground/60 pointer-events-none" strokeWidth={1.5} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש לפי שם, ענף או כיתה..."
              className="w-full h-10 ps-10 pe-4 bg-background border border-border rounded-xl text-[13px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/25 transition-all duration-150" />
            {search && <button onClick={() => setSearch("")} className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" strokeWidth={1.5} /></button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["green", "yellow", "red"] as StatusType[]).map((type) => {
              const config = statusConfig[type];
              const active = statusFilter === type;
              return (
                <button key={type} onClick={() => setStatusFilter(active ? null : type)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-all duration-150 ${active ? config.activeBg + " " + config.textClass : "bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                  <span className={`w-[5px] h-[5px] rounded-full ${active ? config.dotClass : "bg-muted-foreground/30"}`} />
                  {config.label}
                </button>
              );
            })}
            <span className="w-px h-4 bg-border mx-1" />
            {branches.map((b) => {
              const active = branchFilters.includes(b);
              return (
                <button key={b} onClick={() => setBranchFilters(prev => active ? prev.filter(x => x !== b) : [...prev, b])}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-all duration-150 ${active ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                  {active && <span className="text-[8px]">✓</span>}
                  {b}
                </button>
              );
            })}
            <span className="w-px h-4 bg-border mx-1" />
            {grades.map((g) => {
              const active = gradeFilter === g;
              return (
                <button key={g} onClick={() => setGradeFilter(active ? null : g)}
                  className={`px-3 py-1.5 rounded-full text-[11.5px] font-medium transition-all duration-150 ${active ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "bg-accent/50 text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                  {g}
                </button>
              );
            })}
          </div>
          {hasFilters && (
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[11px] text-muted-foreground">{filtered.length} מתוך {total} ספורטאים</span>
              <button onClick={clearAll} className="text-[11px] font-medium text-destructive/80 hover:text-destructive transition-colors">נקה הכל</button>
            </div>
          )}
        </div>
      </section>

      {/* ── STUDENTS ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-semibold text-foreground">ספורטאים</h3>
            <span className="text-[11px] text-muted-foreground/50 bg-accent/50 px-2 py-0.5 rounded-full">{filtered.length}</span>
            {selected.size > 0 && <span className="text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full">{selected.size} נבחרו</span>}
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
        ) : viewMode === "table" ? (
          /* TABLE VIEW */
          <div className="card-premium overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right">ענף</TableHead>
                    <TableHead className="text-right">כיתה</TableHead>
                    <TableHead className="text-right">ממוצע</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">אבחון</TableHead>
                    <TableHead className="text-right">אנגלית</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student) => {
                    const status = student.overall_status as StatusType;
                    const config = statusConfig[status];
                    return (
                      <TableRow key={student.id} className={`cursor-pointer hover:bg-accent/30 ${selected.has(student.id) ? "bg-primary/5" : ""}`}>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selected.has(student.id)} onCheckedChange={() => toggleSelect(student.id)} />
                        </TableCell>
                        <TableCell className="font-medium" onClick={() => navigate(`/students/${student.id}`)}>
                          <div className="flex items-center gap-2">
                            <InitialsAvatar name={student.full_name} size="sm" />
                            <span className="text-[13px]">{student.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[12px]">{student.sport}</TableCell>
                        <TableCell className="text-[12px]">{student.class_name}</TableCell>
                        <TableCell className="text-[12px] font-semibold">{student.avg_score || "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bgClass} ${config.textClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
                            {config.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">{(student as any).diagnosis_status || "—"}</TableCell>
                        <TableCell className="text-[11px] text-muted-foreground">{(student as any).english_support || "—"}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/students/${student.id}`)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditStudent(student); setDuplicateStudent(null); setFormOpen(true); }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-3 w-3" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setDuplicateStudent(student); setEditStudent(student); setFormOpen(true); }} className="gap-2 text-xs"><Copy className="h-3 w-3" />שכפל</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeleteTarget(student)} className="gap-2 text-xs text-destructive"><Trash2 className="h-3 w-3" />מחק</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
          /* CARD VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-4">
            {filtered.map((student) => {
              const status = student.overall_status as StatusType;
              const config = statusConfig[status];
              const subjects = progressByStudent.get(student.id) || [];
              const topSubjects = subjects.slice(0, 3);
              const missingCount = subjects.reduce((acc, s) => acc + (s.missingItems?.length || 0), 0);

              return (
                <div key={student.id} className={`card-premium p-0 overflow-hidden group hover:translate-y-[-2px] transition-all duration-300 ${selected.has(student.id) ? "ring-2 ring-primary/30" : ""}`}>
                  <div className={`h-[3px] ${config.dotClass} opacity-60`} />
                  {/* Selection & actions */}
                  <div className="px-4 pt-3 flex items-center justify-between">
                    <Checkbox checked={selected.has(student.id)} onCheckedChange={() => toggleSelect(student.id)} />
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditStudent(student); setDuplicateStudent(null); setFormOpen(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(student); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="px-5 pb-3 cursor-pointer" onClick={() => navigate(`/students/${student.id}`)}>
                    <div className="flex items-start gap-3">
                      <InitialsAvatar name={student.full_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-foreground leading-tight truncate group-hover:text-primary transition-colors duration-200">{student.full_name}</p>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5">{student.sport} · {student.class_name}</p>
                      </div>
                      <span className="text-[18px] font-bold text-foreground tabular-nums shrink-0 leading-none mt-0.5">{student.avg_score || "—"}</span>
                    </div>
                  </div>

                  <div className={`mx-4 flex items-center justify-between px-3.5 py-2.5 rounded-xl ${config.bgClass}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${config.dotClass} shrink-0`} />
                      <span className={`text-[12.5px] font-semibold ${config.textClass}`}>{config.label}</span>
                    </div>
                    <span className={`text-[11px] font-medium ${config.textClass} opacity-70`}>השלמה: {student.completion_percent}%</span>
                  </div>

                  <div className="mx-4 mt-2.5"><div className="h-1 rounded-full bg-accent overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ease-out ${config.dotClass}`} style={{ width: `${student.completion_percent}%` }} /></div></div>

                  {topSubjects.length > 0 ? (
                    <div className="px-4 mt-3 pb-4">
                      <div className="flex flex-wrap gap-1.5">
                        {topSubjects.map((subj, i) => {
                          const subjConfig = statusConfig[(subj.status as StatusType)] || statusConfig.green;
                          return (
                            <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${subjConfig.bgClass} ${subjConfig.textClass}`}>
                              <span className={`w-1 h-1 rounded-full ${subjConfig.dotClass}`} />
                              {subj.subjectName}
                              {subj.grade != null && <span className="opacity-60">{subj.grade}</span>}
                            </span>
                          );
                        })}
                        {subjects.length > 3 && <span className="text-[10px] text-muted-foreground/50 px-1.5 py-0.5">+{subjects.length - 3}</span>}
                      </div>
                      {missingCount > 0 && (
                        <p className="text-[10px] text-destructive/70 mt-1.5 flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5" strokeWidth={1.5} />חוסרים: {missingCount} פריטים</p>
                      )}
                    </div>
                  ) : (
                    <div className="px-4 mt-2 pb-4">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40"><BookOpen className="h-3 w-3" strokeWidth={1.5} /><span>אין נתוני מקצועות</span></div>
                    </div>
                  )}

                  <div className="h-0 overflow-hidden group-hover:h-8 transition-all duration-200 bg-accent/30 flex items-center justify-center cursor-pointer" onClick={() => navigate(`/students/${student.id}`)}>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">צפייה בפרופיל<ChevronLeft className="h-3 w-3" strokeWidth={1.5} /></span>
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
        description={`האם למחוק את "${deleteTarget?.full_name}"? כל נתוני ההתקדמות והציונים שלו/ה יימחקו לצמיתות.`}
        confirmLabel="מחק"
        destructive
        loading={deleteStudent.isPending}
      />
      <ManageSportsModal open={sportsOpen} onClose={() => setSportsOpen(false)} />
    </div>
    </TooltipProvider>
  );
};

export default StudentsPage;
