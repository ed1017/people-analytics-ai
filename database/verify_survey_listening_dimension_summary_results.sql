-- SEPARATELY AUTHORIZED POST-CHANGE ACCEPTANCE ONLY. Potentially expensive.
-- Run once, using psql ON_ERROR_STOP=1. No raw result rows are returned.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '10s';
SET LOCAL transaction_timeout = '15s';
SET LOCAL ROLE service_role;
DO $acceptance$
DECLARE
  baseline_count bigint;
  candidate_count bigint;
  difference_count bigint;
BEGIN
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
)
SELECT (SELECT count(*) FROM baseline) AS baseline_rows,
       (SELECT count(*) FROM candidate) AS candidate_rows,
       (SELECT count(*) FROM differences) AS unordered_difference_count
INTO baseline_count, candidate_count, difference_count;
IF difference_count <> 0 OR baseline_count <> candidate_count THEN
  RAISE EXCEPTION 'Survey dimension mismatch: baseline %, candidate %, unordered differences %',
    baseline_count, candidate_count, difference_count USING ERRCODE = 'P0001';
END IF;
RAISE NOTICE 'Survey dimension acceptance passed: baseline %, candidate %, unordered differences %',
  baseline_count, candidate_count, difference_count;
END;
$acceptance$;
COMMIT;
