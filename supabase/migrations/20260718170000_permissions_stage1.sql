-- ═══════════════════════════════════════════════════════════════════
-- PERMISSIONS SYSTEM — STAGE 1 (additive only).
-- Creates: system_owners, permissions, role_permissions,
-- permission_audit_log, is_system_owner(), has_permission(),
-- catalog seed + behavior-mirroring default matrix, owner seeding.
--
-- ZERO behavioral change: no existing business policy references these
-- objects yet, none of the 87 existing policies is touched, no UI change.
-- Idempotent: safe to re-run. No PII anywhere in this file: the System
-- Owner is derived from the single existing admin row in user_roles.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. system_owners ── (not writable/readable via the API at all:
--     RLS enabled with NO policies; access only via SECURITY DEFINER fns
--     and the SQL editor. A regular admin cannot touch it.)
CREATE TABLE IF NOT EXISTS public.system_owners (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_owners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.system_owners FROM authenticated, anon;
GRANT ALL ON public.system_owners TO service_role;

-- Never allow deleting the last System Owner (even by SQL mistake)
CREATE OR REPLACE FUNCTION public.protect_last_system_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.system_owners) <= 1 THEN
    RAISE EXCEPTION 'cannot_remove_last_system_owner';
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS protect_last_owner ON public.system_owners;
CREATE TRIGGER protect_last_owner
  BEFORE DELETE ON public.system_owners
  FOR EACH ROW EXECUTE FUNCTION public.protect_last_system_owner();

-- ── 2. permissions catalog ── (readable by any signed-in user; writes
--     locked — catalog is defined in code/migrations only.)
CREATE TABLE IF NOT EXISTS public.permissions (
  key text PRIMARY KEY,
  description text NOT NULL,
  category text NOT NULL,
  is_critical boolean NOT NULL DEFAULT false
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.permissions FROM authenticated, anon;
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
DROP POLICY IF EXISTS "Authenticated can read permission catalog" ON public.permissions;
CREATE POLICY "Authenticated can read permission catalog"
  ON public.permissions FOR SELECT TO authenticated USING (true);

-- ── 3. role_permissions ── (no API policies: managed only via future
--     System-Owner RPC / SQL editor.)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.app_role NOT NULL,
  permission_key text NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid,
  PRIMARY KEY (role, permission_key)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.role_permissions FROM authenticated, anon;
GRANT ALL ON public.role_permissions TO service_role;

-- Critical permissions can never be granted to any role
CREATE OR REPLACE FUNCTION public.reject_critical_role_grant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.permissions p
             WHERE p.key = NEW.permission_key AND p.is_critical) THEN
    RAISE EXCEPTION 'critical_permission_cannot_be_granted_to_roles';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS reject_critical_grant ON public.role_permissions;
CREATE TRIGGER reject_critical_grant
  BEFORE INSERT OR UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.reject_critical_role_grant();

-- ── 4. permission_audit_log ── (append-only: no API grants at all;
--     writes happen only via SECURITY DEFINER triggers; UPDATE/DELETE
--     blocked by trigger as well.)
CREATE TABLE IF NOT EXISTS public.permission_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid,
  action text NOT NULL,
  role public.app_role,
  permission_key text,
  target_user uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.permission_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.permission_audit_log FROM authenticated, anon;
GRANT ALL ON public.permission_audit_log TO service_role;

CREATE OR REPLACE FUNCTION public.audit_log_is_append_only()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'permission_audit_log_is_append_only';
END $$;
DROP TRIGGER IF EXISTS audit_append_only ON public.permission_audit_log;
CREATE TRIGGER audit_append_only
  BEFORE UPDATE OR DELETE ON public.permission_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_is_append_only();

