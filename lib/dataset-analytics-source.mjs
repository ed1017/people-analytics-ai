/** Fixed aggregate reads of the sealed LOCAL physical dataset. No remote client,
 * DDL, raw employee projection or dynamic request-supplied relation names.
 * New projections are code-versioned derivatives; they never rewrite the seal.
 */
import {deepFreeze, exact} from './dataset-demo-contracts.mjs';
import {DOMAIN_QUERIES} from './dataset-domain-queries.mjs';
import {PLANNING_QUERIES} from './dataset-planning-queries.mjs';
import {TALENT_QUERIES} from './dataset-talent-queries.mjs';
export const ANALYTICS_COLUMNS = deepFreeze({
  "attrition_business_unit_summary": [
    "org_code",
    "org_name",
    "exits",
    "voluntary_exits",
    "regrettable_exits",
    "voluntary_turnover_ytd_pct"
  ],
  "attrition_current_summary": [
    "as_of",
    "total_exits",
    "voluntary_exits",
    "involuntary_exits",
    "regrettable_exits",
    "retirements",
    "total_turnover_ytd_pct",
    "voluntary_turnover_ytd_pct",
    "annualized_voluntary_turnover_pct",
    "regrettable_share_of_voluntary_pct"
  ],
  "attrition_level_summary": [
    "level_code",
    "level_name",
    "level_rank",
    "exits",
    "voluntary_exits",
    "regrettable_exits"
  ],
  "attrition_monthly_trend": [
    "month",
    "total_exits",
    "voluntary_exits",
    "involuntary_exits",
    "regrettable_exits",
    "monthly_turnover_pct",
    "monthly_voluntary_turnover_pct"
  ],
  "attrition_reason_summary": [
    "separation_reason",
    "separation_type",
    "exits",
    "pct_of_exits"
  ],
  "attrition_tenure_summary": [
    "tenure_band",
    "tenure_sort",
    "exits",
    "voluntary_exits",
    "regrettable_exits"
  ],
  "dashboard_headcount_trend": [
    "snapshot_date",
    "headcount",
    "fte"
  ],
  "finance_current_summary": [
    "org_unit_id",
    "org_code",
    "org_name",
    "org_type",
    "headcount",
    "fte",
    "labor_cost_usd",
    "cost_per_fte_usd",
    "vacant_positions",
    "estimated_vacancy_cost_exposure_usd"
  ],
  "position_action_structural_inventory": [
    "org_code",
    "job_profile_code",
    "level_code",
    "level_rank"
  ],
  "talent_acquisition_business_unit_summary": [
    "org_code",
    "org_name",
    "open_requisitions",
    "open_positions",
    "applications",
    "hires",
    "avg_time_to_fill_days",
    "application_to_hire_pct"
  ],
  "talent_acquisition_current_summary": [
    "as_of",
    "applications",
    "interviewed_applications",
    "offered_applications",
    "hires",
    "application_to_interview_pct",
    "interview_to_offer_pct",
    "offer_to_hire_pct",
    "application_to_hire_pct",
    "offer_acceptance_pct",
    "open_requisitions",
    "open_positions",
    "avg_time_to_fill_days",
    "median_time_to_fill_days",
    "avg_open_req_age_days",
    "median_open_req_age_days",
    "open_reqs_over_60_days",
    "internal_hires",
    "external_hires"
  ],
  "talent_acquisition_monthly_summary": [
    "month",
    "applications",
    "interviewed_applications",
    "offers",
    "hires"
  ],
  "talent_acquisition_recruiter_summary": [
    "recruiter_name",
    "region",
    "specialty",
    "total_requisitions",
    "open_requisitions",
    "open_positions",
    "filled_requisitions",
    "avg_time_to_fill_days"
  ],
  "talent_acquisition_source_summary": [
    "source_code",
    "source_name",
    "source_category",
    "applications",
    "hires",
    "application_to_hire_pct"
  ],
  "workforce_business_unit_summary": [
    "as_of",
    "org_code",
    "org_name",
    "headcount",
    "fte",
    "people_managers",
    "avg_span_of_control",
    "avg_tenure_years"
  ],
  "workforce_country_summary": [
    "as_of",
    "country_code",
    "country_name",
    "headcount",
    "fte",
    "avg_tenure_years"
  ],
  "workforce_current_summary": [
    "as_of",
    "headcount",
    "fte",
    "people_managers",
    "avg_span_of_control",
    "full_time_headcount",
    "non_full_time_headcount",
    "remote_headcount",
    "hybrid_headcount",
    "onsite_headcount",
    "avg_tenure_years"
  ],
  "workforce_level_summary": [
    "as_of",
    "level_code",
    "level_name",
    "level_rank",
    "headcount",
    "fte",
    "people_managers",
    "avg_tenure_years"
  ],
  "workforce_movement_summary": [
    "month",
    "movement_type",
    "movements"
  ],
  "workforce_tenure_summary": [
    "as_of",
    "tenure_band",
    "tenure_sort",
    "headcount",
    "fte"
  ],
  "job_catalog": [
    "job_profile_code",
    "job_profile_name"
  ]
});
const selects = Object.fromEntries(Object.entries(ANALYTICS_COLUMNS).map(([name, fields]) => [name, `SELECT ${fields.join(',')} FROM demo9847_v2.${name === 'job_catalog' ? 'job_profiles' : name}`]));

