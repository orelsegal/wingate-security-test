-- ═══════════════════════════════════════════════════════════════════
-- SUBMISSION CONTRACT — Pilot 0, schema only. Additive.
--
-- Imports only the missing pieces of the wingate-platform submission
-- contract, adapted to what this database already has:
--
--   · public.profiles stays canonical. No profiles.role, no display_name,
--     no competing user_role enum. Identity is profiles.id = auth.users.id.
--   · user_roles + app_role stay the source of truth for roles, read
--     through the existing has_role().
--   · The live group model is canonical. No parallel groups/enrollments.
--     Teacher scope goes through the existing subject-scoped helper
--     has_teacher_group_scope(teacher, student, subject).
--   · handle_new_user() is untouched. This migration creates, alters and
--     drops NOTHING on auth.users and no trigger on auth.users.
--
-- The identity bridge already exists and is trustworthy:
--   auth.uid() = profiles.id
--   profiles.linked_student_id -> students.id, writable by admins only,
--   enforced by the existing enforce_profile_scope_guard() trigger.
--
-- Everything here is fail-closed: RLS on, all grants revoked from public,
-- and no policy grants access without a proven teacher or student link.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Enums (names do not collide with app_role) ──────────────────
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'submission_status') then
    create type public.submission_status as enum (
      'submitted', 'awaiting_review', 'returned_for_revision',
      'resubmitted_awaiting', 'approved'
    );
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                 where n.nspname = 'public' and t.typname = 'review_decision') then
    create type public.review_decision as enum ('approved', 'returned_for_revision');
  end if;
end $$;

-- ── 2. Task catalogue ──────────────────────────────────────────────
-- The live database has no task entity. A task is anchored to an existing
-- subject and carries the external key the subject app already uses, so
-- ('literature-30','station-5') resolves to exactly one task.
create table if not exists public.learning_tasks (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references public.subjects(id) on delete restrict,
  external_app  text not null check (length(trim(external_app)) between 1 and 64),
  external_key  text not null check (length(trim(external_key)) between 1 and 64),
  title         text not null check (length(trim(title)) between 1 and 200),
  rubric        jsonb,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (external_app, external_key)
);
create index if not exists idx_lt_subject on public.learning_tasks (subject_id) where active;

-- ── 3. Submissions ─────────────────────────────────────────────────
-- One row per (task, student). student_id is the administrative students.id,
-- the same identity the live group model uses, so teacher scope resolves
-- through has_teacher_group_scope without a second student concept.
create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid not null references public.learning_tasks(id) on delete restrict,
  student_id    uuid not null references public.students(id) on delete cascade,
  status        public.submission_status not null default 'submitted',
  revision      integer not null default 1 check (revision >= 1),
  submitted_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (task_id, student_id)
);
create index if not exists idx_sub_student on public.submissions (student_id);
create index if not exists idx_sub_task_status on public.submissions (task_id, status);

-- Append-only content. Every submit and resubmit writes a new version;
-- nothing is ever overwritten, so a returned answer is still recoverable.
create table if not exists public.submission_versions (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.submissions(id) on delete cascade,
  revision       integer not null check (revision >= 1),
  content        jsonb not null,
  created_by     uuid not null references auth.users(id) on delete restrict,
  created_at     timestamptz not null default now(),
  unique (submission_id, revision)
);
create index if not exists idx_sv_submission on public.submission_versions (submission_id);

-- ── 4. AI draft — never visible to a student, never a decision ─────
create table if not exists public.feedback_drafts (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.submissions(id) on delete cascade,
  revision       integer not null check (revision >= 1),
  body           text not null,
  citations      jsonb not null default '[]'::jsonb,
  confidence     text not null default 'unknown'
                 check (confidence in ('low','medium','high','unknown')),
  model          text,
  created_at     timestamptz not null default now(),
  unique (submission_id, revision)
);

-- ── 5. Teacher decision — the only thing a student ever sees ───────
create table if not exists public.teacher_reviews (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.submissions(id) on delete cascade,
  revision       integer not null check (revision >= 1),
  decision       public.review_decision not null,
  feedback       text not null check (length(trim(feedback)) > 0),
  reviewed_by    uuid not null references auth.users(id) on delete restrict,
  reviewed_at    timestamptz not null default now(),
  unique (submission_id, revision)
);
create index if not exists idx_tr_submission on public.teacher_reviews (submission_id);

