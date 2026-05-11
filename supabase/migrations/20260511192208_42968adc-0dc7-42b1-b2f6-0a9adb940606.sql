
-- Drop existing open policies
DROP POLICY IF EXISTS "Anyone can read students" ON public.students;
DROP POLICY IF EXISTS "Anyone can insert students" ON public.students;
DROP POLICY IF EXISTS "Anyone can update students" ON public.students;
DROP POLICY IF EXISTS "Anyone can delete students" ON public.students;

-- SELECT policies
CREATE POLICY "Admins can view all students"
ON public.students FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view all students"
ON public.students FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students can view their linked student"
ON public.students FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'student')
  AND id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Parents can view their linked student"
ON public.students FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'parent')
  AND id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Coaches can view students in their sport"
ON public.students FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'coach')
  AND sport = (SELECT linked_sport FROM public.profiles WHERE id = auth.uid())
);

-- Write policies: admin only
CREATE POLICY "Admins can insert students"
ON public.students FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update students"
ON public.students FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete students"
ON public.students FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
