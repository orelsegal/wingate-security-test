#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Idempotency under real concurrency. Local stack only.
#
# The single-connection suite cannot prove serialisation: it never has
# two transactions in flight at once. This one opens TWO real psql
# connections and makes them collide on the same
# (actor, operation, idempotency key) triple.
#
# Each pair overlaps deliberately: both transactions begin, both sleep
# past the point where a lookup-then-store implementation would already
# have read "no receipt", and only then call the RPC. With the advisory
# lock in app_idem_begin the loser blocks until the winner commits.
# ═══════════════════════════════════════════════════════════════════
set -uo pipefail
DB="${DB:-postgresql://postgres:postgres@127.0.0.1:55322/postgres}"
PASS=0; FAIL=0
ok()   { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad()  { echo "  FAIL  $1  — $2"; FAIL=$((FAIL+1)); }

q() { psql "$DB" -tAc "$1" 2>&1; }

# ── fixtures: two students, one teacher, one group, two tasks ──────
# Idempotent: clears any previous run first. profiles rows already exist —
# handle_new_user() creates them on the auth.users insert — so the upsert
# must also overwrite email, otherwise the lookups below find nothing.
# The append-only triggers correctly refuse DELETE, so the harness lifts
# them for the reset only. This runs as postgres on a local test database
# and never touches a deployed one.
psql "$DB" -q -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
alter table public.operation_receipts      disable trigger or_append_only;
alter table public.submission_versions     disable trigger sv_append_only;
alter table public.submission_state_events disable trigger sse_append_only;
do $$
declare v_subj uuid; v_stu uuid; v_oth uuid; v_tea uuid;
        v_srec uuid; v_orec uuid; v_grp uuid;
begin
  delete from public.operation_receipts where idem_key like 'cc-%';
  delete from public.submission_state_events e using public.submissions s, public.learning_tasks t
    where e.submission_id = s.id and t.id = s.task_id and t.external_app = 'cc';
  delete from public.submission_versions v using public.submissions s, public.learning_tasks t
    where v.submission_id = s.id and t.id = s.task_id and t.external_app = 'cc';
  delete from public.submissions s using public.learning_tasks t
    where t.id = s.task_id and t.external_app = 'cc';
  delete from public.learning_tasks where external_app = 'cc';
  delete from public.learning_group_students where group_id in
    (select id from public.learning_groups where name = 'cc-group');
  delete from public.learning_group_teachers where group_id in
    (select id from public.learning_groups where name = 'cc-group');
  delete from public.learning_groups where name = 'cc-group';
  delete from public.students where class_name = 'יא-cc';
  delete from auth.users where email like '%@cc.local';
  delete from public.subjects where subject_name = 'ספרות-cc';

  v_stu := gen_random_uuid(); v_oth := gen_random_uuid(); v_tea := gen_random_uuid();
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, created_at, updated_at)
  select u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
         u::text||'@cc.local','x',now(),now(),now()
  from unnest(array[v_stu,v_oth,v_tea]) u;

  insert into public.subjects (subject_name) values ('ספרות-cc') returning id into v_subj;
  insert into public.students (full_name,class_name,sport,overall_status,completion_percent)
  values ('תלמידה א cc','יא-cc','שחייה','green',0) returning id into v_srec;
  insert into public.students (full_name,class_name,sport,overall_status,completion_percent)
  values ('תלמידה ב cc','יא-cc','שחייה','green',0) returning id into v_orec;

  insert into public.profiles (id,email,full_name,linked_student_id)
  values (v_stu,'a@cc.local','תלמידה א',v_srec),
         (v_oth,'b@cc.local','תלמידה ב',v_orec),
         (v_tea,'t@cc.local','מורה cc',null)
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        linked_student_id = excluded.linked_student_id;

  insert into public.user_roles (user_id,role) values
    (v_stu,'student'),(v_oth,'student'),(v_tea,'teacher')
  on conflict (user_id,role) do nothing;

  insert into public.learning_groups (name,subject_id,academic_year_start)
  values ('cc-group',v_subj,2026) returning id into v_grp;
  insert into public.learning_group_teachers (group_id,teacher_user_id,role_in_group)
  values (v_grp,v_tea,'lead');
  insert into public.learning_group_students (group_id,student_id)
  values (v_grp,v_srec),(v_grp,v_orec);

  insert into public.learning_tasks (subject_id,external_app,external_key,title)
  values (v_subj,'cc','task-1','משימה א'),(v_subj,'cc','task-2','משימה ב');
