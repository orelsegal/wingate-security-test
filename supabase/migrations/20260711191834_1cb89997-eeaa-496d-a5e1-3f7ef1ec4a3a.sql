DROP POLICY IF EXISTS "Students insert own quiz results, admins any" ON public.daily_quiz_results;
DROP POLICY IF EXISTS "Students update own quiz results, admins any" ON public.daily_quiz_results;

CREATE POLICY "Students insert own quiz results, admins any"
  ON public.daily_quiz_results FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.has_role(auth.uid(), 'student')
      AND student_id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Students update own quiz results, admins any"
  ON public.daily_quiz_results FOR UPDATE TO authenticated
  USING (
    (
      public.has_role(auth.uid(), 'student')
      AND student_id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (
      public.has_role(auth.uid(), 'student')
      AND student_id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
    )
    OR public.has_role(auth.uid(), 'admin')
  );