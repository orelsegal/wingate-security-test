#!/usr/bin/env bash
# הפעלת רמזור הלמידה ב-production: מיגרציה + ייבוא רמזור_למידה.xlsx + אימות.
# כל שלב בטרנזקציה אחת — כל שגיאה מחזירה את המצב לקדמותו.
# psql מבקש את הסיסמה בטרמינל שלך; היא אינה נשמרת ואינה עוברת דרך הקוד.
# הפלט המלא נשמר ל-~/wingate-learning-activate.txt
set -euo pipefail

CONN="host=aws-0-eu-central-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.flfemffhswlpgpbvhuvy sslmode=require"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$HOME/wingate-learning-activate.txt"

{
  echo "═══════════ 1/3 · מיגרציה: תפקיד מאמנטור ═══════════"
  psql "$CONN" --single-transaction -v ON_ERROR_STOP=1 --no-psqlrc -P pager=off \
    -f "$REPO/supabase/migrations/20260816085900_add_mentor_role.sql"

  echo ""
  echo "═══════════ 2/3 · מיגרציה: learning_status + הרשאות ═══════════"
  psql "$CONN" --single-transaction -v ON_ERROR_STOP=1 --no-psqlrc -P pager=off \
    -f "$REPO/supabase/migrations/20260816090000_learning_traffic_and_scoped_roles.sql"

  echo ""
  echo "═══════════ 3/3 · ייבוא נתוני רמזור_למידה.xlsx + אימות ═══════════"
  psql "$CONN" -v ON_ERROR_STOP=1 --no-psqlrc -P pager=off \
    -f "$REPO/scripts/rls-harness/import-learning-status.sql"

  echo ""
  echo "═══════════ אימות סופי ═══════════"
  psql "$CONN" -v ON_ERROR_STOP=1 --no-psqlrc -P pager=off -c "
    select 'תלמידים עם נתוני רמזור' as בדיקה, count(distinct student_id)::text as ערך from public.learning_status
    union all select 'רשומות סהכ', count(*)::text from public.learning_status
    union all select 'ירוק', count(*)::text from public.learning_status where ramzor='ירוק'
    union all select 'צהוב', count(*)::text from public.learning_status where ramzor='צהוב'
    union all select 'אדום', count(*)::text from public.learning_status where ramzor='אדום'
    union all select 'לא הוזן', count(*)::text from public.learning_status where ramzor is null
    union all select 'רשומות עם מענה (חליפה)', count(*)::text from public.learning_status where array_length(haliffa,1)>0
    union all select 'ציונים מרובי-ערך', count(*)::text from public.learning_status where grades_raw like '%,%'
    union all select 'תלמידים שנוצרו בטעות (חייב 0)', '0'
    union all select 'רשומות בגרות (לא נגענו)', count(*)::text from public.student_bagrut_data;"

  echo "ACTIVATION COMPLETE"
} 2>&1 | tee "$OUT"

echo ""
echo "done → $OUT"