-- Audit every change to role_permissions and system_owners.
-- Field access goes through jsonb so the same function serves tables
-- with different columns, and OLD/NEW are only touched when assigned.
CREATE OR REPLACE FUNCTION public.audit_permission_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old jsonb; v_new jsonb;
  v_role public.app_role; v_key text; v_target uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW); END IF;
  IF TG_TABLE_NAME = 'role_permissions' THEN
    v_role := COALESCE(v_new->>'role', v_old->>'role')::public.app_role;
    v_key  := COALESCE(v_new->>'permission_key', v_old->>'permission_key');
  ELSIF TG_TABLE_NAME = 'system_owners' THEN
    v_target := COALESCE(v_new->>'user_id', v_old->>'user_id')::uuid;
  END IF;
  INSERT INTO public.permission_audit_log (actor, action, role, permission_key, target_user, old_value, new_value)
  VALUES (auth.uid(), TG_TABLE_NAME || '.' || lower(TG_OP), v_role, v_key, v_target, v_old, v_new);
  RETURN NULL; -- AFTER row trigger: return value is ignored
END $$;
DROP TRIGGER IF EXISTS audit_role_permissions ON public.role_permissions;
CREATE TRIGGER audit_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_permission_change();
DROP TRIGGER IF EXISTS audit_system_owners ON public.system_owners;
CREATE TRIGGER audit_system_owners
  AFTER INSERT OR DELETE ON public.system_owners
  FOR EACH ROW EXECUTE FUNCTION public.audit_permission_change();

-- ── 5. Functions ──
CREATE OR REPLACE FUNCTION public.is_system_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.system_owners WHERE user_id = _user_id);
$$;
REVOKE ALL ON FUNCTION public.is_system_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_system_owner(uuid) TO authenticated;

-- has_permission:
--   System Owner  → true for everything.
--   Anyone else   → critical keys are always false; otherwise the role
--                   matrix (user_roles × role_permissions).
--   (user_permission_overrides will be added in a later stage via
--    CREATE OR REPLACE without breaking callers.)
--   NOTE: a permission grants an ACTION only — data access always also
--   requires the scope checks added in stage 2.
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.is_system_owner(_user_id) THEN true
    WHEN EXISTS (SELECT 1 FROM public.permissions p WHERE p.key = _key AND p.is_critical) THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role = ur.role
      WHERE ur.user_id = _user_id AND rp.permission_key = _key
    )
  END;
$$;
REVOKE ALL ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text) TO authenticated;

-- ── 6. Catalog seed ──
INSERT INTO public.permissions (key, description, category, is_critical) VALUES
  ('system.permissions.manage', 'ניהול מטריצת ההרשאות',            'system',    true),
  ('system.scopes.manage',      'ניהול ציוותי משתמשים',            'system',    true),
  ('system.audit.view',         'צפייה ביומן שינויי הרשאות',       'system',    true),
  ('roadmap.view',              'צפייה במפות דרך',                  'roadmap',   false),
  ('roadmap.template.create',   'יצירת תבנית מפת דרך',             'roadmap',   false),
  ('roadmap.template.edit',     'עריכת תבנית מפת דרך',             'roadmap',   false),
  ('roadmap.student.edit',      'התאמת מפת דרך לתלמיד',            'roadmap',   false),
  ('roadmap.progress.update',   'סימון התקדמות במפת דרך',          'roadmap',   false),
  ('materials.view',            'צפייה בחומרי לימוד',               'materials', false),
  ('materials.upload',          'העלאת חומרי לימוד',                'materials', false),
  ('assignments.review',        'בדיקת משימות',                     'materials', false),
  ('grades.view',               'צפייה בציונים',                    'grades',    false),
  ('grades.edit',               'עריכת ציונים',                     'grades',    false),
  ('student.basic_details.view',   'צפייה בפרטי תלמיד בסיסיים',    'students',  false),
  ('student.personal_details.edit','עריכת פרטים אישיים של תלמיד',  'students',  false)
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description, category = EXCLUDED.category, is_critical = EXCLUDED.is_critical;