-- ── 6. Audit — every state change, with the real actor ─────────────
create table if not exists public.submission_state_events (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.submissions(id) on delete cascade,
  from_status    public.submission_status,
  to_status      public.submission_status not null,
  actor          uuid not null references auth.users(id) on delete restrict,
  actor_role     public.app_role not null,
  at             timestamptz not null default now()
);
create index if not exists idx_sse_submission on public.submission_state_events (submission_id, at);

-- Append-only: state events and versions are evidence, not working rows.
create or replace function public.forbid_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'append_only_table'
    using hint = 'rows in this table cannot be updated or deleted';
end;
$$;

drop trigger if exists sse_append_only on public.submission_state_events;
create trigger sse_append_only before update or delete on public.submission_state_events
  for each row execute function public.forbid_change();

drop trigger if exists sv_append_only on public.submission_versions;
create trigger sv_append_only before update or delete on public.submission_versions
  for each row execute function public.forbid_change();

-- ── 6b. Idempotency receipts ───────────────────────────────────────
-- A retried write must not act twice. The client sends a key it generated
-- for the attempt; a repeat with the same key returns the first result
-- instead of erroring or creating a second revision. Scoped to the actor,
-- so one caller's key can never replay another's operation.
create table if not exists public.operation_receipts (
  idem_key      text not null,
  actor         uuid not null references auth.users(id) on delete cascade,
  operation     text not null,
  submission_id uuid,
  result        jsonb,
  created_at    timestamptz not null default now(),
  -- The scope of an idempotency key is the triple, not the pair. The lock
  -- in app_idem_begin, this key, the lookup and the store all use exactly
  -- (actor, operation, idem_key). With a two-column key a second operation
  -- reusing the same key string would commit its side effects and then have
  -- its receipt silently swallowed by ON CONFLICT DO NOTHING, so a retry
  -- would run it a second time.
  primary key (actor, operation, idem_key)
);

drop trigger if exists or_append_only on public.operation_receipts;
create trigger or_append_only before update or delete on public.operation_receipts
  for each row execute function public.forbid_change();

-- app_idem_begin is the single entry point for every state-changing RPC.
--
-- It does three things, in this order, before any side effect:
--   1. validates the key and raises a deterministic error if it is unusable
--   2. takes a transaction-scoped advisory lock keyed to
--      (actor, operation, key), so two concurrent transactions with the
--      same triple are serialised — the second blocks until the first
--      commits or rolls back
--   3. only then looks for a prior receipt
--
-- A plain lookup-then-store would let two transactions both read "no
-- receipt" and both act. The lock closes that window: the loser waits,
-- and when it proceeds its fresh snapshot sees the winner's receipt.
--
-- The lock is transaction-scoped, so a failure after the reservation
-- releases it and rolls back the receipt with everything else. There is
-- no stuck success receipt and no partial state.
create or replace function public.app_idem_begin(p_key text, p_op text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_prev jsonb;
begin
  if p_key is null or length(trim(p_key)) = 0 then
    raise exception 'idempotency_key_required'
      using hint = 'every state-changing call must carry an idempotency key';
  end if;
  if length(p_key) < 8 or length(p_key) > 128 then
    raise exception 'idempotency_key_invalid'
      using hint = 'the idempotency key must be between 8 and 128 characters';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(auth.uid()::text || ':' || p_op || ':' || p_key, 0)
  );

  select r.result into v_prev
  from public.operation_receipts r
  where r.actor = auth.uid() and r.idem_key = p_key and r.operation = p_op;

  return v_prev;
end;
$$;

create or replace function public.app_idem_store(
  p_key text, p_op text, p_submission uuid, p_result jsonb
) returns void language sql security definer set search_path = '' as $$
  insert into public.operation_receipts (idem_key, actor, operation, submission_id, result)
  values (p_key, auth.uid(), p_op, p_submission, p_result)
  on conflict (actor, operation, idem_key) do nothing;
$$;

revoke all on function public.app_idem_begin(text, text)              from public;
revoke all on function public.app_idem_store(text, text, uuid, jsonb) from public;

