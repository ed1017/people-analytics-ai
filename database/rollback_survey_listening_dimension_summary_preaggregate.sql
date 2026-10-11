-- Restore the captured definition; preserve the existing owner and ACL.
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
