-- ═══════════════════════════════════════════════════════════════════
-- Harden daily_quiz_results write access.
-- Before: INSERT/UPDATE were WITH CHECK (true) — any authenticated user
-- could write or alter ANY student's quiz result (score/streak tampering).
-- After: a student may INSERT/UPDATE only their own row (student_id =
-- their linked_student_id); admins may write any row (future corrections).
-- SELECT stays open to authenticated (leaderboard needs it, low sensitivity).
-- DELETE stays blocked (no policy). daily_quiz_cache is untouched.
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Authenticated can insert quiz results" ON public.daily_quiz_results;
DROP POLICY IF EXISTS "Authenticated can update quiz results" ON public.daily_quiz_results;

CREATE POLICY "Students insert own quiz results, admins any"
  ON public.daily_quiz_results FOR INSERT TO authenticated
  WITH CHECK (
    student_id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Students update own quiz results, admins any"
  ON public.daily_quiz_results FOR UPDATE TO authenticated
  USING (
    student_id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    student_id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );