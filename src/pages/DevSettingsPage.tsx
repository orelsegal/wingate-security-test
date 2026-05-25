import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { SlidersHorizontal, UserCog, LayoutTemplate, Shield, Settings, Wrench, ChevronLeft } from "lucide-react";

type Tab = "permissions" | "tools" | "settings";

type PermLevel = "edit" | "view" | "scoped" | "none";

interface PermCell {
  level: PermLevel;
  note?: string;
}

interface PermRow {
  page: string;
  developer: PermCell;
  admin: PermCell;
  teacher: PermCell;
  coach: PermCell;
  parent: PermCell;
  student: PermCell;
}

const PERM_TABLE: PermRow[] = [
  {
    page: "תמונת מצב",
    developer: { level: "edit" }, admin: { level: "edit" },
    teacher: { level: "edit" }, coach: { level: "scoped", note: "ענף שלו" },
    parent: { level: "scoped", note: "ילד שלו" }, student: { level: "scoped", note: "עצמו" },
  },
  {
    page: "ספורטאים",
    developer: { level: "edit" }, admin: { level: "edit" },
    teacher: { level: "edit" }, coach: { level: "scoped", note: "ענף שלו" },
    parent: { level: "none" }, student: { level: "none" },
  },
  {
    page: "פרופיל ספורטאי",
    developer: { level: "edit" }, admin: { level: "edit" },
    teacher: { level: "edit" }, coach: { level: "view" },
    parent: { level: "scoped", note: "ילד שלו" }, student: { level: "scoped", note: "עצמו" },
  },
  {
    page: "הזנת נתונים",
    developer: { level: "edit" }, admin: { level: "edit" },
    teacher: { level: "edit" }, coach: { level: "scoped", note: "ענף שלו" },
    parent: { level: "none" }, student: { level: "none" },
  },
  {
    page: "הזנת ציונים",
    developer: { level: "edit" }, admin: { level: "edit" },
    teacher: { level: "edit" }, coach: { level: "none" },
    parent: { level: "none" }, student: { level: "none" },
  },
  {
    page: "קבוצות",
    developer: { level: "edit" }, admin: { level: "edit" },
    teacher: { level: "edit" }, coach: { level: "view" },
    parent: { level: "none" }, student: { level: "none" },
  },
  {
    page: "מפות דרכים",
    developer: { level: "edit" }, admin: { level: "edit" },
    teacher: { level: "edit" }, coach: { level: "none" },
    parent: { level: "none" }, student: { level: "view", note: "שלו" },
  },
  {
    page: "ניהול משתמשים",
    developer: { level: "edit" }, admin: { level: "edit" },
    teacher: { level: "none" }, coach: { level: "none" },
    parent: { level: "none" }, student: { level: "none" },
  },
  {
    page: "ניהול מערכת",
    developer: { level: "edit" }, admin: { level: "edit" },
    teacher: { level: "none" }, coach: { level: "none" },
    parent: { level: "none" }, student: { level: "none" },
  },
  {
    page: "שנת 2026",
    developer: { level: "edit" }, admin: { level: "edit" },
    teacher: { level: "none" }, coach: { level: "none" },
    parent: { level: "none" }, student: { level: "none" },
  },
];

const LEVEL_CONFIG: Record<PermLevel, { label: string; bg: string; text: string }> = {
  edit:   { label: "✏️ עריכה",  bg: "bg-green-50",  text: "text-green-700" },
  view:   { label: "👁 צפייה",  bg: "bg-blue-50",   text: "text-blue-700" },
  scoped: { label: "🔍 חלקי",   bg: "bg-yellow-50", text: "text-yellow-700" },
  none:   { label: "—",         bg: "bg-gray-50",   text: "text-gray-300" },
};

const ROLES = ["developer", "admin", "teacher", "coach", "parent", "student"] as const;
const ROLE_LABELS: Record<typeof ROLES[number], string> = {
  developer: "מפתח", admin: "מנהל", teacher: "מורה",
  coach: "מאמן", parent: "הורה", student: "ספורטאי",
};

