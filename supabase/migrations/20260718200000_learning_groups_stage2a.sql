-- ═══════════════════════════════════════════════════════════════════
-- LEARNING GROUPS — STAGE 2A (additive only).
-- Classroom-style learning groups as the single source of truth for
-- teacher scope. Adds: 3 permissions (granted to NO role by default),
-- learning_groups / learning_group_teachers / learning_group_students,
-- append-only learning_group_audit_log, has_teacher_group_scope(),
-- and secured RPCs (permission-based, not hardcoded to the owner).
--
-- ZERO behavioral change: no existing business policy references any of
-- these objects; nothing is granted to any role in the matrix; no seed
-- of real groups/users. Idempotent. No PII.
--
-- History note (accurate): removing a student sets left_at and archiving
-- keeps all rows, BUT the FKs below use ON DELETE CASCADE, so physically
-- deleting a student (or a teacher's auth user) also deletes their
-- membership history rows. Audit rows are NOT cascaded and remain.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. New permissions (non-critical; NOT granted to any role) ──
INSERT INTO public.permissions (key, description, category, is_critical) VALUES
  ('learning_groups.view',           'צפייה בקבוצות לימוד',              'learning_groups', false),
  ('learning_groups.manage',         'יצירה וניהול קבוצות לימוד',        'learning_groups', false),
  ('learning_groups.members.manage', 'ניהול מורים ותלמידים בקבוצה',      'learning_groups', false)
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description, category = EXCLUDED.category, is_critical = EXCLUDED.is_critical;

-- ── 2. Tables ──
CREATE TABLE IF NOT EXISTS public.learning_groups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  subject_id          uuid NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  grade_code          text CHECK (grade_code IN ('ז','ח','ט','י','יא','יב')),  -- metadata only
  academic_year_start smallint NOT NULL CHECK (academic_year_start BETWEEN 2020 AND 2100),
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, name, academic_year_start)
);
CREATE INDEX IF NOT EXISTS idx_lg_subject ON public.learning_groups (subject_id);
CREATE INDEX IF NOT EXISTS idx_lg_status_year ON public.learning_groups (status, academic_year_start);

