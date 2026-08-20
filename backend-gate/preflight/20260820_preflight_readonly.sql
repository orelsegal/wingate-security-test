-- ─────────────────────────────────────────────────────────────────────────────
-- Preflight · קריאה בלבד · Production
--
-- הדבקה ב-SQL Editor של Supabase. אין בקובץ INSERT, UPDATE, DELETE, CREATE,
-- ALTER, DROP, GRANT או REVOKE, ואין בו מידע אישי: רק מבנה, הרשאות וספירות.
--
-- כל שורה היא בדיקה עם מסקנה: OK, CONFLICT, MISMATCH, MISSING או BASELINE.
-- CONFLICT או MISMATCH = לא להחיל עד בירור.
-- ─────────────────────────────────────────────────────────────────────────────

with
-- ── 1 · שמות שעומדים להיווצר ──────────────────────────────────────────────
name_clash as (
  select 'table: ' || t.name as item,
         case when to_regclass('public.' || t.name) is null then 'OK · free'
              else 'CONFLICT · already exists' end as verdict
  from (values ('task_drafts'),('task_materials'),('task_material_revisions'),
               ('group_join_codes'),('access_request_groups'),('join_code_attempts')) as t(name)
),

-- חתימה מדויקת, לא רק שם. ההשוואה היא על טיפוסי הקלט בלבד
-- (oidvectortypes), בלי שמות פרמטרים, כדי ששם כמו p_task לא ייצור
-- MISMATCH מדומה.
func_clash as (
  select 'function: ' || f.name || '(' || f.args || ')' as item,
         case
           when not exists (
             select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.proname=f.name
           ) then 'OK · free'
           when exists (
             select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.proname=f.name
               and replace(oidvectortypes(p.proargtypes), 'public.', '') = f.args
           ) then 'CONFLICT · same signature already exists'
           else 'MISMATCH · a different signature of this name exists: ' ||
                (select string_agg(replace(oidvectortypes(p.proargtypes), 'public.', ''), ' | ')
                   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='public' and p.proname=f.name)
         end as verdict
  from (values
    ('save_task_draft','uuid, jsonb, bigint'),
    ('get_task_draft','uuid'),
    ('app_student_in_task_scope','uuid, uuid'),
    ('app_draft_block_reason','uuid, uuid'),
    ('app_draft_max_bytes',''),
    ('create_task_material','uuid, uuid, text, text, text, text'),
    ('update_task_material_meta','uuid, text, text'),
    ('move_task_material','uuid, uuid, uuid'),
    ('request_material_replacement','uuid'),
    ('finalize_task_material','uuid, text'),
    ('set_material_state','uuid, material_state'),
    ('app_can_manage_group_materials','uuid'),
    ('app_student_sees_material','uuid'),
    ('create_group_join_code','uuid, integer'),
    ('revoke_group_join_code','uuid'),
    ('redeem_group_join_code','text'),
    ('approve_group_join','uuid, text, text'),
    ('app_actor_not_suspended',''),
    ('app_is_active_group_teacher','uuid')
  ) as f(name, args)
),

type_clash as (
  select 'type: material_state' as item,
         case when to_regtype('public.material_state') is null then 'OK · free'
              else 'CONFLICT · already exists · values: ' ||
                   (select string_agg(enumlabel, ',' order by enumsortorder)
                      from pg_enum where enumtypid = to_regtype('public.material_state'))
         end as verdict
),

