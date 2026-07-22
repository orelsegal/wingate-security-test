import { useState } from "react";
import { Dumbbell, Plus, Search, ArrowRight, Pencil, UserPlus, Tags } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/hooks/useStudents";
import { peopleApi, STAFF_ROLE_LABELS, COACH_ROLE_LABELS, type StaffDetails, type StaffAssignment } from "@/lib/peopleApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  OwnerGate, Spinner, ActiveChip, AccountChip, ConfirmDialog, PersonForm,
  fieldCls, btnPrimary, btnGhost, btnSmall,
} from "@/components/people/PeopleShared";

const api = peopleApi(supabase as any);

const StaffPage = () => (
  <OwnerGate><StaffInner /></OwnerGate>
);

const StaffInner = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<StaffAssignment | null>(null);
  const [endTarget, setEndTarget] = useState<StaffAssignment | null>(null);

  const listQuery = useQuery({
    queryKey: ["staff", showInactive],
    queryFn: () => api.listStaff(null, !showInactive),
  });
  const detailsQuery = useQuery({
    queryKey: ["staff-details", selectedId],
    enabled: !!selectedId,
    queryFn: () => api.staffDetails(selectedId!),
  });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["staff"] });
    queryClient.invalidateQueries({ queryKey: ["staff-details"] });
  };
  const mut = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: invalidate });
  const run = (fn: () => Promise<unknown>, okMsg: string, after?: () => void) =>
    mut.mutate(fn, {
      onSuccess: () => { toast.success(okMsg); after?.(); },
      onError: (e: any) => toast.error("הפעולה נכשלה: " + (e?.message || e)),
    });
  const saving = mut.isPending;

  const list = (listQuery.data || []).filter(s => !search || s.full_name.includes(search));
  const details = detailsQuery.data as StaffDetails | undefined;
  const isCoach = (details?.roles || []).includes("coach");

  /* ═══ Staff member page ═══ */
  if (selectedId) {
    return (
      <div className="p-4 sm:p-6 max-w-[900px]" dir="rtl">
        <button onClick={() => setSelectedId(null)} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4">
          <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
          כל אנשי הצוות
        </button>
        {detailsQuery.isLoading && <div className="p-10 flex justify-center"><Spinner /></div>}
        {detailsQuery.isError && (
          <div className="card-premium p-6 text-center space-y-2">
            <p className="text-[13px] text-destructive">הטעינה נכשלה: {(detailsQuery.error as any)?.message}</p>
            <button onClick={() => detailsQuery.refetch()} className={btnGhost}>ניסיון חוזר</button>
          </div>
        )}
        {details && (
          <>
            <div className="card-premium p-4 sm:p-5 mb-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h1 className="text-[18px] font-semibold text-foreground break-words leading-snug">{details.staff.full_name}</h1>
                  <p className="text-[12.5px] text-muted-foreground mt-1" dir="ltr">
                    {details.staff.phone || "—"} · {details.staff.email || "—"}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <ActiveChip active={details.staff.is_active} />
                    <AccountChip hasAccount={details.staff.has_account} />
                    {(details.roles || []).map(r => (
                      <span key={r} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/30">
                        {STAFF_ROLE_LABELS[r] || r}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setRolesOpen(true)} className={btnSmall}>
                    <Tags className="h-3.5 w-3.5" strokeWidth={1.6} />
                    תפקידים
                  </button>
                  <button onClick={() => setEditOpen(true)} className={btnSmall}>
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} />
                    עריכת פרטים
                  </button>
                </div>
              </div>
            </div>

            <div className="card-premium p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <h2 className="text-[14px] font-semibold text-foreground">תלמידים מקושרים</h2>
                <button onClick={() => setLinkOpen(true)} disabled={!isCoach}
                  title={isCoach ? undefined : "קישור תלמידים זמין רק לבעלי תפקיד מאמן/ת"}
                  className={`${btnSmall} ${isCoach ? "bg-primary text-primary-foreground border-primary" : "opacity-50 cursor-not-allowed"}`}>
                  <UserPlus className="h-3.5 w-3.5" strokeWidth={1.6} />
                  קישור תלמיד/ה
                </button>
              </div>
              {!isCoach && (
                <p className="text-[11.5px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 mb-3">
                  קישור תלמידים אפשרי רק לאיש צוות עם תפקיד מאמן/ת.
                </p>
              )}
              {details.assignments.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">אין עדיין תלמידים מקושרים.</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {details.assignments.map(a => (
                    <div key={a.assignment_id} className="py-2.5 flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground break-words">{a.student_name}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {COACH_ROLE_LABELS[a.role_type] || a.role_type}{a.active ? "" : " · קשר היסטורי"}
                        </p>
                      </div>
                      {a.active ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setEditAssignment(a)} className="h-8 px-2.5 rounded-lg text-[11.5px] text-primary hover:bg-primary/10">שינוי תפקיד</button>
                          <button onClick={() => setEndTarget(a)} className="h-8 px-2.5 rounded-lg text-[11.5px] text-destructive hover:bg-destructive/10">סיום הקשר</button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground/60 shrink-0">הסתיים</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="max-w-md" dir="rtl">
                <DialogHeader><DialogTitle className="text-[15px]">עריכת פרטי איש צוות</DialogTitle></DialogHeader>
                {editOpen && (
                  <PersonForm
                    initial={{ full_name: details.staff.full_name, phone: details.staff.phone, email: details.staff.email, is_active: details.staff.is_active }}
                    saving={saving} submitLabel="שמירה" showActive
                    onSubmit={(n, p, e, a) => run(() => api.updateStaff(details.staff.id, n, p, e, a), "הפרטים נשמרו", () => setEditOpen(false))}
                  />
                )}
              </DialogContent>
            </Dialog>

            <RolesDialog open={rolesOpen} onOpenChange={setRolesOpen} current={details.roles || []} saving={saving}
              onSave={(roles) => run(() => api.setStaffRoles(details.staff.id, roles), "התפקידים נשמרו", () => setRolesOpen(false))} />

            <LinkCoachDialog open={linkOpen} onOpenChange={setLinkOpen} saving={saving}
              excludeActive={new Set(details.assignments.filter(a => a.active).map(a => `${a.student_id}|${a.role_type}`))}
              onLink={(studentId, roleType) =>
                run(() => api.linkCoach(details.staff.id, studentId, roleType), "הקשר נוצר", () => setLinkOpen(false))} />

            <ChangeRoleDialog assignment={editAssignment} onOpenChange={(o) => !o && setEditAssignment(null)} saving={saving}
              onSave={(roleType) => editAssignment &&
                run(() => api.updateCoachAssignment(editAssignment.assignment_id, roleType), "התפקיד עודכן", () => setEditAssignment(null))} />

            <ConfirmDialog open={!!endTarget} onOpenChange={(o) => !o && setEndTarget(null)} saving={saving}
              title="סיום הקשר"
              body={`הקשר עם ${endTarget?.student_name || ""} יסומן כלא פעיל. ההיסטוריה נשמרת וניתן לקשר מחדש.`}
              confirmLabel="סיום הקשר"
              onConfirm={() => endTarget && run(() => api.unlinkCoach(endTarget.assignment_id), "הקשר הסתיים", () => setEndTarget(null))} />
          </>
        )}
      </div>
    );
  }

  /* ═══ List ═══ */
  return (
    <div className="p-4 sm:p-6 max-w-[900px]" dir="rtl">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-[20px] sm:text-[24px] font-semibold text-foreground flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" strokeWidth={1.6} />
            ניהול צוות
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">מאמנים, מדריכים ואנשי צוות, התפקידים והתלמידים המקושרים</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className={`${btnPrimary} inline-flex items-center gap-1.5`}>
          <Plus className="h-4 w-4" strokeWidth={1.8} />
          הוספת איש צוות
        </button>
      </div>

      {/* filters hidden in pristine empty state */}
      {!(listQuery.isSuccess && (listQuery.data || []).length === 0 && !search && !showInactive) && (
      <div className="card-premium p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="h-3.5 w-3.5 absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground" strokeWidth={1.6} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי שם" aria-label="חיפוש איש צוות" className={`${fieldCls} pe-9`} />
        </div>
        <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="h-3.5 w-3.5 accent-[hsl(var(--primary))]" />
          כולל לא פעילים
        </label>
      </div>
      )}

      {listQuery.isLoading && (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="card-premium h-16 animate-pulse bg-muted/30" />)}</div>
      )}
      {listQuery.isError && (
        <div className="card-premium p-6 text-center space-y-2">
          <p className="text-[13px] text-destructive">הטעינה נכשלה: {(listQuery.error as any)?.message}</p>
          <button onClick={() => listQuery.refetch()} className={btnGhost}>ניסיון חוזר</button>
        </div>
      )}
      {listQuery.isSuccess && list.length === 0 && (
        <div className="card-premium p-10 text-center space-y-3">
          <Dumbbell className="h-10 w-10 text-muted-foreground/30 mx-auto" strokeWidth={1.4} />
          <p className="text-[15px] font-semibold text-foreground">עדיין אין אנשי צוות במערכת</p>
          <p className="text-[13px] text-muted-foreground">אפשר להוסיף ידנית, או להמתין לייבוא המסודר מהקובץ.</p>
          <button onClick={() => setCreateOpen(true)} className={btnPrimary}>הוספת איש צוות</button>
        </div>
      )}
      {listQuery.isSuccess && list.length > 0 && (
        <div className="card-premium divide-y divide-border/50">
          {list.map(s => (
            <button key={s.id} onClick={() => setSelectedId(s.id)} className="w-full flex items-center justify-between gap-2 px-4 py-3 text-start hover:bg-accent/30">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-foreground break-words">{s.full_name}</p>
                <p className="text-[11.5px] text-muted-foreground break-words">
                  {(s.roles || []).map(r => STAFF_ROLE_LABELS[r] || r).join(" · ") || "ללא תפקיד"} · {s.linked_students} תלמידים
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                <ActiveChip active={s.is_active} />
                <AccountChip hasAccount={s.has_account} />
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[15px]">הוספת איש צוות</DialogTitle>
            <DialogDescription className="text-[12px]">תפקידים וקישור תלמידים נעשים מעמוד איש הצוות לאחר היצירה.</DialogDescription>
          </DialogHeader>
          {createOpen && (
            <PersonForm saving={saving} submitLabel="יצירה"
              onSubmit={(n, p, e) => run(async () => {
                const id = await api.createStaff(n, p, e);
                setSelectedId(id as string);
              }, "איש הצוות נוצר/ה", () => setCreateOpen(false))} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ── dialogs ── */

const RolesDialog = ({ open, onOpenChange, current, saving, onSave }: {
  open: boolean; onOpenChange: (o: boolean) => void; current: string[]; saving: boolean;
  onSave: (roles: string[]) => void;
}) => {
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const sel = selected ?? new Set(current);
  const toggle = (r: string) => {
    const next = new Set(sel);
    if (next.has(r)) next.delete(r); else next.add(r);
    setSelected(next);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setSelected(null); }}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[15px]">תפקידים</DialogTitle>
          <DialogDescription className="text-[12px]">איש צוות יכול להחזיק יותר מתפקיד אחד.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          {Object.entries(STAFF_ROLE_LABELS).map(([k, v]) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer py-1">
              <input type="checkbox" checked={sel.has(k)} onChange={() => toggle(k)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
              <span className="text-[13px] text-foreground">{v}</span>
            </label>
          ))}
        </div>
        <button disabled={sel.size === 0 || saving} onClick={() => onSave(Array.from(sel))} className={`${btnPrimary} w-full`}>
          {saving ? "שומרת..." : "שמירת התפקידים"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

const LinkCoachDialog = ({ open, onOpenChange, saving, excludeActive, onLink }: {
  open: boolean; onOpenChange: (o: boolean) => void; saving: boolean;
  excludeActive: Set<string>;
  onLink: (studentId: string, roleType: string) => void;
}) => {
  const { data: students = [] } = useStudents();
  const [q, setQ] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [roleType, setRoleType] = useState("primary");
  const candidates = (students as any[]).filter(s => !excludeActive.has(`${s.id}|${roleType}`) && (!q || s.full_name.includes(q)));
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setQ(""); setStudentId(null); } }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader><DialogTitle className="text-[15px]">קישור תלמיד/ה למאמן/ת</DialogTitle></DialogHeader>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש תלמיד/ה" aria-label="חיפוש תלמיד" className={fieldCls} autoFocus />
        <div className="max-h-44 overflow-y-auto divide-y divide-border/50">
          {candidates.slice(0, 40).map(st => (
            <button key={st.id} onClick={() => setStudentId(st.id)}
              className={`w-full text-start px-2 py-2 text-[13px] rounded-lg ${studentId === st.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-accent/30"}`}>
              {st.full_name} <span className="text-[11px] text-muted-foreground">({st.class_name || "—"} · {st.sport || "—"})</span>
            </button>
          ))}
          {candidates.length === 0 && <p className="text-[12.5px] text-muted-foreground py-2">אין תוצאות.</p>}
        </div>
        <div>
          <label className="text-[11.5px] text-muted-foreground font-medium block mb-1">תפקיד בקשר</label>
          <select value={roleType} onChange={e => setRoleType(e.target.value as "primary" | "assistant" | "other")} className={fieldCls} aria-label="תפקיד בקשר">
            {Object.entries(COACH_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button disabled={!studentId || saving} onClick={() => studentId && onLink(studentId, roleType)} className={`${btnPrimary} w-full`}>
          {saving ? "מקשרת..." : "יצירת הקשר"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

const ChangeRoleDialog = ({ assignment, onOpenChange, saving, onSave }: {
  assignment: StaffAssignment | null; onOpenChange: (o: boolean) => void; saving: boolean;
  onSave: (roleType: string) => void;
}) => {
  const [roleType, setRoleType] = useState(assignment?.role_type || "primary");
  const [seeded, setSeeded] = useState<string | null>(null);
  if (assignment && seeded !== assignment.assignment_id) {
    setSeeded(assignment.assignment_id);
    setRoleType(assignment.role_type);
  }
  return (
    <Dialog open={!!assignment} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader><DialogTitle className="text-[15px]">שינוי תפקיד · {assignment?.student_name}</DialogTitle></DialogHeader>
        <select value={roleType} onChange={e => setRoleType(e.target.value as "primary" | "assistant" | "other")} className={fieldCls} aria-label="תפקיד בקשר">
          {Object.entries(COACH_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button disabled={saving} onClick={() => onSave(roleType)} className={`${btnPrimary} w-full`}>
          {saving ? "שומרת..." : "שמירה"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default StaffPage;
