-- Local schema recovery only. No production activation, records, or seed routine.

BEGIN;

DO $$ BEGIN IF current_database() IS DISTINCT FROM 'pa_analytics_fixture' OR inet_server_addr() IS DISTINCT FROM '127.0.0.1'::inet THEN RAISE EXCEPTION 'Dedicated localhost fixture only'; END IF; IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname IN ('fow','workforce_release')) THEN RAISE EXCEPTION 'Recovery schemas already exist'; END IF; IF (SELECT count(*) FROM pg_tables WHERE schemaname='public')<>83 OR to_regprocedure('public.dashboard_overview_filtered(text,text,text)') IS NULL THEN RAISE EXCEPTION 'Public analytics prerequisite'; END IF; IF to_regprocedure('public.workforce_performance_release_v1(text,text,text)') IS NOT NULL THEN RAISE EXCEPTION 'Performance function already exists'; END IF; END $$;

CREATE SCHEMA fow;

CREATE SCHEMA workforce_release;

SET LOCAL search_path=public,pg_catalog;

CREATE TABLE "fow"."action_recommendations" ("recommendation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
"run_id" uuid,
"dataset_id" text NOT NULL,
"scope_key" text NOT NULL,
"move" text NOT NULL,
"text" text NOT NULL,
"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
"model" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"prompt_sha" text);

CREATE TABLE "fow"."ai_pulse_questions" ("question_code" text NOT NULL,
"question_text" text NOT NULL,
"reverse_scored" boolean DEFAULT false NOT NULL);

CREATE TABLE "fow"."ai_pulse_responses" ("response_id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
"employee_id" uuid NOT NULL,
"question_code" text NOT NULL,
"score" smallint NOT NULL,
"response_date" date NOT NULL);

CREATE TABLE "fow"."ai_tools" ("tool_id" text NOT NULL,
"name" text NOT NULL,
"category" text NOT NULL,
"licenses" integer DEFAULT 0 NOT NULL,
"approved" boolean NOT NULL);

CREATE TABLE "fow"."ai_usage_weekly" ("employee_id" uuid NOT NULL,
"tool_id" text NOT NULL,
"week_start" date NOT NULL,
"active_days" smallint NOT NULL,
"sessions" integer NOT NULL);

CREATE TABLE "fow"."ai_use_cases" ("use_case_id" uuid DEFAULT gen_random_uuid() NOT NULL,
"name" text NOT NULL,
"hr_process" text NOT NULL,
"tool_id" text,
"decision_impact" text NOT NULL,
"owner" text NOT NULL,
"human_in_loop" boolean NOT NULL,
"status" text NOT NULL,
"description" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE "fow"."dataset_jobs" ("dataset_id" text NOT NULL,
"job_key" text NOT NULL,
"title" text NOT NULL,
"function_name" text NOT NULL,
"family_name" text NOT NULL,
"onetsoc_code" text,
"headcount" integer,
"labor_cost_usd" numeric(14,2),
"job_profile_id" uuid);

CREATE TABLE "fow"."datasets" ("dataset_id" text NOT NULL,
"name" text NOT NULL,
"source" text NOT NULL,
"created_by" text NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE "fow"."job_tasks" ("dataset_id" text NOT NULL,
"job_key" text NOT NULL,
"task_id" bigint NOT NULL,
"time_share" numeric(8,6) NOT NULL);

CREATE TABLE "fow"."retest_runs" ("retest_id" uuid DEFAULT gen_random_uuid() NOT NULL,
"model" text NOT NULL,
"prompt_sha" text NOT NULL,
"status" text DEFAULT 'running'::text NOT NULL,
"tasks_scored" integer DEFAULT 0 NOT NULL,
"input_tokens" bigint DEFAULT 0 NOT NULL,
"output_tokens" bigint DEFAULT 0 NOT NULL,
"cost_usd" numeric(10,4),
"error" text,
"started_at" timestamp with time zone DEFAULT now() NOT NULL,
"finished_at" timestamp with time zone);

CREATE TABLE "fow"."retest_scores" ("retest_id" uuid NOT NULL,
"task_id" bigint NOT NULL,
"label" text NOT NULL,
"confidence" text NOT NULL);

CREATE TABLE "fow"."risk_assessments" ("assessment_id" uuid DEFAULT gen_random_uuid() NOT NULL,
"use_case_id" uuid NOT NULL,
"framework" text NOT NULL,
"tier" text NOT NULL,
"rationale" text NOT NULL,
"review_state" text DEFAULT 'draft'::text NOT NULL,
"assessed_on" date NOT NULL,
"bias_audit_date" date,
"next_review_date" date);

CREATE TABLE "fow"."score_reviews" ("review_id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
"run_id" uuid NOT NULL,
"task_id" bigint NOT NULL,
"reviewer" text NOT NULL,
"agrees" boolean NOT NULL,
"override_label" text,
"note" text,
"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE "fow"."scoring_runs" ("run_id" uuid DEFAULT gen_random_uuid() NOT NULL,
"dataset_id" text,
"model" text NOT NULL,
"rubric_version" text NOT NULL,
"prompt_sha" text NOT NULL,
"status" text DEFAULT 'running'::text NOT NULL,
"tasks_scored" integer DEFAULT 0 NOT NULL,
"input_tokens" bigint DEFAULT 0 NOT NULL,
"output_tokens" bigint DEFAULT 0 NOT NULL,
"cost_usd" numeric(10,4),
"error" text,
"started_at" timestamp with time zone DEFAULT now() NOT NULL,
"finished_at" timestamp with time zone);

CREATE TABLE "fow"."task_exposure_scores" ("run_id" uuid NOT NULL,
"task_id" bigint NOT NULL,
"label" text NOT NULL,
"exposure" numeric(3,2) NOT NULL,
"confidence" text NOT NULL,
"rationale" text NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE "fow"."task_statements" ("task_id" bigint NOT NULL,
"onetsoc_code" text,
"task_text" text NOT NULL,
"task_type" text,
"importance" numeric(4,2),
"frequency" numeric(4,2),
"source" text DEFAULT 'onet'::text NOT NULL);

CREATE TABLE "fow"."validation_sample" ("run_id" uuid NOT NULL,
"task_id" bigint NOT NULL,
"stratum" text NOT NULL,
"stratum_size" integer NOT NULL,
"position" integer NOT NULL,
"drawn_at" timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE "workforce_release"."performance_rating_v1" ("org_code" text NOT NULL,
"payload" jsonb NOT NULL,
"source_sha256" text NOT NULL,
"content_sha256" text NOT NULL,
"extracted_at" timestamp with time zone DEFAULT transaction_timestamp() NOT NULL,
"activated_at" timestamp with time zone,
"active" boolean DEFAULT false NOT NULL);

ALTER TABLE "fow"."action_recommendations" ADD CONSTRAINT "action_recommendations_evidence_check" CHECK (jsonb_typeof(evidence) = 'array'::text);

ALTER TABLE "fow"."action_recommendations" ADD CONSTRAINT "action_recommendations_move_check" CHECK (move = ANY (ARRAY['reskill'::text, 'redesign'::text, 'redeploy'::text, 'hold'::text]));

ALTER TABLE "fow"."action_recommendations" ADD CONSTRAINT "action_recommendations_pkey" PRIMARY KEY (recommendation_id);

ALTER TABLE "fow"."ai_pulse_questions" ADD CONSTRAINT "ai_pulse_questions_pkey" PRIMARY KEY (question_code);

ALTER TABLE "fow"."ai_pulse_responses" ADD CONSTRAINT "ai_pulse_responses_employee_id_question_code_response_date_key" UNIQUE (employee_id, question_code, response_date);

ALTER TABLE "fow"."ai_pulse_responses" ADD CONSTRAINT "ai_pulse_responses_pkey" PRIMARY KEY (response_id);

ALTER TABLE "fow"."ai_pulse_responses" ADD CONSTRAINT "ai_pulse_responses_score_check" CHECK (score >= 1 AND score <= 5);

ALTER TABLE "fow"."ai_tools" ADD CONSTRAINT "ai_tools_licenses_check" CHECK (licenses >= 0);

ALTER TABLE "fow"."ai_tools" ADD CONSTRAINT "ai_tools_pkey" PRIMARY KEY (tool_id);

ALTER TABLE "fow"."ai_tools" ADD CONSTRAINT "ai_tools_tool_id_check" CHECK (tool_id ~ '^[a-z0-9-]+$'::text);

ALTER TABLE "fow"."ai_usage_weekly" ADD CONSTRAINT "ai_usage_weekly_active_days_check" CHECK (active_days >= 0 AND active_days <= 7);

ALTER TABLE "fow"."ai_usage_weekly" ADD CONSTRAINT "ai_usage_weekly_pkey" PRIMARY KEY (employee_id, tool_id, week_start);

ALTER TABLE "fow"."ai_usage_weekly" ADD CONSTRAINT "ai_usage_weekly_sessions_check" CHECK (sessions >= 0);

ALTER TABLE "fow"."ai_usage_weekly" ADD CONSTRAINT "ai_usage_weekly_week_start_check" CHECK (EXTRACT(isodow FROM week_start) = 1::numeric);

ALTER TABLE "fow"."ai_use_cases" ADD CONSTRAINT "ai_use_cases_decision_impact_check" CHECK (decision_impact = ANY (ARRAY['none'::text, 'informs'::text, 'determines'::text]));

ALTER TABLE "fow"."ai_use_cases" ADD CONSTRAINT "ai_use_cases_pkey" PRIMARY KEY (use_case_id);

ALTER TABLE "fow"."ai_use_cases" ADD CONSTRAINT "ai_use_cases_status_check" CHECK (status = ANY (ARRAY['proposed'::text, 'pilot'::text, 'production'::text, 'retired'::text]));

ALTER TABLE "fow"."dataset_jobs" ADD CONSTRAINT "dataset_jobs_headcount_check" CHECK (headcount >= 0);

ALTER TABLE "fow"."dataset_jobs" ADD CONSTRAINT "dataset_jobs_labor_cost_usd_check" CHECK (labor_cost_usd >= 0::numeric);

ALTER TABLE "fow"."dataset_jobs" ADD CONSTRAINT "dataset_jobs_pkey" PRIMARY KEY (dataset_id, job_key);

ALTER TABLE "fow"."datasets" ADD CONSTRAINT "datasets_dataset_id_check" CHECK (dataset_id ~ '^[a-z0-9][a-z0-9_-]{2,63}$'::text);

ALTER TABLE "fow"."datasets" ADD CONSTRAINT "datasets_pkey" PRIMARY KEY (dataset_id);

ALTER TABLE "fow"."datasets" ADD CONSTRAINT "datasets_source_check" CHECK (source = ANY (ARRAY['builtin'::text, 'upload'::text]));

ALTER TABLE "fow"."job_tasks" ADD CONSTRAINT "job_tasks_pkey" PRIMARY KEY (dataset_id, job_key, task_id);

ALTER TABLE "fow"."job_tasks" ADD CONSTRAINT "job_tasks_time_share_check" CHECK (time_share > 0::numeric AND time_share <= 1::numeric);

ALTER TABLE "fow"."retest_runs" ADD CONSTRAINT "retest_runs_pkey" PRIMARY KEY (retest_id);

ALTER TABLE "fow"."retest_runs" ADD CONSTRAINT "retest_runs_status_check" CHECK (status = ANY (ARRAY['running'::text, 'succeeded'::text, 'failed'::text]));

ALTER TABLE "fow"."retest_runs" ADD CONSTRAINT "retest_runs_tasks_scored_check" CHECK (tasks_scored >= 0);

ALTER TABLE "fow"."retest_scores" ADD CONSTRAINT "retest_scores_confidence_check" CHECK (confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]));

ALTER TABLE "fow"."retest_scores" ADD CONSTRAINT "retest_scores_label_check" CHECK (label = ANY (ARRAY['automate'::text, 'augment'::text, 'unaffected'::text]));

ALTER TABLE "fow"."retest_scores" ADD CONSTRAINT "retest_scores_pkey" PRIMARY KEY (retest_id, task_id);

ALTER TABLE "fow"."risk_assessments" ADD CONSTRAINT "risk_assessments_framework_check" CHECK (framework = ANY (ARRAY['EU AI Act'::text, 'NYC LL 144'::text, 'NIST AI RMF'::text, 'Internal'::text]));

ALTER TABLE "fow"."risk_assessments" ADD CONSTRAINT "risk_assessments_pkey" PRIMARY KEY (assessment_id);

ALTER TABLE "fow"."risk_assessments" ADD CONSTRAINT "risk_assessments_review_state_check" CHECK (review_state = ANY (ARRAY['draft'::text, 'in_review'::text, 'approved'::text, 'changes_requested'::text]));

ALTER TABLE "fow"."risk_assessments" ADD CONSTRAINT "risk_assessments_tier_check" CHECK (tier = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]));

