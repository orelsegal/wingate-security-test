-- ═══════════════════════════════════════════════════════════════════
-- LEARNING GROUPS — STAGE 4C: full management flow.
-- Builds ON the stage-2A schema (no new structure invented):
--  * learning_group_teachers gains SOFT membership (surrogate id +
--    left_at + unique-active index) — safe: the table is EMPTY in
--    production; a guard below aborts if it ever is not.
--  * learning_groups gains an optional description.
--  * teacher READ scope: an ACTIVE teacher of an ACTIVE group can list
--    and open her own groups (no broad permission needed); everything
--    else stays owner/permission-gated. Fail closed.
--  * new RPCs: create_learning_group_full (ATOMIC group+teachers),
--    restore_learning_group, get_learning_group_history (audit read).
--  * set_group_teachers now ENDS assignments (left_at) instead of hard
--    delete; an ended teacher immediately loses access.
--  * duplicate names inside a school year return a clean masked error.
--  * is_teacher_of_student / has_teacher_group_scope / lg_is_group_lead
--    now honor teacher left_at.
-- All writes: auth.uid() + explicit permission, SECURITY DEFINER with
-- empty search_path, qualified names, REVOKE PUBLIC, GRANT
-- authenticated, masked errors, audit via lg_log. Audit stays
-- append-only; no production data is touched or seeded.
-- Idempotent. No PII in this file.
-- ═══════════════════════════════════════════════════════════════════

-- ── 0. safety guard: the teacher-membership restructure assumes the
--       table is still empty (it is: groups were never created) ──
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.learning_group_teachers;
  IF n > 0 AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'learning_group_teachers' AND column_name = 'left_at'
  ) THEN
    RAISE EXCEPTION 'STAGE4C_ABORTED: learning_group_teachers has % rows but no soft-membership columns; manual review required', n;
  END IF;
END $$;

-- ── 1. schema: description + soft teacher membership ──
ALTER TABLE public.learning_groups
  ADD COLUMN IF NOT EXISTS description text CHECK (description IS NULL OR length(description) <= 500);

ALTER TABLE public.learning_group_teachers ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.learning_group_teachers ADD COLUMN IF NOT EXISTS left_at timestamptz;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint
             WHERE conname = 'learning_group_teachers_pkey'
               AND conrelid = 'public.learning_group_teachers'::regclass
               AND array_length(conkey, 1) = 2) THEN
    ALTER TABLE public.learning_group_teachers DROP CONSTRAINT learning_group_teachers_pkey;
    ALTER TABLE public.learning_group_teachers ADD PRIMARY KEY (id);
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_lgt_active
  ON public.learning_group_teachers (group_id, teacher_user_id) WHERE left_at IS NULL;
DROP INDEX IF EXISTS uq_lgt_one_lead;
CREATE UNIQUE INDEX IF NOT EXISTS uq_lgt_one_active_lead
  ON public.learning_group_teachers (group_id) WHERE role_in_group = 'lead' AND left_at IS NULL;

-- ── 2. scope helpers honor teacher left_at ──
CREATE OR REPLACE FUNCTION public.lg_is_group_lead(_user uuid, _group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.learning_group_teachers
    WHERE group_id = _group AND teacher_user_id = _user
      AND role_in_group = 'lead' AND left_at IS NULL
  );
