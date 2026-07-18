-- ═══════════════════════════════════════════════════════════════════
-- Root-cause fix for coach invites losing linked_sport.
-- claim_pending_invite() validates linked_sport against public.sports,
-- but the catalog still held the 6 demo sports (כדורגל, התעמלות, שחייה,
-- אתלטיקה, ג'ודו, טניס) while the real roster uses names like
-- 'ג'ודו בנים', 'כדורעף בנות', 'טיפוס'... so the validation NULLed the
-- sport on claim. Sync the catalog from the real roster (sport names
-- only, no PII), then repair the QA coach user. Idempotent.
-- No policy/permission changes for any role.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Catalog = every sport that actually appears on the roster
INSERT INTO public.sports (sport_name)
SELECT DISTINCT s.sport
FROM public.students s
WHERE s.sport IS NOT NULL AND s.sport <> ''
ON CONFLICT (sport_name) DO NOTHING;

-- 2. Repair the existing QA coach (invite was already consumed with sport NULLed)
UPDATE public.profiles p
SET linked_sport = 'ג''ודו בנים'
FROM auth.users au
WHERE au.id = p.id
  AND lower(au.email) = 'orelman+wingateqa@gmail.com'
  AND EXISTS (SELECT 1 FROM public.sports WHERE sport_name = 'ג''ודו בנים');

-- 3. Diagnostics
DO $$
DECLARE
  v_sports int; v_pending int; v_role text; v_sport text; v_student uuid;
BEGIN
  SELECT count(*) INTO v_sports FROM public.sports;
  SELECT count(*) INTO v_pending FROM public.pending_invites WHERE lower(email) = 'orelman+wingateqa@gmail.com';
  SELECT ur.role::text, p.linked_sport, p.linked_student_id
    INTO v_role, v_sport, v_student
  FROM auth.users au
  LEFT JOIN public.user_roles ur ON ur.user_id = au.id
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE lower(au.email) = 'orelman+wingateqa@gmail.com';
  RAISE NOTICE 'sports_catalog=% | qa_pending_left=% (expected 0) | qa_role=% | qa_linked_sport=% | qa_linked_student=%',
    v_sports, v_pending, v_role, v_sport, v_student;
END $$;
