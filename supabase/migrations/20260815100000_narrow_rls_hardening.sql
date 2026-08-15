-- ═══════════════════════════════════════════════════════════════════
-- Narrow RLS hardening (2026-08-15)
-- Scope: exactly the two verified findings below. No schema shape changes,
-- no data changes, no new roles, no permission-matrix activation.
--
-- Finding 1 (privilege escalation, verified in CURRENT_STATE_AUDIT.md):
--   "Users can update own profile" had no WITH CHECK and no column
--   protection, so any authenticated user could re-point their own
--   profiles.linked_student_id / linked_sport and gain read access to
--   another student's grades and bagrut data (parent/student/coach row
--   scoping across the schema trusts those two columns).
--   Fix: recreate the policy with WITH CHECK, plus a BEFORE trigger that
--   blocks changes to the two scope columns unless the caller is an admin
--   or the write comes from the invite-claim path (transaction-local flag
--   set inside claim_pending_invite, which stays SECURITY DEFINER).
--   Requests without a user JWT (migrations, service_role maintenance)
--   pass through unchanged: the guard targets client JWT sessions only.
--
-- Finding 2 (over-broad teacher scope):
--   Teachers could SELECT/INSERT/UPDATE/DELETE student_roadmap_progress
--   and SELECT/INSERT/UPDATE student_custom_values for EVERY student,
--   inconsistent with the group-scoped students policy introduced in
--   20260721150000. Fix: scope every teacher policy on those two tables
--   with public.is_teacher_of_student(auth.uid(), student_id)
--   (fail-closed: a teacher with no active group sees nothing), keeping
--   admin behavior identical. Student/parent/coach policies untouched.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Part A · profiles scope-column guard ──────────────────────────

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.enforce_profile_scope_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Guard only JWT-authenticated client requests. Maintenance paths with
  -- no user JWT (migrations, service_role jobs) are unaffected.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Invite-claim path: claim_pending_invite() sets a transaction-local
  -- flag right before it links the freshly-claimed profile.
  IF current_setting('app.allow_profile_link_write', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.linked_student_id IS DISTINCT FROM OLD.linked_student_id
       OR NEW.linked_sport IS DISTINCT FROM OLD.linked_sport THEN
      RAISE EXCEPTION 'link_columns_admin_only'
        USING HINT = 'linked_student_id / linked_sport can only be changed by an admin';
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.linked_student_id IS NOT NULL OR NEW.linked_sport IS NOT NULL THEN
      RAISE EXCEPTION 'link_columns_admin_only'
        USING HINT = 'linked_student_id / linked_sport can only be set by an admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_link_columns ON public.profiles;
CREATE TRIGGER protect_profile_link_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_scope_guard();

-- claim_pending_invite: identical body to 20260708134301, with ONE added
-- statement (the transaction-local guard flag) before the profile write.
CREATE OR REPLACE FUNCTION public.claim_pending_invite()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_email  text;
  v_invite public.pending_invites%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT lower(email) INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'no_email_on_account';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('status', 'already_has_role');
  END IF;

  DELETE FROM public.pending_invites
   WHERE email = v_email
  RETURNING * INTO v_invite;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'no_invite');
  END IF;

  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('status', 'invite_expired');
  END IF;

  IF v_invite.role NOT IN ('teacher','coach','parent','student') THEN
    RAISE EXCEPTION 'role_not_invitable';
  END IF;

  IF v_invite.linked_student_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = v_invite.linked_student_id
  ) THEN
    v_invite.linked_student_id := NULL;
  END IF;

  IF v_invite.linked_sport IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sports sp WHERE sp.sport_name = v_invite.linked_sport
  ) THEN
    v_invite.linked_sport := NULL;
  END IF;

  IF v_invite.role = 'student' AND v_invite.linked_student_id IS NULL THEN
    SELECT s.id INTO v_invite.linked_student_id
      FROM public.students s
     WHERE lower(s.email) = v_email
     LIMIT 1;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, v_invite.role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Allow this transaction (and only it) to write the scope columns.
  PERFORM set_config('app.allow_profile_link_write', 'on', true);

  UPDATE public.profiles
     SET full_name         = COALESCE(NULLIF(v_invite.full_name, ''), full_name),
         email             = COALESCE(email, v_email),
         linked_student_id = COALESCE(v_invite.linked_student_id, linked_student_id),
         linked_sport      = COALESCE(v_invite.linked_sport, linked_sport)
   WHERE id = v_uid;

  IF NOT FOUND THEN
    INSERT INTO public.profiles (id, email, full_name, linked_student_id, linked_sport)
    VALUES (v_uid, v_email, NULLIF(v_invite.full_name, ''),
            v_invite.linked_student_id, v_invite.linked_sport)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'status',    'claimed',
    'role',      v_invite.role,
    'full_name', v_invite.full_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_pending_invite() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pending_invite() TO authenticated;

