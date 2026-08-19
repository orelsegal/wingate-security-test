-- ═══════════════════════════════════════════════════════════════════════════
-- PILOT GRADE GATE · חבילת התקנה ל-SQL Editor · פרויקט flfemffhswlpgpbvhuvy
--
-- להעתיק את כל הקובץ, להדביק, להריץ פעם אחת. טרנזקציה אחת.
-- בטוח להרצה כפולה. לא נכתבת אף שורת נתונים — סכימה בלבד.
--
-- ROLLBACK (רק לפני שנכנסו נתונים אמיתיים):
--   drop trigger if exists submissions_pilot_graded_approval on public.submissions;
--   drop function if exists public.enforce_pilot_graded_approval();
--   drop function if exists public.grade_and_approve(uuid,integer,text,text);
--   drop function if exists public.manual_gate_unlock(uuid,uuid,text,text);
--   drop function if exists public.app_apply_gate_unlock(uuid,uuid,integer);
--   drop function if exists public.app_resolved_threshold(uuid);
--   drop table if exists public.pilot_members;
--   drop table if exists public.gate_unlocks;
--   drop table if exists public.grades;
--   alter table public.learning_tasks drop column if exists pass_threshold;
--   drop type if exists public.unlock_method;
--   drop type if exists public.grade_kind;
-- אחרי ציונים אמיתיים — אין rollback; מוסיפים מיגרציה מתקנת בלבד.
-- ═══════════════════════════════════════════════════════════════════════════
begin;

do $do$
declare v_missing text;
begin
  select string_agg(t, ', ') into v_missing
  from unnest(array['submissions','teacher_reviews','learning_tasks','students']) t
  where not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                    where n.nspname='public' and c.relname=t and c.relkind='r');
  if v_missing is not null then
    raise exception 'PRE-CHECK FAILED · חסרות טבלאות חוזה: %', v_missing;
  end if;
  if to_regprocedure('public.app_can_review_submission(uuid)') is null
     or to_regprocedure('public.app_idem_begin(text,text)') is null
     or to_regprocedure('public.forbid_change()') is null then
    raise exception 'PRE-CHECK FAILED · חוזה ההגשות אינו מותקן';
  end if;
  raise notice 'PRE-CHECKS PASSED';
end $do$;

-- ── 1 · enums ──────────────────────────────────────────────────────────────
do $$ begin
  create type public.grade_kind as enum ('shadow', 'authoritative');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.unlock_method as enum ('threshold', 'manual');
exception when duplicate_object then null; end $$;

-- ── 2 · the task threshold ─────────────────────────────────────────────────
-- Nullable by design: null means "no task threshold", and resolution falls
-- through to the system default 85. No course entity is invented.
alter table public.learning_tasks
  add column if not exists pass_threshold integer
  check (pass_threshold is null or (pass_threshold between 0 and 100));

