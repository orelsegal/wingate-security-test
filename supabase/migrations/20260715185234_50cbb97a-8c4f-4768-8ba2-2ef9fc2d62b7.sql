CREATE TABLE IF NOT EXISTS public.student_admin_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'gray' CHECK (status IN ('gray','green','orange','red')),
  status_note text,
  status_updated_at timestamptz NOT NULL DEFAULT now(),
  status_updated_by uuid DEFAULT auth.uid(),
  status_updated_by_name text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_admin_status TO authenticated;
GRANT ALL ON public.student_admin_status TO service_role;
ALTER TABLE public.student_admin_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read admin status"   ON public.student_admin_status;
DROP POLICY IF EXISTS "Admins insert admin status" ON public.student_admin_status;
DROP POLICY IF EXISTS "Admins update admin status" ON public.student_admin_status;
DROP POLICY IF EXISTS "Admins delete admin status" ON public.student_admin_status;

CREATE POLICY "Admins read admin status"   ON public.student_admin_status FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert admin status" ON public.student_admin_status FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update admin status" ON public.student_admin_status FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete admin status" ON public.student_admin_status FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.touch_admin_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.status_updated_at := now();
  NEW.status_updated_by := auth.uid();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS touch_student_admin_status ON public.student_admin_status;
CREATE TRIGGER touch_student_admin_status
  BEFORE UPDATE ON public.student_admin_status
  FOR EACH ROW EXECUTE FUNCTION public.touch_admin_status();

DO $$
DECLARE t int; pol int;
BEGIN
  SELECT count(*) INTO t FROM public.student_admin_status;
  SELECT count(*) INTO pol FROM pg_policies
    WHERE schemaname='public' AND tablename='student_admin_status';
  RAISE NOTICE 'student_admin_status rows=% (expected 0 on first run), policies=% (expected 4)', t, pol;
END $$;