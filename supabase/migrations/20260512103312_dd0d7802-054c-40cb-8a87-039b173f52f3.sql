-- Drop public policies
DROP POLICY IF EXISTS "Anyone can read student_roadmap_progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Anyone can insert student_roadmap_progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Anyone can update student_roadmap_progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Anyone can delete student_roadmap_progress" ON public.student_roadmap_progress;

ALTER TABLE public.student_roadmap_progress ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "Admins can view all roadmap progress"
ON public.student_roadmap_progress FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view all roadmap progress"
ON public.student_roadmap_progress FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Students can view their own roadmap progress"
ON public.student_roadmap_progress FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'student'::app_role)
  AND student_id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Parents can view their child roadmap progress"
ON public.student_roadmap_progress FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'parent'::app_role)
  AND student_id = (SELECT linked_student_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Coaches can view roadmap progress for their sport"
ON public.student_roadmap_progress FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'coach'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_roadmap_progress.student_id
      AND s.sport = (SELECT linked_sport FROM public.profiles WHERE id = auth.uid())
  )
);

-- INSERT / UPDATE / DELETE: admin + teacher only
CREATE POLICY "Admins and teachers can insert roadmap progress"
ON public.student_roadmap_progress FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Admins and teachers can update roadmap progress"
ON public.student_roadmap_progress FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Admins and teachers can delete roadmap progress"
ON public.student_roadmap_progress FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));