$$;
REVOKE ALL ON FUNCTION public.lg_is_group_lead(uuid, uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.has_teacher_group_scope(_user_id uuid, _student_id uuid, _subject_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learning_groups g
    JOIN public.learning_group_teachers t
      ON t.group_id = g.id AND t.teacher_user_id = _user_id AND t.left_at IS NULL
    JOIN public.learning_group_students s
      ON s.group_id = g.id AND s.student_id = _student_id AND s.left_at IS NULL
    WHERE g.subject_id = _subject_id AND g.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_teacher_of_student(_user_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learning_groups g
    JOIN public.learning_group_teachers t
      ON t.group_id = g.id AND t.teacher_user_id = _user_id AND t.left_at IS NULL
    JOIN public.learning_group_students s
      ON s.group_id = g.id AND s.student_id = _student_id AND s.left_at IS NULL
    WHERE g.status = 'active'
  );
$$;

-- active-teacher-of-group check (read scope; internal)
CREATE OR REPLACE FUNCTION public.lg_is_active_teacher(_user uuid, _group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learning_group_teachers t
    JOIN public.learning_groups g ON g.id = t.group_id AND g.status = 'active'
    WHERE t.group_id = _group AND t.teacher_user_id = _user AND t.left_at IS NULL
  );
$$;
REVOKE ALL ON FUNCTION public.lg_is_active_teacher(uuid, uuid) FROM PUBLIC;

-- ── 3. ATOMIC create: group + description + teachers in ONE transaction.
--       Any failure (bad teacher, duplicate name) rolls back everything. ──
CREATE OR REPLACE FUNCTION public.create_learning_group_full(
  p_name text, p_subject_id uuid, p_year_start integer,
  p_grade_code text DEFAULT NULL, p_description text DEFAULT NULL,
  p_teachers jsonb DEFAULT '[]'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_leads int; v_bad int;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'learning_groups.manage') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE id = p_subject_id) THEN
    RAISE EXCEPTION 'subject_not_found';
  END IF;
  IF jsonb_typeof(p_teachers) <> 'array' OR jsonb_array_length(p_teachers) > 20 THEN
    RAISE EXCEPTION 'invalid_payload';
  END IF;
  SELECT count(*) INTO v_leads FROM jsonb_array_elements(p_teachers) e
   WHERE e->>'role_in_group' = 'lead';
  IF v_leads > 1 THEN RAISE EXCEPTION 'only_one_lead_allowed'; END IF;
  SELECT count(*) INTO v_bad FROM jsonb_array_elements(p_teachers) e
   WHERE COALESCE(e->>'role_in_group', 'teacher') NOT IN ('lead', 'teacher')
      OR NOT EXISTS (SELECT 1 FROM public.user_roles ur
                     WHERE ur.user_id = (e->>'user_id')::uuid AND ur.role = 'teacher');
  IF v_bad > 0 THEN RAISE EXCEPTION 'invalid_teacher_in_payload'; END IF;

  BEGIN
    INSERT INTO public.learning_groups (name, subject_id, grade_code, academic_year_start, description, created_by)
    VALUES (trim(p_name), p_subject_id, p_grade_code, p_year_start::smallint, nullif(trim(coalesce(p_description, '')), ''), auth.uid())
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'duplicate_group_name';
  END;
  INSERT INTO public.learning_group_teachers (group_id, teacher_user_id, role_in_group, added_by)
  SELECT v_id, (e->>'user_id')::uuid, COALESCE(e->>'role_in_group', 'teacher'), auth.uid()
  FROM jsonb_array_elements(p_teachers) e;
  PERFORM public.lg_log(v_id, 'group.create', 'group', v_id, NULL,
    jsonb_build_object('name', trim(p_name), 'subject_id', p_subject_id, 'grade_code', p_grade_code,
                       'academic_year_start', p_year_start, 'teachers', p_teachers));
  RETURN v_id;
END $$;

-- ── 4. update gains description; duplicate names return a clean error ──
DROP FUNCTION IF EXISTS public.update_learning_group(uuid, text, integer, text);
CREATE OR REPLACE FUNCTION public.update_learning_group(
  p_group uuid, p_name text, p_year_start integer,
  p_grade_code text DEFAULT NULL, p_description text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_old jsonb; v_new jsonb;
BEGIN
  PERFORM public.lg_assert_can_manage_group(p_group);
  SELECT to_jsonb(g) INTO v_old FROM public.learning_groups g WHERE id = p_group;
  IF v_old IS NULL THEN RAISE EXCEPTION 'group_not_found'; END IF;
  BEGIN
    UPDATE public.learning_groups
    SET name = trim(p_name), grade_code = p_grade_code,
        academic_year_start = p_year_start::smallint,
        description = nullif(trim(coalesce(p_description, '')), '')
    WHERE id = p_group;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'duplicate_group_name';
  END;
  SELECT to_jsonb(g) INTO v_new FROM public.learning_groups g WHERE id = p_group;
  PERFORM public.lg_log(p_group, 'group.update', 'group', p_group, v_old, v_new);
END $$;

-- ── 5. restore from archive ──
CREATE OR REPLACE FUNCTION public.restore_learning_group(p_group uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_old jsonb;
BEGIN
  PERFORM public.lg_assert_can_manage_group(p_group);
  SELECT to_jsonb(g) INTO v_old FROM public.learning_groups g WHERE id = p_group AND status = 'archived';
  IF v_old IS NULL THEN RAISE EXCEPTION 'group_not_found'; END IF;
  UPDATE public.learning_groups SET status = 'active' WHERE id = p_group;
  PERFORM public.lg_log(p_group, 'group.restore', 'group', p_group, v_old, NULL);
END $$;

-- ── 6. teachers: soft replace — end assignments, never hard delete ──
CREATE OR REPLACE FUNCTION public.set_group_teachers(p_group uuid, p_teachers jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_old jsonb; v_n int; v_leads int; v_bad int;
BEGIN
  PERFORM public.lg_assert_can_manage_members(p_group);
  IF NOT EXISTS (SELECT 1 FROM public.learning_groups WHERE id = p_group) THEN
    RAISE EXCEPTION 'group_not_found';
  END IF;
  IF jsonb_typeof(p_teachers) <> 'array' THEN RAISE EXCEPTION 'invalid_payload'; END IF;
  v_n := jsonb_array_length(p_teachers);
  IF v_n > 20 THEN RAISE EXCEPTION 'batch_too_large'; END IF;
  SELECT count(*) INTO v_leads FROM jsonb_array_elements(p_teachers) e
   WHERE e->>'role_in_group' = 'lead';
  IF v_leads > 1 THEN RAISE EXCEPTION 'only_one_lead_allowed'; END IF;
  SELECT count(*) INTO v_bad FROM jsonb_array_elements(p_teachers) e
   WHERE COALESCE(e->>'role_in_group', 'teacher') NOT IN ('lead', 'teacher')
      OR NOT EXISTS (SELECT 1 FROM public.user_roles ur
                     WHERE ur.user_id = (e->>'user_id')::uuid AND ur.role = 'teacher');
  IF v_bad > 0 THEN RAISE EXCEPTION 'invalid_teacher_in_payload'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', t.teacher_user_id, 'role_in_group', t.role_in_group)), '[]'::jsonb)
  INTO v_old
  FROM public.learning_group_teachers t WHERE group_id = p_group AND left_at IS NULL;

  -- end every assignment not present (or with a changed role) in the new set
  UPDATE public.learning_group_teachers t SET left_at = now()
  WHERE t.group_id = p_group AND t.left_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_teachers) e
      WHERE (e->>'user_id')::uuid = t.teacher_user_id
        AND COALESCE(e->>'role_in_group', 'teacher') = t.role_in_group);
  -- add the new/changed assignments as fresh rows (history preserved)
  INSERT INTO public.learning_group_teachers (group_id, teacher_user_id, role_in_group, added_by)
  SELECT p_group, (e->>'user_id')::uuid, COALESCE(e->>'role_in_group', 'teacher'), auth.uid()
  FROM jsonb_array_elements(p_teachers) e
  WHERE NOT EXISTS (
    SELECT 1 FROM public.learning_group_teachers t
    WHERE t.group_id = p_group AND t.teacher_user_id = (e->>'user_id')::uuid
      AND t.role_in_group = COALESCE(e->>'role_in_group', 'teacher') AND t.left_at IS NULL);

  PERFORM public.lg_log(p_group, 'teachers.set', 'teacher', NULL, v_old, p_teachers);
END $$;

-- duplicate copies ACTIVE teachers only
CREATE OR REPLACE FUNCTION public.duplicate_group_for_year(p_group uuid, p_new_year integer, p_include_students boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_new uuid;
BEGIN
  PERFORM public.lg_assert_can_manage_group(p_group);
  BEGIN
    INSERT INTO public.learning_groups (name, subject_id, grade_code, academic_year_start, description, created_by)
    SELECT name, subject_id, grade_code, p_new_year::smallint, description, auth.uid()
    FROM public.learning_groups WHERE id = p_group
    RETURNING id INTO v_new;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'duplicate_group_name';
  END;
  IF v_new IS NULL THEN RAISE EXCEPTION 'group_not_found'; END IF;
  INSERT INTO public.learning_group_teachers (group_id, teacher_user_id, role_in_group, added_by)
  SELECT v_new, teacher_user_id, role_in_group, auth.uid()
  FROM public.learning_group_teachers WHERE group_id = p_group AND left_at IS NULL;
  IF p_include_students THEN
    INSERT INTO public.learning_group_students (group_id, student_id, added_by)
    SELECT v_new, student_id, auth.uid()
    FROM public.learning_group_students WHERE group_id = p_group AND left_at IS NULL;
  END IF;
  PERFORM public.lg_log(v_new, 'group.duplicate', 'group', p_group, NULL,
    jsonb_build_object('new_year', p_new_year, 'include_students', p_include_students));
  RETURN v_new;
END $$;

-- ── 7. reads: owner OR view-permission OR ACTIVE teacher of the group ──
CREATE OR REPLACE FUNCTION public.get_learning_group_details(p_group uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_system_owner(auth.uid())
     AND NOT (public.has_permission(auth.uid(), 'learning_groups.view')
              AND EXISTS (SELECT 1 FROM public.learning_group_teachers
                          WHERE group_id = p_group AND teacher_user_id = auth.uid()))
     AND NOT public.lg_is_active_teacher(auth.uid(), p_group) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT jsonb_build_object(
    'group', to_jsonb(g),
    'teachers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'user_id', t.teacher_user_id, 'role_in_group', t.role_in_group,
        'full_name', p.full_name, 'added_at', t.added_at))
      FROM public.learning_group_teachers t
      LEFT JOIN public.profiles p ON p.id = t.teacher_user_id
      WHERE t.group_id = g.id AND t.left_at IS NULL), '[]'::jsonb),
    'past_teachers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'user_id', t.teacher_user_id, 'role_in_group', t.role_in_group,
        'full_name', p.full_name, 'added_at', t.added_at, 'left_at', t.left_at)
        ORDER BY t.left_at DESC)
      FROM public.learning_group_teachers t
      LEFT JOIN public.profiles p ON p.id = t.teacher_user_id
      WHERE t.group_id = g.id AND t.left_at IS NOT NULL), '[]'::jsonb),
    'active_students', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'student_id', s.student_id, 'full_name', st.full_name,
        'class_name', st.class_name, 'joined_at', s.joined_at)
        ORDER BY st.full_name)
      FROM public.learning_group_students s
      JOIN public.students st ON st.id = s.student_id
      WHERE s.group_id = g.id AND s.left_at IS NULL), '[]'::jsonb),
    'past_students', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'student_id', s.student_id, 'full_name', st.full_name,
        'class_name', st.class_name, 'joined_at', s.joined_at, 'left_at', s.left_at)
        ORDER BY s.left_at DESC)
      FROM public.learning_group_students s
      JOIN public.students st ON st.id = s.student_id
      WHERE s.group_id = g.id AND s.left_at IS NOT NULL), '[]'::jsonb),
    'active_count', (SELECT count(*) FROM public.learning_group_students s
                     WHERE s.group_id = g.id AND s.left_at IS NULL)
  ) INTO v
  FROM public.learning_groups g WHERE g.id = p_group;
  IF v IS NULL THEN RAISE EXCEPTION 'group_not_found'; END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.list_learning_groups(p_year integer DEFAULT NULL, p_status text DEFAULT 'active')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_owner boolean; v_view boolean; v jsonb;
