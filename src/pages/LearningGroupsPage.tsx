import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, Plus, Search, ArrowRight, Users, ShieldAlert, Loader2,
  MoreHorizontal, Archive, CopyPlus, Pencil, UserPlus, School, X, Crown,
} from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsSystemOwner } from "@/hooks/useSystemOwner";
import { useStudents, useSubjects } from "@/hooks/useStudents";
import {
  lgApi, yearLabel, normalizeClass, buildClassOptions,
  type LgListItem, type LgDetails, type LgTeacher,
} from "@/lib/learningGroupsApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const api = lgApi(supabase as any);
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];
const GRADE_OPTIONS = ["ז", "ח", "ט", "י", "יא", "יב"];
const AUDIT_LABELS: Record<string, string> = {
  "group.create": "הקבוצה נוצרה", "group.update": "פרטי הקבוצה עודכנו",
  "group.archive": "הקבוצה הועברה לארכיון", "group.restore": "הקבוצה שוחזרה מהארכיון",
  "group.duplicate": "הקבוצה שוכפלה", "teachers.set": "רשימת המורים עודכנה",
  "students.add": "תלמידים נוספו", "students.add_class": "כיתה נוספה",
  "students.remove": "תלמיד/ה הוסר/ה",
};

/* ── small shared bits ── */
const Spinner = () => <Loader2 className="h-5 w-5 animate-spin text-primary" />;
const fieldCls = "w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40";
const btnPrimary = "h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium disabled:opacity-60";
const btnGhost = "h-10 px-4 rounded-xl border border-border bg-card text-[13px] text-foreground disabled:opacity-60";