selects.dashboard = 'SELECT demo9847_v2.dashboard_overview_filtered($1::text,$2::text,$3::text) AS payload';
selects.skill_catalog_counts = `SELECT
 (SELECT count(*) FROM demo9847_v2.skills WHERE active) AS active_skills,
 (SELECT count(*) FROM demo9847_v2.job_profiles WHERE active) AS total_job_profiles,
 (SELECT count(*) FROM demo9847_v2.job_onet_mapping) AS onet_mapped_job_profiles`;
selects.range_bands = `SELECT j.job_profile_code AS job,l.level_code AS level,
 min(b.minimum_salary) AS minimum,min(b.midpoint_salary) AS midpoint,min(b.maximum_salary) AS maximum,
 min(b.effective_date)::text AS effectiveFrom,
 (min(b.minimum_salary)=max(b.minimum_salary) AND min(b.midpoint_salary)=max(b.midpoint_salary)
 AND min(b.maximum_salary)=max(b.maximum_salary) AND min(b.effective_date)=max(b.effective_date)
 AND bool_and(b.currency_code='USD')) AS common_country_policy
 FROM demo9847_v2.compensation_bands b JOIN demo9847_v2.job_profiles j USING(job_profile_id)
 JOIN demo9847_v2.job_levels l USING(job_level_id) GROUP BY j.job_profile_code,l.level_code ORDER BY 1,2`;
selects.planning_catalog = `SELECT w.scenario_name,w.scenario_type,w.description,
 coalesce((SELECT jsonb_agg(jsonb_build_object('assumption_name',a.assumption_name,'assumption_value',a.assumption_value,'assumption_text',a.assumption_text) ORDER BY a.assumption_name)
 FROM demo9847_v2.scenario_assumptions a WHERE a.workforce_scenario_id=w.workforce_scenario_id),'[]'::jsonb) AS assumptions
 FROM demo9847_v2.workforce_scenarios w`;
selects.survey_waves = `SELECT s.survey_code,s.survey_name,s.launch_date,s.close_date,
 a.eligibility_date AS denominator_snapshot_date,a.eligible AS eligible_population,
 a.valid_respondents AS respondents,a.responded AS response_records,a.invalid_respondents,
 round(100.0*a.valid_respondents/nullif(a.eligible,0),1) AS participation_pct,
 round((SELECT avg(r.mean_answer) FROM demo9847_v2.survey_respondent_v2 r WHERE r.survey_id=s.survey_id AND r.valid_items>=2),2) AS avg_score,
 round(a.favorable_pct,1) AS favorable_pct
 FROM demo9847_v2.survey_aggregate_v2 a JOIN demo9847_v2.surveys s USING(survey_id)
 ORDER BY s.close_date`;