-- ── 7. Default matrix — mirrors TODAY'S effective behavior 1:1.
--     Not enforced by any policy yet (stage 5 will switch roadmap
--     policies over), so this has zero runtime effect today.
INSERT INTO public.role_permissions (role, permission_key)
SELECT r.role::public.app_role, k FROM (VALUES
  ('admin','roadmap.view'), ('admin','roadmap.template.create'), ('admin','roadmap.template.edit'),
  ('admin','roadmap.student.edit'), ('admin','roadmap.progress.update'),
  ('admin','materials.view'), ('admin','materials.upload'), ('admin','assignments.review'),
  ('admin','grades.view'), ('admin','grades.edit'),
  ('admin','student.basic_details.view'), ('admin','student.personal_details.edit'),
  ('teacher','roadmap.view'), ('teacher','roadmap.template.create'), ('teacher','roadmap.template.edit'),
  ('teacher','roadmap.progress.update'),
  ('teacher','materials.view'), ('teacher','assignments.review'),
  ('teacher','grades.view'), ('teacher','grades.edit'),
  ('teacher','student.basic_details.view'),
  ('coach','student.basic_details.view'),
  ('parent','roadmap.view'), ('parent','grades.view'), ('parent','student.basic_details.view'),
  ('student','roadmap.view'), ('student','grades.view'), ('student','student.basic_details.view')
) r(role, k)
ON CONFLICT (role, permission_key) DO NOTHING;

-- ── 8. Seed the System Owner — deterministic and PII-free:
--     exactly one admin exists in user_roles → she is the owner.
--     If ever more than one admin exists, nothing is seeded and the
--     NOTICE says to seed manually in the SQL editor.
DO $$
DECLARE n int; v uuid;
BEGIN
  SELECT count(*) INTO n FROM public.user_roles WHERE role = 'admin';
  IF n = 1 THEN
    SELECT user_id INTO v FROM public.user_roles WHERE role = 'admin';
    INSERT INTO public.system_owners (user_id) VALUES (v) ON CONFLICT (user_id) DO NOTHING;
    RAISE NOTICE 'OWNER_SEED: seeded from the single admin user';
  ELSIF EXISTS (SELECT 1 FROM public.system_owners) THEN
    RAISE NOTICE 'OWNER_SEED: already seeded, skipping';
  ELSE
    RAISE NOTICE 'OWNER_SEED: % admins found — seed manually (see instructions)', n;
  END IF;
END $$;

-- ── 9. Self-tests ──
DO $$
DECLARE
  v_owner uuid; v_perms int; v_matrix int; v_owners int;
  t1 boolean; t2 boolean; t3 boolean; t4 boolean;
BEGIN
  SELECT count(*) INTO v_perms  FROM public.permissions;
  SELECT count(*) INTO v_matrix FROM public.role_permissions;
  SELECT count(*) INTO v_owners FROM public.system_owners;
  SELECT user_id  INTO v_owner  FROM public.system_owners LIMIT 1;

  -- owner gets everything, incl. critical
  t1 := v_owner IS NOT NULL AND public.has_permission(v_owner, 'system.permissions.manage');
  -- a random (nonexistent) user gets nothing
  t2 := NOT public.has_permission(gen_random_uuid(), 'roadmap.view');
  -- critical is false for non-owners even if somehow asked
  t3 := NOT public.has_permission(gen_random_uuid(), 'system.permissions.manage');
  -- granting a critical key to a role must fail
  BEGIN
    INSERT INTO public.role_permissions (role, permission_key) VALUES ('teacher', 'system.permissions.manage');
    t4 := false;
  EXCEPTION WHEN OTHERS THEN t4 := true;
  END;

  RAISE NOTICE 'STAGE1: permissions=% matrix_rows=% owners=% | owner_all_perms=% stranger_denied=% critical_denied=% critical_grant_blocked=%',
    v_perms, v_matrix, v_owners, t1, t2, t3, t4;
END $$;