const PermissionsTab = () => (
  <div>
    <p className="text-[12px] text-muted-foreground mb-4">
      טבלת הרשאות לפי תפקיד. האכיפה תיושם בהדרגה בכל דף.
    </p>
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground w-[160px]">דף</th>
            {ROLES.map(r => (
              <th key={r} className="px-3 py-2.5 font-semibold text-muted-foreground text-center">{ROLE_LABELS[r]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERM_TABLE.map((row, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-accent/20">
              <td className="px-4 py-2.5 font-medium text-foreground">{row.page}</td>
              {ROLES.map(role => {
                const cell = row[role];
                const cfg = LEVEL_CONFIG[cell.level];
                return (
                  <td key={role} className="px-2 py-2 text-center">
                    <span className={`inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg ${cfg.bg} ${cfg.text} font-medium`}>
                      <span>{cfg.label}</span>
                      {cell.note && <span className="text-[9px] opacity-70">{cell.note}</span>}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="text-[11px] text-muted-foreground/60 mt-3">* עריכת הטבלה עם שמירה לDB תתווסף בשלב הבא</p>
  </div>
);

const ToolCard = ({ icon: Icon, title, desc, path, onClick }: {
  icon: typeof Shield; title: string; desc: string; path: string; onClick: () => void;
}) => (
  <button onClick={onClick} className="flex items-start gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-accent/30 transition-all text-right w-full group">
    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
      <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-semibold text-foreground">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
      <p className="text-[10px] text-primary/60 mt-1 font-mono">{path}</p>
    </div>
    <ChevronLeft className="h-4 w-4 text-muted-foreground/40 mt-1 group-hover:text-primary transition-colors" />
  </button>
);

const ToolsTab = ({ navigate }: { navigate: (p: string) => void }) => (
  <div className="space-y-3">
    <ToolCard icon={UserCog}          title="ניהול משתמשים"  desc="הזמנה, צפייה ועריכת משתמשים רשומים"      path="/admin/users"   onClick={() => navigate("/admin/users")} />
    <ToolCard icon={SlidersHorizontal} title="עורך תוויות"    desc="עריכת טקסטים וכותרות בממשק"              path="/admin/labels"  onClick={() => navigate("/admin/labels")} />
    <ToolCard icon={LayoutTemplate}    title="בונה עמודים"    desc="עיצוב ועריכה ויזואלית של דפי האפליקציה" path="/admin/builder" onClick={() => navigate("/admin/builder")} />
  </div>
);

const SettingsTab = () => (
  <div className="space-y-4">
    <div className="p-4 rounded-xl border border-border bg-muted/30">
      <p className="text-[13px] font-semibold text-foreground mb-1">סמסטר פעיל</p>
      <p className="text-[12px] text-muted-foreground">סמסטר א׳ תשפ״ה — ינואר–יוני 2025</p>
      <p className="text-[11px] text-muted-foreground/50 mt-2">עריכה דרך עורך התוויות → nav.semester</p>
    </div>
    <div className="p-4 rounded-xl border border-border bg-muted/30">
      <p className="text-[13px] font-semibold text-foreground mb-1">גרסה</p>
      <p className="text-[12px] text-muted-foreground font-mono">Wingate Academy · v0.9 · Vercel</p>
    </div>
    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
      <p className="text-[12px] font-semibold text-amber-800 mb-1">⚙️ הגדרות נוספות</p>
      <p className="text-[11px] text-amber-700">אכיפת הרשאות, הגדרות Supabase, והגדרות תצוגה — יתווספו בשלב הבא.</p>
    </div>
  </div>
);

const DevSettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("permissions");

  if (user?.role !== "admin" && user?.role !== "developer") return null;

  const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
    { id: "permissions", label: "הרשאות", icon: Shield },
    { id: "tools",       label: "כלים",   icon: Wrench },
    { id: "settings",    label: "הגדרות", icon: Settings },
  ];

  return (
    <div className="p-5 md:p-8 max-w-[1100px]" dir="rtl">
      <div className="mb-7">
        <h1 className="text-[22px] font-semibold text-foreground">מרכז מפתחת</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">הגדרות, הרשאות וכלי ניהול</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "permissions" && <PermissionsTab />}
      {tab === "tools"       && <ToolsTab navigate={navigate} />}
      {tab === "settings"    && <SettingsTab />}
    </div>
  );
};

export default DevSettingsPage;
