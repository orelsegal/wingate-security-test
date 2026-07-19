-- ═══════════════════════════════════════════════════════════════════
-- PEOPLE MODEL — STAGE 3A (additive & dormant).
-- Guardians, staff, relationships, sport aliases, scoped functions and
-- secured RPCs. NO import, NO seed of people, NO UI, NO change to any
-- existing business policy, NO change to profiles.linked_* /
-- students.assigned_coach / pending_invites / user_roles.
-- 5 new permissions are added and granted to NO role, so in practice
-- only the System Owner (has_permission bypass) can manage.
-- Removing a link sets active_to (history kept). NOTE on FKs: student
-- links CASCADE on student deletion; guardians/staff auth_user_id uses
-- ON DELETE SET NULL so deleting an auth account never deletes a person.
-- Audit is append-only and stores NO PII values (ids + field names only).
-- Idempotent; safe to re-run. No PII anywhere in this file.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Permissions (non-critical; granted to NO role) ──
INSERT INTO public.permissions (key, description, category, is_critical) VALUES
  ('people.guardians.view',       'צפייה בהורים ואפוטרופוסים',        'people', false),
  ('people.guardians.manage',     'יצירה ועריכה של הורים',            'people', false),
  ('people.staff.view',           'צפייה באנשי צוות ומאמנים',         'people', false),
  ('people.staff.manage',         'יצירה ועריכה של אנשי צוות',        'people', false),
  ('people.relationships.manage', 'ניהול קשרי תלמיד-הורה-מאמן',       'people', false)
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description, category = EXCLUDED.category, is_critical = EXCLUDED.is_critical;

