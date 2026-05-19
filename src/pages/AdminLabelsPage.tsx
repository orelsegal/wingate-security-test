/**
 * Admin-only labels editor — "ניהול תצוגה ולייבלים".
 *
 * Phase D of the Admin Builder. Edits live UI labels via UiLabelsContext.
 * Persistence is local (browser only) until Phase E adds backend storage.
 *
 * Non-admin users are silently redirected to "/".
 */
import { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SlidersHorizontal, RotateCcw, Info } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUiLabels } from "@/context/UiLabelsContext";
import { defaultUiLabels } from "@/config/uiLabels";
import { toast } from "sonner";

type Path = (string | number)[];

interface Row {
  path: Path;
  label: string;
  /** Show a visibility toggle next to this row, mapped to visibility.nav[key] */
  visibilityNavKey?: string;
}

interface Group {
  id: string;
  title: string;
  rows: Row[];
}

const get = (obj: any, path: Path) => path.reduce((a, k) => (a == null ? a : a[k]), obj);

const AdminLabelsPage = () => {
  const { user } = useAuth();
  const { labels, setLabel, resetPath, resetAll, hasOverrides } = useUiLabels();

  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const groups: Group[] = useMemo(() => [
    {
      id: "nav",
      title: "ניווט",
      rows: [
        { path: ["nav", "dashboard"], label: "תמונת מצב (מנהל/מורה/הורה/מאמן)" },
        { path: ["nav", "studentHome"], label: "תמונת מצב (תלמיד)" },
        { path: ["nav", "yearPlan"], label: "שנת 2026", visibilityNavKey: "yearPlan" },
        { path: ["nav", "teacherCourses"], label: "הקורסים שלי" },
        { path: ["nav", "students"], label: "ספורטאים" },
        { path: ["nav", "groups"], label: "קבוצות", visibilityNavKey: "groups" },
        { path: ["nav", "courses"], label: "התקדמות לימודית" },
        { path: ["nav", "dataEntry"], label: "הזנת נתונים" },
        { path: ["nav", "calendar"], label: "לוח שנה", visibilityNavKey: "calendar" },
        { path: ["nav", "userActivity"], label: "פעילות משתמשים", visibilityNavKey: "userActivity" },
        { path: ["nav", "dataManagement"], label: "ניהול מערכת" },
        { path: ["nav", "messages"], label: "הודעות", visibilityNavKey: "messages" },
        { path: ["nav", "semester"], label: "טקסט סמסטר" },
        { path: ["nav", "adminLabels"], label: "כניסה לניהול תצוגה ולייבלים" },
      ],
    },
    {
      id: "dashboard",
      title: "דשבורד מנהל",
      rows: [
        { path: ["pages", "adminDashboard", "titleAdmin"], label: "כותרת — מנהל" },
        { path: ["pages", "adminDashboard", "titleTeacher"], label: "כותרת — מורה" },
        { path: ["pages", "adminDashboard", "subtitle"], label: "כותרת משנה" },
      ],
    },
    {
      id: "students",
      title: "ספורטאים",
      rows: [
        { path: ["entities", "student"], label: "ספורטאי (יחיד)" },
        { path: ["entities", "students"], label: "ספורטאים (רבים)" },
        { path: ["buttons", "addStudent"], label: "כפתור: הוסף ספורטאי" },
      ],
    },
    {
      id: "courses",
      title: "התקדמות לימודית",
      rows: [
        { path: ["pages", "courses", "title"], label: "כותרת עמוד" },
      ],
    },
    {
      id: "roadmap",
      title: "מפת דרכים",
      rows: [
        // Currently rendered inside Student Profile; will be wired in next pass.
      ],
    },
    {
      id: "data",
      title: "נתונים ודוחות",
      rows: [
        { path: ["pages", "dataEntry", "title"], label: "ממשק ניהול — כותרת" },
        { path: ["pages", "dataEntry", "subtitle"], label: "ממשק ניהול — תיאור" },
        { path: ["pages", "dataManagement", "title"], label: "ניהול נתונים — כותרת" },
        { path: ["pages", "dataManagement", "subtitle"], label: "ניהול נתונים — תיאור" },
      ],
    },
    {
      id: "users",
      title: "משתמשים והרשאות",
      rows: [
        { path: ["pages", "userActivity", "title"], label: "פעילות משתמשים — כותרת" },
        { path: ["pages", "userActivity", "subtitle"], label: "פעילות משתמשים — תיאור" },
        { path: ["roleLabels", "admin"], label: "תפקיד: מנהל" },
        { path: ["roleLabels", "teacher"], label: "תפקיד: מורה" },
        { path: ["roleLabels", "coach"], label: "תפקיד: מאמן" },
        { path: ["roleLabels", "parent"], label: "תפקיד: הורה" },
        { path: ["roleLabels", "student"], label: "תפקיד: תלמיד" },
        { path: ["roleTitles", "admin"], label: "כותרת ניווט — מנהל" },
        { path: ["roleTitles", "teacher"], label: "כותרת ניווט — מורה" },
        { path: ["roleTitles", "coach"], label: "כותרת ניווט — מאמן" },
        { path: ["roleTitles", "parent"], label: "כותרת ניווט — הורה" },
        { path: ["roleTitles", "student"], label: "כותרת ניווט — תלמיד" },
      ],
    },
    {
      id: "buttons",
      title: "כפתורים וטקסטים כלליים",
      rows: [
        { path: ["buttons", "save"], label: "שמור" },
        { path: ["buttons", "cancel"], label: "ביטול" },
        { path: ["buttons", "filter"], label: "סינון" },
        { path: ["buttons", "manageData"], label: "ניהול נתונים" },
      ],
    },
    {
      id: "statuses",
      title: "סטטוסים",
      rows: [
        { path: ["statuses", "green"], label: "ירוק — במסלול" },
        { path: ["statuses", "yellow"], label: "צהוב — פערים" },
        { path: ["statuses", "red"], label: "אדום — בסיכון" },
      ],
    },
  ], []);

  return (
    <div className="p-5 md:p-10 lg:p-12 max-w-[1100px]" dir="rtl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <SlidersHorizontal className="h-5 w-5 text-primary" strokeWidth={1.7} />
          </div>
          <div>
            <h1 className="text-xl md:text-[1.5rem] font-bold text-foreground tracking-tight">
              ניהול תצוגה ולייבלים
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              עריכת טקסטים, כותרות וסטטוסים שמופיעים במערכת. השינויים נשמרים מקומית בדפדפן.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetAll();
            toast.success("כל הלייבלים אופסו לברירת מחדל");
          }}
          disabled={!hasOverrides}
          className="gap-1.5 shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          איפוס כללי
        </Button>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-900 text-[12px] mb-6">
        <Info className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.7} />
        <p>
          זוהי גרסה ראשונה — חלק מהטקסטים במערכת עדיין מוטמעים בקוד ויהפכו ניתנים לעריכה בהמשך.
          ההגדרות נשמרות כרגע בדפדפן הנוכחי; פרסיסטנס כלל-מערכתי יתווסף בשלב הבא.
        </p>
      </div>

      <Accordion type="multiple" defaultValue={["nav"]} className="space-y-2">
        {groups.map((g) => (
          <AccordionItem key={g.id} value={g.id} className="border border-border/60 rounded-lg bg-card">
            <AccordionTrigger className="px-4 py-3 text-[14px] font-semibold hover:no-underline">
              {g.title}
              <span className="me-auto text-[11px] font-normal text-muted-foreground">
                {g.rows.length} פריטים
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-0">
              {g.rows.length === 0 ? (
                <p className="text-[12px] text-muted-foreground py-2">לא קיימים פריטים ניתנים לעריכה כרגע.</p>
              ) : (
                <div className="space-y-3">
                  {g.rows.map((row) => {
                    const current = String(get(labels, row.path) ?? "");
                    const def = String(get(defaultUiLabels, row.path) ?? "");
                    const isOverridden = current !== def;
                    const visibility = row.visibilityNavKey
                      ? ((labels.visibility?.nav as Record<string, boolean | undefined>)[row.visibilityNavKey] !== false)
                      : null;
                    return (
                      <div
                        key={row.path.join(".")}
                        className="grid grid-cols-12 gap-3 items-center py-2 border-b border-border/40 last:border-0"
                      >
                        <div className="col-span-12 md:col-span-4">
                          <Label className="text-[12.5px] font-medium text-foreground">{row.label}</Label>
                          <p className="text-[10.5px] text-muted-foreground mt-0.5">ברירת מחדל: {def}</p>
                        </div>
                        <div className="col-span-12 md:col-span-5">
                          <Input
                            dir="rtl"
                            value={current}
                            onChange={(e) => setLabel(row.path, e.target.value)}
                            className="h-9 text-[13px]"
                          />
                        </div>
                        <div className="col-span-12 md:col-span-3 flex items-center justify-end gap-2">
                          {row.visibilityNavKey && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-muted-foreground">מוצג</span>
                              <Switch
                                checked={visibility ?? true}
                                onCheckedChange={(v) =>
                                  setLabel(["visibility", "nav", row.visibilityNavKey!], v)
                                }
                              />
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!isOverridden}
                            onClick={() => resetPath(row.path)}
                            className="h-8 px-2 text-[11px] gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            איפוס
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default AdminLabelsPage;