-- ── 2 · Storage ───────────────────────────────────────────────────────────
storage_state as (
  select 'storage: schema' as item,
         case when to_regclass('storage.objects') is null then 'MISSING · migration will stop'
              else 'OK · present' end as verdict
  union all
  select 'storage: bucket task-materials',
    case
      when to_regclass('storage.buckets') is null then 'MISSING · no storage schema'
      when (xpath('/row/c/text()', query_to_xml(
             'select count(*) as c from storage.buckets where id=''task-materials''',
             false,true,'')))[1]::text::int = 0 then 'OK · free'
      else 'CONFLICT · exists · ' ||
           coalesce((xpath('/row/d/text()', query_to_xml(
             $qq$select 'public=' || public
                      || ' limit=' || coalesce(file_size_limit::text, 'none')
                      || ' mimes=' || coalesce(array_to_string(allowed_mime_types, ','), 'any') as d
                  from storage.buckets where id = 'task-materials'$qq$,
             false, true, '')))[1]::text, 'unreadable')
    end
  union all
  select 'storage: existing policies on objects',
    case when to_regclass('storage.objects') is null then 'MISSING · no storage schema'
         else coalesce((xpath('/row/d/text()', query_to_xml(
           $qq$select coalesce(string_agg(policyname || '/' || cmd, ', ' order by policyname), 'none') as d
                 from pg_policies where schemaname = 'storage' and tablename = 'objects'$qq$,
           false, true, '')))[1]::text, 'none') || ' · BASELINE'
    end
  union all
  select 'storage: grants on objects',
    case when to_regclass('storage.objects') is null then 'MISSING · no storage schema'
         else coalesce((xpath('/row/d/text()', query_to_xml(
           $qq$select coalesce(string_agg(distinct grantee || ':' || privilege_type, ', '), 'none') as d
                 from information_schema.role_table_grants
                where table_schema = 'storage' and table_name = 'objects'
                  and grantee in ('anon', 'authenticated', 'PUBLIC')$qq$,
           false, true, '')))[1]::text, 'none') || ' · BASELINE'
    end
),

-- ── 3 · היסטוריית migrations ──────────────────────────────────────────────
migration_clash as (
  select 'migration ' || m.v as item,
         case
           when to_regclass('supabase_migrations.schema_migrations') is null
             then 'MISSING · no migration history table'
           when (xpath('/row/c/text()', query_to_xml(
                  format('select count(*) as c from supabase_migrations.schema_migrations where version = %L', m.v),
                  false,true,'')))[1]::text::int > 0
             then 'CONFLICT · version already applied'
           else 'OK · not applied'
         end as verdict
  from (values ('20260820120000'),('20260820120100'),('20260820120200'),('20260820120300')) as m(v)
),

-- migration חלקית: חלק מהאובייקטים קיימים וחלק לא
partial as (
  select 'partial install check' as item,
         case
           when cnt = 0 then 'OK · nothing installed yet'
           when cnt = 6 then 'CONFLICT · all six tables already exist'
           else 'MISMATCH · partially installed · ' || cnt::text || ' of 6 tables exist'
         end as verdict
  from (select count(*) as cnt from (values
          ('task_drafts'),('task_materials'),('task_material_revisions'),
          ('group_join_codes'),('access_request_groups'),('join_code_attempts')) as t(n)
        where to_regclass('public.' || t.n) is not null) x
),

-- ── 4 · תלויות ────────────────────────────────────────────────────────────
deps as (
  select 'dependency: ' || d.name as item,
         case when to_regclass('public.' || d.name) is null
              then 'MISSING · required by the new code'
              else 'OK · present' end as verdict
  from (values ('learning_tasks'),('students'),('subjects'),('learning_groups'),
               ('learning_group_teachers'),('learning_group_students'),
               ('submissions'),('submission_versions'),('profiles'),
               ('access_requests'),('user_roles'),('role_audit')) as d(name)
),

-- ── 5 · עמודות · udt_name כדי לא לסמן enum כשגיאה ─────────────────────────
cols as (
  select 'column: ' || c.tbl || '.' || c.col as item,
         coalesce(
           (select case when udt_name = c.want then 'OK · ' || udt_name
                        else 'MISMATCH · expected ' || c.want || ', found ' || udt_name || ' (' || data_type || ')' end
              from information_schema.columns
             where table_schema='public' and table_name=c.tbl and column_name=c.col),
           'MISSING · column not found') as verdict
  from (values
    ('learning_tasks','id','uuid'), ('learning_tasks','subject_id','uuid'),
    ('learning_tasks','active','bool'), ('learning_tasks','external_app','text'),
    ('learning_tasks','external_key','text'),
    ('students','id','uuid'),
    ('learning_groups','subject_id','uuid'), ('learning_groups','status','text'),
    ('learning_group_teachers','teacher_user_id','uuid'),
    ('learning_group_teachers','group_id','uuid'),
    ('learning_group_teachers','left_at','timestamptz'),
    ('learning_group_students','student_id','uuid'),
    ('learning_group_students','group_id','uuid'),
    ('learning_group_students','left_at','timestamptz'),
    ('submissions','status','submission_status'),
    ('access_requests','requested_role','app_role'),
    ('access_requests','status','access_request_status'),
    ('profiles','linked_student_id','uuid')
  ) as c(tbl,col,want)
),