ALTER TABLE "fow"."risk_assessments" ADD CONSTRAINT "risk_assessments_use_case_id_framework_assessed_on_key" UNIQUE (use_case_id, framework, assessed_on);

ALTER TABLE "fow"."score_reviews" ADD CONSTRAINT "score_reviews_override_label_check" CHECK (override_label = ANY (ARRAY['automate'::text, 'augment'::text, 'unaffected'::text]));

ALTER TABLE "fow"."score_reviews" ADD CONSTRAINT "score_reviews_pkey" PRIMARY KEY (review_id);

ALTER TABLE "fow"."score_reviews" ADD CONSTRAINT "score_reviews_run_id_task_id_reviewer_key" UNIQUE (run_id, task_id, reviewer);

ALTER TABLE "fow"."scoring_runs" ADD CONSTRAINT "scoring_runs_pkey" PRIMARY KEY (run_id);

ALTER TABLE "fow"."scoring_runs" ADD CONSTRAINT "scoring_runs_status_check" CHECK (status = ANY (ARRAY['running'::text, 'succeeded'::text, 'failed'::text]));

ALTER TABLE "fow"."scoring_runs" ADD CONSTRAINT "scoring_runs_tasks_scored_check" CHECK (tasks_scored >= 0);

ALTER TABLE "fow"."task_exposure_scores" ADD CONSTRAINT "task_exposure_scores_confidence_check" CHECK (confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]));

ALTER TABLE "fow"."task_exposure_scores" ADD CONSTRAINT "task_exposure_scores_exposure_check" CHECK (exposure >= 0::numeric AND exposure <= 1::numeric);

ALTER TABLE "fow"."task_exposure_scores" ADD CONSTRAINT "task_exposure_scores_label_check" CHECK (label = ANY (ARRAY['automate'::text, 'augment'::text, 'unaffected'::text]));

ALTER TABLE "fow"."task_exposure_scores" ADD CONSTRAINT "task_exposure_scores_pkey" PRIMARY KEY (run_id, task_id);

ALTER TABLE "fow"."task_exposure_scores" ADD CONSTRAINT "task_exposure_scores_rationale_check" CHECK (cardinality(regexp_split_to_array(btrim(rationale), '\s+'::text)) <= 40);

ALTER TABLE "fow"."task_statements" ADD CONSTRAINT "task_statements_pkey" PRIMARY KEY (task_id);

ALTER TABLE "fow"."task_statements" ADD CONSTRAINT "task_statements_source_check" CHECK (source = ANY (ARRAY['onet'::text, 'custom'::text]));

ALTER TABLE "fow"."validation_sample" ADD CONSTRAINT "validation_sample_pkey" PRIMARY KEY (run_id, task_id);

