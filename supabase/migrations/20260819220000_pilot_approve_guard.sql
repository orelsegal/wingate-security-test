-- ═══════════════════════════════════════════════════════════════════
-- PILOT APPROVE GUARD — a pilot submission cannot become 'approved'
-- without an authoritative grade for its current revision.
--
-- Why: the legacy approve_submission() approves with feedback only.
-- For a pilot student that would create the one state the loop must
-- never produce: approved (so resubmit is impossible) but ungraded (so
-- the gate never opens). Hiding the legacy call in the UI is not a
-- defence; this closes it in the database, before any state changes.
--
-- How: a BEFORE trigger on public.submissions. It fires only when a row
-- is entering 'approved', only for students with a pilot_members row,
-- and demands an authoritative grade for the submission's current
-- revision. The exception aborts the whole transaction, so the legacy
-- function's review row rolls back with it — no partial state.
-- Everyone outside the pilot keeps the legacy contract unchanged.
--
-- grade_and_approve is re-created below with one change: the grade is
-- inserted BEFORE the status update, so the guard sees it. Same
-- signature, same checks, same effects, same idempotency.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1 · the guard ──────────────────────────────────────────────────
create or replace function public.enforce_pilot_graded_approval()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'INSERT' or old.status is distinct from new.status)
     and exists (select 1 from public.pilot_members pm
                 where pm.student_id = new.student_id)
     and not exists (select 1 from public.grades g
                     where g.submission_id = new.id
                       and g.kind = 'authoritative'
                       and g.revision = new.revision)
  then
    raise exception 'pilot_approval_requires_grade'
      using hint = 'a pilot submission is approved only through grade_and_approve, which grades first';
  end if;
  return new;
end $$;

drop trigger if exists submissions_pilot_graded_approval on public.submissions;
create trigger submissions_pilot_graded_approval
  before insert or update on public.submissions
  for each row when (new.status = 'approved')
  execute function public.enforce_pilot_graded_approval();

revoke all on function public.enforce_pilot_graded_approval()
  from public, anon, authenticated;

-- ── 2 · grade_and_approve — grade before status, guard-compatible ──
create or replace function public.grade_and_approve(
  p_submission uuid, p_score integer, p_feedback text, p_idem_key text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_status public.submission_status; v_rev integer;
  v_task uuid; v_student uuid; v_prev uuid; v_threshold integer;
begin
  if public.app_idem_begin(p_idem_key, 'grade_and_approve') is not null then
    return;
  end if;

  if not public.app_can_review_submission(p_submission) then
    raise exception 'not_your_student'
      using hint = 'this submission is outside your teaching scope';
  end if;

  select s.status, s.revision, s.task_id, s.student_id
    into v_status, v_rev, v_task, v_student
  from public.submissions s where s.id = p_submission for update;
  if v_status is null then raise exception 'submission_not_found'; end if;
  if v_status not in ('awaiting_review', 'resubmitted_awaiting') then
    raise exception 'not_awaiting_review'
      using hint = 'only a submission waiting for review can be approved';
  end if;

  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception 'invalid_score';
  end if;
  v_threshold := public.app_resolved_threshold(v_task);
  if p_score < v_threshold then
    raise exception 'score_below_threshold'
      using hint = 'a score below the gate threshold returns the work for revision instead of approving it';
  end if;
  if p_feedback is null or length(trim(p_feedback)) = 0 then
    raise exception 'feedback_required';
  end if;

  insert into public.teacher_reviews (submission_id, revision, decision, feedback, reviewed_by)
  values (p_submission, v_rev, 'approved', p_feedback, auth.uid());

  -- the authoritative grade FIRST, chained over the current head if one
  -- exists — the approval guard on submissions checks for exactly this row
  select g.id into v_prev
  from public.grades g
  where g.submission_id = p_submission and g.supersedes_grade_id is null
  limit 1;
  if v_prev is not null then
    insert into public.grades (submission_id, revision, score, kind, graded_by, supersedes_grade_id)
    values (p_submission, v_rev, p_score, 'authoritative', auth.uid(), v_prev);
  else
    insert into public.grades (submission_id, revision, score, kind, graded_by)
    values (p_submission, v_rev, p_score, 'authoritative', auth.uid());
  end if;

  update public.submissions
     set status = 'approved', updated_at = now()
   where id = p_submission;

  perform public.app_apply_gate_unlock(v_task, v_student, p_score);
  perform public.app_log_submission_event(p_submission, v_status, 'approved');
  perform public.app_idem_store(p_idem_key, 'grade_and_approve', p_submission,
                                jsonb_build_object('score', p_score));
end;
$$;

-- grants unchanged: same signature, and CREATE OR REPLACE preserves ACLs.

-- ── 3 · assert ─────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_trigger
                 where tgname = 'submissions_pilot_graded_approval') then
    raise exception 'pilot approve guard trigger missing';
  end if;
  raise notice 'pilot approve guard installed.';
end $$;
