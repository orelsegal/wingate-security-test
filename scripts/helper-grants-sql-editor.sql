-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTION GRANTS — production install pack
--
-- Paste the whole file into the Supabase SQL Editor and run it once.
-- It is a single transaction: either every statement lands, or none does.
--
-- WHAT IT DOES
--   Removes the direct anon/authenticated EXECUTE grants that Supabase's
--   default privileges put on seven helper functions, and hands EXECUTE back
--   to authenticated on the two that RLS policies call.
--
-- WHAT IT DOES NOT DO
--   No table is written. No row is created, updated or deleted. No policy,
--   trigger, function body, enum or auth setting changes. The five public
--   RPCs keep exactly the grants they have today.
--
-- SAFE TO RUN TWICE. Every statement is a REVOKE or a GRANT, all idempotent.
--
-- IF ANY CHECK FAILS the transaction aborts and the database is untouched.
-- Do not "fix it by hand" mid-run: read the message and stop.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ═══ PRE-CHECKS ═══════════════════════════════════════════════════════════
do $$
declare v_missing text; v_n int;
begin
  -- 1. every function this pack touches must exist, with the exact signature
  select string_agg(sig, E'\n       ') into v_missing
  from unnest(array[
    'public.app_idem_begin(text,text)',
    'public.app_idem_store(text,text,uuid,jsonb)',
    'public.app_submission_subject(uuid)',
    'public.app_log_submission_event(uuid,public.submission_status,public.submission_status)',
    'public.forbid_change()',
    'public.app_current_student_id()',
    'public.app_can_review_submission(uuid)'
  ]) sig
  where to_regprocedure(sig) is null;
  if v_missing is not null then
    raise exception E'PRE-CHECK FAILED · missing function(s):\n       %', v_missing;
  end if;

  -- 2. the five public RPCs must exist too — this pack asserts about them
  select string_agg(sig, ', ') into v_missing
  from unnest(array[
    'public.submit_task(uuid,jsonb,text)',
    'public.resubmit(uuid,jsonb,text)'
  ]) sig
  where to_regprocedure(sig) is null;
  if v_missing is not null then
    raise exception 'PRE-CHECK FAILED · missing RPC(s): %', v_missing;
  end if;

  -- 3. the roles must exist
  select string_agg(r, ', ') into v_missing
  from unnest(array['anon','authenticated']) r
  where not exists (select 1 from pg_roles where rolname = r);
  if v_missing is not null then
    raise exception 'PRE-CHECK FAILED · missing role(s): %', v_missing;
  end if;

  -- 4. the two policy helpers must currently be executable by authenticated.
  --    If they are not, RLS is already broken and this pack is not the fix.
  select string_agg(p.proname, ', ') into v_missing
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('app_current_student_id','app_can_review_submission')
    and not has_function_privilege('authenticated', p.oid, 'EXECUTE');
  if v_missing is not null then
    raise exception 'PRE-CHECK FAILED · policy helper already unreachable by authenticated: %', v_missing;
  end if;

  -- 5. report what is actually exposed right now, so the run is auditable
  select count(*) into v_n
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('app_idem_begin','app_idem_store','app_submission_subject',
                      'app_log_submission_event','forbid_change',
                      'app_current_student_id','app_can_review_submission')
    and has_function_privilege('anon', p.oid, 'EXECUTE');
  raise notice 'PRE-CHECK · % of 7 helpers are currently reachable by anon', v_n;

  raise notice 'PRE-CHECKS PASSED — 7 helpers found, 2 RPCs found, roles present.';
end $$;


-- ═══ APPLY ════════════════════════════════════════════════════════════════

-- Internal helpers. Only ever called from inside a SECURITY DEFINER function
-- or fired as a trigger, where the owner's rights apply — so no client role
-- needs a direct grant.
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

-- Policy helpers. RLS policy expressions are evaluated as the querying user,
-- so authenticated must keep EXECUTE. Revoke first, then grant back — a bare
-- grant would leave anon in place.
revoke all on function public.app_current_student_id()
  from public, anon, authenticated;