ALTER TABLE "fow"."validation_sample" ADD CONSTRAINT "validation_sample_position_check" CHECK ("position" > 0);

ALTER TABLE "fow"."validation_sample" ADD CONSTRAINT "validation_sample_position_key" UNIQUE ("position");

ALTER TABLE "fow"."validation_sample" ADD CONSTRAINT "validation_sample_stratum_check" CHECK (stratum = ANY (ARRAY['automate'::text, 'augment'::text, 'unaffected'::text]));

ALTER TABLE "fow"."validation_sample" ADD CONSTRAINT "validation_sample_stratum_size_check" CHECK (stratum_size > 0);

ALTER TABLE "workforce_release"."performance_rating_v1" ADD CONSTRAINT "performance_rating_v1_content_sha256_check" CHECK (content_sha256 ~ '^[a-f0-9]{64}$'::text);

ALTER TABLE "workforce_release"."performance_rating_v1" ADD CONSTRAINT "performance_rating_v1_org_code_check" CHECK (org_code = ANY (ARRAY['all'::text, 'BU-CLIENTOPS'::text, 'BU-CONS'::text, 'BU-CORP'::text, 'BU-DATAAI'::text, 'BU-DIGITAL'::text, 'BU-MGSVC'::text, 'BU-SALES'::text, 'BU-TECH'::text]));

ALTER TABLE "workforce_release"."performance_rating_v1" ADD CONSTRAINT "performance_rating_v1_payload_check" CHECK (jsonb_typeof(payload) = 'object'::text AND (payload - ARRAY['version'::text, 'source'::text, 'snapshotDate'::text, 'reviewPeriod'::text, 'periodKind'::text, 'filters'::text, 'status'::text, 'availabilityKind'::text, 'simulatedAvailableAt'::text, 'originalAvailableAt'::text, 'provenance'::text, 'notRatedStatus'::text, 'counts'::text]) = '{}'::jsonb);

ALTER TABLE "workforce_release"."performance_rating_v1" ADD CONSTRAINT "performance_rating_v1_pkey" PRIMARY KEY (org_code);

ALTER TABLE "workforce_release"."performance_rating_v1" ADD CONSTRAINT "performance_rating_v1_source_sha256_check" CHECK (source_sha256 = '6b9ad129a9b8b24f775cd0d78895140ee8c16f2425016a9b091f3ff96cde9a60'::text);

ALTER TABLE "fow"."action_recommendations" ADD CONSTRAINT "action_recommendations_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES fow.datasets(dataset_id) ON DELETE CASCADE;

ALTER TABLE "fow"."action_recommendations" ADD CONSTRAINT "action_recommendations_run_id_fkey" FOREIGN KEY (run_id) REFERENCES fow.scoring_runs(run_id) ON DELETE SET NULL;

ALTER TABLE "fow"."ai_pulse_responses" ADD CONSTRAINT "ai_pulse_responses_question_code_fkey" FOREIGN KEY (question_code) REFERENCES fow.ai_pulse_questions(question_code) ON UPDATE CASCADE;

ALTER TABLE "fow"."ai_usage_weekly" ADD CONSTRAINT "ai_usage_weekly_tool_id_fkey" FOREIGN KEY (tool_id) REFERENCES fow.ai_tools(tool_id) ON UPDATE CASCADE;

