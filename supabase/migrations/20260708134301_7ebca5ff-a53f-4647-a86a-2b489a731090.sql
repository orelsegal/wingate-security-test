-- ═══════════════════════════════════════════════════════════════════
-- Invite/onboarding fix (hardened):
--   (A) new users cannot self-insert into user_roles (RLS) → definer claim fn
--   (B) invite metadata in admin's localStorage → server-side pending_invites
-- Invitable roles capped to: teacher / coach / parent / student.
-- Existing user_roles policies are NOT modified.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.pending_invites (
  email             text PRIMARY KEY CHECK (email = lower(email)),
  full_name         text,
  role              public.app_role NOT NULL
                    CHECK (role IN ('teacher','coach','parent','student')),
  linked_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  linked_sport      text,
  created_by        uuid NOT NULL DEFAULT auth.uid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pending_invites"
  ON public.pending_invites FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pending_invites"
  ON public.pending_invites FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pending_invites"
  ON public.pending_invites FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pending_invites"
  ON public.pending_invites FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

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