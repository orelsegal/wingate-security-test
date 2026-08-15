-- ═══════════════════════════════════════════════════════════════════
-- רמזור למידה + הרשאות ממוקדות (מודל עינת, מאושר בהתכתבות 16.8)
--
-- 1) learning_status — התא של עינת: לכל תלמיד × מקצוע:
--    רמזור · ציונים (מילולי, נשמר כלשונו) · הערות · חליפה (רב־ערכית) · הערות חליפה
--    ריק = לא הוזן. אין ברירת מחדל "ירוק" ואין 0.
-- 2) teacher_subjects — מורה משויך למקצוע (עינת: "מורה מסוים ישויך רק למקצוע שלו")
-- 3) mentor_classes   — מאמנטור אחראי לכיתה ("מאמנטור רק לכיתה")
-- 4) app_role += 'mentor'
-- 5) RLS: מנהל=הכל · מורה=המקצועות שלו · מאמנטור=הכיתה שלו · הורה=ילדיו · תלמיד=שלו
--    האכיפה בשרת, לא בהסתרת UI.
--
-- אין נגיעה בטבלאות קיימות, אין מחיקה, אין שינוי enum קיים מלבד הוספת ערך.
-- ═══════════════════════════════════════════════════════════════════

-- (תפקיד 'mentor' נוסף במיגרציה 20260816085900 — enum חדש אינו שמיש
--  באותה טרנזקציה שבה נוסף.)

-- ── 1. שיוך מורה למקצוע ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
  teacher_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id      uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  assigned_by     uuid,
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_user_id, subject_id)
);
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.teacher_subjects TO authenticated;
GRANT ALL    ON public.teacher_subjects TO service_role;

DROP POLICY IF EXISTS "Teachers read own subject assignments" ON public.teacher_subjects;
CREATE POLICY "Teachers read own subject assignments"
  ON public.teacher_subjects FOR SELECT TO authenticated
  USING (teacher_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage subject assignments" ON public.teacher_subjects;
CREATE POLICY "Admins manage subject assignments"
  ON public.teacher_subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 2. שיוך מאמנטור לכיתה ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mentor_classes (
  mentor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_name     text NOT NULL CHECK (length(trim(class_name)) BETWEEN 1 AND 20),
  assigned_by    uuid,
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mentor_user_id, class_name)
);
ALTER TABLE public.mentor_classes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.mentor_classes TO authenticated;
GRANT ALL    ON public.mentor_classes TO service_role;

DROP POLICY IF EXISTS "Mentors read own class assignments" ON public.mentor_classes;
CREATE POLICY "Mentors read own class assignments"
  ON public.mentor_classes FOR SELECT TO authenticated
  USING (mentor_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage class assignments" ON public.mentor_classes;
CREATE POLICY "Admins manage class assignments"
  ON public.mentor_classes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 3. עוזרי scope (SECURITY DEFINER; אין רקורסיית RLS) ──────────
CREATE OR REPLACE FUNCTION public.teaches_subject(_user uuid, _subject uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.teacher_subjects
                  WHERE teacher_user_id = _user AND subject_id = _subject);
$$;
REVOKE ALL ON FUNCTION public.teaches_subject(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teaches_subject(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mentors_student(_user uuid, _student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_classes mc
      JOIN public.students s ON s.id = _student
     WHERE mc.mentor_user_id = _user
       AND regexp_replace(trim(mc.class_name), '[\s''"״׳]', '', 'g')
         = regexp_replace(trim(coalesce(s.class_name,'')), '[\s''"״׳]', '', 'g')
  );
$$;
REVOKE ALL ON FUNCTION public.mentors_student(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mentors_student(uuid, uuid) TO authenticated;

-- ── 4. רמזור למידה — התא של עינת ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.learning_status (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id    uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  -- ריק/NULL = "לא הוזן". אין ברירת מחדל ואין 'green'.
  ramzor        text CHECK (ramzor IN ('אדום','צהוב','ירוק')),
  grades_raw    text,          -- כלשונו: "40, 60, 65" נשמר כמחרוזת אחת
  notes         text,
  haliffa       text[] NOT NULL DEFAULT '{}',   -- רב־ערכית
  haliffa_notes text,
  source        text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','import')),
  updated_by    uuid,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id)
);
ALTER TABLE public.learning_status ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.learning_status TO authenticated;
GRANT ALL ON public.learning_status TO service_role;

CREATE INDEX IF NOT EXISTS learning_status_student_idx ON public.learning_status(student_id);
CREATE INDEX IF NOT EXISTS learning_status_subject_idx ON public.learning_status(subject_id);

CREATE OR REPLACE FUNCTION public.touch_learning_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_touch_learning_status ON public.learning_status;
CREATE TRIGGER trg_touch_learning_status
  BEFORE INSERT OR UPDATE ON public.learning_status
  FOR EACH ROW EXECUTE FUNCTION public.touch_learning_status();

-- ── 5. RLS · חמשת התפקידים, אכיפה בשרת ───────────────────────────
DROP POLICY IF EXISTS "Admins read learning status"    ON public.learning_status;
DROP POLICY IF EXISTS "Teachers read own subject rows" ON public.learning_status;
DROP POLICY IF EXISTS "Mentors read own class rows"    ON public.learning_status;
DROP POLICY IF EXISTS "Parents read own child rows"    ON public.learning_status;
DROP POLICY IF EXISTS "Students read own rows"         ON public.learning_status;
DROP POLICY IF EXISTS "Admins write learning status"   ON public.learning_status;
DROP POLICY IF EXISTS "Admins update learning status"  ON public.learning_status;
DROP POLICY IF EXISTS "Teachers write own subject rows"  ON public.learning_status;
DROP POLICY IF EXISTS "Teachers update own subject rows" ON public.learning_status;

-- קריאה
CREATE POLICY "Admins read learning status"
  ON public.learning_status FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers read own subject rows"
  ON public.learning_status FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher')
         AND public.teaches_subject(auth.uid(), subject_id));

CREATE POLICY "Mentors read own class rows"
  ON public.learning_status FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'mentor')
         AND public.mentors_student(auth.uid(), student_id));

CREATE POLICY "Parents read own child rows"
  ON public.learning_status FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'parent')
         AND student_id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Students read own rows"
  ON public.learning_status FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'student')
         AND student_id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid()));

-- כתיבה: מנהל בכל מקצוע; מורה רק במקצוע שלו. מאמנטור/הורה/תלמיד — קריאה בלבד.
CREATE POLICY "Admins write learning status"
  ON public.learning_status FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update learning status"
  ON public.learning_status FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers write own subject rows"
  ON public.learning_status FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher')
              AND public.teaches_subject(auth.uid(), subject_id));
CREATE POLICY "Teachers update own subject rows"
  ON public.learning_status FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'teacher')
         AND public.teaches_subject(auth.uid(), subject_id))
  WITH CHECK (public.has_role(auth.uid(), 'teacher')
              AND public.teaches_subject(auth.uid(), subject_id));

-- ── 6. self-check ────────────────────────────────────────────────
DO $$
BEGIN
  IF (SELECT count(*) FROM pg_policies
       WHERE schemaname='public' AND tablename='learning_status') <> 9 THEN
    RAISE EXCEPTION 'self-check failed: learning_status policy count is %',
      (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename='learning_status');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='teaches_subject')
     OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname='mentors_student') THEN
    RAISE EXCEPTION 'self-check failed: scope helpers missing';
  END IF;
  RAISE NOTICE 'LEARNING_STATUS: table+9 policies+2 scope helpers OK; ramzor has no default (empty = לא הוזן)';
END $$;
