import { useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useIsSystemOwner } from "@/hooks/useSystemOwner";

export const fieldCls = "w-full h-10 px-3 rounded-lg border border-border bg-card text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40";
export const btnPrimary = "h-10 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium disabled:opacity-60";
export const btnGhost = "h-10 px-4 rounded-xl border border-border bg-card text-[13px] text-foreground disabled:opacity-60";
export const btnSmall = "h-9 px-3 rounded-xl border border-border bg-card text-[12.5px] inline-flex items-center gap-1.5";

export const Spinner = () => <Loader2 className="h-5 w-5 animate-spin text-primary" />;

export const ActiveChip = ({ active, activeLabel = "פעיל/ה", inactiveLabel = "לא פעיל/ה" }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
    active ? "bg-success/10 text-success border-success/30" : "bg-muted/50 text-muted-foreground border-border"
  }`}>{active ? activeLabel : inactiveLabel}</span>
);

export const AccountChip = ({ hasAccount }: { hasAccount: boolean }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
    hasAccount ? "bg-primary/10 text-primary border-primary/30" : "bg-muted/40 text-muted-foreground border-border"
  }`}>{hasAccount ? "מחובר/ת לחשבון" : "ללא חשבון"}</span>
);

/** System-Owner gate for admin people screens. UX layer only — the real
 *  enforcement lives in the DB RPCs. */
export const OwnerGate = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { data: isOwner, isLoading } = useIsSystemOwner();
  if (isLoading) return <div className="p-10 flex justify-center"><Spinner /></div>;
  if (!isOwner) {
    return (
      <div className="p-10 text-center space-y-3" dir="rtl">
        <ShieldAlert className="h-10 w-10 text-destructive mx-auto" strokeWidth={1.5} />
        <p className="text-foreground font-medium">אין לך הרשאה</p>
        <p className="text-muted-foreground text-[13px]">המסך זמין רק לבעלת המערכת.</p>
        <button onClick={() => navigate("/")} className="text-primary text-[13px] hover:underline">חזרה לדף הראשי</button>
      </div>
    );
  }
  return <>{children}</>;
};

export const ConfirmDialog = ({ open, onOpenChange, title, body, confirmLabel, saving, onConfirm }: {
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

/** Person create/edit form (guardian or staff): name required, phone/email
 *  optional, active toggle on edit. No auth linking, no address, no IDs. */
export const PersonForm = ({ initial, saving, submitLabel, showActive, onSubmit }: {
  initial?: { full_name: string; phone: string | null; email: string | null; is_active: boolean };
  saving: boolean; submitLabel: string; showActive?: boolean;
  onSubmit: (fullName: string, phone: string | null, email: string | null, isActive: boolean) => void;
}) => {
  const [name, setName] = useState(initial?.full_name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [active, setActive] = useState(initial?.is_active ?? true);
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11.5px] text-muted-foreground font-medium block mb-1" htmlFor="pf-name">שם מלא</label>
        <input id="pf-name" value={name} onChange={e => setName(e.target.value)} className={fieldCls} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11.5px] text-muted-foreground font-medium block mb-1" htmlFor="pf-phone">טלפון (אופציונלי)</label>
          <input id="pf-phone" value={phone} onChange={e => setPhone(e.target.value)} className={fieldCls} dir="ltr" />
        </div>
        <div>
          <label className="text-[11.5px] text-muted-foreground font-medium block mb-1" htmlFor="pf-email">אימייל (אופציונלי)</label>
          <input id="pf-email" value={email} onChange={e => setEmail(e.target.value)} className={fieldCls} dir="ltr" />
        </div>
      </div>
      {showActive && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
          <span className="text-[13px] text-foreground">פעיל/ה במערכת</span>
        </label>
      )}
      <button disabled={!name.trim() || saving}
        onClick={() => onSubmit(name.trim(), phone.trim() || null, email.trim() || null, active)}
        className={`${btnPrimary} w-full`}>
        {saving ? "שומרת..." : submitLabel}
      </button>
    </div>
  );
};
