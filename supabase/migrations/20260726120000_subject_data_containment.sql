-- ═══════════════════════════════════════════════════════════════════
-- Phase 2C.0a — Immediate data-loss containment
--
-- 1) The three subject-data FK edges move from ON DELETE CASCADE to
--    ON DELETE RESTRICT, so no delete (UI, direct API, or mistake)
--    can cascade away student progress:
--      student_subject_progress.subject_id      -> subjects.id
--      subject_roadmaps.subject_id              -> subjects.id
--      student_roadmap_progress.roadmap_item_id -> subject_roadmaps.id
-- 2) Direct DELETE on public.subjects is revoked for PUBLIC / anon /
--    authenticated and the delete policy is dropped. Until the
--    archive/delete-if-empty stage, subject deletion is fully blocked.
--    service_role keeps its privileges (server maintenance only).
--
-- The migration changes NO data. It aborts atomically (nothing
-- applied) if the schema differs from what it expects or if orphan
-- rows exist, and finishes with self-check NOTICEs.
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_conname text;
  v_orphans bigint;
  v_restrict_count int;
  r record;
BEGIN
  -- ── Guard: expected tables/columns must exist ──
  FOR r IN
    SELECT * FROM (VALUES
      ('student_subject_progress', 'subject_id'),
      ('subject_roadmaps', 'subject_id'),
      ('student_roadmap_progress', 'roadmap_item_id'),
      ('subjects', 'id')
    ) AS t(tbl, col)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = r.tbl AND column_name = r.col
    ) THEN
      RAISE EXCEPTION 'containment aborted: missing column public.%.% — schema differs, nothing changed', r.tbl, r.col;
    END IF;
  END LOOP;

  -- ── Per-edge: orphan guard, locate the real FK by structure, retype it ──
  FOR r IN
    SELECT * FROM (VALUES
      ('student_subject_progress', 'subject_id', 'subjects', 'id'),
      ('subject_roadmaps', 'subject_id', 'subjects', 'id'),
      ('student_roadmap_progress', 'roadmap_item_id', 'subject_roadmaps', 'id')
    ) AS t(tbl, col, reftbl, refcol)
  LOOP
    -- orphan rows would make ADD CONSTRAINT fail mid-way; check first (count only, no PII)
    EXECUTE format(
      'SELECT count(*) FROM public.%I c WHERE c.%I IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.%I p WHERE p.%I = c.%I)',
      r.tbl, r.col, r.reftbl, r.refcol, r.col
    ) INTO v_orphans;
    IF v_orphans > 0 THEN
      RAISE EXCEPTION 'containment aborted: % orphan row(s) in public.%.% with no parent in public.% — nothing changed',
        v_orphans, r.tbl, r.col, r.reftbl;
    END IF;

    -- find the existing FK by table + column list + referenced table (not by assumed name)
    SELECT c.conname INTO v_conname
    FROM pg_constraint c
    JOIN pg_class ct ON ct.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = ct.relnamespace
    JOIN pg_class rt ON rt.oid = c.confrelid
    WHERE n.nspname = 'public' AND ct.relname = r.tbl AND rt.relname = r.reftbl
      AND c.contype = 'f'
      AND (SELECT array_agg(a.attname::text ORDER BY k.ord)
             FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
             JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
          ) = ARRAY[r.col];
    IF v_conname IS NULL THEN
      RAISE EXCEPTION 'containment aborted: FK public.%.% -> public.% not found — schema differs, nothing changed',
        r.tbl, r.col, r.reftbl;
    END IF;

    RAISE NOTICE 'FK before: %.% -> % via constraint "%" (retyping to RESTRICT)', r.tbl, r.col, r.reftbl, v_conname;

    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.tbl, v_conname);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(%I) ON DELETE RESTRICT',
      r.tbl, r.tbl || '_' || r.col || '_fkey', r.col, r.reftbl, r.refcol
    );
  END LOOP;

  -- ── Self-check: exactly 3 RESTRICT edges ──
  SELECT count(*) INTO v_restrict_count
  FROM pg_constraint c
  JOIN pg_class ct ON ct.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = ct.relnamespace
  WHERE n.nspname = 'public' AND c.contype = 'f' AND c.confdeltype = 'r'
    AND c.conname IN (
      'student_subject_progress_subject_id_fkey',
      'subject_roadmaps_subject_id_fkey',
      'student_roadmap_progress_roadmap_item_id_fkey'
    );
  IF v_restrict_count <> 3 THEN
    RAISE EXCEPTION 'containment self-check failed: expected 3 RESTRICT FKs, found %', v_restrict_count;
  END IF;
  RAISE NOTICE 'self-check ok: all 3 subject-data FKs are ON DELETE RESTRICT';
END $$;

-- ── 2) Subject deletion fully blocked until the archive stage ──
REVOKE DELETE ON public.subjects FROM PUBLIC;
REVOKE DELETE ON public.subjects FROM anon;
REVOKE DELETE ON public.subjects FROM authenticated;
DROP POLICY IF EXISTS "Admins can delete subjects" ON public.subjects;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'subjects'
      AND privilege_type = 'DELETE' AND grantee IN ('PUBLIC', 'anon', 'authenticated')
  ) THEN
    RAISE EXCEPTION 'containment self-check failed: DELETE still granted on public.subjects';
  END IF;
  RAISE NOTICE 'self-check ok: direct DELETE on subjects revoked for PUBLIC/anon/authenticated (service_role retained)';
END $$;
