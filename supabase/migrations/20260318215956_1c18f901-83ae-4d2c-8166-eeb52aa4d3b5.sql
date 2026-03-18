
-- Allow inserting new student_subject_progress records
CREATE POLICY "Anyone can insert student_subject_progress"
ON public.student_subject_progress
FOR INSERT
TO public
WITH CHECK (true);

-- Allow deleting student_subject_progress records
CREATE POLICY "Anyone can delete student_subject_progress"
ON public.student_subject_progress
FOR DELETE
TO public
USING (true);

-- Allow inserting new students
CREATE POLICY "Anyone can insert students"
ON public.students
FOR INSERT
TO public
WITH CHECK (true);

-- Allow deleting students
CREATE POLICY "Anyone can delete students"
ON public.students
FOR DELETE
TO public
USING (true);