selects.survey_dimensions = `SELECT s.survey_code,s.survey_name,s.survey_type,q.question_code,q.dimension,q.question_text,
 count(DISTINCT r.employee_id)::int AS employee_respondents,count(DISTINCT r.candidate_id)::int AS candidate_respondents,
 count(DISTINCT r.separation_id)::int AS separation_respondents,round(avg(r.numeric_response),2) AS avg_score,
 round(100.0*count(*) FILTER(WHERE r.numeric_response>=4)/nullif(count(r.numeric_response),0),1) AS favorable_pct
 FROM demo9847_v2.surveys s JOIN demo9847_v2.survey_questions q USING(survey_id)
 JOIN demo9847_v2.survey_responses r ON r.survey_question_id=q.survey_question_id
 JOIN demo9847_v2.survey_respondent_v2 v ON v.survey_id=s.survey_id AND v.employee_id=r.employee_id AND v.valid_items>=2
 WHERE s.close_date=DATE '2026-09-30' AND r.numeric_response IS NOT NULL
 GROUP BY s.survey_code,s.survey_name,s.survey_type,q.question_code,q.dimension,q.question_text ORDER BY q.question_code`;
selects.survey_business_units = `SELECT o.org_code,o.org_name,count(*)::int AS respondents,
 round(avg(r.mean_answer),2) AS avg_score,round(100*avg(r.favorable_share),1) AS favorable_pct
 FROM demo9847_v2.survey_respondent_v2 r JOIN demo9847_v2.surveys v USING(survey_id)
 JOIN demo9847_v2.employee_snapshots e ON e.employee_id=r.employee_id AND e.snapshot_date=v.close_date
 JOIN demo9847_v2.org_units o USING(org_unit_id)
 WHERE v.close_date=DATE '2026-09-30' AND r.valid_items>=2 GROUP BY o.org_code,o.org_name ORDER BY favorable_pct,o.org_code`;
selects.survey_inventory = `SELECT s.survey_type,count(DISTINCT s.survey_id)::int AS waves,
 count(r.survey_response_id)::int AS response_items
 FROM demo9847_v2.surveys s LEFT JOIN demo9847_v2.survey_responses r USING(survey_id)
 GROUP BY s.survey_type ORDER BY s.survey_type`;
selects.career_summary = `SELECT min(m.movement_date) AS first_recorded_date,max(m.movement_date) AS last_recorded_date,
 count(*)::int AS total_recorded_events,count(DISTINCT m.employee_id)::int AS distinct_recorded_employees,
 count(DISTINCT m.employee_id) FILTER(WHERE e.employment_status='active')::int AS currently_active_linked_employees,
 count(DISTINCT m.employee_id) FILTER(WHERE e.employment_status<>'active')::int AS currently_nonactive_linked_employees,
 count(*) FILTER(WHERE e.source_system IS NOT NULL)::int AS synthetic_linked_events,
 count(*) FILTER(WHERE m.from_position_id IS NOT NULL)::int AS origin_position_recorded_events,
 count(*) FILTER(WHERE m.from_position_id IS NULL)::int AS origin_position_missing_events,
 count(*) FILTER(WHERE m.to_position_id IS NOT NULL)::int AS destination_position_recorded_events,
 count(DISTINCT date_trunc('month',m.movement_date))::int AS recorded_months,
 false AS latest_month_partial
 FROM demo9847_v2.employee_movements m JOIN demo9847_v2.employees e USING(employee_id)
 WHERE m.movement_date<=DATE '2026-09-30'`;
