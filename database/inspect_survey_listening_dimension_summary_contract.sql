-- Catalog-only evidence for preflight and pre-commit/post-commit verification.
-- No aggregate view execution. Run within the bounded operator transaction.
SELECT jsonb_build_object(
  'view', (SELECT jsonb_build_object(
    'oid', c.oid, 'owner', pg_get_userbyid(c.relowner),
    'acl', c.relacl::text, 'reloptions', c.reloptions,
    'definition', pg_get_viewdef(c.oid, true),
    'definition_sha256', encode(sha256(convert_to(pg_get_viewdef(c.oid, true), 'UTF8')), 'hex'),
    'columns', (SELECT jsonb_agg(jsonb_build_object(
      'name', a.attname, 'type', format_type(a.atttypid, a.atttypmod),
      'collation', a.attcollation::regcollation::text) ORDER BY a.attnum)
      FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped))
    FROM pg_class c WHERE c.oid = 'public.survey_listening_dimension_summary'::regclass),
  'tables', (SELECT jsonb_agg(jsonb_build_object(
    'table', c.relname, 'owner', pg_get_userbyid(c.relowner),
    'rls', c.relrowsecurity, 'force_rls', c.relforcerowsecurity,
    'constraints', (SELECT jsonb_agg(pg_get_constraintdef(k.oid) ORDER BY pg_get_constraintdef(k.oid))
      FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype IN ('p', 'u')))
    ORDER BY c.relname) FROM pg_class c WHERE c.oid IN
      ('public.surveys'::regclass, 'public.survey_questions'::regclass, 'public.survey_responses'::regclass)),
  'policies', (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY tablename, policyname), '[]'::jsonb)
    FROM pg_policies p WHERE schemaname = 'public'
      AND tablename IN ('surveys', 'survey_questions', 'survey_responses')),
  'roles', (SELECT jsonb_agg(jsonb_build_object('name', rolname, 'bypassrls', rolbypassrls,
    'superuser', rolsuper) ORDER BY rolname) FROM pg_roles
    WHERE rolname IN ('postgres', 'service_role', 'anon', 'authenticated'))
) AS release_contract;