const StatusChip = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
    status === "active" ? "bg-success/10 text-success border-success/30" : "bg-muted/50 text-muted-foreground border-border"
  }`}>
    {status === "active" ? "פעילה" : "בארכיון"}
  </span>
);

const TeacherChip = ({ t }: { t: LgTeacher }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium max-w-full">
    {t.role_in_group === "lead" && <Crown className="h-3 w-3 shrink-0" strokeWidth={1.6} />}
    <span className="truncate">{t.full_name || "מורה"}{t.role_in_group === "lead" ? " · מוביל/ה" : ""}</span>
  </span>
);

/** Teachers list from the existing users mechanism (user_roles + profiles). */
const useTeachers = (enabled: boolean) =>
  useQuery({
    queryKey: ["lg-teachers-list"],
    enabled,
    queryFn: async () => {
      const [{ data: roles, error: e1 }, { data: profiles, error: e2 }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("id, full_name, email"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const pmap = new Map((profiles || []).map((p: any) => [p.id, p]));
      return (roles || [])
        .filter((r: any) => r.role === "teacher")
        .map((r: any) => ({
          user_id: r.user_id as string,
          full_name: (pmap.get(r.user_id)?.full_name || pmap.get(r.user_id)?.email || "מורה ללא שם") as string,
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name, "he"));
    },
  });

const LearningGroupsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isOwner, isLoading: ownerLoading } = useIsSystemOwner();
  /* access (UX layer; the RPCs enforce the real scope): owner manages,
     a teacher gets a read-only scoped view. Declared BEFORE any query
     that references it — a later const here is a TDZ render crash. */
  const canManage = !!isOwner;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"active" | "archived" | "all">("active");
  const [search, setSearch] = useState("");

  /* dialogs */
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [teachersOpen, setTeachersOpen] = useState(false);
  const [addStudentsOpen, setAddStudentsOpen] = useState(false);
  const [addClassOpen, setAddClassOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: subjects = [] } = useSubjects();
  const { data: allStudents = [] } = useStudents();

  /* list + per-group teachers (small scale: details fetched per group for names) */
  const listQuery = useQuery({
    queryKey: ["lg-list", yearFilter, statusFilter],
    enabled: !ownerLoading,
    retry: false,
    queryFn: async () => {
      const items = await api.list(yearFilter, statusFilter === "all" ? null : statusFilter);
      const withTeachers = await Promise.all(
        (items || []).map(async (g) => {
          try { const d = await api.details(g.id); return { ...g, teachers: d.teachers }; }
          catch { return { ...g, teachers: [] as LgTeacher[] }; }
        }),
      );
      return withTeachers as (LgListItem & { teachers: LgTeacher[] })[];
    },
  });

  const detailsQuery = useQuery({
    queryKey: ["lg-details", selectedId],
    enabled: !!selectedId,
    retry: false,
    queryFn: () => api.details(selectedId!),
  });
  const historyQuery = useQuery({
    queryKey: ["lg-history", selectedId],
    enabled: canManage && !!selectedId,
    retry: false,
    queryFn: () => api.history(selectedId!, 100),
  });
  const [gTab, setGTab] = useState<"students" | "teachers" | "details" | "history">("students");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["lg-list"] });
    queryClient.invalidateQueries({ queryKey: ["lg-details"] });
  };

  const mut = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => invalidate(),
  });
  const run = (fn: () => Promise<unknown>, okMsg: string, after?: () => void) =>
    mut.mutate(fn, {
      onSuccess: () => { toast.success(okMsg); after?.(); },
      onError: (e: any) => toast.error("הפעולה נכשלה: " + (e?.message || e)),
    });
  const saving = mut.isPending;

  if (ownerLoading) {
    return <div className="p-10 flex justify-center"><Spinner /></div>;
  }

  const groups = listQuery.data || [];
  const filtered = groups.filter(g => !search || g.name.includes(search));
  const details = detailsQuery.data;

  /* ═══════════ GROUP PAGE ═══════════ */
  if (selectedId) {
    return (
      <div className="p-4 sm:p-6 max-w-[1100px]" dir="rtl">
        <button onClick={() => setSelectedId(null)} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4">
          <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
          כל הקבוצות
        </button>

        {detailsQuery.isLoading && <div className="p-10 flex justify-center"><Spinner /></div>}
        {detailsQuery.isError && (
          <div className="card-premium p-6 text-center space-y-2">
            <p className="text-[13px] text-destructive">טעינת הקבוצה נכשלה: {(detailsQuery.error as any)?.message}</p>
            <button onClick={() => detailsQuery.refetch()} className={btnGhost}>ניסיון חוזר</button>
          </div>
        )}

        {details && (() => {
          const g = details.group;
          const subjName = subjects.find((s: any) => s.id === g.subject_id)?.subject_name || "";
          const activeIds = new Set(details.active_students.map(s => s.student_id));
          return (
            <>
              {/* Header — identity + gated actions, one calm band */}
              <div className="card-premium px-4 sm:px-5 py-3.5 mb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h1 className="text-[18px] sm:text-[20px] font-semibold text-foreground break-words leading-snug">{g.name}</h1>
                    <p className="text-[12.5px] text-muted-foreground mt-1 flex items-center gap-x-2 flex-wrap">
                      <span>{subjName}</span>
                      <span className="text-border" aria-hidden>·</span>
                      <span dir="ltr">{yearLabel(g.academic_year_start)}</span>
                      {g.grade_code && <><span className="text-border" aria-hidden>·</span><span>שכבה {g.grade_code}</span></>}
                      <StatusChip status={g.status} />
                      {details.teachers.find(t => t.role_in_group === "lead") && (
                        <span>מוביל/ה: {details.teachers.find(t => t.role_in_group === "lead")!.full_name}</span>
                      )}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setEditOpen(true)} className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] inline-flex items-center gap-1.5">
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} />
                        עריכת פרטים
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button aria-label="פעולות נוספות" className="h-9 w-9 rounded-xl border border-border bg-card inline-flex items-center justify-center">
                            <MoreHorizontal className="h-4 w-4" strokeWidth={1.6} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDuplicateOpen(true)} className="text-[13px] gap-2">
                            <CopyPlus className="h-3.5 w-3.5" />שכפול לשנה אחרת
                          </DropdownMenuItem>
                          {g.status === "active" ? (
                            <DropdownMenuItem onClick={() => setArchiveOpen(true)} className="text-[13px] gap-2 text-destructive">
                              <Archive className="h-3.5 w-3.5" />העברה לארכיון
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => run(() => api.restore(g.id), "הקבוצה שוחזרה מהארכיון")} className="text-[13px] gap-2">
                              <GraduationCap className="h-3.5 w-3.5" />שחזור מהארכיון
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>

              {/* tab navigation — same quiet underline as the 360 profile */}
              <nav aria-label="ניווט קבוצה" className="flex gap-0.5 overflow-x-auto border-b border-border mb-3 -mx-1 px-1">
                {([
                  { id: "students", label: `תלמידים (${details.active_count})` },
                  { id: "teachers", label: "צוות הוראה" },
                  { id: "details", label: "פרטי הקבוצה" },
                  ...(canManage ? [{ id: "history", label: "היסטוריה" }] : []),
                ] as { id: typeof gTab; label: string }[]).map(t => (
                  <button key={t.id} onClick={() => setGTab(t.id)}
                    aria-current={gTab === t.id ? "page" : undefined}
                    className={`relative px-3 sm:px-3.5 pt-1.5 pb-2.5 text-[13px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-t-lg ${
                      gTab === t.id ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
                    {t.label}
                    {gTab === t.id && <span aria-hidden className="absolute bottom-0 inset-x-2 h-[2.5px] rounded-full bg-primary" />}
                  </button>
                ))}
              </nav>

              {/* ── students tab ── */}
              {gTab === "students" && (
                <StudentsSection
                  details={details}
                  canManage={canManage}
                  onAddStudents={() => setAddStudentsOpen(true)}
                  onAddClass={() => setAddClassOpen(true)}
                  onRemove={(id, name) => setRemoveTarget({ id, name })}
                />
              )}

              {/* ── teaching staff tab ── */}
              {gTab === "teachers" && (
                <div className="card-premium p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <h2 className="text-[14px] font-semibold text-foreground">צוות הוראה</h2>
                    {canManage && (
                      <button onClick={() => setTeachersOpen(true)} className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] inline-flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5" strokeWidth={1.6} />
                        ניהול מורים
                      </button>
                    )}
                  </div>
                  {details.teachers.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">
                      עדיין לא שויכו מורים לקבוצה.{canManage ? ' שיוך דרך "ניהול מורים".' : ""}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {details.teachers.map(t => <TeacherChip key={t.user_id} t={t} />)}
                    </div>
                  )}
                  {(details.past_teachers || []).length > 0 && (
                    <>
                      <p className="text-[12px] font-medium text-muted-foreground mt-4 mb-1.5">שיוכים שהסתיימו</p>
                      <ul className="space-y-1">
                        {details.past_teachers!.map((t, i) => (
                          <li key={i} className="text-[12px] text-muted-foreground break-words">
                            {t.full_name || "מורה"}{t.role_in_group === "lead" ? " (מוביל/ה)" : ""}
                            {t.left_at ? ` · הסתיים ${new Date(t.left_at).toLocaleDateString("he-IL")}` : ""}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {/* ── group details tab ── */}
              {gTab === "details" && (
                <div className="card-premium p-4 sm:p-5 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-5 gap-y-3">
                    <div><p className="text-[11px] text-muted-foreground mb-0.5">מקצוע</p><p className="text-[13.5px] font-medium text-foreground">{subjName}</p></div>
                    <div><p className="text-[11px] text-muted-foreground mb-0.5">שנת לימודים</p><p className="text-[13.5px] font-medium text-foreground" dir="ltr">{yearLabel(g.academic_year_start)}</p></div>
                    <div><p className="text-[11px] text-muted-foreground mb-0.5">שכבה</p><p className="text-[13.5px] font-medium text-foreground">{g.grade_code || "לא צוינה"}</p></div>
                    <div><p className="text-[11px] text-muted-foreground mb-0.5">סטטוס</p><StatusChip status={g.status} /></div>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-0.5">תיאור</p>
                    {(g as any).description
                      ? <p className="text-[13px] text-foreground break-words whitespace-pre-wrap">{(g as any).description}</p>
                      : <p className="text-[12.5px] text-muted-foreground">אין תיאור.{canManage ? ' אפשר להוסיף דרך "עריכת פרטים".' : ""}</p>}
                  </div>
                </div>
              )}

              {/* ── history tab (managers only; audit is append-only) ── */}
              {gTab === "history" && canManage && (
                <div className="card-premium p-4 sm:p-5">
                  <h2 className="text-[14px] font-semibold text-foreground mb-2">היסטוריית פעולות</h2>
                  {historyQuery.isLoading ? (
                    <div className="space-y-2 py-1" aria-busy="true">
                      {[0, 1, 2].map(i => <div key={i} className="h-8 rounded-lg bg-muted/40 animate-pulse" />)}
                    </div>
                  ) : historyQuery.isError ? (
                    <p className="text-[12.5px] text-muted-foreground">היסטוריית הפעולות אינה זמינה בהרשאה הנוכחית.</p>
                  ) : (historyQuery.data || []).length === 0 ? (
                    <p className="text-[12.5px] text-muted-foreground">אין עדיין פעולות מתועדות לקבוצה.</p>
                  ) : (
                    <ol className="relative border-r border-border/60 pr-4 space-y-2.5">
                      {(historyQuery.data || []).map(a => (
                        <li key={a.id} className="relative">
                          <span className="absolute -right-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary/20 ring-2 ring-background" />
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                              {new Date(a.created_at).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            <p className="text-[12.5px] text-foreground leading-snug break-words">
                              {AUDIT_LABELS[a.action] || a.action} · {a.actor_name}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              {/* dialogs bound to this group */}
              <EditGroupDialog open={editOpen} onOpenChange={setEditOpen} details={details} subjects={subjects}
                saving={saving}
                onSave={(name: string, year: number, grade: string | null, description: string | null) =>
                  run(() => api.update(g.id, name, year, grade, description), "הפרטים נשמרו", () => setEditOpen(false))} />
              <TeachersDialog open={teachersOpen} onOpenChange={setTeachersOpen} current={details.teachers}
                saving={saving}
                onSave={(list) => run(() => api.setTeachers(g.id, list), "רשימת המורים עודכנה", () => setTeachersOpen(false))} />
              <AddStudentsDialog open={addStudentsOpen} onOpenChange={setAddStudentsOpen}
                allStudents={allStudents as any[]} activeIds={activeIds} saving={saving}
                onAdd={(ids) => run(() => api.addStudents(g.id, ids), "התלמידים נוספו", () => setAddStudentsOpen(false))} />
              <AddClassDialog open={addClassOpen} onOpenChange={setAddClassOpen}
                allStudents={allStudents as any[]} activeIds={activeIds} saving={saving}
                onAdd={(cls) => run(() => api.addClass(g.id, cls), "הכיתה נוספה", () => setAddClassOpen(false))} />
              <DuplicateDialog open={duplicateOpen} onOpenChange={setDuplicateOpen} saving={saving}
                onDuplicate={(year, incl) => run(async () => {
                  const newId = await api.duplicate(g.id, year, incl);
                  setSelectedId(newId as string);
                }, "הקבוצה שוכפלה", () => setDuplicateOpen(false))} />
              <ConfirmDialogLite open={archiveOpen} onOpenChange={setArchiveOpen} saving={saving}
                title="העברה לארכיון"
                body="הקבוצה תעבור לארכיון. המידע והיסטוריית החברות יישמרו, אך הקבוצה לא תעניק גישה פעילה למורים."
                confirmLabel="העברה לארכיון"
                onConfirm={() => run(() => api.archive(g.id), "הקבוצה הועברה לארכיון", () => setArchiveOpen(false))} />
              <ConfirmDialogLite open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)} saving={saving}
                title="הסרה מהקבוצה"
                body={`${removeTarget?.name || ""} יוסר/תוסר מהקבוצה. ההיסטוריה נשמרת וניתן להוסיף מחדש בכל שלב.`}
                confirmLabel="הסרה מהקבוצה"
                onConfirm={() => removeTarget && run(() => api.removeStudent(g.id, removeTarget.id), "התלמיד/ה הוסר/ה מהקבוצה", () => setRemoveTarget(null))} />
            </>
          );
        })()}
      </div>
    );
  }

  /* ═══════════ LIST PAGE ═══════════ */
  return (
    <div className="p-4 sm:p-6 max-w-[1100px]" dir="rtl">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-[20px] sm:text-[24px] font-semibold text-foreground flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" strokeWidth={1.6} />
            קבוצות לימוד
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {canManage ? "יצירה וניהול של קבוצות, מורים ותלמידים" : "הקבוצות הפעילות שבהן את/ה משויך/ת כמורה"}
          </p>
        </div>
        {canManage && (
          <button onClick={() => setCreateOpen(true)} className={`${btnPrimary} inline-flex items-center gap-1.5`}>
            <Plus className="h-4 w-4" strokeWidth={1.8} />
            קבוצה חדשה
          </button>
        )}
      </div>

      {/* Filters — hidden in the pristine empty state (single CTA stays) */}
      {!(listQuery.isSuccess && groups.length === 0 && !search && !yearFilter && statusFilter === "active") && (
      <div className="card-premium p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="h-3.5 w-3.5 absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground" strokeWidth={1.6} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש בשם הקבוצה" aria-label="חיפוש בשם הקבוצה" className={`${fieldCls} pe-9`} />
        </div>
        <select value={yearFilter ?? ""} onChange={e => setYearFilter(e.target.value ? Number(e.target.value) : null)} aria-label="שנת לימודים" dir="ltr" className={`${fieldCls} w-auto`}>
          <option value="">כל השנים</option>
          {YEAR_OPTIONS.map(y => <option key={y} value={y}>{yearLabel(y)}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} aria-label="סטטוס" className={`${fieldCls} w-auto`}>
          <option value="active">פעילות</option>
          <option value="archived">ארכיון</option>
          <option value="all">הכול</option>
        </select>
      </div>
      )}

      {listQuery.isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="card-premium h-32 animate-pulse bg-muted/30" />)}
        </div>
      )}
      {listQuery.isError && (
        <div className="card-premium p-6 text-center space-y-2">
          <p className="text-[13px] text-destructive">טעינת הקבוצות נכשלה: {(listQuery.error as any)?.message}</p>
          <button onClick={() => listQuery.refetch()} className={btnGhost}>ניסיון חוזר</button>
        </div>
      )}

      {listQuery.isSuccess && filtered.length === 0 && (
        <div className="card-premium p-10 text-center space-y-3">
          <GraduationCap className="h-10 w-10 text-muted-foreground/30 mx-auto" strokeWidth={1.4} />
          {canManage ? (
            <>
              <p className="text-[15px] font-semibold text-foreground">עדיין אין קבוצות לימוד</p>
              <p className="text-[13px] text-muted-foreground">צרי את הקבוצה הראשונה, בחרי מקצוע והוסיפי מורים ותלמידים.</p>
              <button onClick={() => setCreateOpen(true)} className={btnPrimary}>יצירת קבוצה</button>
            </>
          ) : (
            <>
              <p className="text-[15px] font-semibold text-foreground">אינך משויך/ת עדיין לאף קבוצה פעילה</p>
              <p className="text-[13px] text-muted-foreground">שיוך מורים לקבוצות נעשה על ידי מנהלת המערכת.</p>
            </>
          )}
        </div>
      )}

      {listQuery.isSuccess && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(g => (
            <button key={g.id} onClick={() => { setSelectedId(g.id); setGTab("students"); }} className="card-premium p-4 text-start hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-semibold text-foreground break-words min-w-0">{g.name}</p>
                <StatusChip status={g.status} />
              </div>
              <p className="text-[12px] text-muted-foreground mt-1">
                {g.subject_name} · <span dir="ltr">{yearLabel(g.academic_year_start)}</span>{g.grade_code ? ` · שכבה ${g.grade_code}` : ""}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2 min-h-[22px]">
                {g.teachers.length === 0
                  ? <span className="text-[11px] text-muted-foreground/60">ללא מורים</span>
                  : g.teachers.map(t => <TeacherChip key={t.user_id} t={t} />)}
              </div>
              <p className="text-[12px] text-muted-foreground mt-2 inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" strokeWidth={1.6} />
                {g.active_students} תלמידים פעילים
              </p>
            </button>
          ))}
        </div>
      )}

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} subjects={subjects} saving={saving}
        onCreate={(name: string, subjectId: string, year: number, grade: string | null,
                   description: string | null, teachers: { user_id: string; role_in_group: "lead" | "teacher" }[]) =>
          run(async () => {
            // ATOMIC: group + description + teachers, or nothing at all
            const id = await api.createFull(name, subjectId, year, grade, description, teachers);
            setSelectedId(id as string);
            setGTab("students");
          }, "הקבוצה נוצרה", () => setCreateOpen(false))} />
    </div>
  );
};