-- ── 7. Identity bridge helper ──────────────────────────────────────
-- The caller's administrative student record, or null. Reads only the
-- admin-guarded link column; a student cannot point this at someone else.
create or replace function public.app_current_student_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.linked_student_id from public.profiles p where p.id = auth.uid();
$$;

-- The subject a submission belongs to, for the scope check.
create or replace function public.app_submission_subject(p_submission uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select t.subject_id
  from public.submissions s
  join public.learning_tasks t on t.id = s.task_id
  where s.id = p_submission;
$$;

-- Teacher scope for one submission, in a single chain:
-- teacher -> active group -> that group's subject -> that student.
-- Deliberately built on the existing has_teacher_group_scope. The old
-- cross-course app_teaches_student is not used anywhere in this contract.
create or replace function public.app_can_review_submission(p_submission uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.submissions s
    join public.learning_tasks t on t.id = s.task_id
    where s.id = p_submission
      and public.has_role(auth.uid(), 'teacher'::public.app_role)
      and public.has_teacher_group_scope(auth.uid(), s.student_id, t.subject_id)
  );
$$;

revoke all on function public.app_current_student_id()            from public;
revoke all on function public.app_submission_subject(uuid)        from public;
revoke all on function public.app_can_review_submission(uuid)     from public;
revoke all on function public.forbid_change()                     from public;
grant execute on function public.app_current_student_id()         to authenticated;
grant execute on function public.app_can_review_submission(uuid)  to authenticated;

-- ── 8. RLS — fail closed ───────────────────────────────────────────
alter table public.operation_receipts       enable row level security;
alter table public.learning_tasks           enable row level security;
alter table public.submissions              enable row level security;
alter table public.submission_versions      enable row level security;
alter table public.feedback_drafts          enable row level security;
alter table public.teacher_reviews          enable row level security;
alter table public.submission_state_events  enable row level security;

revoke all on public.learning_tasks, public.submissions, public.submission_versions,
              public.feedback_drafts, public.teacher_reviews, public.submission_state_events,
              public.operation_receipts
  from public, anon;
-- SELECT is granted to authenticated on every contract table; RLS below is
-- what actually decides which rows come back. Without the grant even an
-- authorised teacher gets "permission denied" instead of an empty set.
grant select on public.learning_tasks, public.submissions, public.submission_versions,
                public.teacher_reviews, public.feedback_drafts,
                public.submission_state_events
  to authenticated;

-- Tasks: any signed-in learner may read the catalogue of active tasks.
drop policy if exists lt_read on public.learning_tasks;
create policy lt_read on public.learning_tasks
  for select to authenticated using (active);

-- A student sees only their own submission. A teacher sees only one in a
-- subject they actually teach that student in.
drop policy if exists sub_read on public.submissions;
create policy sub_read on public.submissions
  for select to authenticated
  using (
    student_id = public.app_current_student_id()
    or public.app_can_review_submission(id)
  );

drop policy if exists sv_read on public.submission_versions;
create policy sv_read on public.submission_versions
  for select to authenticated
  using (
    exists (select 1 from public.submissions s
            where s.id = submission_id
              and ( s.student_id = public.app_current_student_id()
                    or public.app_can_review_submission(s.id) ))
  );

-- The teacher's published decision is the only feedback a student may read.
drop policy if exists tr_read on public.teacher_reviews;
create policy tr_read on public.teacher_reviews
  for select to authenticated
  using (
    exists (select 1 from public.submissions s
            where s.id = submission_id
              and ( s.student_id = public.app_current_student_id()
                    or public.app_can_review_submission(s.id) ))
  );

-- The AI draft is teacher-only. No student policy exists at all, so a
-- student cannot read it even if a client asks for it directly.
drop policy if exists fd_read on public.feedback_drafts;
create policy fd_read on public.feedback_drafts
  for select to authenticated
  using (public.app_can_review_submission(submission_id));

-- Audit is teacher-only and read-only.
drop policy if exists sse_read on public.submission_state_events;
create policy sse_read on public.submission_state_events
  for select to authenticated
  using (public.app_can_review_submission(submission_id));

-- operation_receipts deliberately has NO policy and no grant: it is written
-- and read only by the SECURITY DEFINER RPCs, never by a client directly.

-- No INSERT, UPDATE or DELETE policy is defined on any table here. Every
-- write goes through the SECURITY DEFINER RPCs in the next migration.
