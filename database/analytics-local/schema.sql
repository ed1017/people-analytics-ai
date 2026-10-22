-- Local no-seed public analytics reconstruction. NOT a production migration.

BEGIN;

DO $$ BEGIN IF current_database() IS DISTINCT FROM 'pa_analytics_fixture' OR inet_server_addr() IS DISTINCT FROM '127.0.0.1'::inet THEN RAISE EXCEPTION 'Dedicated localhost fixture only'; END IF; IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') OR EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public') THEN RAISE EXCEPTION 'Nonempty schema'; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='succession_aggregate_owner' AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcanlogin AND NOT rolinherit) THEN RAISE EXCEPTION 'Restricted owner prerequisite'; END IF; END $$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE public."applications" (
  "application_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "candidate_id" uuid NOT NULL,
  "requisition_id" uuid NOT NULL,
  "recruiting_source_id" uuid,
  "application_date" date NOT NULL,
  "application_status" text NOT NULL,
  "current_stage" text,
  "disposition_reason" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."benchmark_metrics" (
  "benchmark_metric_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "metric_name" text NOT NULL,
  "benchmark_group" text,
  "country_code" character(2),
  "effective_date" date,
  "benchmark_value" numeric(14,4),
  "unit" text,
  "source_system" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."calendar" (
  "calendar_date" date NOT NULL,
  "date_key" integer NOT NULL,
  "day_of_week" smallint NOT NULL,
  "day_name" text NOT NULL,
  "week_start_date" date NOT NULL,
  "month_number" smallint NOT NULL,
  "month_name" text NOT NULL,
  "month_start_date" date NOT NULL,
  "quarter_number" smallint NOT NULL,
  "year_number" smallint NOT NULL,
  "fiscal_month" smallint NOT NULL,
  "fiscal_quarter" smallint NOT NULL,
  "fiscal_year" smallint NOT NULL,
  "is_month_end" boolean NOT NULL,
  "is_quarter_end" boolean NOT NULL,
  "is_year_end" boolean NOT NULL
);

CREATE TABLE public."candidates" (
  "candidate_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "candidate_number" text NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "country_code" character(2),
  "current_location" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."career_preferences" (
  "career_preference_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "desired_job_family_id" uuid,
  "desired_job_profile_id" uuid,
  "desired_location_id" uuid,
  "relocation_willingness" boolean,
  "career_interest" text,
  "last_updated" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."certifications" (
  "certification_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "certification_code" text NOT NULL,
  "certification_name" text NOT NULL,
  "issuing_organization" text,
  "skill_id" uuid,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."company_events" (
  "company_event_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "event_date" date NOT NULL,
  "event_type" text NOT NULL,
  "event_name" text NOT NULL,
  "event_description" text,
  "affected_org_unit_id" uuid,
  "affected_country_code" character(2),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."company_profile" (
  "company_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "company_code" text NOT NULL,
  "company_name" text NOT NULL,
  "industry" text NOT NULL,
  "industry_description" text,
  "headquarters_city" text,
  "headquarters_country_code" character(2),
  "current_snapshot_date" date NOT NULL,
  "current_active_headcount" integer NOT NULL,
  "current_us_headcount" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."compensation" (
  "compensation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "effective_date" date NOT NULL,
  "base_salary" numeric(14,2) NOT NULL,
  "target_bonus" numeric(14,2),
  "equity_value" numeric(14,2),
  "total_compensation" numeric(14,2),
  "currency_code" character(3) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "base_salary_usd" numeric(14,2),
  "target_bonus_usd" numeric(14,2),
  "equity_value_usd" numeric(14,2),
  "total_compensation_usd" numeric(14,2),
  "compa_ratio" numeric(8,4)
);

CREATE TABLE public."compensation_bands" (
  "compensation_band_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_profile_id" uuid NOT NULL,
  "job_level_id" uuid NOT NULL,
  "country_code" character(2) NOT NULL,
  "currency_code" character(3) NOT NULL,
  "minimum_salary" numeric(14,2) NOT NULL,
  "midpoint_salary" numeric(14,2) NOT NULL,
  "maximum_salary" numeric(14,2) NOT NULL,
  "effective_date" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "minimum_salary_usd" numeric(14,2),
  "midpoint_salary_usd" numeric(14,2),
  "maximum_salary_usd" numeric(14,2)
);

CREATE TABLE public."compensation_job_release_v1" (
  "release_id" text NOT NULL,
  "snapshot_date" date NOT NULL,
  "job_profile_code" text NOT NULL,
  "job_profile_name" text NOT NULL,
  "status" text NOT NULL,
  "mean_compa_pct" numeric,
  "coverage" text NOT NULL,
  "base_pay_provenance" text NOT NULL,
  "range_provenance" text NOT NULL,
  "range_policy_version" text NOT NULL
);

CREATE TABLE public."contingent_assignments" (
  "contingent_assignment_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contingent_worker_id" uuid NOT NULL,
  "position_id" uuid,
  "assignment_start_date" date NOT NULL,
  "assignment_end_date" date,
  "bill_rate" numeric(12,2),
  "currency_code" character(3),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."contingent_workers" (
  "contingent_worker_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "contingent_worker_number" text NOT NULL,
  "worker_type" text NOT NULL,
  "vendor_name" text,
  "start_date" date NOT NULL,
  "end_date" date,
  "active" boolean DEFAULT true NOT NULL,
  "location_id" uuid,
  "org_unit_id" uuid,
  "job_profile_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."cost_centers" (
  "cost_center_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "cost_center_code" text NOT NULL,
  "cost_center_name" text NOT NULL,
  "legal_entity_id" uuid,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."countries" (
  "country_code" character(2) NOT NULL,
  "country_name" text NOT NULL,
  "region" text NOT NULL,
  "subregion" text,
  "currency_code" character(3) NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."critical_roles" (
  "critical_role_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_profile_id" uuid NOT NULL,
  "criticality_level" text NOT NULL,
  "scarcity_level" text,
  "replacement_difficulty" text,
  "business_impact" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."data_quality_results" (
  "data_quality_result_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "check_date" timestamp with time zone DEFAULT now() NOT NULL,
  "table_name" text NOT NULL,
  "rule_name" text NOT NULL,
  "severity" text NOT NULL,
  "failed_record_count" integer DEFAULT 0 NOT NULL,
  "total_record_count" integer,
  "quality_score" numeric(8,4),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."employee_absences" (
  "absence_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "absence_start_date" date NOT NULL,
  "absence_end_date" date,
  "absence_category" text NOT NULL,
  "leave_type" text,
  "paid_flag" boolean,
  "duration_days" numeric(8,2),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."employee_certifications" (
  "employee_certification_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "certification_id" uuid NOT NULL,
  "earned_date" date,
  "expiration_date" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."employee_demographics" (
  "employee_id" uuid NOT NULL,
  "gender_identity" text NOT NULL,
  "age_band" text NOT NULL,
  "race_ethnicity_us" text,
  "veteran_status_us" text,
  "disability_status" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."employee_goals" (
  "employee_goal_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "goal_year" integer NOT NULL,
  "goal_category" text,
  "strategic_priority" text,
  "completion_percent" numeric(6,2),
  "goal_status" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."employee_learning" (
  "employee_learning_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "enrollment_date" date,
  "completion_date" date,
  "learning_status" text,
  "assessment_score" numeric(6,2),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."employee_movements" (
  "movement_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "movement_date" date NOT NULL,
  "movement_type" text NOT NULL,
  "from_position_id" uuid,
  "to_position_id" uuid,
  "from_org_unit_id" uuid,
  "to_org_unit_id" uuid,
  "from_job_level_id" uuid,
  "to_job_level_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."employee_skills" (
  "employee_skill_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "skill_id" uuid NOT NULL,
  "proficiency" smallint NOT NULL,
  "assessment_source" text NOT NULL,
  "confidence" numeric(5,4),
  "last_validated_date" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."employee_snapshots" (
  "employee_snapshot_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "snapshot_date" date NOT NULL,
  "employee_id" uuid NOT NULL,
  "position_id" uuid,
  "manager_employee_id" uuid,
  "org_unit_id" uuid,
  "cost_center_id" uuid,
  "job_profile_id" uuid,
  "job_level_id" uuid,
  "location_id" uuid,
  "legal_entity_id" uuid,
  "employment_status" text NOT NULL,
  "employment_type" text,
  "work_arrangement" text,
  "fte" numeric(4,3),
  "base_salary" numeric(14,2),
  "target_bonus" numeric(14,2),
  "total_compensation" numeric(14,2),
  "total_labor_cost" numeric(14,2),
  "currency_code" character(3),
  "tenure_months" integer,
  "span_of_control" integer,
  "is_people_manager" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "base_salary_usd" numeric(14,2),
  "total_compensation_usd" numeric(14,2),
  "total_labor_cost_usd" numeric(14,2),
  "compa_ratio" numeric(8,4)
);

CREATE TABLE public."employees" (
  "employee_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_number" text NOT NULL,
  "first_name" text NOT NULL,
  "last_name" text NOT NULL,
  "preferred_name" text,
  "work_email" text,
  "hire_date" date NOT NULL,
  "original_hire_date" date,
  "termination_date" date,
  "employment_status" text NOT NULL,
  "employment_type" text NOT NULL,
  "fte" numeric(4,3) DEFAULT 1.0 NOT NULL,
  "legal_entity_id" uuid,
  "home_location_id" uuid,
  "current_org_unit_id" uuid,
  "current_cost_center_id" uuid,
  "manager_employee_id" uuid,
  "worker_country_code" character(2),
  "work_arrangement" text,
  "source_system" text DEFAULT 'synthetic'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."external_labor_observations" (
  "series_id" text NOT NULL,
  "observation_date" date NOT NULL,
  "value" numeric NOT NULL,
  "period" text,
  "period_name" text,
  "source_name" text DEFAULT 'BLS'::text NOT NULL,
  "fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."external_labor_series" (
  "series_id" text NOT NULL,
  "series_name" text NOT NULL,
  "source_name" text DEFAULT 'BLS'::text NOT NULL,
  "category" text,
  "unit" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."external_occupations" (
  "external_occupation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "source_system" text NOT NULL,
  "occupation_code" text NOT NULL,
  "occupation_name" text NOT NULL,
  "occupation_description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."fx_rates" (
  "fx_rate_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "effective_month" date NOT NULL,
  "currency_code" character(3) NOT NULL,
  "rate_to_usd" numeric(14,8) NOT NULL,
  "source_system" text DEFAULT 'synthetic'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."hires" (
  "hire_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "application_id" uuid,
  "requisition_id" uuid,
  "hire_date" date NOT NULL,
  "start_date" date,
  "external_internal" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."internal_job_applications" (
  "internal_application_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "requisition_id" uuid NOT NULL,
  "application_date" date NOT NULL,
  "application_status" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."interviews" (
  "interview_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "interview_date" date NOT NULL,
  "interview_stage" text NOT NULL,
  "interviewer_employee_id" uuid,
  "interview_result" text,
  "interview_score" numeric(5,2),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."job_families" (
  "job_family_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "family_code" text NOT NULL,
  "family_name" text NOT NULL,
  "job_function_id" uuid NOT NULL,
  "description" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."job_functions" (
  "job_function_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "function_code" text NOT NULL,
  "function_name" text NOT NULL,
  "description" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."job_levels" (
  "job_level_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "level_code" text NOT NULL,
  "level_name" text NOT NULL,
  "level_rank" smallint NOT NULL,
  "career_track" text NOT NULL,
  "people_manager_expected" boolean DEFAULT false NOT NULL,
  "description" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."job_occupation_mapping" (
  "job_occupation_mapping_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_profile_id" uuid NOT NULL,
  "external_occupation_id" uuid NOT NULL,
  "mapping_confidence" numeric(5,4),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."job_onet_mapping" (
  "job_profile_id" uuid NOT NULL,
  "onetsoc_code" text NOT NULL,
  "mapping_confidence" numeric(5,4),
  "mapping_method" text DEFAULT 'curated_family_mapping'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."job_profiles" (
  "job_profile_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_profile_code" text NOT NULL,
  "job_profile_name" text NOT NULL,
  "job_family_id" uuid NOT NULL,
  "description" text,
  "exempt_status" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."job_skill_requirements" (
  "job_skill_requirement_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "job_profile_id" uuid NOT NULL,
  "skill_id" uuid NOT NULL,
  "required_proficiency" smallint NOT NULL,
  "importance" text NOT NULL,
  "weight" numeric(5,4),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."labor_costs" (
  "labor_cost_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "effective_month" date NOT NULL,
  "base_salary_cost" numeric(14,2),
  "bonus_cost" numeric(14,2),
  "equity_cost" numeric(14,2),
  "benefits_cost" numeric(14,2),
  "employer_tax_cost" numeric(14,2),
  "other_labor_cost" numeric(14,2),
  "total_labor_cost" numeric(14,2),
  "currency_code" character(3),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "base_salary_cost_usd" numeric(14,2),
  "bonus_cost_usd" numeric(14,2),
  "equity_cost_usd" numeric(14,2),
  "benefits_cost_usd" numeric(14,2),
  "employer_tax_cost_usd" numeric(14,2),
  "other_labor_cost_usd" numeric(14,2),
  "total_labor_cost_usd" numeric(14,2)
);

CREATE TABLE public."learning_courses" (
  "course_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "course_code" text NOT NULL,
  "course_name" text NOT NULL,
  "skill_id" uuid,
  "provider" text,
  "duration_hours" numeric(8,2),
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."legal_entities" (
  "legal_entity_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "legal_entity_code" text NOT NULL,
  "legal_entity_name" text NOT NULL,
  "country_code" character(2) NOT NULL,
  "currency_code" character(3) NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."locations" (
  "location_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "location_code" text NOT NULL,
  "location_name" text NOT NULL,
  "city" text,
  "state_province" text,
  "metro_area" text,
  "country_code" character(2) NOT NULL,
  "region" text NOT NULL,
  "location_type" text NOT NULL,
  "timezone" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."market_compensation" (
  "market_compensation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "external_occupation_id" uuid NOT NULL,
  "location_id" uuid,
  "effective_date" date NOT NULL,
  "percentile_25" numeric(14,2),
  "percentile_50" numeric(14,2),
  "percentile_75" numeric(14,2),
  "currency_code" character(3),
  "source_system" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."market_demand" (
  "market_demand_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "external_occupation_id" uuid NOT NULL,
  "location_id" uuid,
  "effective_date" date NOT NULL,
  "estimated_postings" integer,
  "demand_index" numeric(10,4),
  "source_system" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."market_skills" (
  "market_skill_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "external_occupation_id" uuid NOT NULL,
  "skill_id" uuid NOT NULL,
  "effective_date" date,
  "demand_index" numeric(10,4),
  "growth_index" numeric(10,4),
  "source_system" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."market_supply" (
  "market_supply_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "external_occupation_id" uuid NOT NULL,
  "location_id" uuid,
  "effective_date" date NOT NULL,
  "estimated_supply" integer,
  "supply_index" numeric(10,4),
  "source_system" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."metric_definitions" (
  "metric_definition_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "metric_code" text NOT NULL,
  "metric_name" text NOT NULL,
  "metric_category" text,
  "business_definition" text NOT NULL,
  "numerator_definition" text,
  "denominator_definition" text,
  "calculation_logic" text,
  "unit" text,
  "metric_owner" text,
  "effective_date" date DEFAULT CURRENT_DATE NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."offers" (
  "offer_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "offer_date" date NOT NULL,
  "base_salary_offer" numeric(14,2),
  "target_bonus_offer" numeric(14,2),
  "currency_code" character(3),
  "offer_status" text NOT NULL,
  "response_date" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."onet_essential_skills" (
  "row_key" text NOT NULL,
  "onetsoc_code" text NOT NULL,
  "occupation_title" text NOT NULL,
  "element_id" text NOT NULL,
  "element_name" text NOT NULL,
  "scale_id" text NOT NULL,
  "scale_name" text,
  "data_value" numeric(8,4) NOT NULL,
  "sample_size" integer,
  "standard_error" numeric(10,6),
  "lower_ci_bound" numeric(10,6),
  "upper_ci_bound" numeric(10,6),
  "recommend_suppress" boolean,
  "not_relevant" boolean,
  "date_updated" date,
  "domain_source" text,
  "onet_release" text DEFAULT '31.0'::text NOT NULL,
  "source_name" text DEFAULT 'O*NET'::text NOT NULL,
  "refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."onet_occupations" (
  "onetsoc_code" text NOT NULL,
  "occupation_title" text NOT NULL,
  "occupation_description" text,
  "onet_release" text DEFAULT '31.0'::text NOT NULL,
  "source_name" text DEFAULT 'O*NET'::text NOT NULL,
  "refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."onet_software_skills" (
  "row_key" text NOT NULL,
  "onetsoc_code" text NOT NULL,
  "occupation_title" text NOT NULL,
  "workplace_example" text NOT NULL,
  "element_id" text,
  "element_name" text,
  "hot_technology" boolean DEFAULT false NOT NULL,
  "in_demand" boolean DEFAULT false NOT NULL,
  "onet_release" text DEFAULT '31.0'::text NOT NULL,
  "source_name" text DEFAULT 'O*NET'::text NOT NULL,
  "refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."org_units" (
  "org_unit_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "org_code" text NOT NULL,
  "org_name" text NOT NULL,
  "org_type" text NOT NULL,
  "parent_org_unit_id" uuid,
  "cost_center_id" uuid,
  "legal_entity_id" uuid,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."pay_adjustments" (
  "pay_adjustment_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "adjustment_date" date NOT NULL,
  "adjustment_type" text NOT NULL,
  "previous_base_salary" numeric(14,2),
  "new_base_salary" numeric(14,2),
  "adjustment_percent" numeric(8,4),
  "currency_code" character(3),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."performance_reviews" (
  "performance_review_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "review_period" text NOT NULL,
  "review_date" date,
  "performance_rating" numeric(4,2),
  "rating_category" text,
  "manager_employee_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."position_plans" (
  "position_plan_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workforce_scenario_id" uuid NOT NULL,
  "planning_month" date NOT NULL,
  "org_unit_id" uuid,
  "job_profile_id" uuid,
  "job_level_id" uuid,
  "location_id" uuid,
  "planned_headcount" numeric(10,2),
  "planned_fte" numeric(10,2),
  "planned_hires" numeric(10,2),
  "planned_exits" numeric(10,2),
  "planned_labor_cost" numeric(16,2),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "cost_center_id" uuid,
  "planned_labor_cost_usd" numeric(16,2)
);

CREATE TABLE public."position_snapshots" (
  "position_snapshot_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "snapshot_date" date NOT NULL,
  "position_id" uuid NOT NULL,
  "position_status" text NOT NULL,
  "incumbent_employee_id" uuid,
  "org_unit_id" uuid,
  "job_profile_id" uuid,
  "job_level_id" uuid,
  "location_id" uuid,
  "budgeted" boolean,
  "planned_fte" numeric(6,2),
  "budgeted_labor_cost" numeric(14,2),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."positions" (
  "position_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "position_code" text NOT NULL,
  "position_title" text NOT NULL,
  "job_profile_id" uuid NOT NULL,
  "job_level_id" uuid NOT NULL,
  "org_unit_id" uuid NOT NULL,
  "cost_center_id" uuid,
  "location_id" uuid,
  "legal_entity_id" uuid,
  "reports_to_position_id" uuid,
  "incumbent_employee_id" uuid,
  "position_status" text NOT NULL,
  "worker_type" text DEFAULT 'employee'::text NOT NULL,
  "position_type" text DEFAULT 'permanent'::text NOT NULL,
  "fte" numeric(4,3) DEFAULT 1.0 NOT NULL,
  "budgeted" boolean DEFAULT true NOT NULL,
  "planned_start_date" date,
  "planned_end_date" date,
  "position_created_date" date DEFAULT CURRENT_DATE NOT NULL,
  "position_closed_date" date,
  "source_system" text DEFAULT 'synthetic'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."recruiters" (
  "recruiter_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid,
  "recruiter_name" text NOT NULL,
  "region" text,
  "specialty" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "recruiter_code" text
);

CREATE TABLE public."recruiting_sources" (
  "recruiting_source_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "source_code" text NOT NULL,
  "source_name" text NOT NULL,
  "source_category" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."requisitions" (
  "requisition_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "requisition_number" text NOT NULL,
  "position_id" uuid,
  "job_profile_id" uuid NOT NULL,
  "job_level_id" uuid,
  "hiring_manager_employee_id" uuid,
  "recruiter_id" uuid,
  "org_unit_id" uuid,
  "location_id" uuid,
  "approved_date" date,
  "opened_date" date,
  "closed_date" date,
  "target_start_date" date,
  "requisition_status" text NOT NULL,
  "openings" integer DEFAULT 1 NOT NULL,
  "budgeted_salary_min" numeric(14,2),
  "budgeted_salary_max" numeric(14,2),
  "currency_code" character(3),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "requisition_type" text
);

CREATE TABLE public."scenario_assumptions" (
  "scenario_assumption_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workforce_scenario_id" uuid NOT NULL,
  "assumption_name" text NOT NULL,
  "assumption_value" numeric(14,4),
  "assumption_text" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."separations" (
  "separation_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "separation_date" date NOT NULL,
  "separation_type" text NOT NULL,
  "separation_reason" text,
  "regrettable" boolean,
  "retirement_flag" boolean DEFAULT false NOT NULL,
  "destination_category" text,
  "eligible_for_rehire" boolean,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."skills" (
  "skill_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "skill_code" text NOT NULL,
  "skill_name" text NOT NULL,
  "skill_category" text,
  "description" text,
  "source_system" text DEFAULT 'internal'::text NOT NULL,
  "external_skill_id" text,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."succession_plans" (
  "succession_plan_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "position_id" uuid NOT NULL,
  "assessment_date" date NOT NULL,
  "succession_risk" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."successor_candidates" (
  "successor_candidate_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "succession_plan_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "readiness" text NOT NULL,
  "ranking" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."survey_questions" (
  "survey_question_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "survey_id" uuid NOT NULL,
  "question_code" text NOT NULL,
  "question_text" text NOT NULL,
  "question_type" text NOT NULL,
  "dimension" text,
  "sort_order" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."survey_responses" (
  "survey_response_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "survey_id" uuid NOT NULL,
  "survey_question_id" uuid NOT NULL,
  "employee_id" uuid,
  "candidate_id" uuid,
  "separation_id" uuid,
  "response_date" date,
  "numeric_response" numeric(8,2),
  "text_response" text,
  "response_category" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "response_key" text
);

CREATE TABLE public."survey_scores" (
  "survey_score_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "survey_id" uuid NOT NULL,
  "employee_id" uuid,
  "org_unit_id" uuid,
  "dimension" text NOT NULL,
  "score" numeric(8,3),
  "benchmark_score" numeric(8,3),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "score_key" text
);

CREATE TABLE public."surveys" (
  "survey_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "survey_code" text NOT NULL,
  "survey_name" text NOT NULL,
  "survey_type" text NOT NULL,
  "launch_date" date,
  "close_date" date,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."synthetic_business_unit_targets" (
  "org_code" text NOT NULL,
  "target_active_headcount" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."synthetic_country_comp_factors" (
  "country_code" character(2) NOT NULL,
  "market_factor" numeric(8,4) NOT NULL,
  "benefits_pct" numeric(8,4) NOT NULL,
  "employer_tax_pct" numeric(8,4) NOT NULL,
  "other_cost_pct" numeric(8,4) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."synthetic_country_targets" (
  "country_code" character(2) NOT NULL,
  "target_active_headcount" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."synthetic_function_comp_factors" (
  "function_code" text NOT NULL,
  "salary_factor" numeric(8,4) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."synthetic_history_targets" (
  "snapshot_date" date NOT NULL,
  "target_headcount" integer NOT NULL,
  "notes" text
);

CREATE TABLE public."synthetic_level_compensation" (
  "level_code" text NOT NULL,
  "midpoint_usd_2026" numeric(14,2) NOT NULL,
  "target_bonus_pct" numeric(8,4) NOT NULL,
  "equity_pct" numeric(8,4) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."synthetic_level_targets" (
  "level_code" text NOT NULL,
  "target_active_headcount" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."synthetic_location_targets" (
  "location_code" text NOT NULL,
  "target_active_headcount" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."talent_ratings" (
  "talent_rating_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "employee_id" uuid NOT NULL,
  "assessment_date" date NOT NULL,
  "performance_category" text,
  "potential_category" text,
  "talent_segment" text,
  "flight_risk" text,
  "loss_impact" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."workforce_budgets" (
  "workforce_budget_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "fiscal_year" integer NOT NULL,
  "org_unit_id" uuid,
  "cost_center_id" uuid,
  "budgeted_fte" numeric(10,2),
  "budgeted_headcount" integer,
  "budgeted_labor_cost" numeric(16,2),
  "currency_code" character(3),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."workforce_plans" (
  "workforce_plan_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "plan_name" text NOT NULL,
  "plan_year" integer NOT NULL,
  "plan_version" text NOT NULL,
  "plan_status" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."workforce_scenarios" (
  "workforce_scenario_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "workforce_plan_id" uuid NOT NULL,
  "scenario_name" text NOT NULL,
  "scenario_type" text,
  "description" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."applications" ADD CONSTRAINT "applications_pkey" PRIMARY KEY (application_id);

ALTER TABLE public."benchmark_metrics" ADD CONSTRAINT "benchmark_metrics_pkey" PRIMARY KEY (benchmark_metric_id);

ALTER TABLE public."calendar" ADD CONSTRAINT "calendar_date_key_key" UNIQUE (date_key);

ALTER TABLE public."calendar" ADD CONSTRAINT "calendar_pkey" PRIMARY KEY (calendar_date);

ALTER TABLE public."candidates" ADD CONSTRAINT "candidates_candidate_number_key" UNIQUE (candidate_number);

ALTER TABLE public."candidates" ADD CONSTRAINT "candidates_pkey" PRIMARY KEY (candidate_id);

ALTER TABLE public."career_preferences" ADD CONSTRAINT "career_preferences_pkey" PRIMARY KEY (career_preference_id);

ALTER TABLE public."certifications" ADD CONSTRAINT "certifications_certification_code_key" UNIQUE (certification_code);

ALTER TABLE public."certifications" ADD CONSTRAINT "certifications_pkey" PRIMARY KEY (certification_id);

ALTER TABLE public."company_events" ADD CONSTRAINT "company_events_pkey" PRIMARY KEY (company_event_id);

ALTER TABLE public."company_profile" ADD CONSTRAINT "company_profile_company_code_key" UNIQUE (company_code);

ALTER TABLE public."company_profile" ADD CONSTRAINT "company_profile_pkey" PRIMARY KEY (company_id);

ALTER TABLE public."compensation" ADD CONSTRAINT "compensation_employee_id_effective_date_key" UNIQUE (employee_id, effective_date);

ALTER TABLE public."compensation" ADD CONSTRAINT "compensation_pkey" PRIMARY KEY (compensation_id);

ALTER TABLE public."compensation_bands" ADD CONSTRAINT "compensation_bands_pkey" PRIMARY KEY (compensation_band_id);

ALTER TABLE public."compensation_job_release_v1" ADD CONSTRAINT "compensation_job_release_v1_base_pay_provenance_check" CHECK (base_pay_provenance = 'existing_workforce_demo_convention_v1'::text);

ALTER TABLE public."compensation_job_release_v1" ADD CONSTRAINT "compensation_job_release_v1_check" CHECK (status = 'withheld'::text AND mean_compa_pct IS NULL AND coverage = 'withheld'::text OR status = 'published'::text AND mean_compa_pct IS NOT NULL AND mean_compa_pct > 0::numeric AND mean_compa_pct < 'Infinity'::numeric AND (coverage = ANY (ARRAY['complete'::text, 'partial'::text])));

ALTER TABLE public."compensation_job_release_v1" ADD CONSTRAINT "compensation_job_release_v1_coverage_check" CHECK (coverage = ANY (ARRAY['complete'::text, 'partial'::text, 'withheld'::text]));

ALTER TABLE public."compensation_job_release_v1" ADD CONSTRAINT "compensation_job_release_v1_job_profile_code_check" CHECK (job_profile_code = ANY (ARRAY['AI-ARCH'::text, 'AI-ENG'::text, 'BI-ANA'::text, 'BI-DEV'::text, 'CLOUD-ARCH'::text, 'CLOUD-ENG'::text, 'COMMS-GEN'::text, 'CONS-MGMT'::text, 'CONS-TECH'::text, 'CONS-TRANS'::text, 'CORPDEV-ANA'::text, 'CSM-GEN'::text, 'CYBER-ANA'::text, 'CYBER-ENG'::text, 'DE-ARCH'::text, 'DE-ENG'::text, 'DS-APPLIED'::text, 'DS-SCI'::text, 'FIN-ACC'::text, 'FIN-FPNA'::text, 'FIN-TREAS'::text, 'HR-HRBP'::text, 'HR-HRIS'::text, 'HR-PA'::text, 'HR-TA'::text, 'HR-TM'::text, 'HR-TR'::text, 'INFOSEC-ANA'::text, 'INFRA-ENG'::text, 'IT-ENG'::text, 'LEGAL-COUNSEL'::text, 'LEGAL-PRIV'::text, 'MKT-BRAND'::text, 'MKT-GROWTH'::text, 'ML-ENG'::text, 'OPS-BUS'::text, 'OPS-CLIENT'::text, 'PMO-PGM'::text, 'PMO-PM'::text, 'PROC-SOURCING'::text, 'PROD-PM'::text, 'QA-ENG'::text, 'SALES-AE'::text, 'SALES-OPS'::text, 'STRAT-ANA'::text, 'SWE-BACK'::text, 'SWE-FRONT'::text, 'SWE-FULL'::text, 'SWE-GEN'::text, 'UX-DES'::text]));

ALTER TABLE public."compensation_job_release_v1" ADD CONSTRAINT "compensation_job_release_v1_job_profile_name_check" CHECK (length(job_profile_name) >= 1 AND length(job_profile_name) <= 200);

ALTER TABLE public."compensation_job_release_v1" ADD CONSTRAINT "compensation_job_release_v1_pkey" PRIMARY KEY (job_profile_code);

ALTER TABLE public."compensation_job_release_v1" ADD CONSTRAINT "compensation_job_release_v1_range_policy_version_check" CHECK (range_policy_version = 'synthetic-existing-jobs-v1'::text);

ALTER TABLE public."compensation_job_release_v1" ADD CONSTRAINT "compensation_job_release_v1_range_provenance_check" CHECK (range_provenance = 'synthetic_assumed_range'::text);

ALTER TABLE public."compensation_job_release_v1" ADD CONSTRAINT "compensation_job_release_v1_release_id_check" CHECK (release_id = 'compa-demo-2026-09-30-v1'::text);

ALTER TABLE public."compensation_job_release_v1" ADD CONSTRAINT "compensation_job_release_v1_snapshot_date_check" CHECK (snapshot_date = '2026-09-30'::date);

ALTER TABLE public."compensation_job_release_v1" ADD CONSTRAINT "compensation_job_release_v1_status_check" CHECK (status = ANY (ARRAY['published'::text, 'withheld'::text]));

ALTER TABLE public."contingent_assignments" ADD CONSTRAINT "contingent_assignments_pkey" PRIMARY KEY (contingent_assignment_id);

ALTER TABLE public."contingent_workers" ADD CONSTRAINT "contingent_workers_contingent_worker_number_key" UNIQUE (contingent_worker_number);

ALTER TABLE public."contingent_workers" ADD CONSTRAINT "contingent_workers_pkey" PRIMARY KEY (contingent_worker_id);

ALTER TABLE public."contingent_workers" ADD CONSTRAINT "contingent_workers_worker_type_check" CHECK (worker_type = ANY (ARRAY['contractor'::text, 'consultant'::text, 'temporary'::text]));

ALTER TABLE public."cost_centers" ADD CONSTRAINT "cost_centers_cost_center_code_key" UNIQUE (cost_center_code);

ALTER TABLE public."cost_centers" ADD CONSTRAINT "cost_centers_pkey" PRIMARY KEY (cost_center_id);

ALTER TABLE public."countries" ADD CONSTRAINT "countries_pkey" PRIMARY KEY (country_code);

ALTER TABLE public."critical_roles" ADD CONSTRAINT "critical_roles_criticality_level_check" CHECK (criticality_level = ANY (ARRAY['moderate'::text, 'high'::text, 'mission_critical'::text]));

ALTER TABLE public."critical_roles" ADD CONSTRAINT "critical_roles_pkey" PRIMARY KEY (critical_role_id);

ALTER TABLE public."data_quality_results" ADD CONSTRAINT "data_quality_results_pkey" PRIMARY KEY (data_quality_result_id);

ALTER TABLE public."employee_absences" ADD CONSTRAINT "employee_absences_pkey" PRIMARY KEY (absence_id);

ALTER TABLE public."employee_certifications" ADD CONSTRAINT "employee_certifications_pkey" PRIMARY KEY (employee_certification_id);

ALTER TABLE public."employee_demographics" ADD CONSTRAINT "employee_demographics_age_band_check" CHECK (age_band = ANY (ARRAY['<25'::text, '25-34'::text, '35-44'::text, '45-54'::text, '55-64'::text, '65+'::text]));

ALTER TABLE public."employee_demographics" ADD CONSTRAINT "employee_demographics_gender_identity_check" CHECK (gender_identity = ANY (ARRAY['Woman'::text, 'Man'::text, 'Non-binary'::text, 'Not disclosed'::text]));

ALTER TABLE public."employee_demographics" ADD CONSTRAINT "employee_demographics_pkey" PRIMARY KEY (employee_id);

ALTER TABLE public."employee_goals" ADD CONSTRAINT "employee_goals_pkey" PRIMARY KEY (employee_goal_id);

ALTER TABLE public."employee_learning" ADD CONSTRAINT "employee_learning_pkey" PRIMARY KEY (employee_learning_id);

ALTER TABLE public."employee_movements" ADD CONSTRAINT "employee_movements_movement_type_check" CHECK (movement_type = ANY (ARRAY['promotion'::text, 'lateral_move'::text, 'transfer'::text, 'demotion'::text, 'manager_change'::text, 'location_change'::text, 'reorganization'::text]));

ALTER TABLE public."employee_movements" ADD CONSTRAINT "employee_movements_pkey" PRIMARY KEY (movement_id);

ALTER TABLE public."employee_skills" ADD CONSTRAINT "employee_skills_assessment_source_check" CHECK (assessment_source = ANY (ARRAY['self'::text, 'manager'::text, 'assessment'::text, 'certification'::text, 'inferred'::text]));

ALTER TABLE public."employee_skills" ADD CONSTRAINT "employee_skills_confidence_check" CHECK (confidence IS NULL OR confidence >= 0::numeric AND confidence <= 1::numeric);

ALTER TABLE public."employee_skills" ADD CONSTRAINT "employee_skills_employee_id_skill_id_key" UNIQUE (employee_id, skill_id);

ALTER TABLE public."employee_skills" ADD CONSTRAINT "employee_skills_pkey" PRIMARY KEY (employee_skill_id);

ALTER TABLE public."employee_skills" ADD CONSTRAINT "employee_skills_proficiency_check" CHECK (proficiency >= 1 AND proficiency <= 5);

ALTER TABLE public."employee_snapshots" ADD CONSTRAINT "employee_snapshots_pkey" PRIMARY KEY (employee_snapshot_id);

ALTER TABLE public."employee_snapshots" ADD CONSTRAINT "employee_snapshots_snapshot_date_employee_id_key" UNIQUE (snapshot_date, employee_id);

ALTER TABLE public."employees" ADD CONSTRAINT "employees_employee_number_key" UNIQUE (employee_number);

ALTER TABLE public."employees" ADD CONSTRAINT "employees_employment_status_check" CHECK (employment_status = ANY (ARRAY['active'::text, 'leave'::text, 'terminated'::text]));

ALTER TABLE public."employees" ADD CONSTRAINT "employees_employment_type_check" CHECK (employment_type = ANY (ARRAY['full_time'::text, 'part_time'::text, 'intern'::text]));

ALTER TABLE public."employees" ADD CONSTRAINT "employees_fte_check" CHECK (fte > 0::numeric AND fte <= 1::numeric);

ALTER TABLE public."employees" ADD CONSTRAINT "employees_pkey" PRIMARY KEY (employee_id);

ALTER TABLE public."employees" ADD CONSTRAINT "employees_work_arrangement_check" CHECK (work_arrangement IS NULL OR (work_arrangement = ANY (ARRAY['onsite'::text, 'hybrid'::text, 'remote'::text])));

ALTER TABLE public."employees" ADD CONSTRAINT "employees_work_email_key" UNIQUE (work_email);

ALTER TABLE public."external_labor_observations" ADD CONSTRAINT "external_labor_observations_pkey" PRIMARY KEY (series_id, observation_date);

ALTER TABLE public."external_labor_series" ADD CONSTRAINT "external_labor_series_pkey" PRIMARY KEY (series_id);

ALTER TABLE public."external_occupations" ADD CONSTRAINT "external_occupations_pkey" PRIMARY KEY (external_occupation_id);

ALTER TABLE public."external_occupations" ADD CONSTRAINT "external_occupations_source_system_occupation_code_key" UNIQUE (source_system, occupation_code);

ALTER TABLE public."fx_rates" ADD CONSTRAINT "fx_rates_effective_month_currency_code_key" UNIQUE (effective_month, currency_code);

ALTER TABLE public."fx_rates" ADD CONSTRAINT "fx_rates_pkey" PRIMARY KEY (fx_rate_id);

ALTER TABLE public."hires" ADD CONSTRAINT "hires_external_internal_check" CHECK (external_internal = ANY (ARRAY['external'::text, 'internal'::text]));

ALTER TABLE public."hires" ADD CONSTRAINT "hires_pkey" PRIMARY KEY (hire_id);

ALTER TABLE public."internal_job_applications" ADD CONSTRAINT "internal_job_applications_pkey" PRIMARY KEY (internal_application_id);

ALTER TABLE public."interviews" ADD CONSTRAINT "interviews_pkey" PRIMARY KEY (interview_id);

ALTER TABLE public."job_families" ADD CONSTRAINT "job_families_family_code_key" UNIQUE (family_code);

ALTER TABLE public."job_families" ADD CONSTRAINT "job_families_pkey" PRIMARY KEY (job_family_id);

ALTER TABLE public."job_functions" ADD CONSTRAINT "job_functions_function_code_key" UNIQUE (function_code);

ALTER TABLE public."job_functions" ADD CONSTRAINT "job_functions_pkey" PRIMARY KEY (job_function_id);

ALTER TABLE public."job_levels" ADD CONSTRAINT "job_levels_career_track_check" CHECK (career_track = ANY (ARRAY['individual_contributor'::text, 'manager'::text, 'executive'::text]));

ALTER TABLE public."job_levels" ADD CONSTRAINT "job_levels_level_code_key" UNIQUE (level_code);

ALTER TABLE public."job_levels" ADD CONSTRAINT "job_levels_pkey" PRIMARY KEY (job_level_id);

ALTER TABLE public."job_occupation_mapping" ADD CONSTRAINT "job_occupation_mapping_job_profile_id_external_occupation_i_key" UNIQUE (job_profile_id, external_occupation_id);

ALTER TABLE public."job_occupation_mapping" ADD CONSTRAINT "job_occupation_mapping_pkey" PRIMARY KEY (job_occupation_mapping_id);

ALTER TABLE public."job_onet_mapping" ADD CONSTRAINT "job_onet_mapping_pkey" PRIMARY KEY (job_profile_id);

ALTER TABLE public."job_profiles" ADD CONSTRAINT "job_profiles_exempt_status_check" CHECK (exempt_status IS NULL OR (exempt_status = ANY (ARRAY['exempt'::text, 'non_exempt'::text, 'not_applicable'::text])));

ALTER TABLE public."job_profiles" ADD CONSTRAINT "job_profiles_job_profile_code_key" UNIQUE (job_profile_code);

ALTER TABLE public."job_profiles" ADD CONSTRAINT "job_profiles_pkey" PRIMARY KEY (job_profile_id);

ALTER TABLE public."job_skill_requirements" ADD CONSTRAINT "job_skill_requirements_importance_check" CHECK (importance = ANY (ARRAY['required'::text, 'preferred'::text]));

ALTER TABLE public."job_skill_requirements" ADD CONSTRAINT "job_skill_requirements_job_profile_id_skill_id_key" UNIQUE (job_profile_id, skill_id);

ALTER TABLE public."job_skill_requirements" ADD CONSTRAINT "job_skill_requirements_pkey" PRIMARY KEY (job_skill_requirement_id);

ALTER TABLE public."job_skill_requirements" ADD CONSTRAINT "job_skill_requirements_required_proficiency_check" CHECK (required_proficiency >= 1 AND required_proficiency <= 5);

ALTER TABLE public."job_skill_requirements" ADD CONSTRAINT "job_skill_requirements_weight_check" CHECK (weight IS NULL OR weight >= 0::numeric AND weight <= 1::numeric);

ALTER TABLE public."labor_costs" ADD CONSTRAINT "labor_costs_employee_id_effective_month_key" UNIQUE (employee_id, effective_month);

ALTER TABLE public."labor_costs" ADD CONSTRAINT "labor_costs_pkey" PRIMARY KEY (labor_cost_id);

ALTER TABLE public."learning_courses" ADD CONSTRAINT "learning_courses_course_code_key" UNIQUE (course_code);

ALTER TABLE public."learning_courses" ADD CONSTRAINT "learning_courses_pkey" PRIMARY KEY (course_id);

ALTER TABLE public."legal_entities" ADD CONSTRAINT "legal_entities_legal_entity_code_key" UNIQUE (legal_entity_code);

ALTER TABLE public."legal_entities" ADD CONSTRAINT "legal_entities_pkey" PRIMARY KEY (legal_entity_id);

ALTER TABLE public."locations" ADD CONSTRAINT "locations_location_code_key" UNIQUE (location_code);

ALTER TABLE public."locations" ADD CONSTRAINT "locations_location_type_check" CHECK (location_type = ANY (ARRAY['office'::text, 'remote'::text, 'hybrid_hub'::text, 'client_site'::text]));

ALTER TABLE public."locations" ADD CONSTRAINT "locations_pkey" PRIMARY KEY (location_id);

ALTER TABLE public."market_compensation" ADD CONSTRAINT "market_compensation_pkey" PRIMARY KEY (market_compensation_id);

ALTER TABLE public."market_demand" ADD CONSTRAINT "market_demand_pkey" PRIMARY KEY (market_demand_id);

ALTER TABLE public."market_skills" ADD CONSTRAINT "market_skills_pkey" PRIMARY KEY (market_skill_id);

ALTER TABLE public."market_supply" ADD CONSTRAINT "market_supply_pkey" PRIMARY KEY (market_supply_id);

ALTER TABLE public."metric_definitions" ADD CONSTRAINT "metric_definitions_metric_code_key" UNIQUE (metric_code);

ALTER TABLE public."metric_definitions" ADD CONSTRAINT "metric_definitions_pkey" PRIMARY KEY (metric_definition_id);

ALTER TABLE public."offers" ADD CONSTRAINT "offers_offer_status_check" CHECK (offer_status = ANY (ARRAY['extended'::text, 'accepted'::text, 'declined'::text, 'withdrawn'::text]));

ALTER TABLE public."offers" ADD CONSTRAINT "offers_pkey" PRIMARY KEY (offer_id);

ALTER TABLE public."onet_essential_skills" ADD CONSTRAINT "onet_essential_skills_pkey" PRIMARY KEY (row_key);

ALTER TABLE public."onet_occupations" ADD CONSTRAINT "onet_occupations_pkey" PRIMARY KEY (onetsoc_code);

ALTER TABLE public."onet_software_skills" ADD CONSTRAINT "onet_software_skills_pkey" PRIMARY KEY (row_key);

ALTER TABLE public."org_units" ADD CONSTRAINT "org_units_org_code_key" UNIQUE (org_code);

ALTER TABLE public."org_units" ADD CONSTRAINT "org_units_org_type_check" CHECK (org_type = ANY (ARRAY['company'::text, 'region'::text, 'business_unit'::text, 'function'::text, 'division'::text, 'department'::text, 'team'::text]));

ALTER TABLE public."org_units" ADD CONSTRAINT "org_units_pkey" PRIMARY KEY (org_unit_id);

ALTER TABLE public."pay_adjustments" ADD CONSTRAINT "pay_adjustments_adjustment_type_check" CHECK (adjustment_type = ANY (ARRAY['merit'::text, 'promotion'::text, 'market'::text, 'retention'::text, 'equity'::text, 'other'::text]));

ALTER TABLE public."pay_adjustments" ADD CONSTRAINT "pay_adjustments_pkey" PRIMARY KEY (pay_adjustment_id);

ALTER TABLE public."performance_reviews" ADD CONSTRAINT "performance_reviews_employee_id_review_period_key" UNIQUE (employee_id, review_period);

ALTER TABLE public."performance_reviews" ADD CONSTRAINT "performance_reviews_pkey" PRIMARY KEY (performance_review_id);

ALTER TABLE public."position_plans" ADD CONSTRAINT "position_plans_pkey" PRIMARY KEY (position_plan_id);

ALTER TABLE public."position_snapshots" ADD CONSTRAINT "position_snapshots_pkey" PRIMARY KEY (position_snapshot_id);

ALTER TABLE public."position_snapshots" ADD CONSTRAINT "position_snapshots_snapshot_date_position_id_key" UNIQUE (snapshot_date, position_id);

ALTER TABLE public."positions" ADD CONSTRAINT "positions_fte_check" CHECK (fte > 0::numeric AND fte <= 1::numeric);

ALTER TABLE public."positions" ADD CONSTRAINT "positions_pkey" PRIMARY KEY (position_id);

ALTER TABLE public."positions" ADD CONSTRAINT "positions_position_code_key" UNIQUE (position_code);

ALTER TABLE public."positions" ADD CONSTRAINT "positions_position_status_check" CHECK (position_status = ANY (ARRAY['filled'::text, 'vacant'::text, 'planned'::text, 'frozen'::text, 'closed'::text]));

ALTER TABLE public."positions" ADD CONSTRAINT "positions_position_type_check" CHECK (position_type = ANY (ARRAY['permanent'::text, 'temporary'::text]));

ALTER TABLE public."positions" ADD CONSTRAINT "positions_worker_type_check" CHECK (worker_type = ANY (ARRAY['employee'::text, 'contractor'::text, 'temporary'::text]));

ALTER TABLE public."recruiters" ADD CONSTRAINT "recruiters_pkey" PRIMARY KEY (recruiter_id);

ALTER TABLE public."recruiting_sources" ADD CONSTRAINT "recruiting_sources_pkey" PRIMARY KEY (recruiting_source_id);

ALTER TABLE public."recruiting_sources" ADD CONSTRAINT "recruiting_sources_source_code_key" UNIQUE (source_code);

ALTER TABLE public."requisitions" ADD CONSTRAINT "requisitions_pkey" PRIMARY KEY (requisition_id);

ALTER TABLE public."requisitions" ADD CONSTRAINT "requisitions_requisition_number_key" UNIQUE (requisition_number);

ALTER TABLE public."requisitions" ADD CONSTRAINT "requisitions_requisition_status_check" CHECK (requisition_status = ANY (ARRAY['draft'::text, 'approved'::text, 'open'::text, 'on_hold'::text, 'filled'::text, 'cancelled'::text]));

ALTER TABLE public."requisitions" ADD CONSTRAINT "requisitions_requisition_type_check" CHECK (requisition_type IS NULL OR (requisition_type = ANY (ARRAY['external'::text, 'internal'::text])));

ALTER TABLE public."scenario_assumptions" ADD CONSTRAINT "scenario_assumptions_pkey" PRIMARY KEY (scenario_assumption_id);

ALTER TABLE public."separations" ADD CONSTRAINT "separations_employee_id_separation_date_key" UNIQUE (employee_id, separation_date);

ALTER TABLE public."separations" ADD CONSTRAINT "separations_pkey" PRIMARY KEY (separation_id);

ALTER TABLE public."separations" ADD CONSTRAINT "separations_separation_type_check" CHECK (separation_type = ANY (ARRAY['voluntary'::text, 'involuntary'::text, 'retirement'::text, 'end_of_contract'::text]));

ALTER TABLE public."skills" ADD CONSTRAINT "skills_pkey" PRIMARY KEY (skill_id);

ALTER TABLE public."skills" ADD CONSTRAINT "skills_skill_code_key" UNIQUE (skill_code);

ALTER TABLE public."succession_plans" ADD CONSTRAINT "succession_plans_pkey" PRIMARY KEY (succession_plan_id);

ALTER TABLE public."successor_candidates" ADD CONSTRAINT "successor_candidates_pkey" PRIMARY KEY (successor_candidate_id);

ALTER TABLE public."successor_candidates" ADD CONSTRAINT "successor_candidates_readiness_check" CHECK (readiness = ANY (ARRAY['ready_now'::text, 'ready_1_2_years'::text, 'ready_3_plus_years'::text]));

ALTER TABLE public."survey_questions" ADD CONSTRAINT "survey_questions_pkey" PRIMARY KEY (survey_question_id);

ALTER TABLE public."survey_questions" ADD CONSTRAINT "survey_questions_survey_id_question_code_key" UNIQUE (survey_id, question_code);

ALTER TABLE public."survey_responses" ADD CONSTRAINT "survey_responses_pkey" PRIMARY KEY (survey_response_id);

ALTER TABLE public."survey_scores" ADD CONSTRAINT "survey_scores_pkey" PRIMARY KEY (survey_score_id);

ALTER TABLE public."surveys" ADD CONSTRAINT "surveys_pkey" PRIMARY KEY (survey_id);

ALTER TABLE public."surveys" ADD CONSTRAINT "surveys_survey_code_key" UNIQUE (survey_code);

ALTER TABLE public."surveys" ADD CONSTRAINT "surveys_survey_type_check" CHECK (survey_type = ANY (ARRAY['engagement'::text, 'pulse'::text, 'onboarding_30'::text, 'onboarding_60'::text, 'onboarding_90'::text, 'exit'::text, 'candidate_experience'::text, 'manager_effectiveness'::text, 'change'::text, 'belonging'::text]));

ALTER TABLE public."synthetic_business_unit_targets" ADD CONSTRAINT "synthetic_business_unit_targets_pkey" PRIMARY KEY (org_code);

ALTER TABLE public."synthetic_country_comp_factors" ADD CONSTRAINT "synthetic_country_comp_factors_pkey" PRIMARY KEY (country_code);

ALTER TABLE public."synthetic_country_targets" ADD CONSTRAINT "synthetic_country_targets_pkey" PRIMARY KEY (country_code);

ALTER TABLE public."synthetic_function_comp_factors" ADD CONSTRAINT "synthetic_function_comp_factors_pkey" PRIMARY KEY (function_code);

ALTER TABLE public."synthetic_history_targets" ADD CONSTRAINT "synthetic_history_targets_pkey" PRIMARY KEY (snapshot_date);

ALTER TABLE public."synthetic_level_compensation" ADD CONSTRAINT "synthetic_level_compensation_pkey" PRIMARY KEY (level_code);

ALTER TABLE public."synthetic_level_targets" ADD CONSTRAINT "synthetic_level_targets_pkey" PRIMARY KEY (level_code);

ALTER TABLE public."synthetic_location_targets" ADD CONSTRAINT "synthetic_location_targets_pkey" PRIMARY KEY (location_code);

ALTER TABLE public."talent_ratings" ADD CONSTRAINT "talent_ratings_pkey" PRIMARY KEY (talent_rating_id);

ALTER TABLE public."workforce_budgets" ADD CONSTRAINT "workforce_budgets_pkey" PRIMARY KEY (workforce_budget_id);

ALTER TABLE public."workforce_plans" ADD CONSTRAINT "workforce_plans_pkey" PRIMARY KEY (workforce_plan_id);

ALTER TABLE public."workforce_plans" ADD CONSTRAINT "workforce_plans_plan_status_check" CHECK (plan_status = ANY (ARRAY['draft'::text, 'approved'::text, 'archived'::text]));

ALTER TABLE public."workforce_scenarios" ADD CONSTRAINT "workforce_scenarios_pkey" PRIMARY KEY (workforce_scenario_id);

ALTER TABLE public."applications" ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id);

ALTER TABLE public."applications" ADD CONSTRAINT "applications_recruiting_source_id_fkey" FOREIGN KEY (recruiting_source_id) REFERENCES recruiting_sources(recruiting_source_id);

ALTER TABLE public."applications" ADD CONSTRAINT "applications_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES requisitions(requisition_id);

ALTER TABLE public."benchmark_metrics" ADD CONSTRAINT "benchmark_metrics_country_code_fkey" FOREIGN KEY (country_code) REFERENCES countries(country_code);

ALTER TABLE public."candidates" ADD CONSTRAINT "candidates_country_code_fkey" FOREIGN KEY (country_code) REFERENCES countries(country_code);

ALTER TABLE public."career_preferences" ADD CONSTRAINT "career_preferences_desired_job_family_id_fkey" FOREIGN KEY (desired_job_family_id) REFERENCES job_families(job_family_id);

ALTER TABLE public."career_preferences" ADD CONSTRAINT "career_preferences_desired_job_profile_id_fkey" FOREIGN KEY (desired_job_profile_id) REFERENCES job_profiles(job_profile_id);

ALTER TABLE public."career_preferences" ADD CONSTRAINT "career_preferences_desired_location_id_fkey" FOREIGN KEY (desired_location_id) REFERENCES locations(location_id);

ALTER TABLE public."career_preferences" ADD CONSTRAINT "career_preferences_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."certifications" ADD CONSTRAINT "certifications_skill_id_fkey" FOREIGN KEY (skill_id) REFERENCES skills(skill_id);

ALTER TABLE public."company_events" ADD CONSTRAINT "company_events_affected_country_code_fkey" FOREIGN KEY (affected_country_code) REFERENCES countries(country_code);

ALTER TABLE public."company_events" ADD CONSTRAINT "company_events_affected_org_unit_id_fkey" FOREIGN KEY (affected_org_unit_id) REFERENCES org_units(org_unit_id);

ALTER TABLE public."company_profile" ADD CONSTRAINT "company_profile_headquarters_country_code_fkey" FOREIGN KEY (headquarters_country_code) REFERENCES countries(country_code);

ALTER TABLE public."compensation" ADD CONSTRAINT "compensation_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."compensation_bands" ADD CONSTRAINT "compensation_bands_country_code_fkey" FOREIGN KEY (country_code) REFERENCES countries(country_code);

ALTER TABLE public."compensation_bands" ADD CONSTRAINT "compensation_bands_job_level_id_fkey" FOREIGN KEY (job_level_id) REFERENCES job_levels(job_level_id);

ALTER TABLE public."compensation_bands" ADD CONSTRAINT "compensation_bands_job_profile_id_fkey" FOREIGN KEY (job_profile_id) REFERENCES job_profiles(job_profile_id);

ALTER TABLE public."contingent_assignments" ADD CONSTRAINT "contingent_assignments_contingent_worker_id_fkey" FOREIGN KEY (contingent_worker_id) REFERENCES contingent_workers(contingent_worker_id);

ALTER TABLE public."contingent_assignments" ADD CONSTRAINT "contingent_assignments_position_id_fkey" FOREIGN KEY (position_id) REFERENCES positions(position_id);

ALTER TABLE public."contingent_workers" ADD CONSTRAINT "contingent_workers_job_profile_id_fkey" FOREIGN KEY (job_profile_id) REFERENCES job_profiles(job_profile_id);

ALTER TABLE public."contingent_workers" ADD CONSTRAINT "contingent_workers_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(location_id);

ALTER TABLE public."contingent_workers" ADD CONSTRAINT "contingent_workers_org_unit_id_fkey" FOREIGN KEY (org_unit_id) REFERENCES org_units(org_unit_id);

ALTER TABLE public."cost_centers" ADD CONSTRAINT "cost_centers_legal_entity_id_fkey" FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(legal_entity_id);

ALTER TABLE public."critical_roles" ADD CONSTRAINT "critical_roles_job_profile_id_fkey" FOREIGN KEY (job_profile_id) REFERENCES job_profiles(job_profile_id);

ALTER TABLE public."employee_absences" ADD CONSTRAINT "employee_absences_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."employee_certifications" ADD CONSTRAINT "employee_certifications_certification_id_fkey" FOREIGN KEY (certification_id) REFERENCES certifications(certification_id);

ALTER TABLE public."employee_certifications" ADD CONSTRAINT "employee_certifications_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."employee_demographics" ADD CONSTRAINT "employee_demographics_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."employee_goals" ADD CONSTRAINT "employee_goals_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."employee_learning" ADD CONSTRAINT "employee_learning_course_id_fkey" FOREIGN KEY (course_id) REFERENCES learning_courses(course_id);

ALTER TABLE public."employee_learning" ADD CONSTRAINT "employee_learning_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."employee_movements" ADD CONSTRAINT "employee_movements_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."employee_movements" ADD CONSTRAINT "employee_movements_from_job_level_id_fkey" FOREIGN KEY (from_job_level_id) REFERENCES job_levels(job_level_id);

ALTER TABLE public."employee_movements" ADD CONSTRAINT "employee_movements_from_org_unit_id_fkey" FOREIGN KEY (from_org_unit_id) REFERENCES org_units(org_unit_id);

ALTER TABLE public."employee_movements" ADD CONSTRAINT "employee_movements_from_position_id_fkey" FOREIGN KEY (from_position_id) REFERENCES positions(position_id);

ALTER TABLE public."employee_movements" ADD CONSTRAINT "employee_movements_to_job_level_id_fkey" FOREIGN KEY (to_job_level_id) REFERENCES job_levels(job_level_id);

ALTER TABLE public."employee_movements" ADD CONSTRAINT "employee_movements_to_org_unit_id_fkey" FOREIGN KEY (to_org_unit_id) REFERENCES org_units(org_unit_id);

ALTER TABLE public."employee_movements" ADD CONSTRAINT "employee_movements_to_position_id_fkey" FOREIGN KEY (to_position_id) REFERENCES positions(position_id);

ALTER TABLE public."employee_skills" ADD CONSTRAINT "employee_skills_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."employee_skills" ADD CONSTRAINT "employee_skills_skill_id_fkey" FOREIGN KEY (skill_id) REFERENCES skills(skill_id);

ALTER TABLE public."employee_snapshots" ADD CONSTRAINT "employee_snapshots_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES cost_centers(cost_center_id);

ALTER TABLE public."employee_snapshots" ADD CONSTRAINT "employee_snapshots_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."employee_snapshots" ADD CONSTRAINT "employee_snapshots_job_level_id_fkey" FOREIGN KEY (job_level_id) REFERENCES job_levels(job_level_id);

ALTER TABLE public."employee_snapshots" ADD CONSTRAINT "employee_snapshots_job_profile_id_fkey" FOREIGN KEY (job_profile_id) REFERENCES job_profiles(job_profile_id);

ALTER TABLE public."employee_snapshots" ADD CONSTRAINT "employee_snapshots_legal_entity_id_fkey" FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(legal_entity_id);

ALTER TABLE public."employee_snapshots" ADD CONSTRAINT "employee_snapshots_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(location_id);

ALTER TABLE public."employee_snapshots" ADD CONSTRAINT "employee_snapshots_manager_employee_id_fkey" FOREIGN KEY (manager_employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."employee_snapshots" ADD CONSTRAINT "employee_snapshots_org_unit_id_fkey" FOREIGN KEY (org_unit_id) REFERENCES org_units(org_unit_id);

ALTER TABLE public."employee_snapshots" ADD CONSTRAINT "employee_snapshots_position_id_fkey" FOREIGN KEY (position_id) REFERENCES positions(position_id);

ALTER TABLE public."employees" ADD CONSTRAINT "employees_current_cost_center_id_fkey" FOREIGN KEY (current_cost_center_id) REFERENCES cost_centers(cost_center_id);

ALTER TABLE public."employees" ADD CONSTRAINT "employees_current_org_unit_id_fkey" FOREIGN KEY (current_org_unit_id) REFERENCES org_units(org_unit_id);

ALTER TABLE public."employees" ADD CONSTRAINT "employees_home_location_id_fkey" FOREIGN KEY (home_location_id) REFERENCES locations(location_id);

ALTER TABLE public."employees" ADD CONSTRAINT "employees_legal_entity_id_fkey" FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(legal_entity_id);

ALTER TABLE public."employees" ADD CONSTRAINT "employees_manager_employee_id_fkey" FOREIGN KEY (manager_employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."employees" ADD CONSTRAINT "employees_worker_country_code_fkey" FOREIGN KEY (worker_country_code) REFERENCES countries(country_code);

ALTER TABLE public."external_labor_observations" ADD CONSTRAINT "external_labor_observations_series_id_fkey" FOREIGN KEY (series_id) REFERENCES external_labor_series(series_id);

ALTER TABLE public."hires" ADD CONSTRAINT "hires_application_id_fkey" FOREIGN KEY (application_id) REFERENCES applications(application_id);

ALTER TABLE public."hires" ADD CONSTRAINT "hires_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."hires" ADD CONSTRAINT "hires_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES requisitions(requisition_id);

ALTER TABLE public."internal_job_applications" ADD CONSTRAINT "internal_job_applications_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."internal_job_applications" ADD CONSTRAINT "internal_job_applications_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES requisitions(requisition_id);

ALTER TABLE public."interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY (application_id) REFERENCES applications(application_id);

ALTER TABLE public."interviews" ADD CONSTRAINT "interviews_interviewer_employee_id_fkey" FOREIGN KEY (interviewer_employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."job_families" ADD CONSTRAINT "job_families_job_function_id_fkey" FOREIGN KEY (job_function_id) REFERENCES job_functions(job_function_id);

ALTER TABLE public."job_occupation_mapping" ADD CONSTRAINT "job_occupation_mapping_external_occupation_id_fkey" FOREIGN KEY (external_occupation_id) REFERENCES external_occupations(external_occupation_id);

ALTER TABLE public."job_occupation_mapping" ADD CONSTRAINT "job_occupation_mapping_job_profile_id_fkey" FOREIGN KEY (job_profile_id) REFERENCES job_profiles(job_profile_id);

ALTER TABLE public."job_onet_mapping" ADD CONSTRAINT "job_onet_mapping_job_profile_id_fkey" FOREIGN KEY (job_profile_id) REFERENCES job_profiles(job_profile_id);

ALTER TABLE public."job_onet_mapping" ADD CONSTRAINT "job_onet_mapping_onetsoc_code_fkey" FOREIGN KEY (onetsoc_code) REFERENCES onet_occupations(onetsoc_code);

ALTER TABLE public."job_profiles" ADD CONSTRAINT "job_profiles_job_family_id_fkey" FOREIGN KEY (job_family_id) REFERENCES job_families(job_family_id);

ALTER TABLE public."job_skill_requirements" ADD CONSTRAINT "job_skill_requirements_job_profile_id_fkey" FOREIGN KEY (job_profile_id) REFERENCES job_profiles(job_profile_id);

ALTER TABLE public."job_skill_requirements" ADD CONSTRAINT "job_skill_requirements_skill_id_fkey" FOREIGN KEY (skill_id) REFERENCES skills(skill_id);

ALTER TABLE public."labor_costs" ADD CONSTRAINT "labor_costs_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."learning_courses" ADD CONSTRAINT "learning_courses_skill_id_fkey" FOREIGN KEY (skill_id) REFERENCES skills(skill_id);

ALTER TABLE public."legal_entities" ADD CONSTRAINT "legal_entities_country_code_fkey" FOREIGN KEY (country_code) REFERENCES countries(country_code);

ALTER TABLE public."locations" ADD CONSTRAINT "locations_country_code_fkey" FOREIGN KEY (country_code) REFERENCES countries(country_code);

ALTER TABLE public."market_compensation" ADD CONSTRAINT "market_compensation_external_occupation_id_fkey" FOREIGN KEY (external_occupation_id) REFERENCES external_occupations(external_occupation_id);

ALTER TABLE public."market_compensation" ADD CONSTRAINT "market_compensation_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(location_id);

ALTER TABLE public."market_demand" ADD CONSTRAINT "market_demand_external_occupation_id_fkey" FOREIGN KEY (external_occupation_id) REFERENCES external_occupations(external_occupation_id);

ALTER TABLE public."market_demand" ADD CONSTRAINT "market_demand_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(location_id);

ALTER TABLE public."market_skills" ADD CONSTRAINT "market_skills_external_occupation_id_fkey" FOREIGN KEY (external_occupation_id) REFERENCES external_occupations(external_occupation_id);

ALTER TABLE public."market_skills" ADD CONSTRAINT "market_skills_skill_id_fkey" FOREIGN KEY (skill_id) REFERENCES skills(skill_id);

ALTER TABLE public."market_supply" ADD CONSTRAINT "market_supply_external_occupation_id_fkey" FOREIGN KEY (external_occupation_id) REFERENCES external_occupations(external_occupation_id);

ALTER TABLE public."market_supply" ADD CONSTRAINT "market_supply_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(location_id);

ALTER TABLE public."offers" ADD CONSTRAINT "offers_application_id_fkey" FOREIGN KEY (application_id) REFERENCES applications(application_id);

ALTER TABLE public."onet_essential_skills" ADD CONSTRAINT "onet_essential_skills_onetsoc_code_fkey" FOREIGN KEY (onetsoc_code) REFERENCES onet_occupations(onetsoc_code);

ALTER TABLE public."onet_software_skills" ADD CONSTRAINT "onet_software_skills_onetsoc_code_fkey" FOREIGN KEY (onetsoc_code) REFERENCES onet_occupations(onetsoc_code);

ALTER TABLE public."org_units" ADD CONSTRAINT "org_units_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES cost_centers(cost_center_id);

ALTER TABLE public."org_units" ADD CONSTRAINT "org_units_legal_entity_id_fkey" FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(legal_entity_id);

ALTER TABLE public."org_units" ADD CONSTRAINT "org_units_parent_org_unit_id_fkey" FOREIGN KEY (parent_org_unit_id) REFERENCES org_units(org_unit_id);

ALTER TABLE public."pay_adjustments" ADD CONSTRAINT "pay_adjustments_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."performance_reviews" ADD CONSTRAINT "performance_reviews_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."performance_reviews" ADD CONSTRAINT "performance_reviews_manager_employee_id_fkey" FOREIGN KEY (manager_employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."position_plans" ADD CONSTRAINT "position_plans_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES cost_centers(cost_center_id);

ALTER TABLE public."position_plans" ADD CONSTRAINT "position_plans_job_level_id_fkey" FOREIGN KEY (job_level_id) REFERENCES job_levels(job_level_id);

ALTER TABLE public."position_plans" ADD CONSTRAINT "position_plans_job_profile_id_fkey" FOREIGN KEY (job_profile_id) REFERENCES job_profiles(job_profile_id);

ALTER TABLE public."position_plans" ADD CONSTRAINT "position_plans_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(location_id);

ALTER TABLE public."position_plans" ADD CONSTRAINT "position_plans_org_unit_id_fkey" FOREIGN KEY (org_unit_id) REFERENCES org_units(org_unit_id);

ALTER TABLE public."position_plans" ADD CONSTRAINT "position_plans_workforce_scenario_id_fkey" FOREIGN KEY (workforce_scenario_id) REFERENCES workforce_scenarios(workforce_scenario_id);

ALTER TABLE public."position_snapshots" ADD CONSTRAINT "position_snapshots_incumbent_employee_id_fkey" FOREIGN KEY (incumbent_employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."position_snapshots" ADD CONSTRAINT "position_snapshots_job_level_id_fkey" FOREIGN KEY (job_level_id) REFERENCES job_levels(job_level_id);

ALTER TABLE public."position_snapshots" ADD CONSTRAINT "position_snapshots_job_profile_id_fkey" FOREIGN KEY (job_profile_id) REFERENCES job_profiles(job_profile_id);

ALTER TABLE public."position_snapshots" ADD CONSTRAINT "position_snapshots_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(location_id);

ALTER TABLE public."position_snapshots" ADD CONSTRAINT "position_snapshots_org_unit_id_fkey" FOREIGN KEY (org_unit_id) REFERENCES org_units(org_unit_id);

ALTER TABLE public."position_snapshots" ADD CONSTRAINT "position_snapshots_position_id_fkey" FOREIGN KEY (position_id) REFERENCES positions(position_id);

ALTER TABLE public."positions" ADD CONSTRAINT "positions_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES cost_centers(cost_center_id);

ALTER TABLE public."positions" ADD CONSTRAINT "positions_incumbent_employee_id_fkey" FOREIGN KEY (incumbent_employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."positions" ADD CONSTRAINT "positions_job_level_id_fkey" FOREIGN KEY (job_level_id) REFERENCES job_levels(job_level_id);

ALTER TABLE public."positions" ADD CONSTRAINT "positions_job_profile_id_fkey" FOREIGN KEY (job_profile_id) REFERENCES job_profiles(job_profile_id);

ALTER TABLE public."positions" ADD CONSTRAINT "positions_legal_entity_id_fkey" FOREIGN KEY (legal_entity_id) REFERENCES legal_entities(legal_entity_id);

ALTER TABLE public."positions" ADD CONSTRAINT "positions_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(location_id);

ALTER TABLE public."positions" ADD CONSTRAINT "positions_org_unit_id_fkey" FOREIGN KEY (org_unit_id) REFERENCES org_units(org_unit_id);

ALTER TABLE public."positions" ADD CONSTRAINT "positions_reports_to_position_id_fkey" FOREIGN KEY (reports_to_position_id) REFERENCES positions(position_id);

ALTER TABLE public."recruiters" ADD CONSTRAINT "recruiters_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."requisitions" ADD CONSTRAINT "requisitions_hiring_manager_employee_id_fkey" FOREIGN KEY (hiring_manager_employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."requisitions" ADD CONSTRAINT "requisitions_job_level_id_fkey" FOREIGN KEY (job_level_id) REFERENCES job_levels(job_level_id);

ALTER TABLE public."requisitions" ADD CONSTRAINT "requisitions_job_profile_id_fkey" FOREIGN KEY (job_profile_id) REFERENCES job_profiles(job_profile_id);

ALTER TABLE public."requisitions" ADD CONSTRAINT "requisitions_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(location_id);

ALTER TABLE public."requisitions" ADD CONSTRAINT "requisitions_org_unit_id_fkey" FOREIGN KEY (org_unit_id) REFERENCES org_units(org_unit_id);

ALTER TABLE public."requisitions" ADD CONSTRAINT "requisitions_position_id_fkey" FOREIGN KEY (position_id) REFERENCES positions(position_id);

ALTER TABLE public."requisitions" ADD CONSTRAINT "requisitions_recruiter_id_fkey" FOREIGN KEY (recruiter_id) REFERENCES recruiters(recruiter_id);

ALTER TABLE public."scenario_assumptions" ADD CONSTRAINT "scenario_assumptions_workforce_scenario_id_fkey" FOREIGN KEY (workforce_scenario_id) REFERENCES workforce_scenarios(workforce_scenario_id);

ALTER TABLE public."separations" ADD CONSTRAINT "separations_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."succession_plans" ADD CONSTRAINT "succession_plans_position_id_fkey" FOREIGN KEY (position_id) REFERENCES positions(position_id);

ALTER TABLE public."successor_candidates" ADD CONSTRAINT "successor_candidates_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."successor_candidates" ADD CONSTRAINT "successor_candidates_succession_plan_id_fkey" FOREIGN KEY (succession_plan_id) REFERENCES succession_plans(succession_plan_id);

ALTER TABLE public."survey_questions" ADD CONSTRAINT "survey_questions_survey_id_fkey" FOREIGN KEY (survey_id) REFERENCES surveys(survey_id);

ALTER TABLE public."survey_responses" ADD CONSTRAINT "survey_responses_candidate_id_fkey" FOREIGN KEY (candidate_id) REFERENCES candidates(candidate_id);

ALTER TABLE public."survey_responses" ADD CONSTRAINT "survey_responses_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."survey_responses" ADD CONSTRAINT "survey_responses_separation_id_fkey" FOREIGN KEY (separation_id) REFERENCES separations(separation_id);

ALTER TABLE public."survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY (survey_id) REFERENCES surveys(survey_id);

ALTER TABLE public."survey_responses" ADD CONSTRAINT "survey_responses_survey_question_id_fkey" FOREIGN KEY (survey_question_id) REFERENCES survey_questions(survey_question_id);

ALTER TABLE public."survey_scores" ADD CONSTRAINT "survey_scores_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."survey_scores" ADD CONSTRAINT "survey_scores_org_unit_id_fkey" FOREIGN KEY (org_unit_id) REFERENCES org_units(org_unit_id);

ALTER TABLE public."survey_scores" ADD CONSTRAINT "survey_scores_survey_id_fkey" FOREIGN KEY (survey_id) REFERENCES surveys(survey_id);

ALTER TABLE public."synthetic_business_unit_targets" ADD CONSTRAINT "synthetic_business_unit_targets_org_code_fkey" FOREIGN KEY (org_code) REFERENCES org_units(org_code);

ALTER TABLE public."synthetic_country_comp_factors" ADD CONSTRAINT "synthetic_country_comp_factors_country_code_fkey" FOREIGN KEY (country_code) REFERENCES countries(country_code);

ALTER TABLE public."synthetic_country_targets" ADD CONSTRAINT "synthetic_country_targets_country_code_fkey" FOREIGN KEY (country_code) REFERENCES countries(country_code);

ALTER TABLE public."synthetic_function_comp_factors" ADD CONSTRAINT "synthetic_function_comp_factors_function_code_fkey" FOREIGN KEY (function_code) REFERENCES job_functions(function_code);

ALTER TABLE public."synthetic_level_compensation" ADD CONSTRAINT "synthetic_level_compensation_level_code_fkey" FOREIGN KEY (level_code) REFERENCES job_levels(level_code);

ALTER TABLE public."synthetic_level_targets" ADD CONSTRAINT "synthetic_level_targets_level_code_fkey" FOREIGN KEY (level_code) REFERENCES job_levels(level_code);

ALTER TABLE public."synthetic_location_targets" ADD CONSTRAINT "synthetic_location_targets_location_code_fkey" FOREIGN KEY (location_code) REFERENCES locations(location_code);

ALTER TABLE public."talent_ratings" ADD CONSTRAINT "talent_ratings_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES employees(employee_id);

ALTER TABLE public."workforce_budgets" ADD CONSTRAINT "workforce_budgets_cost_center_id_fkey" FOREIGN KEY (cost_center_id) REFERENCES cost_centers(cost_center_id);

ALTER TABLE public."workforce_budgets" ADD CONSTRAINT "workforce_budgets_org_unit_id_fkey" FOREIGN KEY (org_unit_id) REFERENCES org_units(org_unit_id);

ALTER TABLE public."workforce_scenarios" ADD CONSTRAINT "workforce_scenarios_workforce_plan_id_fkey" FOREIGN KEY (workforce_plan_id) REFERENCES workforce_plans(workforce_plan_id);

CREATE INDEX idx_applications_requisition ON public.applications USING btree (requisition_id);

CREATE UNIQUE INDEX uq_applications_candidate_requisition ON public.applications USING btree (candidate_id, requisition_id);

CREATE INDEX idx_applications_status ON public.applications USING btree (application_status);

CREATE UNIQUE INDEX uq_career_preferences_employee ON public.career_preferences USING btree (employee_id);

CREATE UNIQUE INDEX uq_compensation_bands_profile_level_country_date ON public.compensation_bands USING btree (job_profile_id, job_level_id, country_code, effective_date);

CREATE UNIQUE INDEX uq_critical_roles_job_profile ON public.critical_roles USING btree (job_profile_id);

CREATE UNIQUE INDEX uq_employee_certifications_employee_cert ON public.employee_certifications USING btree (employee_id, certification_id);

CREATE INDEX idx_employee_certifications_earned_date ON public.employee_certifications USING btree (earned_date);

CREATE UNIQUE INDEX uq_employee_goals_employee_year_category ON public.employee_goals USING btree (employee_id, goal_year, goal_category);

CREATE UNIQUE INDEX uq_employee_learning_employee_course ON public.employee_learning USING btree (employee_id, course_id);

CREATE INDEX idx_employee_learning_status ON public.employee_learning USING btree (learning_status);

CREATE INDEX idx_employee_learning_completion_date ON public.employee_learning USING btree (completion_date);

CREATE UNIQUE INDEX uq_employee_movements_employee_date_type ON public.employee_movements USING btree (employee_id, movement_date, movement_type);

CREATE INDEX idx_employee_movements_date ON public.employee_movements USING btree (movement_date);

CREATE INDEX idx_employee_skills_skill ON public.employee_skills USING btree (skill_id);

CREATE INDEX idx_employee_snapshots_employee ON public.employee_snapshots USING btree (employee_id);

CREATE INDEX idx_es_dashboard_org ON public.employee_snapshots USING btree (snapshot_date, org_unit_id);

CREATE INDEX idx_es_dashboard_level ON public.employee_snapshots USING btree (snapshot_date, job_level_id);

CREATE INDEX idx_es_dashboard_location ON public.employee_snapshots USING btree (snapshot_date, location_id);

CREATE INDEX idx_employees_org ON public.employees USING btree (current_org_unit_id);

CREATE INDEX idx_employees_manager ON public.employees USING btree (manager_employee_id);

CREATE INDEX idx_employees_location ON public.employees USING btree (home_location_id);

CREATE UNIQUE INDEX uq_hires_requisition ON public.hires USING btree (requisition_id);

CREATE INDEX idx_hires_start_date ON public.hires USING btree (start_date);

CREATE UNIQUE INDEX uq_internal_job_application_employee_req ON public.internal_job_applications USING btree (employee_id, requisition_id);

CREATE INDEX idx_labor_cost_month ON public.labor_costs USING btree (effective_month);

CREATE INDEX idx_locations_country ON public.locations USING btree (country_code, location_id);

CREATE UNIQUE INDEX uq_offers_application ON public.offers USING btree (application_id);

CREATE INDEX idx_offers_status ON public.offers USING btree (offer_status);

CREATE INDEX idx_onet_essential_skills_occupation ON public.onet_essential_skills USING btree (onetsoc_code);

CREATE INDEX idx_onet_essential_skills_element ON public.onet_essential_skills USING btree (element_id);

CREATE INDEX idx_onet_software_skills_occupation ON public.onet_software_skills USING btree (onetsoc_code);

CREATE INDEX idx_onet_software_skills_hot ON public.onet_software_skills USING btree (hot_technology);

CREATE INDEX idx_onet_software_skills_demand ON public.onet_software_skills USING btree (in_demand);

CREATE INDEX idx_org_units_parent ON public.org_units USING btree (parent_org_unit_id);

CREATE UNIQUE INDEX uq_pay_adjustments_employee_date_type ON public.pay_adjustments USING btree (employee_id, adjustment_date, adjustment_type);

CREATE INDEX idx_performance_reviews_employee ON public.performance_reviews USING btree (employee_id);

CREATE UNIQUE INDEX uq_position_plan_dimensions_v2 ON public.position_plans USING btree (workforce_scenario_id, planning_month, org_unit_id, cost_center_id, job_profile_id, job_level_id, location_id);

CREATE INDEX idx_position_plans_scenario ON public.position_plans USING btree (workforce_scenario_id);

CREATE INDEX idx_position_plans_org ON public.position_plans USING btree (org_unit_id);

CREATE INDEX idx_position_plans_job_profile ON public.position_plans USING btree (job_profile_id);

CREATE INDEX idx_position_plans_month ON public.position_plans USING btree (planning_month);

CREATE INDEX idx_position_plans_modeling ON public.position_plans USING btree (workforce_scenario_id, planning_month, org_unit_id, job_level_id);

CREATE INDEX idx_position_snapshots_date ON public.position_snapshots USING btree (snapshot_date);

CREATE UNIQUE INDEX positions_unique_incumbent ON public.positions USING btree (incumbent_employee_id) WHERE (incumbent_employee_id IS NOT NULL);

CREATE INDEX idx_positions_org ON public.positions USING btree (org_unit_id);

CREATE INDEX idx_positions_job_profile ON public.positions USING btree (job_profile_id);

CREATE INDEX idx_positions_status ON public.positions USING btree (position_status);

CREATE INDEX idx_positions_dashboard ON public.positions USING btree (position_status, org_unit_id, job_level_id, location_id);

CREATE INDEX idx_positions_modeling ON public.positions USING btree (position_status, org_unit_id, job_level_id);

CREATE UNIQUE INDEX uq_recruiters_recruiter_code ON public.recruiters USING btree (recruiter_code);

CREATE INDEX idx_requisitions_status ON public.requisitions USING btree (requisition_status);

CREATE INDEX idx_requisitions_opened_date ON public.requisitions USING btree (opened_date);

CREATE INDEX idx_requisitions_job_profile ON public.requisitions USING btree (job_profile_id);

CREATE INDEX idx_requisitions_recruiter ON public.requisitions USING btree (recruiter_id);

CREATE UNIQUE INDEX uq_scenario_assumption_name ON public.scenario_assumptions USING btree (workforce_scenario_id, assumption_name);

CREATE INDEX idx_separations_dashboard ON public.separations USING btree (separation_date, separation_type, employee_id);

CREATE UNIQUE INDEX uq_succession_plan_position_date ON public.succession_plans USING btree (position_id, assessment_date);

CREATE INDEX idx_succession_plans_position ON public.succession_plans USING btree (position_id);

CREATE UNIQUE INDEX uq_successor_candidate_plan_employee ON public.successor_candidates USING btree (succession_plan_id, employee_id);

CREATE INDEX idx_survey_responses_employee ON public.survey_responses USING btree (employee_id);

CREATE INDEX idx_survey_responses_survey ON public.survey_responses USING btree (survey_id);

CREATE UNIQUE INDEX uq_survey_responses_response_key ON public.survey_responses USING btree (response_key);

CREATE INDEX idx_survey_responses_response_date ON public.survey_responses USING btree (response_date);

CREATE UNIQUE INDEX uq_survey_scores_score_key ON public.survey_scores USING btree (score_key);

CREATE INDEX idx_survey_scores_dimension ON public.survey_scores USING btree (dimension);

CREATE INDEX idx_survey_scores_org ON public.survey_scores USING btree (org_unit_id);

CREATE UNIQUE INDEX uq_talent_rating_employee_date ON public.talent_ratings USING btree (employee_id, assessment_date);

CREATE INDEX idx_talent_ratings_employee ON public.talent_ratings USING btree (employee_id);

CREATE INDEX idx_talent_ratings_segment ON public.talent_ratings USING btree (talent_segment);

CREATE INDEX idx_talent_ratings_flight_risk ON public.talent_ratings USING btree (flight_risk);

CREATE UNIQUE INDEX uq_workforce_budget_year_org_costcenter ON public.workforce_budgets USING btree (fiscal_year, org_unit_id, cost_center_id);

CREATE UNIQUE INDEX uq_workforce_plan_name_year_version ON public.workforce_plans USING btree (plan_name, plan_year, plan_version);

CREATE UNIQUE INDEX uq_workforce_scenario_plan_name ON public.workforce_scenarios USING btree (workforce_plan_id, scenario_name);

CREATE VIEW public."ai_upskilling_pipeline" AS  SELECT ou.org_code,
    ou.org_name,
    count(DISTINCT el.employee_id) AS employees_in_ai_learning,
    count(DISTINCT el.employee_id) FILTER (WHERE el.learning_status = 'Completed'::text) AS ai_learning_completers,
    count(DISTINCT ec.employee_id) AS ai_certified_employees,
    round(count(DISTINCT el.employee_id) FILTER (WHERE el.learning_status = 'Completed'::text)::numeric / NULLIF(count(DISTINCT el.employee_id), 0)::numeric * 100::numeric, 2) AS ai_learning_completion_rate_pct
   FROM employee_learning el
     JOIN employees e ON e.employee_id = el.employee_id
     JOIN org_units ou ON ou.org_unit_id = e.current_org_unit_id
     JOIN learning_courses lc ON lc.course_id = el.course_id
     JOIN skills s ON s.skill_id = lc.skill_id
     LEFT JOIN employee_certifications ec ON ec.employee_id = el.employee_id
     LEFT JOIN certifications cert ON cert.certification_id = ec.certification_id
  WHERE s.skill_category = 'AI'::text
  GROUP BY ou.org_code, ou.org_name;

CREATE VIEW public."attrition_business_unit_summary" WITH (security_invoker=true) AS  WITH sep_snap AS (
         SELECT s.separation_id,
            s.separation_type,
            s.regrettable,
            es.org_unit_id
           FROM separations s
             LEFT JOIN LATERAL ( SELECT es_1.org_unit_id
                   FROM employee_snapshots es_1
                  WHERE es_1.employee_id = s.employee_id AND es_1.snapshot_date <= s.separation_date
                  ORDER BY es_1.snapshot_date DESC
                 LIMIT 1) es ON true
          WHERE s.separation_date >= '2026-01-01'::date AND s.separation_date <= '2026-09-30'::date
        ), org_map AS (
         SELECT child.org_unit_id,
                CASE
                    WHEN child.org_type = 'business_unit'::text THEN child.org_code
                    ELSE parent.org_code
                END AS org_code,
                CASE
                    WHEN child.org_type = 'business_unit'::text THEN child.org_name
                    ELSE parent.org_name
                END AS org_name
           FROM org_units child
             LEFT JOIN org_units parent ON parent.org_unit_id = child.parent_org_unit_id
        ), avg_hc AS (
         SELECT x.org_code,
            avg(x.month_hc) AS avg_headcount
           FROM ( SELECT es.snapshot_date,
                    om_1.org_code,
                    count(DISTINCT es.employee_id)::numeric AS month_hc
                   FROM employee_snapshots es
                     JOIN org_map om_1 ON om_1.org_unit_id = es.org_unit_id
                  WHERE es.snapshot_date >= '2026-01-31'::date AND es.snapshot_date <= '2026-09-30'::date AND om_1.org_code IS NOT NULL
                  GROUP BY es.snapshot_date, om_1.org_code) x
          GROUP BY x.org_code
        )
 SELECT om.org_code,
    om.org_name,
    count(*)::integer AS exits,
    count(*) FILTER (WHERE ss.separation_type = 'voluntary'::text)::integer AS voluntary_exits,
    count(*) FILTER (WHERE ss.regrettable)::integer AS regrettable_exits,
    round(100.0 * count(*) FILTER (WHERE ss.separation_type = 'voluntary'::text)::numeric / NULLIF(ah.avg_headcount, 0::numeric), 1) AS voluntary_turnover_ytd_pct
   FROM sep_snap ss
     JOIN org_map om ON om.org_unit_id = ss.org_unit_id
     LEFT JOIN avg_hc ah ON ah.org_code = om.org_code
  WHERE om.org_code IS NOT NULL
  GROUP BY om.org_code, om.org_name, ah.avg_headcount;

CREATE VIEW public."attrition_current_summary" WITH (security_invoker=true) AS  WITH monthly_hc AS (
         SELECT employee_snapshots.snapshot_date,
            count(DISTINCT employee_snapshots.employee_id)::numeric AS headcount
           FROM employee_snapshots
          WHERE employee_snapshots.snapshot_date >= '2026-01-31'::date AND employee_snapshots.snapshot_date <= '2026-09-30'::date
          GROUP BY employee_snapshots.snapshot_date
        ), avg_hc AS (
         SELECT avg(monthly_hc.headcount) AS avg_headcount
           FROM monthly_hc
        ), ytd AS (
         SELECT count(*)::numeric AS total_exits,
            count(*) FILTER (WHERE separations.separation_type = 'voluntary'::text)::numeric AS voluntary_exits,
            count(*) FILTER (WHERE separations.separation_type = 'involuntary'::text)::numeric AS involuntary_exits,
            count(*) FILTER (WHERE separations.regrettable)::numeric AS regrettable_exits,
            count(*) FILTER (WHERE separations.retirement_flag)::numeric AS retirements
           FROM separations
          WHERE separations.separation_date >= '2026-01-01'::date AND separations.separation_date <= '2026-09-30'::date
        )
 SELECT '2026-09-30'::date AS as_of,
    ytd.total_exits::integer AS total_exits,
    ytd.voluntary_exits::integer AS voluntary_exits,
    ytd.involuntary_exits::integer AS involuntary_exits,
    ytd.regrettable_exits::integer AS regrettable_exits,
    ytd.retirements::integer AS retirements,
    round(100::numeric * ytd.total_exits / NULLIF(avg_hc.avg_headcount, 0::numeric), 1) AS total_turnover_ytd_pct,
    round(100::numeric * ytd.voluntary_exits / NULLIF(avg_hc.avg_headcount, 0::numeric), 1) AS voluntary_turnover_ytd_pct,
    round(100::numeric * ytd.voluntary_exits / NULLIF(avg_hc.avg_headcount, 0::numeric) * (12.0 / 9.0), 1) AS annualized_voluntary_turnover_pct,
    round(100::numeric * ytd.regrettable_exits / NULLIF(ytd.voluntary_exits, 0::numeric), 1) AS regrettable_share_of_voluntary_pct
   FROM ytd
     CROSS JOIN avg_hc;

CREATE VIEW public."attrition_level_summary" WITH (security_invoker=true) AS  WITH sep_snap AS (
         SELECT s.separation_id,
            s.separation_type,
            s.regrettable,
            es.job_level_id
           FROM separations s
             LEFT JOIN LATERAL ( SELECT es_1.job_level_id
                   FROM employee_snapshots es_1
                  WHERE es_1.employee_id = s.employee_id AND es_1.snapshot_date <= s.separation_date
                  ORDER BY es_1.snapshot_date DESC
                 LIMIT 1) es ON true
          WHERE s.separation_date >= '2026-01-01'::date AND s.separation_date <= '2026-09-30'::date
        )
 SELECT jl.level_code,
    jl.level_name,
    jl.level_rank,
    count(*)::integer AS exits,
    count(*) FILTER (WHERE ss.separation_type = 'voluntary'::text)::integer AS voluntary_exits,
    count(*) FILTER (WHERE ss.regrettable)::integer AS regrettable_exits
   FROM sep_snap ss
     JOIN job_levels jl ON jl.job_level_id = ss.job_level_id
  GROUP BY jl.level_code, jl.level_name, jl.level_rank;

CREATE VIEW public."attrition_monthly_trend" WITH (security_invoker=true) AS  WITH sep AS (
         SELECT date_trunc('month'::text, separations.separation_date::timestamp with time zone)::date AS month,
            count(*)::numeric AS total_exits,
            count(*) FILTER (WHERE separations.separation_type = 'voluntary'::text)::numeric AS voluntary_exits,
            count(*) FILTER (WHERE separations.separation_type = 'involuntary'::text)::numeric AS involuntary_exits,
            count(*) FILTER (WHERE separations.regrettable)::numeric AS regrettable_exits
           FROM separations
          WHERE separations.separation_date >= '2024-01-01'::date
          GROUP BY (date_trunc('month'::text, separations.separation_date::timestamp with time zone)::date)
        ), hc AS (
         SELECT date_trunc('month'::text, employee_snapshots.snapshot_date::timestamp with time zone)::date AS month,
            count(DISTINCT employee_snapshots.employee_id)::numeric AS headcount
           FROM employee_snapshots
          GROUP BY (date_trunc('month'::text, employee_snapshots.snapshot_date::timestamp with time zone)::date)
        )
 SELECT hc.month,
    COALESCE(sep.total_exits, 0::numeric)::integer AS total_exits,
    COALESCE(sep.voluntary_exits, 0::numeric)::integer AS voluntary_exits,
    COALESCE(sep.involuntary_exits, 0::numeric)::integer AS involuntary_exits,
    COALESCE(sep.regrettable_exits, 0::numeric)::integer AS regrettable_exits,
    round(100::numeric * COALESCE(sep.total_exits, 0::numeric) / NULLIF(hc.headcount, 0::numeric), 2) AS monthly_turnover_pct,
    round(100::numeric * COALESCE(sep.voluntary_exits, 0::numeric) / NULLIF(hc.headcount, 0::numeric), 2) AS monthly_voluntary_turnover_pct
   FROM hc
     LEFT JOIN sep USING (month)
  ORDER BY hc.month;

CREATE VIEW public."attrition_reason_summary" WITH (security_invoker=true) AS  SELECT separation_reason,
    separation_type,
    count(*)::integer AS exits,
    round(100.0 * count(*)::numeric / sum(count(*)) OVER (), 1) AS pct_of_exits
   FROM separations
  WHERE separation_date >= '2026-01-01'::date AND separation_date <= '2026-09-30'::date
  GROUP BY separation_reason, separation_type;

CREATE VIEW public."attrition_tenure_summary" WITH (security_invoker=true) AS  SELECT
        CASE
            WHEN (s.separation_date - e.hire_date) < 365 THEN '<1 year'::text
            WHEN (s.separation_date - e.hire_date) < 1096 THEN '1-2 years'::text
            WHEN (s.separation_date - e.hire_date) < 1826 THEN '3-4 years'::text
            WHEN (s.separation_date - e.hire_date) < 3653 THEN '5-9 years'::text
            ELSE '10+ years'::text
        END AS tenure_band,
        CASE
            WHEN (s.separation_date - e.hire_date) < 365 THEN 1
            WHEN (s.separation_date - e.hire_date) < 1096 THEN 2
            WHEN (s.separation_date - e.hire_date) < 1826 THEN 3
            WHEN (s.separation_date - e.hire_date) < 3653 THEN 4
            ELSE 5
        END AS tenure_sort,
    count(*)::integer AS exits,
    count(*) FILTER (WHERE s.separation_type = 'voluntary'::text)::integer AS voluntary_exits,
    count(*) FILTER (WHERE s.regrettable)::integer AS regrettable_exits
   FROM separations s
     JOIN employees e ON e.employee_id = s.employee_id
  WHERE s.separation_date >= '2026-01-01'::date AND s.separation_date <= '2026-09-30'::date
  GROUP BY (
        CASE
            WHEN (s.separation_date - e.hire_date) < 365 THEN '<1 year'::text
            WHEN (s.separation_date - e.hire_date) < 1096 THEN '1-2 years'::text
            WHEN (s.separation_date - e.hire_date) < 1826 THEN '3-4 years'::text
            WHEN (s.separation_date - e.hire_date) < 3653 THEN '5-9 years'::text
            ELSE '10+ years'::text
        END), (
        CASE
            WHEN (s.separation_date - e.hire_date) < 365 THEN 1
            WHEN (s.separation_date - e.hire_date) < 1096 THEN 2
            WHEN (s.separation_date - e.hire_date) < 1826 THEN 3
            WHEN (s.separation_date - e.hire_date) < 3653 THEN 4
            ELSE 5
        END);

CREATE VIEW public."candidate_experience_summary" AS  SELECT jf.family_code,
    jf.family_name,
    sq.dimension,
    count(DISTINCT sr.candidate_id) AS respondents,
    round(avg(sr.numeric_response), 2) AS average_score,
    round(count(*) FILTER (WHERE sr.numeric_response >= 4::numeric)::numeric / NULLIF(count(sr.numeric_response), 0)::numeric * 100::numeric, 2) AS favorable_pct
   FROM survey_responses sr
     JOIN surveys s ON s.survey_id = sr.survey_id
     JOIN survey_questions sq ON sq.survey_question_id = sr.survey_question_id
     JOIN candidates c ON c.candidate_id = sr.candidate_id
     JOIN applications a ON a.candidate_id = c.candidate_id
     JOIN requisitions r ON r.requisition_id = a.requisition_id
     JOIN job_profiles jp ON jp.job_profile_id = r.job_profile_id
     JOIN job_families jf ON jf.job_family_id = jp.job_family_id
  WHERE s.survey_type = 'candidate_experience'::text AND sr.numeric_response IS NOT NULL
  GROUP BY jf.family_code, jf.family_name, sq.dimension;

CREATE VIEW public."certification_summary" AS  SELECT cert.certification_code,
    cert.certification_name,
    cert.issuing_organization,
    s.skill_code,
    s.skill_name,
    s.skill_category,
    count(DISTINCT ec.employee_id) AS certified_employees
   FROM employee_certifications ec
     JOIN certifications cert ON cert.certification_id = ec.certification_id
     LEFT JOIN skills s ON s.skill_id = cert.skill_id
  GROUP BY cert.certification_code, cert.certification_name, cert.issuing_organization, s.skill_code, s.skill_name, s.skill_category;

CREATE VIEW public."current_employee_skill_gaps" AS  SELECT e.employee_id,
    e.employee_number,
    e.current_org_unit_id,
    p.position_id,
    p.position_title,
    jp.job_profile_id,
    jp.job_profile_code,
    jp.job_profile_name,
    jf.job_family_id,
    jf.family_code,
    jf.family_name,
    s.skill_id,
    s.skill_code,
    s.skill_name,
    s.skill_category,
    jsr.required_proficiency,
    es.proficiency AS employee_proficiency,
    GREATEST(jsr.required_proficiency - COALESCE(es.proficiency::integer, 0), 0) AS proficiency_gap,
        CASE
            WHEN es.proficiency IS NULL THEN 'missing'::text
            WHEN es.proficiency < jsr.required_proficiency THEN 'gap'::text
            WHEN es.proficiency = jsr.required_proficiency THEN 'meets'::text
            ELSE 'exceeds'::text
        END AS skill_status,
    jsr.importance,
    jsr.weight,
    es.assessment_source,
    es.confidence,
    es.last_validated_date
   FROM employees e
     JOIN positions p ON p.incumbent_employee_id = e.employee_id
     JOIN job_profiles jp ON jp.job_profile_id = p.job_profile_id
     JOIN job_families jf ON jf.job_family_id = jp.job_family_id
     JOIN job_skill_requirements jsr ON jsr.job_profile_id = jp.job_profile_id
     JOIN skills s ON s.skill_id = jsr.skill_id
     LEFT JOIN employee_skills es ON es.employee_id = e.employee_id AND es.skill_id = jsr.skill_id
  WHERE e.employment_status = 'active'::text;

CREATE VIEW public."dashboard_headcount_trend" AS  SELECT snapshot_date,
    count(DISTINCT employee_id)::integer AS headcount,
    round(sum(fte), 1) AS fte
   FROM employee_snapshots
  GROUP BY snapshot_date
  ORDER BY snapshot_date;

CREATE VIEW public."dashboard_overview_current" AS  WITH current_snapshot AS (
         SELECT count(DISTINCT employee_snapshots.employee_id)::integer AS headcount,
            round(sum(employee_snapshots.fte), 1) AS fte,
            round(sum(employee_snapshots.total_labor_cost_usd), 2) AS labor_cost_usd
           FROM employee_snapshots
          WHERE employee_snapshots.snapshot_date = '2026-09-30'::date
        ), monthly_headcount AS (
         SELECT employee_snapshots.snapshot_date,
            count(DISTINCT employee_snapshots.employee_id)::numeric AS headcount
           FROM employee_snapshots
          WHERE employee_snapshots.snapshot_date >= '2026-01-31'::date AND employee_snapshots.snapshot_date <= '2026-09-30'::date
          GROUP BY employee_snapshots.snapshot_date
        ), average_headcount AS (
         SELECT avg(monthly_headcount.headcount) AS avg_headcount
           FROM monthly_headcount
        ), voluntary_separations AS (
         SELECT count(*)::numeric AS separations
           FROM separations
          WHERE separations.separation_date >= '2026-01-01'::date AND separations.separation_date <= '2026-09-30'::date AND separations.separation_type = 'voluntary'::text
        ), open_positions AS (
         SELECT count(*)::integer AS open_positions
           FROM positions
          WHERE positions.position_status = 'vacant'::text
        )
 SELECT '2026-09-30'::date AS snapshot_date,
    cs.headcount,
    cs.fte,
    round(vs.separations / NULLIF(ah.avg_headcount, 0::numeric) * 100::numeric, 1) AS voluntary_turnover_ytd_pct,
    cs.labor_cost_usd,
    op.open_positions
   FROM current_snapshot cs
     CROSS JOIN average_headcount ah
     CROSS JOIN voluntary_separations vs
     CROSS JOIN open_positions op;

CREATE VIEW public."employee_listening_trends" AS  SELECT s.survey_code,
    s.survey_name,
    s.survey_type,
    EXTRACT(year FROM s.close_date)::integer AS survey_year,
    sq.dimension,
    count(DISTINCT sr.employee_id) AS respondents,
    round(avg(sr.numeric_response), 2) AS average_score,
    round(count(*) FILTER (WHERE sr.numeric_response >= 4::numeric)::numeric / NULLIF(count(sr.numeric_response), 0)::numeric * 100::numeric, 2) AS favorable_pct
   FROM survey_responses sr
     JOIN surveys s ON s.survey_id = sr.survey_id
     JOIN survey_questions sq ON sq.survey_question_id = sr.survey_question_id
  WHERE sr.employee_id IS NOT NULL AND sr.numeric_response IS NOT NULL
  GROUP BY s.survey_code, s.survey_name, s.survey_type, (EXTRACT(year FROM s.close_date)::integer), sq.dimension;

CREATE VIEW public."employee_skill_latest" AS  SELECT DISTINCT ON (employee_id, skill_id) employee_id,
    skill_id,
    proficiency,
    assessment_source,
    confidence,
    last_validated_date,
    created_at
   FROM employee_skills
  ORDER BY employee_id, skill_id, last_validated_date DESC NULLS LAST, created_at DESC;

CREATE VIEW public."exit_survey_summary" AS  SELECT sr.response_category AS primary_reason,
    count(DISTINCT sr.employee_id) AS exits,
    round(count(DISTINCT sr.employee_id)::numeric / NULLIF(sum(count(DISTINCT sr.employee_id)) OVER (), 0::numeric) * 100::numeric, 2) AS pct_of_exit_responses
   FROM survey_responses sr
     JOIN surveys s ON s.survey_id = sr.survey_id
     JOIN survey_questions sq ON sq.survey_question_id = sr.survey_question_id
  WHERE s.survey_type = 'exit'::text AND sq.question_code = 'PRIMARY_REASON'::text
  GROUP BY sr.response_category;

CREATE VIEW public."finance_current_summary" AS  WITH vacancy_counts AS (
         SELECT positions.org_unit_id,
            count(*) FILTER (WHERE positions.position_status = 'vacant'::text)::integer AS vacant_positions
           FROM positions
          GROUP BY positions.org_unit_id
        )
 SELECT ou.org_unit_id,
    ou.org_code,
    ou.org_name,
    ou.org_type,
    count(*)::integer AS headcount,
    round(sum(es.fte), 1) AS fte,
    round(sum(es.total_labor_cost_usd), 2) AS labor_cost_usd,
    round(sum(es.total_labor_cost_usd) / NULLIF(sum(es.fte), 0::numeric), 2) AS cost_per_fte_usd,
    COALESCE(vc.vacant_positions, 0) AS vacant_positions,
    round(sum(es.total_labor_cost_usd) / NULLIF(sum(es.fte), 0::numeric) * COALESCE(vc.vacant_positions, 0)::numeric, 2) AS estimated_vacancy_cost_exposure_usd
   FROM employee_snapshots es
     JOIN org_units ou ON ou.org_unit_id = es.org_unit_id
     LEFT JOIN vacancy_counts vc ON vc.org_unit_id = es.org_unit_id
  WHERE es.snapshot_date = '2026-09-30'::date
  GROUP BY ou.org_unit_id, ou.org_code, ou.org_name, ou.org_type, vc.vacant_positions;

CREATE VIEW public."job_onet_essential_skills" AS  SELECT jp.job_profile_code,
    jp.job_profile_name,
    jf.family_code,
    jf.family_name,
    oo.onetsoc_code,
    oo.occupation_title AS onet_occupation,
    es.element_id,
    es.element_name AS essential_skill,
    es.scale_id,
    es.scale_name,
    es.data_value,
    es.date_updated
   FROM job_onet_mapping m
     JOIN job_profiles jp ON jp.job_profile_id = m.job_profile_id
     JOIN job_families jf ON jf.job_family_id = jp.job_family_id
     JOIN onet_occupations oo ON oo.onetsoc_code = m.onetsoc_code
     JOIN onet_essential_skills es ON es.onetsoc_code = m.onetsoc_code;

CREATE VIEW public."job_onet_intelligence" AS  SELECT jp.job_profile_code,
    jp.job_profile_name,
    jf.family_code,
    jf.family_name,
    jfunc.function_code,
    jfunc.function_name,
    m.onetsoc_code,
    oo.occupation_title AS onet_occupation,
    oo.occupation_description AS onet_description,
    m.mapping_confidence,
    oo.onet_release
   FROM job_profiles jp
     JOIN job_families jf ON jf.job_family_id = jp.job_family_id
     JOIN job_functions jfunc ON jfunc.job_function_id = jf.job_function_id
     LEFT JOIN job_onet_mapping m ON m.job_profile_id = jp.job_profile_id
     LEFT JOIN onet_occupations oo ON oo.onetsoc_code = m.onetsoc_code;

CREATE VIEW public."job_onet_software_skills" AS  SELECT jp.job_profile_code,
    jp.job_profile_name,
    jf.family_code,
    jf.family_name,
    oo.onetsoc_code,
    oo.occupation_title AS onet_occupation,
    ss.workplace_example AS software_skill,
    ss.element_name AS software_category,
    ss.hot_technology,
    ss.in_demand
   FROM job_onet_mapping m
     JOIN job_profiles jp ON jp.job_profile_id = m.job_profile_id
     JOIN job_families jf ON jf.job_family_id = jp.job_family_id
     JOIN onet_occupations oo ON oo.onetsoc_code = m.onetsoc_code
     JOIN onet_software_skills ss ON ss.onetsoc_code = m.onetsoc_code;

CREATE VIEW public."learning_by_org" AS  SELECT ou.org_code,
    ou.org_name,
    s.skill_category,
    s.skill_code,
    s.skill_name,
    count(DISTINCT el.employee_id) AS learners,
    count(DISTINCT el.employee_id) FILTER (WHERE el.learning_status = 'Completed'::text) AS completers,
    round(avg(el.assessment_score) FILTER (WHERE el.assessment_score IS NOT NULL), 2) AS avg_score
   FROM employee_learning el
     JOIN employees e ON e.employee_id = el.employee_id
     JOIN org_units ou ON ou.org_unit_id = e.current_org_unit_id
     JOIN learning_courses lc ON lc.course_id = el.course_id
     JOIN skills s ON s.skill_id = lc.skill_id
  GROUP BY ou.org_code, ou.org_name, s.skill_category, s.skill_code, s.skill_name;

CREATE VIEW public."learning_summary" AS  SELECT EXTRACT(year FROM el.enrollment_date)::integer AS learning_year,
    s.skill_category,
    s.skill_code,
    s.skill_name,
    count(*) AS enrollments,
    count(*) FILTER (WHERE el.learning_status = 'Completed'::text) AS completions,
    count(*) FILTER (WHERE el.learning_status = 'In Progress'::text) AS in_progress,
    count(*) FILTER (WHERE el.learning_status = 'Enrolled'::text) AS enrolled_not_started,
    round(count(*) FILTER (WHERE el.learning_status = 'Completed'::text)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS completion_rate_pct,
    round(avg(el.assessment_score) FILTER (WHERE el.assessment_score IS NOT NULL), 2) AS avg_assessment_score
   FROM employee_learning el
     JOIN learning_courses lc ON lc.course_id = el.course_id
     JOIN skills s ON s.skill_id = lc.skill_id
  GROUP BY (EXTRACT(year FROM el.enrollment_date)::integer), s.skill_category, s.skill_code, s.skill_name;

CREATE VIEW public."mobility_summary" AS  SELECT EXTRACT(year FROM movement_date)::integer AS movement_year,
    movement_type,
    count(*) AS movements,
    count(DISTINCT employee_id) AS employees_moved
   FROM employee_movements em
  GROUP BY (EXTRACT(year FROM movement_date)::integer), movement_type;

CREATE VIEW public."onboarding_summary" AS  SELECT s.survey_type,
    sq.dimension,
    count(DISTINCT sr.employee_id) AS respondents,
    round(avg(sr.numeric_response), 2) AS average_score,
    round(count(*) FILTER (WHERE sr.numeric_response >= 4::numeric)::numeric / NULLIF(count(sr.numeric_response), 0)::numeric * 100::numeric, 2) AS favorable_pct
   FROM survey_responses sr
     JOIN surveys s ON s.survey_id = sr.survey_id
     JOIN survey_questions sq ON sq.survey_question_id = sr.survey_question_id
  WHERE (s.survey_type = ANY (ARRAY['onboarding_30'::text, 'onboarding_60'::text, 'onboarding_90'::text])) AND sr.numeric_response IS NOT NULL
  GROUP BY s.survey_type, sq.dimension;

CREATE VIEW public."position_action_structural_inventory" WITH (security_invoker=true) AS  WITH live_requisition AS (
         SELECT r.position_id,
            bool_or(r.requisition_status = 'open'::text) AS has_open_requisition,
            bool_or(r.requisition_status = 'on_hold'::text) AS has_on_hold_requisition
           FROM requisitions r
          WHERE r.closed_date IS NULL AND (r.requisition_status = ANY (ARRAY['open'::text, 'on_hold'::text])) AND r.position_id IS NOT NULL
          GROUP BY r.position_id
        ), current_inventory AS (
         SELECT p.org_unit_id,
            p.job_level_id,
            p.job_profile_id,
            count(*) FILTER (WHERE p.position_status = 'filled'::text)::numeric AS filled_positions,
            count(*) FILTER (WHERE p.position_status = 'vacant'::text)::numeric AS vacant_positions,
            count(*) FILTER (WHERE p.position_status = ANY (ARRAY['filled'::text, 'vacant'::text]))::numeric AS current_positions,
            count(*) FILTER (WHERE p.position_status = 'vacant'::text AND COALESCE(lr.has_open_requisition, false))::numeric AS open_requisition_vacancies,
            count(*) FILTER (WHERE p.position_status = 'vacant'::text AND COALESCE(lr.has_on_hold_requisition, false))::numeric AS on_hold_requisition_vacancies
           FROM positions p
             LEFT JOIN live_requisition lr ON lr.position_id = p.position_id
          WHERE p.position_status = ANY (ARRAY['filled'::text, 'vacant'::text])
          GROUP BY p.org_unit_id, p.job_level_id, p.job_profile_id
        ), cost_basis AS (
         SELECT pp.org_unit_id,
            pp.job_level_id,
            pp.job_profile_id,
            sum(pp.planned_headcount) AS planned_headcount,
            sum(pp.planned_labor_cost_usd) AS planned_labor_cost_usd
           FROM position_plans pp
             JOIN workforce_scenarios ws ON ws.workforce_scenario_id = pp.workforce_scenario_id
          WHERE ws.scenario_name = 'Baseline'::text AND pp.planning_month = '2027-12-01'::date
          GROUP BY pp.org_unit_id, pp.job_level_id, pp.job_profile_id
        )
 SELECT ou.org_code,
    ou.org_name,
    jl.level_code,
    jl.level_name,
    jl.level_rank,
    jp.job_profile_code,
    jp.job_profile_name,
    ci.current_positions,
    ci.filled_positions,
    ci.vacant_positions,
    cb.planned_headcount,
    cb.planned_labor_cost_usd,
    round(cb.planned_labor_cost_usd / NULLIF(cb.planned_headcount, 0::numeric), 2) AS annual_cost_per_position,
    ci.open_requisition_vacancies,
    ci.on_hold_requisition_vacancies,
    GREATEST(ci.vacant_positions - ci.open_requisition_vacancies - ci.on_hold_requisition_vacancies, 0::numeric) AS uncovered_vacancies
   FROM current_inventory ci
     JOIN cost_basis cb USING (org_unit_id, job_level_id, job_profile_id)
     JOIN org_units ou ON ou.org_unit_id = ci.org_unit_id
     JOIN job_levels jl ON jl.job_level_id = ci.job_level_id
     JOIN job_profiles jp ON jp.job_profile_id = ci.job_profile_id;

CREATE VIEW public."position_modeling_current_summary" AS  SELECT ou.org_unit_id,
    ou.org_code,
    ou.org_name,
    ou.org_type,
    jl.job_level_id,
    jl.level_code,
    jl.level_name,
    jl.level_rank,
    count(*) FILTER (WHERE p.position_status = ANY (ARRAY['filled'::text, 'vacant'::text]))::integer AS current_positions,
    count(*) FILTER (WHERE p.position_status = 'filled'::text)::integer AS filled_positions,
    count(*) FILTER (WHERE p.position_status = 'vacant'::text)::integer AS vacant_positions,
    count(*) FILTER (WHERE p.position_status = 'planned'::text)::integer AS planned_positions,
    count(*) FILTER (WHERE p.position_status = 'frozen'::text)::integer AS frozen_positions,
    count(*) FILTER (WHERE p.position_status = 'closed'::text)::integer AS closed_positions,
    round(count(*) FILTER (WHERE p.position_status = 'vacant'::text)::numeric / NULLIF(count(*) FILTER (WHERE p.position_status = ANY (ARRAY['filled'::text, 'vacant'::text])), 0)::numeric * 100::numeric, 1) AS vacancy_rate_pct
   FROM positions p
     JOIN org_units ou ON ou.org_unit_id = p.org_unit_id
     JOIN job_levels jl ON jl.job_level_id = p.job_level_id
  GROUP BY ou.org_unit_id, ou.org_code, ou.org_name, ou.org_type, jl.job_level_id, jl.level_code, jl.level_name, jl.level_rank;

CREATE VIEW public."position_modeling_scenario_summary" AS  SELECT ws.workforce_scenario_id,
    ws.scenario_name,
    ws.scenario_type,
    pp.planning_month,
    ou.org_unit_id,
    ou.org_code,
    ou.org_name,
    ou.org_type,
    jl.job_level_id,
    jl.level_code,
    jl.level_name,
    jl.level_rank,
    sum(pp.planned_headcount)::integer AS planned_positions,
    round(sum(pp.planned_fte), 1) AS planned_fte,
    sum(pp.planned_hires)::integer AS planned_hires,
    sum(pp.planned_exits)::integer AS planned_exits,
    round(sum(pp.planned_labor_cost), 2) AS planned_labor_cost_usd
   FROM position_plans pp
     JOIN workforce_scenarios ws ON ws.workforce_scenario_id = pp.workforce_scenario_id
     JOIN org_units ou ON ou.org_unit_id = pp.org_unit_id
     JOIN job_levels jl ON jl.job_level_id = pp.job_level_id
  GROUP BY ws.workforce_scenario_id, ws.scenario_name, ws.scenario_type, pp.planning_month, ou.org_unit_id, ou.org_code, ou.org_name, ou.org_type, jl.job_level_id, jl.level_code, jl.level_name, jl.level_rank;

CREATE VIEW public."position_skill_requirement_map" WITH (security_invoker=true) AS  SELECT jp.job_profile_code,
    jp.job_profile_name,
    s.skill_code,
    s.skill_name,
    s.skill_category,
    jsr.required_proficiency,
    jsr.importance,
    jsr.weight
   FROM job_skill_requirements jsr
     JOIN job_profiles jp ON jp.job_profile_id = jsr.job_profile_id
     JOIN skills s ON s.skill_id = jsr.skill_id
  WHERE jp.active = true AND s.active = true;

CREATE VIEW public."scenario_modeler_defaults" WITH (security_invoker=true) AS  WITH baseline AS (
         SELECT max(sa.assumption_value) FILTER (WHERE sa.assumption_name = 'Annual enterprise headcount growth'::text) AS annual_growth,
            max(sa.assumption_value) FILTER (WHERE sa.assumption_name = 'Annual labor cost inflation'::text) AS annual_labor_cost_inflation
           FROM workforce_scenarios ws
             JOIN scenario_assumptions sa ON sa.workforce_scenario_id = ws.workforce_scenario_id
          WHERE ws.scenario_name = 'Baseline'::text
        ), monthly_hc AS (
         SELECT employee_snapshots.snapshot_date,
            count(DISTINCT employee_snapshots.employee_id)::numeric AS headcount
           FROM employee_snapshots
          WHERE employee_snapshots.snapshot_date >= '2026-01-31'::date AND employee_snapshots.snapshot_date <= '2026-09-30'::date
          GROUP BY employee_snapshots.snapshot_date
        ), avg_hc AS (
         SELECT avg(monthly_hc.headcount) AS avg_headcount
           FROM monthly_hc
        ), ytd_exits AS (
         SELECT count(*)::numeric AS exits
           FROM separations
          WHERE separations.separation_date >= '2026-01-01'::date AND separations.separation_date <= '2026-09-30'::date
        )
 SELECT '2026-09-30'::date AS as_of,
    round(baseline.annual_growth * 100::numeric, 2) AS baseline_annual_growth_pct,
    round(baseline.annual_labor_cost_inflation * 100::numeric, 2) AS baseline_salary_inflation_pct,
    round(100.0 * ytd_exits.exits / NULLIF(avg_hc.avg_headcount, 0::numeric) * (12.0 / 9.0), 2) AS baseline_annual_attrition_pct,
    100.0 AS baseline_fill_rate_pct,
    0.0 AS baseline_productivity_hiring_reduction_pct
   FROM baseline
     CROSS JOIN avg_hc
     CROSS JOIN ytd_exits;

CREATE VIEW public."skill_gap_summary" AS  SELECT ou.org_unit_id,
    ou.org_code,
    ou.org_name,
    g.skill_id,
    g.skill_code,
    g.skill_name,
    g.skill_category,
    count(DISTINCT g.employee_id) AS employees_requiring_skill,
    count(DISTINCT g.employee_id) FILTER (WHERE g.skill_status = 'gap'::text) AS employees_with_gap,
    count(DISTINCT g.employee_id) FILTER (WHERE g.skill_status = 'missing'::text) AS employees_missing_skill,
    count(DISTINCT g.employee_id) FILTER (WHERE g.skill_status = ANY (ARRAY['meets'::text, 'exceeds'::text])) AS employees_meeting_requirement,
    round(avg(g.required_proficiency), 2) AS avg_required_proficiency,
    round(avg(g.employee_proficiency), 2) AS avg_current_proficiency,
    round(avg(g.proficiency_gap), 2) AS avg_proficiency_gap,
    round(count(*) FILTER (WHERE g.skill_status = ANY (ARRAY['gap'::text, 'missing'::text]))::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS gap_rate_pct
   FROM current_employee_skill_gaps g
     JOIN org_units ou ON ou.org_unit_id = g.current_org_unit_id
  GROUP BY ou.org_unit_id, ou.org_code, ou.org_name, g.skill_id, g.skill_code, g.skill_name, g.skill_category;

CREATE VIEW public."skills_current_demand" AS  SELECT s.skill_id,
    s.skill_code,
    s.skill_name,
    s.skill_category,
    count(DISTINCT snap.employee_id)::integer AS employees_in_roles_requiring_skill
   FROM skills s
     JOIN job_skill_requirements jsr ON jsr.skill_id = s.skill_id
     JOIN employee_snapshots snap ON snap.job_profile_id = jsr.job_profile_id
  WHERE snap.snapshot_date = '2026-09-30'::date AND s.active = true
  GROUP BY s.skill_id, s.skill_code, s.skill_name, s.skill_category;

CREATE VIEW public."skills_current_supply" AS  SELECT s.skill_id,
    s.skill_code,
    s.skill_name,
    s.skill_category,
    count(DISTINCT es.employee_id)::integer AS employees_with_skill
   FROM skills s
     LEFT JOIN employee_skills es ON es.skill_id = s.skill_id
     LEFT JOIN employee_snapshots snap ON snap.employee_id = es.employee_id AND snap.snapshot_date = '2026-09-30'::date
  WHERE s.active = true AND snap.employee_id IS NOT NULL
  GROUP BY s.skill_id, s.skill_code, s.skill_name, s.skill_category;

CREATE VIEW public."skills_gap_summary" AS  SELECT s.skill_id,
    s.skill_code,
    s.skill_name,
    s.skill_category,
    COALESCE(sup.employees_with_skill, 0) AS employees_with_skill,
    COALESCE(dem.employees_in_roles_requiring_skill, 0) AS employees_in_roles_requiring_skill,
    COALESCE(dem.employees_in_roles_requiring_skill, 0) - COALESCE(sup.employees_with_skill, 0) AS skill_gap,
    round(COALESCE(sup.employees_with_skill, 0)::numeric / NULLIF(dem.employees_in_roles_requiring_skill, 0)::numeric * 100::numeric, 1) AS coverage_pct
   FROM skills s
     LEFT JOIN skills_current_supply sup ON sup.skill_id = s.skill_id
     LEFT JOIN skills_current_demand dem ON dem.skill_id = s.skill_id
  WHERE s.active = true;

CREATE VIEW public."skills_proficiency_gap_summary" AS  WITH current_requirements AS (
         SELECT snap.employee_id,
            jsr.skill_id,
            jsr.required_proficiency,
            jsr.importance,
            jsr.weight
           FROM employee_snapshots snap
             JOIN job_skill_requirements jsr ON jsr.job_profile_id = snap.job_profile_id
          WHERE snap.snapshot_date = '2026-09-30'::date
        )
 SELECT s.skill_id,
    s.skill_code,
    s.skill_name,
    s.skill_category,
    count(DISTINCT cr.employee_id)::integer AS employees_in_roles_requiring_skill,
    count(DISTINCT cr.employee_id) FILTER (WHERE es.proficiency IS NOT NULL)::integer AS employees_with_observed_proficiency,
    count(DISTINCT cr.employee_id) FILTER (WHERE es.proficiency >= cr.required_proficiency)::integer AS employees_meeting_requirement,
    count(DISTINCT cr.employee_id) FILTER (WHERE es.proficiency IS NULL OR es.proficiency < cr.required_proficiency)::integer AS employees_below_or_missing_requirement,
    round(avg(cr.required_proficiency::numeric), 2) AS avg_required_proficiency,
    round(avg(es.proficiency::numeric) FILTER (WHERE es.proficiency IS NOT NULL), 2) AS avg_observed_proficiency,
    round(avg(GREATEST(cr.required_proficiency - COALESCE(es.proficiency::integer, 0), 0)::numeric), 2) AS avg_proficiency_gap,
    round(count(DISTINCT cr.employee_id) FILTER (WHERE es.proficiency IS NOT NULL)::numeric / NULLIF(count(DISTINCT cr.employee_id), 0)::numeric * 100::numeric, 1) AS profile_coverage_pct,
    round(count(DISTINCT cr.employee_id) FILTER (WHERE es.proficiency >= cr.required_proficiency)::numeric / NULLIF(count(DISTINCT cr.employee_id), 0)::numeric * 100::numeric, 1) AS requirement_met_pct,
    round(avg(COALESCE(cr.weight, 1::numeric)), 2) AS avg_requirement_weight
   FROM skills s
     JOIN current_requirements cr ON cr.skill_id = s.skill_id
     LEFT JOIN employee_skill_latest es ON es.employee_id = cr.employee_id AND es.skill_id = cr.skill_id
  WHERE s.active = true
  GROUP BY s.skill_id, s.skill_code, s.skill_name, s.skill_category;

CREATE VIEW public."succession_coverage" AS  SELECT sp.succession_plan_id,
    p.position_id,
    p.position_title,
    jp.job_profile_code,
    jp.job_profile_name,
    cr.criticality_level,
    cr.scarcity_level,
    sp.succession_risk,
    count(sc.successor_candidate_id) AS successor_count,
    count(sc.successor_candidate_id) FILTER (WHERE sc.readiness = 'ready_now'::text) AS ready_now_count,
    count(sc.successor_candidate_id) FILTER (WHERE sc.readiness = 'ready_1_2_years'::text) AS ready_1_2_years_count,
    count(sc.successor_candidate_id) FILTER (WHERE sc.readiness = 'ready_3_plus_years'::text) AS ready_3_plus_years_count
   FROM succession_plans sp
     JOIN positions p ON p.position_id = sp.position_id
     JOIN job_profiles jp ON jp.job_profile_id = p.job_profile_id
     LEFT JOIN critical_roles cr ON cr.job_profile_id = jp.job_profile_id
     LEFT JOIN successor_candidates sc ON sc.succession_plan_id = sp.succession_plan_id
  GROUP BY sp.succession_plan_id, p.position_id, p.position_title, jp.job_profile_code, jp.job_profile_name, cr.criticality_level, cr.scarcity_level, sp.succession_risk;

CREATE VIEW public."succession_coverage_public_summary_v1" WITH (security_invoker=false,security_barrier=true) AS  WITH active_critical_profiles AS (
         SELECT cr.job_profile_id
           FROM critical_roles cr
          GROUP BY cr.job_profile_id
         HAVING bool_or(cr.active)
        ), relevant_positions AS (
         SELECT p.position_id,
            p.job_profile_id,
            p.incumbent_employee_id,
            p.position_status,
            p.source_system
           FROM positions p
          WHERE (p.job_profile_id IN ( SELECT cr.job_profile_id
                   FROM critical_roles cr)) OR (p.position_id IN ( SELECT sp.position_id
                   FROM succession_plans sp))
        ), filled_critical_positions AS (
         SELECT p.position_id,
            p.job_profile_id,
            p.incumbent_employee_id,
            p.position_status,
            p.source_system
           FROM positions p
             JOIN active_critical_profiles acp ON acp.job_profile_id = p.job_profile_id
          WHERE p.position_status = 'filled'::text
        ), plan_base AS (
         SELECT sp.succession_plan_id,
            sp.position_id,
            sp.assessment_date
           FROM succession_plans sp
        ), plan_status AS (
         SELECT sp.succession_plan_id,
            sp.position_id,
            sp.assessment_date,
            (EXISTS ( SELECT 1
                   FROM successor_candidates sc
                  WHERE sc.succession_plan_id = sp.succession_plan_id AND sc.readiness = 'ready_now'::text)) AS has_ready_now
           FROM plan_base sp
        ), counts AS (
         SELECT ( SELECT count(*)::integer AS count
                   FROM active_critical_profiles) AS critical_job_profiles,
            ( SELECT count(*)::integer AS count
                   FROM filled_critical_positions) AS filled_positions,
            ( SELECT count(*)::integer AS count
                   FROM plan_base sp
                     JOIN filled_critical_positions f ON f.position_id = sp.position_id) AS planned_positions,
            ( SELECT count(*)::integer AS count
                   FROM plan_status ps
                     JOIN filled_critical_positions f ON f.position_id = ps.position_id
                  WHERE ps.has_ready_now) AS ready_now_positions,
            ( SELECT
                        CASE
                            WHEN count(*) = 0 THEN NULL::date
                            ELSE min(plan_base.assessment_date)
                        END AS min
                   FROM plan_base) AS as_of_date
        ), derived AS (
         SELECT counts.critical_job_profiles,
            counts.filled_positions,
            counts.planned_positions,
            counts.ready_now_positions,
            counts.as_of_date,
            counts.filled_positions - counts.planned_positions AS unplanned_positions,
            counts.planned_positions - counts.ready_now_positions AS no_ready_now_positions
           FROM counts
        ), suppression AS (
         SELECT derived.critical_job_profiles,
            derived.filled_positions,
            derived.planned_positions,
            derived.ready_now_positions,
            derived.as_of_date,
            derived.unplanned_positions,
            derived.no_ready_now_positions,
            derived.filled_positions >= 1 AND derived.filled_positions <= 9 AS population_small,
            NOT (derived.filled_positions >= 1 AND derived.filled_positions <= 9) AND (derived.planned_positions >= 1 AND derived.planned_positions <= 9 OR derived.unplanned_positions >= 1 AND derived.unplanned_positions <= 9) AS plan_partition_small
           FROM derived
        ), suppression_final AS (
         SELECT suppression.critical_job_profiles,
            suppression.filled_positions,
            suppression.planned_positions,
            suppression.ready_now_positions,
            suppression.as_of_date,
            suppression.unplanned_positions,
            suppression.no_ready_now_positions,
            suppression.population_small,
            suppression.plan_partition_small,
            suppression.population_small OR suppression.plan_partition_small OR suppression.ready_now_positions >= 1 AND suppression.ready_now_positions <= 9 OR suppression.no_ready_now_positions >= 1 AND suppression.no_ready_now_positions <= 9 AS readiness_suppressed,
            NOT suppression.population_small AND NOT suppression.plan_partition_small AND (suppression.ready_now_positions >= 1 AND suppression.ready_now_positions <= 9 OR suppression.no_ready_now_positions >= 1 AND suppression.no_ready_now_positions <= 9) AS readiness_partition_small
           FROM suppression
        ), reconciliation AS (
         SELECT (( SELECT count(*) AS count
                   FROM ( SELECT critical_roles.job_profile_id
                           FROM critical_roles
                          WHERE critical_roles.active
                          GROUP BY critical_roles.job_profile_id
                         HAVING count(*) <> 1) d)) = 0 AS unique_active_critical_profiles,
            (( SELECT count(*) AS count
                   FROM critical_roles cr
                     LEFT JOIN job_profiles jp ON jp.job_profile_id = cr.job_profile_id
                  WHERE cr.active AND (jp.job_profile_id IS NULL OR jp.active IS NOT TRUE))) = 0 AS active_critical_profiles_valid,
            (( SELECT count(*) AS count
                   FROM positions p
                     JOIN active_critical_profiles acp ON acp.job_profile_id = p.job_profile_id
                  WHERE p.position_status IS NULL OR (p.position_status <> ALL (ARRAY['filled'::text, 'vacant'::text, 'closed'::text])) OR p.source_system IS DISTINCT FROM 'synthetic'::text)) = 0 AS critical_positions_valid,
            (( SELECT count(*) AS count
                   FROM filled_critical_positions f
                     LEFT JOIN employees e ON e.employee_id = f.incumbent_employee_id
                  WHERE f.incumbent_employee_id IS NULL OR e.employee_id IS NULL OR e.employment_status IS DISTINCT FROM 'active'::text OR e.source_system IS DISTINCT FROM 'synthetic'::text)) = 0 AS filled_population_valid,
            (( SELECT count(*) AS count
                   FROM plan_base sp
                     LEFT JOIN filled_critical_positions f ON f.position_id = sp.position_id
                  WHERE f.position_id IS NULL)) = 0 AS plans_in_population,
            (( SELECT count(*) AS count
                   FROM ( SELECT plan_base.position_id
                           FROM plan_base
                          GROUP BY plan_base.position_id
                         HAVING count(*) <> 1) d)) = 0 AS one_plan_per_position,
            (( SELECT count(DISTINCT plan_base.assessment_date) AS count
                   FROM plan_base)) <= 1 AS one_assessment_date,
            (( SELECT count(*) AS count
                   FROM successor_candidates sc
                     LEFT JOIN plan_base sp ON sp.succession_plan_id = sc.succession_plan_id
                  WHERE sp.succession_plan_id IS NULL)) = 0 AS no_orphan_candidates,
            (( SELECT count(*) AS count
                   FROM ( SELECT successor_candidates.succession_plan_id,
                            successor_candidates.employee_id
                           FROM successor_candidates
                          GROUP BY successor_candidates.succession_plan_id, successor_candidates.employee_id
                         HAVING count(*) <> 1) d)) = 0 AS unique_candidate_plan_pairs,
            (( SELECT count(*) AS count
                   FROM successor_candidates sc
                     LEFT JOIN employees e ON e.employee_id = sc.employee_id
                  WHERE e.employee_id IS NULL OR e.employment_status IS DISTINCT FROM 'active'::text OR e.source_system IS DISTINCT FROM 'synthetic'::text)) = 0 AS candidate_employees_valid,
            (( SELECT count(*) AS count
                   FROM successor_candidates
                  WHERE successor_candidates.readiness IS NULL OR (successor_candidates.readiness <> ALL (ARRAY['ready_now'::text, 'ready_1_2_years'::text, 'ready_3_plus_years'::text])))) = 0 AS readiness_valid
        ), snapshot_json AS (
         SELECT jsonb_build_object('critical_roles', COALESCE(( SELECT jsonb_agg(jsonb_build_array(cr.critical_role_id::text, cr.job_profile_id::text, cr.active) ORDER BY (cr.critical_role_id::text)) AS jsonb_agg
                   FROM critical_roles cr), '[]'::jsonb), 'job_profiles', COALESCE(( SELECT jsonb_agg(jsonb_build_array(jp.job_profile_id::text, jp.active) ORDER BY (jp.job_profile_id::text)) AS jsonb_agg
                   FROM job_profiles jp
                  WHERE (jp.job_profile_id IN ( SELECT cr.job_profile_id
                           FROM critical_roles cr
                        UNION
                         SELECT p.job_profile_id
                           FROM positions p
                             JOIN succession_plans sp ON sp.position_id = p.position_id))), '[]'::jsonb), 'positions', COALESCE(( SELECT jsonb_agg(jsonb_build_array(rp.position_id::text, rp.job_profile_id::text, rp.incumbent_employee_id::text, rp.position_status, rp.source_system) ORDER BY (rp.position_id::text)) AS jsonb_agg
                   FROM relevant_positions rp), '[]'::jsonb), 'employees', COALESCE(( SELECT jsonb_agg(jsonb_build_array(e.employee_id::text, e.employment_status, e.source_system) ORDER BY (e.employee_id::text)) AS jsonb_agg
                   FROM employees e
                  WHERE (e.employee_id IN ( SELECT rp.incumbent_employee_id
                           FROM relevant_positions rp
                          WHERE rp.incumbent_employee_id IS NOT NULL
                        UNION
                         SELECT sc.employee_id
                           FROM successor_candidates sc))), '[]'::jsonb), 'succession_plans', COALESCE(( SELECT jsonb_agg(jsonb_build_array(sp.succession_plan_id::text, sp.position_id::text, sp.assessment_date::text) ORDER BY (sp.succession_plan_id::text)) AS jsonb_agg
                   FROM succession_plans sp), '[]'::jsonb), 'successor_candidates', COALESCE(( SELECT jsonb_agg(jsonb_build_array(sc.successor_candidate_id::text, sc.succession_plan_id::text, sc.employee_id::text, sc.readiness) ORDER BY (sc.successor_candidate_id::text)) AS jsonb_agg
                   FROM successor_candidates sc), '[]'::jsonb)) AS payload
        ), snapshot_check AS (
         SELECT encode(sha256(convert_to(snapshot_json.payload::text, 'UTF8'::name)), 'hex'::text) = '1b60f79c76826bc0aab05080a8b64771680e9b18f6d493b9ee4bbce47fc5619d'::text AS matches_approved_snapshot
           FROM snapshot_json
        ), gates AS (
         SELECT r.unique_active_critical_profiles AND r.active_critical_profiles_valid AND r.critical_positions_valid AND r.filled_population_valid AND r.plans_in_population AND r.one_plan_per_position AND r.one_assessment_date AND r.no_orphan_candidates AND r.unique_candidate_plan_pairs AND r.candidate_employees_valid AND r.readiness_valid AND s.matches_approved_snapshot AS publishable
           FROM reconciliation r
             CROSS JOIN snapshot_check s
        )
 SELECT sf.as_of_date,
    10 AS small_cell_threshold,
    sf.critical_job_profiles,
        CASE
            WHEN sf.population_small THEN NULL::integer
            ELSE sf.filled_positions
        END AS filled_critical_positions,
        CASE
            WHEN sf.population_small OR sf.plan_partition_small THEN NULL::integer
            ELSE sf.planned_positions
        END AS positions_with_recorded_plan,
        CASE
            WHEN sf.population_small OR sf.plan_partition_small THEN NULL::integer
            ELSE sf.unplanned_positions
        END AS positions_without_recorded_plan,
        CASE
            WHEN sf.population_small OR sf.plan_partition_small OR sf.filled_positions = 0 THEN NULL::numeric
            ELSE round(sf.planned_positions::numeric * 100::numeric / sf.filled_positions::numeric, 1)
        END::numeric(5,1) AS recorded_plan_coverage_pct,
    sf.population_small OR sf.plan_partition_small AS plan_coverage_suppressed,
        CASE
            WHEN sf.readiness_suppressed THEN NULL::integer
            ELSE sf.ready_now_positions
        END AS positions_with_ready_now,
        CASE
            WHEN sf.readiness_suppressed THEN NULL::integer
            ELSE sf.no_ready_now_positions
        END AS positions_without_ready_now,
        CASE
            WHEN sf.readiness_suppressed OR sf.planned_positions = 0 THEN NULL::numeric
            ELSE round(sf.ready_now_positions::numeric * 100::numeric / sf.planned_positions::numeric, 1)
        END::numeric(5,1) AS ready_now_plan_pct,
    sf.readiness_suppressed AS ready_now_suppressed,
        CASE
            WHEN sf.population_small THEN 'population_small_cell'::text
            WHEN sf.plan_partition_small THEN 'plan_partition_small_cell'::text
            WHEN sf.readiness_partition_small THEN 'readiness_partition_small_cell'::text
            ELSE NULL::text
        END AS suppression_reason
   FROM suppression_final sf
     CROSS JOIN gates g
  WHERE g.publishable;

CREATE VIEW public."survey_listening_business_unit_summary" WITH (security_invoker=true) AS  WITH respondent_scores AS (
         SELECT sr.employee_id,
            avg(sr.numeric_response) AS avg_score,
            count(*) FILTER (WHERE sr.numeric_response >= 4::numeric)::numeric / NULLIF(count(sr.numeric_response), 0)::numeric AS favorable_share
           FROM surveys s
             JOIN survey_questions q ON q.survey_id = s.survey_id
             JOIN survey_responses sr ON sr.survey_question_id = q.survey_question_id
          WHERE s.survey_code = 'ENG-2026'::text AND sr.employee_id IS NOT NULL AND sr.numeric_response IS NOT NULL
          GROUP BY sr.employee_id
        )
 SELECT ou.org_unit_id,
    ou.org_code,
    ou.org_name,
    count(rs.employee_id)::integer AS respondents,
    round(avg(rs.avg_score), 2) AS avg_score,
    round(100.0 * avg(rs.favorable_share), 1) AS favorable_pct
   FROM respondent_scores rs
     JOIN employee_snapshots es ON es.employee_id = rs.employee_id AND es.snapshot_date = '2026-06-30'::date
     JOIN org_units ou ON ou.org_unit_id = es.org_unit_id
  WHERE ou.org_type = 'business_unit'::text
  GROUP BY ou.org_unit_id, ou.org_code, ou.org_name;

CREATE VIEW public."survey_listening_current_summary" WITH (security_invoker=true) AS  WITH eng AS (
         SELECT count(DISTINCT sr.employee_id)::integer AS respondents,
            round(avg(sr.numeric_response), 2) AS avg_score,
            round(100.0 * count(*) FILTER (WHERE sr.numeric_response >= 4::numeric)::numeric / NULLIF(count(sr.numeric_response), 0)::numeric, 1) AS favorable_pct
           FROM surveys s
             JOIN survey_questions q ON q.survey_id = s.survey_id
             JOIN survey_responses sr ON sr.survey_question_id = q.survey_question_id
          WHERE s.survey_code = 'ENG-2026'::text AND sr.numeric_response IS NOT NULL
        ), eligible AS (
         SELECT count(DISTINCT employee_snapshots.employee_id)::integer AS eligible_population
           FROM employee_snapshots
          WHERE employee_snapshots.snapshot_date = '2026-06-30'::date
        ), pulse AS (
         SELECT count(DISTINCT sr.employee_id)::integer AS respondents,
            round(avg(sr.numeric_response), 2) AS avg_score,
            round(100.0 * count(*) FILTER (WHERE sr.numeric_response >= 4::numeric)::numeric / NULLIF(count(sr.numeric_response), 0)::numeric, 1) AS favorable_pct
           FROM surveys s
             JOIN survey_questions q ON q.survey_id = s.survey_id
             JOIN survey_responses sr ON sr.survey_question_id = q.survey_question_id
          WHERE s.survey_code = 'PULSE-2026-Q2'::text AND sr.numeric_response IS NOT NULL
        ), mgr AS (
         SELECT count(DISTINCT sr.employee_id)::integer AS respondents,
            round(avg(sr.numeric_response), 2) AS avg_score,
            round(100.0 * count(*) FILTER (WHERE sr.numeric_response >= 4::numeric)::numeric / NULLIF(count(sr.numeric_response), 0)::numeric, 1) AS favorable_pct
           FROM surveys s
             JOIN survey_questions q ON q.survey_id = s.survey_id
             JOIN survey_responses sr ON sr.survey_question_id = q.survey_question_id
          WHERE s.survey_code = 'MGR-2026'::text AND sr.numeric_response IS NOT NULL
        ), onb90 AS (
         SELECT count(DISTINCT sr.employee_id)::integer AS respondents,
            round(avg(sr.numeric_response), 2) AS avg_score,
            round(100.0 * count(*) FILTER (WHERE sr.numeric_response >= 4::numeric)::numeric / NULLIF(count(sr.numeric_response), 0)::numeric, 1) AS favorable_pct
           FROM surveys s
             JOIN survey_questions q ON q.survey_id = s.survey_id
             JOIN survey_responses sr ON sr.survey_question_id = q.survey_question_id
          WHERE s.survey_code = 'ONB-90'::text AND sr.numeric_response IS NOT NULL
        ), exit_summary AS (
         SELECT count(DISTINCT sr.employee_id)::integer AS respondents
           FROM surveys s
             JOIN survey_responses sr ON sr.survey_id = s.survey_id
          WHERE s.survey_code = 'EXIT'::text
        ), comments AS (
         SELECT count(*)::integer AS open_text_comments
           FROM survey_responses
          WHERE survey_responses.text_response IS NOT NULL AND btrim(survey_responses.text_response) <> ''::text
        )
 SELECT '2026-09-30'::date AS as_of,
    eng.respondents AS engagement_respondents,
    eligible.eligible_population AS engagement_eligible_population,
    round(100.0 * eng.respondents::numeric / NULLIF(eligible.eligible_population, 0)::numeric, 1) AS engagement_participation_pct,
    eng.avg_score AS engagement_avg_score,
    eng.favorable_pct AS engagement_favorable_pct,
    pulse.respondents AS pulse_respondents,
    pulse.avg_score AS pulse_avg_score,
    pulse.favorable_pct AS pulse_favorable_pct,
    mgr.respondents AS manager_respondents,
    mgr.avg_score AS manager_avg_score,
    mgr.favorable_pct AS manager_favorable_pct,
    onb90.respondents AS onboarding_90_respondents,
    onb90.avg_score AS onboarding_90_avg_score,
    onb90.favorable_pct AS onboarding_90_favorable_pct,
    exit_summary.respondents AS exit_respondents,
    comments.open_text_comments
   FROM eng
     CROSS JOIN eligible
     CROSS JOIN pulse
     CROSS JOIN mgr
     CROSS JOIN onb90
     CROSS JOIN exit_summary
     CROSS JOIN comments;

CREATE VIEW public."survey_listening_dimension_summary" WITH (security_invoker=true) AS  WITH response_aggregates AS (
         SELECT sr.survey_question_id,
            count(DISTINCT sr.employee_id) AS employee_respondents,
            count(DISTINCT sr.candidate_id) AS candidate_respondents,
            count(DISTINCT sr.separation_id) AS separation_respondents,
            avg(sr.numeric_response) AS avg_score,
            count(*) FILTER (WHERE sr.numeric_response >= 4::numeric) AS favorable_count,
            count(sr.numeric_response) AS numeric_count
           FROM survey_responses sr
          WHERE sr.numeric_response IS NOT NULL
          GROUP BY sr.survey_question_id
        )
 SELECT s.survey_code,
    s.survey_name,
    s.survey_type,
    q.question_code,
    q.dimension,
    q.question_text,
    a.employee_respondents::integer AS employee_respondents,
    a.candidate_respondents::integer AS candidate_respondents,
    a.separation_respondents::integer AS separation_respondents,
    round(a.avg_score, 2) AS avg_score,
    round(100.0 * a.favorable_count::numeric / NULLIF(a.numeric_count, 0)::numeric, 1) AS favorable_pct
   FROM surveys s
     JOIN survey_questions q ON q.survey_id = s.survey_id
     JOIN response_aggregates a ON a.survey_question_id = q.survey_question_id;

CREATE VIEW public."survey_listening_engagement_trend" WITH (security_invoker=true) AS  WITH engagement AS (
         SELECT s.survey_code,
            s.survey_name,
            s.launch_date,
            s.close_date,
            count(DISTINCT sr.employee_id)::integer AS respondents,
            round(avg(sr.numeric_response), 2) AS avg_score,
            round(100.0 * count(*) FILTER (WHERE sr.numeric_response >= 4::numeric)::numeric / NULLIF(count(sr.numeric_response), 0)::numeric, 1) AS favorable_pct
           FROM surveys s
             JOIN survey_questions q ON q.survey_id = s.survey_id
             JOIN survey_responses sr ON sr.survey_question_id = q.survey_question_id
          WHERE s.survey_type = 'engagement'::text AND sr.numeric_response IS NOT NULL
          GROUP BY s.survey_id, s.survey_code, s.survey_name, s.launch_date, s.close_date
        ), snapshot_dates AS (
         SELECT DISTINCT employee_snapshots.snapshot_date
           FROM employee_snapshots
        ), nearest AS (
         SELECT e_1.survey_code,
            sd.snapshot_date,
            row_number() OVER (PARTITION BY e_1.survey_code ORDER BY (abs(sd.snapshot_date - e_1.close_date))) AS rn
           FROM engagement e_1
             CROSS JOIN snapshot_dates sd
        ), eligible AS (
         SELECT n.survey_code,
            n.snapshot_date,
            count(DISTINCT es.employee_id)::integer AS eligible_population
           FROM nearest n
             JOIN employee_snapshots es ON es.snapshot_date = n.snapshot_date
          WHERE n.rn = 1
          GROUP BY n.survey_code, n.snapshot_date
        )
 SELECT e.survey_code,
    e.survey_name,
    e.launch_date,
    e.close_date,
    e.respondents,
    el.snapshot_date AS denominator_snapshot_date,
    el.eligible_population,
    round(100.0 * e.respondents::numeric / NULLIF(el.eligible_population, 0)::numeric, 1) AS participation_pct,
    e.avg_score,
    e.favorable_pct
   FROM engagement e
     JOIN eligible el USING (survey_code);

CREATE VIEW public."survey_listening_exit_reason_summary" WITH (security_invoker=true) AS  SELECT sr.response_category AS primary_reason,
    count(DISTINCT sr.employee_id)::integer AS exits,
    round(100.0 * count(DISTINCT sr.employee_id)::numeric / NULLIF(sum(count(DISTINCT sr.employee_id)) OVER (), 0::numeric), 1) AS pct_of_exit_responses
   FROM survey_responses sr
     JOIN surveys s ON s.survey_id = sr.survey_id
     JOIN survey_questions q ON q.survey_question_id = sr.survey_question_id
  WHERE s.survey_code = 'EXIT'::text AND q.question_code = 'PRIMARY_REASON'::text
  GROUP BY sr.response_category;

CREATE VIEW public."ta_funnel_summary" AS  SELECT EXTRACT(year FROM r.opened_date)::integer AS opened_year,
    jf.family_code,
    jf.family_name,
    loc.region,
    count(DISTINCT r.requisition_id) AS requisitions,
    count(DISTINCT a.application_id) AS applications,
    count(DISTINCT i.application_id) AS interviewed_applications,
    count(DISTINCT o.application_id) AS offered_applications,
    count(DISTINCT h.hire_id) AS hires,
    count(DISTINCT h.hire_id) FILTER (WHERE h.external_internal = 'internal'::text) AS internal_fills,
    count(DISTINCT h.hire_id) FILTER (WHERE h.external_internal = 'external'::text) AS external_hires
   FROM requisitions r
     JOIN job_profiles jp ON jp.job_profile_id = r.job_profile_id
     JOIN job_families jf ON jf.job_family_id = jp.job_family_id
     LEFT JOIN locations loc ON loc.location_id = r.location_id
     LEFT JOIN applications a ON a.requisition_id = r.requisition_id
     LEFT JOIN interviews i ON i.application_id = a.application_id
     LEFT JOIN offers o ON o.application_id = a.application_id
     LEFT JOIN hires h ON h.application_id = a.application_id
  GROUP BY (EXTRACT(year FROM r.opened_date)::integer), jf.family_code, jf.family_name, loc.region;

CREATE VIEW public."ta_requisition_metrics" WITH (security_invoker=true) AS  WITH applicant_stats AS (
         SELECT a.requisition_id,
            count(*) AS applicants,
            count(*) FILTER (WHERE a.current_stage = ANY (ARRAY['Interview'::text, 'Final Interview'::text, 'Offer'::text, 'Hired'::text])) AS advanced_candidates,
            count(*) FILTER (WHERE a.application_status = 'hired'::text) AS hired_applications
           FROM applications a
          GROUP BY a.requisition_id
        ), interview_stats AS (
         SELECT a.requisition_id,
            count(i.interview_id) AS interviews
           FROM applications a
             JOIN interviews i ON i.application_id = a.application_id
          GROUP BY a.requisition_id
        ), offer_stats AS (
         SELECT a.requisition_id,
            count(o.offer_id) AS offers,
            count(o.offer_id) FILTER (WHERE o.offer_status = 'accepted'::text) AS accepted_offers,
            count(o.offer_id) FILTER (WHERE o.offer_status = 'declined'::text) AS declined_offers,
            min(o.response_date) FILTER (WHERE o.offer_status = 'accepted'::text) AS accepted_offer_date
           FROM applications a
             JOIN offers o ON o.application_id = a.application_id
          GROUP BY a.requisition_id
        ), hire_stats AS (
         SELECT h.requisition_id,
            h.external_internal,
            h.start_date,
            a.application_date
           FROM hires h
             JOIN applications a ON a.application_id = h.application_id
        )
 SELECT r.requisition_id,
    r.requisition_number,
    r.requisition_status,
    r.requisition_type,
    r.approved_date,
    r.opened_date,
    r.closed_date,
    r.target_start_date,
    jp.job_profile_code,
    jp.job_profile_name,
    jf.family_code,
    jf.family_name,
    jfunc.function_code,
    jfunc.function_name,
    jl.level_code,
    jl.level_name,
    ou.org_code,
    ou.org_name,
    loc.location_code,
    loc.location_name,
    loc.country_code,
    loc.region,
    rec.recruiter_code,
    rec.recruiter_name,
    rec.specialty AS recruiter_specialty,
    COALESCE(aps.applicants, 0::bigint) AS applicants,
    COALESCE(aps.advanced_candidates, 0::bigint) AS advanced_candidates,
    COALESCE(ints.interviews, 0::bigint) AS interviews,
    COALESCE(ofs.offers, 0::bigint) AS offers,
    COALESCE(ofs.accepted_offers, 0::bigint) AS accepted_offers,
    COALESCE(ofs.declined_offers, 0::bigint) AS declined_offers,
        CASE
            WHEN ofs.accepted_offer_date IS NOT NULL THEN ofs.accepted_offer_date - r.opened_date
            ELSE NULL::integer
        END AS time_to_fill_days,
        CASE
            WHEN ofs.accepted_offer_date IS NOT NULL AND hs.application_date IS NOT NULL THEN ofs.accepted_offer_date - hs.application_date
            ELSE NULL::integer
        END AS time_to_hire_days,
        CASE
            WHEN (COALESCE(ofs.accepted_offers, 0::bigint) + COALESCE(ofs.declined_offers, 0::bigint)) > 0 THEN round(ofs.accepted_offers::numeric / (ofs.accepted_offers + ofs.declined_offers)::numeric * 100::numeric, 2)
            ELSE NULL::numeric
        END AS offer_acceptance_rate_pct,
    hs.external_internal,
    hs.start_date
   FROM requisitions r
     JOIN job_profiles jp ON jp.job_profile_id = r.job_profile_id
     JOIN job_families jf ON jf.job_family_id = jp.job_family_id
     JOIN job_functions jfunc ON jfunc.job_function_id = jf.job_function_id
     LEFT JOIN job_levels jl ON jl.job_level_id = r.job_level_id
     LEFT JOIN org_units ou ON ou.org_unit_id = r.org_unit_id
     LEFT JOIN locations loc ON loc.location_id = r.location_id
     LEFT JOIN recruiters rec ON rec.recruiter_id = r.recruiter_id
     LEFT JOIN applicant_stats aps ON aps.requisition_id = r.requisition_id
     LEFT JOIN interview_stats ints ON ints.requisition_id = r.requisition_id
     LEFT JOIN offer_stats ofs ON ofs.requisition_id = r.requisition_id
     LEFT JOIN hire_stats hs ON hs.requisition_id = r.requisition_id;

CREATE VIEW public."talent_acquisition_business_unit_summary" WITH (security_invoker=true) AS  WITH params AS (
         SELECT '2026-09-30'::date AS as_of
        ), req AS (
         SELECT requisitions.org_unit_id,
            count(*) FILTER (WHERE requisitions.requisition_status = ANY (ARRAY['open'::text, 'on_hold'::text]))::integer AS open_requisitions,
            COALESCE(sum(requisitions.openings) FILTER (WHERE requisitions.requisition_status = ANY (ARRAY['open'::text, 'on_hold'::text])), 0::bigint)::integer AS open_positions,
            round(avg(requisitions.closed_date - requisitions.opened_date) FILTER (WHERE requisitions.requisition_status = 'filled'::text AND requisitions.opened_date IS NOT NULL AND requisitions.closed_date IS NOT NULL AND requisitions.closed_date <= p.as_of), 1) AS avg_time_to_fill_days
           FROM requisitions
             CROSS JOIN params p
          GROUP BY requisitions.org_unit_id
        ), apps AS (
         SELECT r.org_unit_id,
            count(a.application_id)::integer AS applications
           FROM applications a
             JOIN requisitions r ON r.requisition_id = a.requisition_id
             CROSS JOIN params p
          WHERE a.application_date <= p.as_of
          GROUP BY r.org_unit_id
        ), hire AS (
         SELECT r.org_unit_id,
            count(h.hire_id)::integer AS hires
           FROM hires h
             JOIN requisitions r ON r.requisition_id = h.requisition_id
             CROSS JOIN params p
          WHERE h.hire_date <= p.as_of
          GROUP BY r.org_unit_id
        )
 SELECT ou.org_unit_id,
    ou.org_code,
    ou.org_name,
    COALESCE(req.open_requisitions, 0) AS open_requisitions,
    COALESCE(req.open_positions, 0) AS open_positions,
    COALESCE(apps.applications, 0) AS applications,
    COALESCE(hire.hires, 0) AS hires,
    COALESCE(req.avg_time_to_fill_days, 0::numeric) AS avg_time_to_fill_days,
    round(100.0 * COALESCE(hire.hires, 0)::numeric / NULLIF(COALESCE(apps.applications, 0), 0)::numeric, 1) AS application_to_hire_pct
   FROM org_units ou
     LEFT JOIN req ON req.org_unit_id = ou.org_unit_id
     LEFT JOIN apps ON apps.org_unit_id = ou.org_unit_id
     LEFT JOIN hire ON hire.org_unit_id = ou.org_unit_id
  WHERE ou.org_type = 'business_unit'::text AND ou.active = true;

CREATE VIEW public."talent_acquisition_current_summary" WITH (security_invoker=true) AS  WITH params AS (
         SELECT '2026-09-30'::date AS as_of
        ), app_funnel AS (
         SELECT count(*) FILTER (WHERE a.application_date <= p_1.as_of)::integer AS applications,
            count(DISTINCT i.application_id) FILTER (WHERE i.interview_date <= p_1.as_of)::integer AS interviewed_applications,
            count(DISTINCT o.application_id) FILTER (WHERE o.offer_date <= p_1.as_of)::integer AS offered_applications,
            count(DISTINCT h.hire_id) FILTER (WHERE h.hire_date <= p_1.as_of)::integer AS hires
           FROM params p_1
             CROSS JOIN applications a
             LEFT JOIN interviews i ON i.application_id = a.application_id
             LEFT JOIN offers o ON o.application_id = a.application_id
             LEFT JOIN hires h ON h.application_id = a.application_id
        ), app_counts AS (
         SELECT count(*) FILTER (WHERE applications.application_date <= p_1.as_of)::integer AS applications
           FROM applications
             CROSS JOIN params p_1
        ), interview_counts AS (
         SELECT count(DISTINCT interviews.application_id) FILTER (WHERE interviews.interview_date <= p_1.as_of)::integer AS interviewed_applications
           FROM interviews
             CROSS JOIN params p_1
        ), offer_counts AS (
         SELECT count(DISTINCT offers.application_id) FILTER (WHERE offers.offer_date <= p_1.as_of)::integer AS offered_applications,
            count(*) FILTER (WHERE offers.offer_date <= p_1.as_of AND offers.offer_status = 'accepted'::text)::integer AS accepted_offers
           FROM offers
             CROSS JOIN params p_1
        ), hire_counts AS (
         SELECT count(*) FILTER (WHERE hires.hire_date <= p_1.as_of)::integer AS hires,
            count(*) FILTER (WHERE hires.hire_date <= p_1.as_of AND hires.external_internal = 'internal'::text)::integer AS internal_hires,
            count(*) FILTER (WHERE hires.hire_date <= p_1.as_of AND hires.external_internal = 'external'::text)::integer AS external_hires
           FROM hires
             CROSS JOIN params p_1
        ), req_metrics AS (
         SELECT count(*) FILTER (WHERE requisitions.requisition_status = ANY (ARRAY['open'::text, 'on_hold'::text]))::integer AS open_requisitions,
            COALESCE(sum(requisitions.openings) FILTER (WHERE requisitions.requisition_status = ANY (ARRAY['open'::text, 'on_hold'::text])), 0::bigint)::integer AS open_positions,
            round(avg(requisitions.closed_date - requisitions.opened_date) FILTER (WHERE requisitions.requisition_status = 'filled'::text AND requisitions.opened_date IS NOT NULL AND requisitions.closed_date IS NOT NULL AND requisitions.closed_date <= p_1.as_of), 1) AS avg_time_to_fill_days,
            percentile_cont(0.5::double precision) WITHIN GROUP (ORDER BY ((requisitions.closed_date - requisitions.opened_date)::double precision)) FILTER (WHERE requisitions.requisition_status = 'filled'::text AND requisitions.opened_date IS NOT NULL AND requisitions.closed_date IS NOT NULL AND requisitions.closed_date <= p_1.as_of) AS median_time_to_fill_days,
            round(avg(p_1.as_of - requisitions.opened_date) FILTER (WHERE (requisitions.requisition_status = ANY (ARRAY['open'::text, 'on_hold'::text])) AND requisitions.opened_date IS NOT NULL AND requisitions.opened_date <= p_1.as_of), 1) AS avg_open_req_age_days,
            percentile_cont(0.5::double precision) WITHIN GROUP (ORDER BY ((p_1.as_of - requisitions.opened_date)::double precision)) FILTER (WHERE (requisitions.requisition_status = ANY (ARRAY['open'::text, 'on_hold'::text])) AND requisitions.opened_date IS NOT NULL AND requisitions.opened_date <= p_1.as_of) AS median_open_req_age_days,
            count(*) FILTER (WHERE (requisitions.requisition_status = ANY (ARRAY['open'::text, 'on_hold'::text])) AND requisitions.opened_date IS NOT NULL AND requisitions.opened_date <= p_1.as_of AND (p_1.as_of - requisitions.opened_date) > 60)::integer AS open_reqs_over_60_days
           FROM requisitions
             CROSS JOIN params p_1
        )
 SELECT p.as_of,
    ac.applications,
    ic.interviewed_applications,
    oc.offered_applications,
    hc.hires,
    round(100.0 * ic.interviewed_applications::numeric / NULLIF(ac.applications, 0)::numeric, 1) AS application_to_interview_pct,
    round(100.0 * oc.offered_applications::numeric / NULLIF(ic.interviewed_applications, 0)::numeric, 1) AS interview_to_offer_pct,
    round(100.0 * hc.hires::numeric / NULLIF(oc.offered_applications, 0)::numeric, 1) AS offer_to_hire_pct,
    round(100.0 * hc.hires::numeric / NULLIF(ac.applications, 0)::numeric, 1) AS application_to_hire_pct,
    round(100.0 * oc.accepted_offers::numeric / NULLIF(oc.offered_applications, 0)::numeric, 1) AS offer_acceptance_pct,
    rm.open_requisitions,
    rm.open_positions,
    rm.avg_time_to_fill_days,
    rm.median_time_to_fill_days,
    rm.avg_open_req_age_days,
    rm.median_open_req_age_days,
    rm.open_reqs_over_60_days,
    hc.internal_hires,
    hc.external_hires
   FROM params p
     CROSS JOIN app_counts ac
     CROSS JOIN interview_counts ic
     CROSS JOIN offer_counts oc
     CROSS JOIN hire_counts hc
     CROSS JOIN req_metrics rm;

CREATE VIEW public."talent_acquisition_monthly_summary" WITH (security_invoker=true) AS  WITH months AS (
         SELECT generate_series('2024-01-01'::date::timestamp with time zone, '2026-09-01'::date::timestamp with time zone, '1 mon'::interval)::date AS month
        ), apps AS (
         SELECT date_trunc('month'::text, applications.application_date::timestamp with time zone)::date AS month,
            count(*)::integer AS applications
           FROM applications
          WHERE applications.application_date >= '2024-01-01'::date AND applications.application_date <= '2026-09-30'::date
          GROUP BY (date_trunc('month'::text, applications.application_date::timestamp with time zone)::date)
        ), interviewed AS (
         SELECT date_trunc('month'::text, interviews.interview_date::timestamp with time zone)::date AS month,
            count(DISTINCT interviews.application_id)::integer AS interviewed_applications
           FROM interviews
          WHERE interviews.interview_date >= '2024-01-01'::date AND interviews.interview_date <= '2026-09-30'::date
          GROUP BY (date_trunc('month'::text, interviews.interview_date::timestamp with time zone)::date)
        ), offers_m AS (
         SELECT date_trunc('month'::text, offers.offer_date::timestamp with time zone)::date AS month,
            count(DISTINCT offers.application_id)::integer AS offers
           FROM offers
          WHERE offers.offer_date >= '2024-01-01'::date AND offers.offer_date <= '2026-09-30'::date
          GROUP BY (date_trunc('month'::text, offers.offer_date::timestamp with time zone)::date)
        ), hires_m AS (
         SELECT date_trunc('month'::text, hires.hire_date::timestamp with time zone)::date AS month,
            count(*)::integer AS hires
           FROM hires
          WHERE hires.hire_date >= '2024-01-01'::date AND hires.hire_date <= '2026-09-30'::date
          GROUP BY (date_trunc('month'::text, hires.hire_date::timestamp with time zone)::date)
        )
 SELECT m.month,
    COALESCE(a.applications, 0) AS applications,
    COALESCE(i.interviewed_applications, 0) AS interviewed_applications,
    COALESCE(o.offers, 0) AS offers,
    COALESCE(h.hires, 0) AS hires
   FROM months m
     LEFT JOIN apps a USING (month)
     LEFT JOIN interviewed i USING (month)
     LEFT JOIN offers_m o USING (month)
     LEFT JOIN hires_m h USING (month)
  ORDER BY m.month;

CREATE VIEW public."talent_acquisition_recruiter_summary" WITH (security_invoker=true) AS  WITH params AS (
         SELECT '2026-09-30'::date AS as_of
        )
 SELECT r.recruiter_id,
    r.recruiter_name,
    r.region,
    r.specialty,
    count(req.requisition_id)::integer AS total_requisitions,
    count(req.requisition_id) FILTER (WHERE req.requisition_status = ANY (ARRAY['open'::text, 'on_hold'::text]))::integer AS open_requisitions,
    COALESCE(sum(req.openings) FILTER (WHERE req.requisition_status = ANY (ARRAY['open'::text, 'on_hold'::text])), 0::bigint)::integer AS open_positions,
    count(req.requisition_id) FILTER (WHERE req.requisition_status = 'filled'::text AND req.closed_date <= p.as_of)::integer AS filled_requisitions,
    round(avg(req.closed_date - req.opened_date) FILTER (WHERE req.requisition_status = 'filled'::text AND req.opened_date IS NOT NULL AND req.closed_date IS NOT NULL AND req.closed_date <= p.as_of), 1) AS avg_time_to_fill_days
   FROM recruiters r
     CROSS JOIN params p
     LEFT JOIN requisitions req ON req.recruiter_id = r.recruiter_id
  WHERE r.active = true
  GROUP BY r.recruiter_id, r.recruiter_name, r.region, r.specialty;

CREATE VIEW public."talent_acquisition_source_summary" WITH (security_invoker=true) AS  WITH params AS (
         SELECT '2026-09-30'::date AS as_of
        ), apps AS (
         SELECT applications.recruiting_source_id,
            count(*)::integer AS applications
           FROM applications
             CROSS JOIN params
          WHERE applications.application_date <= params.as_of
          GROUP BY applications.recruiting_source_id
        ), hires_by_source AS (
         SELECT a_1.recruiting_source_id,
            count(h_1.hire_id)::integer AS hires
           FROM hires h_1
             JOIN applications a_1 ON a_1.application_id = h_1.application_id
             CROSS JOIN params
          WHERE h_1.hire_date <= params.as_of
          GROUP BY a_1.recruiting_source_id
        )
 SELECT rs.recruiting_source_id,
    rs.source_code,
    rs.source_name,
    rs.source_category,
    COALESCE(a.applications, 0) AS applications,
    COALESCE(h.hires, 0) AS hires,
    round(100.0 * COALESCE(h.hires, 0)::numeric / NULLIF(COALESCE(a.applications, 0), 0)::numeric, 1) AS application_to_hire_pct
   FROM recruiting_sources rs
     LEFT JOIN apps a ON a.recruiting_source_id = rs.recruiting_source_id
     LEFT JOIN hires_by_source h ON h.recruiting_source_id = rs.recruiting_source_id
  WHERE rs.active = true;

CREATE VIEW public."talent_overview" AS  SELECT e.employee_id,
    e.employee_number,
    p.position_title,
    jp.job_profile_code,
    jp.job_profile_name,
    jf.family_code,
    jf.family_name,
    jl.level_code,
    jl.level_name,
    ou.org_code,
    ou.org_name,
    loc.location_name,
    loc.country_code,
    pr.performance_rating,
    pr.rating_category,
    tr.potential_category,
    tr.talent_segment,
    tr.flight_risk,
    tr.loss_impact,
        CASE
            WHEN cr.critical_role_id IS NOT NULL THEN true
            ELSE false
        END AS critical_role_flag,
    cr.criticality_level,
    es.compa_ratio,
    COALESCE(skill_gap.gap_count, 0) AS skill_gap_count,
    COALESCE(skill_gap.ai_gap_count, 0) AS ai_skill_gap_count,
    cp.career_interest,
    cp.relocation_willingness
   FROM employees e
     JOIN positions p ON p.incumbent_employee_id = e.employee_id
     JOIN job_profiles jp ON jp.job_profile_id = p.job_profile_id
     JOIN job_families jf ON jf.job_family_id = jp.job_family_id
     JOIN job_levels jl ON jl.job_level_id = p.job_level_id
     JOIN org_units ou ON ou.org_unit_id = p.org_unit_id
     JOIN locations loc ON loc.location_id = p.location_id
     LEFT JOIN performance_reviews pr ON pr.employee_id = e.employee_id AND pr.review_period = '2026 YTD'::text
     LEFT JOIN talent_ratings tr ON tr.employee_id = e.employee_id AND tr.assessment_date = '2026-09-30'::date
     LEFT JOIN critical_roles cr ON cr.job_profile_id = p.job_profile_id
     LEFT JOIN employee_snapshots es ON es.employee_id = e.employee_id AND es.snapshot_date = '2026-09-30'::date
     LEFT JOIN ( SELECT current_employee_skill_gaps.employee_id,
            count(*) FILTER (WHERE current_employee_skill_gaps.skill_status = ANY (ARRAY['gap'::text, 'missing'::text]))::integer AS gap_count,
            count(*) FILTER (WHERE current_employee_skill_gaps.skill_category = 'AI'::text AND (current_employee_skill_gaps.skill_status = ANY (ARRAY['gap'::text, 'missing'::text])))::integer AS ai_gap_count
           FROM current_employee_skill_gaps
          GROUP BY current_employee_skill_gaps.employee_id) skill_gap ON skill_gap.employee_id = e.employee_id
     LEFT JOIN career_preferences cp ON cp.employee_id = e.employee_id
  WHERE e.employment_status = 'active'::text;

CREATE VIEW public."workforce_business_unit_summary" WITH (security_invoker=true) AS  WITH latest AS (
         SELECT max(employee_snapshots.snapshot_date) AS snapshot_date
           FROM employee_snapshots
        ), current_snapshot AS (
         SELECT es.employee_snapshot_id,
            es.snapshot_date,
            es.employee_id,
            es.position_id,
            es.manager_employee_id,
            es.org_unit_id,
            es.cost_center_id,
            es.job_profile_id,
            es.job_level_id,
            es.location_id,
            es.legal_entity_id,
            es.employment_status,
            es.employment_type,
            es.work_arrangement,
            es.fte,
            es.base_salary,
            es.target_bonus,
            es.total_compensation,
            es.total_labor_cost,
            es.currency_code,
            es.tenure_months,
            es.span_of_control,
            es.is_people_manager,
            es.created_at,
            es.base_salary_usd,
            es.total_compensation_usd,
            es.total_labor_cost_usd,
            es.compa_ratio
           FROM employee_snapshots es
             JOIN latest l ON es.snapshot_date = l.snapshot_date
        ), org_map AS (
         SELECT child.org_unit_id,
                CASE
                    WHEN child.org_type = 'business_unit'::text THEN child.org_code
                    ELSE parent.org_code
                END AS org_code,
                CASE
                    WHEN child.org_type = 'business_unit'::text THEN child.org_name
                    ELSE parent.org_name
                END AS org_name
           FROM org_units child
             LEFT JOIN org_units parent ON parent.org_unit_id = child.parent_org_unit_id
        )
 SELECT max(cs.snapshot_date) AS as_of,
    om.org_code,
    om.org_name,
    count(DISTINCT cs.employee_id)::integer AS headcount,
    round(sum(cs.fte), 1) AS fte,
    count(*) FILTER (WHERE cs.is_people_manager)::integer AS people_managers,
    round(avg(cs.span_of_control) FILTER (WHERE cs.is_people_manager), 1) AS avg_span_of_control,
    round(avg(cs.tenure_months) / 12.0, 1) AS avg_tenure_years
   FROM current_snapshot cs
     JOIN org_map om ON om.org_unit_id = cs.org_unit_id
  WHERE om.org_code IS NOT NULL
  GROUP BY om.org_code, om.org_name;

CREATE VIEW public."workforce_country_summary" WITH (security_invoker=true) AS  WITH latest AS (
         SELECT max(employee_snapshots.snapshot_date) AS snapshot_date
           FROM employee_snapshots
        )
 SELECT max(es.snapshot_date) AS as_of,
    e.worker_country_code AS country_code,
    c.country_name,
    count(DISTINCT es.employee_id)::integer AS headcount,
    round(sum(es.fte), 1) AS fte,
    round(avg(es.tenure_months) / 12.0, 1) AS avg_tenure_years
   FROM employee_snapshots es
     JOIN latest l ON es.snapshot_date = l.snapshot_date
     JOIN employees e ON e.employee_id = es.employee_id
     LEFT JOIN countries c ON c.country_code = e.worker_country_code
  GROUP BY e.worker_country_code, c.country_name;

CREATE VIEW public."workforce_current_summary" WITH (security_invoker=true) AS  WITH latest AS (
         SELECT max(employee_snapshots.snapshot_date) AS snapshot_date
           FROM employee_snapshots
        ), current_snapshot AS (
         SELECT es.employee_snapshot_id,
            es.snapshot_date,
            es.employee_id,
            es.position_id,
            es.manager_employee_id,
            es.org_unit_id,
            es.cost_center_id,
            es.job_profile_id,
            es.job_level_id,
            es.location_id,
            es.legal_entity_id,
            es.employment_status,
            es.employment_type,
            es.work_arrangement,
            es.fte,
            es.base_salary,
            es.target_bonus,
            es.total_compensation,
            es.total_labor_cost,
            es.currency_code,
            es.tenure_months,
            es.span_of_control,
            es.is_people_manager,
            es.created_at,
            es.base_salary_usd,
            es.total_compensation_usd,
            es.total_labor_cost_usd,
            es.compa_ratio
           FROM employee_snapshots es
             JOIN latest l ON es.snapshot_date = l.snapshot_date
        )
 SELECT max(snapshot_date) AS as_of,
    count(DISTINCT employee_id)::integer AS headcount,
    round(sum(fte), 1) AS fte,
    count(*) FILTER (WHERE is_people_manager)::integer AS people_managers,
    round(avg(span_of_control) FILTER (WHERE is_people_manager), 1) AS avg_span_of_control,
    count(*) FILTER (WHERE employment_type = 'full_time'::text)::integer AS full_time_headcount,
    count(*) FILTER (WHERE employment_type <> 'full_time'::text)::integer AS non_full_time_headcount,
    count(*) FILTER (WHERE work_arrangement = 'remote'::text)::integer AS remote_headcount,
    count(*) FILTER (WHERE work_arrangement = 'hybrid'::text)::integer AS hybrid_headcount,
    count(*) FILTER (WHERE work_arrangement = 'onsite'::text)::integer AS onsite_headcount,
    round(avg(tenure_months) / 12.0, 1) AS avg_tenure_years
   FROM current_snapshot;

CREATE VIEW public."workforce_level_summary" WITH (security_invoker=true) AS  WITH latest AS (
         SELECT max(employee_snapshots.snapshot_date) AS snapshot_date
           FROM employee_snapshots
        )
 SELECT max(es.snapshot_date) AS as_of,
    jl.level_code,
    jl.level_name,
    jl.level_rank,
    count(DISTINCT es.employee_id)::integer AS headcount,
    round(sum(es.fte), 1) AS fte,
    count(*) FILTER (WHERE es.is_people_manager)::integer AS people_managers,
    round(avg(es.tenure_months) / 12.0, 1) AS avg_tenure_years
   FROM employee_snapshots es
     JOIN latest l ON es.snapshot_date = l.snapshot_date
     JOIN job_levels jl ON jl.job_level_id = es.job_level_id
  GROUP BY jl.level_code, jl.level_name, jl.level_rank;

CREATE VIEW public."workforce_movement_summary" WITH (security_invoker=true) AS  SELECT date_trunc('month'::text, movement_date::timestamp with time zone)::date AS month,
    movement_type,
    count(*)::integer AS movements
   FROM employee_movements
  WHERE movement_date >= '2026-01-01'::date AND movement_date <= '2026-09-30'::date
  GROUP BY (date_trunc('month'::text, movement_date::timestamp with time zone)::date), movement_type
  ORDER BY (date_trunc('month'::text, movement_date::timestamp with time zone)::date), movement_type;

CREATE VIEW public."workforce_response_strategy_signals" WITH (security_invoker=true) AS  WITH current_employees AS (
         SELECT DISTINCT es.employee_id,
            es.job_profile_id
           FROM employee_snapshots es
          WHERE es.snapshot_date = '2026-09-30'::date
        ), learning_catalog AS (
         SELECT lc_1.skill_id,
            count(*) FILTER (WHERE lc_1.active)::integer AS active_course_count,
            round(avg(lc_1.duration_hours) FILTER (WHERE lc_1.active), 1) AS avg_course_duration_hours
           FROM learning_courses lc_1
          GROUP BY lc_1.skill_id
        ), learning_pipeline AS (
         SELECT lc_1.skill_id,
            count(DISTINCT el.employee_id) FILTER (WHERE el.learning_status = 'Enrolled'::text)::integer AS enrolled_learners,
            count(DISTINCT el.employee_id) FILTER (WHERE el.learning_status = 'In Progress'::text)::integer AS in_progress_learners,
            count(DISTINCT el.employee_id) FILTER (WHERE el.learning_status = 'Completed'::text AND el.completion_date >= '2026-01-01'::date)::integer AS completed_learners_ytd
           FROM employee_learning el
             JOIN current_employees ce ON ce.employee_id = el.employee_id
             JOIN learning_courses lc_1 ON lc_1.course_id = el.course_id
          GROUP BY lc_1.skill_id
        ), mobility AS (
         SELECT es.skill_id,
            count(DISTINCT ce.employee_id)::integer AS mobility_candidates
           FROM current_employees ce
             JOIN employee_skills es ON es.employee_id = ce.employee_id
             JOIN career_preferences cp ON cp.employee_id = ce.employee_id
             JOIN job_skill_requirements desired_req ON desired_req.job_profile_id = cp.desired_job_profile_id AND desired_req.skill_id = es.skill_id
          WHERE cp.desired_job_profile_id IS NOT NULL AND cp.desired_job_profile_id <> ce.job_profile_id
          GROUP BY es.skill_id
        ), buy_history AS (
         SELECT jsr.skill_id,
            count(*)::integer AS historical_filled_requisitions,
            round(percentile_cont(0.5::double precision) WITHIN GROUP (ORDER BY ((r.closed_date - r.opened_date)::double precision))::numeric, 1) AS median_time_to_fill_days
           FROM requisitions r
             JOIN job_skill_requirements jsr ON jsr.job_profile_id = r.job_profile_id
          WHERE r.requisition_status = 'filled'::text AND r.opened_date IS NOT NULL AND r.closed_date IS NOT NULL
          GROUP BY jsr.skill_id
        ), borrow_signal AS (
         SELECT jsr.skill_id,
            count(DISTINCT cw.contingent_worker_id) FILTER (WHERE cw.active)::integer AS active_contingent_workers,
            round(avg(ca.bill_rate) FILTER (WHERE cw.active AND ca.assignment_start_date <= '2026-09-30'::date AND (ca.assignment_end_date IS NULL OR ca.assignment_end_date >= '2026-09-30'::date)), 2) AS avg_active_bill_rate
           FROM contingent_workers cw
             JOIN job_skill_requirements jsr ON jsr.job_profile_id = cw.job_profile_id
             LEFT JOIN contingent_assignments ca ON ca.contingent_worker_id = cw.contingent_worker_id
          GROUP BY jsr.skill_id
        ), contingent_state AS (
         SELECT count(*)::integer AS total_contingent_records
           FROM contingent_workers
        )
 SELECT s.skill_code,
    s.skill_name,
    s.skill_category,
    COALESCE(lc.active_course_count, 0) AS active_course_count,
    lc.avg_course_duration_hours,
    COALESCE(lp.enrolled_learners, 0) AS enrolled_learners,
    COALESCE(lp.in_progress_learners, 0) AS in_progress_learners,
    COALESCE(lp.completed_learners_ytd, 0) AS completed_learners_ytd,
    COALESCE(m.mobility_candidates, 0) AS mobility_candidates,
    COALESCE(bh.historical_filled_requisitions, 0) AS historical_filled_requisitions,
    bh.median_time_to_fill_days,
    cs.total_contingent_records,
    COALESCE(bs.active_contingent_workers, 0) AS active_contingent_workers,
    bs.avg_active_bill_rate
   FROM skills s
     CROSS JOIN contingent_state cs
     LEFT JOIN learning_catalog lc ON lc.skill_id = s.skill_id
     LEFT JOIN learning_pipeline lp ON lp.skill_id = s.skill_id
     LEFT JOIN mobility m ON m.skill_id = s.skill_id
     LEFT JOIN buy_history bh ON bh.skill_id = s.skill_id
     LEFT JOIN borrow_signal bs ON bs.skill_id = s.skill_id
  WHERE s.active = true;

CREATE VIEW public."workforce_scenario_by_job_family" WITH (security_invoker=true) AS  SELECT ws.scenario_name,
    pp.planning_month,
    jf.family_code,
    jf.family_name,
    round(sum(pp.planned_headcount), 0) AS planned_headcount,
    round(sum(pp.planned_labor_cost_usd), 2) AS planned_labor_cost_usd
   FROM position_plans pp
     JOIN workforce_scenarios ws ON ws.workforce_scenario_id = pp.workforce_scenario_id
     JOIN job_profiles jp ON jp.job_profile_id = pp.job_profile_id
     JOIN job_families jf ON jf.job_family_id = jp.job_family_id
  GROUP BY ws.scenario_name, pp.planning_month, jf.family_code, jf.family_name;

CREATE VIEW public."workforce_scenario_by_org" WITH (security_invoker=true) AS  SELECT ws.scenario_name,
    pp.planning_month,
    ou.org_code,
    ou.org_name,
    round(sum(pp.planned_headcount), 0) AS planned_headcount,
    round(sum(pp.planned_fte), 1) AS planned_fte,
    round(sum(pp.planned_hires), 0) AS planned_hires,
    round(sum(pp.planned_exits), 0) AS planned_exits,
    round(sum(pp.planned_labor_cost_usd), 2) AS planned_labor_cost_usd
   FROM position_plans pp
     JOIN workforce_scenarios ws ON ws.workforce_scenario_id = pp.workforce_scenario_id
     JOIN org_units ou ON ou.org_unit_id = pp.org_unit_id
  GROUP BY ws.scenario_name, pp.planning_month, ou.org_code, ou.org_name;

CREATE VIEW public."workforce_scenario_summary" AS  SELECT ws.scenario_name,
    ws.scenario_type,
    pp.planning_month,
    round(sum(pp.planned_headcount), 0) AS planned_headcount,
    round(sum(pp.planned_fte), 1) AS planned_fte,
    round(sum(pp.planned_hires), 0) AS planned_hires,
    round(sum(pp.planned_exits), 0) AS planned_exits,
    round(sum(pp.planned_labor_cost_usd), 2) AS planned_labor_cost_usd
   FROM position_plans pp
     JOIN workforce_scenarios ws ON ws.workforce_scenario_id = pp.workforce_scenario_id
     JOIN workforce_plans wp ON wp.workforce_plan_id = ws.workforce_plan_id
  WHERE wp.plan_name = '2027 Enterprise Workforce Plan'::text
  GROUP BY ws.scenario_name, ws.scenario_type, pp.planning_month;

CREATE VIEW public."workforce_tenure_summary" WITH (security_invoker=true) AS  WITH latest AS (
         SELECT max(employee_snapshots.snapshot_date) AS snapshot_date
           FROM employee_snapshots
        ), current_snapshot AS (
         SELECT es.employee_snapshot_id,
            es.snapshot_date,
            es.employee_id,
            es.position_id,
            es.manager_employee_id,
            es.org_unit_id,
            es.cost_center_id,
            es.job_profile_id,
            es.job_level_id,
            es.location_id,
            es.legal_entity_id,
            es.employment_status,
            es.employment_type,
            es.work_arrangement,
            es.fte,
            es.base_salary,
            es.target_bonus,
            es.total_compensation,
            es.total_labor_cost,
            es.currency_code,
            es.tenure_months,
            es.span_of_control,
            es.is_people_manager,
            es.created_at,
            es.base_salary_usd,
            es.total_compensation_usd,
            es.total_labor_cost_usd,
            es.compa_ratio
           FROM employee_snapshots es
             JOIN latest l ON es.snapshot_date = l.snapshot_date
        )
 SELECT max(snapshot_date) AS as_of,
        CASE
            WHEN tenure_months < 12 THEN '<1 year'::text
            WHEN tenure_months < 36 THEN '1-2 years'::text
            WHEN tenure_months < 60 THEN '3-4 years'::text
            WHEN tenure_months < 120 THEN '5-9 years'::text
            ELSE '10+ years'::text
        END AS tenure_band,
        CASE
            WHEN tenure_months < 12 THEN 1
            WHEN tenure_months < 36 THEN 2
            WHEN tenure_months < 60 THEN 3
            WHEN tenure_months < 120 THEN 4
            ELSE 5
        END AS tenure_sort,
    count(DISTINCT employee_id)::integer AS headcount,
    round(sum(fte), 1) AS fte
   FROM current_snapshot
  GROUP BY (
        CASE
            WHEN tenure_months < 12 THEN '<1 year'::text
            WHEN tenure_months < 36 THEN '1-2 years'::text
            WHEN tenure_months < 60 THEN '3-4 years'::text
            WHEN tenure_months < 120 THEN '5-9 years'::text
            ELSE '10+ years'::text
        END), (
        CASE
            WHEN tenure_months < 12 THEN 1
            WHEN tenure_months < 36 THEN 2
            WHEN tenure_months < 60 THEN 3
            WHEN tenure_months < 120 THEN 4
            ELSE 5
        END);

ALTER TABLE public."applications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."benchmark_metrics" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."calendar" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."candidates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."career_preferences" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."certifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."company_events" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."company_profile" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."compensation" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."compensation_bands" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."compensation_job_release_v1" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."contingent_assignments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."contingent_workers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."cost_centers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."countries" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."critical_roles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."data_quality_results" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."employee_absences" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."employee_certifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."employee_demographics" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."employee_goals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."employee_learning" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."employee_movements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."employee_skills" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."employee_snapshots" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."employees" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."external_labor_observations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."external_labor_series" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."external_occupations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."fx_rates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."hires" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."internal_job_applications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."interviews" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."job_families" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."job_functions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."job_levels" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."job_occupation_mapping" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."job_onet_mapping" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."job_profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."job_skill_requirements" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."labor_costs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."learning_courses" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."legal_entities" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."locations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."market_compensation" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."market_demand" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."market_skills" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."market_supply" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."metric_definitions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."offers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."onet_essential_skills" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."onet_occupations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."onet_software_skills" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."org_units" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pay_adjustments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."performance_reviews" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."position_plans" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."position_snapshots" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."positions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."recruiters" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."recruiting_sources" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."requisitions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."scenario_assumptions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."separations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."skills" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."succession_plans" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."successor_candidates" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."survey_questions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."survey_responses" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."survey_scores" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."surveys" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."synthetic_business_unit_targets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."synthetic_country_comp_factors" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."synthetic_country_targets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."synthetic_function_comp_factors" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."synthetic_history_targets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."synthetic_level_compensation" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."synthetic_level_targets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."synthetic_location_targets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."talent_ratings" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."workforce_budgets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."workforce_plans" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."workforce_scenarios" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO succession_aggregate_owner;

GRANT SELECT ("employee_id") ON public."employees" TO succession_aggregate_owner;

GRANT SELECT ("employment_status") ON public."employees" TO succession_aggregate_owner;

GRANT SELECT ("source_system") ON public."employees" TO succession_aggregate_owner;

GRANT SELECT ("position_id") ON public."positions" TO succession_aggregate_owner;

GRANT SELECT ("job_profile_id") ON public."positions" TO succession_aggregate_owner;

GRANT SELECT ("incumbent_employee_id") ON public."positions" TO succession_aggregate_owner;

GRANT SELECT ("position_status") ON public."positions" TO succession_aggregate_owner;

GRANT SELECT ("source_system") ON public."positions" TO succession_aggregate_owner;

GRANT SELECT ("critical_role_id") ON public."critical_roles" TO succession_aggregate_owner;

GRANT SELECT ("job_profile_id") ON public."critical_roles" TO succession_aggregate_owner;

GRANT SELECT ("active") ON public."critical_roles" TO succession_aggregate_owner;

GRANT SELECT ("job_profile_id") ON public."job_profiles" TO succession_aggregate_owner;

GRANT SELECT ("active") ON public."job_profiles" TO succession_aggregate_owner;

GRANT SELECT ("succession_plan_id") ON public."succession_plans" TO succession_aggregate_owner;

GRANT SELECT ("position_id") ON public."succession_plans" TO succession_aggregate_owner;

GRANT SELECT ("assessment_date") ON public."succession_plans" TO succession_aggregate_owner;

GRANT SELECT ("successor_candidate_id") ON public."successor_candidates" TO succession_aggregate_owner;

GRANT SELECT ("succession_plan_id") ON public."successor_candidates" TO succession_aggregate_owner;

GRANT SELECT ("employee_id") ON public."successor_candidates" TO succession_aggregate_owner;

GRANT SELECT ("readiness") ON public."successor_candidates" TO succession_aggregate_owner;

CREATE POLICY "succession_public_summary_owner_select" ON public."critical_roles" FOR SELECT TO succession_aggregate_owner USING (true);

CREATE POLICY "succession_public_summary_owner_select" ON public."job_profiles" FOR SELECT TO succession_aggregate_owner USING (true);

CREATE POLICY "succession_public_summary_owner_select" ON public."positions" FOR SELECT TO succession_aggregate_owner USING (true);

CREATE POLICY "succession_public_summary_owner_select" ON public."employees" FOR SELECT TO succession_aggregate_owner USING (true);

CREATE POLICY "succession_public_summary_owner_select" ON public."succession_plans" FOR SELECT TO succession_aggregate_owner USING (true);

CREATE POLICY "succession_public_summary_owner_select" ON public."successor_candidates" FOR SELECT TO succession_aggregate_owner USING (true);

GRANT CREATE ON SCHEMA public TO succession_aggregate_owner;

ALTER VIEW public."succession_coverage_public_summary_v1" OWNER TO succession_aggregate_owner;

REVOKE CREATE ON SCHEMA public FROM succession_aggregate_owner;

CREATE OR REPLACE FUNCTION public.dashboard_overview_filtered(p_country_code text DEFAULT NULL::text, p_org_code text DEFAULT NULL::text, p_level_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

with

selected_org as (
    select org_unit_id
    from public.org_units
    where org_code = p_org_code
    limit 1
),

selected_level as (
    select job_level_id
    from public.job_levels
    where level_code = p_level_code
    limit 1
),

filtered_snapshots as materialized (

    select
        es.snapshot_date,
        es.employee_id,
        es.fte,
        es.total_labor_cost_usd

    from public.employee_snapshots es

    where
        es.snapshot_date between
            date '2024-01-31'
            and date '2026-09-30'

        and (
            p_country_code is null

            or es.location_id in (
                select l.location_id
                from public.locations l
                where l.country_code =
                    p_country_code
            )
        )

        and (
            p_org_code is null

            or es.org_unit_id = (
                select org_unit_id
                from selected_org
            )
        )

        and (
            p_level_code is null

            or es.job_level_id = (
                select job_level_id
                from selected_level
            )
        )
),

trend as (

    select

        snapshot_date,

        count(*)::integer
            as headcount,

        coalesce(
            round(sum(fte), 1),
            0
        )
            as fte,

        coalesce(
            round(
                sum(total_labor_cost_usd),
                2
            ),
            0
        )
            as labor_cost_usd

    from filtered_snapshots

    group by snapshot_date
),

current_snapshot as (

    select

        coalesce(
            max(headcount),
            0
        )::integer
            as headcount,

        coalesce(
            max(fte),
            0
        )
            as fte,

        coalesce(
            max(labor_cost_usd),
            0
        )
            as labor_cost_usd

    from trend

    where snapshot_date =
        date '2026-09-30'
),

average_2026_headcount as (

    select
        avg(headcount::numeric)
            as avg_headcount

    from trend

    where snapshot_date between
        date '2026-01-31'
        and date '2026-09-30'
),

voluntary_separations as (

    select
        count(*)::numeric
            as separations

    from public.separations s

    join public.employees e
        on e.employee_id =
           s.employee_id

    join public.positions p
        on p.position_code =
           regexp_replace(
               e.employee_number,
               '^E',
               'P'
           )

    where

        s.separation_date between
            date '2026-01-01'
            and date '2026-09-30'

        and s.separation_type =
            'voluntary'

        and (
            p_country_code is null

            or e.home_location_id in (
                select l.location_id
                from public.locations l
                where l.country_code =
                    p_country_code
            )
        )

        and (
            p_org_code is null

            or e.current_org_unit_id = (
                select org_unit_id
                from selected_org
            )
        )

        and (
            p_level_code is null

            or p.job_level_id = (
                select job_level_id
                from selected_level
            )
        )
),

open_positions as (

    select
        count(*)::integer
            as open_positions

    from public.positions p

    where

        p.position_status =
            'vacant'

        and (
            p_country_code is null

            or p.location_id in (
                select l.location_id
                from public.locations l
                where l.country_code =
                    p_country_code
            )
        )

        and (
            p_org_code is null

            or p.org_unit_id = (
                select org_unit_id
                from selected_org
            )
        )

        and (
            p_level_code is null

            or p.job_level_id = (
                select job_level_id
                from selected_level
            )
        )
),

country_options as (

    select
        jsonb_agg(
            jsonb_build_object(
                'value',
                country_code,

                'label',
                country_name
            )
            order by country_name
        )
            as options

    from public.countries

    where active = true
),

org_options as (

    select
        jsonb_agg(
            jsonb_build_object(
                'value',
                org_code,

                'label',
                org_name
            )
            order by org_name
        )
            as options

    from public.org_units

    where org_type =
        'business_unit'
),

level_options as (

    select
        jsonb_agg(
            jsonb_build_object(
                'value',
                level_code,

                'label',
                level_name
            )
            order by level_rank
        )
            as options

    from public.job_levels
)

select

    jsonb_build_object(

        'overview',

        jsonb_build_object(

            'snapshot_date',
            date '2026-09-30',

            'headcount',
            cs.headcount,

            'fte',
            cs.fte,

            'voluntary_turnover_ytd_pct',

            coalesce(
                round(
                    (
                        vs.separations
                        /
                        nullif(
                            ah.avg_headcount,
                            0
                        )
                    ) * 100,
                    1
                ),
                0
            ),

            'labor_cost_usd',
            cs.labor_cost_usd,

            'open_positions',
            op.open_positions
        ),


        'trend',

        coalesce(
            (
                select
                    jsonb_agg(
                        jsonb_build_object(

                            'snapshot_date',
                            t.snapshot_date,

                            'headcount',
                            t.headcount,

                            'fte',
                            t.fte

                        )
                        order by
                            t.snapshot_date
                    )

                from trend t
            ),

            '[]'::jsonb
        ),


        'filter_options',

        jsonb_build_object(

            'countries',
            coalesce(
                co.options,
                '[]'::jsonb
            ),

            'business_units',
            coalesce(
                oo.options,
                '[]'::jsonb
            ),

            'levels',
            coalesce(
                lo.options,
                '[]'::jsonb
            )
        )
    )

from current_snapshot cs

cross join average_2026_headcount ah

cross join voluntary_separations vs

cross join open_positions op

cross join country_options co

cross join org_options oo

cross join level_options lo;

$function$
;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC,anon,authenticated,service_role;

COMMIT;
