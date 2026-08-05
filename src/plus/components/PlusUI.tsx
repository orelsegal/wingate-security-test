/**
 * רכיבי UI משותפים של "פלוס" — קטנים, נגישים, RTL.
 */
import { useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { parseShekelInput, type Agorot } from "../lib/money";

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </header>
  );
}

export function PlusCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`border-border shadow-sm ${className}`}>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

export function EmptyState({
  emoji,
  title,
  text,
  action,
}: {
  emoji: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <span aria-hidden className="text-3xl">{emoji}</span>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-3 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** קלט סכום בשקלים עם אימות; מחזיר אגורות דרך onValid. */
export function AmountField({
  id,
  label,
  value,
  onChange,
  onValid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (raw: string) => void;
  onValid: (agorot: Agorot | null) => void;
}) {
  const [touched, setTouched] = useState(false);
  const parsed = parseShekelInput(value);
  const invalid = touched && value !== "" && parsed === null;
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        dir="ltr"
        className="text-right"
        placeholder="0"
        value={value}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          onValid(parseShekelInput(e.target.value));
        }}
        onBlur={() => setTouched(true)}
      />
      {invalid && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          נראה שהסכום לא תקין — אפשר מספר עם עד שתי ספרות אחרי הנקודה.
        </p>
      )}
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  onConfirm,
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl" className="plus-theme">
        <AlertDialogHeader className="text-right">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** "העתיד שלי נבנה" — קו צמיחה שמתארך עם כל פעולה אמיתית. */
export function GrowthPath({ actions }: { actions: number }) {
  const steps = Math.min(actions, 24);
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = 8 + (i / 24) * 284;
    const y = 56 - (i / 24) * 44 - Math.sin(i * 1.1) * 3;
    points.push(`${x},${y}`);
  }
  return (
    <figure className="w-full" aria-label={`קו הצמיחה שלך: ${actions} פעולות אמיתיות עד היום`}>
      <svg viewBox="0 0 300 64" className="h-16 w-full" role="img" aria-hidden>
        <line x1="8" y1="56" x2="292" y2="56" stroke="hsl(var(--border))" strokeWidth="1" />
        {points.length > 1 && (
          <polyline className="plus-growth-path" points={points.join(" ")} />
        )}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].split(",")[0]}
            cy={points[points.length - 1].split(",")[1]}
            r="4"
            fill="hsl(var(--primary))"
          />
        )}
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        העתיד שלי נבנה — הקו מתקדם עם כל פעולה אמיתית, לא עם כל כניסה לאפליקציה.
      </figcaption>
    </figure>
  );
}

export function InlineNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground">
      {children}
    </p>
  );
}

export { Button };