selects.career_monthly = `SELECT date_trunc('month',movement_date)::date AS month,count(*)::int AS events,
 count(*) FILTER(WHERE movement_type='promotion')::int AS promotions,
 count(*) FILTER(WHERE movement_type='lateral_move')::int AS lateral_moves,
 count(*) FILTER(WHERE movement_type='transfer')::int AS transfers,false AS is_partial
 FROM demo9847_v2.employee_movements WHERE movement_date<=DATE '2026-09-30' GROUP BY 1 ORDER BY 1`;
selects.career_transitions = `SELECT m.movement_type,f.level_code AS from_level,t.level_code AS to_level,
 f.level_rank AS from_rank,t.level_rank AS to_rank,count(*)::int AS events
 FROM demo9847_v2.employee_movements m JOIN demo9847_v2.job_levels f ON f.job_level_id=m.from_job_level_id
 JOIN demo9847_v2.job_levels t ON t.job_level_id=m.to_job_level_id
 WHERE m.movement_date<=DATE '2026-09-30' GROUP BY 1,2,3,4,5 ORDER BY 1,6 DESC,4,5`;
const preferences = `WITH active AS (SELECT e.employee_id,e.current_org_unit_id FROM demo9847_v2.employees e
 JOIN demo9847_v2.employee_snapshots s USING(employee_id) WHERE s.snapshot_date=DATE '2026-09-30'),
 pref AS (SELECT p.employee_id,p.desired_job_profile_id,p.desired_location_id,p.relocation_willingness,p.career_interest,p.last_updated
 FROM demo9847_v2.career_preferences p JOIN active a USING(employee_id)) `;
selects.preferences_summary = preferences + `SELECT
 (SELECT count(*) FROM active)::int AS active_employees,count(*)::int AS preference_rows,
 count(DISTINCT p.employee_id)::int AS employees_with_preference,
 (SELECT count(*) FROM (SELECT employee_id FROM pref GROUP BY employee_id HAVING count(*)>1)x)::int AS employees_with_multiple_preference_rows,
 count(*) FILTER(WHERE p.relocation_willingness IS NOT NULL)::int AS known_relocation_records,
 count(*) FILTER(WHERE p.relocation_willingness)::int AS relocation_willing_employees,
 count(*) FILTER(WHERE p.desired_job_profile_id IS NULL)::int AS missing_desired_profile,
 count(*) FILTER(WHERE p.desired_location_id IS NULL)::int AS missing_desired_location,
 count(*) FILTER(WHERE p.relocation_willingness IS NULL)::int AS missing_relocation_willingness,
 count(*) FILTER(WHERE nullif(trim(p.career_interest),'') IS NULL)::int AS missing_career_interest,
 count(*) FILTER(WHERE p.desired_job_profile_id IS NOT NULL AND (j.job_profile_id IS NULL OR NOT j.active))::int AS unmatched_profile_references,
 count(*) FILTER(WHERE p.desired_location_id IS NOT NULL AND (l.location_id IS NULL OR NOT l.active))::int AS unmatched_location_references,
 (SELECT count(*) FROM active a LEFT JOIN demo9847_v2.org_units o ON o.org_unit_id=a.current_org_unit_id WHERE o.org_unit_id IS NULL OR NOT o.active)::int AS unmatched_current_org_references,
 min(p.last_updated) AS earliest_preference_update,max(p.last_updated) AS latest_preference_update
 FROM pref p LEFT JOIN demo9847_v2.job_profiles j ON j.job_profile_id=p.desired_job_profile_id
 LEFT JOIN demo9847_v2.locations l ON l.location_id=p.desired_location_id`;
selects.preferences_interests = preferences + `SELECT trim(career_interest) AS code,trim(career_interest) AS label,count(*)::int AS employees
 FROM pref WHERE nullif(trim(career_interest),'') IS NOT NULL GROUP BY 1 ORDER BY employees DESC,code`;
selects.preferences_roles = preferences + `SELECT j.job_profile_code AS code,j.job_profile_name AS label,count(*)::int AS employees
 FROM pref p JOIN demo9847_v2.job_profiles j ON j.job_profile_id=p.desired_job_profile_id AND j.active GROUP BY 1,2 ORDER BY employees DESC,label LIMIT 15`;
