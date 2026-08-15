#!/usr/bin/env bash
# READ-ONLY export of the student roster + per-subject statuses, for the
# רמזור_למידה.xlsx reconciliation. Runs SELECTs only — no writes, no DDL.
# psql prompts for the DB password in YOUR terminal; nothing is stored.
# Output: ~/wingate-students-readonly.tsv  (+ per-subject statuses TSV)
set -euo pipefail

CONN="host=aws-0-eu-central-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.flfemffhswlpgpbvhuvy sslmode=require"
OUT1="$HOME/wingate-students-readonly.tsv"
OUT2="$HOME/wingate-subject-status-readonly.tsv"

# 1) roster: stable id + the three matching fields (no national_id, no PII beyond the name)
psql "$CONN" -v ON_ERROR_STOP=1 --no-psqlrc -P pager=off -A -F $'\t' -t \
  -c "select id, full_name, coalesce(class_name,''), coalesce(sport,''),
             coalesce(archived::text,'false')
        from public.students
       order by full_name;" > "$OUT1"

# 2) per-subject stored status (the cell-by-cell comparison target)
psql "$CONN" -v ON_ERROR_STOP=1 --no-psqlrc -P pager=off -A -F $'\t' -t \
  -c "select p.student_id, s.full_name, sub.subject_name,
             coalesce(p.status,''), coalesce(p.grade::text,'')
        from public.student_subject_progress p
        join public.students s on s.id = p.student_id
        join public.subjects sub on sub.id = p.subject_id
       order by s.full_name, sub.subject_name;" > "$OUT2"

echo "roster rows:          $(wc -l < "$OUT1")   → $OUT1"
echo "subject-status rows:  $(wc -l < "$OUT2")   → $OUT2"
