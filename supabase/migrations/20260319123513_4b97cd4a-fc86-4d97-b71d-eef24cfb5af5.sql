-- Allow CRUD on subject_roadmaps for managing roadmap items
CREATE POLICY "Anyone can insert subject_roadmaps" ON public.subject_roadmaps FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update subject_roadmaps" ON public.subject_roadmaps FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete subject_roadmaps" ON public.subject_roadmaps FOR DELETE USING (true);