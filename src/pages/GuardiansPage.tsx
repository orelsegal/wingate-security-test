import { useState } from "react";
import { HeartHandshake, Plus, Search, ArrowRight, Pencil, UserPlus } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/hooks/useStudents";
import { peopleApi, RELATIONSHIP_LABELS, type GuardianDetails, type GuardianLink } from "@/lib/peopleApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  OwnerGate, Spinner, ActiveChip, AccountChip, ConfirmDialog, PersonForm,
  fieldCls, btnPrimary, btnGhost, btnSmall,
} from "@/components/people/PeopleShared";

const api = peopleApi(supabase as any);

const GuardiansPage = () => (
  <OwnerGate><GuardiansInner /></OwnerGate>
);

const GuardiansInner = () => {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [editLink, setEditLink] = useState<GuardianLink | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<GuardianLink | null>(null);

  const listQuery = useQuery({
    queryKey: ["guardians", showInactive],
    queryFn: () => api.listGuardians(null, !showInactive),
  });
  const detailsQuery = useQuery({
    queryKey: ["guardian-details", selectedId],
    enabled: !!selectedId,
    queryFn: () => api.guardianDetails(selectedId!),
  });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["guardians"] });
    queryClient.invalidateQueries({ queryKey: ["guardian-details"] });
  };
  const mut = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSuccess: invalidate });
  const run = (fn: () => Promise<unknown>, okMsg: string, after?: () => void) =>
    mut.mutate(fn, {
      onSuccess: () => { toast.success(okMsg); after?.(); },
      onError: (e: any) => toast.error("הפעולה נכשלה: " + (e?.message || e)),
    });
  const saving = mut.isPending;

  const list = (listQuery.data || []).filter(g => !search || g.full_name.includes(search));
  const details = detailsQuery.data as GuardianDetails | undefined;

  /* ═══ Guardian page ═══ */
  if (selectedId) {
    return (
      <div className="p-4 sm:p-6 max-w-[900px]" dir="rtl">
        <button onClick={() => setSelectedId(null)} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-4">
          <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
          כל ההורים
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
                  <h1 className="text-[18px] font-semibold text-foreground break-words leading-snug">{details.guardian.full_name}</h1>
                  <p className="text-[12.5px] text-muted-foreground mt-1" dir="ltr">
                    {details.guardian.phone || "—"} · {details.guardian.email || "—"}
                  </p>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <ActiveChip active={details.guardian.is_active} />
                    <AccountChip hasAccount={details.guardian.has_account} />
                  </div>
                </div>
                <button onClick={() => setEditOpen(true)} className={btnSmall}>
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} />
                  עריכת פרטים
                </button>
              </div>
            </div>

            <div className="card-premium p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <h2 className="text-[14px] font-semibold text-foreground">ילדים מקושרים</h2>
                <button onClick={() => setLinkOpen(true)} className={`${btnSmall} bg-primary text-primary-foreground border-primary`}>
                  <UserPlus className="h-3.5 w-3.5" strokeWidth={1.6} />
                  קישור לתלמיד/ה
                </button>
              </div>
              {details.links.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">אין עדיין קשרים לתלמידים.</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {details.links.map(l => (
                    <div key={l.link_id} className="py-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-foreground break-words">{l.student_name}</p>
                          <p className="text-[11.5px] text-muted-foreground">
                            {RELATIONSHIP_LABELS[l.relationship_type] || l.relationship_type}
                            {l.is_primary_contact ? " · איש קשר ראשי" : ""}
                            {l.emergency_priority != null ? ` · עדיפות חירום ${l.emergency_priority}` : ""}
                            {l.active ? "" : " · קשר היסטורי"}
                          </p>
                        </div>
                        {l.active ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => setEditLink(l)} className="h-8 px-2.5 rounded-lg text-[11.5px] text-primary hover:bg-primary/10">עריכת קשר</button>
                            <button onClick={() => setUnlinkTarget(l)} className="h-8 px-2.5 rounded-lg text-[11.5px] text-destructive hover:bg-destructive/10">הסרה מהקשר</button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60 shrink-0">הסתיים</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="max-w-md" dir="rtl">
                <DialogHeader><DialogTitle className="text-[15px]">עריכת פרטי הורה</DialogTitle></DialogHeader>
                {editOpen && (
                  <PersonForm
                    initial={{ full_name: details.guardian.full_name, phone: details.guardian.phone, email: details.guardian.email, is_active: details.guardian.is_active }}
                    saving={saving} submitLabel="שמירה" showActive
                    onSubmit={(n, p, e, a) => run(() => api.updateGuardian(details.guardian.id, n, p, e, a), "הפרטים נשמרו", () => setEditOpen(false))}
                  />
                )}
              </DialogContent>
            </Dialog>

            <LinkStudentDialog open={linkOpen} onOpenChange={setLinkOpen} saving={saving}
              excludeStudentIds={new Set(details.links.filter(l => l.active).map(l => l.student_id))}
              onLink={(studentId, rel, primary, legal, updates, prio) =>
                run(() => api.linkGuardian(details.guardian.id, studentId, rel, primary, legal, updates, prio), "הקשר נוצר", () => setLinkOpen(false))} />

            <EditLinkDialog link={editLink} onOpenChange={(o) => !o && setEditLink(null)} saving={saving}
              onSave={(rel, primary, legal, updates, prio) => editLink &&
                run(() => api.updateGuardianLink(editLink.link_id, rel, primary, legal, updates, prio), "הקשר עודכן", () => setEditLink(null))} />

            <ConfirmDialog open={!!unlinkTarget} onOpenChange={(o) => !o && setUnlinkTarget(null)} saving={saving}
              title="הסרה מהקשר"
              body={`הקשר בין ${details.guardian.full_name} לבין ${unlinkTarget?.student_name || ""} יסומן כלא פעיל. ההיסטוריה נשמרת וניתן לקשר מחדש.`}
              confirmLabel="הסרה מהקשר"
              onConfirm={() => unlinkTarget && run(() => api.unlinkGuardian(unlinkTarget.link_id), "הקשר הוסר", () => setUnlinkTarget(null))} />
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
            <HeartHandshake className="h-5 w-5 text-primary" strokeWidth={1.6} />
            ניהול הורים
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">הורים ואפוטרופוסים, הילדים המקושרים ומצב החשבון</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className={`${btnPrimary} inline-flex items-center gap-1.5`}>
          <Plus className="h-4 w-4" strokeWidth={1.8} />
          הוספת הורה
        </button>
      </div>

      {/* filters hidden in pristine empty state */}
      {!(listQuery.isSuccess && (listQuery.data || []).length === 0 && !search && !showInactive) && (
      <div className="card-premium p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="h-3.5 w-3.5 absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground" strokeWidth={1.6} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי שם" aria-label="חיפוש הורה" className={`${fieldCls} pe-9`} />
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
          <HeartHandshake className="h-10 w-10 text-muted-foreground/30 mx-auto" strokeWidth={1.4} />
          <p className="text-[15px] font-semibold text-foreground">עדיין אין הורים במערכת</p>
          <p className="text-[13px] text-muted-foreground">אפשר להוסיף הורה ידנית, או להמתין לייבוא המסודר מהקובץ.</p>
          <button onClick={() => setCreateOpen(true)} className={btnPrimary}>הוספת הורה</button>
        </div>
      )}
      {listQuery.isSuccess && list.length > 0 && (
        <div className="card-premium divide-y divide-border/50">
          {list.map(g => (
            <button key={g.id} onClick={() => setSelectedId(g.id)} className="w-full flex items-center justify-between gap-2 px-4 py-3 text-start hover:bg-accent/30">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-foreground break-words">{g.full_name}</p>
                <p className="text-[11.5px] text-muted-foreground">{g.linked_students} ילדים מקושרים</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                <ActiveChip active={g.is_active} />
                <AccountChip hasAccount={g.has_account} />
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-[15px]">הוספת הורה</DialogTitle>
            <DialogDescription className="text-[12px]">קישור לילדים נעשה מעמוד ההורה לאחר היצירה.</DialogDescription>
          </DialogHeader>
          {createOpen && (
            <PersonForm saving={saving} submitLabel="יצירה"
              onSubmit={(n, p, e) => run(async () => {
                const id = await api.createGuardian(n, p, e);
                setSelectedId(id as string);
              }, "ההורה נוצר/ה", () => setCreateOpen(false))} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ── link + edit-link dialogs ── */

export const LinkStudentDialog = ({ open, onOpenChange, saving, excludeStudentIds, onLink }: {
  open: boolean; onOpenChange: (o: boolean) => void; saving: boolean;
  excludeStudentIds: Set<string>;
  onLink: (studentId: string, rel: string, primary: boolean, legal: boolean, updates: boolean, prio: number | null) => void;
}) => {
  const { data: students = [] } = useStudents();
  const [q, setQ] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [rel, setRel] = useState("mother");
  const [primary, setPrimary] = useState(false);
  const [prio, setPrio] = useState<string>("");
  const candidates = (students as any[]).filter(s => !excludeStudentIds.has(s.id) && (!q || s.full_name.includes(q)));
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setQ(""); setStudentId(null); } }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader><DialogTitle className="text-[15px]">קישור לתלמיד/ה</DialogTitle></DialogHeader>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="חיפוש תלמיד/ה" aria-label="חיפוש תלמיד" className={fieldCls} autoFocus />
        <div className="max-h-44 overflow-y-auto divide-y divide-border/50">
          {candidates.slice(0, 40).map(st => (
            <button key={st.id} onClick={() => setStudentId(st.id)}
              className={`w-full text-start px-2 py-2 text-[13px] rounded-lg ${studentId === st.id ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-accent/30"}`}>
              {st.full_name} <span className="text-[11px] text-muted-foreground">({st.class_name || "—"})</span>
            </button>
          ))}
          {candidates.length === 0 && <p className="text-[12.5px] text-muted-foreground py-2">אין תוצאות.</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11.5px] text-muted-foreground font-medium block mb-1">סוג הקשר</label>
            <select value={rel} onChange={e => setRel(e.target.value as "mother" | "father" | "guardian" | "other")} className={fieldCls} aria-label="סוג הקשר">
              {Object.entries(RELATIONSHIP_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11.5px] text-muted-foreground font-medium block mb-1">עדיפות חירום (אופציונלי)</label>
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
        <button disabled={!studentId || saving}
          onClick={() => studentId && onLink(studentId, rel, primary, true, true, prio ? Number(prio) : null)}
          className={`${btnPrimary} w-full`}>
          {saving ? "מקשרת..." : "יצירת הקשר"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

const EditLinkDialog = ({ link, onOpenChange, saving, onSave }: {
  link: GuardianLink | null; onOpenChange: (o: boolean) => void; saving: boolean;
  onSave: (rel: string, primary: boolean, legal: boolean, updates: boolean, prio: number | null) => void;
}) => {
  const [rel, setRel] = useState(link?.relationship_type || "mother");
  const [primary, setPrimary] = useState(link?.is_primary_contact || false);
  const [legal, setLegal] = useState(link?.is_legal_guardian ?? true);
  const [updates, setUpdates] = useState(link?.receives_updates ?? true);
  const [prio, setPrio] = useState<string>(link?.emergency_priority != null ? String(link.emergency_priority) : "");
  // re-seed when a new link opens
  const [seeded, setSeeded] = useState<string | null>(null);
  if (link && seeded !== link.link_id) {
    setSeeded(link.link_id);
    setRel(link.relationship_type); setPrimary(link.is_primary_contact);
    setLegal(link.is_legal_guardian); setUpdates(link.receives_updates);
    setPrio(link.emergency_priority != null ? String(link.emergency_priority) : "");
  }
  return (
    <Dialog open={!!link} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader><DialogTitle className="text-[15px]">עריכת קשר · {link?.student_name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11.5px] text-muted-foreground font-medium block mb-1">סוג הקשר</label>
            <select value={rel} onChange={e => setRel(e.target.value as "mother" | "father" | "guardian" | "other")} className={fieldCls} aria-label="סוג הקשר">
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
        {[["איש קשר ראשי", primary, setPrimary], ["אפוטרופוס/ית חוקי/ת", legal, setLegal], ["מקבל/ת עדכונים", updates, setUpdates]].map(([label, val, set]: any) => (
          <label key={label} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            <span className="text-[13px] text-foreground">{label}</span>
          </label>
        ))}
        <button disabled={saving} onClick={() => onSave(rel, primary, legal, updates, prio ? Number(prio) : null)} className={`${btnPrimary} w-full`}>
          {saving ? "שומרת..." : "שמירת הקשר"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default GuardiansPage;
