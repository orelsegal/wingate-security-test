-- Remove public policies
DROP POLICY IF EXISTS "Anyone can read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Anyone can insert subjects" ON public.subjects;
DROP POLICY IF EXISTS "Anyone can update subjects" ON public.subjects;
DROP POLICY IF EXISTS "Anyone can delete subjects" ON public.subjects;

-- SELECT: any authenticated user with a known role
CREATE POLICY "Authenticated users can view subjects"
ON public.subjects
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_role(auth.uid(), 'student'::app_role)
  OR has_role(auth.uid(), 'parent'::app_role)
  OR has_role(auth.uid(), 'coach'::app_role)
);

-- Admin-only writes
CREATE POLICY "Admins can insert subjects"
ON public.subjects
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update subjects"
ON public.subjects
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete subjects"
ON public.subjects
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));