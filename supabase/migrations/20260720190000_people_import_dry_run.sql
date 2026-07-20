-- ═══════════════════════════════════════════════════════════════════
-- PEOPLE MODEL — STAGE 3D.1: server-side import DRY RUN.
-- prepare_people_import_dry_run(p_payload jsonb) re-verifies, against
-- the live DB, what is new / unchanged / update / historical / conflict
-- / skipped — WITHOUT creating or updating anything. Both functions are
-- declared STABLE, so PostgreSQL itself rejects any INSERT/UPDATE/DELETE
-- inside them: zero writes is enforced by the engine, not by discipline.
-- System Owner only. can_import is ALWAYS false at this stage.
-- The server never trusts browser counts: it classifies every payload
-- row independently. Undecided conflicts always stay skipped; no
-- decision is ever taken automatically.
-- Errors and blockers carry codes and item indexes only — never a
-- national id, phone, email or name. No PII in this file or its tests.
-- Idempotent; safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. normalization helpers (internal, not granted) ──
CREATE OR REPLACE FUNCTION public.ppl_norm_nid(t text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN length(d) BETWEEN 7 AND 8 THEN lpad(d, 9, '0')
    ELSE d
  END
  FROM (SELECT regexp_replace(coalesce(t, ''), '\D', '', 'g') AS d) x;
$$;
CREATE OR REPLACE FUNCTION public.ppl_norm_name(t text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT lower(regexp_replace(trim(coalesce(t, '')), '\s+', ' ', 'g'));
$$;
REVOKE ALL ON FUNCTION public.ppl_norm_nid(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ppl_norm_name(text) FROM PUBLIC;

-- ── 2. internal classifier (no auth gate; NOT granted to any role) ──
CREATE OR REPLACE FUNCTION public.ppl_dry_run_classify(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_new int := 0; v_unchanged int := 0; v_updates int := 0; v_hist int := 0;
  v_conf int := 0; v_skipped int := 0;
  v_blockers text[] := '{}';
  v_total int := 0; v_classified int := 0;
  e jsonb; k text; i int; n int;
  v_nid text; v_name text; v_phone text; v_sid uuid; v_rel text; v_role text;
  v_gid uuid; v_smid uuid; v_active_type text; v_key text; v_dec text;
  seen jsonb := '{}'::jsonb;
  case_keys jsonb := '{}'::jsonb;
  seen_dec jsonb := '{}'::jsonb;
  v_cases int := 0; v_decided int := 0;
BEGIN
  -- structural validation: masked errors only (codes + indexes, no values)
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;
  IF pg_column_size(p_payload) > 1048576 THEN
    RAISE EXCEPTION 'payload_too_large';
  END IF;
  IF (p_payload->>'version') IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'unsupported_payload_version';
  END IF;
  FOR k IN SELECT jsonb_object_keys(p_payload) LOOP
    IF k NOT IN ('version', 'students', 'guardian_links', 'coach_links', 'conflicts', 'decisions') THEN
      RAISE EXCEPTION 'unknown_field:%', k;
    END IF;
  END LOOP;
  FOR k IN SELECT unnest(ARRAY['students', 'guardian_links', 'coach_links', 'conflicts', 'decisions']) LOOP
    IF p_payload ? k AND jsonb_typeof(p_payload->k) <> 'array' THEN
      RAISE EXCEPTION 'invalid_payload:%', k;
    END IF;
  END LOOP;
  IF jsonb_array_length(coalesce(p_payload->'students', '[]'::jsonb)) > 1000
     OR jsonb_array_length(coalesce(p_payload->'guardian_links', '[]'::jsonb)) > 3000
     OR jsonb_array_length(coalesce(p_payload->'coach_links', '[]'::jsonb)) > 3000
     OR jsonb_array_length(coalesce(p_payload->'conflicts', '[]'::jsonb)) > 500
     OR jsonb_array_length(coalesce(p_payload->'decisions', '[]'::jsonb)) > 500 THEN
    RAISE EXCEPTION 'payload_too_large';
  END IF;

  -- ── planned NEW students: re-verified against public.students ──
  n := jsonb_array_length(coalesce(p_payload->'students', '[]'::jsonb));
  FOR i IN 0 .. n - 1 LOOP
    v_total := v_total + 1;
    e := p_payload->'students'->i;
    IF jsonb_typeof(e) <> 'object' THEN RAISE EXCEPTION 'invalid_payload:students[%]', i; END IF;
    FOR k IN SELECT jsonb_object_keys(e) LOOP
      IF k NOT IN ('national_id', 'full_name', 'class_name', 'sport', 'birth_year') THEN
        RAISE EXCEPTION 'unknown_field:students[%].%', i, k;
      END IF;
    END LOOP;
    IF e ? 'birth_year' AND jsonb_typeof(e->'birth_year') NOT IN ('number', 'null') THEN
      RAISE EXCEPTION 'invalid_payload:students[%]', i;
    END IF;
    v_name := public.ppl_norm_name(e->>'full_name');
    IF length(v_name) < 1 OR length(v_name) > 120
       OR length(coalesce(e->>'national_id', '')) > 20
       OR length(coalesce(e->>'class_name', '')) > 40
       OR length(coalesce(e->>'sport', '')) > 60 THEN
      RAISE EXCEPTION 'invalid_payload:students[%]', i;
    END IF;
    v_nid := public.ppl_norm_nid(e->>'national_id');
    v_key := CASE WHEN length(v_nid) = 9 THEN 's:n:' || v_nid ELSE 's:m:' || v_name END;
    IF seen ? v_key THEN
      v_conf := v_conf + 1; v_classified := v_classified + 1;
      v_blockers := v_blockers || format('duplicate_student_in_payload at students[%s]', i);
      CONTINUE;
    END IF;
    seen := seen || jsonb_build_object(v_key, true);
    IF length(v_nid) = 9 AND EXISTS (
      SELECT 1 FROM public.students s WHERE public.ppl_norm_nid(s.national_id) = v_nid
    ) THEN
      v_conf := v_conf + 1; v_classified := v_classified + 1;
      v_blockers := v_blockers || format('student_already_exists at students[%s]', i);
      CONTINUE;
    END IF;
    IF length(v_nid) <> 9 AND EXISTS (
      SELECT 1 FROM public.students s WHERE public.ppl_norm_name(s.full_name) = v_name
    ) THEN
      v_conf := v_conf + 1; v_classified := v_classified + 1;
      v_blockers := v_blockers || format('student_name_exists at students[%s]', i);
      CONTINUE;
    END IF;
    v_new := v_new + 1; v_classified := v_classified + 1;
  END LOOP;

  -- ── planned guardian-student links ──
  n := jsonb_array_length(coalesce(p_payload->'guardian_links', '[]'::jsonb));
  FOR i IN 0 .. n - 1 LOOP
    v_total := v_total + 1;
    e := p_payload->'guardian_links'->i;
    IF jsonb_typeof(e) <> 'object' THEN RAISE EXCEPTION 'invalid_payload:guardian_links[%]', i; END IF;
    FOR k IN SELECT jsonb_object_keys(e) LOOP
      IF k NOT IN ('guardian_name', 'guardian_phone', 'student_id', 'relationship_type') THEN
        RAISE EXCEPTION 'unknown_field:guardian_links[%].%', i, k;
      END IF;
    END LOOP;
    v_rel := coalesce(e->>'relationship_type', '');
    IF v_rel NOT IN ('mother', 'father', 'guardian', 'other') THEN
      RAISE EXCEPTION 'invalid_payload:guardian_links[%]', i;
    END IF;
    v_name := public.ppl_norm_name(e->>'guardian_name');
    v_phone := regexp_replace(coalesce(e->>'guardian_phone', ''), '\D', '', 'g');
    IF (length(v_name) < 1 AND v_phone = '') OR length(v_name) > 120 OR length(v_phone) > 15 THEN
      RAISE EXCEPTION 'invalid_payload:guardian_links[%]', i;
    END IF;
    BEGIN
      v_sid := (e->>'student_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'invalid_payload:guardian_links[%]', i;
    END;
    v_key := 'g:' || coalesce(nullif(v_phone, ''), v_name) || ':' || v_sid;
    IF seen ? v_key THEN
      v_conf := v_conf + 1; v_classified := v_classified + 1;
      v_blockers := v_blockers || format('duplicate_guardian_link_in_payload at guardian_links[%s]', i);
      CONTINUE;
    END IF;
    seen := seen || jsonb_build_object(v_key, true);
    IF NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = v_sid) THEN
      v_conf := v_conf + 1; v_classified := v_classified + 1;
      v_blockers := v_blockers || format('unknown_student at guardian_links[%s]', i);
      CONTINUE;
    END IF;
    v_gid := NULL;
    IF v_phone <> '' THEN
      SELECT g.id INTO v_gid FROM public.guardians g
      WHERE regexp_replace(coalesce(g.phone, ''), '\D', '', 'g') = v_phone
      ORDER BY g.created_at LIMIT 1;
    END IF;
    IF v_gid IS NULL THEN
      v_new := v_new + 1; v_classified := v_classified + 1;
      CONTINUE;
    END IF;
    v_active_type := NULL;
    SELECT sg.relationship_type INTO v_active_type
    FROM public.student_guardians sg
    WHERE sg.guardian_id = v_gid AND sg.student_id = v_sid AND sg.active_to IS NULL
    LIMIT 1;
    IF v_active_type IS NOT NULL THEN
      IF v_active_type = v_rel THEN v_unchanged := v_unchanged + 1; ELSE v_updates := v_updates + 1; END IF;
      v_classified := v_classified + 1;
    ELSIF EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.guardian_id = v_gid AND sg.student_id = v_sid AND sg.active_to IS NOT NULL
    ) THEN
      v_hist := v_hist + 1; v_classified := v_classified + 1;
    ELSE
      v_new := v_new + 1; v_classified := v_classified + 1;
    END IF;
  END LOOP;

  -- ── planned coach-student links ──
  n := jsonb_array_length(coalesce(p_payload->'coach_links', '[]'::jsonb));
  FOR i IN 0 .. n - 1 LOOP
    v_total := v_total + 1;
    e := p_payload->'coach_links'->i;
    IF jsonb_typeof(e) <> 'object' THEN RAISE EXCEPTION 'invalid_payload:coach_links[%]', i; END IF;
    FOR k IN SELECT jsonb_object_keys(e) LOOP
      IF k NOT IN ('coach_name', 'student_id', 'role_type') THEN
        RAISE EXCEPTION 'unknown_field:coach_links[%].%', i, k;
      END IF;
    END LOOP;
    v_role := coalesce(e->>'role_type', 'primary');
    IF v_role NOT IN ('primary', 'assistant', 'other') THEN
      RAISE EXCEPTION 'invalid_payload:coach_links[%]', i;
    END IF;
    v_name := public.ppl_norm_name(e->>'coach_name');
    IF length(v_name) < 1 OR length(v_name) > 120 THEN
      RAISE EXCEPTION 'invalid_payload:coach_links[%]', i;
    END IF;
    BEGIN
      v_sid := (e->>'student_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'invalid_payload:coach_links[%]', i;
    END;
    v_key := 'c:' || v_name || ':' || v_sid;
    IF seen ? v_key THEN
      v_conf := v_conf + 1; v_classified := v_classified + 1;
      v_blockers := v_blockers || format('duplicate_coach_link_in_payload at coach_links[%s]', i);
      CONTINUE;
    END IF;
    seen := seen || jsonb_build_object(v_key, true);
    IF NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = v_sid) THEN
      v_conf := v_conf + 1; v_classified := v_classified + 1;
      v_blockers := v_blockers || format('unknown_student at coach_links[%s]', i);
      CONTINUE;
    END IF;
    v_smid := NULL;
    SELECT sm.id INTO v_smid FROM public.staff_members sm
    WHERE public.ppl_norm_name(sm.full_name) = v_name
    ORDER BY sm.created_at LIMIT 1;
    IF v_smid IS NULL THEN
      v_new := v_new + 1; v_classified := v_classified + 1;
    ELSIF EXISTS (
      SELECT 1 FROM public.student_coach_assignments sca
      WHERE sca.staff_member_id = v_smid AND sca.student_id = v_sid AND sca.active_to IS NULL
    ) THEN
      v_unchanged := v_unchanged + 1; v_classified := v_classified + 1;
    ELSIF EXISTS (
      SELECT 1 FROM public.student_coach_assignments sca
      WHERE sca.staff_member_id = v_smid AND sca.student_id = v_sid AND sca.active_to IS NOT NULL
    ) THEN
      v_hist := v_hist + 1; v_classified := v_classified + 1;
    ELSE
      v_new := v_new + 1; v_classified := v_classified + 1;
    END IF;
  END LOOP;

  -- ── conflict cases + human decisions: NEVER auto-resolved ──
  n := jsonb_array_length(coalesce(p_payload->'conflicts', '[]'::jsonb));
  FOR i IN 0 .. n - 1 LOOP
    e := p_payload->'conflicts'->i;
    IF jsonb_typeof(e) <> 'object' THEN RAISE EXCEPTION 'invalid_payload:conflicts[%]', i; END IF;
    FOR k IN SELECT jsonb_object_keys(e) LOOP
      IF k <> 'key' THEN RAISE EXCEPTION 'unknown_field:conflicts[%].%', i, k; END IF;
    END LOOP;
    v_key := coalesce(e->>'key', '');
    IF length(v_key) < 1 OR length(v_key) > 60 THEN RAISE EXCEPTION 'invalid_payload:conflicts[%]', i; END IF;
    IF case_keys ? v_key THEN
      v_blockers := v_blockers || format('duplicate_conflict_case at conflicts[%s]', i);
      CONTINUE;
    END IF;
    case_keys := case_keys || jsonb_build_object(v_key, true);
    v_cases := v_cases + 1;
  END LOOP;
  n := jsonb_array_length(coalesce(p_payload->'decisions', '[]'::jsonb));
  FOR i IN 0 .. n - 1 LOOP
    e := p_payload->'decisions'->i;
    IF jsonb_typeof(e) <> 'object' THEN RAISE EXCEPTION 'invalid_payload:decisions[%]', i; END IF;
    FOR k IN SELECT jsonb_object_keys(e) LOOP
      IF k NOT IN ('key', 'decision') THEN RAISE EXCEPTION 'unknown_field:decisions[%].%', i, k; END IF;
    END LOOP;
    v_key := coalesce(e->>'key', '');
    v_dec := coalesce(e->>'decision', '');
    IF v_dec NOT IN ('link', 'create', 'skip', 'defer') THEN
      RAISE EXCEPTION 'invalid_payload:decisions[%]', i;
    END IF;
    IF NOT case_keys ? v_key THEN
      v_blockers := v_blockers || format('unknown_decision_case at decisions[%s]', i);
      CONTINUE;
    END IF;
    IF seen_dec ? v_key THEN
      v_blockers := v_blockers || format('duplicate_decision at decisions[%s]', i);
      CONTINUE;
    END IF;
    seen_dec := seen_dec || jsonb_build_object(v_key, true);
    -- only an explicit link/create decision counts as a decided conflict;
    -- skip, defer and "no decision" all remain skipped
    IF v_dec IN ('link', 'create') THEN v_decided := v_decided + 1; END IF;
  END LOOP;
  v_conf := v_conf + v_decided;
  v_skipped := v_cases - v_decided;

  RETURN jsonb_build_object(
    'fingerprint', encode(sha256(convert_to(p_payload::text, 'UTF8')), 'hex'),
    'counts', jsonb_build_object(
      'new', v_new, 'unchanged', v_unchanged, 'updates', v_updates,
      'historical', v_hist, 'conflicts', v_conf, 'skipped', v_skipped),
    'conservation_passed', (v_classified = v_total) AND (v_decided + v_skipped = v_cases),
    'blockers', to_jsonb(v_blockers),
    'can_import', false
  );
END $$;
REVOKE ALL ON FUNCTION public.ppl_dry_run_classify(jsonb) FROM PUBLIC;

-- ── 3. public RPC: owner gate + masked errors ──
CREATE OR REPLACE FUNCTION public.prepare_people_import_dry_run(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_system_owner(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  RETURN public.ppl_dry_run_classify(p_payload);
EXCEPTION WHEN OTHERS THEN
  -- structured codes pass through; anything unexpected is masked
  IF SQLERRM = 'not_authorized'
     OR SQLERRM IN ('payload_too_large', 'unsupported_payload_version')
     OR SQLERRM LIKE 'invalid_payload%'
     OR SQLERRM LIKE 'unknown_field%' THEN
    RAISE;
  END IF;
  RAISE EXCEPTION 'dry_run_failed';
END $$;
REVOKE ALL ON FUNCTION public.prepare_people_import_dry_run(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_people_import_dry_run(jsonb) TO authenticated;

-- ── 4. self-tests: fixtures live ONLY inside a rolled-back
--     sub-transaction; both functions are STABLE so the engine itself
--     forbids writes inside them. Synthetic values only, zero PII. ──
DO $$
DECLARE
  t_stable boolean; t_auth boolean := false; t_big boolean := false;
  t_idem boolean; t_dup boolean; t_unchanged boolean; t_hist boolean;
  t_skip boolean; t_baddec boolean; t_fp boolean; t_zero boolean;
  r1 jsonb; r2 jsonb; r3 jsonb;
  v_sid uuid; v_g1 uuid; v_g2 uuid;
  c_students int; c_guardians int; c_links int;
  c_students2 int; c_guardians2 int; c_links2 int;
  p1 jsonb; p2 jsonb;
BEGIN
  -- both functions must be STABLE (provolatile = 's') → engine-level zero-write
  SELECT bool_and(p.provolatile = 's') INTO t_stable
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public'
    AND p.proname IN ('ppl_dry_run_classify', 'prepare_people_import_dry_run');

  -- unauthenticated caller (auth.uid() is NULL in the SQL editor) → not_authorized
  BEGIN
    PERFORM public.prepare_people_import_dry_run('{"version":1}'::jsonb);
  EXCEPTION WHEN OTHERS THEN
    t_auth := (SQLERRM = 'not_authorized');
  END;

  -- oversized payload rejected
  BEGIN
    PERFORM public.ppl_dry_run_classify(
      jsonb_build_object('version', 1, 'students', '[]'::jsonb,
                         'conflicts', '[]'::jsonb)
      || jsonb_build_object('decisions', (SELECT jsonb_agg(jsonb_build_object('key', 'k' || g, 'decision', 'skip')) FROM generate_series(1, 501) g)));
  EXCEPTION WHEN OTHERS THEN
    t_big := (SQLERRM = 'payload_too_large');
  END;

  SELECT count(*) INTO c_students FROM public.students;
  SELECT count(*) INTO c_guardians FROM public.guardians;
  SELECT count(*) INTO c_links FROM public.student_guardians;

  BEGIN
    -- fixtures (rolled back below): one student, one guardian with an
    -- ACTIVE link, one guardian with a CLOSED link
    INSERT INTO public.students (full_name, class_name, sport, national_id)
    VALUES ('בדיקת דמה', 'ט', 'סיוף', '123456782') RETURNING id INTO v_sid;
    INSERT INTO public.guardians (full_name, phone) VALUES ('הורה דמה א', '0500000001') RETURNING id INTO v_g1;
    INSERT INTO public.guardians (full_name, phone) VALUES ('הורה דמה ב', '0500000002') RETURNING id INTO v_g2;
    INSERT INTO public.student_guardians (student_id, guardian_id, relationship_type)
    VALUES (v_sid, v_g1, 'mother');
    INSERT INTO public.student_guardians (student_id, guardian_id, relationship_type, active_from, active_to)
    VALUES (v_sid, v_g2, 'father', now() - interval '2 year', now() - interval '1 year');

    p1 := jsonb_build_object(
      'version', 1,
      'students', jsonb_build_array(
        jsonb_build_object('national_id', '987654325', 'full_name', 'חדש דמה', 'class_name', 'י', 'sport', 'סיוף', 'birth_year', 2010),
        jsonb_build_object('national_id', '123456782', 'full_name', 'בדיקת דמה', 'class_name', 'ט', 'sport', 'סיוף', 'birth_year', null)),
      'guardian_links', jsonb_build_array(
        jsonb_build_object('guardian_name', 'הורה דמה א', 'guardian_phone', '0500000001', 'student_id', v_sid, 'relationship_type', 'mother'),
        jsonb_build_object('guardian_name', 'הורה דמה ב', 'guardian_phone', '0500000002', 'student_id', v_sid, 'relationship_type', 'father'),
        jsonb_build_object('guardian_name', 'הורה חדש דמה', 'guardian_phone', '0500000003', 'student_id', v_sid, 'relationship_type', 'father'),
        jsonb_build_object('guardian_name', 'הורה חדש דמה', 'guardian_phone', '0500000003', 'student_id', v_sid, 'relationship_type', 'father')),
      'coach_links', '[]'::jsonb,
      'conflicts', jsonb_build_array(jsonb_build_object('key', 'case-1'), jsonb_build_object('key', 'case-2')),
      'decisions', jsonb_build_array(
        jsonb_build_object('key', 'case-2', 'decision', 'link'),
        jsonb_build_object('key', 'no-such-case', 'decision', 'skip')));

    r1 := public.ppl_dry_run_classify(p1);
    r2 := public.ppl_dry_run_classify(p1);
    t_idem := (r1 = r2);
    -- expected: students → 1 new + 1 conflict (already exists);
    -- guardian links → 1 unchanged + 1 historical + 1 new + 1 duplicate-conflict;
    -- cases → 1 decided conflict + 1 skipped; unknown decision → blocker
    t_unchanged := ((r1->'counts'->>'unchanged')::int = 1);
    t_hist := ((r1->'counts'->>'historical')::int = 1);
    t_dup := (r1->'blockers')::text LIKE '%duplicate_guardian_link_in_payload%'
             AND (r1->'blockers')::text LIKE '%student_already_exists%';
    t_skip := ((r1->'counts'->>'skipped')::int = 1) AND ((r1->'counts'->>'conflicts')::int = 3);
    t_baddec := (r1->'blockers')::text LIKE '%unknown_decision_case%';

    p2 := jsonb_set(p1, '{decisions,0,decision}', '"skip"');
    r3 := public.ppl_dry_run_classify(p2);
    t_fp := (r1->>'fingerprint') <> (r3->>'fingerprint')
            AND (r1->>'can_import') = 'false' AND (r3->>'can_import') = 'false'
            AND (r1->>'conservation_passed') = 'true';

    RAISE EXCEPTION 'ROLLBACK_FIXTURES';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'ROLLBACK_FIXTURES' THEN RAISE; END IF;
  END;

  SELECT count(*) INTO c_students2 FROM public.students;
  SELECT count(*) INTO c_guardians2 FROM public.guardians;
  SELECT count(*) INTO c_links2 FROM public.student_guardians;
  t_zero := (c_students = c_students2) AND (c_guardians = c_guardians2) AND (c_links = c_links2);

  RAISE NOTICE 'DRY_RUN: stable_zero_write=% auth_blocked=% oversize_blocked=% idempotent=% dup_and_exists_blockers=% unchanged=% historical=% undecided_skipped=% unknown_decision_blocked=% fingerprint_changes=% row_counts_unchanged=%',
    t_stable, t_auth, t_big, t_idem, t_dup, t_unchanged, t_hist, t_skip, t_baddec, t_fp, t_zero;
END $$;