/* ═══════════ sections & dialogs ═══════════ */

const StudentsSection = ({ details, canManage, onAddStudents, onAddClass, onRemove }: {
  details: LgDetails;
  canManage: boolean;
  onAddStudents: () => void; onAddClass: () => void;
  onRemove: (id: string, name: string) => void;
}) => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: allStudents = [] } = useStudents();
  const sportOf = useMemo(() => new Map((allStudents as any[]).map(s => [s.id, s.sport])), [allStudents]);
  const list = details.active_students.filter(s => !q || s.full_name.includes(q));
  const openProfile = (id: string) => navigate(`/students/${id}`);
  return (
    <div className="card-premium p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h2 className="text-[14px] font-semibold text-foreground">תלמידים · {details.active_count} פעילים</h2>
        {canManage && (
          <div className="flex items-center gap-2">
            <button onClick={onAddClass} className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] inline-flex items-center gap-1.5">
              <School className="h-3.5 w-3.5" strokeWidth={1.6} />
              הוספת כיתה
            </button>
            <button onClick={onAddStudents} className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[12.5px] inline-flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" strokeWidth={1.6} />
              הוספת תלמידים
            </button>
          </div>
        )}
      </div>
      {details.active_students.length > 0 && (
        <div className="relative mb-3">
          <Search className="h-3.5 w-3.5 absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground" strokeWidth={1.6} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש לפי שם" aria-label="חיפוש תלמיד" className={`${fieldCls} pe-9`} />
        </div>
      )}
      {details.active_students.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          עדיין אין תלמידים בקבוצה.{canManage ? ' הוספה דרך "הוספת תלמידים" או "הוספת כיתה".' : ""}
        </p>
      ) : (
        <div className="divide-y divide-border/50">
          {list.map(s => (
            /* the WHOLE row opens the student profile (read-only per the
               viewer's role; RLS decides what the profile shows). A nested
               real <button> would be invalid inside a button, so the row is
               a keyboard-operable role="button" and the remove action stops
               propagation. */
            <div key={s.student_id}
              role="button" tabIndex={0}
              aria-label={`פתיחת הפרופיל של ${s.full_name}`}
              onClick={() => openProfile(s.student_id)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProfile(s.student_id); } }}
              className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg cursor-pointer hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground break-words">{s.full_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {s.class_name || "ללא כיתה"}{sportOf.get(s.student_id) ? ` · ${sportOf.get(s.student_id)}` : ""}
                  {s.joined_at ? ` · הצטרפות ${new Date(s.joined_at).toLocaleDateString("he-IL")}` : ""}
                </p>
              </div>
              {canManage && (
                <button onClick={e => { e.stopPropagation(); onRemove(s.student_id, s.full_name); }}
                  className="h-8 px-2.5 rounded-lg text-[11.5px] text-destructive hover:bg-destructive/10 shrink-0">
                  הסרה מהקבוצה
                </button>
              )}
            </div>
          ))}
          {list.length === 0 && <p className="text-[12px] text-muted-foreground py-3">אין תוצאות לחיפוש.</p>}
        </div>
      )}
      {(details.past_students || []).length > 0 && (
        <>
          <p className="text-[12px] font-medium text-muted-foreground mt-4 mb-1.5">חברות שהסתיימה</p>
          <ul className="space-y-1">
            {details.past_students!.map((s, i) => (
              <li key={i} className="text-[12px] text-muted-foreground break-words">
                {s.full_name} · עזב/ה {s.left_at ? new Date(s.left_at).toLocaleDateString("he-IL") : ""}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

const GroupForm = ({ initial, subjects, saving, submitLabel, onSubmit }: {
  initial?: { name: string; subject_id: string; year: number; grade: string | null; description?: string | null };
  subjects: any[]; saving: boolean; submitLabel: string;
  onSubmit: (name: string, subjectId: string, year: number, grade: string | null, description: string | null) => void;
}) => {
  const [name, setName] = useState(initial?.name || "");
  const [subjectId, setSubjectId] = useState(initial?.subject_id || "");
  const [year, setYear] = useState<number>(initial?.year || CURRENT_YEAR);
  const [grade, setGrade] = useState<string>(initial?.grade || "");
  const [description, setDescription] = useState<string>(initial?.description || "");
  const valid = name.trim().length > 0 && subjectId;
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11.5px] text-muted-foreground font-medium block mb-1" htmlFor="lg-name">שם הקבוצה</label>
        <input id="lg-name" value={name} onChange={e => setName(e.target.value)} className={fieldCls} placeholder="למשל: מתמטיקה 4 יחידות יא" />
      </div>
      <div>
        <label className="text-[11.5px] text-muted-foreground font-medium block mb-1" htmlFor="lg-subject">מקצוע</label>
        <select id="lg-subject" value={subjectId} onChange={e => setSubjectId(e.target.value)} className={fieldCls}>
          <option value="">בחרי מקצוע</option>
          {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11.5px] text-muted-foreground font-medium block mb-1" htmlFor="lg-year">שנת לימודים</label>
          <select id="lg-year" value={year} onChange={e => setYear(Number(e.target.value))} dir="ltr" className={fieldCls}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{yearLabel(y)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11.5px] text-muted-foreground font-medium block mb-1" htmlFor="lg-grade">שכבה (אופציונלי)</label>
          <select id="lg-grade" value={grade} onChange={e => setGrade(e.target.value)} className={fieldCls}>
            <option value="">ללא</option>
            {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[11.5px] text-muted-foreground font-medium block mb-1" htmlFor="lg-desc">תיאור (אופציונלי)</label>
        <textarea id="lg-desc" value={description} onChange={e => setDescription(e.target.value.slice(0, 500))}
          rows={2} className={`${fieldCls} !h-auto py-2 resize-none`} placeholder="למשל: קבוצת השלמה לקראת בגרות חורף" />
      </div>
      <button disabled={!valid || saving} onClick={() => onSubmit(name.trim(), subjectId, year, grade || null, description.trim() || null)} className={`${btnPrimary} w-full`}>
        {saving ? "שומרת..." : submitLabel}
      </button>
    </div>
  );
};

const CreateGroupDialog = ({ open, onOpenChange, subjects, saving, onCreate }: any) => {
  const teachersQuery = useTeachers(open);
  const [lead, setLead] = useState<string>("");
  const [extra, setExtra] = useState<Set<string>>(new Set());
  const teacherList = teachersQuery.data || [];
  const toggleExtra = (id: string) => {
    const next = new Set(extra);
    if (next.has(id)) next.delete(id); else next.add(id);
    next.delete(lead);
    setExtra(next);
  };
  const buildTeachers = () => [
    ...(lead ? [{ user_id: lead, role_in_group: "lead" as const }] : []),
    ...Array.from(extra).filter(id => id !== lead).map(id => ({ user_id: id, role_in_group: "teacher" as const })),
  ];
  return (
    <Dialog open={open} onOpenChange={(o: boolean) => { onOpenChange(o); if (!o) { setLead(""); setExtra(new Set()); } }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[15px]">קבוצה חדשה</DialogTitle>
          <DialogDescription className="text-[12px]">
            הקבוצה, התיאור והמורים נשמרים יחד; אם משהו נכשל, שום דבר לא נוצר.
          </DialogDescription>
        </DialogHeader>
        <GroupForm subjects={subjects} saving={saving} submitLabel="יצירת קבוצה"
          onSubmit={(name, subjectId, year, grade, description) =>
            onCreate(name, subjectId, year, grade, description, buildTeachers())} />
        <div className="border-t border-border/60 pt-3 space-y-2.5">
          <div>
            <label className="text-[11.5px] text-muted-foreground font-medium block mb-1" htmlFor="lg-lead">מורה ראשית (אופציונלי)</label>
            <select id="lg-lead" value={lead} onChange={e => { setLead(e.target.value); setExtra(prev => { const n = new Set(prev); n.delete(e.target.value); return n; }); }} className={fieldCls}>
              <option value="">ללא מורה ראשית כרגע</option>
              {teacherList.map(t => <option key={t.user_id} value={t.user_id}>{t.full_name}</option>)}
            </select>
          </div>
          {teacherList.filter(t => t.user_id !== lead).length > 0 && (
            <div>
              <p className="text-[11.5px] text-muted-foreground font-medium mb-1">מורים נוספים (אופציונלי)</p>
              <div className="max-h-32 overflow-y-auto divide-y divide-border/40">
                {teacherList.filter(t => t.user_id !== lead).map(t => (
                  <label key={t.user_id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                    <input type="checkbox" checked={extra.has(t.user_id)} onChange={() => toggleExtra(t.user_id)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                    <span className="text-[12.5px] text-foreground break-words">{t.full_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {teachersQuery.isSuccess && teacherList.length === 0 && (
            <p className="text-[12px] text-muted-foreground">אין עדיין משתמשי מורה במערכת; אפשר ליצור את הקבוצה ולשייך מורים בהמשך.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EditGroupDialog = ({ open, onOpenChange, details, subjects, saving, onSave }: any) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md" dir="rtl">
      <DialogHeader><DialogTitle className="text-[15px]">עריכת פרטי הקבוצה</DialogTitle></DialogHeader>
      {open && (
        <GroupForm
          initial={{ name: details.group.name, subject_id: details.group.subject_id, year: details.group.academic_year_start, grade: details.group.grade_code, description: (details.group as any).description }}
          subjects={subjects} saving={saving} submitLabel="שמירה"
          onSubmit={(name, _subj, year, grade, description) => onSave(name, year, grade, description)}
        />
      )}
      <p className="text-[11px] text-muted-foreground">שינוי מקצוע אינו זמין לקבוצה קיימת; במקום זאת אפשר ליצור קבוצה חדשה.</p>
    </DialogContent>
  </Dialog>
);

const TeachersDialog = ({ open, onOpenChange, current, saving, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; current: LgTeacher[]; saving: boolean;
  onSave: (list: { user_id: string; role_in_group: "lead" | "teacher" }[]) => void;
}) => {
  const teachersQuery = useTeachers(open);
  const [selected, setSelected] = useState<Map<string, "lead" | "teacher"> | null>(null);
  const sel = selected ?? new Map(current.map(t => [t.user_id, t.role_in_group]));
  const toggle = (id: string) => {
    const next = new Map(sel);
    if (next.has(id)) next.delete(id); else next.set(id, "teacher");
    setSelected(next);
  };
  const setLead = (id: string) => {
    const next = new Map<string, "lead" | "teacher">();
    sel.forEach((_, k) => next.set(k, k === id ? "lead" : "teacher"));
    setSelected(next);
  };
  const list = teachersQuery.data || [];
  const leadName = (() => {
    const leadId = Array.from(sel.entries()).find(([, r]) => r === "lead")?.[0];
    return leadId ? (list.find(t => t.user_id === leadId)?.full_name || "") : null;
  })();
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setSelected(null); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[15px]">ניהול מורים</DialogTitle>
          <DialogDescription className="text-[12px]">
            אפשר יותר ממורה אחד; מוביל/ה אחד/ת לכל היותר. הסרת מורה מסיימת את השיוך ונשמרת בהיסטוריה, ומורה שהוסרה מפסיקה מיד לראות את הקבוצה.
          </DialogDescription>
        </DialogHeader>
        {teachersQuery.isLoading && <div className="py-6 flex justify-center"><Spinner /></div>}
        {teachersQuery.isError && <p className="text-[12.5px] text-destructive">טעינת המורים נכשלה: {(teachersQuery.error as any)?.message}</p>}
        {teachersQuery.isSuccess && list.length === 0 && (
          <p className="text-[13px] text-muted-foreground">אין עדיין משתמשי מורה במערכת. הזמיני מורה דרך ניהול המשתמשים ואז חזרי לכאן.</p>
        )}
        {list.length > 0 && (
          <div className="max-h-64 overflow-y-auto divide-y divide-border/50">
            {list.map(t => {
              const checked = sel.has(t.user_id);
              const isLead = sel.get(t.user_id) === "lead";
              return (
                <div key={t.user_id} className="flex items-center justify-between gap-2 py-2">
                  <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => toggle(t.user_id)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                    <span className="text-[13px] text-foreground break-words">{t.full_name}</span>
                  </label>
                  {checked && (
                    <button onClick={() => setLead(t.user_id)}
                      className={`h-7 px-2 rounded-lg text-[11px] border shrink-0 ${isLead ? "bg-primary/10 text-primary border-primary/30 font-medium" : "border-border text-muted-foreground"}`}>
                      {isLead ? "מוביל/ה" : "קביעה כמוביל/ה"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="text-[12px] text-muted-foreground border-t border-border/60 pt-2">
          סיכום: {sel.size} מורים בקבוצה{leadName ? `, מוביל/ה: ${leadName}` : ", ללא מוביל/ה"}
        </div>
        <button disabled={saving} onClick={() => onSave(Array.from(sel.entries()).map(([user_id, role_in_group]) => ({ user_id, role_in_group })))}
          className={`${btnPrimary} w-full`}>
          {saving ? "שומרת..." : "שמירת רשימת המורים"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

const AddStudentsDialog = ({ open, onOpenChange, allStudents, activeIds, saving, onAdd }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  allStudents: any[]; activeIds: Set<string>; saving: boolean;
  onAdd: (ids: string[]) => void;
}) => {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [clsFilter, setClsFilter] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const alreadyIn = allStudents.filter(s => activeIds.has(s.id)).length;
  const archivedCount = allStudents.filter(s => !activeIds.has(s.id) && (s as any).archived).length;
  const classes = Array.from(new Set(allStudents.map(s => (s.class_name || "").trim()).filter(Boolean))).sort((a: string, b: string) => a.localeCompare(b, "he"));
  const sportsList = Array.from(new Set(allStudents.map(s => (s.sport || "").trim()).filter(Boolean))).sort((a: string, b: string) => a.localeCompare(b, "he"));
  const candidates = allStudents.filter(s =>
    !activeIds.has(s.id) && !(s as any).archived
    && (!q || s.full_name.includes(q))
    && (!clsFilter || (s.class_name || "").trim() === clsFilter)
    && (!sportFilter || (s.sport || "").trim() === sportFilter));
  const togglePick = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setPicked(next);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setPicked(new Set()); setQ(""); setClsFilter(""); setSportFilter(""); } }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader><DialogTitle className="text-[15px]">הוספת תלמידים</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground" strokeWidth={1.6} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש לפי שם" aria-label="חיפוש תלמיד להוספה" className={`${fieldCls} pe-9`} autoFocus />
        </div>
        <div className="flex gap-2">
          <select value={clsFilter} onChange={e => setClsFilter(e.target.value)} aria-label="סינון לפי כיתה" className={`${fieldCls} w-auto flex-1`}>
            <option value="">כל הכיתות</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sportFilter} onChange={e => setSportFilter(e.target.value)} aria-label="סינון לפי ענף" className={`${fieldCls} w-auto flex-1`}>
            <option value="">כל הענפים</option>
            {sportsList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="max-h-60 overflow-y-auto divide-y divide-border/50">
          {candidates.slice(0, 60).map(s => (
            <label key={s.id} className="flex items-center gap-2 py-2 cursor-pointer">
              <input type="checkbox" checked={picked.has(s.id)} onChange={() => togglePick(s.id)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
              <span className="text-[13px] text-foreground min-w-0 break-words">{s.full_name}</span>
              <span className="text-[11px] text-muted-foreground me-auto shrink-0">{s.class_name || "—"} · {s.sport || "—"}</span>
            </label>
          ))}
          {candidates.length === 0 && <p className="text-[12.5px] text-muted-foreground py-3">אין תלמידים זמינים להוספה לפי החיפוש.</p>}
        </div>
        {/* preview before saving: what will happen, in numbers */}
        <div className="text-[12px] text-muted-foreground border-t border-border/60 pt-2">
          ייתווספו {picked.size} · כבר בקבוצה {alreadyIn}
          {archivedCount > 0 ? ` · ${archivedCount} בארכיון ואינם זמינים לשיוך` : ""}
        </div>
        <button disabled={picked.size === 0 || saving} onClick={() => onAdd(Array.from(picked))} className={`${btnPrimary} w-full`}>
          {saving ? "מוסיפה..." : `הוספת ${picked.size || ""} תלמידים`}
        </button>
      </DialogContent>
    </Dialog>
  );
};

const AddClassDialog = ({ open, onOpenChange, allStudents, activeIds, saving, onAdd }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  allStudents: any[]; activeIds: Set<string>; saving: boolean;
  onAdd: (cls: string) => void;
}) => {
  const [pickedClass, setPickedClass] = useState<string | null>(null);
  const { options, missingClassCount } = useMemo(
    () => buildClassOptions(allStudents, activeIds),
    [allStudents, activeIds],
  );
  const picked = options.find(o => o.norm === pickedClass) || null;
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setPickedClass(null); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[15px]">הוספת כיתה</DialogTitle>
          <DialogDescription className="text-[12px]">בחירת כיתה מוסיפה את תלמידיה לקבוצה; אחר כך אפשר לערוך פרטנית.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {options.map(o => (
            <button key={o.norm} onClick={() => setPickedClass(o.norm)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-[13px] ${pickedClass === o.norm ? "bg-primary/10 border-primary/30 text-primary font-medium" : "border-border bg-card text-foreground"}`}>
              <span>כיתה {o.display}</span>
              <span className="text-[11.5px] text-muted-foreground">{o.newCount} יתווספו · {o.total} בכיתה</span>
            </button>
          ))}
          {options.length === 0 && <p className="text-[12.5px] text-muted-foreground py-2">אין כיתות מוגדרות בנתוני התלמידים.</p>}
        </div>
        {missingClassCount > 0 && (
          <p className="text-[11.5px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
            יש תלמידים ללא שיוך כיתה. ניתן להוסיף אותם בחיפוש ידני.
          </p>
        )}
        {picked && (
          <p className="text-[12.5px] text-foreground">יתווספו {picked.newCount} תלמידים חדשים מכיתה {picked.display}.</p>
        )}
        <button disabled={!picked || picked.newCount === 0 || saving} onClick={() => picked && onAdd(picked.norm)} className={`${btnPrimary} w-full`}>
          {saving ? "מוסיפה..." : "אישור והוספה"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

const DuplicateDialog = ({ open, onOpenChange, saving, onDuplicate }: {
  open: boolean; onOpenChange: (o: boolean) => void; saving: boolean;
  onDuplicate: (year: number, includeStudents: boolean) => void;
}) => {
  const [year, setYear] = useState<number>(CURRENT_YEAR + 1);
  const [includeStudents, setIncludeStudents] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[15px]">שכפול לשנה אחרת</DialogTitle>
          <DialogDescription className="text-[12px]">המורים מועתקים תמיד לקבוצה החדשה.</DialogDescription>
        </DialogHeader>
        <div>
          <label className="text-[11.5px] text-muted-foreground font-medium block mb-1" htmlFor="dup-year">שנת לימודים חדשה</label>
          <select id="dup-year" value={year} onChange={e => setYear(Number(e.target.value))} dir="ltr" className={fieldCls}>
            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{yearLabel(y)}</option>)}
          </select>
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={includeStudents} onChange={e => setIncludeStudents(e.target.checked)} className="h-4 w-4 mt-0.5 accent-[hsl(var(--primary))]" />
          <span className="text-[12.5px] text-foreground">
            העתקת התלמידים
            <span className="block text-[11px] text-muted-foreground">הרכב התלמידים עשוי להשתנות בין שנות לימודים.</span>
          </span>
        </label>
        <button disabled={saving} onClick={() => onDuplicate(year, includeStudents)} className={`${btnPrimary} w-full`}>
          {saving ? "משכפלת..." : "שכפול"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

const ConfirmDialogLite = ({ open, onOpenChange, title, body, confirmLabel, saving, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  title: string; body: string; confirmLabel: string; saving: boolean; onConfirm: () => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-sm" dir="rtl">
      <DialogHeader>
        <DialogTitle className="text-[15px]">{title}</DialogTitle>
        <DialogDescription className="text-[12.5px]">{body}</DialogDescription>
      </DialogHeader>
      <div className="flex items-center gap-2">
        <button disabled={saving} onClick={onConfirm} className={`${btnPrimary} flex-1`}>{saving ? "מבצעת..." : confirmLabel}</button>
        <button disabled={saving} onClick={() => onOpenChange(false)} className={btnGhost}>ביטול</button>
      </div>
    </DialogContent>
  </Dialog>
);

export default LearningGroupsPage;
