#!/usr/bin/env bash
# PRODUCTION apply + verify for 20260815100000_narrow_rls_hardening.sql.
# Two psql sessions (password prompted in YOUR terminal each time):
#   1. atomic apply:  --single-transaction -v ON_ERROR_STOP=1  (any error = full rollback)
#   2. read-only post-checks + live permission QA (impersonates the QA accounts
#      inside a BEGIN..ROLLBACK transaction — nothing persists, no PII printed)
# Full output → ~/wingate-apply-output.txt
set -euo pipefail

CONN="host=aws-0-eu-central-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.flfemffhswlpgpbvhuvy sslmode=require"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$HOME/wingate-apply-output.txt"

{
  echo "═══════════ STEP 1 · ATOMIC APPLY (single transaction) ═══════════"
  psql "$CONN" --single-transaction -v ON_ERROR_STOP=1 --no-psqlrc -P pager=off \
    -f "$REPO/supabase/migrations/20260815100000_narrow_rls_hardening.sql"
  echo "APPLY: COMMITTED CLEANLY"

  echo ""
  echo "═══════════ STEP 2 · POST-CHECKS + LIVE PERMISSION QA ═══════════"
  psql "$CONN" -v ON_ERROR_STOP=1 --no-psqlrc -P pager=off \
    -c "select tgname, tgenabled from pg_trigger where tgname='protect_profile_link_columns' and tgrelid='public.profiles'::regclass;
        select policyname, cmd from pg_policies where tablename in ('student_roadmap_progress','student_custom_values') and policyname like 'Teachers%' order by tablename, policyname;
        select policyname, with_check is not null as has_with_check from pg_policies where tablename='profiles' and policyname='Users can update own profile';" \
    -f "$REPO/scripts/rls-harness/live-qa.sql"
  echo "VERIFY: COMPLETE"
} 2>&1 | tee "$OUT"

echo ""
echo "done → $OUT"