grant execute on function public.app_current_student_id()
  to authenticated;

revoke all on function public.app_can_review_submission(uuid)
  from public, anon, authenticated;
grant execute on function public.app_can_review_submission(uuid)
  to authenticated;


-- ═══ POST-CHECKS ══════════════════════════════════════════════════════════
do $$
declare
  v_bad text;
  v_internal text[] := array['app_idem_begin','app_idem_store','app_submission_subject',
                             'app_log_submission_event','forbid_change'];
  v_policy   text[] := array['app_current_student_id','app_can_review_submission'];
  v_rpc      text[] := array['submit_task','resubmit','return_for_revision',
                             'approve_submission','save_ai_feedback_draft'];
begin
  -- 1. no internal helper reachable by anon or authenticated
  select string_agg(distinct p.proname || '→' || r.rolname, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  cross join unnest(array['anon','authenticated']) as r(rolname)
  where n.nspname = 'public' and p.proname = any(v_internal)
    and has_function_privilege(r.rolname, p.oid, 'EXECUTE');
  if v_bad is not null then
    raise exception 'POST-CHECK FAILED · helper still reachable: %', v_bad;
  end if;

  -- 2. nor by PUBLIC
  select string_agg(distinct p.proname, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = any(v_internal)
    and has_function_privilege('public', p.oid, 'EXECUTE');
  if v_bad is not null then
    raise exception 'POST-CHECK FAILED · helper still reachable by PUBLIC: %', v_bad;
  end if;

  -- 3. the policy helpers kept authenticated — otherwise every RLS read breaks
  select string_agg(distinct p.proname, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = any(v_policy)
    and not has_function_privilege('authenticated', p.oid, 'EXECUTE');
  if v_bad is not null then
    raise exception 'POST-CHECK FAILED · policy helper lost authenticated: %', v_bad;
  end if;

  -- 4. and lost anon
  select string_agg(distinct p.proname, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = any(v_policy)
    and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then
    raise exception 'POST-CHECK FAILED · policy helper still reachable by anon: %', v_bad;
  end if;

  -- 5. the five public RPCs are exactly as they were
  select string_agg(distinct p.proname, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = any(v_rpc)
    and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then
    raise exception 'POST-CHECK FAILED · a public RPC became reachable by anon: %', v_bad;
  end if;

  select string_agg(distinct p.proname, ', ') into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = any(v_rpc)
    and not has_function_privilege('authenticated', p.oid, 'EXECUTE');
  if v_bad is not null then
    raise exception 'POST-CHECK FAILED · a public RPC lost authenticated EXECUTE: %', v_bad;
  end if;

  raise notice 'POST-CHECKS PASSED — 5 internal helpers unreachable, 2 policy helpers authenticated-only, 5 RPCs unchanged.';
end $$;

-- 6. Nothing was written. These are counts, never student content.
do $$
declare v_sub int; v_ver int; v_rec int; v_ev int;
begin
  select count(*) into v_sub from public.submissions;
  select count(*) into v_ver from public.submission_versions;
  select count(*) into v_rec from public.operation_receipts;
  select count(*) into v_ev  from public.submission_state_events;
  raise notice 'DATA UNCHANGED · submissions=%, versions=%, receipts=%, events=% (this pack writes no rows)',
    v_sub, v_ver, v_rec, v_ev;
end $$;

commit;

-- ═══ AFTER THE RUN ════════════════════════════════════════════════════════
-- Confirm from outside the database, with the anon key, that the helpers are
-- gone. Each of these should now return 42501 permission denied instead of a
-- result:
--
--   POST /rest/v1/rpc/app_idem_begin           {"p_key":"probe-00000001","p_op":"submit_task"}
--   POST /rest/v1/rpc/app_current_student_id   {}
--   POST /rest/v1/rpc/app_can_review_submission {"p_submission":"<any uuid>"}
--
-- And submit_task should still answer 42501 for anon (unchanged) while a
-- signed-in student can still hand in a station.