BEGIN
  v_owner := public.is_system_owner(auth.uid());
  v_view  := public.has_permission(auth.uid(), 'learning_groups.view');
  -- teachers without any permission fall through to membership scope:
  -- ACTIVE assignments in ACTIVE groups only; zero rows when none exist.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.name, 'subject_id', g.subject_id,
      'subject_name', subj.subject_name, 'grade_code', g.grade_code,
      'academic_year_start', g.academic_year_start, 'status', g.status,
      'description', g.description,
      'teacher_count', (SELECT count(*) FROM public.learning_group_teachers t
                        WHERE t.group_id = g.id AND t.left_at IS NULL),
      'active_students', (SELECT count(*) FROM public.learning_group_students s
                          WHERE s.group_id = g.id AND s.left_at IS NULL)
    ) ORDER BY g.academic_year_start DESC, subj.subject_name, g.name), '[]'::jsonb) INTO v
  FROM public.learning_groups g
  JOIN public.subjects subj ON subj.id = g.subject_id
  WHERE (p_year IS NULL OR g.academic_year_start = p_year)
    AND (p_status IS NULL OR g.status = p_status)
    AND (
      v_owner
      OR (v_view AND EXISTS (SELECT 1 FROM public.learning_group_teachers t
                             WHERE t.group_id = g.id AND t.teacher_user_id = auth.uid()))
      OR (g.status = 'active' AND EXISTS (
            SELECT 1 FROM public.learning_group_teachers t
            WHERE t.group_id = g.id AND t.teacher_user_id = auth.uid() AND t.left_at IS NULL))
    );
  RETURN v;