-- learning_groups.status עשוי להיות enum בסביבה אחרת: מציג את הערכים בפועל
group_status_values as (
  select 'learning_groups.status values in use' as item,
         coalesce((xpath('/row/d/text()', query_to_xml(
           $qq$select coalesce(string_agg(distinct status, ', '), 'none') as d
                 from public.learning_groups$qq$,
           false, true, '')))[1]::text, 'none') || ' · BASELINE' as verdict
),

-- ── 6 · ערכי submission status ────────────────────────────────────────────
sub_status as (
  select 'submission_status enum values' as item,
         coalesce((select string_agg(enumlabel, ' | ' order by enumsortorder)
                     from pg_enum where enumtypid = to_regtype('public.submission_status')),
                  'MISSING') ||
         case when (select string_agg(enumlabel, ',' order by enumlabel)
                      from pg_enum where enumtypid = to_regtype('public.submission_status'))
                   = 'approved,awaiting_review,resubmitted_awaiting,returned_for_revision,submitted'
              then ' · OK · matches the matrix in the migration'
              else ' · MISMATCH · the draft matrix must be revisited' end as verdict
),

-- ── 6ב · ערכי enum מדויקים ────────────────────────────────────────────────
enum_exact as (
  select 'enum ' || e.tname || ' exact values' as item,
         coalesce((select string_agg(enumlabel, ' | ' order by enumsortorder)
                     from pg_enum where enumtypid = to_regtype('public.' || e.tname)),
                  'MISSING') ||
         case
           when to_regtype('public.' || e.tname) is null then ''
           when (select string_agg(enumlabel, ',' order by enumlabel)
                   from pg_enum where enumtypid = to_regtype('public.' || e.tname)) = e.want
             then ' · OK'
           else ' · MISMATCH · expected: ' || e.want
         end as verdict
  from (values
    ('submission_status', 'approved,awaiting_review,resubmitted_awaiting,returned_for_revision,submitted'),
    ('access_request_status', 'approved,pending,rejected')
  ) as e(tname, want)
),

-- ── 6ג · עמודת שומר ההגשה ותאימות ספרות 30 · קריאה בלבד ──────────────────
lit30_compat as (
  select 'submission_enabled column on learning_tasks' as item,
         case when exists (select 1 from information_schema.columns
                           where table_name='learning_tasks' and column_name='submission_enabled')
              then 'CONFLICT · already exists (partial install?)'
              else 'OK · will be added with default true' end as verdict
  union all
  -- כמה תלמידות עם הגשה קיימת אינן רשומות פעילות בקבוצה פעילה של מקצוע
  -- המשימה. יותר מאפס = לא להחיל את migration 4 עד שהשיוכים מוסדרים.
  select 'lit30 compat: submitters not enrolled in an active group of the task subject',
         (select count(distinct s.student_id)
            from public.submissions s
            join public.learning_tasks lt on lt.id = s.task_id
           where not exists (
             select 1 from public.learning_group_students lgs
             join public.learning_groups lg on lg.id = lgs.group_id
             where lgs.student_id = s.student_id
               and lgs.left_at is null
               and lg.status = 'active'
               and lg.subject_id = lt.subject_id
           ))::text || ' students · must be 0 before applying migration 4'
),

