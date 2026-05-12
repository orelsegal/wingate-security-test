DROP POLICY IF EXISTS "Anyone can read sports" ON public.sports;
DROP POLICY IF EXISTS "Anyone can insert sports" ON public.sports;
DROP POLICY IF EXISTS "Anyone can update sports" ON public.sports;
DROP POLICY IF EXISTS "Anyone can delete sports" ON public.sports;

CREATE POLICY "Authenticated users can view sports"
ON public.sports
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_role(auth.uid(), 'student'::app_role)
  OR has_role(auth.uid(), 'parent'::app_role)
  OR has_role(auth.uid(), 'coach'::app_role)
);

CREATE POLICY "Admins can insert sports"
ON public.sports
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sports"
ON public.sports
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sports"
ON public.sports
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));