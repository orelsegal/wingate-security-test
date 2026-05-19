# Global Admin Builder / Label Manager — Phased Plan

## Phase A — Analysis (findings)

After scanning the codebase, here is where UI text currently lives:

**1. Navigation labels** — `src/components/AppSidebar.tsx`
- `allMenuItems[]` (titles like "ספורטאים", "התקדמות לימודית", "קבוצות", "הזנת נתונים", "לוח שנה", "פעילות משתמשים", "ניהול מערכת", "שנת 2026", "הקורסים שלי", "תמונת מצב")
- `roleTitles` map ("מרכז ניהול", "מרכז עבודה", "המרחב שלי"…)
- "הודעות" button label
- "סמסטר א׳ תשפ״ה" badge

**2. Role labels** — `src/context/AuthContext.tsx` → `roleLabels`, `roleDescriptions`

**3. Page titles & section titles** — hardcoded per page:
- `DashboardContent.tsx`, `StudentsPage.tsx`, `StudentProfilePage.tsx`, `CoursesPage.tsx`, `DataEntryPage.tsx`, `DataManagementPage.tsx`, `GroupsPage.tsx`, `CalendarPage.tsx`, `UserActivityPage.tsx`, `RoleHomePage.tsx`, `YearPlan2026Page.tsx`, etc.
- Each page has its own `<h1>` + subtitle + section headers as string literals.

**4. Status labels** — `src/hooks/useStudents.ts` → `statusConfig` ("במסלול", "פערים", "בסיכון")

**5. Common buttons** — scattered ("שמור", "ביטול", "הוסף", "ייצוא", "סינון"…)

**6. Field labels** — `StudentFormModal.tsx`, inline edit forms.

**7. Builder layer already exists** for the Student Profile only — `BuilderContext.tsx`, `BuilderPanel.tsx`. Limited to per-page sections/fields, not global labels.

### Safe to make configurable now
- Sidebar nav titles
- Role titles ("מרכז ניהול"…) and role labels
- Top-level page titles & subtitles (admin pages)
- Dashboard card titles
- Common button text ("שמור", "ביטול"…)
- Status labels

### Should stay fixed for now
- Routes, route paths, component names
- Data field semantics (subject names, sport names — these are real data, not UI labels)
- Hebrew academic terminology in memory ("במסלול"/"פערים"/"בסיכון" — configurable text only, but defaults locked)
- Auth/DB/RLS/edge functions

---

## Phase B — Centralized config (will implement)

Create `src/config/uiLabels.ts` exporting a typed `defaultUiLabels` object:

```text
uiLabels = {
  nav: { dashboard, students, courses, dataEntry, calendar, groups,
         userActivity, dataManagement, yearPlan, teacherCourses,
         studentHome, messages, semester },
  roleTitles: { admin, teacher, student, parent, coach },
  roleLabels: { admin, teacher, student, parent, coach },
  pages: {
    adminDashboard: { title, subtitle },
    students:       { title, subtitle },
    studentProfile: { title },
    courses:        { title, subtitle },
    dataEntry:      { title, subtitle },
    dataManagement: { title, subtitle },
    groups:         { title, subtitle },
    calendar:       { title, subtitle },
    userActivity:   { title, subtitle },
    roadmap:        { title },
  },
  cards: { /* dashboard card titles */ },
  buttons: { save, cancel, add, edit, delete, export, filter, search, close, confirm },
  statuses: { onTrack, gaps, atRisk },
  visibility: { /* per-key boolean toggles, default true */ },
}
```

Plus a React context `UiLabelsProvider` + `useUiLabels()` hook with in-memory override + `localStorage` persistence (key `wingate_ui_labels_overrides`). No DB.

---

## Phase C — Wire into admin-facing UI

Replace hardcoded strings in these files with `useUiLabels()`:
- `src/components/AppSidebar.tsx` (nav titles, role titles, messages, semester)
- `src/context/AuthContext.tsx` — keep `roleLabels` export but back it by defaults (no runtime dependency; sidebar will read from labels context)
- `src/components/DashboardContent.tsx` (title, subtitle, card titles)
- `src/pages/StudentsPage.tsx` (title, subtitle)
- `src/pages/CoursesPage.tsx` (title, subtitle)
- `src/pages/DataEntryPage.tsx` (title)
- `src/pages/DataManagementPage.tsx` (title)
- `src/pages/UserActivityPage.tsx` (title)

Logic untouched. Only `<h1>`/subtitle/menu strings change source.

---

## Phase D — Admin page "ניהול תצוגה ולייבלים"

New route `/admin/labels` (admin only — redirect silently otherwise).
New file `src/pages/AdminLabelsPage.tsx` with grouped accordion sections:
1. ניווט
2. דשבורד מנהל
3. ספורטאים
4. התקדמות לימודית
5. מפת דרכים
6. נתונים ודוחות
7. משתמשים והרשאות
8. כפתורים וטקסטים כלליים
9. סטטוסים

Each row: current label, editable input, "אפס לברירת מחדל", visibility switch (only for nav items where hiding is safe).

Add link "ניהול תצוגה ולייבלים" to sidebar under admin-only items.

---

## Files I will touch

**Create**
- `src/config/uiLabels.ts` — default labels + types
- `src/context/UiLabelsContext.tsx` — provider, hook, localStorage persistence
- `src/pages/AdminLabelsPage.tsx` — editor UI

**Edit**
- `src/App.tsx` — wrap with `UiLabelsProvider`, add `/admin/labels` route
- `src/components/AppSidebar.tsx` — read titles + role titles from context, add admin link, honor visibility
- `src/components/DashboardContent.tsx` — title/subtitle/cards from context
- `src/pages/StudentsPage.tsx` — title/subtitle from context
- `src/pages/CoursesPage.tsx` — title/subtitle from context
- `src/pages/DataEntryPage.tsx` — title from context
- `src/pages/DataManagementPage.tsx` — title from context
- `src/pages/UserActivityPage.tsx` — title from context

**Not touched**
- Routes, DB, RLS, auth, edge functions, types.ts
- Student Profile builder (existing Phase 2 work stays)
- Per-page section internals, status colors, business logic
- Teacher/parent/coach/student-specific pages (Phase later)

---

## Phase E — (NOT implementing now)

Future: persist `uiLabels` overrides in a new `app_settings` table (JSON column, single row, admin-only RLS). Will request approval before adding.

---

## Risks
- Many pages still hardcoded — admin will see only the centralized subset editable. Will be documented in the admin page header.
- Hiding a nav item could lock admin out of an area — visibility toggles limited to safe items, with a note.
- localStorage-only persistence means overrides are per-browser until Phase E.

Proceeding to implement Phases B + C + D after approval.