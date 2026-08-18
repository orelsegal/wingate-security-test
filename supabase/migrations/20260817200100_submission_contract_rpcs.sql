-- ═══════════════════════════════════════════════════════════════════
-- SUBMISSION CONTRACT — Pilot 0, write path.
--
-- Every write to the contract goes through these four RPCs. The tables
-- carry no INSERT/UPDATE/DELETE policy, so there is no other way in.
--
-- Fail-closed everywhere: each function resolves the caller's real
-- identity first, refuses if the link is missing, refuses if the state
-- transition is not legal, and raises rather than returning a soft
-- failure. Nothing here trusts an id supplied by the client except as a
-- lookup key that is then re-checked against the caller.
--
-- Idempotent: p_idem_key is MANDATORY on every state-changing call. There
-- is no default and no path that skips it. A null, empty or out-of-range
-- key raises before any write.
--
-- Serialisation is not lookup-then-store. app_idem_begin takes a
-- transaction-scoped advisory lock on (actor, operation, key) before it
-- looks anything up, so two concurrent calls with the same triple cannot
-- both pass the check. The key is scoped to the caller, so it can never
-- replay someone else's operation.
--
-- The AI never appears here. save_ai_feedback_draft writes to
-- feedback_drafts only; it cannot touch status, cannot write
-- teacher_reviews, and nothing a student can read.
-- ═══════════════════════════════════════════════════════════════════

-- Record a transition with the real actor and their real role.
create or replace function public.app_log_submission_event(
  p_submission uuid, p_from public.submission_status, p_to public.submission_status
) returns void language plpgsql security definer set search_path = '' as $$
declare v_role public.app_role;
begin
  select ur.role into v_role
  from public.user_roles ur
  where ur.user_id = auth.uid()
  order by case ur.role when 'teacher' then 1 when 'student' then 2 else 3 end
  limit 1;

  if v_role is null then
    raise exception 'actor_has_no_role';
  end if;

  insert into public.submission_state_events (submission_id, from_status, to_status, actor, actor_role)
  values (p_submission, p_from, p_to, auth.uid(), v_role);
end;
$$;

