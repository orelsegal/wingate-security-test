-- ═══════════════════════════════════════════════════════════════════
-- Parent read-only access to their linked child's grade rows and bagrut
-- roadmap row. SELECT only; no INSERT/UPDATE/DELETE for parents; admin
-- policies unchanged; teacher/coach/student NOT opened; no data changes.
-- Mirrors the existing "Parents can view their linked student" pattern
-- (profiles.linked_student_id of the logged-in user).
-- Idempotent: safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Parents read own child progress" ON public.student_subject_progress;
CREATE POLICY "Parents read own child progress"
ON public.student_subject_progress FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'parent')
  AND student_id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Parents read own child bagrut" ON public.student_bagrut_data;
CREATE POLICY "Parents read own child bagrut"
ON public.student_bagrut_data FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'parent')
  AND student_id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
);

DO $$
DECLARE p1 int; p2 int; w1 int; w2 int;
BEGIN
  SELECT count(*) INTO p1 FROM pg_policies
    WHERE schemaname='public' AND tablename='student_subject_progress' AND cmd='SELECT';
  SELECT count(*) INTO p2 FROM pg_policies
    WHERE schemaname='public' AND tablename='student_bagrut_data' AND cmd='SELECT';
  SELECT count(*) INTO w1 FROM pg_policies
    WHERE schemaname='public' AND tablename='student_subject_progress'
      AND cmd IN ('INSERT','UPDATE','DELETE') AND qual ILIKE '%parent%';
  SELECT count(*) INTO w2 FROM pg_policies
    WHERE schemaname='public' AND tablename='student_bagrut_data'
      AND cmd IN ('INSERT','UPDATE','DELETE') AND qual ILIKE '%parent%';
  RAISE NOTICE 'select_policies: progress=%, bagrut=% | parent WRITE policies (must be 0): progress=%, bagrut=%', p1, p2, w1, w2;
END $$;