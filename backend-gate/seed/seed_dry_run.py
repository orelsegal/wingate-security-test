#!/usr/bin/env python3
"""
Seed · dry-run בלבד.

מפיק את המיפוי המלא של learning_tasks לתנ״ך ולאנגלית ומדפיס אותו, יחד עם
ה-SQL שהיה נכתב. הסקריפט אינו מתחבר למסד ואינו כותב דבר. כתיבה אמיתית
תתבצע רק בסקריפט נפרד, אחרי אישור המיפוי.

הרצה:
    python3 supabase/seed/seed_dry_run.py            # טבלה קריאה
    python3 supabase/seed/seed_dry_run.py --sql      # גם ה-SQL
"""
import json, os, re, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
TANAKH = os.path.join(HERE, '..', '..', 'src', 'data', 'units.json')
ENGLISH = os.path.expanduser('~/wingate-english-roadmap/app/src/data/content.json')

# ── תנ״ך ────────────────────────────────────────────────────────────────────
# מפתח יציב: מספר היחידה. הוא בא מכותרת המסמך של המורה ואינו תלוי בסדר קבצים.
# יעד אחד ליחידה, כי התוצר המוערך ביחידה הוא אחד (רגל 4 · כתיבה מנומקת).
# חמשת המהלכים הם מסכי לימוד ואינם יעדים נפרדים, אבל חומר נתלה על היחידה.
def tanakh_rows():
    units = json.load(open(TANAKH, encoding='utf-8'))
    rows = []
    for u in units:
        rows.append({
            'app': 'tanakh-30',
            'key': f"unit-{u['id']:02d}",
            'title': u['title'],
            'submits': True,          # לכל יחידה יש תוצר להגשה
            'note': u['scope'],
        })
    return rows

# ── אנגלית ──────────────────────────────────────────────────────────────────
# מפתח יציב: מזהה ה-Classroom שמופיע ב-sourceLink. הוא מזהה קנוני של המקור,
# ואינו תלוי במיקום התחנה ברשימה. אומת: 82 מתוך 82 תחנות נושאות מזהה, וכולם
# ייחודיים. מיקום ברשימה נדחה בכוונה, כי שינוי סדר ב-Classroom היה מייחס
# חומר או הגשה לתחנה הלא נכונה.
CLASSROOM_RE = re.compile(r'/c/([^/]+)/([am])/([^/?#]+)')

def english_rows():
    data = json.load(open(ENGLISH, encoding='utf-8'))
    rows, seen = [], {}
    for track in data['tracks']:
        for ui, unit in enumerate(track['units']):
            for si, st in enumerate(unit['stations']):
                m = CLASSROOM_RE.search(st.get('sourceLink') or '')
                if not m:
                    rows.append({'app': 'english-roadmap', 'key': None,
                                 'title': st['title'].split('\n')[0][:120],
                                 'submits': st.get('role') == 'הגשה',
                                 'note': f"NO STABLE ID · {track['id']}.{ui}.{si}"})
                    continue
                key = f"cr-{m.group(3)}"
                if key in seen:
                    rows.append({'app': 'english-roadmap', 'key': key,
                                 'title': st['title'].split('\n')[0][:120],
                                 'submits': st.get('role') == 'הגשה',
                                 'note': f"DUPLICATE of {seen[key]}"})
                    continue
                seen[key] = f"{track['id']}.{ui}.{si}"
                rows.append({
                    'app': 'english-roadmap',
                    'key': key,
                    'title': st['title'].split('\n')[0][:120],
                    'submits': st.get('role') == 'הגשה',
                    'note': f"{track['id']} · {unit['name'][:34]} · role={st.get('role')} · old-route={track['id']}.{ui}.{si}",
                })
    return rows

def main():
    show_sql = '--sql' in sys.argv
    t, e = tanakh_rows(), english_rows()

    print('=' * 78)
    print('SEED DRY RUN · שום דבר לא נכתב')
    print('=' * 78)

    for name, rows in (('תנ״ך · tanakh-30', t), ('אנגלית · english-roadmap', e)):
        subs = sum(1 for r in rows if r['submits'])
        print(f"\n### {name}: {len(rows)} יעדים · {subs} מהם submission-enabled\n")
        print(f"{'external_key':<22} {'submit':<7} title / note")
        print('-' * 78)
        for r in rows:
            k = r['key'] or '(NO KEY)'
            print(f"{k:<22} {'yes' if r['submits'] else 'no':<7} {r['title'][:46]}")
            print(f"{'':<30} {r['note'][:60]}")

    problems = [r for r in t + e if not r['key'] or 'DUPLICATE' in r['note']]
    print('\n' + '=' * 78)
    print(f"סה״כ יעדים: {len(t) + len(e)}  ·  submission-enabled: "
          f"{sum(1 for r in t + e if r['submits'])}")
    print(f"בעיות מפתח: {len(problems)}")
    for p in problems:
        print('  !', p['title'][:50], '·', p['note'][:50])

    print("""
מה הסקריפט האמיתי יעשה, ורק אחרי אישור המיפוי הזה:

  • subject_id: לא חיפוש עמום. הסקריפט יקבל מזהה מקצוע קנוני שאומת ב-preflight.
    אפס התאמות או יותר מאחת עוצרות את כל הטרנזקציה.
  • id: gen_random_uuid() של המסד. אין UUID מומצא בקובץ.
  • rubric: null. אין מחוון מומצא.
  • התנגשות: לא ON CONFLICT DO NOTHING עיוור. לכל שורה קיימת נבדק אם
    subject_id, title ו-external_app זהים למיפוי המאושר. זהה = no-op.
    שונה = עצירה עם mismatch מפורט, בלי לשמור בשקט שורה ישנה.
  • הכול בטרנזקציה אחת.

Rollback: רק שורות שנוצרו באותה הרצה, ורק אם אין להן אף תלות ב-submissions,
submission_versions, task_drafts או task_materials. אחרי תחילת שימוש אין
מחיקה: מסמנים active=false ומשאירים את הרשומה.
""")

    if show_sql:
        print('=' * 78)
        print('-- SQL שהיה מורץ · לא הורץ')
        print('=' * 78)
        print("-- \\set subject_tanakh '<uuid מאומת ב-preflight>'")
        print("-- \\set subject_english '<uuid מאומת ב-preflight>'")
        print('begin;')
        for r in t + e:
            if not r['key']:
                print(f"-- דילוג · אין מפתח יציב · {r['title'][:40]}")
                continue
            title = r['title'].replace("'", "''")
            var = 'subject_tanakh' if r['app'] == 'tanakh-30' else 'subject_english'
            print(f"insert into public.learning_tasks (subject_id, external_app, external_key, title, active)")
            print(f"values (:'{var}', '{r['app']}', '{r['key']}', '{title}', true)")
            print(f"on conflict (external_app, external_key) do nothing;")
        print('-- אימות לפני commit:')
        print("select external_app, count(*) from public.learning_tasks")
        print(" where external_app in ('tanakh-30','english-roadmap') group by 1;")
        print('rollback;  -- commit רק אחרי שהספירות תואמות')

if __name__ == '__main__':
    main()
