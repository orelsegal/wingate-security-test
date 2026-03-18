
CREATE POLICY "Anyone can delete student_roadmap_progress" ON public.student_roadmap_progress FOR DELETE USING (true);