-- ── 7 · helpers · חתימה מדויקת ────────────────────────────────────────────
helpers as (
  select 'helper: ' || h.name || '(' || h.args || ')' as item,
         case when exists (
           select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname=h.name
             and replace(oidvectortypes(p.proargtypes), 'public.', '') = h.args
         ) then 'OK · present'
         when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                      where n.nspname='public' and p.proname=h.name)
           then 'MISMATCH · exists with a different signature: ' ||
                (select string_agg(replace(oidvectortypes(p.proargtypes), 'public.', ''),' | ')
                   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                  where n.nspname='public' and p.proname=h.name)
         else 'MISSING · the new code depends on it' end as verdict
  from (values
    ('app_current_student_id',''), ('has_role','uuid, app_role'),
    ('submit_task','uuid, jsonb, text'), ('resubmit','uuid, jsonb, text'),
    ('return_for_revision','uuid, text, text'),
    ('app_audit','uuid, uuid, text, jsonb, jsonb')
  ) as h(name, args)
),

-- ── 8 · אילוץ הייחודיות שה-seed נשען עליו ────────────────────────────────
uniq as (
  select 'unique (external_app, external_key) on learning_tasks' as item,
         coalesce((select 'OK · ' || conname from pg_constraint
                    where conrelid='public.learning_tasks'::regclass and contype='u'
                      and pg_get_constraintdef(oid) ilike '%external_app%external_key%' limit 1),
                  'MISSING · the seed cannot be idempotent without it') as verdict
),

-- ── 9 · הרשאות לפני ההחלה ─────────────────────────────────────────────────
grants_before as (
  select 'grants ' || table_name || ' → ' || grantee || ': ' ||
         string_agg(privilege_type, ',' order by privilege_type) as item,
         'BASELINE' as verdict
  from information_schema.role_table_grants
  where table_schema='public'
    and table_name in ('learning_tasks','submissions','submission_versions',
                       'access_requests','learning_group_students')
    and grantee in ('anon','authenticated','PUBLIC')
  group by table_name, grantee
),

rls as (
  select 'rls on ' || tablename as item,
         case when rowsecurity then 'OK · enabled' else 'CONFLICT · disabled' end as verdict
  from pg_tables
  where schemaname='public'
    and tablename in ('learning_tasks','submissions','submission_versions','profiles',
                      'access_requests','learning_group_students','learning_group_teachers')
),

-- ── 10 · היקף · ספירות בלבד ───────────────────────────────────────────────
scale as (
  select 'scale: active learning_tasks' as item, count(*)::text || ' rows · BASELINE' as verdict
    from public.learning_tasks where active
  union all
  select 'scale: learning_tasks by external_app',
         coalesce(string_agg(external_app || '=' || n::text, ', ' order by external_app), 'none') || ' · BASELINE'
    from (select external_app, count(*) n from public.learning_tasks group by external_app) x
  union all
  select 'scale: existing submissions', count(*)::text || ' rows · BASELINE' from public.submissions
  union all
  select 'scale: active groups', count(*)::text || ' rows · BASELINE'
    from public.learning_groups where status = 'active'
  union all
  select 'scale: active student memberships', count(*)::text || ' rows · BASELINE'
    from public.learning_group_students where left_at is null
  union all
  select 'scale: active teacher assignments', count(*)::text || ' rows · BASELINE'
    from public.learning_group_teachers where left_at is null
)

select item, verdict
from (
  select item, verdict from name_clash
  union all select item, verdict from func_clash
  union all select item, verdict from type_clash
  union all select item, verdict from storage_state
  union all select item, verdict from migration_clash
  union all select item, verdict from partial
  union all select item, verdict from deps
  union all select item, verdict from cols
  union all select item, verdict from group_status_values
  union all select item, verdict from sub_status
  union all select item, verdict from enum_exact
  union all select item, verdict from lit30_compat
  union all select item, verdict from helpers
  union all select item, verdict from uniq
  union all select item, verdict from grants_before
  union all select item, verdict from rls
  union all select item, verdict from scale
) all_checks
order by
  case
    when verdict like 'CONFLICT%' then 1
    when verdict like 'MISMATCH%' then 2
    when verdict like 'MISSING%'  then 3
    when verdict like '%BASELINE' then 5
    else 4
  end, item;
