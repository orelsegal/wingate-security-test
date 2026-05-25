/**
 * AdminLabelsPage — עורך תוויות ממשק
 *
 * Admin-only page to rename nav items, toggle their visibility, and edit
 * role titles / status labels. Changes are saved immediately via
 * UiLabelsContext (localStorage).
 */
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUiLabels } from "@/context/UiLabelsContext";
import { defaultUiLabels } from "@/config/uiLabels";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Home, CalendarRange, Users, Layers, BookOpen, ClipboardEdit,
  CalendarDays, Activity, Database, SlidersHorizontal, Mail,
  RotateCcw, CheckCircle2, Type,
} from "lucide-react";
import type { UserRole } from "@/context/AuthContext";

const NAV_META: { key: string; icon: typeof Home; defaultLabel: string; canHide: boolean }[] = [
  { key: "dashboard",      icon: Home,              defaultLabel: defaultUiLabels.nav.dashboard,      canHide: false },
  { key: "students",       icon: Users,             defaultLabel: defaultUiLabels.nav.students,       canHide: false },
  { key: "groups",         icon: Layers,            defaultLabel: defaultUiLabels.nav.groups,         canHide: true  },
  { key: "courses",        icon: BookOpen,          defaultLabel: defaultUiLabels.nav.courses,        canHide: false },
  { key: "dataEntry",      icon: ClipboardEdit,     defaultLabel: defaultUiLabels.nav.dataEntry,      canHide: false },
  { key: "calendar",       icon: CalendarDays,      defaultLabel: defaultUiLabels.nav.calendar,       canHide: true  },
  { key: "userActivity",   icon: Activity,          defaultLabel: defaultUiLabels.nav.userActivity,   canHide: true  },
  { key: "dataManagement", icon: Database,          defaultLabel: defaultUiLabels.nav.dataManagement, canHide: false },
  { key: "messages",       icon: Mail,              defaultLabel: defaultUiLabels.nav.messages,       canHide: true  },
  { key: "yearPlan",       icon: CalendarRange,     defaultLabel: defaultUiLabels.nav.yearPlan,       canHide: true  },
  { key: "adminLabels",    icon: SlidersHorizontal, defaultLabel: defaultUiLabels.nav.adminLabels,    canHide: false },
];

const ROLE_KEYS: UserRole[] = ["admin", "teacher", "coach", "parent", "student"];

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-premium rounded-xl overflow-hidden">
      <div className="px-5 py-3 bg-muted/40 border-b border-border">
        <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </section>
  );
}

function LabelRow({
  label, currentValue, defaultValue, onChange, onReset, modified,
}: {
  label: string; currentValue: string; defaultValue: string;
  onChange: (v: string) => void; onReset: () => void; modified: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-muted-foreground w-40 shrink-0">{label}</span>
      <Input value={currentValue} onChange={(e) => onChange(e.target.value)}
        className="h-8 text-[13px] flex-1" placeholder={defaultValue} />
      {modified ? (
        <button onClick={onReset} title="החזר לברירת מחדל" className="text-muted-foreground hover:text-destructive transition-colors">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      ) : <div className="w-3.5 shrink-0" />}
    </div>
  );
}

