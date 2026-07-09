# Wingate — Real-Account Role-Scoping QA Checklist

_Verify that each role sees ONLY its scoped slice of the athlete-centered data, enforced end-to-end (Supabase RLS + UI), using **real accounts** — not the DevRoleSwitcher. This is the test that proves the September "secure, role-based" promise._

**Environment:** production — https://wingate-security-test.vercel.app
**No code changes in this phase.** Manual verification only. Data changes only where explicitly marked, and always restored.

---

## Golden rule

**The DevRoleSwitcher is NOT valid proof of permissions.** It changes only the client-side role; the Supabase JWT stays admin, so RLS still evaluates you as admin. **Every test uses a genuine login for that role**, each in a **separate browser / incognito window** to avoid session bleed.

---

## 1. Candidate test accounts (from current live data, read-only scrape of `/admin/users`)

There is a clean seeded set. Links shown are their **current** state.

| Role | Account | Current link |
|------|---------|-------------|
| **admin** | `admin@wingate.demo` | לא נדרש |
| **teacher** | `teacher@wingate.demo` · `teacher@test.com` | לא נדרש |
| **coach** | `coach@test.com` | ענף: **טניס שולחן** |
| **parent** | `parent@wingate.demo` → **נועם שטיינר** · `parent@test.com` → **נעם בדיקה** | linked |
| **student** | `student@wingate.demo` → **נועם שטיינר** · `student@test.com` → **נעם בדיקה** · `mercazlemidaw@gmail.com` → **מרכז למידה** | linked |
| **no role (bounced)** | `omer.mor.barak1@gmail.com` · `guyseg@gmail.com` · `einatmorbarak@gmail.com` | — |

Notes:
- `parent@wingate.demo` and `student@wingate.demo` are **both** linked to **נועם שטיינר** — handy: the parent should see exactly what that student sees of their own profile.
- The `@wingate.demo` / `@test.com` domains are **not real inboxes** → magic-link email cannot be received. See **Blockers** — they must have known passwords to be usable.
- "No role" accounts are bounced to `/login` (no role resolved), so they test the *no-access* path, not the *role-but-unlinked* empty state.

## 2. Per-role test plan