END $$;

-- ── 8. audit read: owner or group managers only; masked payloads ──
CREATE OR REPLACE FUNCTION public.get_learning_group_history(p_group uuid, p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb;
BEGIN
  PERFORM public.lg_assert_can_manage_group(p_group);
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 500 THEN p_limit := 100; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', a.id, 'action', a.action, 'target_type', a.target_type,
      'created_at', a.created_at,
      'actor_name', COALESCE(p.full_name, 'משתמש מערכת'),
      'old_value', a.old_value, 'new_value', a.new_value
    ) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v
  FROM (SELECT * FROM public.learning_group_audit_log
        WHERE group_id = p_group ORDER BY created_at DESC LIMIT p_limit) a
  LEFT JOIN public.profiles p ON p.id = a.actor_user_id;
  RETURN v;
END $$;

-- ── 9. privileges for new/replaced functions ──
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'create_learning_group_full(text, uuid, integer, text, text, jsonb)',
    'update_learning_group(uuid, text, integer, text, text)',
    'restore_learning_group(uuid)',
    'get_learning_group_history(uuid, integer)',
    'is_teacher_of_student(uuid, uuid)',
    'has_teacher_group_scope(uuid, uuid, uuid)',
    'set_group_teachers(uuid, jsonb)',
    'duplicate_group_for_year(uuid, integer, boolean)',
    'get_learning_group_details(uuid)',
    'list_learning_groups(integer, text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

-- ── 10. self-tests (read-only; no rows created) ──
DO $$
DECLARE t1 boolean; t2 boolean; t3 boolean; t4 boolean; t5 boolean;
BEGIN
  t1 := EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'learning_group_teachers' AND column_name = 'left_at');
  t2 := EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'learning_groups' AND column_name = 'description');
  t3 := NOT public.lg_is_active_teacher(gen_random_uuid(), gen_random_uuid());
  t4 := NOT public.is_teacher_of_student(gen_random_uuid(), gen_random_uuid());
  t5 := EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = 'create_learning_group_full')
    AND EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = 'restore_learning_group')
    AND EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = 'get_learning_group_history');
  RAISE NOTICE 'STAGE4C: soft_teacher_membership=% description_added=% scope_fail_closed=% student_scope_fail_closed=% new_rpcs_present=%',
    t1, t2, t3, t4, t5;
END $$;
