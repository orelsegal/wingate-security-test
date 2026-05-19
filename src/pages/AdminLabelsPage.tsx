/**
 * AdminBuilderPage — "בונה ממשק"
 *
 * Visual Admin Builder workspace. Every visible element on this page is
 * wrapped in <EditableElement> so the admin can click → select → edit
 * via the floating BuilderOverlay (toolbar + structure + settings panels).
 */
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBuilderUI } from "@/context/BuilderUIContext";
import { useBuilderOverrides } from "@/context/BuilderOverridesContext";
import EditableElement from "@/components/builder/EditableElement";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Pencil, Layers, Eye, RotateCcw, ArrowLeft, Sparkles, MousePointerClick,
  Shield, Palette, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_KEY = "admin-builder";

const QUICK_LINKS = [
  { id: "ql-dashboard", label: "תמונת מצב", path: "/" },
  { id: "ql-students", label: "ספורטאים", path: "/students" },
  { id: "ql-courses", label: "התקדמות לימודית", path: "/courses" },
  { id: "ql-data-entry", label: "הזנת נתונים", path: "/data-entry" },
  { id: "ql-data-mgmt", label: "ניהול נתונים", path: "/data-management" },
  { id: "ql-activity", label: "פעילות משתמשים", path: "/user-activity" },
];

const FEATURES = [
  { id: "feat-select", icon: MousePointerClick, title: "בחירה ויזואלית",  body: "לחיצה על כל רכיב — כותרת, כרטיס, פריט תפריט — תפתח חלונית הגדרות." },
  { id: "feat-content", icon: Pencil, title: "עריכת תוכן",  body: "טקסט, כותרת משנה וטקסט עזרה — הכל נשמר אוטומטית בדפדפן." },
  { id: "feat-style", icon: Palette, title: "סטייל",  body: "החלפת סגנון כרטיס: נקי / מסגרת / מוגבה / מודגש." },
  { id: "feat-perms", icon: Shield, title: "הרשאות לפי תפקיד",  body: "בחר אילו תפקידים יראו כל רכיב." },
  { id: "feat-preview", icon: Eye, title: "צפייה כתפקיד אחר",  body: "פתח את התצוגה בעיני מורה, הורה, מאמן או תלמיד." },
  { id: "feat-structure", icon: Layers, title: "מבנה העמוד",  body: "עץ כל הרכיבים הניתנים לעריכה בעמוד הנוכחי." },
];

const AdminBuilderPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ui = useBuilderUI();
  const ov = useBuilderOverrides();

  if (user && user.role !== "admin") return <Navigate to="/" replace />;

  const overrideEntries = Object.entries(ov.overrides);
  const hasOverrides = overrideEntries.length > 0;

  return (
    <div className="p-5 md:p-10 lg:p-12 max-w-[1200px]" dir="rtl">
      {/* Temporary-changes notice */}
      {ui.editMode && (
        <div className="mb-5 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-[11.5px]">
          <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          שינויים זמניים לתצוגה בלבד — שמירה קבועה תתווסף בשלב הבא.
        </div>
      )}

      {/* Hero */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium mb-3">
            <Sparkles className="h-3 w-3" strokeWidth={2} />
            ניסיוני · גרסה 1
          </div>
          <EditableElement
            id={`${PAGE_KEY}.page-title`}
            type="page-title"
            pageKey={PAGE_KEY}
            defaultLabel="בונה ממשק"
            defaultSubtitle="עריכת מבנה, תצוגה, סטייל והרשאות של רכיבי המערכת — ישירות מעל הממשק החי. הפעל את מצב העריכה, נווט לעמוד שתרצה להתאים, ולחץ על הרכיב הרצוי."
          >
            {(r) => (
              <div>
                <h1 className="text-[26px] md:text-[30px] font-semibold tracking-tight text-foreground">{r.label}</h1>
                {r.subtitle && (
                  <p className="text-[13px] text-muted-foreground mt-2 max-w-[640px] leading-relaxed">{r.subtitle}</p>
                )}
              </div>
            )}
          </EditableElement>
        </div>
        <EditableElement
          id={`${PAGE_KEY}.cta-edit-mode`}
          type="button"
          pageKey={PAGE_KEY}
          defaultLabel={ui.editMode ? "מצב עריכה פעיל" : "הפעל מצב עריכה"}
        >
          {(r) => (
            <Button size="lg" onClick={() => ui.setEditMode(true)} className="gap-2 shrink-0">
              <Pencil className="h-4 w-4" strokeWidth={1.8} />
              {r.label}
            </Button>
          )}
        </EditableElement>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
        {FEATURES.map((f) => (
          <EditableElement
            key={f.id}
            id={`${PAGE_KEY}.${f.id}`}
            type="card"
            pageKey={PAGE_KEY}
            defaultLabel={f.title}
            defaultSubtitle={f.body}
          >
            {(r) => (
              <Card className={cn("p-4 transition-colors", r.stylePresetClass)}>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <f.icon className="h-4 w-4" strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{r.label}</p>
                    {r.subtitle && (
                      <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">{r.subtitle}</p>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </EditableElement>
        ))}
      </div>

      {/* Quick navigation */}
      <section className="mb-10">
        <EditableElement
          id={`${PAGE_KEY}.section-quick-links-title`}
          type="title"
          pageKey={PAGE_KEY}
          defaultLabel="עמודים זמינים לעריכה"
          defaultSubtitle="כרגע ניתן לערוך את סרגל הניווט ואת לוח המחוונים הראשי. עמודים נוספים יתווספו בגרסה הבאה."
        >
          {(r) => (
            <div className="mb-4">
              <h2 className="text-[15px] font-semibold text-foreground mb-1">{r.label}</h2>
              {r.subtitle && <p className="text-[11.5px] text-muted-foreground">{r.subtitle}</p>}
            </div>
          )}
        </EditableElement>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {QUICK_LINKS.map((l) => (
            <EditableElement
              key={l.id}
              id={`${PAGE_KEY}.${l.id}`}
              type="nav-item"
              pageKey={PAGE_KEY}
              defaultLabel={l.label}
            >
              {(r) => (
                <button
                  onClick={(e) => {
                    if (ui.editMode) return; // selection handled by wrapper
                    e.stopPropagation();
                    ui.setEditMode(true);
                    navigate(l.path);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-[12.5px]",
                    r.stylePresetClass,
                  )}
                >
                  <span>{r.label}</span>
                  <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                </button>
              )}
            </EditableElement>
          ))}
        </div>
      </section>

      {/* Overrides list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-foreground">התאמות פעילות</h2>
          {hasOverrides && (
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
        {!hasOverrides ? (
          <Card className="p-8 text-center">
            <p className="text-[12.5px] text-muted-foreground">עדיין לא בוצעו התאמות.</p>
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {overrideEntries.map(([id, o]) => (
              <button
                key={id}
                onClick={() => ui.select(id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors text-start"
              >
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
                <span
                  role="button"
                  onClick={(e) => { e.stopPropagation(); ov.resetOverride(id); }}
                  className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  איפוס
                </span>
              </button>
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
