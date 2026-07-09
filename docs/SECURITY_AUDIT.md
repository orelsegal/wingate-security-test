# Wingate — Security / RLS Audit Note

_Last reviewed: 2026-07-03. Scope: Supabase Row-Level-Security posture for the September athlete-progress platform. This is a documentation note only — no migration was run and no code was changed._

## Product framing

The September core is the **athlete-centered progress platform**: students, progress/status, grades/data entry, roles/permissions, coach/parent/student scoping, user management, manager overview. Gamification (Daily Quiz, PlayHub, Blitz) is **secondary** for September and is treated as a lower-priority layer in this audit.

---

## 1. Core September tables — VERIFIED LOCKED

All tables below have role-scoped RLS as their **final live state** (confirmed by tracing each table to the newest migration that touches it — newest-wins):

| Table | Final policy summary |
|-------|----------------------|
| `students` | admin/teacher: all · coach: own sport · student/parent: linked student only |
| `student_subject_progress` | role-scoped (locked 2026-05-12) |
| `student_roadmap_progress` | role-scoped (locked 2026-05-12) |
| `student_custom_values` | role-scoped (locked 2026-05-19) |
| `profiles` | own row; admins may view/update all |
| `user_roles` | own row view; `has_role()` is SECURITY DEFINER to avoid RLS recursion |
| `app_users` (holds PII: `national_id`, `phone`, `notes`) | **admin-only** CRUD (locked 2026-05-16) |
| `activity_logs` | admin read · all authenticated roles insert · admin update/delete (locked 2026-05-16) |
| `subjects`, `sports`, `subject_roadmaps` | authenticated view · admin(/teacher) manage (locked 2026-05-12) |

**Conclusion:** the September-critical data (athlete records, progress, PII, audit trail) is properly secured server-side. Client-side role logic is backed by real database enforcement, not just UI gating.

## 2. `activity_logs` — correction of a stale finding

An earlier audit flagged `activity_logs` as world-open (`USING (true)` read/insert/delete). **That was incorrect** — it was based on the original **2026-03-26** migration and missed the lock-down migration **`20260516190502`** (2026-05-16).

Final, live state is correct for an audit table:
- **read:** admins only
- **insert:** any authenticated role (needed by `useActivityLogger.ts`)
- **update / delete:** admins only

No frontend depends on broad access: `UserActivityPage.tsx` reads it as an admin screen; `useActivityLogger.ts` only inserts. **No action needed.**

## 3. Remaining known risk (SECONDARY — gamification, not a core blocker)

**`daily_quiz_results`** (Lovable-owned, migration `20260615081647`) — final state allows any authenticated user to **SELECT / INSERT / UPDATE all rows** (`USING (true)` / `WITH CHECK (true)`).

- **Impact:** a student could insert or modify another student's quiz score/streak. This is a **gamification integrity issue**, not a core athlete-progress security blocker. The data (scores, class, student_id) is low-sensitivity.
- **Recommended fix (later, not now):** restrict INSERT/UPDATE to the caller's **own linked student** (`student_id = (SELECT linked_student_id FROM profiles WHERE id = auth.uid())`), with an **admin/teacher override**. Leave SELECT authenticated for now (the class leaderboard needs cross-student read); optionally scope to same-class later.
- **Constraints on the fix:**
  - It is an **RLS change on a Lovable-owned table** — Lovable pushes to this repo, so any migration must be coordinated to avoid conflict/clobber. Always `git fetch` first.
  - **Must be verified with a real student login** — the DevRoleSwitcher `previewRole` only changes the client-side role, not the Supabase JWT, so RLS still evaluates the admin identity. Preview mode cannot prove student scoping.
- **Status:** deferred until the gamification layer is worked intentionally.

## 4. Left as-is for now (broad but non-sensitive)

- **`builder_layouts`** — all-authenticated **read** (`USING (true)`), admin-only writes. Content is UI layout JSON. Acceptable.
- **`daily_quiz_cache`** — public (anon+auth) **read**, service-role writes. Content is quiz questions. Acceptable (minor: `anon` read is unnecessary since the app requires login — cosmetic only).

## 5–6. No migration / no deployment now

No Supabase migration was created or run. No deployment was triggered. This note is documentation only.

---

## DevRoleSwitcher caveat (for future QA)

`previewRole` is admin/developer-gated and changes only the **client-side** role — it does **not** change `auth.uid()`. It is a UI convenience, **not** a security boundary, and it shows admin-visible data in a role's skin. Any verification of coach/parent/student scoping must use **real accounts with the correct role and links**, never the switcher.
