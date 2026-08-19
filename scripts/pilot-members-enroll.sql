-- ═══════════════════════════════════════════════════════════════════════════
-- PILOT MEMBERS · צירוף תלמידות לפיילוט · פרויקט flfemffhswlpgpbvhuvy
--
-- להריץ ב-SQL Editor אחרי ששתי חבילות ההתקנה רצו. פרמטרי: ממלאים את
-- רשימת השמות למטה ומריצים. בטוח להרצה כפולה (on conflict do nothing).
--
-- החברות היא שרתית בלבד — זה מה שמפעיל את שערי המסלול ב-larutz עבור
-- התלמידה. מי שאינה ברשימה ממשיכה בדיוק כפי שהיא היום (אין נעילה
-- רטרואקטיבית). הסרה מהפיילוט: delete from public.pilot_members where ...
-- (מותר — הטבלה אינה append-only — והתלמידה חוזרת להתנהגות הקיימת).
--
-- הזיהוי לפי (full_name, class_name) בטבלת students הקיימת. אם שם אינו
-- חד-משמעי הסקריפט עוצר עם שגיאה במקום לנחש.
-- ═══════════════════════════════════════════════════════════════════════════
begin;

do $do$
declare
  -- ── כאן ממלאים: שם מלא + כיתה, שורה לכל תלמידת פיילוט ──
  v_pilot constant text[][] := array[
    ['שם התלמידה כפי שהוא ב-students', 'יא-1']
    -- ,['שם נוסף', 'יא-2']
  ];
  v_row text[]; v_id uuid; v_n int;
begin
  if v_pilot[1][1] = 'שם התלמידה כפי שהוא ב-students' then
    raise exception 'יש למלא את רשימת התלמידות לפני ההרצה';
  end if;
  foreach v_row slice 1 in array v_pilot loop
    select count(*), (array_agg(s.id))[1] into v_n, v_id
    from public.students s
    where s.full_name = v_row[1] and s.class_name = v_row[2];
    if v_n = 0 then
      raise exception 'לא נמצאה תלמידה: % (%)', v_row[1], v_row[2];
    elsif v_n > 1 then
      raise exception 'שם לא חד-משמעי: % (%) — % שורות. יש לצרף לפי id ידנית.', v_row[1], v_row[2], v_n;
    end if;
    insert into public.pilot_members (student_id, note, added_by)
    values (v_id, 'פיילוט ספרות 30 · תחנה 5', auth.uid())
    on conflict (student_id) do nothing;
  end loop;
  raise notice 'צורפו/אושררו % תלמידות פיילוט', array_length(v_pilot, 1);
end $do$;

select count(*) as "חברות פיילוט כעת" from public.pilot_members;

commit;