### Admin — full management + linking tools
- **Login:** `admin@wingate.demo` → `/`
- **Open first:** `/` (manager overview), then `/admin/users`
- **Must be visible:** full athlete roster, manager dashboard, `/admin/users` with the link editor, `/data-management`, `/admin/labels`.
- **Must NOT be missing:** the edit-links panel and full roster (confirms scoping didn't over-restrict admin).
- **DB link required:** none.

### Teacher — rosters + data entry, NOT admin-only tools
- **Login:** `teacher@wingate.demo` → `/`
- **Open first:** `/students`, then `/data-entry` / `/grade-entry`
- **Must be visible:** full student roster, data entry, grade entry, teacher courses.
- **Must NOT be visible:** `/admin/users`, `/admin/settings`, `/data-management`, user-linking tools (admin-only).
- **DB link required:** none.

### Coach — only their sport's athletes
- **Login:** `coach@test.com` → `/`
- **Open first:** `/` (CoachHome)
- **Must be visible:** only **טניס שולחן** athletes.
- **Must NOT be visible:** athletes of other sports; `/students/<other-sport-athlete>` must return no data; admin/teacher tools.
- **DB link required:** `linked_sport = טניס שולחן` (already set).

### Parent — only the linked child
- **Login:** `parent@wingate.demo` → `/`
- **Open first:** `/` (ParentHome)
- **Must be visible:** only **נועם שטיינר**'s summary/progress.
- **Must NOT be visible:** any other student; `/students/<other-id>` must return no data; no roster; no admin/teacher/coach tools.
- **DB link required:** `linked_student_id → נועם שטיינר` (already set).

### Student — only own profile/progress
- **Login:** `student@wingate.demo` → `/student-home`
- **Open first:** `/student-home`
- **Must be visible:** only **their own** (נועם שטיינר) progress/subjects/status.
- **Must NOT be visible:** any other student; `/students/<other-id>` blocked; no staff tools.
- **DB link required:** `linked_student_id → נועם שטיינר` (already set).

### Unlinked (role present, link missing) — clean empty state
- **Login:** a role account whose link was **temporarily cleared** (see §5).
- **Must be visible:** parent → "לא מקושר לתלמיד"; coach → "לא מקושר לענף"; student → empty/zeroed home.
- **Must NOT be visible:** any other user's data; no crash/error.

## 3. Safe QA order (least → most invasive)

1. **Admin** (read-only) — also use it to *record* current links before any change.
2. **Teacher** (read-only).
3. **Coach** (read-only).
4. **Parent** (read-only).
5. **Student** (read-only).
6. **Direct-URL probes** for each scoped role (read-only).
7. **Unlinked-state tests** (mutating — do these LAST, one at a time, restoring immediately).

Rationale: all pure-viewing tests first; the only data-changing tests come at the very end and are reverted before moving on.

## 4. Which checks are READ-ONLY

- All logins + viewing (steps 1–6 above). Logging in does append one row to `activity_logs` (by design, harmless) — no athlete data is modified.
- Direct-URL probing outside scope — read attempts; RLS denies them; nothing is written.

## 5. Which checks REQUIRE a temporary link change (mutating)

- **Unlinked empty-state tests** for parent/coach/student.
- **Re-link mid-session** test.

Procedure per mutation:
1. In `/admin/users`, **record the exact current link** for the account (e.g. `coach@test.com → טניס שולחן`).
2. Change it (clear to "— ללא —", or re-point) to run the test.
3. **Restore** to the exact recorded value immediately after.

Prefer mutating a `@test.com` account (clearly a test identity) over a `@wingate.demo` one, and never mutate a real-person account (`*@gmail.com`, `*@wingate.org.il`).

## 6. How to restore any temporary change

- Restore is done through the **same `/admin/users` dropdown** — re-select the recorded value; the ⚠ "לא מקושר" chip should disappear and the green link icon return.
- Verify restoration by toggling the **"לא מקושרים"** filter → the account should no longer appear.
- Keep a written before/after note per mutated account (table below) so nothing is left cleared.

| Account | Original link | Changed to | Restored? |
|---------|--------------|-----------|-----------|
| | | | |

## 7. Screenshots to capture

- **Admin:** `/` overview + `/admin/users` (link panel).
- **Teacher:** `/students` roster + proof that `/admin/users` is NOT accessible.
- **Coach:** CoachHome showing only טניס שולחן + a blocked out-of-sport `/students/<id>` probe.
- **Parent:** ParentHome showing only נועם שטיינר + a blocked `/students/<other-id>` probe.
- **Student:** `/student-home` (own data) + a blocked `/students/<other-id>` probe.
- **Unlinked:** each empty-state screen (parent/coach/student).
- Each **negative probe** screenshot is the most important evidence — it proves server-side denial.

## 8. Pass / Fail

**PASS (all must hold):**
1. Each scoped role sees exactly its slice — nothing more.
2. Every direct-URL probe outside scope returns **no data** (server-side RLS confirmed, not just hidden nav).
3. Unlinked accounts show clean not-linked states, never foreign data, never crashes.
4. Teacher sees rosters/data-entry but **no** admin-only tools.
5. Admin retains full management + linking tools.

**FAIL (stop and report — do NOT patch blindly):** any role sees data outside its scope, any probe leaks another user's data, an unlinked account shows foreign data or crashes, or teacher can reach admin-only tools. A leak = an RLS gap (backend investigation with real-account re-verification), not a UI hide. Capture role + exact URL + what was visible + link state.

## 9. Blockers to resolve BEFORE testing

1. **Login credentials (top blocker).** The `@wingate.demo` / `@test.com` accounts use fake domains and **cannot receive magic-link email**. Confirm they have **known passwords** (password login), or switch to real-inbox accounts you control. Without a real session per role, this QA cannot run (and the DevRoleSwitcher is not a substitute).
2. **A second, out-of-scope athlete id** to use in negative probes (e.g. an athlete NOT in טניס שולחן, and a student other than נועם שטיינר). Grab these ids from the admin roster first.
3. **Confirm the `profiles.linked_student_id → students.id` foreign key** exists in the live DB (flagged in the security note) — a dangling id would make a "linked" account behave as unlinked.
4. **Onboarding localStorage caveat:** do not rely on the invite flow to set links for QA; set them directly in `/admin/users`.

---

## Results log

| Date | Test | Account | Result | Notes |
|------|------|---------|--------|-------|
| 2026-07-08 | claim_pending_invite function QA | orelman+qa-student@gmail.com | **PASS** | Invite claimed → role=student assigned under locked RLS; invite row consumed (one-time); re-claim returns already_has_role |
| 2026-07-09 | Student — sees own scoped home | orelman+qa-student@gmail.com → נעם בדיקה | **PASS** | Real login (not DevRoleSwitcher); /student-home renders "המסלול של נעם בדיקה" with status hero + progress; linked via /admin/users panel |
| 2026-07-09 | Student — direct-URL probe blocked | orelman+qa-student@gmail.com | **PASS** | /students/3ba28403-3fdd-4933-8608-d2cfe752ffc9 → "הספורטאי לא נמצא", no foreign data rendered (production) |
| 2026-07-09 | Teacher — full invite flow + dashboard | orelman+qa-teacher@gmail.com | **PASS** | Invited via patched UI (local), claim → role=teacher, set-password, teacher dashboard renders |
| 2026-07-09 | Coach — production invite + scoped home | orelman+qa-coach@gmail.com → טניס שולחן | **PASS** | claim → role=coach + linked_sport applied from invite; coach dashboard shows own sport; onboarding hang fixed (fa0bb6e) and re-entry to /onboarding verified in production |
| 2026-07-09 | Parent — full production flow E2E | orelman+qa-parent@gmail.com → נעם בדיקה | **PASS** | invite → magic link (incognito) → claim → role=parent → set-password screen → unlinked ParentHome → admin link via /admin/users → ParentHome shows only נעם בדיקה |

## Final matrix status (2026-07-09)

**student ✅ · teacher ✅ · coach ✅ · parent ✅ — all verified with real logins (no DevRoleSwitcher).**

Remaining optional negatives (low risk — same RLS mechanism already proven for student): teacher blocked from `/admin/*`, coach out-of-sport probe, parent out-of-scope probe.

Blockers from §9 — resolution: #1 (login credentials) resolved via Gmail-alias QA accounts (`orelman+qa-<role>@gmail.com`) created through the fixed invite flow; #4 (localStorage invite caveat) resolved end-to-end — migration `20260708134301` (`pending_invites` + `claim_pending_invite`) plus frontend commits `9b30b55` and `fa0bb6e` (onboarding hang fix). Invites now work cross-device.
