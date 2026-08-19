-- ═══════════════════════════════════════════════════════════════════
-- ACCESS CONTROL — local behavioural test. One transaction, rolled back.
-- ═══════════════════════════════════════════════════════════════════
begin;

create temporary table t_res (n int generated always as identity, ok boolean, label text);
grant insert, select on t_res to authenticated;
create or replace function pg_temp.note(b boolean, t text) returns void
language sql as $$ insert into t_res (ok,label) values ($1,$2); $$;

create temporary table ids (k text primary key, v uuid);
grant select on ids to authenticated;

do $$
declare
  v_super uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_teach uuid := gen_random_uuid();
  v_new   uuid := gen_random_uuid();
  v_new2  uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, created_at, updated_at)
  select u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
         u::text||'@t', now(), now(), now()
  from unnest(array[v_super,v_admin,v_teach,v_new,v_new2]) u;
  insert into public.user_roles (user_id, role) values (v_super,'super_admin') on conflict do nothing;
  insert into ids values ('super',v_super),('admin',v_admin),('teach',v_teach),('new',v_new),('new2',v_new2);
end $$;

-- helper
create or replace function pg_temp.as_user(p uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub',p,'role','authenticated')::text, true);
$$;

-- ── מייל לא מוכר: pending, בלי גישה, בלי הענקה עצמית ───────────────
do $$
declare v_new uuid; v_who jsonb;
begin
  select v into v_new from ids where k='new';
  perform pg_temp.as_user(v_new); set local role authenticated;
  v_who := public.whoami();
  perform pg_temp.note(v_who->>'status' = 'unknown', 'זר לפני בקשה: unknown');
  perform public.request_access('student', 'תלמידה חדשה');
  perform public.request_access('student', 'כפול');       -- אין כפילות
  v_who := public.whoami();
  perform pg_temp.note(v_who->>'status' = 'pending', 'אחרי בקשה: pending, בלי תוכן');
  begin
    perform public.grant_role((select v from ids where k='new'), 'admin');
    perform pg_temp.note(false, 'זר העניק לעצמו admin');
  exception when others then
    perform pg_temp.note(true, 'זר אינו יכול להעניק תפקיד: '||left(sqlerrm,32));
  end;
  reset role;
end $$;

do $$
declare v_n int;
begin
  select count(*) into v_n from public.access_requests where status='pending';
  perform pg_temp.note(v_n = 1, 'בקשה פתוחה אחת בלבד (הכפולה נבלעה)');
end $$;

-- ── super_admin מאשרת את הבקשה כתלמידה + שיוך ──────────────────────
do $$
declare v_super uuid; v_req uuid; v_who jsonb; v_new uuid;
begin
  select v into v_super from ids where k='super';
  select v into v_new from ids where k='new';
  select id into v_req from public.access_requests where status='pending';
  perform pg_temp.as_user(v_super); set local role authenticated;
  perform public.approve_access(v_req, 'student', 'תלמידת פיילוט', 'יא-1', null);
  perform public.approve_access(v_req, 'student', 'תלמידת פיילוט', 'יא-1', null); -- retry
  reset role;
  perform pg_temp.as_user(v_new); set local role authenticated;
  v_who := public.whoami();
  perform pg_temp.note(v_who->>'status' = 'active', 'אחרי אישור: active');
  perform pg_temp.note((v_who->'roles') ? 'student', 'קיבלה תפקיד student');
  perform pg_temp.note(v_who->>'linked_student_id' is not null, 'נוצר ושויך students record');
  reset role;
end $$;

do $$
declare v_n int;
begin
  select count(*) into v_n from public.user_roles
   where role='student' and user_id=(select v from ids where k='new');
  perform pg_temp.note(v_n = 1, 'retry לא הכפיל תפקיד');
  select count(*) into v_n from public.role_audit where action='access_approved';
  perform pg_temp.note(v_n = 1, 'retry לא הכפיל audit');
end $$;

-- ── admin: מקבל מרשאות מוגבלות ────────────────────────────────────
do $$
declare v_super uuid; v_admin uuid; v_teach uuid;
begin
  select v into v_super from ids where k='super';
  select v into v_admin from ids where k='admin';
  select v into v_teach from ids where k='teach';
  perform pg_temp.as_user(v_super); set local role authenticated;
  perform public.grant_role(v_admin, 'admin');
  reset role;

  perform pg_temp.as_user(v_admin); set local role authenticated;
  perform public.grant_role(v_teach, 'teacher');
  perform pg_temp.note(true, 'admin העניק teacher');
  begin
    perform public.grant_role(v_teach, 'admin');
    perform pg_temp.note(false, 'admin העניק admin');
  exception when others then
    perform pg_temp.note(true, 'admin אינו מעניק admin');
  end;
  begin
    perform public.grant_role(v_teach, 'super_admin');
    perform pg_temp.note(false, 'admin העניק super_admin');
  exception when others then
    perform pg_temp.note(true, 'admin אינו מעניק super_admin');
  end;
  begin
    perform public.grant_role((select v from ids where k='admin'), 'teacher');
    perform pg_temp.note(false, 'admin העניק לעצמו');
  exception when others then
    perform pg_temp.note(sqlerrm like '%cannot_self_grant%', 'אין הענקה עצמית גם ל-admin');
  end;
  reset role;
end $$;

-- ── שומרת האחרונה ─────────────────────────────────────────────────
do $$
declare v_super uuid; v_admin uuid;
begin
  select v into v_super from ids where k='super';
  select v into v_admin from ids where k='admin';
  perform pg_temp.as_user(v_super); set local role authenticated;
  begin
    perform public.revoke_role(v_super, 'super_admin');
    perform pg_temp.note(false, 'ה-super_admin האחרונה הוסרה');
  exception when others then
    perform pg_temp.note(sqlerrm like '%last_super_admin%', 'אי אפשר להסיר את האחרונה');
  end;
  reset role;
  -- גם admin לא יכול להשעות אותה
  perform pg_temp.as_user(v_admin); set local role authenticated;
  begin
    perform public.suspend_user(v_super, 'ניסיון');
    perform pg_temp.note(false, 'admin השעה super_admin');
  exception when others then
    perform pg_temp.note(true, 'admin אינו משעה super_admin');
  end;
  reset role;
end $$;

-- ── השעיה: מתועדת ומשתקפת ב-whoami ────────────────────────────────
do $$
declare v_super uuid; v_teach uuid; v_who jsonb;
begin
  select v into v_super from ids where k='super';
  select v into v_teach from ids where k='teach';
  perform pg_temp.as_user(v_super); set local role authenticated;
  begin
    perform public.suspend_user(v_teach, '   ');
    perform pg_temp.note(false, 'השעיה בלי נימוק');
  exception when others then
    perform pg_temp.note(sqlerrm like '%reason_required%', 'השעיה דורשת נימוק');
  end;
  perform public.suspend_user(v_teach, 'בדיקת התנהלות');
  reset role;
  perform pg_temp.as_user(v_teach); set local role authenticated;
  v_who := public.whoami();
  perform pg_temp.note(v_who->>'status' = 'suspended', 'מושעה רואה suspended');
  reset role;
  perform pg_temp.as_user(v_super); set local role authenticated;
  perform public.unsuspend_user(v_teach);
  reset role;
end $$;

-- ── דחייה + audit מלא ─────────────────────────────────────────────
do $$
declare v_super uuid; v_new2 uuid; v_req uuid; v_n int;
begin
  select v into v_super from ids where k='super';
  select v into v_new2 from ids where k='new2';
  perform pg_temp.as_user(v_new2); set local role authenticated;
  perform public.request_access('teacher', null);
  reset role;
  select id into v_req from public.access_requests
   where user_id=v_new2 and status='pending';
  perform pg_temp.as_user(v_super); set local role authenticated;
  perform public.reject_access(v_req, 'לא מזוהה');
  perform public.reject_access(v_req, 'לא מזוהה');   -- retry בטוח
  reset role;
  select count(*) into v_n from public.role_audit where action='access_rejected';
  perform pg_temp.note(v_n = 1, 'דחייה: audit אחד גם אחרי retry');
  select count(*) into v_n from public.role_audit
   where actor is not null and created_at is not null;
  perform pg_temp.note(v_n >= 5, 'audit רושם actor+זמן לכל פעולה ('||v_n||')');
  begin
    delete from public.role_audit;
    perform pg_temp.note(false, 'audit נמחק');
  exception when others then
    perform pg_temp.note(true, 'audit הוא append-only');
  end;
end $$;

-- ── RLS: מי רואה בקשות ו-audit ────────────────────────────────────
do $$
declare v_teach uuid; v_n int;
begin
  select v into v_teach from ids where k='teach';
  perform pg_temp.as_user(v_teach); set local role authenticated;
  select count(*) into v_n from public.access_requests;
  perform pg_temp.note(v_n = 0, 'מורה אינה רואה בקשות של אחרים');
  select count(*) into v_n from public.role_audit;
  perform pg_temp.note(v_n = 0, 'מורה אינה רואה audit');
  reset role;
end $$;


-- ── רשימות מסך הניהול: אדמינית רואה, זרה לא ────────────────────────
do $$
declare v_admin uuid; v_new2 uuid; c int;
begin
  select v into v_admin from ids where k='admin';
  select v into v_new2  from ids where k='new2';

  -- לזרה (בלי תפקיד) הרשימות ריקות — אין דליפת מיילים
  perform pg_temp.as_user(v_new2); set local role authenticated;
  select count(*) into c from public.admin_list_requests();
  perform pg_temp.note(c = 0, 'זרה: admin_list_requests ריק');
  select count(*) into c from public.admin_list_users();
  perform pg_temp.note(c = 0, 'זרה: admin_list_users ריק');

  -- לאדמינית יש שורות: הבקשה הממתינה מופיעה עם מייל, והמשתמשים עם תפקידים
  perform pg_temp.as_user(v_admin); set local role authenticated;
  -- בשלב הזה שתי הבקשות כבר הוכרעו (אחת אושרה, אחת נדחתה) — שתיהן
  -- מופיעות ברשימה עם מייל, כולל סטטוס ההכרעה
  select count(*) into c from public.admin_list_requests()
   where email is not null and status in ('approved','rejected');
  perform pg_temp.note(c = 2, 'אדמינית: שתי הבקשות שהוכרעו ברשימה, עם מייל');
  select count(*) into c from public.admin_list_users()
   where 'super_admin' = any(roles);
  perform pg_temp.note(c = 1, 'אדמינית: רואה בדיוק super_admin אחת');
  reset role;
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, label from t_res order by n;
do $$ declare f int; begin
  select count(*) into f from t_res where not ok;
  if f>0 then raise exception '% FAILED', f; end if;
  raise notice 'ALL % ACCESS CONTROL TESTS PASSED', (select count(*) from t_res);
end $$;
rollback;
