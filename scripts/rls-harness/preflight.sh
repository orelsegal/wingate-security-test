#!/usr/bin/env bash
# READ-ONLY preflight for migration 20260815100000_narrow_rls_hardening.sql.
# Runs only SELECT queries against the live DB. No PII is selected — counts only.
# Run this yourself; psql prompts for the DB password in YOUR terminal.
# Output is written to ~/wingate-preflight-output.txt for review.
set -euo pipefail

CONN="host=aws-0-eu-central-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.flfemffhswlpgpbvhuvy sslmode=require"
OUT="$HOME/wingate-preflight-output.txt"

psql "$CONN" -v ON_ERROR_STOP=1 --no-psqlrc -P pager=off <<'SQL' | tee "$OUT"
\echo ═══ 1. project / database identity ═══
select current_database() as db, current_user as connected_as, version() as pg_version;

\echo ═══ 2. profiles: UPDATE policies (current definitions) ═══
select policyname, cmd, qual, with_check
from pg_policies where schemaname='public' and tablename='profiles'
order by policyname;

\echo ═══ 3. triggers currently on profiles ═══
select t.tgname, p.proname as function, t.tgenabled
from pg_trigger t join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.profiles'::regclass and not t.tgisinternal
order by t.tgname;

\echo ═══ 4. student_roadmap_progress: all policies ═══
select policyname, cmd from pg_policies
where schemaname='public' and tablename='student_roadmap_progress'
order by policyname;

\echo ═══ 5. student_custom_values: all policies ═══
select policyname, cmd from pg_policies
where schemaname='public' and tablename='student_custom_values'
order by policyname;

\echo ═══ 6. required helper functions present ═══
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in ('has_role','is_teacher_of_student','claim_pending_invite')
order by proname;

\echo ═══ 7. is 20260815100000 already recorded or applied? ═══
select exists (select 1 from information_schema.tables
  where table_schema='supabase_migrations' and table_name='schema_migrations') as has_migrations_table;
select exists (select 1 from pg_trigger
  where tgname='protect_profile_link_columns'
    and tgrelid='public.profiles'::regclass) as guard_trigger_already_exists;
select count(*) as new_scoped_policies_already_present from pg_policies
where policyname in ('Teachers view their group roadmap progress',
                     'Teachers view their group custom values');

\echo ═══ 8. data counts only (no PII) ═══
select
  (select count(*) from public.students)                 as students,
  (select count(*) from public.profiles)                 as profiles,
  (select count(*) from public.student_roadmap_progress) as roadmap_rows,
  (select count(*) from public.student_custom_values)    as custom_value_rows,
  (select count(*) from public.pending_invites)          as pending_invites;
select role, count(*) from public.user_roles group by role order by role;
SQL

echo ""
echo "preflight complete → $OUT"
