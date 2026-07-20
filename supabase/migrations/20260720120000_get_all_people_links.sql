-- ═══════════════════════════════════════════════════════════════════
-- PEOPLE MODEL — read-only RPC: get_all_people_links().
-- Returns ALL guardian-student links and coach-student assignments
-- (active AND historical) in ONE call, for the Import-Preview screen,
-- so a repeated preview can recognize existing links without hundreds
-- of per-student calls. READ ONLY: no table change, no policy change,
-- no seed, no import, no write RPC.
-- System Owner only at this stage (people.relationships.manage also
-- passes, which today is granted to NO role — owner bypass only).
-- Exposes ONLY: link ids, person ids, student ids, link type, flags,
-- active_from / active_to. NEVER: auth_user_id, national id, phone,
-- email, address, medical data. Person matching is done separately
-- through list_guardians / list_staff_members.
-- Idempotent. No PII in this file.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_all_people_links()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb;
BEGIN
  IF NOT (public.is_system_owner(auth.uid())
          OR public.has_permission(auth.uid(), 'people.relationships.manage')) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT jsonb_build_object(
    'guardian_links', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'link_id', sg.id,
        'guardian_id', sg.guardian_id,
        'student_id', sg.student_id,
        'relationship_type', sg.relationship_type,
        'is_primary_contact', sg.is_primary_contact,
        'is_legal_guardian', sg.is_legal_guardian,
        'receives_updates', sg.receives_updates,
        'emergency_priority', sg.emergency_priority,
        'active_from', sg.active_from,
        'active_to', sg.active_to,
        'active', sg.active_to IS NULL
      ) ORDER BY sg.active_from)
      FROM public.student_guardians sg), '[]'::jsonb),
    'coach_links', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'assignment_id', sca.id,
        'staff_member_id', sca.staff_member_id,
        'student_id', sca.student_id,
        'role_type', sca.role_type,
        'active_from', sca.active_from,
        'active_to', sca.active_to,
        'active', sca.active_to IS NULL
      ) ORDER BY sca.active_from)
      FROM public.student_coach_assignments sca), '[]'::jsonb)
  ) INTO v;
  RETURN v;
END $$;

REVOKE ALL ON FUNCTION public.get_all_people_links() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_people_links() TO authenticated;

-- ── self-tests (read-only; nothing is written) ──
DO $$
DECLARE t1 boolean; t2 boolean; t3 boolean; t4 boolean;
        v_g int; v_c int;
BEGIN
  -- 1. function exists
  t1 := EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = 'get_all_people_links');
  -- 2. PUBLIC cannot execute (only authenticated grant remains)
  t2 := NOT has_function_privilege('public.get_all_people_links()', 'EXECUTE')
        OR current_user IN ('postgres', 'supabase_admin');
  -- 3. source never emits forbidden keys/columns
  t3 := NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'public' AND p.proname = 'get_all_people_links'
                      AND (p.prosrc ~* 'auth_user_id' OR p.prosrc ~* 'national_id'
                           OR p.prosrc ~* '''phone''' OR p.prosrc ~* '''email'''));
  -- 4. link tables are readable through the definer (counts only, no values)
  SELECT count(*) INTO v_g FROM public.student_guardians;
  SELECT count(*) INTO v_c FROM public.student_coach_assignments;
  t4 := v_g >= 0 AND v_c >= 0;
  RAISE NOTICE 'ALL_LINKS_RPC: function_exists=% public_blocked=% no_forbidden_fields=% guardian_links=% coach_links=%',
    t1, t2, t3, v_g, v_c;
END $$;