end $$;
alter table public.operation_receipts      enable trigger or_append_only;
alter table public.submission_versions     enable trigger sv_append_only;
alter table public.submission_state_events enable trigger sse_append_only;
SQL

STU=$(q "select id from public.profiles where email='a@cc.local'")
OTH=$(q "select id from public.profiles where email='b@cc.local'")
TEA=$(q "select id from public.profiles where email='t@cc.local'")
T1=$(q "select id from public.learning_tasks where external_app='cc' and external_key='task-1'")
T2=$(q "select id from public.learning_tasks where external_app='cc' and external_key='task-2'")
for v in "$STU" "$OTH" "$TEA" "$T1" "$T2"; do
  [ -z "$v" ] && { echo "  FIXTURE FAILED — an id is empty"; exit 1; }
done

# run one RPC inside a transaction, as a given actor, with a pre-delay
run() { # $1 actor  $2 delay  $3 sql
  psql "$DB" -tAq -v ON_ERROR_STOP=1 <<SQL 2>&1
begin;
select set_config('request.jwt.claims', '{"sub":"$1","role":"authenticated"}', true);
set local role authenticated;
select pg_sleep($2);
$3
commit;
SQL
}

echo "── 1 · two concurrent submit_task, same key"
A=$(run "$STU" 0.6 "select public.submit_task('$T1'::uuid, '{\"a\":1}'::jsonb, 'cc-key-submit-01') as r;") &
PIDA=$!
B=$(run "$STU" 0.6 "select public.submit_task('$T1'::uuid, '{\"a\":1}'::jsonb, 'cc-key-submit-01') as r;")
wait $PIDA
SUBS=$(q "select count(*) from public.submissions s join public.learning_tasks t on t.id=s.task_id where t.external_key='task-1'")
VERS=$(q "select count(*) from public.submission_versions v join public.submissions s on s.id=v.submission_id join public.learning_tasks t on t.id=s.task_id where t.external_key='task-1'")
RCPT=$(q "select count(*) from public.operation_receipts where idem_key='cc-key-submit-01'")
[ "$SUBS" = "1" ] && ok "one submission" || bad "one submission" "got $SUBS"
[ "$VERS" = "1" ] && ok "one version"    || bad "one version" "got $VERS"
[ "$RCPT" = "1" ] && ok "one receipt"    || bad "one receipt" "got $RCPT"

SUBID=$(q "select s.id from public.submissions s join public.learning_tasks t on t.id=s.task_id where t.external_key='task-1'")
R1=$(run "$STU" 0 "select public.submit_task('$T1'::uuid,'{\"a\":1}'::jsonb,'cc-key-submit-01');" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | tail -1)
[ "$R1" = "$SUBID" ] && ok "both callers get the same submission id" || bad "same id returned" "$R1 vs $SUBID"

echo "── 2 · two concurrent resubmit, same key"
run "$TEA" 0 "select public.return_for_revision('$SUBID'::uuid,'תקני','cc-key-return-01');" >/dev/null
run "$STU" 0.6 "select public.resubmit('$SUBID'::uuid,'{\"a\":2}'::jsonb,'cc-key-resub-01');" >/dev/null &
PIDR=$!
run "$STU" 0.6 "select public.resubmit('$SUBID'::uuid,'{\"a\":2}'::jsonb,'cc-key-resub-01');" >/dev/null
wait $PIDR
REV=$(q "select revision from public.submissions where id='$SUBID'")
NV=$(q "select count(*) from public.submission_versions where submission_id='$SUBID'")
[ "$REV" = "2" ] && ok "revision advanced exactly once" || bad "revision once" "got $REV"
[ "$NV"  = "2" ] && ok "two versions total, not three"  || bad "version count" "got $NV"

