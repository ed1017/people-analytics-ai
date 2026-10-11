SET LOCAL statement_timeout = '10s';
SET LOCAL transaction_timeout = '15s';
SET LOCAL lock_timeout = '2s';
SET TRANSACTION READ ONLY;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL ROLE service_role;
LOCK TABLE public.survey_listening_dimension_summary IN ACCESS SHARE MODE;
DO $guard$
DECLARE actual_contract jsonb;
BEGIN
IF current_setting('statement_timeout') <> '10s'
 OR current_setting('transaction_timeout') <> '15s'
 OR current_setting('transaction_read_only') <> 'on'
 OR current_setting('lock_timeout') <> '2s'
 OR current_setting('search_path') <> 'pg_catalog, public'
 OR current_setting('server_version_num') <> '170006'
 OR current_user <> 'service_role' THEN
 RAISE EXCEPTION 'Acceptance settings not retained; aggregate not run';
END IF;
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
) INTO actual_contract;
IF actual_contract IS DISTINCT FROM $contract${"view": {"acl": "{postgres=arwdDxtm/postgres,anon=Dxtm/postgres,authenticated=Dxtm/postgres,service_role=rDxtm/postgres}", "oid": "19812", "owner": "postgres", "columns": [{"name": "survey_code", "type": "text", "collation": "\"default\""}, {"name": "survey_name", "type": "text", "collation": "\"default\""}, {"name": "survey_type", "type": "text", "collation": "\"default\""}, {"name": "question_code", "type": "text", "collation": "\"default\""}, {"name": "dimension", "type": "text", "collation": "\"default\""}, {"name": "question_text", "type": "text", "collation": "\"default\""}, {"name": "employee_respondents", "type": "integer", "collation": "-"}, {"name": "candidate_respondents", "type": "integer", "collation": "-"}, {"name": "separation_respondents", "type": "integer", "collation": "-"}, {"name": "avg_score", "type": "numeric", "collation": "-"}, {"name": "favorable_pct", "type": "numeric", "collation": "-"}], "definition": " WITH response_aggregates AS (\n         SELECT sr.survey_question_id,\n            count(DISTINCT sr.employee_id) AS employee_respondents,\n            count(DISTINCT sr.candidate_id) AS candidate_respondents,\n            count(DISTINCT sr.separation_id) AS separation_respondents,\n            avg(sr.numeric_response) AS avg_score,\n            count(*) FILTER (WHERE sr.numeric_response >= 4::numeric) AS favorable_count,\n            count(sr.numeric_response) AS numeric_count\n           FROM survey_responses sr\n          WHERE sr.numeric_response IS NOT NULL\n          GROUP BY sr.survey_question_id\n        )\n SELECT s.survey_code,\n    s.survey_name,\n    s.survey_type,\n    q.question_code,\n    q.dimension,\n    q.question_text,\n    a.employee_respondents::integer AS employee_respondents,\n    a.candidate_respondents::integer AS candidate_respondents,\n    a.separation_respondents::integer AS separation_respondents,\n    round(a.avg_score, 2) AS avg_score,\n    round(100.0 * a.favorable_count::numeric / NULLIF(a.numeric_count, 0)::numeric, 1) AS favorable_pct\n   FROM surveys s\n     JOIN survey_questions q ON q.survey_id = s.survey_id\n     JOIN response_aggregates a ON a.survey_question_id = q.survey_question_id;", "reloptions": ["security_invoker=true"], "definition_sha256": "e3c68cdd720994413bc3d8fe4afa21be11c15e573b8cbed333e50e88db34d7db"}, "roles": [{"name": "anon", "bypassrls": false, "superuser": false}, {"name": "authenticated", "bypassrls": false, "superuser": false}, {"name": "postgres", "bypassrls": true, "superuser": false}, {"name": "service_role", "bypassrls": true, "superuser": false}], "tables": [{"rls": true, "owner": "postgres", "table": "survey_questions", "force_rls": false, "constraints": ["PRIMARY KEY (survey_question_id)", "UNIQUE (survey_id, question_code)"]}, {"rls": true, "owner": "postgres", "table": "survey_responses", "force_rls": false, "constraints": ["PRIMARY KEY (survey_response_id)"]}, {"rls": true, "owner": "postgres", "table": "surveys", "force_rls": false, "constraints": ["PRIMARY KEY (survey_id)", "UNIQUE (survey_code)"]}], "policies": []}$contract$::jsonb THEN
 RAISE EXCEPTION 'Acceptance metadata drift; aggregate not run';
END IF;
END;
$guard$;
WITH baseline AS MATERIALIZED (
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
  GROUP BY s.survey_code, s.survey_name, s.survey_type, q.survey_question_id, q.question_code, q.dimension, q.question_text
), candidate AS MATERIALIZED (
  SELECT * FROM public.survey_listening_dimension_summary
), differences AS (
  (SELECT * FROM baseline EXCEPT ALL SELECT * FROM candidate)
  UNION ALL
  (SELECT * FROM candidate EXCEPT ALL SELECT * FROM baseline)
), totals AS MATERIALIZED (
 SELECT count(*) AS unordered_difference_count FROM differences
)
SELECT unordered_difference_count,
 round((extract(epoch FROM (clock_timestamp() - statement_timestamp())) * 1000)::numeric, 3) AS server_batch_elapsed_ms
FROM totals;