-- ─── Part B · teacher scoping on roadmap progress + custom values ──

-- student_roadmap_progress · SELECT
DROP POLICY IF EXISTS "Teachers can view all roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Teachers view their group roadmap progress" ON public.student_roadmap_progress;
CREATE POLICY "Teachers view their group roadmap progress"
ON public.student_roadmap_progress FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher')
  AND public.is_teacher_of_student(auth.uid(), student_id)
);

-- student_roadmap_progress · writes (split the combined admin+teacher
-- policies so the admin behavior stays identical and the teacher side
-- becomes group-scoped)
DROP POLICY IF EXISTS "Admins and teachers can insert roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Admins and teachers can update roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Admins and teachers can delete roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Admins insert roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Admins update roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Admins delete roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Teachers insert group roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Teachers update group roadmap progress" ON public.student_roadmap_progress;
DROP POLICY IF EXISTS "Teachers delete group roadmap progress" ON public.student_roadmap_progress;

CREATE POLICY "Admins insert roadmap progress"
ON public.student_roadmap_progress FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update roadmap progress"
ON public.student_roadmap_progress FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete roadmap progress"
ON public.student_roadmap_progress FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers insert group roadmap progress"
ON public.student_roadmap_progress FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'teacher')
  AND public.is_teacher_of_student(auth.uid(), student_id)
);

CREATE POLICY "Teachers update group roadmap progress"
ON public.student_roadmap_progress FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher')
  AND public.is_teacher_of_student(auth.uid(), student_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'teacher')
  AND public.is_teacher_of_student(auth.uid(), student_id)
);

CREATE POLICY "Teachers delete group roadmap progress"
ON public.student_roadmap_progress FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher')
  AND public.is_teacher_of_student(auth.uid(), student_id)
);

-- student_custom_values · SELECT
DROP POLICY IF EXISTS "Teachers view all custom values" ON public.student_custom_values;
DROP POLICY IF EXISTS "Teachers view their group custom values" ON public.student_custom_values;
CREATE POLICY "Teachers view their group custom values"
ON public.student_custom_values FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher')
  AND public.is_teacher_of_student(auth.uid(), student_id)
);

-- student_custom_values · writes (delete stays admin-only as before)
DROP POLICY IF EXISTS "Admins/teachers insert custom values" ON public.student_custom_values;
DROP POLICY IF EXISTS "Admins/teachers update custom values" ON public.student_custom_values;
DROP POLICY IF EXISTS "Admins insert custom values" ON public.student_custom_values;
DROP POLICY IF EXISTS "Admins update custom values" ON public.student_custom_values;
DROP POLICY IF EXISTS "Teachers insert group custom values" ON public.student_custom_values;
DROP POLICY IF EXISTS "Teachers update group custom values" ON public.student_custom_values;

CREATE POLICY "Admins insert custom values"
ON public.student_custom_values FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update custom values"
ON public.student_custom_values FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers insert group custom values"
ON public.student_custom_values FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'teacher')
  AND public.is_teacher_of_student(auth.uid(), student_id)
);

CREATE POLICY "Teachers update group custom values"
ON public.student_custom_values FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher')
  AND public.is_teacher_of_student(auth.uid(), student_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'teacher')
  AND public.is_teacher_of_student(auth.uid(), student_id)
);

-- ─── Self-check: assert the intended end-state exists ──────────────
DO $$
BEGIN
  -- trigger present
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'protect_profile_link_columns'
      AND tgrelid = 'public.profiles'::regclass
  ) THEN
    RAISE EXCEPTION 'self-check failed: profiles guard trigger missing';
  END IF;

  -- wide-open teacher policies gone
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN ('Teachers can view all roadmap progress',
                         'Teachers view all custom values',
                         'Admins and teachers can insert roadmap progress',
                         'Admins/teachers insert custom values')
  ) THEN
    RAISE EXCEPTION 'self-check failed: a wide-open teacher policy still exists';
  END IF;

  -- scoped replacements present
  IF (SELECT count(*) FROM pg_policies
      WHERE schemaname = 'public'
        AND policyname IN ('Teachers view their group roadmap progress',
                           'Teachers view their group custom values',
                           'Teachers insert group roadmap progress',
                           'Teachers insert group custom values')) <> 4 THEN
    RAISE EXCEPTION 'self-check failed: scoped teacher policies missing';
  END IF;
END $$;
