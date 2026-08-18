-- ═══════════════════════════════════════════════════════════════════════════
-- Closing the helper-function grant gap.
--
-- WHAT WAS WRONG
--
-- 20260817200000 and 20260817200100 both tried to lock the internal helpers
-- with `revoke all on function ... from public`. That was not enough.
--
-- Supabase ships a default-privilege rule on the public schema:
--
--   alter default privileges in schema public
--     grant execute on functions to anon, authenticated;
--
-- so every new function is granted EXECUTE to `anon` and `authenticated`
-- DIRECTLY, on top of the implicit PUBLIC grant. Revoking from PUBLIC removes
-- the implicit grant and leaves the two direct ones untouched.
--
-- Probed against production before writing this, with an anonymous key:
--
--   app_idem_begin            → executed, returned null
--   app_current_student_id    → executed, returned null
--   app_can_review_submission → executed, returned false
--   app_idem_store            → executed, reached the INSERT and failed on
--                               23502 (actor is not null) — a NOT NULL
--                               constraint, not a permission, was the only
--                               thing standing between an anonymous caller
--                               and a row in operation_receipts
--   submit_task / resubmit    → 42501 permission denied (correct)
--
-- The five public RPCs were never exposed. This migration does not touch
-- them. It removes the direct grants the earlier revokes missed.
--
-- WHY REVOKING IS SAFE
--
-- Every internal helper is only ever called from inside a SECURITY DEFINER
-- function, or fired as a trigger. In both cases the effective user is the
-- function owner, not the caller, so the caller's EXECUTE privilege is never
-- consulted. forbid_change() is a trigger function: PostgreSQL checks EXECUTE
-- when the trigger is CREATED, never when it fires.
--
-- The two exceptions are app_current_student_id() and
-- app_can_review_submission(), which appear inside RLS policy expressions.
-- Policy expressions are evaluated as the QUERYING user, so `authenticated`
-- must keep EXECUTE on those two or every read through RLS starts failing.
-- They are revoked and then re-granted to authenticated alone.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Internal helpers: reachable by nobody, directly ─────────────────────
-- Called only from SECURITY DEFINER bodies (or as a trigger), where the
-- owner's rights apply. No role needs a direct grant.

revoke all on function public.app_idem_begin(text, text)
  from public, anon, authenticated;

revoke all on function public.app_idem_store(text, text, uuid, jsonb)
  from public, anon, authenticated;

revoke all on function public.app_submission_subject(uuid)
  from public, anon, authenticated;

revoke all on function public.app_log_submission_event(
    uuid, public.submission_status, public.submission_status)
  from public, anon, authenticated;

revoke all on function public.forbid_change()
  from public, anon, authenticated;


-- ── 2. Policy helpers: authenticated only ──────────────────────────────────
-- Revoke everything first so the anon grant goes, then hand EXECUTE back to
-- authenticated alone. Order matters: a bare grant would leave anon in place.

revoke all on function public.app_current_student_id()
  from public, anon, authenticated;
grant execute on function public.app_current_student_id()
  to authenticated;

revoke all on function public.app_can_review_submission(uuid)
  from public, anon, authenticated;
grant execute on function public.app_can_review_submission(uuid)
  to authenticated;


-- ── 3. The five public RPCs are deliberately untouched ─────────────────────
-- submit_task, resubmit, return_for_revision, approve_submission and
-- save_ai_feedback_draft keep exactly the grants 20260817200100 gave them:
-- revoked from public and anon, executable by authenticated. They are the
-- front door, and this migration is only about the corridors behind it.
--
-- They keep working after this change precisely because they are SECURITY
-- DEFINER: when submit_task calls app_idem_begin, the nested call runs with
-- the owner's rights, and the caller's lack of a direct grant is irrelevant.


-- ── 4. Assert the result, in the same transaction ──────────────────────────
-- If any of this did not take, the migration fails rather than reporting a
-- lock that is not there.
do $$
declare
  v_bad text;
  v_internal text[] := array[
    'app_idem_begin', 'app_idem_store', 'app_submission_subject',
    'app_log_submission_event', 'forbid_change'];
  v_policy text[] := array['app_current_student_id', 'app_can_review_submission'];
  v_rpc text[] := array[
    'submit_task', 'resubmit', 'return_for_revision',
    'approve_submission', 'save_ai_feedback_draft'];
begin
  -- 4a. no internal helper is executable by any client role
  select string_agg(distinct p.proname || '→' || r.rolname, ', ')
    into v_bad
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join unnest(array['anon', 'authenticated']) as r(rolname)
  where n.nspname = 'public'
    and p.proname = any(v_internal)
    and has_function_privilege(r.rolname, p.oid, 'EXECUTE');
  if v_bad is not null then
    raise exception 'helper grants still present: %', v_bad;
  end if;

  -- 4b. and not by PUBLIC either
  select string_agg(distinct p.proname, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = any(v_internal)
    and has_function_privilege('public', p.oid, 'EXECUTE');
  if v_bad is not null then
    raise exception 'helper still executable by PUBLIC: %', v_bad;
  end if;

  -- 4c. the two policy helpers: authenticated yes, anon no
  select string_agg(distinct p.proname, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = any(v_policy)
    and not has_function_privilege('authenticated', p.oid, 'EXECUTE');
  if v_bad is not null then
    raise exception 'policy helper lost authenticated EXECUTE — RLS would break: %', v_bad;
  end if;

  select string_agg(distinct p.proname, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = any(v_policy)
    and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then
    raise exception 'policy helper still reachable by anon: %', v_bad;
  end if;

  -- 4d. the five public RPCs are unchanged: anon no, authenticated yes
  select string_agg(distinct p.proname, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = any(v_rpc)
    and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then
    raise exception 'a public RPC became reachable by anon: %', v_bad;
  end if;

  select string_agg(distinct p.proname, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = any(v_rpc)
    and not has_function_privilege('authenticated', p.oid, 'EXECUTE');
  if v_bad is not null then
    raise exception 'a public RPC lost authenticated EXECUTE: %', v_bad;
  end if;

  raise notice 'helper grants closed — 5 internal helpers unreachable, 2 policy helpers authenticated-only, 5 RPCs unchanged.';
end $$;


-- ── 5. A note for whoever adds the next function ────────────────────────────
-- Supabase's default privileges will grant EXECUTE to anon and authenticated
-- on any NEW function in this schema. `revoke ... from public` will not undo
-- that. Always revoke from public, anon, authenticated explicitly, then grant
-- back only what a role genuinely needs.
--
-- The same applies to `drop function` + `create function`: the new function is
-- a new object and picks the default privileges up again. `create or replace`
-- keeps the existing grants.
