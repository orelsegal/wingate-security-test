/**
 * AdminBuilderPage — "בונה ממשק"
 *
 * The Visual Admin Builder workspace. Admin-only. This page replaces the
 * previous flat label-table editor. Instead of editing labels in a form,
 * the admin turns on Edit Mode here and edits the live app directly via
 * the floating BuilderOverlay (toolbar + structure + settings panels).
 *
 * This page itself is the landing/help hub: it explains the workflow,
 * surfaces quick links to admin-visible pages, and shows all current
 * overrides so the admin can review or reset them.
 */
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBuilderUI } from "@/context/BuilderUIContext";
import { useBuilderOverrides } from "@/context/BuilderOverridesContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil, Layers, Eye, RotateCcw, ArrowLeft, Sparkles, MousePointerClick, Shield, Palette } from "lucide-react";

const QUICK_LINKS = [
  { label: "תמונת מצב", path: "/" },
  { label: "ספורטאים", path: "/students" },
  { label: "התקדמות לימודית", path: "/courses" },
  { label: "הזנת נתונים", path: "/data-entry" },
  { label: "ניהול נתונים", path: "/data-management" },
  { label: "פעילות משתמשים", path: "/user-activity" },
];

const FEATURES = [
  { icon: MousePointerClick, title: "בחירה ויזואלית", body: "לחיצה על כל רכיב — כותרת, כרטיס, פריט תפריט — תפתח חלונית הגדרות." },
  { icon: Pencil, title: "עריכת תוכן", body: "טקסט, כותרת משנה וטקסט עזרה — הכל נשמר אוטומטית בדפדפן." },
  { icon: Palette, title: "סטייל", body: "החלפת סגנון כרטיס: נקי / מסגרת / מוגבה / מודגש." },
  { icon: Shield, title: "הרשאות לפי תפקיד", body: "בחר אילו תפקידים יראו כל רכיב." },
  { icon: Eye, title: "צפייה כתפקיד אחר", body: "פתח את התצוגה בעיני מורה, הורה, מאמן או תלמיד." },
  { icon: Layers, title: "מבנה העמוד", body: "עץ כל הרכיבים הניתנים לעריכה בעמוד הנוכחי." },
];

const AdminBuilderPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ui = useBuilderUI();
  const ov = useBuilderOverrides();

  if (user && user.role !== "admin") return <Navigate to="/" replace />;

  const overrideEntries = Object.entries(ov.overrides);

  return (
    <div className="p-5 md:p-10 lg:p-12 max-w-[1200px]" dir="rtl">
      {/* Hero */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium mb-3">
            <Sparkles className="h-3 w-3" strokeWidth={2} />
            ניסיוני · גרסה 1
          </div>
          <h1 className="text-[26px] md:text-[30px] font-semibold tracking-tight text-foreground">בונה ממשק</h1>
          <p className="text-[13px] text-muted-foreground mt-2 max-w-[640px] leading-relaxed">
            עריכת מבנה, תצוגה, סטייל והרשאות של רכיבי המערכת — ישירות מעל הממשק החי.
            הפעל את מצב העריכה, נווט לעמוד שתרצה להתאים, ולחץ על הרכיב הרצוי.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => ui.setEditMode(true)}
          className="gap-2 shrink-0"
        >
          <Pencil className="h-4 w-4" strokeWidth={1.8} />
          {ui.editMode ? "מצב עריכה פעיל" : "הפעל מצב עריכה"}
        </Button>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
        {FEATURES.map((f) => (
          <Card key={f.title} className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <f.icon className="h-4 w-4" strokeWidth={1.7} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground">{f.title}</p>
                <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">{f.body}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick navigation */}
      <section className="mb-10">
        <h2 className="text-[15px] font-semibold text-foreground mb-3">עמודים זמינים לעריכה</h2>
        <p className="text-[11.5px] text-muted-foreground mb-4">
          כרגע ניתן לערוך את סרגל הניווט ואת לוח המחוונים הראשי. עמודים נוספים יתווספו בגרסה הבאה.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {QUICK_LINKS.map((l) => (
            <button
              key={l.path}
              onClick={() => { ui.setEditMode(true); navigate(l.path); }}
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-[12.5px]"
            >
              <span>{l.label}</span>
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </section>

      {/* Overrides list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-foreground">התאמות פעילות</h2>
          {overrideEntries.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { if (confirm("לאפס את כל ההתאמות?")) ov.resetAll(); }}
              className="text-destructive hover:text-destructive gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              איפוס הכל
            </Button>
          )}
        </div>
        {overrideEntries.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-[12.5px] text-muted-foreground">עדיין לא בוצעו התאמות.</p>
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {overrideEntries.map(([id, o]) => (
              <div key={id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-mono text-foreground truncate">{id}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {[
                      o.label && `טקסט: "${o.label}"`,
                      o.visible === false && "מוסתר",
                      o.stylePreset && o.stylePreset !== "default" && `סטייל: ${o.stylePreset}`,
                      o.roleVisibility && `${o.roleVisibility.length} תפקידים`,
                    ].filter(Boolean).join(" · ") || "ללא שינויים"}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => ov.resetOverride(id)} className="text-muted-foreground gap-1">
                  <RotateCcw className="h-3.5 w-3.5" />
                  איפוס
                </Button>
              </div>
            ))}
          </Card>
        )}
      </section>

      <p className="text-[10.5px] text-muted-foreground/70 mt-10 leading-relaxed">
        שינויים נשמרים מקומית בדפדפן זה בלבד. בעתיד הם יסונכרנו אוטומטית למסד הנתונים של המערכת.
      </p>
    </div>
  );
};

export default AdminBuilderPage;
