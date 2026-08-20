#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# בדיקת concurrency אמיתית · שני חיבורים נפרדים, שתי טרנזקציות
#
# psql אחד אינו יכול להחזיק שתי טרנזקציות, ולכן הבדיקה הזו יושבת בנפרד
# מקובץ הבדיקות הראשי. שני חיבורים מנסים לשמור על אותה revision:
# אחד בלבד אמור להצליח, והשני אמור לקבל draft_conflict.
#
# הרצה: bash supabase/tests/20260820_concurrency.sh
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
DB="${PGDB:-pgpilot}"
psql_run() { docker exec -i "$DB" psql -U postgres -d postgres -tAq "$@"; }

fail=0
chk() { if [ "$2" = "1" ]; then echo "PASS  $1"; else echo "FAIL  $1"; fail=1; fi }

# ── נתוני בדיקה קבועים, שנמחקים בסוף ──────────────────────────────────────
SUB=11111111-aaaa-4aaa-8aaa-111111111111
GRP=22222222-aaaa-4aaa-8aaa-222222222222
TSK=33333333-aaaa-4aaa-8aaa-333333333333
STU=44444444-aaaa-4aaa-8aaa-444444444444
USR=55555555-aaaa-4aaa-8aaa-555555555555

psql_run <<SQL >/dev/null
insert into public.subjects (id, subject_name) values ('$SUB','conc-test') on conflict (id) do nothing;
insert into public.learning_groups (id,name,subject_id,academic_year_start,status)
  values ('$GRP','conc-group','$SUB',2026,'active') on conflict (id) do nothing;
insert into public.learning_tasks (id,subject_id,external_app,external_key,title,active)
  values ('$TSK','$SUB','conc-test','t1','conc task',true) on conflict (id) do nothing;
insert into public.students (id,full_name,class_name,sport)
  values ('$STU','conc student','c','c') on conflict (id) do nothing;
insert into public.learning_group_students (group_id,student_id) values ('$GRP','$STU') on conflict do nothing;
insert into auth.users (id,instance_id,aud,role,email)
  values ('$USR','00000000-0000-0000-0000-000000000000','authenticated','authenticated','conc@gate.test')
  on conflict (id) do nothing;
insert into public.profiles (id,linked_student_id) values ('$USR','$STU')
  on conflict (id) do update set linked_student_id = excluded.linked_student_id;
insert into public.user_roles (user_id,role) values ('$USR','student') on conflict do nothing;
delete from public.task_drafts where task_id = '$TSK';
SQL

AS_USER="select set_config('request.jwt.claims','{\"sub\":\"$USR\"}',false); set role authenticated;"

# ── 1 · שתי יצירות בו זמנית · רק אחת אמורה להצליח ────────────────────────
FIFO_A=$(mktemp -u); FIFO_B=$(mktemp -u); mkfifo "$FIFO_A" "$FIFO_B"
OUT_A=$(mktemp); OUT_B=$(mktemp)

# חיבור א: פותח טרנזקציה, יוצר, ומחזיק עד שמשחררים אותו
( docker exec -i "$DB" psql -U postgres -d postgres -tAq > "$OUT_A" 2>&1 <<SQL
$AS_USER
begin;
select public.save_task_draft('$TSK'::uuid, '{"who":"A"}'::jsonb, 0);
select pg_sleep(1.2);
commit;
SQL
) &
PID_A=$!
sleep 0.4
# חיבור ב: מנסה ליצור באותו רגע, על אותה revision 0
docker exec -i "$DB" psql -U postgres -d postgres -tAq > "$OUT_B" 2>&1 <<SQL
$AS_USER
begin;
select public.save_task_draft('$TSK'::uuid, '{"who":"B"}'::jsonb, 0);
commit;
SQL
wait $PID_A

A_OK=$(grep -cE '^1$' "$OUT_A" || true)
B_ERR=$(grep -c 'draft_conflict' "$OUT_B" || true)
chk "first-save race is not last-write-wins: exactly one creator" \
    "$([ "$A_OK" = "1" ] && [ "$B_ERR" -ge 1 ] && echo 1 || echo 0)"

STORED=$(psql_run -c "select content->>'who' from public.task_drafts where task_id='$TSK';")
chk "the winner's content survived, the loser wrote nothing" \
    "$([ "$STORED" = "A" ] && echo 1 || echo 0)"

# ── 2 · שני עדכונים על אותה revision · רק אחד אמור להצליח ────────────────
REV=$(psql_run -c "select revision from public.task_drafts where task_id='$TSK';")
OUT_C=$(mktemp); OUT_D=$(mktemp)

( docker exec -i "$DB" psql -U postgres -d postgres -tAq > "$OUT_C" 2>&1 <<SQL
$AS_USER
begin;
select public.save_task_draft('$TSK'::uuid, '{"who":"C"}'::jsonb, $REV);
select pg_sleep(1.2);
commit;
SQL
) &
PID_C=$!
sleep 0.4
docker exec -i "$DB" psql -U postgres -d postgres -tAq > "$OUT_D" 2>&1 <<SQL
$AS_USER
begin;
select public.save_task_draft('$TSK'::uuid, '{"who":"D"}'::jsonb, $REV);
commit;
SQL
wait $PID_C

C_OK=$(grep -cE "^$((REV+1))$" "$OUT_C" || true)
D_ERR=$(grep -c 'draft_conflict' "$OUT_D" || true)
chk "two updates on the same revision: one succeeds, one gets draft_conflict" \
    "$([ "$C_OK" = "1" ] && [ "$D_ERR" -ge 1 ] && echo 1 || echo 0)"

STORED2=$(psql_run -c "select content->>'who' from public.task_drafts where task_id='$TSK';")
chk "the rejected update did not overwrite the accepted one" \
    "$([ "$STORED2" = "C" ] && echo 1 || echo 0)"

# ── 3 · retry עם ה-revision החדשה מצליח ──────────────────────────────────
NEWREV=$(psql_run -c "select revision from public.task_drafts where task_id='$TSK';")
docker exec -i "$DB" psql -U postgres -d postgres -tAq > "$OUT_C" 2>&1 <<SQL
$AS_USER
select public.save_task_draft('$TSK'::uuid, '{"who":"D-retry"}'::jsonb, $NEWREV);
SQL
RETRY=$(grep -oE "^[0-9]+$" "$OUT_C" | tail -1)
chk "retrying with the fresh revision succeeds" \
    "$([ "$RETRY" = "$((NEWREV+1))" ] && echo 1 || echo 0)"

# ── ניקוי ────────────────────────────────────────────────────────────────
psql_run <<SQL >/dev/null
delete from public.task_drafts where task_id = '$TSK';
delete from public.learning_group_students where group_id = '$GRP';
delete from public.learning_tasks where id = '$TSK';
delete from public.user_roles where user_id = '$USR';
delete from public.profiles where id = '$USR';
delete from public.students where id = '$STU';
delete from public.learning_groups where id = '$GRP';
delete from public.subjects where id = '$SUB';
delete from auth.users where id = '$USR';
SQL
rm -f "$FIFO_A" "$FIFO_B" "$OUT_A" "$OUT_B" "$OUT_C" "$OUT_D"

echo
[ "$fail" = "0" ] && echo "concurrency: all checks passed" || echo "concurrency: FAILURES"
exit "$fail"
