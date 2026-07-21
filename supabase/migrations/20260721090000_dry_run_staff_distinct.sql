-- ═══════════════════════════════════════════════════════════════════
-- PEOPLE MODEL — STAGE 3D.3: staff duplicate resolution in the dry run.
-- Re-emits the v2 classifier with ONE addition: staff_people may carry
-- an optional distinct_seq, set ONLY by an explicit human decision that
-- two same-name rows are DIFFERENT people. The staff dedup key becomes
-- normalized-name + distinct_seq, so a human-resolved "separate" pair
-- is classified normally instead of blocked, while an UNDECIDED
-- duplicate keeps producing duplicate_person_in_payload. Nothing is
-- ever merged automatically; merge/dedupe/skip decisions are applied by
-- the browser when rebuilding staff_people, and the fingerprint changes
-- with them. Everything else is identical to stage 3D.2: STABLE (the
-- engine forbids writes), per-domain conservation, masked errors,
-- can_import ALWAYS false. Idempotent; no PII in this file.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. name helpers mirroring the browser exactly ──
CREATE OR REPLACE FUNCTION public.ppl_norm_key(t text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT replace(regexp_replace(coalesce(t, ''), '[\s''׳"״-]', '', 'g'), 'יי', 'י');
$$;
CREATE OR REPLACE FUNCTION public.ppl_name_fuzzy(a text, b text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT length(a) > 0 AND length(b) > 0 AND (
    position(a in b) > 0 OR position(b in a) > 0 OR
    (length(a) > 4 AND length(b) > 4 AND (left(a, 4) = left(b, 4) OR right(a, 4) = right(b, 4))));
$$;
REVOKE ALL ON FUNCTION public.ppl_norm_key(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ppl_name_fuzzy(text, text) FROM PUBLIC;

-- ── 2. classifier v2 (replaces v1; payload version must be 2) ──
CREATE OR REPLACE FUNCTION public.ppl_dry_run_classify(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  e jsonb; k text; i int; n int; v_key text; v_dec text;
  v_nid text; v_name text; v_phone text; v_sid uuid; v_rel text; v_role text;
  v_gid uuid; v_smid uuid; v_active_type text; v_variants int;
  blockers text[] := '{}';
  seen jsonb := '{}'::jsonb;          -- generic dedupe (namespaced keys)
  gp_map jsonb := '{}'::jsonb;        -- person ref → {phone, gid, conflict}
  pending_g text[] := '{}';           -- guardian refs awaiting new/skipped
  linkable jsonb := '{}'::jsonb;      -- person refs with >=1 linkable link
  cand_map jsonb := '{}'::jsonb;      -- candidate ref → normalized key
  staff_keys text[] := '{}';          -- payload staff normalized keys
  db_staff_keys text[];
  case_keys jsonb := '{}'::jsonb; seen_dec jsonb := '{}'::jsonb;
  st_new int := 0; st_exist int := 0; st_conf int := 0; st_skip int := 0; st_class int := 0; st_total int;
  gp_new int := 0; gp_exist int := 0; gp_conf int := 0; gp_skip int := 0; gp_class int := 0; gp_total int;
  gl_new int := 0; gl_unch int := 0; gl_upd int := 0; gl_hist int := 0; gl_conf int := 0; gl_skip int := 0; gl_class int := 0; gl_total int;
  sp_new int := 0; sp_exist int := 0; sp_poss int := 0; sp_conf int := 0; sp_skip int := 0; sp_class int := 0; sp_total int;
  cc_exact int := 0; cc_poss int := 0; cc_miss int := 0; cc_noise int := 0; cc_skip int := 0; cc_class int := 0; cc_total int;
  cl_new int := 0; cl_unch int := 0; cl_upd int := 0; cl_hist int := 0; cl_conf int := 0; cl_skip int := 0; cl_class int := 0; cl_total int;
  cases_total int := 0; cases_decided int := 0;
  r text;
BEGIN
  -- ── structural validation: masked errors only ──
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;
  IF pg_column_size(p_payload) > 1048576 THEN
    RAISE EXCEPTION 'payload_too_large';
  END IF;
  IF (p_payload->>'version') IS DISTINCT FROM '2' THEN
    RAISE EXCEPTION 'unsupported_payload_version';
  END IF;
  FOR k IN SELECT jsonb_object_keys(p_payload) LOOP
    IF k NOT IN ('version', 'students', 'guardian_people', 'guardian_links', 'staff_people',
                 'coach_candidates', 'coach_links', 'conflicts', 'decisions', 'skipped_items') THEN
      RAISE EXCEPTION 'unknown_field:%', k;
    END IF;
  END LOOP;
  FOR k IN SELECT unnest(ARRAY['students', 'guardian_people', 'guardian_links', 'staff_people',
                               'coach_candidates', 'coach_links', 'conflicts', 'decisions', 'skipped_items']) LOOP
    IF p_payload ? k AND jsonb_typeof(p_payload->k) <> 'array' THEN
      RAISE EXCEPTION 'invalid_payload:%', k;
    END IF;
  END LOOP;
  IF jsonb_array_length(coalesce(p_payload->'students', '[]'::jsonb)) > 1000
     OR jsonb_array_length(coalesce(p_payload->'guardian_people', '[]'::jsonb)) > 2000
     OR jsonb_array_length(coalesce(p_payload->'guardian_links', '[]'::jsonb)) > 5000
     OR jsonb_array_length(coalesce(p_payload->'staff_people', '[]'::jsonb)) > 1000
     OR jsonb_array_length(coalesce(p_payload->'coach_candidates', '[]'::jsonb)) > 300
     OR jsonb_array_length(coalesce(p_payload->'coach_links', '[]'::jsonb)) > 5000
     OR jsonb_array_length(coalesce(p_payload->'conflicts', '[]'::jsonb)) > 500
     OR jsonb_array_length(coalesce(p_payload->'decisions', '[]'::jsonb)) > 500
     OR jsonb_array_length(coalesce(p_payload->'skipped_items', '[]'::jsonb)) > 500 THEN
    RAISE EXCEPTION 'payload_too_large';
  END IF;
  SELECT coalesce(array_agg(public.ppl_norm_key(sm.full_name)), '{}') INTO db_staff_keys
  FROM public.staff_members sm;

  -- ── A. students (planned NEW; re-verified against public.students) ──
  st_total := jsonb_array_length(coalesce(p_payload->'students', '[]'::jsonb));
  FOR i IN 0 .. st_total - 1 LOOP
    e := p_payload->'students'->i;
    IF jsonb_typeof(e) <> 'object' THEN RAISE EXCEPTION 'invalid_payload:students[%]', i; END IF;
    FOR k IN SELECT jsonb_object_keys(e) LOOP
      IF k NOT IN ('ref', 'national_id', 'full_name', 'class_name', 'sport', 'birth_year') THEN
        RAISE EXCEPTION 'unknown_field:students[%].%', i, k;
      END IF;
    END LOOP;
    IF e ? 'birth_year' AND jsonb_typeof(e->'birth_year') NOT IN ('number', 'null') THEN
      RAISE EXCEPTION 'invalid_payload:students[%]', i;
    END IF;
    v_key := coalesce(e->>'ref', '');
    v_name := regexp_replace(trim(coalesce(e->>'full_name', '')), '\s+', ' ', 'g');
    IF length(v_key) < 1 OR length(v_key) > 20 OR length(v_name) < 1 OR length(v_name) > 120
       OR length(coalesce(e->>'national_id', '')) > 20
       OR length(coalesce(e->>'class_name', '')) > 40 OR length(coalesce(e->>'sport', '')) > 60 THEN
      RAISE EXCEPTION 'invalid_payload:students[%]', i;
    END IF;
    IF seen ? ('str:' || v_key) THEN
      st_conf := st_conf + 1; st_class := st_class + 1;
      blockers := blockers || format('duplicate_student_ref at students[%s]', i);
      CONTINUE;
    END IF;
    seen := seen || jsonb_build_object('str:' || v_key, true);
    v_nid := public.ppl_norm_nid(e->>'national_id');
    IF (length(v_nid) = 9 AND seen ? ('stn:' || v_nid))
       OR (length(v_nid) <> 9 AND seen ? ('stm:' || public.ppl_norm_key(v_name))) THEN
      st_conf := st_conf + 1; st_class := st_class + 1;
      blockers := blockers || format('duplicate_student_in_payload at students[%s]', i);
      CONTINUE;
    END IF;
    seen := seen || jsonb_build_object(
      CASE WHEN length(v_nid) = 9 THEN 'stn:' || v_nid ELSE 'stm:' || public.ppl_norm_key(v_name) END, true);
    IF length(v_nid) = 9 AND EXISTS (
      SELECT 1 FROM public.students s WHERE public.ppl_norm_nid(s.national_id) = v_nid
    ) THEN
      st_exist := st_exist + 1; st_class := st_class + 1;
      blockers := blockers || format('student_already_exists at students[%s]', i);
      CONTINUE;
    END IF;
    IF length(v_nid) <> 9 AND EXISTS (
      SELECT 1 FROM public.students s WHERE public.ppl_norm_name(s.full_name) = public.ppl_norm_name(v_name)
    ) THEN
      st_conf := st_conf + 1; st_class := st_class + 1;
      blockers := blockers || format('student_name_exists at students[%s]', i);
      CONTINUE;
    END IF;
    st_new := st_new + 1; st_class := st_class + 1;
  END LOOP;

  -- ── B. guardian PEOPLE, pass 1: validate + resolve; classification of
  --       existing/conflict is immediate, new-vs-skipped waits for links ──
  gp_total := jsonb_array_length(coalesce(p_payload->'guardian_people', '[]'::jsonb));
  FOR i IN 0 .. gp_total - 1 LOOP
    e := p_payload->'guardian_people'->i;
    IF jsonb_typeof(e) <> 'object' THEN RAISE EXCEPTION 'invalid_payload:guardian_people[%]', i; END IF;
    FOR k IN SELECT jsonb_object_keys(e) LOOP
      IF k NOT IN ('ref', 'full_name', 'name_variants', 'phone', 'email', 'source_rows', 'lineage') THEN
        RAISE EXCEPTION 'unknown_field:guardian_people[%].%', i, k;
      END IF;
    END LOOP;
    IF (e ? 'name_variants' AND jsonb_typeof(e->'name_variants') <> 'array')
       OR (e ? 'source_rows' AND jsonb_typeof(e->'source_rows') <> 'array')
       OR jsonb_array_length(coalesce(e->'name_variants', '[]'::jsonb)) > 10
       OR jsonb_array_length(coalesce(e->'source_rows', '[]'::jsonb)) > 300 THEN
      RAISE EXCEPTION 'invalid_payload:guardian_people[%]', i;
    END IF;
    v_key := coalesce(e->>'ref', '');
    v_name := regexp_replace(trim(coalesce(e->>'full_name', '')), '\s+', ' ', 'g');
    v_phone := regexp_replace(coalesce(e->>'phone', ''), '\D', '', 'g');
    IF length(v_key) < 1 OR length(v_key) > 20 OR length(v_name) > 120
       OR (v_name = '' AND v_phone = '') OR length(v_phone) > 15
       OR length(coalesce(e->>'email', '')) > 120 OR length(coalesce(e->>'lineage', '')) > 40 THEN
      RAISE EXCEPTION 'invalid_payload:guardian_people[%]', i;
    END IF;
    IF gp_map ? v_key THEN
      gp_conf := gp_conf + 1; gp_class := gp_class + 1;
      blockers := blockers || format('duplicate_person_ref at guardian_people[%s]', i);
      CONTINUE;
    END IF;
    IF v_phone <> '' AND seen ? ('gph:' || v_phone) THEN
      gp_conf := gp_conf + 1; gp_class := gp_class + 1;
      gp_map := gp_map || jsonb_build_object(v_key, jsonb_build_object('phone', v_phone, 'conflict', true));
      blockers := blockers || format('duplicate_person_in_payload at guardian_people[%s]', i);
      CONTINUE;
    END IF;
    IF v_phone <> '' THEN seen := seen || jsonb_build_object('gph:' || v_phone, true); END IF;
    SELECT count(DISTINCT public.ppl_norm_key(x)) INTO v_variants
    FROM jsonb_array_elements_text(coalesce(e->'name_variants', '[]'::jsonb)) x
    WHERE trim(x) <> '';
    v_gid := NULL;
    IF v_phone <> '' THEN
      SELECT g.id INTO v_gid FROM public.guardians g
      WHERE regexp_replace(coalesce(g.phone, ''), '\D', '', 'g') = v_phone
      ORDER BY g.created_at LIMIT 1;
    END IF;
    gp_map := gp_map || jsonb_build_object(v_key, jsonb_build_object(
      'phone', v_phone, 'conflict', v_variants > 1, 'gid', v_gid));
    IF v_variants > 1 THEN
      -- same phone, materially different names: conflict, never merged
      gp_conf := gp_conf + 1; gp_class := gp_class + 1;
    ELSIF v_gid IS NOT NULL THEN
      gp_exist := gp_exist + 1; gp_class := gp_class + 1;
    ELSE
      pending_g := pending_g || v_key;
    END IF;
  END LOOP;

  -- ── C. guardian LINKS: refs only; a missing ref is a blocker AND a
  --       conservation failure — the person is never invented ──
  gl_total := jsonb_array_length(coalesce(p_payload->'guardian_links', '[]'::jsonb));
  FOR i IN 0 .. gl_total - 1 LOOP
    e := p_payload->'guardian_links'->i;
    IF jsonb_typeof(e) <> 'object' THEN RAISE EXCEPTION 'invalid_payload:guardian_links[%]', i; END IF;
    FOR k IN SELECT jsonb_object_keys(e) LOOP
      IF k NOT IN ('ref', 'person_ref', 'student_id', 'relationship_type') THEN
        RAISE EXCEPTION 'unknown_field:guardian_links[%].%', i, k;
      END IF;
    END LOOP;
    v_rel := coalesce(e->>'relationship_type', '');
    IF v_rel NOT IN ('mother', 'father', 'guardian', 'other') THEN
      RAISE EXCEPTION 'invalid_payload:guardian_links[%]', i;
    END IF;
    v_key := coalesce(e->>'ref', '');
    IF length(v_key) < 1 OR length(v_key) > 30 THEN RAISE EXCEPTION 'invalid_payload:guardian_links[%]', i; END IF;
    IF seen ? ('glr:' || v_key) THEN
      gl_conf := gl_conf + 1; gl_class := gl_class + 1;
      blockers := blockers || format('duplicate_link_ref at guardian_links[%s]', i);
      CONTINUE;
    END IF;
    seen := seen || jsonb_build_object('glr:' || v_key, true);
    r := coalesce(e->>'person_ref', '');
    IF NOT gp_map ? r THEN
      blockers := blockers || format('unknown_person_ref at guardian_links[%s]', i);
      CONTINUE; -- NOT classified → guardian_links conservation fails
    END IF;
    IF e->'student_id' IS NULL OR jsonb_typeof(e->'student_id') = 'null' THEN
      gl_skip := gl_skip + 1; gl_class := gl_class + 1; -- unlinkable: student unmatched
      CONTINUE;
    END IF;
    BEGIN
      v_sid := (e->>'student_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'invalid_payload:guardian_links[%]', i;
    END;
    IF NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = v_sid) THEN
      blockers := blockers || format('unknown_student at guardian_links[%s]', i);
      CONTINUE; -- NOT classified → conservation fails
    END IF;
    linkable := linkable || jsonb_build_object(r, true);
    IF seen ? ('glp:' || r || ':' || v_sid) THEN
      gl_conf := gl_conf + 1; gl_class := gl_class + 1;
      blockers := blockers || format('duplicate_link_in_payload at guardian_links[%s]', i);
      CONTINUE;
    END IF;
    seen := seen || jsonb_build_object('glp:' || r || ':' || v_sid, true);
    IF (gp_map->r->>'conflict')::boolean THEN
      gl_conf := gl_conf + 1; gl_class := gl_class + 1;
      CONTINUE;
    END IF;
    v_gid := (gp_map->r->>'gid')::uuid;
    IF v_gid IS NULL THEN
      gl_new := gl_new + 1; gl_class := gl_class + 1;
      CONTINUE;
    END IF;
    v_active_type := NULL;
    SELECT sg.relationship_type INTO v_active_type
    FROM public.student_guardians sg
    WHERE sg.guardian_id = v_gid AND sg.student_id = v_sid AND sg.active_to IS NULL
    LIMIT 1;
    IF v_active_type IS NOT NULL THEN
      IF v_active_type = v_rel THEN gl_unch := gl_unch + 1; ELSE gl_upd := gl_upd + 1; END IF;
      gl_class := gl_class + 1;
    ELSIF EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.guardian_id = v_gid AND sg.student_id = v_sid AND sg.active_to IS NOT NULL
    ) THEN
      gl_hist := gl_hist + 1; gl_class := gl_class + 1;
    ELSE
      gl_new := gl_new + 1; gl_class := gl_class + 1;
    END IF;
  END LOOP;

  -- ── B2. guardian people, pass 2: new only with a linkable student;
  --        an unlinkable person is never auto-created ──
  FOREACH r IN ARRAY pending_g LOOP
    IF linkable ? r THEN gp_new := gp_new + 1; ELSE gp_skip := gp_skip + 1; END IF;
    gp_class := gp_class + 1;
  END LOOP;

  -- ── D. staff PEOPLE (canonical, from the צוות tab) ──
  sp_total := jsonb_array_length(coalesce(p_payload->'staff_people', '[]'::jsonb));
  FOR i IN 0 .. sp_total - 1 LOOP
    e := p_payload->'staff_people'->i;
    IF jsonb_typeof(e) <> 'object' THEN RAISE EXCEPTION 'invalid_payload:staff_people[%]', i; END IF;
    FOR k IN SELECT jsonb_object_keys(e) LOOP
      IF k NOT IN ('ref', 'full_name', 'phone', 'email', 'planned_role', 'lineage', 'source_row', 'distinct_seq') THEN
        RAISE EXCEPTION 'unknown_field:staff_people[%].%', i, k;
      END IF;
    END LOOP;
    IF e ? 'distinct_seq' AND (jsonb_typeof(e->'distinct_seq') <> 'number'
       OR (e->>'distinct_seq')::numeric < 0 OR (e->>'distinct_seq')::numeric > 50) THEN
      RAISE EXCEPTION 'invalid_payload:staff_people[%]', i;
    END IF;
    v_key := coalesce(e->>'ref', '');
    v_name := regexp_replace(trim(coalesce(e->>'full_name', '')), '\s+', ' ', 'g');
    IF length(v_key) < 1 OR length(v_key) > 20 OR length(v_name) < 1 OR length(v_name) > 120
       OR length(coalesce(e->>'planned_role', '')) > 120 OR length(coalesce(e->>'phone', '')) > 25
       OR length(coalesce(e->>'email', '')) > 120 OR length(coalesce(e->>'lineage', '')) > 40 THEN
      RAISE EXCEPTION 'invalid_payload:staff_people[%]', i;
    END IF;
    IF seen ? ('spr:' || v_key) THEN
      sp_conf := sp_conf + 1; sp_class := sp_class + 1;
      blockers := blockers || format('duplicate_person_ref at staff_people[%s]', i);
      CONTINUE;
    END IF;
    seen := seen || jsonb_build_object('spr:' || v_key, true);
    -- dedup key includes distinct_seq: a human "different people" decision
    -- (distinct_seq 0,1,...) passes; an undecided duplicate stays blocked
    IF seen ? ('spn:' || public.ppl_norm_key(v_name) || '#' || coalesce(e->>'distinct_seq', '0')) THEN
      sp_conf := sp_conf + 1; sp_class := sp_class + 1;
      blockers := blockers || format('duplicate_person_in_payload at staff_people[%s]', i);
      CONTINUE;
    END IF;
    seen := seen || jsonb_build_object('spn:' || public.ppl_norm_key(v_name) || '#' || coalesce(e->>'distinct_seq', '0'), true);
    staff_keys := staff_keys || public.ppl_norm_key(v_name);
    IF public.ppl_norm_key(v_name) = ANY (db_staff_keys) THEN
      sp_exist := sp_exist + 1; sp_class := sp_class + 1;
    ELSIF EXISTS (SELECT 1 FROM unnest(db_staff_keys) d WHERE public.ppl_name_fuzzy(d, public.ppl_norm_key(v_name))) THEN
      sp_poss := sp_poss + 1; sp_class := sp_class + 1;
    ELSE
      sp_new := sp_new + 1; sp_class := sp_class + 1;
    END IF;
  END LOOP;

  -- ── E. coach CANDIDATES (from the coach column; NEVER auto-merged) ──
  cc_total := jsonb_array_length(coalesce(p_payload->'coach_candidates', '[]'::jsonb));
  FOR i IN 0 .. cc_total - 1 LOOP
    e := p_payload->'coach_candidates'->i;
    IF jsonb_typeof(e) <> 'object' THEN RAISE EXCEPTION 'invalid_payload:coach_candidates[%]', i; END IF;
    FOR k IN SELECT jsonb_object_keys(e) LOOP
      IF k NOT IN ('ref', 'name', 'students_count') THEN
        RAISE EXCEPTION 'unknown_field:coach_candidates[%].%', i, k;
      END IF;
    END LOOP;
    IF e ? 'students_count' AND jsonb_typeof(e->'students_count') <> 'number' THEN
      RAISE EXCEPTION 'invalid_payload:coach_candidates[%]', i;
    END IF;
    v_key := coalesce(e->>'ref', '');
    v_name := regexp_replace(trim(coalesce(e->>'name', '')), '\s+', ' ', 'g');
    IF length(v_key) < 1 OR length(v_key) > 20 OR length(v_name) < 1 OR length(v_name) > 120 THEN
      RAISE EXCEPTION 'invalid_payload:coach_candidates[%]', i;
    END IF;
    IF cand_map ? v_key OR seen ? ('ccn:' || public.ppl_norm_key(v_name)) THEN
      cc_skip := cc_skip + 1; cc_class := cc_class + 1;
      blockers := blockers || format('duplicate_candidate_in_payload at coach_candidates[%s]', i);
      CONTINUE;
    END IF;
    seen := seen || jsonb_build_object('ccn:' || public.ppl_norm_key(v_name), true);
    cand_map := cand_map || jsonb_build_object(v_key, public.ppl_norm_key(v_name));
    IF v_name = 'וינגייט' THEN
      cc_noise := cc_noise + 1; cc_class := cc_class + 1;
    ELSIF public.ppl_norm_key(v_name) = ANY (staff_keys)
          OR public.ppl_norm_key(v_name) = ANY (db_staff_keys) THEN
      cc_exact := cc_exact + 1; cc_class := cc_class + 1;
    ELSIF EXISTS (SELECT 1 FROM unnest(staff_keys || db_staff_keys) s
                  WHERE public.ppl_name_fuzzy(s, public.ppl_norm_key(v_name))) THEN
      cc_poss := cc_poss + 1; cc_class := cc_class + 1; -- alias: human decision
    ELSE
      cc_miss := cc_miss + 1; cc_class := cc_class + 1;
    END IF;
  END LOOP;

  -- ── F. coach LINKS: candidate refs only ──
  cl_total := jsonb_array_length(coalesce(p_payload->'coach_links', '[]'::jsonb));
  FOR i IN 0 .. cl_total - 1 LOOP
    e := p_payload->'coach_links'->i;
    IF jsonb_typeof(e) <> 'object' THEN RAISE EXCEPTION 'invalid_payload:coach_links[%]', i; END IF;
    FOR k IN SELECT jsonb_object_keys(e) LOOP
      IF k NOT IN ('ref', 'candidate_ref', 'student_id', 'role_type') THEN
        RAISE EXCEPTION 'unknown_field:coach_links[%].%', i, k;
      END IF;
    END LOOP;
    v_role := coalesce(e->>'role_type', 'primary');
    IF v_role NOT IN ('primary', 'assistant', 'other') THEN
      RAISE EXCEPTION 'invalid_payload:coach_links[%]', i;
    END IF;
    v_key := coalesce(e->>'ref', '');
    IF length(v_key) < 1 OR length(v_key) > 30 THEN RAISE EXCEPTION 'invalid_payload:coach_links[%]', i; END IF;
    IF seen ? ('clr:' || v_key) THEN
      cl_conf := cl_conf + 1; cl_class := cl_class + 1;
      blockers := blockers || format('duplicate_link_ref at coach_links[%s]', i);
      CONTINUE;
    END IF;
    seen := seen || jsonb_build_object('clr:' || v_key, true);
    r := coalesce(e->>'candidate_ref', '');
    IF NOT cand_map ? r THEN
      blockers := blockers || format('unknown_candidate_ref at coach_links[%s]', i);
      CONTINUE; -- NOT classified → coach_links conservation fails
    END IF;
    IF e->'student_id' IS NULL OR jsonb_typeof(e->'student_id') = 'null' THEN
      cl_skip := cl_skip + 1; cl_class := cl_class + 1;
      CONTINUE;
    END IF;
    BEGIN
      v_sid := (e->>'student_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'invalid_payload:coach_links[%]', i;
    END;
    IF NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = v_sid) THEN
      blockers := blockers || format('unknown_student at coach_links[%s]', i);
      CONTINUE;
    END IF;
    IF seen ? ('clp:' || r || ':' || v_sid) THEN
      cl_conf := cl_conf + 1; cl_class := cl_class + 1;
      blockers := blockers || format('duplicate_link_in_payload at coach_links[%s]', i);
      CONTINUE;
    END IF;
    seen := seen || jsonb_build_object('clp:' || r || ':' || v_sid, true);
    v_smid := NULL;
    SELECT sm.id INTO v_smid FROM public.staff_members sm
    WHERE public.ppl_norm_key(sm.full_name) = (cand_map->>r)
    ORDER BY sm.created_at LIMIT 1;
    IF v_smid IS NULL THEN
      cl_new := cl_new + 1; cl_class := cl_class + 1;
    ELSIF EXISTS (
      SELECT 1 FROM public.student_coach_assignments sca
      WHERE sca.staff_member_id = v_smid AND sca.student_id = v_sid AND sca.active_to IS NULL
    ) THEN
      cl_unch := cl_unch + 1; cl_class := cl_class + 1;
    ELSIF EXISTS (
      SELECT 1 FROM public.student_coach_assignments sca
      WHERE sca.staff_member_id = v_smid AND sca.student_id = v_sid AND sca.active_to IS NOT NULL
    ) THEN
      cl_hist := cl_hist + 1; cl_class := cl_class + 1;
    ELSE
      cl_new := cl_new + 1; cl_class := cl_class + 1;
    END IF;
  END LOOP;

  -- ── G. conflict cases + decisions: undecided ALWAYS stays skipped ──
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
      blockers := blockers || format('duplicate_conflict_case at conflicts[%s]', i);
      CONTINUE;
    END IF;
    case_keys := case_keys || jsonb_build_object(v_key, true);
    cases_total := cases_total + 1;
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
      blockers := blockers || format('unknown_decision_case at decisions[%s]', i);
      CONTINUE;
    END IF;
    IF seen_dec ? v_key THEN
      blockers := blockers || format('duplicate_decision at decisions[%s]', i);
      CONTINUE;
    END IF;
    seen_dec := seen_dec || jsonb_build_object(v_key, true);
    IF v_dec IN ('link', 'create') THEN cases_decided := cases_decided + 1; END IF;
  END LOOP;

  -- ── H. skipped_items: structure only (explicitly-not-imported records) ──
  n := jsonb_array_length(coalesce(p_payload->'skipped_items', '[]'::jsonb));
  FOR i IN 0 .. n - 1 LOOP
    e := p_payload->'skipped_items'->i;
    IF jsonb_typeof(e) <> 'object' THEN RAISE EXCEPTION 'invalid_payload:skipped_items[%]', i; END IF;
    FOR k IN SELECT jsonb_object_keys(e) LOOP
      IF k NOT IN ('kind', 'label') THEN RAISE EXCEPTION 'unknown_field:skipped_items[%].%', i, k; END IF;
    END LOOP;
    IF coalesce(e->>'kind', '') NOT IN ('student_db_only', 'other') OR length(coalesce(e->>'label', '')) > 120 THEN
      RAISE EXCEPTION 'invalid_payload:skipped_items[%]', i;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    -- canonical fingerprint of the FULL payload: all people records, all
    -- links, planned roles, skipped items, conflicts and decisions; jsonb
    -- normalizes key order, so identical content → identical hash. The
    -- file name is never part of the payload.
    'fingerprint', encode(sha256(convert_to(p_payload::text, 'UTF8')), 'hex'),
    'students_counts', jsonb_build_object('new', st_new, 'existing', st_exist, 'conflict', st_conf, 'skipped', st_skip),
    'guardian_people_counts', jsonb_build_object('new', gp_new, 'existing', gp_exist, 'conflict', gp_conf, 'skipped', gp_skip),
    'guardian_link_counts', jsonb_build_object('new', gl_new, 'unchanged', gl_unch, 'updates', gl_upd, 'historical', gl_hist, 'conflict', gl_conf, 'skipped', gl_skip),
    'staff_people_counts', jsonb_build_object('new', sp_new, 'existing', sp_exist, 'possible_match', sp_poss, 'conflict', sp_conf, 'skipped', sp_skip),
    'coach_candidate_counts', jsonb_build_object('exact', cc_exact, 'possible_match', cc_poss, 'missing', cc_miss, 'noise', cc_noise, 'skipped', cc_skip),
    'coach_link_counts', jsonb_build_object('new', cl_new, 'unchanged', cl_unch, 'updates', cl_upd, 'historical', cl_hist, 'conflict', cl_conf, 'skipped', cl_skip),
    'conflict_counts', jsonb_build_object('decided', cases_decided, 'skipped', cases_total - cases_decided, 'total', cases_total),
    'conservation', jsonb_build_object(
      'students', jsonb_build_object('total', st_total, 'classified', st_class, 'passed', st_class = st_total),
      'guardian_people', jsonb_build_object('total', gp_total, 'classified', gp_class, 'passed', gp_class = gp_total),
      'guardian_links', jsonb_build_object('total', gl_total, 'classified', gl_class, 'passed', gl_class = gl_total),
      'staff_people', jsonb_build_object('total', sp_total, 'classified', sp_class, 'passed', sp_class = sp_total),
      'coach_candidates', jsonb_build_object('total', cc_total, 'classified', cc_class, 'passed', cc_class = cc_total),
      'coach_links', jsonb_build_object('total', cl_total, 'classified', cl_class, 'passed', cl_class = cl_total),
      'conflicts', jsonb_build_object('total', cases_total, 'classified', cases_decided + (cases_total - cases_decided), 'passed', true),
      'passed', (st_class = st_total) AND (gp_class = gp_total) AND (gl_class = gl_total)
                AND (sp_class = sp_total) AND (cc_class = cc_total) AND (cl_class = cl_total)),
    'blockers', to_jsonb(blockers),
    'can_import', false
  );
END $$;
REVOKE ALL ON FUNCTION public.ppl_dry_run_classify(jsonb) FROM PUBLIC;

-- (the public wrapper prepare_people_import_dry_run from stage 3D.1 is
--  unchanged: owner gate + masked errors; it now serves payload v2)

-- ── 3. self-tests (stage 3D.3 focus; zero writes, zero PII) ──
DO $$
DECLARE
  r1 jsonb; r2 jsonb; r3 jsonb;
  c1 int; c2 int; d1 int; d2 int;
  base jsonb;
  t_stable boolean; t_separate boolean; t_undecided boolean; t_merged boolean;
  t_fp boolean; t_badseq boolean := false; t_zero boolean;
BEGIN
  SELECT bool_and(p.provolatile = 's') INTO t_stable
  FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'public'
    AND p.proname IN ('ppl_dry_run_classify', 'prepare_people_import_dry_run');

  SELECT count(*) INTO c1 FROM public.staff_members;
  SELECT count(*) INTO c2 FROM public.students;

  base := jsonb_build_object('version', 2, 'students', '[]'::jsonb,
    'guardian_people', '[]'::jsonb, 'guardian_links', '[]'::jsonb,
    'coach_candidates', '[]'::jsonb, 'coach_links', '[]'::jsonb,
    'conflicts', '[]'::jsonb, 'decisions', '[]'::jsonb, 'skipped_items', '[]'::jsonb);

  -- human decision "different people, same name": distinct_seq 0/1 → both
  -- classified, NO duplicate blocker
  r1 := public.ppl_dry_run_classify(base || jsonb_build_object('staff_people', jsonb_build_array(
    jsonb_build_object('ref', 'sp-0', 'full_name', 'שם כפול דמה', 'phone', '', 'email', '', 'planned_role', 'תפקיד א', 'lineage', 'צוות', 'source_row', 5, 'distinct_seq', 0),
    jsonb_build_object('ref', 'sp-1', 'full_name', 'שם כפול דמה', 'phone', '', 'email', '', 'planned_role', 'תפקיד ב', 'lineage', 'צוות', 'source_row', 9, 'distinct_seq', 1))));
  t_separate := (r1->'staff_people_counts'->>'new')::int = 2
            AND (r1->'staff_people_counts'->>'conflict')::int = 0
            AND (r1->'blockers')::text NOT LIKE '%duplicate_person_in_payload%'
            AND (r1->'conservation'->'staff_people'->>'passed')::boolean;

  -- UNDECIDED duplicate (no distinct_seq) keeps being blocked
  r2 := public.ppl_dry_run_classify(base || jsonb_build_object('staff_people', jsonb_build_array(
    jsonb_build_object('ref', 'sp-0', 'full_name', 'שם כפול דמה', 'phone', '', 'email', '', 'planned_role', 'תפקיד א', 'lineage', 'צוות', 'source_row', 5),
    jsonb_build_object('ref', 'sp-1', 'full_name', 'שם כפול דמה', 'phone', '', 'email', '', 'planned_role', 'תפקיד ב', 'lineage', 'צוות', 'source_row', 9))));
  t_undecided := (r2->'staff_people_counts'->>'conflict')::int = 1
             AND (r2->'blockers')::text LIKE '%duplicate_person_in_payload%';

  -- browser-side merge result: ONE record, several roles in planned_role
  r3 := public.ppl_dry_run_classify(base || jsonb_build_object('staff_people', jsonb_build_array(
    jsonb_build_object('ref', 'sp-0', 'full_name', 'שם כפול דמה', 'phone', '', 'email', '', 'planned_role', 'תפקיד א · תפקיד ב', 'lineage', 'צוות', 'source_row', 5))));
  t_merged := (r3->'staff_people_counts'->>'new')::int = 1
          AND (r3->'blockers')::text NOT LIKE '%duplicate_person_in_payload%';

  -- fingerprint changes between undecided / separate / merged payloads
  t_fp := (r1->>'fingerprint') <> (r2->>'fingerprint')
      AND (r2->>'fingerprint') <> (r3->>'fingerprint')
      AND (r1->>'can_import') = 'false' AND (r3->>'can_import') = 'false';

  -- invalid distinct_seq rejected with a masked error
  BEGIN
    PERFORM public.ppl_dry_run_classify(base || jsonb_build_object('staff_people', jsonb_build_array(
      jsonb_build_object('ref', 'sp-0', 'full_name', 'שם דמה', 'phone', '', 'email', '', 'planned_role', '', 'lineage', 'צוות', 'source_row', 5, 'distinct_seq', 'x'))));
  EXCEPTION WHEN OTHERS THEN
    t_badseq := (SQLERRM = 'invalid_payload:staff_people[0]');
  END;

  SELECT count(*) INTO d1 FROM public.staff_members;
  SELECT count(*) INTO d2 FROM public.students;
  t_zero := (c1 = d1) AND (c2 = d2);

  RAISE NOTICE 'DRY_RUN_STAFF_DISTINCT: stable_zero_write=% separate_decision_passes=% undecided_still_blocked=% merged_single_record=% fingerprint_changes=% bad_seq_masked=% row_counts_unchanged=%',
    t_stable, t_separate, t_undecided, t_merged, t_fp, t_badseq, t_zero;
END $$;
