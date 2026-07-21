-- ═══════════════════════════════════════════════════════════════════
-- SECURITY FIX — teacher scope on public.students.
-- Root cause: the SELECT policy "Teachers can view all students"
-- (migration 20260511192208) granted EVERY teacher read access to EVERY
-- student row. This migration replaces it with learning-group scope:
-- a teacher reads ONLY students who are ACTIVE members (left_at IS NULL)
-- of ACTIVE learning groups in which that teacher is assigned. A teacher
-- with no groups gets 0 rows. Fail closed: any scope failure returns
-- nothing, never the full table.
-- Enforcement is in the DATABASE (RLS), not the UI. Direct URL /
-- search / counts / export all pass through this same policy.
-- Untouched: admin SELECT/INSERT/UPDATE/DELETE policies, coach scope,
-- parent scope, student scope, the import mechanism, and all data.
-- Idempotent; safe to re-run. No PII in this file.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. subject-agnostic teacher↔student scope helper ──
CREATE OR REPLACE FUNCTION public.is_teacher_of_student(_user_id uuid, _student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.learning_groups g
    JOIN public.learning_group_teachers t
      ON t.group_id = g.id AND t.teacher_user_id = _user_id
    JOIN public.learning_group_students s
      ON s.group_id = g.id AND s.student_id = _student_id AND s.left_at IS NULL
    WHERE g.status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.is_teacher_of_student(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_teacher_of_student(uuid, uuid) TO authenticated;

-- ── 2. replace the wide-open teacher SELECT policy ──
DROP POLICY IF EXISTS "Teachers can view all students" ON public.students;
DROP POLICY IF EXISTS "Teachers view their group students" ON public.students;
CREATE POLICY "Teachers view their group students"
ON public.students FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'teacher')
  AND public.is_teacher_of_student(auth.uid(), id)
);

-- ── 3. self-tests (read-only assertions; nothing written) ──
DO $$
DECLARE t1 boolean; t2 boolean; t3 boolean; t4 boolean; t5 boolean;
BEGIN
  -- old wide policy is gone
  t1 := NOT EXISTS (SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = 'students'
                      AND policyname = 'Teachers can view all students');
  -- new scoped policy exists
  t2 := EXISTS (SELECT 1 FROM pg_policies
                WHERE schemaname = 'public' AND tablename = 'students'
                  AND policyname = 'Teachers view their group students');
  -- scope function fails closed for unknown users/students
  t3 := NOT public.is_teacher_of_student(gen_random_uuid(), gen_random_uuid());
  -- the other role policies are untouched
  t4 := (SELECT count(*) FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'students'
           AND policyname IN ('Admins can view all students',
                              'Coaches can view students in their sport',
                              'Parents can view their linked student',
                              'Students can view their linked student')) = 4;
  -- writes remain admin-only (no teacher write policy exists)
  t5 := NOT EXISTS (SELECT 1 FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = 'students'
                      AND cmd <> 'SELECT' AND qual ILIKE '%teacher%');
  RAISE NOTICE 'TEACHER_SCOPE: wide_policy_removed=% scoped_policy_added=% fail_closed=% other_roles_untouched=% writes_admin_only=%',
    t1, t2, t3, t4, t5;
END $$;
