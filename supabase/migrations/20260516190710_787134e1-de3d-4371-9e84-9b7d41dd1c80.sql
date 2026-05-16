
-- app_users: remove public access
DROP POLICY IF EXISTS "Anyone can read app_users" ON public.app_users;

-- app_users: admin-only CRUD
CREATE POLICY "Admins can view app_users"
ON public.app_users
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert app_users"
ON public.app_users
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update app_users"
ON public.app_users
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete app_users"
ON public.app_users
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- profiles: add admin overrides (self-access policies remain untouched)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
