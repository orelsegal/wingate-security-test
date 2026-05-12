DROP POLICY IF EXISTS "Anyone can read subject_roadmaps" ON public.subject_roadmaps;
DROP POLICY IF EXISTS "Anyone can insert subject_roadmaps" ON public.subject_roadmaps;
DROP POLICY IF EXISTS "Anyone can update subject_roadmaps" ON public.subject_roadmaps;
DROP POLICY IF EXISTS "Anyone can delete subject_roadmaps" ON public.subject_roadmaps;

CREATE POLICY "Authenticated users can view subject_roadmaps"
ON public.subject_roadmaps
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_role(auth.uid(), 'student'::app_role)
  OR has_role(auth.uid(), 'parent'::app_role)
  OR has_role(auth.uid(), 'coach'::app_role)
);

CREATE POLICY "Admins and teachers can insert subject_roadmaps"
ON public.subject_roadmaps
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Admins and teachers can update subject_roadmaps"
ON public.subject_roadmaps
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Admins can delete subject_roadmaps"
ON public.subject_roadmaps
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));