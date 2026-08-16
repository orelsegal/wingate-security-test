-- ============================================================================
-- רכיבי הערכה וציונים — שכבת הכתיבה של רמזור הלמידה.
--
-- המורה עובד בתוך אותו מסך: מוסיף רכיב הערכה (מבדק / משימה / מבחן / מתכונת)
-- ומזין ציונים בטבלה. ההרשאה נאכפת בשרת בלבד, על אותם עוזרים שכבר קיימים:
--   teaches_subject(user, subject) — המורה משויך למקצוע
--   mentors_student(user, student) — המאמנטור משויך לכיתת התלמיד
--
-- עקרונות:
--   • המורה כותב רק במקצוע שהוקצה לו. אין מסלול עוקף בצד הלקוח.
--   • המאמנטור קורא בלבד. ההורה והתלמיד רואים רק את עצמם.
--   • הציון נשמר כטקסט כלשונו — כך נשמרים גם "85", גם "פטור" וגם ריק.
--   • ריק = לא הוזן. לעולם לא אפס ולא "עבר".
--   • שום טבלה קיימת אינה משתנה כאן. אין DROP ואין ALTER על נתוני production.
-- ============================================================================

-- ── רכיבי הערכה ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assessment_components (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  -- ריק = הרכיב חל על כל הכיתות שהמורה מלמד באותו מקצוע
  class_name  text,
  kind        text NOT NULL CHECK (kind IN ('מבדק', 'משימה', 'מבחן', 'מתכונת')),
  name        text NOT NULL CHECK (length(btrim(name)) > 0),
  due_date    date,
  -- משקל באחוזים; 0 = רכיב שאינו נכנס לשקלול
  weight      numeric(5,2) NOT NULL DEFAULT 0 CHECK (weight >= 0 AND weight <= 100),
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessment_components_subject_idx ON public.assessment_components(subject_id);

-- ── ציונים ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assessment_scores (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid NOT NULL REFERENCES public.assessment_components(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  -- טקסט כלשונו; NULL או ריק = לא הוזן
  score        text,
  -- false = לא הוגש. נשמר בנפרד מהציון כדי שלא יתחזה לאפס.
  submitted    boolean NOT NULL DEFAULT true,
  note         text,
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (component_id, student_id)
);

CREATE INDEX IF NOT EXISTS assessment_scores_student_idx ON public.assessment_scores(student_id);
CREATE INDEX IF NOT EXISTS assessment_scores_component_idx ON public.assessment_scores(component_id);

-- ── חותמות זמן ומי עדכן ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_assessment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_TABLE_NAME = 'assessment_scores' THEN NEW.updated_by := auth.uid(); END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_assessment_components ON public.assessment_components;
CREATE TRIGGER trg_touch_assessment_components
  BEFORE INSERT OR UPDATE ON public.assessment_components
  FOR EACH ROW EXECUTE FUNCTION public.touch_assessment();

DROP TRIGGER IF EXISTS trg_touch_assessment_scores ON public.assessment_scores;
CREATE TRIGGER trg_touch_assessment_scores
  BEFORE INSERT OR UPDATE ON public.assessment_scores
  FOR EACH ROW EXECUTE FUNCTION public.touch_assessment();

-- ── עוזר: האם המשתמש רשאי לכתוב על הרכיב הזה ───────────────────────────────
CREATE OR REPLACE FUNCTION public.can_write_component(_user uuid, _component uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessment_components c
    WHERE c.id = _component
      AND (public.has_role(_user, 'admin') OR public.teaches_subject(_user, c.subject_id))
  );
$$;
REVOKE ALL ON FUNCTION public.can_write_component(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_write_component(uuid, uuid) TO authenticated;

-- ── RLS: רכיבי הערכה ───────────────────────────────────────────────────────
ALTER TABLE public.assessment_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff read assessment components" ON public.assessment_components;
CREATE POLICY "Staff read assessment components"
  ON public.assessment_components FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.teaches_subject(auth.uid(), subject_id)
    OR public.has_role(auth.uid(), 'mentor')
  );

DROP POLICY IF EXISTS "Admins manage assessment components" ON public.assessment_components;
CREATE POLICY "Admins manage assessment components"
  ON public.assessment_components FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- המורה מוסיף ומעדכן רק במקצוע שהוקצה לו — נאכף גם ב-USING וגם ב-WITH CHECK,
-- כדי שלא יוכל "להעביר" רכיב למקצוע שאינו שלו.
DROP POLICY IF EXISTS "Teachers insert own subject components" ON public.assessment_components;
CREATE POLICY "Teachers insert own subject components"
  ON public.assessment_components FOR INSERT TO authenticated
  WITH CHECK (public.teaches_subject(auth.uid(), subject_id));

DROP POLICY IF EXISTS "Teachers update own subject components" ON public.assessment_components;
CREATE POLICY "Teachers update own subject components"
  ON public.assessment_components FOR UPDATE TO authenticated
  USING (public.teaches_subject(auth.uid(), subject_id))
  WITH CHECK (public.teaches_subject(auth.uid(), subject_id));

DROP POLICY IF EXISTS "Teachers delete own subject components" ON public.assessment_components;
CREATE POLICY "Teachers delete own subject components"
  ON public.assessment_components FOR DELETE TO authenticated
  USING (public.teaches_subject(auth.uid(), subject_id));

-- ── RLS: ציונים ────────────────────────────────────────────────────────────
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read assessment scores" ON public.assessment_scores;
CREATE POLICY "Admins read assessment scores"
  ON public.assessment_scores FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Teachers read own subject scores" ON public.assessment_scores;
CREATE POLICY "Teachers read own subject scores"
  ON public.assessment_scores FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assessment_components c
    WHERE c.id = component_id AND public.teaches_subject(auth.uid(), c.subject_id)
  ));

DROP POLICY IF EXISTS "Mentors read own class scores" ON public.assessment_scores;
CREATE POLICY "Mentors read own class scores"
  ON public.assessment_scores FOR SELECT TO authenticated
  USING (public.mentors_student(auth.uid(), student_id));

DROP POLICY IF EXISTS "Students read own scores" ON public.assessment_scores;
CREATE POLICY "Students read own scores"
  ON public.assessment_scores FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.linked_student_id = student_id
  ));

DROP POLICY IF EXISTS "Admins write assessment scores" ON public.assessment_scores;
CREATE POLICY "Admins write assessment scores"
  ON public.assessment_scores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Teachers insert own subject scores" ON public.assessment_scores;
CREATE POLICY "Teachers insert own subject scores"
  ON public.assessment_scores FOR INSERT TO authenticated
  WITH CHECK (public.can_write_component(auth.uid(), component_id));

DROP POLICY IF EXISTS "Teachers update own subject scores" ON public.assessment_scores;
CREATE POLICY "Teachers update own subject scores"
  ON public.assessment_scores FOR UPDATE TO authenticated
  USING (public.can_write_component(auth.uid(), component_id))
  WITH CHECK (public.can_write_component(auth.uid(), component_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_components TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_scores TO authenticated;
