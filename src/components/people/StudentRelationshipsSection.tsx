import { useState } from "react";
import { HeartHandshake, Dumbbell, UserPlus, Search } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  peopleApi, RELATIONSHIP_LABELS, COACH_ROLE_LABELS,
  type StudentGuardianRel, type StudentCoachRel,
} from "@/lib/peopleApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Spinner, ConfirmDialog, fieldCls, btnPrimary, btnGhost } from "@/components/people/PeopleShared";

const api = peopleApi(supabase as any);

/** "קשרים" section on the student card — System Owner only (mounted behind
 *  the owner gate by the caller). Reads via get_student_relationships;
 *  all writes go through the existing stage-3A management RPCs. */
const StudentRelationshipsSection = ({ studentId, studentName }: { studentId: string; studentName: string }) => {
  const queryClient = useQueryClient();
  const [addGuardianOpen, setAddGuardianOpen] = useState(false);
  const [addCoachOpen, setAddCoachOpen] = useState(false);
  const [unlinkGuardian, setUnlinkGuardian] = useState<StudentGuardianRel | null>(null);
  const [endCoach, setEndCoach] = useState<StudentCoachRel | null>(null);

  const relQuery = useQuery({
    queryKey: ["student-relationships", studentId],
    queryFn: () => api.studentRelationships(studentId),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["student-relationships", studentId] });
  const mut = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: invalidate });
  const run = (fn: () => Promise<unknown>, okMsg: string, after?: () => void) =>
    mut.mutate(fn, {
      onSuccess: () => { toast.success(okMsg); after?.(); },
      onError: (e: any) => toast.error("הפעולה נכשלה: " + (e?.message || e)),
    });
  const saving = mut.isPending;

  const rel = relQuery.data;
  const isEmpty = rel && rel.guardians.length === 0 && rel.coaches.length === 0;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-card)] p-4 sm:p-5" dir="rtl">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h2 className="text-[14px] font-semibold text-foreground">קשרים</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setAddGuardianOpen(true)} className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] inline-flex items-center gap-1.5">
            <HeartHandshake className="h-3.5 w-3.5" strokeWidth={1.6} />
            הוספת הורה
          </button>
          <button onClick={() => setAddCoachOpen(true)} className="h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] inline-flex items-center gap-1.5">
            <Dumbbell className="h-3.5 w-3.5" strokeWidth={1.6} />
            הוספת מאמן/ת
          </button>
        </div>
      </div>

      {relQuery.isLoading && <div className="py-6 flex justify-center"><Spinner /></div>}
      {relQuery.isError && (
        <div className="text-center space-y-2 py-4">
          <p className="text-[12.5px] text-destructive">טעינת הקשרים נכשלה: {(relQuery.error as any)?.message}</p>
          <button onClick={() => relQuery.refetch()} className={btnGhost}>ניסיון חוזר</button>
        </div>
      )}
      {isEmpty && (
        <p className="text-[13px] text-muted-foreground py-2">עדיין אין קשרים לתלמיד/ה. אפשר להוסיף הורה או מאמן/ת.</p>
      )}

      {rel && rel.guardians.length > 0 && (
        <div className="mb-4">
          <p className="text-[12px] font-medium text-muted-foreground mb-1.5">הורים ואפוטרופוסים</p>
          <div className="divide-y divide-border/50">
            {rel.guardians.map(g => (
              <div key={g.link_id} className={`py-2 flex items-center justify-between gap-2 flex-wrap ${g.active ? "" : "opacity-60"}`}>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground break-words">{g.full_name}</p>
                  <p className="text-[11.5px] text-muted-foreground break-words">
                    {RELATIONSHIP_LABELS[g.relationship_type] || g.relationship_type}
                    {g.is_primary_contact ? " · איש קשר ראשי" : ""}
                    {g.emergency_priority != null ? ` · עדיפות חירום ${g.emergency_priority}` : ""}
                    {g.phone ? ` · ${g.phone}` : ""}
                    {g.active ? "" : " · קשר היסטורי"}
                  </p>
                </div>
                {g.active ? (
                  <button onClick={() => setUnlinkGuardian(g)}
                    className="h-8 px-2.5 rounded-lg text-[11.5px] text-destructive hover:bg-destructive/10 shrink-0">
                    הסרה מהקשר
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground/60 shrink-0">הסתיים</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {rel && rel.coaches.length > 0 && (
        <div>
          <p className="text-[12px] font-medium text-muted-foreground mb-1.5">מאמנים</p>
          <div className="divide-y divide-border/50">
            {rel.coaches.map(c => (
              <div key={c.assignment_id} className={`py-2 flex items-center justify-between gap-2 flex-wrap ${c.active ? "" : "opacity-60"}`}>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground break-words">{c.full_name}</p>
                  <p className="text-[11.5px] text-muted-foreground break-words">
                    {COACH_ROLE_LABELS[c.role_type] || c.role_type}
                    {c.phone ? ` · ${c.phone}` : ""}
                    {c.active ? "" : " · קשר היסטורי"}
                  </p>
                </div>
                {c.active ? (
                  <button onClick={() => setEndCoach(c)}
                    className="h-8 px-2.5 rounded-lg text-[11.5px] text-destructive hover:bg-destructive/10 shrink-0">
                    סיום הקשר
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground/60 shrink-0">הסתיים</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <AddGuardianDialog open={addGuardianOpen} onOpenChange={setAddGuardianOpen} saving={saving}
        excludeGuardianIds={new Set((rel?.guardians || []).filter(g => g.active).map(g => g.guardian_id))}
        onLink={(guardianId, relType, primary, prio) =>
          run(() => api.linkGuardian(guardianId, studentId, relType, primary, true, true, prio), "הקשר נוצר", () => setAddGuardianOpen(false))} />

      <AddCoachDialog open={addCoachOpen} onOpenChange={setAddCoachOpen} saving={saving}
        excludeActive={new Set((rel?.coaches || []).filter(c => c.active).map(c => `${c.staff_member_id}|${c.role_type}`))}
        onLink={(staffId, roleType) =>
          run(() => api.linkCoach(staffId, studentId, roleType), "הקשר נוצר", () => setAddCoachOpen(false))} />

      <ConfirmDialog open={!!unlinkGuardian} onOpenChange={(o) => !o && setUnlinkGuardian(null)} saving={saving}
        title="הסרה מהקשר"
        body={`הקשר בין ${unlinkGuardian?.full_name || ""} לבין ${studentName} יסומן כלא פעיל. ההיסטוריה נשמרת.`}
        confirmLabel="הסרה מהקשר"
        onConfirm={() => unlinkGuardian && run(() => api.unlinkGuardian(unlinkGuardian.link_id), "הקשר הוסר", () => setUnlinkGuardian(null))} />

      <ConfirmDialog open={!!endCoach} onOpenChange={(o) => !o && setEndCoach(null)} saving={saving}
        title="סיום הקשר"
        body={`הקשר בין ${endCoach?.full_name || ""} לבין ${studentName} יסומן כלא פעיל. ההיסטוריה נשמרת.`}
        confirmLabel="סיום הקשר"
        onConfirm={() => endCoach && run(() => api.unlinkCoach(endCoach.assignment_id), "הקשר הסתיים", () => setEndCoach(null))} />
    </div>
  );
};

/* ── dialogs: pick an existing person for THIS student ── */

const AddGuardianDialog = ({ open, onOpenChange, saving, excludeGuardianIds, onLink }: {
  open: boolean; onOpenChange: (o: boolean) => void; saving: boolean;
  excludeGuardianIds: Set<string>;
  onLink: (guardianId: string, relType: string, primary: boolean, prio: number | null) => void;
}) => {
  const [q, setQ] = useState("");
  const [guardianId, setGuardianId] = useState<string | null>(null);
  const [relType, setRelType] = useState("mother");
  const [primary, setPrimary] = useState(false);
  const [prio, setPrio] = useState<string>("");
  const listQuery = useQuery({
    queryKey: ["guardians-picker", open],
    enabled: open,
    queryFn: () => api.listGuardians(null, true),
  });
  const candidates = (listQuery.data || []).filter(g => !excludeGuardianIds.has(g.id) && (!q || g.full_name.includes(q)));
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setQ(""); setGuardianId(null); } }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader><DialogTitle className="text-[15px]">הוספת הורה לתלמיד/ה</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground" strokeWidth={1.6} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש הורה קיים/ת" aria-label="חיפוש הורה" className={`${fieldCls} pe-9`} autoFocus />
        </div>
        {listQuery.isLoading && <div className="py-4 flex justify-center"><Spinner /></div>}
        <div className="max-h-40 overflow-y-auto divide-y divide-border/50">
          {candidates.slice(0, 40).map(g => (
            <button key={g.id} onClick={() => setGuardianId(g.id)}
              className={`w-full text-start px-2 py-2 text-[13px] rounded-lg ${guardianId === g.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-accent/30"}`}>
              {g.full_name} <span className="text-[11px] text-muted-foreground">({g.linked_students} ילדים)</span>
            </button>
          ))}
          {listQuery.isSuccess && candidates.length === 0 && (
            <p className="text-[12.5px] text-muted-foreground py-2">לא נמצאו הורים. אפשר ליצור הורה חדש/ה במסך ניהול הורים.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11.5px] text-muted-foreground font-medium block mb-1">סוג הקשר</label>
            <select value={relType} onChange={e => setRelType(e.target.value)} className={fieldCls} aria-label="סוג הקשר">
              {Object.entries(RELATIONSHIP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11.5px] text-muted-foreground font-medium block mb-1">עדיפות חירום</label>
            <select value={prio} onChange={e => setPrio(e.target.value)} className={fieldCls} aria-label="עדיפות חירום">
              <option value="">ללא</option>
              {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={primary} onChange={e => setPrimary(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
          <span className="text-[13px] text-foreground">איש קשר ראשי</span>
        </label>
        <button disabled={!guardianId || saving}
          onClick={() => guardianId && onLink(guardianId, relType, primary, prio ? Number(prio) : null)}
          className={`${btnPrimary} w-full`}>
          {saving ? "מקשרת..." : "יצירת הקשר"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

const AddCoachDialog = ({ open, onOpenChange, saving, excludeActive, onLink }: {
  open: boolean; onOpenChange: (o: boolean) => void; saving: boolean;
  excludeActive: Set<string>;
  onLink: (staffId: string, roleType: string) => void;
}) => {
  const [q, setQ] = useState("");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [roleType, setRoleType] = useState("primary");
  const listQuery = useQuery({
    queryKey: ["staff-picker", open],
    enabled: open,
    queryFn: () => api.listStaff(null, true),
  });
  const candidates = (listQuery.data || [])
    .filter(s => (s.roles || []).includes("coach"))
    .filter(s => !excludeActive.has(`${s.id}|${roleType}`) && (!q || s.full_name.includes(q)));
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setQ(""); setStaffId(null); } }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader><DialogTitle className="text-[15px]">הוספת מאמן/ת לתלמיד/ה</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground" strokeWidth={1.6} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש מאמן/ת" aria-label="חיפוש מאמן" className={`${fieldCls} pe-9`} autoFocus />
        </div>
        {listQuery.isLoading && <div className="py-4 flex justify-center"><Spinner /></div>}
        <div className="max-h-40 overflow-y-auto divide-y divide-border/50">
          {candidates.slice(0, 40).map(s => (
            <button key={s.id} onClick={() => setStaffId(s.id)}
              className={`w-full text-start px-2 py-2 text-[13px] rounded-lg ${staffId === s.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-accent/30"}`}>
              {s.full_name} <span className="text-[11px] text-muted-foreground">({s.linked_students} תלמידים)</span>
            </button>
          ))}
          {listQuery.isSuccess && candidates.length === 0 && (
            <p className="text-[12.5px] text-muted-foreground py-2">לא נמצאו מאמנים. אפשר להוסיף איש צוות עם תפקיד מאמן/ת במסך ניהול צוות.</p>
          )}
        </div>
        <div>
          <label className="text-[11.5px] text-muted-foreground font-medium block mb-1">תפקיד בקשר</label>
          <select value={roleType} onChange={e => setRoleType(e.target.value)} className={fieldCls} aria-label="תפקיד בקשר">
            {Object.entries(COACH_ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button disabled={!staffId || saving} onClick={() => staffId && onLink(staffId, roleType)} className={`${btnPrimary} w-full`}>
          {saving ? "מקשרת..." : "יצירת הקשר"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default StudentRelationshipsSection;
