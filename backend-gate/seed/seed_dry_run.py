#!/usr/bin/env python3
"""
Seed · dry-run בלבד. שום דבר לא נכתב.

reproducible: המקורות מגיעים כארגומנטים מפורשים או מ-manifest חתום, בלי שום
תלות בנתיב ביתי או בריפו חיצוני לא מתועד.

    python3 seed_dry_run.py --tanakh <units.json> --english <content.json> \
        [--write-manifest manifest.json] [--sql]
    python3 seed_dry_run.py --from-manifest manifest.json [--sql]

המיפוי:
  תנ״ך: יעד לכל מהלך של כל יחידה (unit-NN-move-X). המורה מצרפת חומר למהלך
        מסוים, ולכן כל מהלך הוא נקודת שיוך. יעד הגשה = המהלך שמכיל את בלוק
        "תוצרי הגשה" במקור (בפועל: מהלך ה בכל תשע היחידות; זה נגזר ומוכח,
        לא מונח).
  אנגלית: יעד לכל אחת מ-82 התחנות, במפתח מזהה ה-Classroom היציב מ-sourceLink.
        submission_enabled לפי role=הגשה במקור, ובנוסף פוסטר COBE, ראו
        DECISION מטה.

DECISION · תוצר מסכם (COBE podcast/poster): כותרת היחידה במקור היא
"תוצר סופי🏆הגשה והסברים {בחרו באחת משתי האפשרויות}". לשון המורה עצמה
קובעת ששתי האפשרויות הן חלופות לאותו תוצר, ולכן שתיהן submission_enabled,
למרות ש-role_of סיווג את הפוסטר "תרגול" (אין בהוראותיו מילת הגשה). מודל
הניווט מציג שתי תחנות נפרדות, ולכן הן שני יעדים שקולים ולא יעד אחד.
"""
import argparse, hashlib, json, os, re, sys

CLASSROOM_RE = re.compile(r'/c/([^/]+)/([am])/([^/?#]+)')
SUBMIT_BLOCK = 'תוצרי הגשה'
FINAL_UNIT_MARK = 'בחרו באחת משתי האפשרויות'

def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()

def tanakh_rows(units):
    rows = []
    for u in units:
        for i, mv in enumerate(u['moves'], start=1):
            # יעד הגשה נגזר מהמקור: המהלך שמכיל בלוק "תוצרי הגשה".
            submits = any(b['heading'].startswith(SUBMIT_BLOCK) for b in mv['blocks'])
            rows.append({
                'app': 'tanakh-30',
                'key': f"unit-{u['id']:02d}-move-{mv['letter']}",
                'title': f"{u['title']} · מהלך {mv['letter']} · {mv['name']}",
                'submits': submits,
                'group': f"unit-{u['id']:02d}",
                'note': f"מהלך {i}/{len(u['moves'])}",
            })
    return rows

def english_rows(data):
    rows, seen, problems = [], {}, []
    for track in data['tracks']:
        for ui, unit in enumerate(track['units']):
            unit_is_final_choice = FINAL_UNIT_MARK in (unit.get('name') or '')
            for si, st in enumerate(unit['stations']):
                m = CLASSROOM_RE.search(st.get('sourceLink') or '')
                if not m:
                    problems.append(f"NO STABLE ID: {track['id']}.{ui}.{si} · {st['title'][:40]}")
                    continue
                key = f"cr-{m.group(3)}"
                if key in seen:
                    problems.append(f"DUPLICATE {key}: {seen[key]} and {track['id']}.{ui}.{si}")
                    continue
                seen[key] = f"{track['id']}.{ui}.{si}"
                submits = st.get('role') == 'הגשה'
                note = f"role={st.get('role')}"
                # DECISION: ביחידת הבחירה של התוצר המסכם, כל תחנת Option היא יעד הגשה.
                if unit_is_final_choice and (st['title'] or '').strip().startswith('Option'):
                    if not submits:
                        note += ' · submission_enabled per the choose-one unit title'
                    submits = True
                rows.append({
                    'app': 'english-roadmap',
                    'key': key,
                    'title': st['title'].split('\n')[0][:120],
                    'submits': submits,
                    'group': track['id'],
                    'note': note + f" · old-route={track['id']}.{ui}.{si}",
                })
    return rows, problems

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--tanakh')
    ap.add_argument('--english')
    ap.add_argument('--from-manifest')
    ap.add_argument('--write-manifest')
    ap.add_argument('--sql', action='store_true')
    a = ap.parse_args()

    if a.from_manifest:
        man = json.load(open(a.from_manifest, encoding='utf-8'))
        rows, problems = man['rows'], man.get('problems', [])
        sources = man['sources']
    else:
        if not (a.tanakh and a.english):
            sys.exit('either --from-manifest, or both --tanakh and --english')
        units = json.load(open(a.tanakh, encoding='utf-8'))
        data = json.load(open(a.english, encoding='utf-8'))
        t = tanakh_rows(units)
        e, problems = english_rows(data)
        rows = t + e
        sources = {
            'tanakh': {'path': os.path.abspath(a.tanakh), 'sha256': sha256(a.tanakh)},
            'english': {'path': os.path.abspath(a.english), 'sha256': sha256(a.english)},
        }
        if a.write_manifest:
            json.dump({'sources': sources, 'rows': rows, 'problems': problems},
                      open(a.write_manifest, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            print(f"manifest written: {a.write_manifest}")

    print('=' * 74)
    print('SEED DRY RUN · שום דבר לא נכתב')
    for k, v in sources.items():
        print(f"  source {k}: sha256={v['sha256'][:16]}…")
    print('=' * 74)

    # ספירות מוכחות מהמקור, לא מונחות
    from collections import Counter
    for app in ('tanakh-30', 'english-roadmap'):
        sub = [r for r in rows if r['app'] == app]
        groups = Counter(r['group'] for r in sub)
        subs = Counter(r['group'] for r in sub if r['submits'])
        print(f"\n### {app}: {len(sub)} יעדים · {sum(1 for r in sub if r['submits'])} submission-enabled")
        for g in sorted(groups):
            print(f"  {g:<12} targets={groups[g]:<3} submission={subs.get(g, 0)}")

    print(f"\nסה\"כ: {len(rows)} יעדים · {sum(1 for r in rows if r['submits'])} הגשה · בעיות: {len(problems)}")
    for p in problems:
        print('  !', p)

    if a.sql:
        print('\n-- SQL שהיה מורץ · לא הורץ. subject ids מגיעים מאומתים מה-preflight.')
        print('begin;')
        for r in rows:
            title = r['title'].replace("'", "''")
            var = 'subject_tanakh' if r['app'] == 'tanakh-30' else 'subject_english'
            print(f"select app_seed_upsert(:'{var}', '{r['app']}', '{r['key']}', '{title}', {str(r['submits']).lower()});")
        print('rollback;  -- commit רק אחרי אימות הספירות')
        print("""
-- app_seed_upsert (יסופק בסקריפט האמיתי) אינו ON CONFLICT DO NOTHING עיוור:
--   שורה קיימת זהה (subject, title, app, submission_enabled) = no-op.
--   שורה קיימת שונה = raise seed_mismatch עם הפירוט, והטרנזקציה כולה נעצרת.""")

if __name__ == '__main__':
    main()
