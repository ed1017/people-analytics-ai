/** Aggregate-only local reads. Existing views and sealed data remain unchanged. */
export const PLANNING_COLUMNS=Object.freeze({
 scenario_defaults:'as_of baseline_annual_growth_pct baseline_salary_inflation_pct baseline_annual_attrition_pct baseline_fill_rate_pct baseline_productivity_hiring_reduction_pct'.split(' '),
 scenario_org:'planning_month org_code org_name planned_headcount planned_fte planned_hires planned_exits planned_labor_cost_usd'.split(' '),
 scenario_family:'planning_month family_code family_name planned_headcount planned_labor_cost_usd'.split(' '),
 structural_inventory:'org_code org_name level_code level_name level_rank job_profile_code job_profile_name current_positions filled_positions vacant_positions planned_headcount planned_labor_cost_usd annual_cost_per_position open_requisition_vacancies on_hold_requisition_vacancies uncovered_vacancies'.split(' '),
 structural_requirements:'job_profile_code skill_code skill_name skill_category'.split(' '),
 response_requirements:'job_profile_code skill_code skill_name skill_category required_proficiency importance weight'.split(' '),
 response_recruiting:'skill_code external_filled_requisitions internal_fills_excluded median_open_to_accepted_days'.split(' '),
 structural_supply:'skill_code employees_with_skill'.split(' '),
 structural_signals:'skill_code active_course_count avg_course_duration_hours enrolled_learners in_progress_learners completed_learners_ytd mobility_candidates historical_filled_requisitions median_time_to_fill_days total_contingent_records active_contingent_workers avg_active_bill_rate'.split(' '),
});
const views={scenario_defaults:'scenario_modeler_defaults',scenario_org:'workforce_scenario_by_org',scenario_family:'workforce_scenario_by_job_family',structural_inventory:'position_action_structural_inventory',structural_requirements:'position_skill_requirement_map',structural_supply:'skills_current_supply',structural_signals:'workforce_response_strategy_signals'};
const ordering={scenario_org:'planning_month,org_code',scenario_family:'planning_month,family_code',structural_inventory:'org_code,level_code,job_profile_code',structural_requirements:'job_profile_code,skill_code',structural_supply:'skill_code',structural_signals:'skill_code'};
export const PLANNING_QUERIES=Object.freeze({
 response_requirements:'SELECT job_profile_code,skill_code,skill_name,skill_category,required_proficiency,importance,weight FROM demo9847_v2.position_skill_requirement_map ORDER BY job_profile_code,skill_code',
 response_recruiting:`SELECT s.skill_code,count(DISTINCT m.requisition_id) FILTER(WHERE m.external_internal='external')::int AS external_filled_requisitions,
 count(DISTINCT m.requisition_id) FILTER(WHERE m.external_internal='internal')::int AS internal_fills_excluded,
 percentile_cont(0.5) WITHIN GROUP(ORDER BY m.time_to_fill_days) FILTER(WHERE m.external_internal='external') AS median_open_to_accepted_days
 FROM demo9847_v2.skills s LEFT JOIN demo9847_v2.position_skill_requirement_map r USING(skill_code)
 LEFT JOIN demo9847_v2.ta_requisition_metrics m ON m.job_profile_code=r.job_profile_code AND m.requisition_status='filled' AND m.closed_date<=DATE '2026-09-30'
 WHERE s.active GROUP BY s.skill_code ORDER BY s.skill_code`,
 ...Object.fromEntries(Object.entries(views).map(([key,view])=>[key,`SELECT ${PLANNING_COLUMNS[key].join(',')} FROM demo9847_v2.${view}${['scenario_org','scenario_family'].includes(key)?" WHERE scenario_name='Baseline'":''}${ordering[key]?' ORDER BY '+ordering[key]:''}`])),
 scenario_history: `SELECT count(*)::int AS months,min(snapshot_date) AS first_date,max(snapshot_date) AS last_date,avg(headcount) AS average_headcount,
 (SELECT count(*)::int FROM demo9847_v2.separations WHERE separation_date>=DATE '2026-01-01' AND separation_date<=DATE '2026-09-30') AS exits
 FROM demo9847_v2.dashboard_headcount_trend WHERE snapshot_date>=DATE '2026-01-31' AND snapshot_date<=DATE '2026-09-30'`,
});
