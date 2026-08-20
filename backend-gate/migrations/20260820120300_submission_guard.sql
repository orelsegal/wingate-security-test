-- ─────────────────────────────────────────────────────────────────────────────
-- שומר הגשה · additive על הטבלה, עדכון מוצהר לשתי פונקציות קיימות
--
-- הפער: אחרי ה-seed יהיו 91 יעדי learning_tasks אך רק 32 מהם יעדי הגשה.
-- submit_task הקיים מאפשר הגשה לכל משימה פעילה, בלי הבחנה ובלי בדיקת היקף.
-- הסתרת כפתור באפליקציה אינה אכיפה.
--
-- הצהרה מפורשת: הקובץ הזה מעדכן את submit_task ואת resubmit. גוף הפונקציות
-- המקורי (idempotency, נעילות, מעברי מצב, אירועי לוג) נשמר אחד לאחד; נוספו
-- שלוש בדיקות בפתיחה: משתמש לא מושעה, submission_enabled, והיקף פעיל.
-- שום פונקציה אחרת לא השתנתה.
--
-- תאימות לספרות 30: ברירת המחדל של submission_enabled היא true, ולכן
-- literature-30/station-5 הקיימת נשארת מאופשרת בלי backfill. בדיקת ההיקף
-- דורשת שהתלמידה רשומה פעילה בקבוצה פעילה של המקצוע: זה החוזה הקיים של
-- הפלטפורמה. ה-preflight כולל בדיקת קריאה שמוודאת מול Production, לפני
-- ההחלה, שאין תלמידת ספרות 30 עם הגשה שאינה רשומה לקבוצה פעילה. אם הבדיקה
-- מחזירה יותר מאפס, לא מחילים עד שהשיוכים מוסדרים.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.learning_tasks
  add column if not exists submission_enabled boolean not null default true;

comment on column public.learning_tasks.submission_enabled is
  'true = יעד הגשה; false = יעד תוכן בלבד (חומרים וטיוטות, בלי submit)';

-- ── submit_task · הגוף המקורי + שלוש בדיקות פתיחה ────────────────────────
create or replace function public.submit_task(
  p_task uuid, p_content jsonb, p_idem_key text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_student uuid; v_sub uuid; v_prev jsonb;
begin
  v_prev := public.app_idem_begin(p_idem_key, 'submit_task');
  if v_prev is not null then return (v_prev->>'submission_id')::uuid; end if;

  -- חדש: מושעה נחסם בשרת.
  if not public.app_actor_not_suspended() then
    raise exception 'account_suspended';
  end if;

  v_student := public.app_current_student_id();
  if v_student is null then
    raise exception 'no_student_identity'
      using hint = 'this account is not linked to a student record';
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'invalid_content';
  end if;
  if not exists (select 1 from public.learning_tasks where id = p_task and active) then
    raise exception 'task_not_found';
  end if;

  -- חדש: יעד תוכן אינו מקבל הגשות.
  if not exists (
    select 1 from public.learning_tasks
    where id = p_task and submission_enabled
  ) then
    raise exception 'submission_not_enabled'
      using hint = 'this is a content target; nothing is submitted here';
  end if;

  -- חדש: הגשה רק מתוך היקף פעיל של המקצוע.
  if not public.app_student_in_task_scope(v_student, p_task) then
    raise exception 'not_in_scope'
      using hint = 'this student is not enrolled in an active group for this subject';
  end if;

  if exists (select 1 from public.submissions where task_id = p_task and student_id = v_student) then
    raise exception 'already_submitted'
      using hint = 'use resubmit after the teacher returns it';
  end if;

  insert into public.submissions (task_id, student_id, status, revision)
  values (p_task, v_student, 'awaiting_review', 1)
  returning id into v_sub;

  insert into public.submission_versions (submission_id, revision, content, created_by)
  values (v_sub, 1, p_content, auth.uid());

  perform public.app_log_submission_event(v_sub, null, 'awaiting_review');
  perform public.app_idem_store(p_idem_key, 'submit_task', v_sub,
                                jsonb_build_object('submission_id', v_sub));
  return v_sub;
end;
$$;

-- ── resubmit · הגוף המקורי + אותן בדיקות ─────────────────────────────────
create or replace function public.resubmit(
  p_submission uuid, p_content jsonb, p_idem_key text
) returns integer language plpgsql security definer set search_path = '' as $$
declare v_student uuid; v_status public.submission_status; v_rev integer; v_prev jsonb; v_task uuid;
begin
  v_prev := public.app_idem_begin(p_idem_key, 'resubmit');
  if v_prev is not null then return (v_prev->>'revision')::integer; end if;

  -- חדש: מושעה נחסם בשרת.
  if not public.app_actor_not_suspended() then
    raise exception 'account_suspended';
  end if;

  v_student := public.app_current_student_id();
  if v_student is null then raise exception 'no_student_identity'; end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'invalid_content';
  end if;

  select s.status, s.revision, s.task_id into v_status, v_rev, v_task
  from public.submissions s
  where s.id = p_submission and s.student_id = v_student
  for update;

  if not found then raise exception 'submission_not_found'; end if;

  -- חדש: יעד שהפך לתוכן אינו מקבל resubmit, והיקף נבדק גם כאן.
  if not exists (select 1 from public.learning_tasks
                 where id = v_task and submission_enabled) then
    raise exception 'submission_not_enabled';
  end if;
  if not public.app_student_in_task_scope(v_student, v_task) then
    raise exception 'not_in_scope';
  end if;

  if v_status <> 'returned_for_revision' then
    raise exception 'illegal_transition' using hint = 'only a returned submission can be resubmitted';
  end if;

  v_rev := v_rev + 1;
  update public.submissions
     set status = 'resubmitted_awaiting', revision = v_rev, updated_at = now()
   where id = p_submission;

  insert into public.submission_versions (submission_id, revision, content, created_by)
  values (p_submission, v_rev, p_content, auth.uid());

  perform public.app_log_submission_event(p_submission, 'returned_for_revision', 'resubmitted_awaiting');
  perform public.app_idem_store(p_idem_key, 'resubmit', p_submission,
                                jsonb_build_object('revision', v_rev));
  return v_rev;
end;
$$;

-- ההרשאות של שתי הפונקציות היו קיימות ונשמרות: authenticated בלבד.
revoke all on function public.submit_task(uuid, jsonb, text) from public, anon;
revoke all on function public.resubmit(uuid, jsonb, text) from public, anon;
grant execute on function public.submit_task(uuid, jsonb, text) to authenticated;
grant execute on function public.resubmit(uuid, jsonb, text) to authenticated;
