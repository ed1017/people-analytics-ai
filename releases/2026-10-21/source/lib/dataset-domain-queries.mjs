/** Fixed, aggregate-only derivatives of the existing local seal. No DDL or row export. */
const courseStats = `WITH courses AS (
 SELECT skill_id,count(*)::int AS active_course_count,
 min(duration_hours) FILTER(WHERE duration_hours>0) AS shortest_catalog_duration_hours,
 round(avg(duration_hours) FILTER(WHERE duration_hours>0),1) AS avg_catalog_duration_hours
 FROM demo9847_v2.learning_courses WHERE active GROUP BY skill_id
)`;
export const DOMAIN_QUERIES = Object.freeze({
 learning_courses: courseStats + ` SELECT s.skill_id,s.skill_code,
 coalesce(c.active_course_count,0) AS active_course_count,
 c.shortest_catalog_duration_hours,c.avg_catalog_duration_hours
 FROM demo9847_v2.skills s LEFT JOIN courses c USING(skill_id) WHERE s.active ORDER BY s.skill_code`,
 learning_jobs: courseStats + ` SELECT j.job_profile_code,j.job_profile_name,
 count(r.skill_id)::int AS required_skill_count,
 count(r.skill_id) FILTER(WHERE c.active_course_count>0)::int AS required_skills_with_active_pathway,
 coalesce(sum(c.active_course_count),0)::int AS active_course_count,
 min(c.shortest_catalog_duration_hours) AS shortest_catalog_duration_hours
 FROM demo9847_v2.job_profiles j
 LEFT JOIN demo9847_v2.job_skill_requirements r ON r.job_profile_id=j.job_profile_id AND r.importance='required'
 LEFT JOIN courses c USING(skill_id) WHERE j.active
 GROUP BY j.job_profile_code,j.job_profile_name ORDER BY j.job_profile_code`,
 position_current: `SELECT org_code,org_name,level_code,level_name,level_rank,
 current_positions,filled_positions,vacant_positions,planned_positions,frozen_positions,closed_positions
 FROM demo9847_v2.position_modeling_current_summary ORDER BY org_code,level_rank`,
 position_plan: `SELECT scenario_name,scenario_type,planning_month,org_code,org_name,level_code,level_name,level_rank,
 planned_positions,planned_fte,planned_hires,planned_exits,planned_labor_cost_usd
 FROM demo9847_v2.position_modeling_scenario_summary WHERE planning_month=DATE '2027-12-01' ORDER BY org_code,level_rank`,
 position_integrity: `WITH s AS (SELECT * FROM demo9847_v2.position_snapshots WHERE snapshot_date=DATE '2026-09-30'),
 e AS (SELECT * FROM demo9847_v2.employee_snapshots WHERE snapshot_date=DATE '2026-09-30' AND employment_status='active')
 SELECT (SELECT count(*) FROM s)::int AS snapshot_positions,
 (SELECT count(DISTINCT position_id) FROM s)::int AS distinct_positions,
 (SELECT count(*) FROM s WHERE position_status='filled')::int AS filled_positions,
 (SELECT count(DISTINCT incumbent_employee_id) FROM s WHERE position_status='filled')::int AS distinct_incumbents,
 (SELECT count(*) FROM s WHERE position_status='vacant')::int AS vacant_positions,
 (SELECT count(*) FROM e)::int AS active_employees,
 (SELECT count(*) FROM demo9847_v2.positions WHERE position_status='closed')::int AS closed_positions,
 (SELECT count(*) FROM demo9847_v2.positions WHERE position_created_date IS NULL OR position_created_date>DATE '2026-09-30'
 OR position_status='closed' AND (position_closed_date IS NULL OR position_closed_date>DATE '2026-09-30' OR position_closed_date<position_created_date))::int AS chronology_errors,
 (SELECT count(*) FROM s FULL JOIN demo9847_v2.positions p USING(position_id)
 WHERE p.position_id IS NULL OR (s.position_id IS NULL AND p.position_status<>'closed') OR
 (s.position_id IS NOT NULL AND (s.position_status,s.incumbent_employee_id,s.org_unit_id,s.job_profile_id,s.job_level_id,s.location_id)
 IS DISTINCT FROM (p.position_status,p.incumbent_employee_id,p.org_unit_id,p.job_profile_id,p.job_level_id,p.location_id)))::int AS inventory_mismatches,
 (SELECT count(*) FROM s FULL JOIN e ON e.employee_id=s.incumbent_employee_id
 WHERE (s.position_status='filled' OR e.employee_id IS NOT NULL) AND
 (s.position_status IS DISTINCT FROM 'filled' OR e.employee_id IS NULL OR
 (s.position_id,s.org_unit_id,s.job_profile_id,s.job_level_id,s.location_id)
 IS DISTINCT FROM (e.position_id,e.org_unit_id,e.job_profile_id,e.job_level_id,e.location_id)))::int AS assignment_mismatches`,
 succession_counts: `WITH critical AS (
 SELECT DISTINCT job_profile_id FROM demo9847_v2.critical_roles WHERE active
 ), filled AS (
 SELECT p.position_id FROM demo9847_v2.position_snapshots p JOIN critical c USING(job_profile_id)
 WHERE p.snapshot_date=DATE '2026-09-30' AND p.position_status='filled'
 ), plans AS (
 SELECT p.position_id,p.succession_plan_id,p.assessment_date,f.illustrative_ready_flag
 FROM demo9847_v2.succession_plans p LEFT JOIN demo9847_release.demo_succession_flags f USING(succession_plan_id)
 ) SELECT (SELECT count(*) FROM critical)::int AS critical_job_profiles,
 (SELECT count(*) FROM filled)::int AS filled_critical_positions,
 (SELECT count(*) FROM filled WHERE EXISTS(SELECT 1 FROM plans WHERE plans.position_id=filled.position_id))::int AS positions_with_recorded_plan,
 (SELECT count(*) FROM filled WHERE EXISTS(SELECT 1 FROM plans WHERE plans.position_id=filled.position_id AND illustrative_ready_flag))::int AS positions_with_ready_now,
 (SELECT count(*) FROM plans)::int AS plan_rows,
 (SELECT count(*) FROM demo9847_release.demo_succession_flags)::int AS flag_rows,
 (SELECT count(*) FROM plans WHERE NOT EXISTS(SELECT 1 FROM filled WHERE filled.position_id=plans.position_id)
 OR assessment_date<>DATE '2026-09-30' OR illustrative_ready_flag IS NULL)::int AS invalid_plans,
 (SELECT count(*) FROM demo9847_release.demo_succession_flags WHERE policy<>'illustrative-succession-plan-flags-v2-candidate'
 OR source_label<>'Illustrative demo plan flags; not assessed or predicted individual readiness')::int AS invalid_flag_labels`,
});