-- ── 2. Tables ──
CREATE TABLE IF NOT EXISTS public.guardians (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    text NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 120),
  phone        text,
  email        text,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_guardians (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id        uuid NOT NULL REFERENCES public.guardians(id) ON DELETE RESTRICT,
  relationship_type  text NOT NULL CHECK (relationship_type IN ('mother','father','guardian','other')),
  is_primary_contact boolean NOT NULL DEFAULT false,
  is_legal_guardian  boolean NOT NULL DEFAULT true,
  receives_updates   boolean NOT NULL DEFAULT true,
  emergency_priority smallint,
  active_from        timestamptz NOT NULL DEFAULT now(),
  active_to          timestamptz,
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sg_active ON public.student_guardians (student_id, guardian_id) WHERE active_to IS NULL;
CREATE INDEX IF NOT EXISTS idx_sg_guardian_active ON public.student_guardians (guardian_id) WHERE active_to IS NULL;
CREATE INDEX IF NOT EXISTS idx_sg_student_active ON public.student_guardians (student_id) WHERE active_to IS NULL;

CREATE TABLE IF NOT EXISTS public.staff_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    text NOT NULL CHECK (length(trim(full_name)) BETWEEN 1 AND 120),
  phone        text,
  email        text,
  auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_member_roles (
  staff_member_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  role_type       text NOT NULL CHECK (role_type IN ('coach','madrich','teacher','support','other')),
  PRIMARY KEY (staff_member_id, role_type)
);

CREATE TABLE IF NOT EXISTS public.student_coach_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  staff_member_id uuid NOT NULL REFERENCES public.staff_members(id) ON DELETE RESTRICT,
  role_type       text NOT NULL DEFAULT 'primary' CHECK (role_type IN ('primary','assistant','other')),
  active_from     timestamptz NOT NULL DEFAULT now(),
  active_to       timestamptz,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sca_active ON public.student_coach_assignments (student_id, staff_member_id, role_type) WHERE active_to IS NULL;
CREATE INDEX IF NOT EXISTS idx_sca_staff_active ON public.student_coach_assignments (staff_member_id) WHERE active_to IS NULL;
CREATE INDEX IF NOT EXISTS idx_sca_student_active ON public.student_coach_assignments (student_id) WHERE active_to IS NULL;

CREATE TABLE IF NOT EXISTS public.sport_aliases (
  alias_normalized text PRIMARY KEY,
  sport_id         uuid NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.people_audit_log (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id      uuid,
  entity_type        text NOT NULL,
  entity_id          uuid,
  action             text NOT NULL,
  related_student_id uuid,
  changed_fields     text[],
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pal_entity ON public.people_audit_log (entity_type, entity_id, created_at);

-- ── 3. Lock everything from the API ──
ALTER TABLE public.guardians                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_member_roles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_coach_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sport_aliases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_audit_log          ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.guardians, public.student_guardians, public.staff_members,
              public.staff_member_roles, public.student_coach_assignments,
              public.sport_aliases, public.people_audit_log
  FROM authenticated, anon;
GRANT ALL ON public.guardians, public.student_guardians, public.staff_members,
             public.staff_member_roles, public.student_coach_assignments,
             public.sport_aliases, public.people_audit_log
  TO service_role;
-- aliases are harmless reference data: readable by signed-in users
GRANT SELECT ON public.sport_aliases TO authenticated;
DROP POLICY IF EXISTS "Authenticated read sport aliases" ON public.sport_aliases;
CREATE POLICY "Authenticated read sport aliases"
  ON public.sport_aliases FOR SELECT TO authenticated USING (true);

-- audit append-only
CREATE OR REPLACE FUNCTION public.ppl_audit_append_only()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'people_audit_log_is_append_only';
END $$;
DROP TRIGGER IF EXISTS ppl_audit_append_only ON public.people_audit_log;
CREATE TRIGGER ppl_audit_append_only
  BEFORE UPDATE OR DELETE ON public.people_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.ppl_audit_append_only();

CREATE OR REPLACE FUNCTION public.ppl_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS g_touch ON public.guardians;
CREATE TRIGGER g_touch BEFORE UPDATE ON public.guardians
  FOR EACH ROW EXECUTE FUNCTION public.ppl_touch_updated_at();
DROP TRIGGER IF EXISTS sm_touch ON public.staff_members;
CREATE TRIGGER sm_touch BEFORE UPDATE ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION public.ppl_touch_updated_at();

-- ── 4. Sport aliases seed — ATOMIC: every target must already exist in
--     public.sports, otherwise the whole migration fails (no partial
--     seed, targets never auto-created). Idempotent on re-run.
DO $$
DECLARE v_missing text;
BEGIN
  SELECT string_agg(t.target, '; ') INTO v_missing
  FROM (VALUES ('סיוף'), ('טיפוס'), ('אתלטיקה'), ('טניס שולחן'), ('כדורעף בנים'), ('כדורעף בנות')) t(target)
  WHERE NOT EXISTS (SELECT 1 FROM public.sports s WHERE s.sport_name = t.target);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'ALIAS_SEED_ABORTED: missing target sports (create them first, never auto-created): %', v_missing;
  END IF;
  INSERT INTO public.sport_aliases (alias_normalized, sport_id)
  SELECT a.alias, s.id
  FROM (VALUES
      ('סייף',      'סיוף'),
      ('קיר טיפוס', 'טיפוס'),
      ('אטלתיקה',   'אתלטיקה'),
      ('טנ"ש',      'טניס שולחן'),
      ('עף בנים',   'כדורעף בנים'),
      ('עף בנות',   'כדורעף בנות')
    ) a(alias, target)
  JOIN public.sports s ON s.sport_name = a.target
  ON CONFLICT (alias_normalized) DO UPDATE SET sport_id = EXCLUDED.sport_id;
  RAISE NOTICE 'ALIAS_SEED: all 6 alias targets verified and seeded atomically';
END $$;

-- ── 5. Internal helpers ──
CREATE OR REPLACE FUNCTION public.ppl_log(_etype text, _eid uuid, _action text, _student uuid, _fields text[])
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO public.people_audit_log (actor_user_id, entity_type, entity_id, action, related_student_id, changed_fields)
  VALUES (auth.uid(), _etype, _eid, _action, _student, _fields);
$$;
REVOKE ALL ON FUNCTION public.ppl_log(text, uuid, text, uuid, text[]) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.ppl_assert(_perm text)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.has_permission(auth.uid(), _perm) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.ppl_assert(text) FROM PUBLIC;

-- ── 6. Scope functions (dormant — wired to NO policy) ──
CREATE OR REPLACE FUNCTION public.has_guardian_scope(_user_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guardians g
    JOIN public.student_guardians sg ON sg.guardian_id = g.id
    WHERE g.auth_user_id = _user_id AND g.is_active
      AND sg.student_id = _student_id AND sg.active_to IS NULL
  );
$$;
CREATE OR REPLACE FUNCTION public.has_coach_scope(_user_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_members sm
    JOIN public.staff_member_roles smr ON smr.staff_member_id = sm.id AND smr.role_type = 'coach'
    JOIN public.student_coach_assignments sca ON sca.staff_member_id = sm.id
    WHERE sm.auth_user_id = _user_id AND sm.is_active
      AND sca.student_id = _student_id AND sca.active_to IS NULL
  );
$$;
REVOKE ALL ON FUNCTION public.has_guardian_scope(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_coach_scope(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_guardian_scope(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_coach_scope(uuid, uuid) TO authenticated;

-- ── 7. RPCs — guardians ──
-- Contact details (phone/email) are returned ONLY to callers holding the
-- manage permission (System Owner passes via the has_permission bypass);
-- view-only callers get NULLs until a contact-exposure policy is decided.
CREATE OR REPLACE FUNCTION public.list_guardians(p_search text DEFAULT NULL, p_active_only boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb; v_contact boolean;
BEGIN
  PERFORM public.ppl_assert('people.guardians.view');
  v_contact := public.has_permission(auth.uid(), 'people.guardians.manage');
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', g.id, 'full_name', g.full_name,
      'phone', CASE WHEN v_contact THEN g.phone END,
      'email', CASE WHEN v_contact THEN g.email END,
      'is_active', g.is_active, 'has_account', g.auth_user_id IS NOT NULL,
      'linked_students', (SELECT count(*) FROM public.student_guardians sg
                          WHERE sg.guardian_id = g.id AND sg.active_to IS NULL)
    ) ORDER BY g.full_name), '[]'::jsonb) INTO v
  FROM public.guardians g
  WHERE (NOT p_active_only OR g.is_active)
    AND (p_search IS NULL OR g.full_name ILIKE '%' || p_search || '%')
  LIMIT 500;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.get_guardian_details(p_guardian uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb;
BEGIN
  PERFORM public.ppl_assert('people.guardians.view');
  SELECT jsonb_build_object(
    'guardian', jsonb_build_object(
      'id', g.id, 'full_name', g.full_name,
      'phone', CASE WHEN public.has_permission(auth.uid(), 'people.guardians.manage') THEN g.phone END,
      'email', CASE WHEN public.has_permission(auth.uid(), 'people.guardians.manage') THEN g.email END,
      'is_active', g.is_active, 'has_account', g.auth_user_id IS NOT NULL,
      'created_at', g.created_at, 'updated_at', g.updated_at),
    'links', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'link_id', sg.id, 'student_id', sg.student_id, 'student_name', st.full_name,
        'relationship_type', sg.relationship_type, 'is_primary_contact', sg.is_primary_contact,
        'is_legal_guardian', sg.is_legal_guardian, 'receives_updates', sg.receives_updates,
        'emergency_priority', sg.emergency_priority, 'active', sg.active_to IS NULL,
        'active_from', sg.active_from, 'active_to', sg.active_to))
      FROM public.student_guardians sg
      JOIN public.students st ON st.id = sg.student_id
      WHERE sg.guardian_id = g.id), '[]'::jsonb)
  ) INTO v FROM public.guardians g WHERE g.id = p_guardian;
  IF v IS NULL THEN RAISE EXCEPTION 'guardian_not_found'; END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.create_guardian(p_full_name text, p_phone text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM public.ppl_assert('people.guardians.manage');
  INSERT INTO public.guardians (full_name, phone, email)
  VALUES (trim(p_full_name), NULLIF(trim(p_phone), ''), NULLIF(trim(p_email), ''))
  RETURNING id INTO v_id;
  PERFORM public.ppl_log('guardian', v_id, 'create', NULL, ARRAY['full_name','phone','email']);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_guardian(p_guardian uuid, p_full_name text, p_phone text, p_email text, p_is_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_n int;
BEGIN
  PERFORM public.ppl_assert('people.guardians.manage');
  UPDATE public.guardians
  SET full_name = trim(p_full_name), phone = NULLIF(trim(p_phone), ''),
      email = NULLIF(trim(p_email), ''), is_active = p_is_active
  WHERE id = p_guardian;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RAISE EXCEPTION 'guardian_not_found'; END IF;
  PERFORM public.ppl_log('guardian', p_guardian, 'update', NULL, ARRAY['full_name','phone','email','is_active']);
END $$;

CREATE OR REPLACE FUNCTION public.link_guardian_to_student(
  p_guardian uuid, p_student uuid, p_relationship_type text,
  p_is_primary_contact boolean DEFAULT false, p_is_legal_guardian boolean DEFAULT true,
  p_receives_updates boolean DEFAULT true, p_emergency_priority smallint DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM public.ppl_assert('people.relationships.manage');
  IF NOT EXISTS (SELECT 1 FROM public.guardians WHERE id = p_guardian) THEN RAISE EXCEPTION 'guardian_not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student) THEN RAISE EXCEPTION 'student_not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.student_guardians
             WHERE guardian_id = p_guardian AND student_id = p_student AND active_to IS NULL) THEN
    RAISE EXCEPTION 'active_link_already_exists';
  END IF;
  INSERT INTO public.student_guardians
    (student_id, guardian_id, relationship_type, is_primary_contact, is_legal_guardian, receives_updates, emergency_priority, created_by)
  VALUES (p_student, p_guardian, p_relationship_type, p_is_primary_contact, p_is_legal_guardian, p_receives_updates, p_emergency_priority, auth.uid())
  RETURNING id INTO v_id;
  PERFORM public.ppl_log('student_guardian', v_id, 'link', p_student, ARRAY['relationship_type']);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_student_guardian_relationship(
  p_link uuid, p_relationship_type text, p_is_primary_contact boolean,
  p_is_legal_guardian boolean, p_receives_updates boolean, p_emergency_priority smallint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_student uuid;
BEGIN
  PERFORM public.ppl_assert('people.relationships.manage');
  UPDATE public.student_guardians
  SET relationship_type = p_relationship_type, is_primary_contact = p_is_primary_contact,
      is_legal_guardian = p_is_legal_guardian, receives_updates = p_receives_updates,
      emergency_priority = p_emergency_priority
  WHERE id = p_link AND active_to IS NULL
  RETURNING student_id INTO v_student;
  IF v_student IS NULL THEN RAISE EXCEPTION 'active_link_not_found'; END IF;
  PERFORM public.ppl_log('student_guardian', p_link, 'update', v_student,
    ARRAY['relationship_type','is_primary_contact','is_legal_guardian','receives_updates','emergency_priority']);
END $$;

CREATE OR REPLACE FUNCTION public.unlink_guardian_from_student(p_link uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_student uuid;
BEGIN
  PERFORM public.ppl_assert('people.relationships.manage');
  UPDATE public.student_guardians SET active_to = now()
  WHERE id = p_link AND active_to IS NULL
  RETURNING student_id INTO v_student;
  IF v_student IS NULL THEN RAISE EXCEPTION 'active_link_not_found'; END IF;
  PERFORM public.ppl_log('student_guardian', p_link, 'unlink', v_student, NULL);
END $$;

-- ── 8. RPCs — staff ──
CREATE OR REPLACE FUNCTION public.list_staff_members(p_search text DEFAULT NULL, p_active_only boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb;
BEGIN
  PERFORM public.ppl_assert('people.staff.view');
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', s.id, 'full_name', s.full_name,
      'phone', CASE WHEN public.has_permission(auth.uid(), 'people.staff.manage') THEN s.phone END,
      'email', CASE WHEN public.has_permission(auth.uid(), 'people.staff.manage') THEN s.email END,
      'is_active', s.is_active, 'has_account', s.auth_user_id IS NOT NULL,
      'roles', COALESCE((SELECT array_agg(r.role_type) FROM public.staff_member_roles r WHERE r.staff_member_id = s.id), '{}'),
      'linked_students', (SELECT count(*) FROM public.student_coach_assignments a
                          WHERE a.staff_member_id = s.id AND a.active_to IS NULL)
    ) ORDER BY s.full_name), '[]'::jsonb) INTO v
  FROM public.staff_members s
  WHERE (NOT p_active_only OR s.is_active)
    AND (p_search IS NULL OR s.full_name ILIKE '%' || p_search || '%')
  LIMIT 500;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.get_staff_member_details(p_staff uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb;
BEGIN
  PERFORM public.ppl_assert('people.staff.view');
  SELECT jsonb_build_object(
    'staff', jsonb_build_object(
      'id', s.id, 'full_name', s.full_name,
      'phone', CASE WHEN public.has_permission(auth.uid(), 'people.staff.manage') THEN s.phone END,
      'email', CASE WHEN public.has_permission(auth.uid(), 'people.staff.manage') THEN s.email END,
      'is_active', s.is_active, 'has_account', s.auth_user_id IS NOT NULL,
      'created_at', s.created_at, 'updated_at', s.updated_at),
    'roles', COALESCE((SELECT jsonb_agg(r.role_type) FROM public.staff_member_roles r WHERE r.staff_member_id = s.id), '[]'::jsonb),
    'assignments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'assignment_id', a.id, 'student_id', a.student_id, 'student_name', st.full_name,
        'role_type', a.role_type, 'active', a.active_to IS NULL,
        'active_from', a.active_from, 'active_to', a.active_to))
      FROM public.student_coach_assignments a
      JOIN public.students st ON st.id = a.student_id
      WHERE a.staff_member_id = s.id), '[]'::jsonb)
  ) INTO v FROM public.staff_members s WHERE s.id = p_staff;
  IF v IS NULL THEN RAISE EXCEPTION 'staff_member_not_found'; END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.create_staff_member(p_full_name text, p_phone text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM public.ppl_assert('people.staff.manage');
  INSERT INTO public.staff_members (full_name, phone, email)
  VALUES (trim(p_full_name), NULLIF(trim(p_phone), ''), NULLIF(trim(p_email), ''))
  RETURNING id INTO v_id;
  PERFORM public.ppl_log('staff_member', v_id, 'create', NULL, ARRAY['full_name','phone','email']);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_staff_member(p_staff uuid, p_full_name text, p_phone text, p_email text, p_is_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_n int;
BEGIN
  PERFORM public.ppl_assert('people.staff.manage');
  UPDATE public.staff_members
  SET full_name = trim(p_full_name), phone = NULLIF(trim(p_phone), ''),
      email = NULLIF(trim(p_email), ''), is_active = p_is_active
  WHERE id = p_staff;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RAISE EXCEPTION 'staff_member_not_found'; END IF;
  PERFORM public.ppl_log('staff_member', p_staff, 'update', NULL, ARRAY['full_name','phone','email','is_active']);
END $$;

CREATE OR REPLACE FUNCTION public.set_staff_member_roles(p_staff uuid, p_roles text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_bad int;
BEGIN
  PERFORM public.ppl_assert('people.staff.manage');
  IF NOT EXISTS (SELECT 1 FROM public.staff_members WHERE id = p_staff) THEN RAISE EXCEPTION 'staff_member_not_found'; END IF;
  IF p_roles IS NULL OR array_length(p_roles, 1) > 5 THEN RAISE EXCEPTION 'invalid_roles'; END IF;
  SELECT count(*) INTO v_bad FROM unnest(p_roles) r
   WHERE r NOT IN ('coach','madrich','teacher','support','other');
  IF v_bad > 0 THEN RAISE EXCEPTION 'invalid_roles'; END IF;
  DELETE FROM public.staff_member_roles WHERE staff_member_id = p_staff;
  INSERT INTO public.staff_member_roles (staff_member_id, role_type)
  SELECT DISTINCT p_staff, r FROM unnest(p_roles) AS r;
  PERFORM public.ppl_log('staff_member', p_staff, 'set_roles', NULL, p_roles);
END $$;

CREATE OR REPLACE FUNCTION public.link_coach_to_student(p_staff uuid, p_student uuid, p_role_type text DEFAULT 'primary')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM public.ppl_assert('people.relationships.manage');
  IF NOT EXISTS (SELECT 1 FROM public.staff_members WHERE id = p_staff) THEN RAISE EXCEPTION 'staff_member_not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student) THEN RAISE EXCEPTION 'student_not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.student_coach_assignments
             WHERE staff_member_id = p_staff AND student_id = p_student
               AND role_type = p_role_type AND active_to IS NULL) THEN
    RAISE EXCEPTION 'active_assignment_already_exists';
  END IF;
  INSERT INTO public.student_coach_assignments (student_id, staff_member_id, role_type, created_by)
  VALUES (p_student, p_staff, p_role_type, auth.uid())
  RETURNING id INTO v_id;
  PERFORM public.ppl_log('student_coach', v_id, 'link', p_student, ARRAY['role_type']);
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_student_coach_assignment(p_assignment uuid, p_role_type text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_student uuid;
BEGIN
  PERFORM public.ppl_assert('people.relationships.manage');
  UPDATE public.student_coach_assignments SET role_type = p_role_type
  WHERE id = p_assignment AND active_to IS NULL
  RETURNING student_id INTO v_student;
  IF v_student IS NULL THEN RAISE EXCEPTION 'active_assignment_not_found'; END IF;
  PERFORM public.ppl_log('student_coach', p_assignment, 'update', v_student, ARRAY['role_type']);
END $$;

CREATE OR REPLACE FUNCTION public.unlink_coach_from_student(p_assignment uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_student uuid;
BEGIN
  PERFORM public.ppl_assert('people.relationships.manage');
  UPDATE public.student_coach_assignments SET active_to = now()
  WHERE id = p_assignment AND active_to IS NULL
  RETURNING student_id INTO v_student;
  IF v_student IS NULL THEN RAISE EXCEPTION 'active_assignment_not_found'; END IF;
  PERFORM public.ppl_log('student_coach', p_assignment, 'unlink', v_student, NULL);
END $$;

-- ── 9. Function privileges: authenticated only, never PUBLIC ──
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'list_guardians(text, boolean)',
    'get_guardian_details(uuid)',
    'create_guardian(text, text, text)',
    'update_guardian(uuid, text, text, text, boolean)',
    'link_guardian_to_student(uuid, uuid, text, boolean, boolean, boolean, smallint)',
    'update_student_guardian_relationship(uuid, text, boolean, boolean, boolean, smallint)',
    'unlink_guardian_from_student(uuid)',
    'list_staff_members(text, boolean)',
    'get_staff_member_details(uuid)',
    'create_staff_member(text, text, text)',
    'update_staff_member(uuid, text, text, text, boolean)',
    'set_staff_member_roles(uuid, text[])',
    'link_coach_to_student(uuid, uuid, text)',
    'update_student_coach_assignment(uuid, text)',
    'unlink_coach_from_student(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

-- ── 10. Self-tests (no people created; sub-transaction rolls back) ──
DO $$
DECLARE v_perms int; v_grants int; v_alias int; v_auth_rpcs int;
        t1 boolean; t2 boolean; t3 boolean; t4 boolean;
BEGIN
  SELECT count(*) INTO v_perms FROM public.permissions WHERE category = 'people';
  SELECT count(*) INTO v_grants FROM public.role_permissions WHERE permission_key LIKE 'people.%';
  SELECT count(*) INTO v_alias FROM public.sport_aliases;
  t1 := NOT public.has_guardian_scope(gen_random_uuid(), gen_random_uuid());
  t2 := NOT public.has_coach_scope(gen_random_uuid(), gen_random_uuid());
  BEGIN
    INSERT INTO public.people_audit_log (entity_type, action) VALUES ('selftest', 'x');
    UPDATE public.people_audit_log SET action = 'y' WHERE entity_type = 'selftest';
    t3 := false;
  EXCEPTION WHEN OTHERS THEN t3 := true;
  END;
  -- PROOF: none of the 15 people RPCs assigns auth_user_id (reads like
  -- "auth_user_id IS NOT NULL" for has_account are fine); account
  -- linking arrives only in stage 3E.
  SELECT count(*) INTO v_auth_rpcs
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('list_guardians','get_guardian_details','create_guardian','update_guardian',
                      'link_guardian_to_student','update_student_guardian_relationship','unlink_guardian_from_student',
                      'list_staff_members','get_staff_member_details','create_staff_member','update_staff_member',
                      'set_staff_member_roles','link_coach_to_student','update_student_coach_assignment','unlink_coach_from_student')
    AND p.prosrc ~* 'auth_user_id\s*=';
  t4 := (v_auth_rpcs = 0);
  RAISE NOTICE 'STAGE3A: people_permissions=% (expected 5) role_grants=% (expected 0) aliases=% (expected 6) guardian_scope_false=% coach_scope_false=% audit_append_only=% no_rpc_touches_auth_user_id=%',
    v_perms, v_grants, v_alias, t1, t2, t3, t4;
END $$;
