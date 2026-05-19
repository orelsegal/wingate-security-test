
-- Builder layout per page (singleton per page_key)
CREATE TABLE public.builder_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL UNIQUE,
  layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.builder_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All auth can read builder_layouts" ON public.builder_layouts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert builder_layouts" ON public.builder_layouts
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update builder_layouts" ON public.builder_layouts
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete builder_layouts" ON public.builder_layouts
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_builder_layouts_updated
  BEFORE UPDATE ON public.builder_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-student values for admin-defined custom fields
CREATE TABLE public.student_custom_values (
  student_id uuid NOT NULL,
  field_key text NOT NULL,
  value jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, field_key)
);
ALTER TABLE public.student_custom_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all custom values" ON public.student_custom_values
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Teachers view all custom values" ON public.student_custom_values
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Coaches view their sport custom values" ON public.student_custom_values
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'coach'::app_role) AND EXISTS (
      SELECT 1 FROM students s WHERE s.id = student_custom_values.student_id
        AND s.sport = (SELECT linked_sport FROM profiles WHERE id = auth.uid())
    )
  );
CREATE POLICY "Parents view their child custom values" ON public.student_custom_values
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'parent'::app_role) AND student_id = (SELECT linked_student_id FROM profiles WHERE id = auth.uid())
  );
CREATE POLICY "Students view own custom values" ON public.student_custom_values
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'student'::app_role) AND student_id = (SELECT linked_student_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins/teachers insert custom values" ON public.student_custom_values
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)
  );
CREATE POLICY "Admins/teachers update custom values" ON public.student_custom_values
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)
  );
CREATE POLICY "Admins delete custom values" ON public.student_custom_values
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