echo "── 3 · two actors, same key string"
run "$STU" 0.5 "select public.submit_task('$T2'::uuid,'{\"a\":1}'::jsonb,'cc-key-shared-01');" >/dev/null &
PIDS=$!
run "$OTH" 0.5 "select public.submit_task('$T2'::uuid,'{\"a\":2}'::jsonb,'cc-key-shared-01');" >/dev/null
wait $PIDS
N2=$(q "select count(*) from public.submissions s join public.learning_tasks t on t.id=s.task_id where t.external_key='task-2'")
NR=$(q "select count(distinct actor) from public.operation_receipts where idem_key='cc-key-shared-01'")
[ "$N2" = "2" ] && ok "each actor got their own submission" || bad "two submissions" "got $N2"
[ "$NR" = "2" ] && ok "one receipt per actor, no leak"      || bad "receipts per actor" "got $NR"

echo "── 4 · missing or malformed key writes nothing"
BEFORE=$(q "select count(*) from public.submissions")
E1=$(run "$STU" 0 "select public.submit_task('$T1'::uuid,'{\"a\":1}'::jsonb, null);")
E2=$(run "$STU" 0 "select public.submit_task('$T1'::uuid,'{\"a\":1}'::jsonb, '');")
E3=$(run "$STU" 0 "select public.submit_task('$T1'::uuid,'{\"a\":1}'::jsonb, 'short');")
AFTER=$(q "select count(*) from public.submissions")
echo "$E1" | grep -q "idempotency_key_required" && ok "null key raises idempotency_key_required" || bad "null key" "$(echo "$E1"|head -1)"
echo "$E2" | grep -q "idempotency_key_required" && ok "empty key raises idempotency_key_required" || bad "empty key" "$(echo "$E2"|head -1)"
echo "$E3" | grep -q "idempotency_key_invalid"  && ok "short key raises idempotency_key_invalid"  || bad "short key" "$(echo "$E3"|head -1)"
[ "$BEFORE" = "$AFTER" ] && ok "no rows written by any rejected call" || bad "no writes" "$BEFORE -> $AFTER"

echo "── 5 · failure after the reservation leaves nothing behind"
# a legal key, but the call fails on a later check (task does not exist)
BAD_UUID='00000000-0000-0000-0000-0000000000ff'
SB=$(q "select count(*) from public.submissions")
RB=$(q "select count(*) from public.operation_receipts where idem_key='cc-key-rollback-1'")
E5=$(run "$STU" 0 "select public.submit_task('$BAD_UUID'::uuid,'{\"a\":1}'::jsonb,'cc-key-rollback-1');")
SA=$(q "select count(*) from public.submissions")
RA=$(q "select count(*) from public.operation_receipts where idem_key='cc-key-rollback-1'")
echo "$E5" | grep -q "task_not_found" && ok "the failing call raised task_not_found" || bad "raised" "$(echo "$E5"|head -1)"
[ "$RA" = "0" ] && ok "no success receipt was left behind" || bad "receipt left" "got $RA"
[ "$SB" = "$SA" ] && ok "no partial submission state"      || bad "partial state" "$SB -> $SA"
# and the key is still usable afterwards, so a retry is not permanently poisoned
E6=$(run "$STU" 0 "select public.submit_task('$T1'::uuid,'{\"a\":1}'::jsonb,'cc-key-rollback-1');")
echo "$E6" | grep -q "already_submitted" && ok "the key is reusable after a rollback" \
  || bad "key reusable" "$(echo "$E6"|head -1)"

echo
echo "  concurrency: $PASS passed, $FAIL failed"
[ "$FAIL" = "0" ] || exit 1