selects.preferences_locations = preferences + `SELECT l.location_code,l.location_name,l.city,l.country_code,count(*)::int AS employees
 FROM pref p JOIN demo9847_v2.locations l ON l.location_id=p.desired_location_id AND l.active GROUP BY 1,2,3,4 ORDER BY employees DESC,location_name LIMIT 15`;
selects.preferences_orgs = preferences + `SELECT o.org_code,o.org_name,count(*)::int AS active_employees,
 count(p.employee_id)::int AS employees_with_preference,round(100.0*count(p.employee_id)/nullif(count(*),0),1) AS preference_coverage_pct
 FROM active a JOIN demo9847_v2.org_units o ON o.org_unit_id=a.current_org_unit_id AND o.active
 LEFT JOIN pref p USING(employee_id) GROUP BY 1,2 ORDER BY employees_with_preference DESC,active_employees DESC,o.org_name`;

// January is the first observed opening stock. Flow history starts after it;
// accepted-offer hire_date and internal moves must never inflate external starts.
selects.projection_monthly = `SELECT t.snapshot_date,t.headcount,
 (SELECT count(*)::int FROM demo9847_v2.hires h WHERE h.external_internal='external' AND h.start_date>=date_trunc('month',t.snapshot_date)::date AND h.start_date<=t.snapshot_date) AS external_starts,
 (SELECT count(*)::int FROM demo9847_v2.separations s WHERE s.separation_date>=date_trunc('month',t.snapshot_date)::date AND s.separation_date<=t.snapshot_date) AS exits,
 (SELECT count(*)::int FROM demo9847_v2.employee_movements m WHERE m.movement_type='promotion' AND m.movement_date>=date_trunc('month',t.snapshot_date)::date AND m.movement_date<=t.snapshot_date) AS promotions,
 (SELECT count(*)::int FROM demo9847_v2.employee_movements m WHERE m.movement_type='transfer' AND m.movement_date>=date_trunc('month',t.snapshot_date)::date AND m.movement_date<=t.snapshot_date) AS transfers
 FROM demo9847_v2.dashboard_headcount_trend t WHERE t.snapshot_date>DATE '2024-01-31' AND t.snapshot_date<=DATE '2026-09-30' ORDER BY t.snapshot_date`;

export const ANALYTICS_QUERIES = deepFreeze(Object.fromEntries(Object.entries({...selects,...DOMAIN_QUERIES,...PLANNING_QUERIES,...TALENT_QUERIES}).map(([key, select]) => [key,
 `SELECT s.dataset_id,s.dataset_sha256 AS dataset_digest,coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (${select})x),'[]'::jsonb) AS data FROM demo9847_release.dataset_seal s WHERE s.singleton`,
])));
export function createLocalAnalyticsSource({query, datasetId, bundleDigest}) {
  if (typeof query !== 'function' || datasetId !== 'workforce-demo-9847-2026-09-30-local-final-v1' || !/^[a-f0-9]{64}$/.test(bundleDigest)) throw Error('Pinned local analytics binding required');
  return Object.freeze({datasetId, bundleDigest, async read(name, params = []) {
    if (!Object.hasOwn(ANALYTICS_QUERIES, name)) throw Error('Unknown aggregate');
    if (name === 'dashboard' ? params.length !== 3 || params.some(x => x !== null && (typeof x !== 'string' || !/^[A-Za-z0-9-]{1,40}$/.test(x))) : params.length !== 0) throw Error('Unsupported aggregate arguments');
    const result = await query(ANALYTICS_QUERIES[name], params);
    const row = result?.rows?.[0];
    if (result?.error || result?.rows?.length !== 1 || !exact(row, ['dataset_id','dataset_digest','data']) || row.dataset_id !== datasetId || row.dataset_digest !== bundleDigest || !Array.isArray(row.data)) throw Error('Mixed or unavailable physical aggregate');
    return deepFreeze(structuredClone(row.data));
  }});
}
