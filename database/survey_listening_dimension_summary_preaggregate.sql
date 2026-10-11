-- LOCAL REVIEW CANDIDATE ONLY. Not applied to live Supabase.
-- CREATE OR REPLACE preserves the existing owner and ACL; no GRANT statements.
CREATE OR REPLACE VIEW public.survey_listening_dimension_summary
WITH (security_invoker = true) AS
WITH response_aggregates AS (
  SELECT
    sr.survey_question_id,
    count(DISTINCT sr.employee_id) AS employee_respondents,
    count(DISTINCT sr.candidate_id) AS candidate_respondents,
    count(DISTINCT sr.separation_id) AS separation_respondents,
    avg(sr.numeric_response) AS avg_score,
    count(*) FILTER (WHERE sr.numeric_response >= 4::numeric) AS favorable_count,
    count(sr.numeric_response) AS numeric_count
  FROM public.survey_responses sr
  WHERE sr.numeric_response IS NOT NULL
  GROUP BY sr.survey_question_id
)
SELECT
  s.survey_code,
  s.survey_name,
  s.survey_type,
  q.question_code,
  q.dimension,
  q.question_text,
  a.employee_respondents::integer AS employee_respondents,
  a.candidate_respondents::integer AS candidate_respondents,
  a.separation_respondents::integer AS separation_respondents,
  round(a.avg_score, 2) AS avg_score,
  round(100.0 * a.favorable_count::numeric
    / NULLIF(a.numeric_count, 0)::numeric, 1) AS favorable_pct
FROM public.surveys s
JOIN public.survey_questions q ON q.survey_id = s.survey_id
JOIN response_aggregates a ON a.survey_question_id = q.survey_question_id;