CREATE TABLE IF NOT EXISTS public.learning_group_teachers (
  group_id        uuid NOT NULL REFERENCES public.learning_groups(id) ON DELETE CASCADE,
  teacher_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_group   text NOT NULL DEFAULT 'teacher' CHECK (role_in_group IN ('lead','teacher')),
  added_by        uuid,
  added_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, teacher_user_id)
);
CREATE INDEX IF NOT EXISTS idx_lgt_teacher ON public.learning_group_teachers (teacher_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lgt_one_lead ON public.learning_group_teachers (group_id) WHERE role_in_group = 'lead';

CREATE TABLE IF NOT EXISTS public.learning_group_students (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES public.learning_groups(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  left_at    timestamptz,
  added_by   uuid
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lgs_active ON public.learning_group_students (group_id, student_id) WHERE left_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lgs_student_active ON public.learning_group_students (student_id) WHERE left_at IS NULL;

CREATE TABLE IF NOT EXISTS public.learning_group_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid,
  actor_user_id uuid,
  action        text NOT NULL,
  target_type   text,
  target_id     uuid,
  old_value     jsonb,
  new_value     jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lga_group ON public.learning_group_audit_log (group_id, created_at);

-- ── 3. Lock everything from the API; RPCs are the only path ──
ALTER TABLE public.learning_groups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_group_teachers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_group_students  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_group_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_groups, public.learning_group_teachers,
              public.learning_group_students, public.learning_group_audit_log
  FROM authenticated, anon;
GRANT ALL ON public.learning_groups, public.learning_group_teachers,
             public.learning_group_students, public.learning_group_audit_log
  TO service_role;

-- Audit log is append-only even for definer paths
CREATE OR REPLACE FUNCTION public.lg_audit_append_only()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'learning_group_audit_log_is_append_only';
END $$;
DROP TRIGGER IF EXISTS lg_audit_append_only ON public.learning_group_audit_log;
CREATE TRIGGER lg_audit_append_only
  BEFORE UPDATE OR DELETE ON public.learning_group_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.lg_audit_append_only();

CREATE OR REPLACE FUNCTION public.lg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS lg_touch ON public.learning_groups;
CREATE TRIGGER lg_touch BEFORE UPDATE ON public.learning_groups
  FOR EACH ROW EXECUTE FUNCTION public.lg_touch_updated_at();

-- ── 4. Internal helpers (not granted to clients) ──
CREATE OR REPLACE FUNCTION public.lg_log(_group uuid, _action text, _ttype text, _tid uuid, _old jsonb, _new jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO public.learning_group_audit_log (group_id, actor_user_id, action, target_type, target_id, old_value, new_value)
  VALUES (_group, auth.uid(), _action, _ttype, _tid, _old, _new);
$$;
REVOKE ALL ON FUNCTION public.lg_log(uuid, text, text, uuid, jsonb, jsonb) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.lg_is_group_lead(_user uuid, _group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.learning_group_teachers
    WHERE group_id = _group AND teacher_user_id = _user AND role_in_group = 'lead'
  );
$$;
REVOKE ALL ON FUNCTION public.lg_is_group_lead(uuid, uuid) FROM PUBLIC;

-- Group management gate: owner, or manage-permission + lead of THIS group
CREATE OR REPLACE FUNCTION public.lg_assert_can_manage_group(_group uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF public.is_system_owner(auth.uid()) THEN RETURN; END IF;
  IF public.has_permission(auth.uid(), 'learning_groups.manage')
     AND public.lg_is_group_lead(auth.uid(), _group) THEN RETURN; END IF;
  RAISE EXCEPTION 'not_authorized';
END $$;
REVOKE ALL ON FUNCTION public.lg_assert_can_manage_group(uuid) FROM PUBLIC;

-- Membership management gate: owner, or members-permission + lead of THIS group
CREATE OR REPLACE FUNCTION public.lg_assert_can_manage_members(_group uuid)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF public.is_system_owner(auth.uid()) THEN RETURN; END IF;
  IF public.has_permission(auth.uid(), 'learning_groups.members.manage')
     AND public.lg_is_group_lead(auth.uid(), _group) THEN RETURN; END IF;
  RAISE EXCEPTION 'not_authorized';
END $$;
REVOKE ALL ON FUNCTION public.lg_assert_can_manage_members(uuid) FROM PUBLIC;

-- ── 5. Scope function (NOT wired to any policy yet) ──
CREATE OR REPLACE FUNCTION public.has_teacher_group_scope(_user_id uuid, _student_id uuid, _subject_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learning_groups g
    JOIN public.learning_group_teachers t ON t.group_id = g.id AND t.teacher_user_id = _user_id
    JOIN public.learning_group_students s ON s.group_id = g.id AND s.student_id = _student_id AND s.left_at IS NULL
    WHERE g.subject_id = _subject_id AND g.status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.has_teacher_group_scope(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_teacher_group_scope(uuid, uuid, uuid) TO authenticated;

-- ── 6. RPCs ──

-- create: permission-gated (owner passes via has_permission's owner bypass)
CREATE OR REPLACE FUNCTION public.create_learning_group(p_name text, p_subject_id uuid, p_year_start integer, p_grade_code text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_permission(auth.uid(), 'learning_groups.manage') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE id = p_subject_id) THEN
    RAISE EXCEPTION 'subject_not_found';
  END IF;
  INSERT INTO public.learning_groups (name, subject_id, grade_code, academic_year_start, created_by)
  VALUES (trim(p_name), p_subject_id, p_grade_code, p_year_start::smallint, auth.uid())
  RETURNING id INTO v_id;
  PERFORM public.lg_log(v_id, 'group.create', 'group', v_id, NULL,
    jsonb_build_object('name', trim(p_name), 'subject_id', p_subject_id, 'grade_code', p_grade_code, 'academic_year_start', p_year_start));
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_learning_group(p_group uuid, p_name text, p_year_start integer, p_grade_code text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_old jsonb; v_new jsonb;
BEGIN
  PERFORM public.lg_assert_can_manage_group(p_group);
  SELECT to_jsonb(g) INTO v_old FROM public.learning_groups g WHERE id = p_group;
  IF v_old IS NULL THEN RAISE EXCEPTION 'group_not_found'; END IF;
  UPDATE public.learning_groups
  SET name = trim(p_name), grade_code = p_grade_code, academic_year_start = p_year_start::smallint
  WHERE id = p_group;
  SELECT to_jsonb(g) INTO v_new FROM public.learning_groups g WHERE id = p_group;
  PERFORM public.lg_log(p_group, 'group.update', 'group', p_group, v_old, v_new);
END $$;

-- No physical delete RPC exists by design: groups leave service via archive only.
CREATE OR REPLACE FUNCTION public.archive_learning_group(p_group uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_old jsonb;
BEGIN
  PERFORM public.lg_assert_can_manage_group(p_group);
  SELECT to_jsonb(g) INTO v_old FROM public.learning_groups g WHERE id = p_group;
  IF v_old IS NULL THEN RAISE EXCEPTION 'group_not_found'; END IF;
  UPDATE public.learning_groups SET status = 'archived' WHERE id = p_group;
  PERFORM public.lg_log(p_group, 'group.archive', 'group', p_group, v_old, NULL);
END $$;

CREATE OR REPLACE FUNCTION public.duplicate_group_for_year(p_group uuid, p_new_year integer, p_include_students boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_new uuid;
BEGIN
  PERFORM public.lg_assert_can_manage_group(p_group);
  INSERT INTO public.learning_groups (name, subject_id, grade_code, academic_year_start, created_by)
  SELECT name, subject_id, grade_code, p_new_year::smallint, auth.uid()
  FROM public.learning_groups WHERE id = p_group
  RETURNING id INTO v_new;
  IF v_new IS NULL THEN RAISE EXCEPTION 'group_not_found'; END IF;
  INSERT INTO public.learning_group_teachers (group_id, teacher_user_id, role_in_group, added_by)
  SELECT v_new, teacher_user_id, role_in_group, auth.uid()
  FROM public.learning_group_teachers WHERE group_id = p_group;
  IF p_include_students THEN
    INSERT INTO public.learning_group_students (group_id, student_id, added_by)
    SELECT v_new, student_id, auth.uid()
    FROM public.learning_group_students WHERE group_id = p_group AND left_at IS NULL;
  END IF;
  PERFORM public.lg_log(v_new, 'group.duplicate', 'group', p_group, NULL,
    jsonb_build_object('new_year', p_new_year, 'include_students', p_include_students));
  RETURN v_new;
END $$;

-- teachers: replace-all; every member must hold role=teacher; at most one lead
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
   WHERE COALESCE(e->>'role_in_group','teacher') NOT IN ('lead','teacher')
      OR NOT EXISTS (SELECT 1 FROM public.user_roles ur
                     WHERE ur.user_id = (e->>'user_id')::uuid AND ur.role = 'teacher');
  IF v_bad > 0 THEN RAISE EXCEPTION 'invalid_teacher_in_payload'; END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_old
  FROM public.learning_group_teachers t WHERE group_id = p_group;

  DELETE FROM public.learning_group_teachers WHERE group_id = p_group;
  INSERT INTO public.learning_group_teachers (group_id, teacher_user_id, role_in_group, added_by)
  SELECT p_group, (e->>'user_id')::uuid, COALESCE(e->>'role_in_group','teacher'), auth.uid()
  FROM jsonb_array_elements(p_teachers) e;

  PERFORM public.lg_log(p_group, 'teachers.set', 'teacher', NULL, v_old, p_teachers);
END $$;

CREATE OR REPLACE FUNCTION public.add_students_to_group(p_group uuid, p_student_ids uuid[])
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_added int; v_missing int;
BEGIN
  PERFORM public.lg_assert_can_manage_members(p_group);
  IF NOT EXISTS (SELECT 1 FROM public.learning_groups WHERE id = p_group) THEN
    RAISE EXCEPTION 'group_not_found';
  END IF;
  IF p_student_ids IS NULL OR array_length(p_student_ids, 1) IS NULL THEN RETURN 0; END IF;
  IF array_length(p_student_ids, 1) > 300 THEN RAISE EXCEPTION 'batch_too_large'; END IF;
  SELECT count(*) INTO v_missing FROM unnest(p_student_ids) sid
   WHERE NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id = sid);
  IF v_missing > 0 THEN RAISE EXCEPTION 'unknown_student_in_payload'; END IF;

  INSERT INTO public.learning_group_students (group_id, student_id, added_by)
  SELECT p_group, sid, auth.uid()
  FROM unnest(p_student_ids) sid
  WHERE NOT EXISTS (
    SELECT 1 FROM public.learning_group_students m
    WHERE m.group_id = p_group AND m.student_id = sid AND m.left_at IS NULL
  );
  GET DIAGNOSTICS v_added = ROW_COUNT;
  PERFORM public.lg_log(p_group, 'students.add', 'student', NULL, NULL,
    jsonb_build_object('requested', array_length(p_student_ids, 1), 'added', v_added, 'ids', to_jsonb(p_student_ids)));
  RETURN v_added;
END $$;

-- convenience only: class picks students ONCE; membership is the truth after
CREATE OR REPLACE FUNCTION public.add_class_to_group(p_group uuid, p_class_name text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_added int;
BEGIN
  PERFORM public.lg_assert_can_manage_members(p_group);
  IF NOT EXISTS (SELECT 1 FROM public.learning_groups WHERE id = p_group) THEN
    RAISE EXCEPTION 'group_not_found';
  END IF;
  INSERT INTO public.learning_group_students (group_id, student_id, added_by)
  SELECT p_group, s.id, auth.uid()
  FROM public.students s
  WHERE replace(COALESCE(s.class_name, ''), ' ', '') = replace(COALESCE(p_class_name, ''), ' ', '')
    AND replace(COALESCE(p_class_name, ''), ' ', '') <> ''
    AND NOT EXISTS (
      SELECT 1 FROM public.learning_group_students m
      WHERE m.group_id = p_group AND m.student_id = s.id AND m.left_at IS NULL
    );
  GET DIAGNOSTICS v_added = ROW_COUNT;
  PERFORM public.lg_log(p_group, 'students.add_class', 'class', NULL, NULL,
    jsonb_build_object('class_name', p_class_name, 'added', v_added));
  RETURN v_added;
END $$;

CREATE OR REPLACE FUNCTION public.remove_student_from_group(p_group uuid, p_student uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_n int;
BEGIN
  PERFORM public.lg_assert_can_manage_members(p_group);
  UPDATE public.learning_group_students
  SET left_at = now()
  WHERE group_id = p_group AND student_id = p_student AND left_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN RAISE EXCEPTION 'active_membership_not_found'; END IF;
  PERFORM public.lg_log(p_group, 'students.remove', 'student', p_student, NULL, NULL);
END $$;

-- reads: owner sees everything; learning_groups.view holders see groups
-- they teach in. (Currently nobody holds the permission → owner only.)
CREATE OR REPLACE FUNCTION public.get_learning_group_details(p_group uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v jsonb;
BEGIN
  IF NOT public.is_system_owner(auth.uid()) THEN
    IF NOT (public.has_permission(auth.uid(), 'learning_groups.view')
            AND EXISTS (SELECT 1 FROM public.learning_group_teachers
                        WHERE group_id = p_group AND teacher_user_id = auth.uid())) THEN
      RAISE EXCEPTION 'not_authorized';
    END IF;
  END IF;
  SELECT jsonb_build_object(
    'group', to_jsonb(g),
    'teachers', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'user_id', t.teacher_user_id, 'role_in_group', t.role_in_group,
        'full_name', p.full_name))
      FROM public.learning_group_teachers t
      LEFT JOIN public.profiles p ON p.id = t.teacher_user_id
      WHERE t.group_id = g.id), '[]'::jsonb),
    'active_students', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'student_id', s.student_id, 'full_name', st.full_name,
        'class_name', st.class_name, 'joined_at', s.joined_at)
        ORDER BY st.full_name)
      FROM public.learning_group_students s
      JOIN public.students st ON st.id = s.student_id
      WHERE s.group_id = g.id AND s.left_at IS NULL), '[]'::jsonb),
    'active_count', (SELECT count(*) FROM public.learning_group_students s
                     WHERE s.group_id = g.id AND s.left_at IS NULL)
  ) INTO v
  FROM public.learning_groups g WHERE g.id = p_group;
  IF v IS NULL THEN RAISE EXCEPTION 'group_not_found'; END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.list_learning_groups(p_year integer DEFAULT NULL, p_status text DEFAULT 'active')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_owner boolean; v jsonb;
BEGIN
  v_owner := public.is_system_owner(auth.uid());
  IF NOT v_owner AND NOT public.has_permission(auth.uid(), 'learning_groups.view') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', g.id, 'name', g.name, 'subject_id', g.subject_id,
      'subject_name', subj.subject_name, 'grade_code', g.grade_code,
      'academic_year_start', g.academic_year_start, 'status', g.status,
      'teacher_count', (SELECT count(*) FROM public.learning_group_teachers t WHERE t.group_id = g.id),
      'active_students', (SELECT count(*) FROM public.learning_group_students s WHERE s.group_id = g.id AND s.left_at IS NULL)
    ) ORDER BY g.academic_year_start DESC, subj.subject_name, g.name), '[]'::jsonb) INTO v
  FROM public.learning_groups g
  JOIN public.subjects subj ON subj.id = g.subject_id
  WHERE (p_year IS NULL OR g.academic_year_start = p_year)
    AND (p_status IS NULL OR g.status = p_status)
    AND (v_owner OR EXISTS (SELECT 1 FROM public.learning_group_teachers t
                            WHERE t.group_id = g.id AND t.teacher_user_id = auth.uid()));
  RETURN v;
END $$;

-- ── 7. Function privileges: authenticated only, never PUBLIC ──
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'create_learning_group(text, uuid, integer, text)',
    'update_learning_group(uuid, text, integer, text)',
    'archive_learning_group(uuid)',
    'duplicate_group_for_year(uuid, integer, boolean)',
    'set_group_teachers(uuid, jsonb)',
    'add_students_to_group(uuid, uuid[])',
    'add_class_to_group(uuid, text)',
    'remove_student_from_group(uuid, uuid)',
    'get_learning_group_details(uuid)',
    'list_learning_groups(integer, text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

-- ── 8. Self-tests (no fake users, no data created) ──
DO $$
DECLARE v_perms int; v_granted int; t1 boolean; t2 boolean;
BEGIN
  SELECT count(*) INTO v_perms FROM public.permissions WHERE category = 'learning_groups';
  SELECT count(*) INTO v_granted FROM public.role_permissions
   WHERE permission_key LIKE 'learning_groups.%';
  t1 := NOT public.has_teacher_group_scope(gen_random_uuid(), gen_random_uuid(), gen_random_uuid());
  BEGIN
    INSERT INTO public.learning_group_audit_log (action) VALUES ('selftest');
    UPDATE public.learning_group_audit_log SET action = 'x' WHERE action = 'selftest';
    t2 := false;
  EXCEPTION WHEN OTHERS THEN t2 := true;
  END;
  RAISE NOTICE 'STAGE2A: lg_permissions=% (expected 3) role_grants=% (expected 0) stranger_scope_false=% audit_append_only=%',
    v_perms, v_granted, t1, t2;
END $$;
