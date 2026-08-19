-- ═══════════════════════════════════════════════════════════════════════════
-- BOOTSTRAP · super_admin ראשונה — הרצה ידנית, חד-פעמית, פרמטרית.
--
-- אינו רץ בשום login ואינו מוטמע בקוד. מזהים את המשתמשת לפי מייל מאומת
-- שכבר קיים ב-auth (email_confirmed_at אינו null). אם אין זהות כזאת —
-- עצירה, לא יצירה: קודם מתחברים פעם אחת עם Google, ואז מריצים.
--
-- שימוש ב-SQL Editor: החליפו את הערך של v_email בלבד, והריצו פעם אחת.
-- בטוח להרצה כפולה: ריצה שנייה מזהה שהתפקיד קיים ועושה כלום.
-- ═══════════════════════════════════════════════════════════════════════════
begin;

do $$
declare
  v_email constant text := 'orelman@gmail.com';   -- ← המייל של בעלת המערכת
  v_uid uuid;
  v_n int;
begin
  select count(*) into v_n from auth.users
   where lower(email) = lower(v_email) and email_confirmed_at is not null;
  if v_n = 0 then
    raise exception 'לא נמצא משתמש מאומת עם המייל הזה. יש להתחבר פעם אחת עם Google ואז להריץ שוב.';
  end if;
  if v_n > 1 then
    raise exception 'נמצאו % זהויות מאומתות לאותו מייל — נדרש טיפול ידני, לא bootstrap עיוור.', v_n;
  end if;

  select id into v_uid from auth.users
   where lower(email) = lower(v_email) and email_confirmed_at is not null;

  if exists (select 1 from public.user_roles where user_id = v_uid and role = 'super_admin') then
    raise notice 'super_admin כבר קיימת לזהות הזאת — כלום לא שונה.';
    return;
  end if;

  insert into public.user_roles (user_id, role) values (v_uid, 'super_admin');
  insert into public.role_audit (actor, target, action, before, after)
  values (v_uid, v_uid, 'bootstrap_super_admin', null,
          jsonb_build_object('via', 'manual parametric sql'));
  raise notice 'super_admin הוענקה לזהות המאומתת של %', v_email;
end $$;

commit;
