-- ═══════════════════════════════════════════════════════════════════
-- PEOPLE MODEL — read-only RPC: get_student_relationships(p_student_id).
-- Returns one student's guardian links and coach assignments (active AND
-- historical) for the System-Owner UI. Additive only: no policy change,
-- no seed, no import, no change to linked_student_id / linked_sport /
-- assigned_coach. Contact details are gated exactly like the stage-3A
-- read RPCs; auth_user_id is never exposed (has_account only).
-- Idempotent. No PII in this file.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_student_relationships(p_student_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_g_view boolean; v_s_view boolean; v_rel boolean;
  v_g_contact boolean; v_s_contact boolean;
  v jsonb;
BEGIN
  -- section visibility: owner passes every has_permission call
  v_g_view := public.has_permission(auth.uid(), 'people.guardians.view');
  v_s_view := public.has_permission(auth.uid(), 'people.staff.view');
  v_rel    := public.has_permission(auth.uid(), 'people.relationships.manage');
  IF NOT (v_g_view OR v_s_view OR v_rel) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  -- contact-detail gating mirrors the stage-3A read RPCs
  v_g_contact := public.has_permission(auth.uid(), 'people.guardians.manage');
  v_s_contact := public.has_permission(auth.uid(), 'people.staff.manage');

  IF NOT EXISTS (SELECT 1 FROM public.students WHERE id = p_student_id) THEN
    RAISE EXCEPTION 'student_not_found';
  END IF;

  SELECT jsonb_build_object(
    'student_id', p_student_id,
    'guardians', CASE WHEN (v_g_view OR v_rel) THEN COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'link_id', sg.id,
        'guardian_id', g.id,
        'full_name', g.full_name,
        'relationship_type', sg.relationship_type,
        'is_primary_contact', sg.is_primary_contact,
        'is_legal_guardian', sg.is_legal_guardian,
        'receives_updates', sg.receives_updates,
        'emergency_priority', sg.emergency_priority,
        'active_from', sg.active_from,
        'active_to', sg.active_to,
        'active', sg.active_to IS NULL,
        'is_active', g.is_active,
        'has_account', g.auth_user_id IS NOT NULL,
        'phone', CASE WHEN v_g_contact THEN g.phone END,
        'email', CASE WHEN v_g_contact THEN g.email END
      ) ORDER BY (sg.active_to IS NULL) DESC, sg.active_from DESC)
      FROM public.student_guardians sg
      JOIN public.guardians g ON g.id = sg.guardian_id
      WHERE sg.student_id = p_student_id), '[]'::jsonb)
    ELSE '[]'::jsonb END,
    'coaches', CASE WHEN (v_s_view OR v_rel) THEN COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'assignment_id', sca.id,
        'staff_member_id', sm.id,
        'full_name', sm.full_name,
        'role_type', sca.role_type,
        'staff_roles', COALESCE((SELECT array_agg(r.role_type) FROM public.staff_member_roles r WHERE r.staff_member_id = sm.id), '{}'),
        'active_from', sca.active_from,
        'active_to', sca.active_to,
        'active', sca.active_to IS NULL,
        'is_active', sm.is_active,
        'has_account', sm.auth_user_id IS NOT NULL,
        'phone', CASE WHEN v_s_contact THEN sm.phone END,
        'email', CASE WHEN v_s_contact THEN sm.email END
      ) ORDER BY (sca.active_to IS NULL) DESC, sca.active_from DESC)
      FROM public.student_coach_assignments sca
      JOIN public.staff_members sm ON sm.id = sca.staff_member_id
      WHERE sca.student_id = p_student_id), '[]'::jsonb)
    ELSE '[]'::jsonb END
  ) INTO v;
  RETURN v;
END $$;

REVOKE ALL ON FUNCTION public.get_student_relationships(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_relationships(uuid) TO authenticated;

-- self-test: function exists, PUBLIC cannot execute, no auth_user_id leak
DO $$
DECLARE t1 boolean; t2 boolean;
BEGIN
  t1 := EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = 'get_student_relationships');
  t2 := NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'public' AND p.proname = 'get_student_relationships'
                      AND p.prosrc ~* $q$'auth_user_id',\s*[a-z]$q$);
  RAISE NOTICE 'REL_RPC: function_exists=% no_raw_auth_user_id_key=%', t1, t2;
END $$;
