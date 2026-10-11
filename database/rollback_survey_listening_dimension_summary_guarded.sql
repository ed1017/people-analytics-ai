-- Supabase apply_migration query body. The migration executor owns transaction/history.
-- No client directives, transaction delimiters, fixture overrides or manual history writes.
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '10s';
SET LOCAL transaction_timeout = '15s';
SET LOCAL idle_in_transaction_session_timeout = '10s';
SET LOCAL search_path = pg_catalog, public;
-- ACCESS SHARE stabilizes the view and its dependencies against concurrent DDL;
-- ordinary reads/writes remain compatible until CREATE OR REPLACE upgrades the view lock.
DO $guard$
DECLARE
  before_contract jsonb;
  after_contract jsonb;
  expected_contract jsonb := $production_contract${"view":{"oid":"19812","owner":"postgres","acl":"{postgres=arwdDxtm/postgres,anon=Dxtm/postgres,authenticated=Dxtm/postgres,service_role=rDxtm/postgres}","reloptions":["security_invoker=true"],"columns":[{"name":"survey_code","type":"text","collation":"\"default\""},{"name":"survey_name","type":"text","collation":"\"default\""},{"name":"survey_type","type":"text","collation":"\"default\""},{"name":"question_code","type":"text","collation":"\"default\""},{"name":"dimension","type":"text","collation":"\"default\""},{"name":"question_text","type":"text","collation":"\"default\""},{"name":"employee_respondents","type":"integer","collation":"-"},{"name":"candidate_respondents","type":"integer","collation":"-"},{"name":"separation_respondents","type":"integer","collation":"-"},{"name":"avg_score","type":"numeric","collation":"-"},{"name":"favorable_pct","type":"numeric","collation":"-"}]},"tables":[{"table":"survey_questions","owner":"postgres","rls":true,"force_rls":false,"constraints":["PRIMARY KEY (survey_question_id)","UNIQUE (survey_id, question_code)"]},{"table":"survey_responses","owner":"postgres","rls":true,"force_rls":false,"constraints":["PRIMARY KEY (survey_response_id)"]},{"table":"surveys","owner":"postgres","rls":true,"force_rls":false,"constraints":["PRIMARY KEY (survey_id)","UNIQUE (survey_code)"]}],"policies":[],"roles":[{"name":"anon","bypassrls":false,"superuser":false},{"name":"authenticated","bypassrls":false,"superuser":false},{"name":"postgres","bypassrls":true,"superuser":false},{"name":"service_role","bypassrls":true,"superuser":false}]}$production_contract$::jsonb;
BEGIN
  -- Reject executors that autocommit each SET LOCAL separately.
  IF current_setting('lock_timeout') <> '2s'
     OR current_setting('statement_timeout') <> '10s'
     OR current_setting('transaction_timeout') <> '15s'
     OR current_setting('idle_in_transaction_session_timeout') <> '10s'
     OR current_setting('search_path') <> 'pg_catalog, public' THEN
    RAISE EXCEPTION 'Migration transaction settings were not retained' USING ERRCODE = 'P0001';
  END IF;
  LOCK TABLE public.survey_listening_dimension_summary IN ACCESS SHARE MODE;
  IF current_setting('server_version_num') <> '170006' THEN
    RAISE EXCEPTION 'Unreviewed PostgreSQL version' USING ERRCODE = 'P0001';
  END IF;
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
) INTO before_contract;

  IF before_contract->'view'->>'definition_sha256' IS DISTINCT FROM 'e3c68cdd720994413bc3d8fe4afa21be11c15e573b8cbed333e50e88db34d7db' THEN
    RAISE EXCEPTION 'Unexpected starting catalog definition hash for rollback' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_set(before_contract, '{view}', (before_contract->'view') - 'definition' - 'definition_sha256')
       IS DISTINCT FROM expected_contract THEN
    RAISE EXCEPTION 'Starting metadata contract mismatch for rollback' USING ERRCODE = 'P0001';
  END IF;
  EXECUTE $reviewed_payload$-- Restore the captured definition; preserve the existing owner and ACL.
CREATE OR REPLACE VIEW public.survey_listening_dimension_summary
WITH (security_invoker = true) AS
 SELECT s.survey_code,
    s.survey_name,
    s.survey_type,
    q.question_code,
    q.dimension,
    q.question_text,
    count(DISTINCT sr.employee_id)::integer AS employee_respondents,
    count(DISTINCT sr.candidate_id)::integer AS candidate_respondents,
    count(DISTINCT sr.separation_id)::integer AS separation_respondents,
    round(avg(sr.numeric_response), 2) AS avg_score,
    round(100.0 * count(*) FILTER (WHERE sr.numeric_response >= 4::numeric)::numeric / NULLIF(count(sr.numeric_response), 0)::numeric, 1) AS favorable_pct
   FROM public.surveys s
     JOIN public.survey_questions q ON q.survey_id = s.survey_id
     JOIN public.survey_responses sr ON sr.survey_question_id = q.survey_question_id
  WHERE sr.numeric_response IS NOT NULL
  GROUP BY s.survey_code, s.survey_name, s.survey_type, q.survey_question_id, q.question_code, q.dimension, q.question_text;
$reviewed_payload$;
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
) INTO after_contract;

  IF after_contract->'view'->>'definition_sha256' IS DISTINCT FROM 'e572aa161aab4246ecd1e3a26b6754ac383b23c909aed7c2dcb0e2e1ff4da954' THEN
    RAISE EXCEPTION 'Unexpected resulting catalog definition hash for rollback' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_set(after_contract, '{view}', (after_contract->'view') - 'definition' - 'definition_sha256')
       IS DISTINCT FROM expected_contract THEN
    RAISE EXCEPTION 'Resulting metadata contract mismatch for rollback' USING ERRCODE = 'P0001';
  END IF;
  RAISE NOTICE 'Guarded rollback passed: exact catalog hash and full metadata contract';
END;
$guard$;
