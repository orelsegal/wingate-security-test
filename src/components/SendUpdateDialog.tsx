import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Copy, Eye, Send } from "lucide-react";
import { toast } from "sonner";

/**
 * "שליחת עדכון" — זרימת תקשורת בטוחה, Preview בלבד.
 *
 * עקרונות (מחייבים, ראו docs/PRODUCT_GLOSSARY.md):
 * - הפעולה מתחילה תמיד מהקשר ברור (תלמיד/דיווח), לא "שלח לכולם".
 * - נמענים מותרים בלבד, לפי ההקשר שהמסך המארח מספק.
 * - Preview מלא (נמען, תפקיד, תלמיד קשור, תוכן, ערוץ) לפני כל אישור.
 * - אין שליחה חיצונית אמיתית בפרוסה זו: מייל/וואטסאפ מסומנים "ערוץ עתידי",
 *   והאישור מסתיים ברישום מקומי מפורש — לעולם לא בהודעת "נשלח" כוזבת.
 * - אין PII בתוך URL ואין פתיחת ערוץ חיצוני עם תוכן.
 */

export interface UpdateRecipient {
  id: string;
  name: string;
  role: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** ההקשר שממנו נפתחה הפעולה — מוצג ב־Preview */
  contextLabel: string;
  /** התלמיד הקשור (אם יש) */
  studentName?: string;
  /** הנמענים המורשים בהקשר זה בלבד */
  recipients: UpdateRecipient[];
  /** נוסח פתיחה מוצע (התבנית ניתנת לעריכה) */
  defaultBody?: string;
}

type Stage = "compose" | "preview" | "done";

const ACTION_TYPES = ["עדכון מצב", "בקשת שיחה", "תיאום המשך טיפול"];

const CHANNELS = [
  { id: "in-system", label: "בתוך המערכת", available: true },
  { id: "email", label: "מייל", available: false },
  { id: "whatsapp", label: "וואטסאפ", available: false },
];

const SendUpdateDialog = ({ open, onOpenChange, contextLabel, studentName, recipients, defaultBody }: Props) => {
  const [stage, setStage] = useState<Stage>("compose");
  const [actionType, setActionType] = useState(ACTION_TYPES[0]);
  const [recipientId, setRecipientId] = useState<string>("");
  const [body, setBody] = useState(defaultBody || "");

  const recipient = useMemo(() => recipients.find(r => r.id === recipientId) || null, [recipients, recipientId]);
  const canPreview = !!recipient && body.trim().length > 0;

  const reset = () => { setStage("compose"); setActionType(ACTION_TYPES[0]); setRecipientId(""); setBody(defaultBody || ""); };
  const close = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const copyText = () => {
    const text = `${actionType} · ${contextLabel}${studentName ? ` · ${studentName}` : ""}\nאל: ${recipient?.name} (${recipient?.role})\n\n${body}`;
    navigator.clipboard.writeText(text).then(
      () => toast.success("הנוסח הועתק"),
      () => toast.error("ההעתקה נכשלה"),
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-[15px] flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" strokeWidth={1.7} />
            שליחת עדכון
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {contextLabel}{studentName ? ` · ${studentName}` : ""} · הרשומה המלאה נשמרת בתוך המערכת
          </DialogDescription>
        </DialogHeader>

        {stage === "compose" && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">סוג הפעולה</label>
              <div className="flex flex-wrap gap-1.5">
                {ACTION_TYPES.map(t => (
                  <button key={t} onClick={() => setActionType(t)}
                    className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition-colors ${
                      actionType === t ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-accent/40"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                נמען · מוצגים רק גורמים מורשים להקשר זה
              </label>
              <div className="space-y-1.5">
                {recipients.map(r => (
                  <button key={r.id} onClick={() => setRecipientId(r.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-[12.5px] transition-colors ${
                      recipientId === r.id ? "bg-primary/10 border-primary/40 text-foreground" : "bg-card border-border text-foreground hover:bg-accent/40"
                    }`}>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-[11px] text-muted-foreground">{r.role}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">נוסח ההודעה</label>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} maxLength={1000}
                placeholder="נוסח קצר וענייני. ללא ציונים וללא פרטים רגישים שאינם נחוצים."
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary/40" />
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">ערוץ</label>
              <div className="flex flex-wrap gap-1.5">
                {CHANNELS.map(c => (
                  <span key={c.id}
                    className={`px-3 py-1.5 rounded-full border text-[11.5px] font-medium ${
                      c.available ? "bg-primary/10 border-primary/40 text-foreground" : "bg-muted/40 border-border text-muted-foreground"
                    }`}>
                    {c.label}{!c.available && " · ערוץ עתידי"}
                  </span>
                ))}
              </div>
              <p className="text-[10.5px] text-muted-foreground mt-1.5">
                בעתיד: מייל או וואטסאפ יקבלו התראה קצרה עם קישור מאובטח בלבד — בלי ציונים, בלי הערות רגישות ובלי פרטי תלמיד בתוך הקישור.
              </p>
            </div>

            <div className="flex items-center justify-start gap-2 pt-1">
              <button onClick={() => setStage("preview")} disabled={!canPreview}
                className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-medium disabled:opacity-50 inline-flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
                לתצוגה מקדימה
              </button>
              <button onClick={() => close(false)} className="h-9 px-4 rounded-xl border border-border bg-card text-[12.5px] text-foreground">
                ביטול
              </button>
            </div>
          </div>
        )}

        {stage === "preview" && recipient && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-[11px] text-muted-foreground">תצוגה מקדימה · בדקו לפני אישור</p>
              <div className="grid grid-cols-[70px_1fr] gap-y-1.5 text-[12.5px]">
                <span className="text-muted-foreground">פעולה</span><span className="font-medium text-foreground">{actionType}</span>
                <span className="text-muted-foreground">נמען</span><span className="font-medium text-foreground">{recipient.name} · {recipient.role}</span>
                {studentName && (<><span className="text-muted-foreground">תלמיד</span><span className="font-medium text-foreground">{studentName}</span></>)}
                <span className="text-muted-foreground">ערוץ</span><span className="font-medium text-foreground">בתוך המערכת</span>
              </div>
              <div className="rounded-lg bg-card border border-border p-3 text-[13px] text-foreground whitespace-pre-wrap leading-relaxed">{body}</div>
            </div>
            <div className="flex items-center justify-start gap-2">
              <button onClick={() => setStage("done")}
                className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-medium">
                אישור
              </button>
              <button onClick={() => setStage("compose")} className="h-9 px-4 rounded-xl border border-border bg-card text-[12.5px] text-foreground">
                חזרה לעריכה
              </button>
            </div>
          </div>
        )}

        {stage === "done" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="text-[13px] font-semibold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.8} />
                העדכון אושר בתצוגת ההדגמה
              </p>
              <p className="text-[11.5px] text-emerald-900/80 mt-1 leading-relaxed">
                לא בוצעה שליחה חיצונית ולא נשמרה רשומה בשרת: מנגנון ההודעות טרם חובר.
                אפשר להעתיק את הנוסח ולהעבירו ידנית, לפי שיקול דעתכם.
              </p>
            </div>
            <div className="flex items-center justify-start gap-2">
              <button onClick={copyText}
                className="h-9 px-4 rounded-xl border border-border bg-card text-[12.5px] text-foreground inline-flex items-center gap-1.5">
                <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                העתקת הנוסח
              </button>
              <button onClick={() => close(false)} className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-medium">
                סגירה
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendUpdateDialog;