ALTER TABLE "fow"."ai_use_cases" ADD CONSTRAINT "ai_use_cases_tool_id_fkey" FOREIGN KEY (tool_id) REFERENCES fow.ai_tools(tool_id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE "fow"."dataset_jobs" ADD CONSTRAINT "dataset_jobs_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES fow.datasets(dataset_id) ON DELETE CASCADE;

ALTER TABLE "fow"."job_tasks" ADD CONSTRAINT "job_tasks_dataset_id_job_key_fkey" FOREIGN KEY (dataset_id, job_key) REFERENCES fow.dataset_jobs(dataset_id, job_key) ON DELETE CASCADE;

ALTER TABLE "fow"."job_tasks" ADD CONSTRAINT "job_tasks_task_id_fkey" FOREIGN KEY (task_id) REFERENCES fow.task_statements(task_id);

ALTER TABLE "fow"."retest_scores" ADD CONSTRAINT "retest_scores_retest_id_fkey" FOREIGN KEY (retest_id) REFERENCES fow.retest_runs(retest_id) ON DELETE CASCADE;

ALTER TABLE "fow"."retest_scores" ADD CONSTRAINT "retest_scores_task_id_fkey" FOREIGN KEY (task_id) REFERENCES fow.task_statements(task_id);

ALTER TABLE "fow"."risk_assessments" ADD CONSTRAINT "risk_assessments_use_case_id_fkey" FOREIGN KEY (use_case_id) REFERENCES fow.ai_use_cases(use_case_id) ON DELETE CASCADE;

ALTER TABLE "fow"."score_reviews" ADD CONSTRAINT "score_reviews_run_id_task_id_fkey" FOREIGN KEY (run_id, task_id) REFERENCES fow.task_exposure_scores(run_id, task_id) ON DELETE CASCADE;

ALTER TABLE "fow"."scoring_runs" ADD CONSTRAINT "scoring_runs_dataset_id_fkey" FOREIGN KEY (dataset_id) REFERENCES fow.datasets(dataset_id) ON DELETE SET NULL;

ALTER TABLE "fow"."task_exposure_scores" ADD CONSTRAINT "task_exposure_scores_run_id_fkey" FOREIGN KEY (run_id) REFERENCES fow.scoring_runs(run_id) ON DELETE CASCADE;

ALTER TABLE "fow"."task_exposure_scores" ADD CONSTRAINT "task_exposure_scores_task_id_fkey" FOREIGN KEY (task_id) REFERENCES fow.task_statements(task_id);

ALTER TABLE "fow"."validation_sample" ADD CONSTRAINT "validation_sample_run_id_task_id_fkey" FOREIGN KEY (run_id, task_id) REFERENCES fow.task_exposure_scores(run_id, task_id) ON DELETE CASCADE;

CREATE INDEX action_recommendations_dataset_idx ON fow.action_recommendations USING btree (dataset_id, scope_key);

CREATE INDEX ai_pulse_responses_date_idx ON fow.ai_pulse_responses USING btree (response_date, question_code);

CREATE INDEX ai_usage_weekly_week_idx ON fow.ai_usage_weekly USING btree (week_start, tool_id);

CREATE INDEX dataset_jobs_job_profile_idx ON fow.dataset_jobs USING btree (job_profile_id);

CREATE INDEX job_tasks_task_idx ON fow.job_tasks USING btree (task_id);

CREATE INDEX risk_assessments_use_case_idx ON fow.risk_assessments USING btree (use_case_id, framework, assessed_on DESC);

CREATE INDEX task_exposure_scores_task_idx ON fow.task_exposure_scores USING btree (task_id);

CREATE INDEX task_statements_onetsoc_idx ON fow.task_statements USING btree (onetsoc_code);

CREATE OR REPLACE FUNCTION workforce_release.keep_performance_rating_v1_frozen()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$ begin
 if tg_op='DELETE' then raise exception 'Preserve frozen release; deactivate instead'; end if;
 if row(new.org_code,new.payload,new.source_sha256,new.content_sha256,new.extracted_at) is distinct from row(old.org_code,old.payload,old.source_sha256,old.content_sha256,old.extracted_at)
 or old.activated_at is not null and new.activated_at is distinct from old.activated_at
 then raise exception 'Frozen release content cannot be changed'; end if;
 return new;
end $function$
;

CREATE OR REPLACE FUNCTION fow.min_group_size()
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select 10 $function$
;

CREATE OR REPLACE FUNCTION fow.seeded_hash(p_seed integer, p_key text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$ select md5(p_seed::text || ':' || p_key) $function$
;

CREATE OR REPLACE FUNCTION fow.hash_unit(p_hash text, p_part integer DEFAULT 0)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$
  select ('x' || substr(p_hash, 1 + 10 * p_part, 10))::bit(40)::bigint
    / 1099511627776.0::double precision
$function$
;

CREATE OR REPLACE FUNCTION fow.seeded_unit(p_seed integer, p_key text)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$ select fow.hash_unit(fow.seeded_hash(p_seed, p_key), 0) $function$
;

CREATE VIEW "fow"."job_exposure_base" WITH (security_invoker=true) AS  WITH latest_scores AS (
         SELECT DISTINCT ON (s.task_id) s.task_id,
            s.label,
            s.exposure
           FROM fow.task_exposure_scores s
             JOIN fow.scoring_runs r ON r.run_id = s.run_id
          WHERE r.status = 'succeeded'::text
          ORDER BY s.task_id, r.finished_at DESC NULLS LAST, r.started_at DESC
        ), job_scores AS (
         SELECT jt.dataset_id,
            jt.job_key,
            count(*) AS tasks_total,
            count(ls.task_id) AS tasks_scored,
            sum(jt.time_share) FILTER (WHERE ls.task_id IS NOT NULL) AS score_coverage,
            COALESCE(sum(jt.time_share) FILTER (WHERE ls.label = 'automate'::text), 0::numeric) AS automate_share,
            COALESCE(sum(jt.time_share) FILTER (WHERE ls.label = 'augment'::text), 0::numeric) AS augment_share,
            COALESCE(sum(jt.time_share * ls.exposure), 0::numeric) AS exposure_score
           FROM fow.job_tasks jt
             LEFT JOIN latest_scores ls ON ls.task_id = jt.task_id
          GROUP BY jt.dataset_id, jt.job_key
        )
 SELECT dj.dataset_id,
    dj.job_key,
    dj.title,
    dj.function_name,
    dj.family_name,
    dj.onetsoc_code,
    dj.job_profile_id,
    COALESCE(dj.headcount, 0) AS headcount,
    COALESCE(dj.labor_cost_usd, 0::numeric) AS labor_cost_usd,
    COALESCE(js.tasks_total, 0::bigint)::integer AS tasks_total,
    COALESCE(js.tasks_scored, 0::bigint)::integer AS tasks_scored,
    js.score_coverage,
        CASE
            WHEN js.tasks_scored > 0 THEN js.automate_share
            ELSE NULL::numeric
        END AS automate_share,
        CASE
            WHEN js.tasks_scored > 0 THEN js.augment_share
            ELSE NULL::numeric
        END AS augment_share,
        CASE
            WHEN js.tasks_scored > 0 THEN js.automate_share + js.augment_share
            ELSE NULL::numeric
        END AS exposed_share,
        CASE
            WHEN js.tasks_scored > 0 THEN js.exposure_score
            ELSE NULL::numeric
        END AS exposure_score
   FROM fow.dataset_jobs dj
     LEFT JOIN job_scores js ON js.dataset_id = dj.dataset_id AND js.job_key = dj.job_key;

CREATE VIEW "fow"."v_adoption_manager" WITH (security_invoker=true) AS  WITH latest_snapshot AS (
         SELECT es.employee_id,
            es.job_profile_id,
            es.manager_employee_id
           FROM employee_snapshots es
          WHERE es.snapshot_date = (( SELECT max(employee_snapshots.snapshot_date) AS max
                   FROM employee_snapshots)) AND es.manager_employee_id IS NOT NULL
        ), latest_week AS (
         SELECT max(ai_usage_weekly.week_start) AS week_start
           FROM fow.ai_usage_weekly
        ), employee_usage AS (
         SELECT u.employee_id,
            bool_or(t_1.approved) AS licensed,
            bool_or(t_1.approved AND u.active_days > 0) AS weekly_active
           FROM fow.ai_usage_weekly u
             JOIN fow.ai_tools t_1 ON t_1.tool_id = u.tool_id
          WHERE u.week_start = (( SELECT latest_week.week_start
                   FROM latest_week))
          GROUP BY u.employee_id
        ), teams AS (
         SELECT ls.manager_employee_id,
            mode() WITHIN GROUP (ORDER BY dj.function_name) AS function_name,
            count(*)::integer AS headcount,
            count(*) FILTER (WHERE eu.licensed)::integer AS licensed_employees,
            count(*) FILTER (WHERE eu.weekly_active)::integer AS weekly_active_users
           FROM latest_snapshot ls
             JOIN fow.dataset_jobs dj ON dj.job_profile_id = ls.job_profile_id AND dj.dataset_id = 'builtin'::text
             LEFT JOIN employee_usage eu ON eu.employee_id = ls.employee_id
          GROUP BY ls.manager_employee_id
         HAVING count(*) >= fow.min_group_size()
        )
 SELECT function_name,
    row_number() OVER (PARTITION BY function_name ORDER BY headcount DESC, manager_employee_id)::integer AS team_number,
    ( SELECT latest_week.week_start
           FROM latest_week) AS week_start,
    headcount,
    licensed_employees,
    weekly_active_users,
    round(licensed_employees::numeric / headcount::numeric, 4) AS licensed_rate,
    round(weekly_active_users::numeric / headcount::numeric, 4) AS weekly_active_rate
   FROM teams t;

CREATE VIEW "fow"."v_course_catalog" WITH (security_invoker=true) AS  SELECT c.course_code,
    c.course_name,
    c.provider,
    c.duration_hours,
    s.skill_code,
    s.skill_name,
    s.skill_category
   FROM learning_courses c
     JOIN skills s ON s.skill_id = c.skill_id
  WHERE c.active;

CREATE VIEW "fow"."v_exposure_adoption" WITH (security_invoker=true) AS  WITH latest_snapshot AS (
         SELECT es.employee_id,
            es.job_profile_id
           FROM employee_snapshots es
          WHERE es.snapshot_date = (( SELECT max(employee_snapshots.snapshot_date) AS max
                   FROM employee_snapshots))
        ), latest_week AS (
         SELECT max(ai_usage_weekly.week_start) AS week_start
           FROM fow.ai_usage_weekly
        ), employee_usage AS (
         SELECT u.employee_id,
            bool_or(t.approved AND u.week_start = lw.week_start) AS licensed,
            bool_or(t.approved AND u.week_start = lw.week_start AND u.active_days > 0) AS weekly_active,
            bool_or(NOT t.approved AND u.week_start > (lw.week_start - 28) AND u.active_days > 0) AS shadow_user
           FROM fow.ai_usage_weekly u
             JOIN fow.ai_tools t ON t.tool_id = u.tool_id
             CROSS JOIN latest_week lw
          WHERE u.week_start > (lw.week_start - 28)
          GROUP BY u.employee_id
        ), job_adoption AS (
         SELECT dj.dataset_id,
            dj.job_key,
            count(*) FILTER (WHERE eu.licensed) AS licensed,
            count(*) FILTER (WHERE eu.weekly_active) AS weekly_active,
            count(*) FILTER (WHERE eu.shadow_user) AS shadow_users
           FROM fow.dataset_jobs dj
             JOIN latest_snapshot ls ON ls.job_profile_id = dj.job_profile_id
             LEFT JOIN employee_usage eu ON eu.employee_id = ls.employee_id
          GROUP BY dj.dataset_id, dj.job_key
        ), rolled AS (
         SELECT b.dataset_id,
            b.function_name,
            b.family_name,
                CASE
                    WHEN GROUPING(b.function_name) = 1 THEN 'company'::text
                    WHEN GROUPING(b.family_name) = 1 THEN 'function'::text
                    ELSE 'family'::text
                END AS level,
            sum(b.headcount)::integer AS headcount,
            sum(b.labor_cost_usd) AS labor_cost_usd,
            count(b.exposed_share)::integer AS jobs_scored,
            sum(b.headcount::numeric * b.exposed_share) / NULLIF(sum(b.headcount) FILTER (WHERE b.exposed_share IS NOT NULL), 0)::numeric AS exposed_share_hc,
            sum(b.labor_cost_usd * b.exposed_share) / NULLIF(sum(b.labor_cost_usd) FILTER (WHERE b.exposed_share IS NOT NULL), 0::numeric) AS exposed_share_cost,
            sum(b.headcount::numeric * b.exposure_score) / NULLIF(sum(b.headcount) FILTER (WHERE b.exposed_share IS NOT NULL), 0)::numeric AS exposure_score_hc,
            sum(b.labor_cost_usd * b.exposure_score) / NULLIF(sum(b.labor_cost_usd) FILTER (WHERE b.exposed_share IS NOT NULL), 0::numeric) AS exposure_score_cost,
            count(ja.job_key) > 0 AS has_adoption_data,
            sum(ja.licensed)::integer AS licensed_employees,
            sum(ja.weekly_active)::integer AS weekly_active_users,
            sum(ja.shadow_users)::integer AS shadow_ai_users
           FROM fow.job_exposure_base b
             LEFT JOIN job_adoption ja ON ja.dataset_id = b.dataset_id AND ja.job_key = b.job_key
          GROUP BY GROUPING SETS ((b.dataset_id, b.function_name, b.family_name), (b.dataset_id, b.function_name), (b.dataset_id))
        )
 SELECT dataset_id,
    level,
    function_name,
    family_name,
    ( SELECT latest_week.week_start
           FROM latest_week) AS week_start,
    headcount < fow.min_group_size() AS suppressed,
        CASE
            WHEN headcount >= fow.min_group_size() THEN headcount
            ELSE NULL::integer
        END AS headcount,
        CASE
            WHEN headcount >= fow.min_group_size() THEN labor_cost_usd
            ELSE NULL::numeric
        END AS labor_cost_usd,
    jobs_scored,
        CASE
            WHEN headcount >= fow.min_group_size() THEN exposed_share_hc
            ELSE NULL::numeric
        END AS exposed_share_hc,
        CASE
            WHEN headcount >= fow.min_group_size() THEN exposed_share_cost
            ELSE NULL::numeric
        END AS exposed_share_cost,
        CASE
            WHEN headcount >= fow.min_group_size() THEN exposure_score_hc
            ELSE NULL::numeric
        END AS exposure_score_hc,
        CASE
            WHEN headcount >= fow.min_group_size() THEN exposure_score_cost
            ELSE NULL::numeric
        END AS exposure_score_cost,
        CASE
            WHEN headcount >= fow.min_group_size() AND has_adoption_data THEN licensed_employees
            ELSE NULL::integer
        END AS licensed_employees,
        CASE
            WHEN headcount >= fow.min_group_size() AND has_adoption_data THEN weekly_active_users
            ELSE NULL::integer
        END AS weekly_active_users,
        CASE
            WHEN headcount >= fow.min_group_size() AND has_adoption_data THEN round(licensed_employees::numeric / headcount::numeric, 4)
            ELSE NULL::numeric
        END AS licensed_rate,
        CASE
            WHEN headcount >= fow.min_group_size() AND has_adoption_data THEN round(weekly_active_users::numeric / headcount::numeric, 4)
            ELSE NULL::numeric
        END AS weekly_active_rate,
        CASE
            WHEN headcount >= fow.min_group_size() AND licensed_employees >= fow.min_group_size() THEN round(weekly_active_users::numeric / licensed_employees::numeric, 4)
            ELSE NULL::numeric
        END AS weekly_active_rate_licensed,
        CASE
            WHEN headcount >= fow.min_group_size() AND has_adoption_data THEN round(shadow_ai_users::numeric / headcount::numeric, 4)
            ELSE NULL::numeric
        END AS shadow_ai_rate
   FROM rolled r;

CREATE VIEW "fow"."v_function_exposure" WITH (security_invoker=true) AS  WITH rolled AS (
         SELECT b.dataset_id,
            b.function_name,
            GROUPING(b.function_name) = 1 AS is_total,
            count(*)::integer AS jobs,
            count(b.exposed_share)::integer AS jobs_scored,
            sum(b.headcount)::integer AS headcount,
            sum(b.labor_cost_usd) AS labor_cost_usd,
            sum(b.headcount::numeric * b.automate_share) / NULLIF(sum(b.headcount) FILTER (WHERE b.exposed_share IS NOT NULL), 0)::numeric AS automate_share_hc,
            sum(b.headcount::numeric * b.augment_share) / NULLIF(sum(b.headcount) FILTER (WHERE b.exposed_share IS NOT NULL), 0)::numeric AS augment_share_hc,
            sum(b.headcount::numeric * b.exposed_share) / NULLIF(sum(b.headcount) FILTER (WHERE b.exposed_share IS NOT NULL), 0)::numeric AS exposed_share_hc,
            sum(b.headcount::numeric * b.exposure_score) / NULLIF(sum(b.headcount) FILTER (WHERE b.exposed_share IS NOT NULL), 0)::numeric AS exposure_score_hc,
            sum(b.labor_cost_usd * b.automate_share) / NULLIF(sum(b.labor_cost_usd) FILTER (WHERE b.exposed_share IS NOT NULL), 0::numeric) AS automate_share_cost,
            sum(b.labor_cost_usd * b.augment_share) / NULLIF(sum(b.labor_cost_usd) FILTER (WHERE b.exposed_share IS NOT NULL), 0::numeric) AS augment_share_cost,
            sum(b.labor_cost_usd * b.exposed_share) / NULLIF(sum(b.labor_cost_usd) FILTER (WHERE b.exposed_share IS NOT NULL), 0::numeric) AS exposed_share_cost,
            sum(b.labor_cost_usd * b.exposure_score) / NULLIF(sum(b.labor_cost_usd) FILTER (WHERE b.exposed_share IS NOT NULL), 0::numeric) AS exposure_score_cost
           FROM fow.job_exposure_base b
          GROUP BY GROUPING SETS ((b.dataset_id, b.function_name), (b.dataset_id))
        )
 SELECT dataset_id,
    function_name,
    is_total,
    jobs,
    jobs_scored,
    headcount < fow.min_group_size() AS suppressed,
        CASE
            WHEN headcount >= fow.min_group_size() THEN headcount
            ELSE NULL::integer
        END AS headcount,
        CASE
            WHEN headcount >= fow.min_group_size() THEN labor_cost_usd
            ELSE NULL::numeric
        END AS labor_cost_usd,
        CASE
            WHEN headcount >= fow.min_group_size() THEN automate_share_hc
            ELSE NULL::numeric
        END AS automate_share_hc,
        CASE
            WHEN headcount >= fow.min_group_size() THEN augment_share_hc
            ELSE NULL::numeric
        END AS augment_share_hc,
        CASE
            WHEN headcount >= fow.min_group_size() THEN exposed_share_hc
            ELSE NULL::numeric
        END AS exposed_share_hc,
        CASE
            WHEN headcount >= fow.min_group_size() THEN exposure_score_hc
            ELSE NULL::numeric
        END AS exposure_score_hc,
        CASE
            WHEN headcount >= fow.min_group_size() THEN automate_share_cost
            ELSE NULL::numeric
        END AS automate_share_cost,
        CASE
            WHEN headcount >= fow.min_group_size() THEN augment_share_cost
            ELSE NULL::numeric
        END AS augment_share_cost,
        CASE
            WHEN headcount >= fow.min_group_size() THEN exposed_share_cost
            ELSE NULL::numeric
        END AS exposed_share_cost,
        CASE
            WHEN headcount >= fow.min_group_size() THEN exposure_score_cost
            ELSE NULL::numeric
        END AS exposure_score_cost
   FROM rolled r;

CREATE VIEW "fow"."v_function_readiness" WITH (security_invoker=true) AS  WITH latest_snapshot AS (
         SELECT es.employee_id,
            es.job_profile_id
           FROM employee_snapshots es
          WHERE es.snapshot_date = (( SELECT max(employee_snapshots.snapshot_date) AS max
                   FROM employee_snapshots))
        ), people AS (
         SELECT ls.employee_id,
            ls.job_profile_id,
            dj.function_name
           FROM latest_snapshot ls
             JOIN fow.dataset_jobs dj ON dj.job_profile_id = ls.job_profile_id AND dj.dataset_id = 'builtin'::text
        ), ai_skills AS (
         SELECT es.employee_id,
            max(es.proficiency) AS top_ai_proficiency
           FROM employee_skills es
             JOIN skills s ON s.skill_id = es.skill_id
          WHERE s.skill_category = 'AI'::text
          GROUP BY es.employee_id
        ), required_skills AS (
         SELECT p.employee_id,
            count(*) AS required_pairs,
            count(*) FILTER (WHERE COALESCE(es.proficiency::integer, 0) >= r_1.required_proficiency) AS met_pairs
           FROM people p
             JOIN job_skill_requirements r_1 ON r_1.job_profile_id = p.job_profile_id AND r_1.importance = 'required'::text
             LEFT JOIN employee_skills es ON es.employee_id = p.employee_id AND es.skill_id = r_1.skill_id
          GROUP BY p.employee_id
        ), per_person AS (
         SELECT p.function_name,
            COALESCE(a.top_ai_proficiency::integer, 0) >= 3 AS ai_skilled,
            COALESCE(rs.required_pairs, 0::bigint) AS required_pairs,
            COALESCE(rs.met_pairs, 0::bigint) AS met_pairs,
            cp.employee_id IS NOT NULL AS has_preference,
            COALESCE(cp.desired_job_profile_id <> p.job_profile_id, false) AS open_to_move,
            COALESCE(cp.career_interest = 'AI & Digital Skills'::text, false) AS ai_interest
           FROM people p
             LEFT JOIN ai_skills a ON a.employee_id = p.employee_id
             LEFT JOIN required_skills rs ON rs.employee_id = p.employee_id
             LEFT JOIN career_preferences cp ON cp.employee_id = p.employee_id
        ), rolled AS (
         SELECT pp.function_name,
                CASE
                    WHEN GROUPING(pp.function_name) = 1 THEN 'company'::text
                    ELSE 'function'::text
                END AS level,
            count(*)::integer AS headcount,
            count(*) FILTER (WHERE pp.ai_skilled)::integer AS ai_skilled,
            sum(pp.required_pairs) AS required_pairs,
            sum(pp.met_pairs) AS met_pairs,
            count(*) FILTER (WHERE pp.has_preference)::integer AS with_preference,
            count(*) FILTER (WHERE pp.open_to_move)::integer AS open_to_move,
            count(*) FILTER (WHERE pp.ai_interest)::integer AS ai_interest
           FROM per_person pp
          GROUP BY GROUPING SETS ((pp.function_name), ())
        )
 SELECT 'builtin'::text AS dataset_id,
    level,
    function_name,
    headcount < fow.min_group_size() AS suppressed,
        CASE
            WHEN headcount >= fow.min_group_size() THEN headcount
            ELSE NULL::integer
        END AS headcount,
        CASE
            WHEN headcount >= fow.min_group_size() THEN round(ai_skilled::numeric / headcount::numeric, 4)
            ELSE NULL::numeric
        END AS ai_skilled_rate,
        CASE
            WHEN headcount >= fow.min_group_size() AND required_pairs > 0::numeric THEN round(met_pairs / required_pairs, 4)
            ELSE NULL::numeric
        END AS required_skills_met_rate,
        CASE
            WHEN headcount >= fow.min_group_size() THEN round(with_preference::numeric / headcount::numeric, 4)
            ELSE NULL::numeric
        END AS preference_recorded_rate,
        CASE
            WHEN headcount >= fow.min_group_size() THEN round(open_to_move::numeric / headcount::numeric, 4)
            ELSE NULL::numeric
        END AS open_to_move_rate,
        CASE
            WHEN headcount >= fow.min_group_size() THEN round(ai_interest::numeric / headcount::numeric, 4)
            ELSE NULL::numeric
        END AS ai_interest_rate
   FROM rolled r;

CREATE VIEW "fow"."v_function_skill_gaps" WITH (security_invoker=true) AS  WITH latest_snapshot AS (
         SELECT es.employee_id,
            es.job_profile_id
           FROM employee_snapshots es
          WHERE es.snapshot_date = (( SELECT max(employee_snapshots.snapshot_date) AS max
                   FROM employee_snapshots))
        ), people AS (
         SELECT ls.employee_id,
            ls.job_profile_id,
            dj.function_name
           FROM latest_snapshot ls
             JOIN fow.dataset_jobs dj ON dj.job_profile_id = ls.job_profile_id AND dj.dataset_id = 'builtin'::text
        ), pairs AS (
         SELECT p.function_name,
            r_1.skill_id,
            r_1.importance,
            COALESCE(es.proficiency::integer, 0) AS proficiency,
            r_1.required_proficiency
           FROM people p
             JOIN job_skill_requirements r_1 ON r_1.job_profile_id = p.job_profile_id
             LEFT JOIN employee_skills es ON es.employee_id = p.employee_id AND es.skill_id = r_1.skill_id
        ), rolled AS (
         SELECT pr.function_name,
            pr.skill_id,
            pr.importance,
            count(*)::integer AS employees_in_scope,
            count(*) FILTER (WHERE pr.proficiency >= pr.required_proficiency)::integer AS meeting_required,
            avg(pr.proficiency) AS avg_proficiency
           FROM pairs pr
          GROUP BY pr.function_name, pr.skill_id, pr.importance
         HAVING count(*) >= fow.min_group_size()
        ), courses AS (
         SELECT c_1.skill_id,
            jsonb_agg(jsonb_build_object('course_code', c_1.course_code, 'course_name', c_1.course_name, 'provider', c_1.provider, 'duration_hours', c_1.duration_hours) ORDER BY c_1.course_code) AS courses
           FROM learning_courses c_1
          WHERE c_1.active
          GROUP BY c_1.skill_id
        )
 SELECT 'builtin'::text AS dataset_id,
    r.function_name,
    s.skill_code,
    s.skill_name,
    s.skill_category,
    r.importance,
    r.employees_in_scope,
    round(r.meeting_required::numeric / r.employees_in_scope::numeric, 4) AS meets_required_rate,
    round(1::numeric - r.meeting_required::numeric / r.employees_in_scope::numeric, 4) AS gap_rate,
    round(r.avg_proficiency, 2) AS avg_proficiency,
    COALESCE(jsonb_array_length(c.courses), 0) AS course_count,
    COALESCE(c.courses, '[]'::jsonb) AS courses
   FROM rolled r
     JOIN skills s ON s.skill_id = r.skill_id
     LEFT JOIN courses c ON c.skill_id = r.skill_id;

CREATE VIEW "fow"."v_job_exposure" WITH (security_invoker=true) AS  SELECT dataset_id,
    job_key,
    title,
    function_name,
    family_name,
    onetsoc_code,
    headcount < fow.min_group_size() AS suppressed,
        CASE
            WHEN headcount >= fow.min_group_size() THEN headcount
            ELSE NULL::integer
        END AS headcount,
        CASE
            WHEN headcount >= fow.min_group_size() THEN labor_cost_usd
            ELSE NULL::numeric
        END AS labor_cost_usd,
    tasks_total,
    tasks_scored,
    score_coverage,
    automate_share,
    augment_share,
    exposed_share,
    exposure_score
   FROM fow.job_exposure_base b;

CREATE VIEW "fow"."v_pulse_sentiment" WITH (security_invoker=true) AS  WITH latest_snapshot AS (
         SELECT es.employee_id,
            es.job_profile_id
           FROM employee_snapshots es
          WHERE es.snapshot_date = (( SELECT max(employee_snapshots.snapshot_date) AS max
                   FROM employee_snapshots))
        ), responses AS (
         SELECT q.question_code,
            q.question_text,
            p.response_date,
            dj.function_name,
                CASE
                    WHEN q.reverse_scored THEN 6 - p.score
                    ELSE p.score::integer
                END AS adjusted_score
           FROM fow.ai_pulse_responses p
             JOIN fow.ai_pulse_questions q ON q.question_code = p.question_code
             JOIN latest_snapshot ls ON ls.employee_id = p.employee_id
             JOIN fow.dataset_jobs dj ON dj.job_profile_id = ls.job_profile_id AND dj.dataset_id = 'builtin'::text
        ), rolled AS (
         SELECT r_1.question_code,
            min(r_1.question_text) AS question_text,
            r_1.response_date,
            r_1.function_name,
                CASE
                    WHEN GROUPING(r_1.function_name) = 1 THEN 'company'::text
                    ELSE 'function'::text
                END AS level,
            count(*)::integer AS respondents,
            count(*) FILTER (WHERE r_1.adjusted_score >= 4)::integer AS favorable,
            avg(r_1.adjusted_score) AS mean_score
           FROM responses r_1
          GROUP BY GROUPING SETS ((r_1.question_code, r_1.response_date, r_1.function_name), (r_1.question_code, r_1.response_date))
        )
 SELECT level,
    function_name,
    question_code,
    question_text,
    response_date,
    respondents < fow.min_group_size() AS suppressed,
        CASE
            WHEN respondents >= fow.min_group_size() THEN respondents
            ELSE NULL::integer
        END AS respondents,
        CASE
            WHEN respondents >= fow.min_group_size() THEN round(favorable::numeric / respondents::numeric, 4)
            ELSE NULL::numeric
        END AS favorable_rate,
        CASE
            WHEN respondents >= fow.min_group_size() THEN round(mean_score, 2)
            ELSE NULL::numeric
        END AS mean_score
   FROM rolled r;

CREATE VIEW "fow"."v_redeployment_paths" WITH (security_invoker=true) AS  WITH latest_snapshot AS (
         SELECT es.employee_id,
            es.job_profile_id
           FROM employee_snapshots es
          WHERE es.snapshot_date = (( SELECT max(employee_snapshots.snapshot_date) AS max
                   FROM employee_snapshots))
        ), jobs AS (
         SELECT b.dataset_id,
            b.job_key,
            b.title,
            b.function_name,
            b.family_name,
            b.onetsoc_code,
            b.job_profile_id,
            b.headcount,
            b.labor_cost_usd,
            b.tasks_total,
            b.tasks_scored,
            b.score_coverage,
            b.automate_share,
            b.augment_share,
            b.exposed_share,
            b.exposure_score
           FROM fow.job_exposure_base b
          WHERE b.dataset_id = 'builtin'::text
        ), job_skills AS (
         SELECT j.job_key,
            r.skill_id
           FROM jobs j
             JOIN job_skill_requirements r ON r.job_profile_id = j.job_profile_id
        ), specific_skills AS (
         SELECT js.job_key,
            js.skill_id
           FROM job_skills js
          WHERE (js.skill_id IN ( SELECT job_skills.skill_id
                   FROM job_skills
                  GROUP BY job_skills.skill_id
                 HAVING count(*)::numeric <= (0.25 * (( SELECT count(DISTINCT job_skills_1.job_key) AS count
                           FROM job_skills job_skills_1))::numeric)))
        ), shared AS (
         SELECT a.job_key AS from_job_key,
            b.job_key AS to_job_key,
            count(*)::integer AS shared_skills,
            array_agg(s.skill_name ORDER BY s.skill_name) AS shared_skill_names
           FROM specific_skills a
             JOIN specific_skills b ON b.skill_id = a.skill_id AND b.job_key <> a.job_key
             JOIN skills s ON s.skill_id = a.skill_id
          GROUP BY a.job_key, b.job_key
        ), skill_paths AS (
         SELECT ranked.from_job_key,
            ranked.to_job_key
           FROM ( SELECT sh_1.from_job_key,
                    sh_1.to_job_key,
                    row_number() OVER (PARTITION BY sh_1.from_job_key ORDER BY sh_1.shared_skills DESC, t_1.exposure_score, sh_1.to_job_key) AS rank
                   FROM shared sh_1
                     JOIN jobs f_1 ON f_1.job_key = sh_1.from_job_key
                     JOIN jobs t_1 ON t_1.job_key = sh_1.to_job_key
                  WHERE sh_1.shared_skills >= 2 AND f_1.headcount >= fow.min_group_size() AND t_1.headcount >= fow.min_group_size() AND t_1.exposure_score <= (f_1.exposure_score - 0.10)) ranked
          WHERE ranked.rank <= 3
        ), preference_paths AS (
         SELECT src.job_key AS from_job_key,
            dst.job_key AS to_job_key,
            count(*)::integer AS interested_employees
           FROM career_preferences cp
             JOIN latest_snapshot ls ON ls.employee_id = cp.employee_id
             JOIN jobs src ON src.job_profile_id = ls.job_profile_id
             JOIN jobs dst ON dst.job_profile_id = cp.desired_job_profile_id
          WHERE cp.desired_job_profile_id <> ls.job_profile_id
          GROUP BY src.job_key, dst.job_key
         HAVING count(*) >= fow.min_group_size()
        ), paths AS (
         SELECT COALESCE(pp.from_job_key, sp.from_job_key) AS from_job_key,
            COALESCE(pp.to_job_key, sp.to_job_key) AS to_job_key,
                CASE
                    WHEN pp.from_job_key IS NOT NULL AND sp.from_job_key IS NOT NULL THEN 'preference and skills'::text
                    WHEN pp.from_job_key IS NOT NULL THEN 'preference'::text
                    ELSE 'skills'::text
                END AS basis,
            pp.interested_employees
           FROM preference_paths pp
             FULL JOIN skill_paths sp ON sp.from_job_key = pp.from_job_key AND sp.to_job_key = pp.to_job_key
        )
 SELECT 'builtin'::text AS dataset_id,
    p.from_job_key,
    f.title AS from_title,
    f.function_name AS from_function,
    f.family_name AS from_family,
    p.to_job_key,
    t.title AS to_title,
    t.function_name AS to_function,
    t.family_name AS to_family,
    p.basis,
    COALESCE(sh.shared_skills, 0) AS shared_skills,
    COALESCE(sh.shared_skill_names, '{}'::text[]) AS shared_skill_names,
    p.interested_employees,
        CASE
            WHEN f.headcount >= fow.min_group_size() THEN round(p.interested_employees::numeric / f.headcount::numeric, 4)
            ELSE NULL::numeric
        END AS share_of_from_job,
    f.exposure_score AS from_exposure_score,
    t.exposure_score AS to_exposure_score,
    t.exposure_score - f.exposure_score AS exposure_change
   FROM paths p
     JOIN jobs f ON f.job_key = p.from_job_key
     JOIN jobs t ON t.job_key = p.to_job_key
     LEFT JOIN shared sh ON sh.from_job_key = p.from_job_key AND sh.to_job_key = p.to_job_key;

CREATE VIEW "fow"."v_register" WITH (security_invoker=true) AS  WITH current_assessments AS (
         SELECT DISTINCT ON (ra.use_case_id, ra.framework) ra.assessment_id,
            ra.use_case_id,
            ra.framework,
            ra.tier,
            ra.rationale,
            ra.review_state,
            ra.assessed_on,
            ra.bias_audit_date,
            ra.next_review_date
           FROM fow.risk_assessments ra
          ORDER BY ra.use_case_id, ra.framework, ra.assessed_on DESC
        ), per_use_case AS (
         SELECT ca.use_case_id,
            array_agg(ca.framework ORDER BY ca.framework) AS frameworks,
            (array_agg(ca.tier ORDER BY (
                CASE ca.tier
                    WHEN 'high'::text THEN 3
                    WHEN 'medium'::text THEN 2
                    ELSE 1
                END) DESC))[1] AS risk_tier,
            max(ca.assessed_on) AS last_assessed_on,
            min(ca.next_review_date) AS next_review_date,
            max(ca.bias_audit_date) FILTER (WHERE ca.framework = 'NYC LL 144'::text) AS bias_audit_date,
            bool_or(ca.framework = 'NYC LL 144'::text) AS bias_audit_required,
            bool_or(ca.review_state = ANY (ARRAY['in_review'::text, 'changes_requested'::text])) AS any_in_review,
            bool_and(ca.review_state = 'draft'::text) AS all_draft
           FROM current_assessments ca
          GROUP BY ca.use_case_id
        ), flagged AS (
         SELECT uc.use_case_id,
            uc.name,
            uc.hr_process,
            uc.tool_id,
            uc.decision_impact,
            uc.owner,
            uc.human_in_loop,
            uc.status,
            uc.description,
            uc.created_at,
            uc.updated_at,
            t.name AS tool_name,
            t.approved AS tool_approved,
            p.frameworks,
            p.risk_tier,
            p.last_assessed_on,
            p.next_review_date,
            p.bias_audit_date,
            COALESCE(p.next_review_date < CURRENT_DATE, false) AS is_overdue,
            COALESCE(p.bias_audit_required AND (p.bias_audit_date IS NULL OR p.bias_audit_date < (CURRENT_DATE - '1 year'::interval)), false) AS bias_audit_due,
            p.use_case_id IS NULL OR p.all_draft AS not_reviewed,
            COALESCE(p.any_in_review, false) AS in_review
           FROM fow.ai_use_cases uc
             LEFT JOIN fow.ai_tools t ON t.tool_id = uc.tool_id
             LEFT JOIN per_use_case p ON p.use_case_id = uc.use_case_id
        )
 SELECT use_case_id,
    name,
    hr_process,
    tool_id,
    tool_name,
    tool_approved,
    decision_impact,
    owner,
    human_in_loop,
    status,
    risk_tier,
    frameworks,
    last_assessed_on,
    next_review_date,
    bias_audit_date,
    is_overdue,
    bias_audit_due,
        CASE
            WHEN is_overdue THEN 'Overdue'::text
            WHEN bias_audit_due THEN 'Bias audit due'::text
            WHEN in_review THEN 'In review'::text
            WHEN not_reviewed THEN 'Not reviewed'::text
            ELSE 'Approved'::text
        END AS review_status
   FROM flagged f;

CREATE VIEW "fow"."v_tool_mix" WITH (security_invoker=true) AS  WITH latest_week AS (
         SELECT max(ai_usage_weekly.week_start) AS week_start
           FROM fow.ai_usage_weekly
        ), per_tool AS (
         SELECT t.tool_id,
            t.name,
            t.category,
            t.approved,
            t.licenses,
            count(DISTINCT u.employee_id) FILTER (WHERE u.active_days > 0)::integer AS weekly_active_users,
            COALESCE(sum(u.sessions), 0::bigint)::integer AS sessions
           FROM fow.ai_tools t
             LEFT JOIN fow.ai_usage_weekly u ON u.tool_id = t.tool_id AND u.week_start = (( SELECT latest_week.week_start
                   FROM latest_week))
          GROUP BY t.tool_id, t.name, t.category, t.approved, t.licenses
        )
 SELECT tool_id,
    name,
    category,
    approved,
    licenses,
    ( SELECT latest_week.week_start
           FROM latest_week) AS week_start,
    weekly_active_users < fow.min_group_size() AS suppressed,
        CASE
            WHEN weekly_active_users >= fow.min_group_size() THEN weekly_active_users
            ELSE NULL::integer
        END AS weekly_active_users,
        CASE
            WHEN weekly_active_users >= fow.min_group_size() THEN sessions
            ELSE NULL::integer
        END AS sessions
   FROM per_tool p;

ALTER TABLE "fow"."action_recommendations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."ai_pulse_questions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."ai_pulse_responses" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."ai_tools" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."ai_usage_weekly" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."ai_use_cases" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."dataset_jobs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."datasets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."job_tasks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."retest_runs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."retest_scores" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."risk_assessments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."score_reviews" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."scoring_runs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."task_exposure_scores" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."task_statements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "fow"."validation_sample" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "workforce_release"."performance_rating_v1" ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER keep_frozen BEFORE DELETE OR UPDATE ON workforce_release.performance_rating_v1 FOR EACH ROW EXECUTE FUNCTION workforce_release.keep_performance_rating_v1_frozen();

CREATE POLICY aggregate_service_read ON workforce_release.performance_rating_v1 FOR SELECT TO service_role USING (true);

CREATE OR REPLACE FUNCTION public.workforce_performance_release_v1(p_country_code text, p_org_code text, p_level_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
declare selected_org text:=coalesce(p_org_code,'all'); result jsonb;
begin
 if coalesce(p_country_code,'all')<>'all' or coalesce(p_level_code,'all')<>'all' or selected_org <> all(array['all','BU-CLIENTOPS','BU-CONS','BU-CORP','BU-DATAAI','BU-DIGITAL','BU-MGSVC','BU-SALES','BU-TECH']) then return null; end if;
 -- All nine immutable rows must be active together, with the exact frozen content digest.
 if (select count(*) from workforce_release.performance_rating_v1)<>9
 or exists(select 1 from workforce_release.performance_rating_v1 where not active or activated_at is null)
 or (select count(distinct activated_at) from workforce_release.performance_rating_v1)<>1
 or (select count(distinct content_sha256) from workforce_release.performance_rating_v1)<>1
 or (select min(content_sha256) from workforce_release.performance_rating_v1) is distinct from
    (select encode(sha256(convert_to(jsonb_agg(payload order by org_code)::text,'UTF8')),'hex') from workforce_release.performance_rating_v1)
 then return null; end if;
 -- Defense in depth: reject small categories/complements or inconsistent global totals.
 if exists(select 1 from workforce_release.performance_rating_v1 b,jsonb_array_elements_text(b.payload#>'{counts,ratings}') c where b.org_code<>'all' and (c::integer<10 or (b.payload#>>'{counts,population}')::integer-c::integer<10))
 or exists(select 1 from generate_series(0,4)i where
    (select (payload#>>array['counts','ratings',i::text])::integer from workforce_release.performance_rating_v1 where org_code='all') is distinct from
    (select sum((payload#>>array['counts','ratings',i::text])::integer) from workforce_release.performance_rating_v1 where org_code<>'all'))
 or (select (payload#>>'{counts,population}')::integer from workforce_release.performance_rating_v1 where org_code='all') is distinct from
    (select sum((payload#>>'{counts,population}')::integer) from workforce_release.performance_rating_v1 where org_code<>'all')
 then return null; end if;
 select payload || jsonb_build_object('release',jsonb_build_object('contentSha256',content_sha256,'extractedAt',to_char(extracted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'publishedAt',to_char(activated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))) into result
 from workforce_release.performance_rating_v1 where org_code=selected_org;
 return result;
end $function$
;

REVOKE ALL ON ALL TABLES IN SCHEMA fow FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA fow FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fow FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA workforce_release FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA workforce_release FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA workforce_release FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON SCHEMA fow,workforce_release FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION public.workforce_performance_release_v1(text,text,text) FROM PUBLIC,anon,authenticated,service_role;

COMMIT;
