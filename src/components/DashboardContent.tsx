import { Users, ChevronLeft, Loader2, Filter, LayoutGrid, PieChart, Rows3 } from "lucide-react";
import InitialsAvatar from "@/components/InitialsAvatar";
import { useNavigate } from "react-router-dom";
import { useStudents, useAllStudentProgress } from "@/hooks/useStudents";
import { useAuth } from "@/context/AuthContext";
import { useUiLabels } from "@/context/UiLabelsContext";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DataExportTools from "@/components/DataExportTools";
import { adminStatusConfig, ADMIN_STATUS_ORDER, type AdminStatus, type AdminStatusRow } from "@/lib/adminStatus";

interface Props {
  /** When true, omits outer padding so the parent container provides spacing. */
  embedded?: boolean;
}

/** Admin "תחנת מצב": factual counts + the manual admin traffic light only.
 *  No avg_score, no overall_status, no computed statuses of any kind. */
const DashboardContent = ({ embedded = false }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { labels } = useUiLabels();
  const { data: students = [], isLoading } = useStudents();
  const { data: allProgress = [] } = useAllStudentProgress();
  const isAdminRole = user?.role === "admin" || user?.role === "developer";
  const isTeacher = user?.role === "teacher";
  const [statusFilter, setStatusFilter] = useState<AdminStatus | "all">("all");

  // Factual admin-only data (RLS enforces; non-admins never run these)
  const { data: bagrutIds } = useQuery({
    queryKey: ["all-bagrut-ids"],
    enabled: isAdminRole,
    queryFn: async () => {
      const { data, error } = await supabase.from("student_bagrut_data" as any).select("student_id");
      if (error) throw error;
      return new Set(((data as any[]) || []).map(r => r.student_id));
    },
  });
  const { data: adminStatusMap } = useQuery({
    queryKey: ["admin-status"],
    enabled: isAdminRole,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_admin_status" as any)
        .select("student_id, status, status_note, status_updated_at, status_updated_by_name");
      if (error) throw error;
      const m = new Map<string, AdminStatusRow>();
      ((data as any[]) || []).forEach(r => m.set(r.student_id, r));
      return m;
    },
  });

  const active = useMemo(() => students.filter(s => !(s as any).archived), [students]);
  const totalStudents = active.length;
  const civicsCount = useMemo(
    () => new Set((allProgress as any[]).filter(p => p.subjects?.subject_name === "אזרחות" && p.details).map(p => p.student_id)).size,
    [allProgress],
  );

  const statusOf = (id: string): AdminStatus => adminStatusMap?.get(id)?.status || "gray";
  const statusCounts = useMemo(() => {
    const c: Record<AdminStatus, number> = { gray: 0, green: 0, orange: 0, red: 0 };
    active.forEach(s => { c[statusOf(s.id)]++; });
    return c;
  }, [active, adminStatusMap]);
  const definedCount = statusCounts.green + statusCounts.orange + statusCounts.red;

  /* Branch totals (factual); admin also gets manual-status counts per branch */
  const branchStats = useMemo(() => {
    const map = new Map<string, { total: number; gray: number; green: number; orange: number; red: number }>();
    active.forEach((s) => {
      const b = s.sport || "לא צוין";
      if (!map.has(b)) map.set(b, { total: 0, gray: 0, green: 0, orange: 0, red: 0 });
      const e = map.get(b)!;
      e.total++; e[statusOf(s.id)]++;
    });
    return Array.from(map.entries())
      .map(([name, c]) => ({ name, ...c }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "he"));
  }, [active, adminStatusMap]);

  /* Students the admin explicitly marked as דורש טיפול / במעקב (real decisions only) */
  const flagged = useMemo(() => {
    const base = active
      .map(s => ({ s, st: statusOf(s.id), note: adminStatusMap?.get(s.id)?.status_note || null }))
      .filter(x => x.st === "red" || x.st === "orange")
      .sort((a, b) => (a.st === "red" ? 0 : 1) - (b.st === "red" ? 0 : 1));
    if (statusFilter === "all") return base;
    return base.filter(x => x.st === statusFilter);
  }, [active, adminStatusMap, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={embedded ? "max-w-[1400px]" : "p-5 md:p-8 lg:p-10 max-w-[1400px]"} dir="rtl">

      {/* ── Header ── */}
      <section className="mb-8 md:mb-10">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/60 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success/60" />
          </span>
          <span>{new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" })}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-[24px] md:text-[28px] font-semibold text-foreground tracking-tight leading-tight">
              {isTeacher ? labels.pages.adminDashboard.titleTeacher : labels.pages.adminDashboard.titleAdmin}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1.5">
              {labels.pages.adminDashboard.subtitle}
              {user?.role === "coach" && ` · ענף ${user.scopeFilter?.[0]}`}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0 self-start">
            {isAdminRole && (
              <label className="flex items-center gap-2 h-9 px-3.5 rounded-xl border border-border bg-card text-[12px] cursor-pointer hover:border-primary/30 transition-colors">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
                <span className="text-muted-foreground font-medium">סטטוס ניהולי:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as AdminStatus | "all")}
                  className="bg-transparent text-foreground border-0 outline-none cursor-pointer font-medium text-[12px] pr-1"
                >
                  <option value="all">דורש טיפול + במעקב</option>
                  <option value="red">דורש טיפול בלבד</option>
                  <option value="orange">במעקב בלבד</option>
                </select>
              </label>
            )}
            {(user?.role === "admin" || user?.role === "teacher" || user?.role === "coach") && (
              <DataExportTools
                students={students}
                label="כל הספורטאים"
                contextLabel="כל המערכת"
                showImport
              />
            )}
          </div>
        </div>
      </section>

      {/* ── Factual KPI cards (admin) — no averages, no computed statuses ── */}
      {isAdminRole && (
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: "תלמידים", value: totalStudents, sub: "פעילים במערכת", icon: Users },
            { label: "עם מפת בגרות", value: bagrutIds ? bagrutIds.size : "—", sub: "מתוך גיליון מפת הדרך", icon: LayoutGrid },
            { label: "עם נתוני אזרחות", value: civicsCount, sub: "מקובץ ציוני האזרחות", icon: PieChart },
            { label: "רשומות לימודיות", value: (allProgress as any[]).length, sub: "רשומות מקצוע במערכת", icon: Rows3 },
          ].map((k) => (
            <div key={k.label} className="card-premium p-5 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11.5px] font-medium text-muted-foreground">{k.label}</span>
                <k.icon className="h-3.5 w-3.5 text-muted-foreground/30" strokeWidth={1.5} />
              </div>
              <p className="text-[30px] md:text-[34px] font-semibold text-foreground leading-none tracking-tight font-stat tabular-nums">
                {k.value}
              </p>
              <p className="text-[11px] text-muted-foreground/50 mt-2.5">{k.sub}</p>
            </div>
          ))}
        </section>
      )}

      {/* ── Manual admin-status distribution (student_admin_status only) ── */}
      {isAdminRole && totalStudents > 0 && (
        <section className="card-premium p-5 md:p-6 mb-8 md:mb-10">
          <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
            <h2 className="text-[13px] font-medium text-foreground/70">סטטוס ניהולי · נקבע ידנית בלבד</h2>
            <span className="text-[11px] text-muted-foreground/60">
              {definedCount} הוגדרו · {statusCounts.gray} טרם הוגדרו
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground/60 mb-4">אינו מחושב מציונים או מנתונים; משקף החלטות של המנהלת.</p>

          <div className="flex h-2 rounded-full overflow-hidden bg-muted/60 gap-px mb-4">
            {ADMIN_STATUS_ORDER.map((st) => {
              const pct = (statusCounts[st] / totalStudents) * 100;
              return pct > 0 ? <div key={st} className={`${adminStatusConfig[st].dot} transition-all duration-700`} style={{ width: `${pct}%` }} /> : null;
            })}
          </div>

          <div className="flex flex-wrap items-center gap-5">
            {ADMIN_STATUS_ORDER.map((st) => (
              <div key={st} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${adminStatusConfig[st].dot} shrink-0`} />
                <span className="text-[11.5px] text-muted-foreground">
                  <span className="font-medium text-foreground/80 tabular-nums">{statusCounts[st]}</span>
                  <span className="text-muted-foreground/40">/{totalStudents}</span>
                  {" "}{adminStatusConfig[st].label}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Branch table: factual totals; admin also sees manual-status counts ── */}
      <section className="mb-10 md:mb-12">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[15px] font-medium text-foreground/80">תלמידים לפי ענף</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {isAdminRole ? "ספירות בלבד · סטטוס ניהולי ידני" : "ספירות בלבד"}
            </p>
          </div>
          <button
            onClick={() => navigate("/students")}
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>כל הספורטאים</span>
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="card-premium overflow-hidden">
          {/* Column headers (desktop) */}
          <div
            className="hidden md:grid px-5 py-3 border-b border-border bg-muted/50 gap-4 items-center"
            style={{ gridTemplateColumns: isAdminRole ? "1fr 56px 76px 76px 92px 92px" : "1fr 80px" }}
          >
            <span className="text-[11px] font-medium text-muted-foreground text-start">ענף</span>
            <span className="text-[11px] font-medium text-muted-foreground text-center">סה"כ</span>
            {isAdminRole && (
              <>
                <span className="text-[11px] font-medium text-muted-foreground text-center">תקין</span>
                <span className="text-[11px] font-medium text-muted-foreground text-center">במעקב</span>
                <span className="text-[11px] font-medium text-muted-foreground text-center">דורש טיפול</span>
                <span className="text-[11px] font-medium text-muted-foreground text-center">טרם הוגדר</span>
              </>
            )}
          </div>

          {branchStats.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-12 text-center">אין נתונים להצגה</p>
          ) : branchStats.map((b) => (
            <div key={b.name} className="border-b border-border last:border-0">
              {/* Mobile row */}
              <div className="md:hidden px-4 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-foreground min-w-0 break-words">{b.name}</span>
                  <span className="text-[12.5px] text-muted-foreground tabular-nums shrink-0">{b.total} תלמידים</span>
                </div>
                {isAdminRole && (
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    תקין {b.green} · במעקב {b.orange} · דורש טיפול {b.red} · טרם הוגדר {b.gray}
                  </p>
                )}
              </div>

              {/* Desktop row */}
              <div
                className="hidden md:grid px-5 py-4 items-center gap-4"
                style={{ gridTemplateColumns: isAdminRole ? "1fr 56px 76px 76px 92px 92px" : "1fr 80px" }}
              >
                <span className="text-[13.5px] font-semibold text-foreground">{b.name}</span>
                <span className="text-[13px] text-muted-foreground text-center tabular-nums">{b.total}</span>
                {isAdminRole && (
                  <>
                    <span className={`text-[13px] font-semibold text-center tabular-nums ${b.green > 0 ? "text-success/80" : "text-muted-foreground/25"}`}>{b.green}</span>
                    <span className={`text-[13px] font-semibold text-center tabular-nums ${b.orange > 0 ? "text-warning/80" : "text-muted-foreground/25"}`}>{b.orange}</span>
                    <span className={`text-[13px] font-semibold text-center tabular-nums ${b.red > 0 ? "text-destructive/80" : "text-muted-foreground/25"}`}>{b.red}</span>
                    <span className="text-[13px] text-center tabular-nums text-muted-foreground">{b.gray}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Students the admin flagged (manual red/orange only) ── */}
      {isAdminRole && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[15px] font-medium text-foreground/80">סומנו לטיפול או למעקב</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">רק תלמידים שסומנו ידנית בסטטוס הניהולי</p>
            </div>
            <button
              onClick={() => navigate("/students?status=red")}
              className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>הצג הכל</span>
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>

          <div className="card-premium divide-y divide-border">
            {flagged.length === 0 ? (
              <p className="text-[13px] text-muted-foreground py-12 text-center">
                לא סומנו תלמידים לטיפול או למעקב
              </p>
            ) : (
              flagged.slice(0, 8).map(({ s, st, note }) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/students/${s.id}`)}
                  className="flex items-center justify-between gap-3 px-5 md:px-6 py-3.5 cursor-pointer hover:bg-accent/30 transition-colors duration-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <InitialsAvatar name={s.full_name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground leading-tight break-words">{s.full_name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 break-words">{s.sport}{note ? ` · ${note}` : ""}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium shrink-0 ${adminStatusConfig[st].chip}`}>
                    <span className={`w-2 h-2 rounded-full ${adminStatusConfig[st].dot}`} />
                    {adminStatusConfig[st].label}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default DashboardContent;
