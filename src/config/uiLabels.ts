/**
 * Global UI labels for the app — the single source of truth for admin-editable text.
 *
 * Phase B of the Admin Builder / Label Manager.
 * Defaults are Hebrew. Admin can override at runtime via UiLabelsContext.
 * No DB persistence yet (localStorage only) — Phase E will add app_settings.
 *
 * IMPORTANT: keep keys stable. Renaming a key is a breaking change for any
 * persisted overrides. Add new keys, don't rename.
 */

export interface UiLabels {
  /** Sidebar / top nav */
  nav: {
    dashboard: string;
    studentHome: string;
    yearPlan: string;
    teacherCourses: string;
    students: string;
    groups: string;
    courses: string;
    dataEntry: string;
    calendar: string;
    userActivity: string;
    dataManagement: string;
    messages: string;
    semester: string;
    adminLabels: string;
  };
  /** Sidebar role-titled section header */
  roleTitles: {
    admin: string;
    teacher: string;
    student: string;
    parent: string;
    coach: string;
  };
  /** Friendly role names shown in user chip */
  roleLabels: {
    admin: string;
    teacher: string;
    student: string;
    parent: string;
    coach: string;
  };
  /** Page titles + subtitles */
  pages: {
    adminDashboard: { titleAdmin: string; titleTeacher: string; subtitle: string };
    courses: { title: string };
    dataEntry: { title: string; subtitle: string };
    dataManagement: { title: string; subtitle: string };
    userActivity: { title: string; subtitle: string };
  };
  /** Common buttons */
  buttons: {
    save: string;
    cancel: string;
    addStudent: string;
    manageData: string;
    filter: string;
  };
  /** Status labels (display only — keys & colors stay fixed) */
  statuses: {
    green: string;
    yellow: string;
    red: string;
  };
  /** Entity nouns */
  entities: {
    student: string;
    students: string;
  };
  /** Visibility flags for safely-hideable nav items */
  visibility: {
    nav: Partial<Record<keyof UiLabels["nav"], boolean>>;
  };
}

export const defaultUiLabels: UiLabels = {
  nav: {
    dashboard: "תמונת מצב",
    studentHome: "תמונת מצב",
    yearPlan: "שנת 2026",
    teacherCourses: "הקורסים שלי",
    students: "ספורטאים",
    groups: "קבוצות",
    courses: "התקדמות לימודית",
    dataEntry: "הזנת נתונים",
    calendar: "לוח שנה",
    userActivity: "פעילות משתמשים",
    dataManagement: "ניהול מערכת",
    messages: "הודעות",
    semester: "סמסטר א׳ תשפ״ה",
    adminLabels: "בונה ממשק",
  },
  roleTitles: {
    admin: "מרכז ניהול",
    teacher: "מרכז עבודה",
    student: "המרחב שלי",
    parent: "התקדמות הילד/ה",
    coach: "מרכז המאמן",
  },
  roleLabels: {
    admin: "מנהל",
    teacher: "מורה",
    parent: "הורה",
    coach: "מאמן",
    student: "תלמיד",
  },
  pages: {
    adminDashboard: {
      titleAdmin: "מפת מצב לימודית",
      titleTeacher: "מעקב מקצועות לימוד",
      subtitle: "סמסטר א׳ תשפ״ה",
    },
    courses: { title: "סטטוס לימודי לפי מקצוע" },
    dataEntry: { title: "ממשק ניהול", subtitle: "הוספת ספורטאים, הזנת ציונים וייבוא מאסיבי" },
    dataManagement: { title: "ניהול נתונים", subtitle: "ניהול ענפי ספורט, מקצועות לימוד וכיתות" },
    userActivity: { title: "פעילות משתמשים", subtitle: "מעקב כניסות ופעילות במערכת" },
  },
  buttons: {
    save: "שמור",
    cancel: "ביטול",
    addStudent: "הוסף ספורטאי",
    manageData: "ניהול נתונים",
    filter: "סינון",
  },
  statuses: {
    green: "במסלול",
    yellow: "פערים",
    red: "בסיכון",
  },
  entities: {
    student: "ספורטאי",
    students: "ספורטאים",
  },
  visibility: {
    /** Default all true. Admin may hide non-critical items in the labels editor. */
    nav: {
      yearPlan: true,
      userActivity: true,
      messages: true,
      groups: true,
      calendar: true,
    },
  },
};

/** Deep clone for safe defaults. */
export const cloneDefaults = (): UiLabels =>
  JSON.parse(JSON.stringify(defaultUiLabels)) as UiLabels;
