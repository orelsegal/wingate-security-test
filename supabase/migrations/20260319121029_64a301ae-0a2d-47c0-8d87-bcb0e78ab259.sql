
CREATE POLICY "Anyone can insert subjects"
ON public.subjects
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update subjects"
ON public.subjects
FOR UPDATE
TO public
USING (true);

CREATE POLICY "Anyone can delete subjects"
ON public.subjects
FOR DELETE
TO public
USING (true);