create or replace function public.app_resolved_threshold(p_task uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(t.pass_threshold, 85)
  from public.learning_tasks t where t.id = p_task;
$$;

-- ── 3 · grades — the supersedes chain, ported ──────────────────────────────
-- The current grade of a submission is the row no newer row supersedes.
-- UNIQUE(supersedes_grade_id) keeps the chain linear; the composite FK keeps
-- a chain inside one submission; the partial unique index allows exactly one
-- head per submission. Rows are never updated or deleted.
create table if not exists public.grades (
  id                  uuid primary key default gen_random_uuid(),
  submission_id       uuid not null references public.submissions(id) on delete restrict,
  revision            integer not null check (revision >= 1),
  score               integer not null check (score between 0 and 100),
  kind                public.grade_kind not null,
  graded_by           uuid not null references auth.users(id) on delete restrict,
  supersedes_grade_id uuid unique,
  created_at          timestamptz not null default now(),
  unique (id, submission_id),
  foreign key (supersedes_grade_id, submission_id)
    references public.grades (id, submission_id)
);
create unique index if not exists grades_one_head_per_submission
  on public.grades (submission_id) where supersedes_grade_id is null;
create index if not exists grades_submission_idx on public.grades (submission_id);

-- ── 4 · gate unlocks ───────────────────────────────────────────────────────
-- The row means: "the gate that FOLLOWS task_id is open for this student".
-- Referencing the source task avoids inventing a learning_task row for the
-- next station. Manual unlocks carry a mandatory reason and the acting
-- teacher — the row itself is the audit record.
create table if not exists public.gate_unlocks (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.learning_tasks(id) on delete restrict,
  student_id  uuid not null references public.students(id) on delete restrict,
  method      public.unlock_method not null,
  score       integer check (score is null or (score between 0 and 100)),
  reason      text,
  actor       uuid not null references auth.users(id) on delete restrict,
  created_at  timestamptz not null default now(),
  unique (task_id, student_id),
  constraint gate_unlocks_manual_reason
    check (method <> 'manual' or (reason is not null and length(btrim(reason)) > 0))
);
create index if not exists gate_unlocks_student_idx on public.gate_unlocks (student_id);

-- ── 5 · pilot membership — server-side, never a browser flag ───────────────
create table if not exists public.pilot_members (
  student_id uuid primary key references public.students(id) on delete cascade,
  note       text,
  added_by   uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ── 6 · append-only enforcement ────────────────────────────────────────────
-- forbid_change() already exists in the contract; these tables join it.
do $$ begin
  create trigger grades_append_only
    before update or delete on public.grades
    for each row execute function public.forbid_change();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger gate_unlocks_append_only
    before update or delete on public.gate_unlocks
    for each row execute function public.forbid_change();
exception when duplicate_object then null; end $$;

-- ── 7 · the unlock side effect ─────────────────────────────────────────────
-- p_score is the score the calling operation just validated and wrote; this
-- function never re-reads public.grades, so there is no second opinion about
-- which score counts. Monotonic: on conflict do nothing — an existing unlock
-- is never replaced, so a later threshold raise cannot revoke it.
create or replace function public.app_apply_gate_unlock(
  p_task uuid, p_student uuid, p_score integer
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_threshold integer; v_inserted boolean := false;
begin
  v_threshold := public.app_resolved_threshold(p_task);
  if p_score >= v_threshold then
    insert into public.gate_unlocks (task_id, student_id, method, score, actor)
    values (p_task, p_student, 'threshold', p_score, auth.uid())
    on conflict (task_id, student_id) do nothing;
    v_inserted := found;
  end if;
  return v_inserted;
end;
$$;

-- ── 8 · grade_and_approve ──────────────────────────────────────────────────
-- The graded approval path. approve_submission keeps its exact signature and
-- behaviour for ungraded flows; this rpc is the pilot's approval:
--   scope check → status check → review row → status approved →
--   authoritative grade (chained) → threshold unlock.
-- A score below the resolved threshold is refused with a clear error: the
-- reviewer should use return_for_revision, so an "approved but locked"
-- state cannot exist.
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

  update public.submissions
     set status = 'approved', updated_at = now()
   where id = p_submission;

  -- the authoritative grade, chained over the current head if one exists
  select g.id into v_prev
  from public.grades g
  where g.submission_id = p_submission and g.supersedes_grade_id is null
  limit 1;
  -- linear chain: the new row supersedes the previous head
  if v_prev is not null then
    insert into public.grades (submission_id, revision, score, kind, graded_by, supersedes_grade_id)
    values (p_submission, v_rev, p_score, 'authoritative', auth.uid(), v_prev);
  else
    insert into public.grades (submission_id, revision, score, kind, graded_by)
    values (p_submission, v_rev, p_score, 'authoritative', auth.uid());
  end if;

  perform public.app_apply_gate_unlock(v_task, v_student, p_score);
  perform public.app_log_submission_event(p_submission, v_status, 'approved');
  perform public.app_idem_store(p_idem_key, 'grade_and_approve', p_submission,
                                jsonb_build_object('score', p_score));
end;
$$;

-- ── 9 · manual unlock — documented, teacher-scoped ─────────────────────────
create or replace function public.manual_gate_unlock(
  p_task uuid, p_student uuid, p_reason text, p_idem_key text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_subject uuid;
begin
  if public.app_idem_begin(p_idem_key, 'manual_gate_unlock') is not null then
    return;
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'reason_required';
  end if;
  select t.subject_id into v_subject from public.learning_tasks t where t.id = p_task;
  if v_subject is null then raise exception 'task_not_found'; end if;
  if not public.has_teacher_group_scope(auth.uid(), p_student, v_subject) then
    raise exception 'not_your_student';
  end if;
  insert into public.gate_unlocks (task_id, student_id, method, reason, actor)
  values (p_task, p_student, 'manual', p_reason, auth.uid())
  on conflict (task_id, student_id) do nothing;
  perform public.app_idem_store(p_idem_key, 'manual_gate_unlock', null,
                                jsonb_build_object('task', p_task, 'student', p_student));
end;
$$;

-- ── 10 · RLS — fail closed, writes only through the rpcs ───────────────────
alter table public.grades       enable row level security;
alter table public.gate_unlocks enable row level security;
alter table public.pilot_members enable row level security;

revoke all on public.grades, public.gate_unlocks, public.pilot_members
  from public, anon, authenticated;
grant select on public.grades, public.gate_unlocks, public.pilot_members
  to authenticated;

-- a student sees her own grades; a teacher sees grades in scope
drop policy if exists gr_read on public.grades;
create policy gr_read on public.grades
  for select to authenticated
  using (exists (select 1 from public.submissions s
                 where s.id = submission_id
                   and ( s.student_id = public.app_current_student_id()
                         or public.app_can_review_submission(s.id) )));

drop policy if exists gu_read on public.gate_unlocks;
create policy gu_read on public.gate_unlocks
  for select to authenticated
  using ( student_id = public.app_current_student_id()
          or exists (select 1 from public.learning_tasks t
                     where t.id = task_id
                       and public.has_teacher_group_scope(auth.uid(), student_id, t.subject_id)) );

drop policy if exists pm_read on public.pilot_members;
create policy pm_read on public.pilot_members
  for select to authenticated
  using ( student_id = public.app_current_student_id()
          or exists (select 1 from public.learning_tasks t
                     where t.external_app = 'literature-30'
                       and public.has_teacher_group_scope(auth.uid(), student_id, t.subject_id)) );

-- ── 11 · grants — explicit, the default-privileges lesson applied ──────────
revoke all on function public.app_resolved_threshold(uuid)                 from public, anon, authenticated;
revoke all on function public.app_apply_gate_unlock(uuid, uuid, integer)   from public, anon, authenticated;
revoke all on function public.grade_and_approve(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.manual_gate_unlock(uuid, uuid, text, text)   from public, anon, authenticated;
grant execute on function public.grade_and_approve(uuid, integer, text, text) to authenticated;
grant execute on function public.manual_gate_unlock(uuid, uuid, text, text)   to authenticated;

-- ── 12 · assert the shape, in-transaction ──────────────────────────────────
do $$
declare v_bad text;
begin
  select string_agg(sig, ', ') into v_bad
  from unnest(array[
    'public.grade_and_approve(uuid,integer,text,text)',
    'public.manual_gate_unlock(uuid,uuid,text,text)',
    'public.app_apply_gate_unlock(uuid,uuid,integer)',
    'public.app_resolved_threshold(uuid)'
  ]) sig where to_regprocedure(sig) is null;
  if v_bad is not null then raise exception 'missing function(s): %', v_bad; end if;

  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public'
               and p.proname in ('app_apply_gate_unlock','app_resolved_threshold')
               and (has_function_privilege('anon',p.oid,'EXECUTE')
                    or has_function_privilege('authenticated',p.oid,'EXECUTE'))) then
    raise exception 'internal helper reachable by a client role';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and p.proname in ('grade_and_approve','manual_gate_unlock')
               and has_function_privilege('anon',p.oid,'EXECUTE')) then
    raise exception 'rpc reachable by anon';
  end if;
  raise notice 'pilot grade gate installed: grades, gate_unlocks, pilot_members, 2 rpcs, RLS on.';
end $$;


-- ── 10 · pilot approve guard ─────────────────────────────────────────────
-- הגשת פיילוט אינה יכולה להפוך ל-approved בלי ציון authoritative לאותה
-- גרסה: טריגר BEFORE על submissions חוסם גם את approve_submission הישן
-- וגם עדכון ישיר, לפני שינוי מצב. מחוץ לפיילוט החוזה הישן ללא שינוי.
-- grade_and_approve נוצר מחדש כך שהציון נכתב לפני הסטטוס.

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


do $$
begin
  if not exists (select 1 from pg_trigger
                 where tgname = 'submissions_pilot_graded_approval') then
    raise exception 'pilot approve guard trigger missing';
  end if;
  raise notice 'pilot approve guard installed.';
end $$;

do $do$
declare v_n int;
begin
  select count(*) into v_n from public.grades;
  if v_n <> 0 then raise exception 'POST-CHECK · grades אמור להיוולד ריק (%)', v_n; end if;
  select count(*) into v_n from public.gate_unlocks;
  if v_n <> 0 then raise exception 'POST-CHECK · gate_unlocks אמור להיוולד ריק'; end if;
  select count(*) into v_n from public.pilot_members;
  raise notice 'POST-CHECK · pilot_members: % (0 = טרם נרשמו חברות)', v_n;
  if not exists (select 1 from pg_trigger where tgname = 'submissions_pilot_graded_approval') then
    raise exception 'POST-CHECK · טריגר השומר חסר';
  end if;
  raise notice 'POST-CHECKS PASSED — grades / gate_unlocks / pilot_members / 2 RPCs.';
end $do$;

commit;
