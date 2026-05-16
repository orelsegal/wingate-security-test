
DROP POLICY IF EXISTS "Anyone can read activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can insert activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Anyone can delete activity_logs" ON public.activity_logs;

CREATE POLICY "Admins can view activity_logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can insert activity_logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'teacher'::app_role)
  OR has_role(auth.uid(), 'student'::app_role)
  OR has_role(auth.uid(), 'parent'::app_role)
  OR has_role(auth.uid(), 'coach'::app_role)
);

CREATE POLICY "Admins can update activity_logs"
ON public.activity_logs
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete activity_logs"
ON public.activity_logs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