-- ── submit_task ────────────────────────────────────────────────────
-- First submission for a task. The student is resolved from the caller,
-- never passed in.
create or replace function public.submit_task(
  p_task uuid, p_content jsonb, p_idem_key text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_student uuid; v_sub uuid; v_prev jsonb;
begin
  v_prev := public.app_idem_begin(p_idem_key, 'submit_task');
  if v_prev is not null then return (v_prev->>'submission_id')::uuid; end if;
  v_student := public.app_current_student_id();
  if v_student is null then
    raise exception 'no_student_identity'
      using hint = 'this account is not linked to a student record';
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'invalid_content';
  end if;
  if not exists (select 1 from public.learning_tasks where id = p_task and active) then
    raise exception 'task_not_found';
  end if;
  if exists (select 1 from public.submissions where task_id = p_task and student_id = v_student) then
    raise exception 'already_submitted'
      using hint = 'use resubmit after the teacher returns it';
  end if;

  insert into public.submissions (task_id, student_id, status, revision)
  values (p_task, v_student, 'awaiting_review', 1)
  returning id into v_sub;

  insert into public.submission_versions (submission_id, revision, content, created_by)
  values (v_sub, 1, p_content, auth.uid());

  perform public.app_log_submission_event(v_sub, null, 'awaiting_review');
  perform public.app_idem_store(p_idem_key, 'submit_task', v_sub,
                                jsonb_build_object('submission_id', v_sub));
  return v_sub;
end;
$$;

-- ── resubmit ───────────────────────────────────────────────────────
-- Only the owning student, and only from returned_for_revision.
create or replace function public.resubmit(
  p_submission uuid, p_content jsonb, p_idem_key text
) returns integer language plpgsql security definer set search_path = '' as $$
declare v_student uuid; v_status public.submission_status; v_rev integer; v_prev jsonb;
begin
  v_prev := public.app_idem_begin(p_idem_key, 'resubmit');
  if v_prev is not null then return (v_prev->>'revision')::integer; end if;
  v_student := public.app_current_student_id();
  if v_student is null then raise exception 'no_student_identity'; end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'invalid_content';
  end if;

  select s.status, s.revision into v_status, v_rev
  from public.submissions s
  where s.id = p_submission and s.student_id = v_student
  for update;

  if not found then raise exception 'submission_not_found'; end if;
  if v_status <> 'returned_for_revision' then
    raise exception 'illegal_transition' using hint = 'only a returned submission can be resubmitted';
  end if;

  v_rev := v_rev + 1;
  update public.submissions
     set status = 'resubmitted_awaiting', revision = v_rev, updated_at = now()
   where id = p_submission;

  insert into public.submission_versions (submission_id, revision, content, created_by)
  values (p_submission, v_rev, p_content, auth.uid());

  perform public.app_log_submission_event(p_submission, 'returned_for_revision', 'resubmitted_awaiting');
  perform public.app_idem_store(p_idem_key, 'resubmit', p_submission,
                                jsonb_build_object('revision', v_rev));
  return v_rev;
end;
$$;

-- ── save_ai_feedback_draft ─────────────────────────────────────────
-- A draft, and nothing more. Callable only by a teacher scoped to this
-- submission, so an AI job runs on a teacher's behalf and never wider.
-- It cannot change status and cannot write teacher_reviews.
create or replace function public.save_ai_feedback_draft(
  p_submission uuid, p_body text, p_citations jsonb default '[]'::jsonb,
  p_confidence text default 'unknown', p_model text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_rev integer;
begin
  if not public.app_can_review_submission(p_submission) then
    raise exception 'not_authorised_for_submission';
  end if;
  if p_body is null or length(trim(p_body)) = 0 then
    raise exception 'empty_draft';
  end if;
  if p_confidence not in ('low','medium','high','unknown') then
    raise exception 'invalid_confidence';
  end if;

  select revision into v_rev from public.submissions where id = p_submission;

  insert into public.feedback_drafts (submission_id, revision, body, citations, confidence, model)
  values (p_submission, v_rev, p_body, coalesce(p_citations, '[]'::jsonb), p_confidence, p_model)
  on conflict (submission_id, revision) do update
    set body = excluded.body, citations = excluded.citations,
        confidence = excluded.confidence, model = excluded.model,
        created_at = now();
end;
$$;

-- ── return_for_revision ────────────────────────────────────────────
create or replace function public.return_for_revision(
  p_submission uuid, p_feedback text, p_idem_key text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_status public.submission_status; v_rev integer;
begin
  if public.app_idem_begin(p_idem_key, 'return_for_revision') is not null then
    return;
  end if;
  if not public.app_can_review_submission(p_submission) then
    raise exception 'not_authorised_for_submission';
  end if;
  if p_feedback is null or length(trim(p_feedback)) = 0 then
    raise exception 'feedback_required'
      using hint = 'a returned submission must say what to fix';
  end if;

  select status, revision into v_status, v_rev
  from public.submissions where id = p_submission for update;

  if v_status not in ('awaiting_review','resubmitted_awaiting') then
    raise exception 'illegal_transition';
  end if;

  insert into public.teacher_reviews (submission_id, revision, decision, feedback, reviewed_by)
  values (p_submission, v_rev, 'returned_for_revision', p_feedback, auth.uid());

  update public.submissions
     set status = 'returned_for_revision', updated_at = now()
   where id = p_submission;

  perform public.app_log_submission_event(p_submission, v_status, 'returned_for_revision');
  perform public.app_idem_store(p_idem_key, 'return_for_revision', p_submission,
                                jsonb_build_object('decision', 'returned_for_revision'));
end;
$$;

-- ── approve_submission ─────────────────────────────────────────────
create or replace function public.approve_submission(
  p_submission uuid, p_feedback text, p_idem_key text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_status public.submission_status; v_rev integer;
begin
  if public.app_idem_begin(p_idem_key, 'approve_submission') is not null then
    return;
  end if;
  if not public.app_can_review_submission(p_submission) then
    raise exception 'not_authorised_for_submission';
  end if;
  if p_feedback is null or length(trim(p_feedback)) = 0 then
    raise exception 'feedback_required';
  end if;

  select status, revision into v_status, v_rev
  from public.submissions where id = p_submission for update;

  if v_status not in ('awaiting_review','resubmitted_awaiting') then
    raise exception 'illegal_transition';
  end if;

  insert into public.teacher_reviews (submission_id, revision, decision, feedback, reviewed_by)
  values (p_submission, v_rev, 'approved', p_feedback, auth.uid());

  update public.submissions
     set status = 'approved', updated_at = now()
   where id = p_submission;

  perform public.app_log_submission_event(p_submission, v_status, 'approved');
  perform public.app_idem_store(p_idem_key, 'approve_submission', p_submission,
                                jsonb_build_object('decision', 'approved'));
end;
$$;

-- ── grants ─────────────────────────────────────────────────────────
revoke all on function public.app_log_submission_event(uuid, public.submission_status, public.submission_status) from public;
revoke all on function public.submit_task(uuid, jsonb, text)              from public, anon;
revoke all on function public.resubmit(uuid, jsonb, text)                 from public, anon;
revoke all on function public.save_ai_feedback_draft(uuid, text, jsonb, text, text) from public, anon;
revoke all on function public.return_for_revision(uuid, text, text)       from public, anon;
revoke all on function public.approve_submission(uuid, text, text)        from public, anon;

grant execute on function public.submit_task(uuid, jsonb, text)           to authenticated;
grant execute on function public.resubmit(uuid, jsonb, text)              to authenticated;
grant execute on function public.save_ai_feedback_draft(uuid, text, jsonb, text, text) to authenticated;
grant execute on function public.return_for_revision(uuid, text, text)    to authenticated;
grant execute on function public.approve_submission(uuid, text, text)     to authenticated;