const AdminLabelsPage = () => {
  const { user } = useAuth();
  const { labels, setLabel, resetPath, resetAll, hasOverrides } = useUiLabels();
  const [flashKey, setFlashKey] = useState(0);

  if (user && user.role !== "admin") return <Navigate to="/" replace />;

  const flash = () => setFlashKey((k) => k + 1);

  const set = (path: string[], value: string | boolean) => { setLabel(path, value); flash(); };
  const reset = (path: string[]) => { resetPath(path); flash(); };

  return (
    <div className="p-5 md:p-8 max-w-[860px]" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium mb-3">
            <Type className="h-3 w-3" strokeWidth={2} />
            ממשק אדמין
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">עורך תוויות ממשק</h1>
          <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-[540px]">
            שנו שמות פריטי תפריט, תוויות תפקיד וסטטוסים — השינויים נשמרים מיידית בדפדפן.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {flashKey > 0 && (
            <span key={flashKey} className="flex items-center gap-1 text-[11px] text-primary animate-in fade-in duration-200">
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
              נשמר
            </span>
          )}
          {hasOverrides && (
            <Button size="sm" variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/5 gap-1.5 text-[12px]"
              onClick={() => { if (confirm("לאפס את כל השינויים לברירות המחדל?")) { resetAll(); flash(); } }}>
              <RotateCcw className="h-3.5 w-3.5" />
              איפוס הכל
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Nav items */}
        <SectionCard title="פריטי תפריט — שם ונראות">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 px-1 pb-1">
            <span>פריט</span>
            <div className="flex items-center gap-[72px] ml-auto">
              <span>שם</span>
              <span>הצג</span>
            </div>
          </div>
          {NAV_META.map(({ key, icon: Icon, defaultLabel, canHide }) => {
            const currentLabel = (labels.nav as Record<string, string>)[key] ?? defaultLabel;
            const visValue = (labels.visibility?.nav as Record<string, boolean | undefined>)?.[key];
            const visible = visValue !== false;
            const labelModified = currentLabel !== defaultLabel;
            return (
              <div key={key} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${visible ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40"}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
                </div>
                <Input
                  value={currentLabel}
                  onChange={(e) => set(["nav", key], e.target.value)}
                  className={`h-8 text-[13px] flex-1 ${!visible ? "opacity-50" : ""}`}
                  placeholder={defaultLabel}
                />
                {labelModified ? (
                  <button onClick={() => reset(["nav", key])} title="החזר לברירת מחדל"
                    className="text-muted-foreground hover:text-destructive transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                ) : <div className="w-3.5 shrink-0" />}
                <div className="w-10 flex justify-center shrink-0">
                  {canHide ? (
                    <Switch checked={visible} onCheckedChange={(v) => set(["visibility", "nav", key], v)}
                      className="scale-90" aria-label={visible ? "הסתר" : "הצג"} />
                  ) : (
                    <span className="text-[10px] text-muted-foreground/40">קבוע</span>
                  )}
                </div>
              </div>
            );
          })}
        </SectionCard>

        {/* Role titles (sidebar heading) */}
        <SectionCard title="כותרות סרגל לפי תפקיד">
          {ROLE_KEYS.map((role) => {
            const current = labels.roleTitles[role];
            const def = defaultUiLabels.roleTitles[role];
            const roleNameMap: Record<UserRole, string> = { developer: "מפתח", admin: "מנהל", teacher: "מורה", coach: "מאמן", parent: "הורה", student: "תלמיד" };
            return (
              <LabelRow key={role} label={roleNameMap[role]} currentValue={current} defaultValue={def}
                modified={current !== def}
                onChange={(v) => set(["roleTitles", role], v)}
                onReset={() => reset(["roleTitles", role])} />
            );
          })}
        </SectionCard>

        {/* Role labels (user chip) */}
        <SectionCard title="שמות תפקיד — התג ליד שם המשתמש">
          {ROLE_KEYS.map((role) => {
            const current = labels.roleLabels[role];
            const def = defaultUiLabels.roleLabels[role];
            const roleNameMap: Record<UserRole, string> = { developer: "מפתח", admin: "מנהל", teacher: "מורה", coach: "מאמן", parent: "הורה", student: "תלמיד" };
            return (
              <LabelRow key={role} label={roleNameMap[role]} currentValue={current} defaultValue={def}
                modified={current !== def}
                onChange={(v) => set(["roleLabels", role], v)}
                onReset={() => reset(["roleLabels", role])} />
            );
          })}
        </SectionCard>

        {/* Status labels */}
        <SectionCard title="תוויות סטטוס — תצוגה בעמוד הספורטאי">
          {(["green", "yellow", "red"] as const).map((s) => {
            const current = labels.statuses[s];
            const def = defaultUiLabels.statuses[s];
            const dotClass = s === "green" ? "bg-green-500" : s === "yellow" ? "bg-yellow-400" : "bg-red-500";
            const sLabel = s === "green" ? "ירוק (במסלול)" : s === "yellow" ? "צהוב (פערים)" : "אדום (בסיכון)";
            return (
              <div key={s} className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full shrink-0 ${dotClass}`} />
                <span className="text-[12px] text-muted-foreground w-40 shrink-0">{sLabel}</span>
                <Input value={current} onChange={(e) => set(["statuses", s], e.target.value)}
                  className="h-8 text-[13px] flex-1" placeholder={def} />
                {current !== def ? (
                  <button onClick={() => reset(["statuses", s])} title="איפוס"
                    className="text-muted-foreground hover:text-destructive"><RotateCcw className="h-3.5 w-3.5" /></button>
                ) : <div className="w-3.5" />}
              </div>
            );
          })}
        </SectionCard>

        {/* Entity nouns */}
        <SectionCard title="שמות ישויות — יחיד ורבים">
          {(["student", "students"] as const).map((key) => {
            const current = labels.entities[key];
            const def = defaultUiLabels.entities[key];
            return (
              <LabelRow key={key} label={key === "student" ? "יחיד (ספורטאי)" : "רבים (ספורטאים)"}
                currentValue={current} defaultValue={def} modified={current !== def}
                onChange={(v) => set(["entities", key], v)}
                onReset={() => reset(["entities", key])} />
            );
          })}
        </SectionCard>
      </div>

      <p className="text-[10.5px] text-muted-foreground/60 mt-8 leading-relaxed">
        שינויים נשמרים בדפדפן זה בלבד (localStorage). לניהול פריסת עמוד הספורטאי ושדות מותאמים — עברו ל<strong>בונה עמודים</strong>.
      </p>
    </div>
  );
};

export default AdminLabelsPage;
