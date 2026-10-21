/** Fixed aggregate/dimension reads only. No employee, candidate or requisition records leave PostgreSQL. */
const schema='demo9847_v2';
const fit=`WITH current_people AS (
 SELECT employee_id,job_profile_id FROM ${schema}.employee_snapshots WHERE snapshot_date=DATE '2026-09-30' AND employment_status='active'
), preferred AS (
 SELECT p.desired_job_profile_id AS job_profile_id,c.employee_id,c.job_profile_id=p.desired_job_profile_id AS incumbent
 FROM ${schema}.career_preferences p JOIN current_people c USING(employee_id) WHERE p.last_updated<=DATE '2026-09-30'
), requirements AS (
 SELECT r.job_profile_id,r.skill_id,r.required_proficiency,s.skill_code,s.skill_name,
 (SELECT count(*)::int FROM ${schema}.learning_courses l WHERE l.skill_id=r.skill_id AND l.active) active_course_count,
 (SELECT min(duration_hours) FROM ${schema}.learning_courses l WHERE l.skill_id=r.skill_id AND l.active AND l.duration_hours>0) shortest_active_course_hours
 FROM ${schema}.job_skill_requirements r JOIN ${schema}.skills s USING(skill_id) WHERE r.importance='required' AND s.active
), gaps AS (
 SELECT p.job_profile_id,p.employee_id,r.skill_code,r.skill_name,r.required_proficiency,r.active_course_count,r.shortest_active_course_hours,
 sk.proficiency IS NULL AS unknown_profile,CASE WHEN sk.proficiency IS NULL THEN NULL ELSE greatest(0,r.required_proficiency-sk.proficiency) END AS shortfall
 FROM preferred p JOIN requirements r USING(job_profile_id)
 LEFT JOIN ${schema}.employee_skill_latest sk ON sk.employee_id=p.employee_id AND sk.skill_id=r.skill_id AND sk.last_validated_date<=DATE '2026-09-30'
 WHERE NOT p.incumbent
), person_fit AS (
 SELECT job_profile_id,employee_id,count(*)FILTER(WHERE unknown_profile)::int unknown_skills,count(*)FILTER(WHERE shortfall>0)::int gap_count,
 sum(shortfall)::int total_shortfall,count(*)FILTER(WHERE shortfall>0 AND active_course_count>0)::int gaps_with_course
 FROM gaps GROUP BY job_profile_id,employee_id
)`;
const metric=`WITH metrics AS (
 SELECT requisition_id,job_profile_code,requisition_status,external_internal,opened_date,closed_date,start_date,time_to_fill_days,
 applicants,advanced_candidates,interviews,offers,accepted_offers,
 opened_date+time_to_fill_days AS accepted_date
 FROM ${schema}.ta_requisition_metrics
), recent AS (
 SELECT *,count(*)OVER(PARTITION BY requisition_id) duplicate_count FROM metrics
 WHERE requisition_status='filled' AND external_internal='external' AND closed_date BETWEEN DATE '2025-10-01' AND DATE '2026-09-30'
), timing AS (
 SELECT *,duplicate_count=1 AND opened_date IS NOT NULL AND time_to_fill_days>=0 AND accepted_date<=closed_date AND accepted_date<=DATE '2026-09-30' AS accepted_valid
 FROM recent
), paired AS (
 SELECT *,accepted_valid AND start_date>=accepted_date AND start_date<=DATE '2026-09-30' AS start_valid FROM timing
)`;
const distribution=(value,condition)=>`jsonb_build_object('valid_sample_count',count(*)FILTER(WHERE ${condition}),
 'p25_days',CASE WHEN count(*)FILTER(WHERE ${condition})>=5 THEN round((percentile_cont(0.25)WITHIN GROUP(ORDER BY ${value})FILTER(WHERE ${condition}))::numeric,1) END,
 'median_days',CASE WHEN count(*)FILTER(WHERE ${condition})>=5 THEN round((percentile_cont(0.5)WITHIN GROUP(ORDER BY ${value})FILTER(WHERE ${condition}))::numeric,1) END,
 'p75_days',CASE WHEN count(*)FILTER(WHERE ${condition})>=5 THEN round((percentile_cont(0.75)WITHIN GROUP(ORDER BY ${value})FILTER(WHERE ${condition}))::numeric,1) END)`;
export const TALENT_QUERIES=Object.freeze({
 talent_catalog:`SELECT j.job_profile_id AS id,j.job_profile_code AS code,j.job_profile_name AS name,j.description,j.active,
 (SELECT count(*)::int FROM ${schema}.employee_snapshots e WHERE e.snapshot_date=DATE '2026-09-30' AND e.job_profile_id=j.job_profile_id) AS current_headcount,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('skill_code',s.skill_code,'name',s.skill_name,'requiredProficiency',r.required_proficiency,'importance',r.importance)ORDER BY s.skill_code),'[]') FROM ${schema}.job_skill_requirements r JOIN ${schema}.skills s USING(skill_id) WHERE r.job_profile_id=j.job_profile_id AND s.active) AS requirements
 FROM ${schema}.job_profiles j WHERE j.active ORDER BY j.job_profile_code`,
 talent_integrity:`SELECT
 (SELECT count(*) FROM ${schema}.employee_snapshots WHERE snapshot_date=DATE '2026-09-30' AND employment_status='active') AS active_headcount,
 (SELECT count(*)-count(DISTINCT employee_id) FROM ${schema}.employee_snapshots WHERE snapshot_date=DATE '2026-09-30') AS duplicate_snapshot_people,
 (SELECT count(*) FROM ${schema}.career_preferences) AS preferences,
 (SELECT count(*)-count(DISTINCT employee_id) FROM ${schema}.career_preferences) AS duplicate_preferences,
 (SELECT count(*) FROM ${schema}.career_preferences p LEFT JOIN ${schema}.employee_snapshots s ON s.employee_id=p.employee_id AND s.snapshot_date=DATE '2026-09-30' LEFT JOIN ${schema}.job_profiles j ON j.job_profile_id=p.desired_job_profile_id WHERE s.employee_id IS NULL OR j.job_profile_id IS NULL OR NOT j.active OR p.last_updated>DATE '2026-09-30' OR p.last_updated IS NULL) AS invalid_preferences,
 (SELECT count(*) FROM ${schema}.employee_skills WHERE last_validated_date>DATE '2026-09-30' OR last_validated_date IS NULL OR proficiency NOT BETWEEN 1 AND 5 OR proficiency IS NULL) AS invalid_skill_profiles,
 (SELECT count(*) FROM ${schema}.employee_skill_latest sk JOIN ${schema}.employee_snapshots e ON e.employee_id=sk.employee_id AND e.snapshot_date=DATE '2026-09-30') AS active_skill_profiles,
 (SELECT count(*) FROM ${schema}.job_skill_requirements WHERE required_proficiency NOT BETWEEN 1 AND 5 OR required_proficiency IS NULL OR importance<>'required') AS invalid_requirements,
 (SELECT count(*)-count(DISTINCT (job_profile_id,skill_id)) FROM ${schema}.job_skill_requirements) AS duplicate_requirements,
 (SELECT count(*) FROM ${schema}.job_onet_mapping) AS mappings,
 (SELECT count(*) FROM ${schema}.onet_occupations) AS occupations,
 (SELECT count(*) FROM ${schema}.onet_essential_skills) AS external_skill_ratings,
 (SELECT count(*) FROM ${schema}.onet_software_skills) AS external_software_examples`,
 talent_fit:`${fit}
 SELECT j.job_profile_code,
 (SELECT count(*)::int FROM preferred p WHERE p.job_profile_id=j.job_profile_id) AS active_preferences,
 (SELECT count(*)::int FROM preferred p WHERE p.job_profile_id=j.job_profile_id AND incumbent) AS incumbents,
 count(f.employee_id)::int AS eligible,
 count(*)FILTER(WHERE f.employee_id IS NOT NULL AND unknown_skills>0)::int AS unknown_profiles,
 count(*)FILTER(WHERE unknown_skills=0 AND gap_count=0)::int AS all_thresholds_met,
 count(*)FILTER(WHERE unknown_skills=0 AND gap_count BETWEEN 1 AND 2 AND total_shortfall<=2)::int AS within_gap_rule,
 count(*)FILTER(WHERE unknown_skills=0 AND gap_count>0 AND (gap_count>2 OR total_shortfall>2))::int AS beyond_gap_rule,
 count(*)FILTER(WHERE unknown_skills=0 AND gap_count BETWEEN 1 AND 2 AND total_shortfall<=2 AND gaps_with_course=gap_count)::int AS fully_course_covered,
 count(*)FILTER(WHERE unknown_skills=0 AND gap_count BETWEEN 1 AND 2 AND total_shortfall<=2 AND gaps_with_course>0 AND gaps_with_course<gap_count)::int AS partly_course_covered,
 count(*)FILTER(WHERE unknown_skills=0 AND gap_count BETWEEN 1 AND 2 AND total_shortfall<=2 AND gaps_with_course=0)::int AS no_course_coverage
 FROM ${schema}.job_profiles j LEFT JOIN person_fit f USING(job_profile_id) WHERE j.active GROUP BY j.job_profile_id,j.job_profile_code ORDER BY j.job_profile_code`,
 talent_gaps:`${fit}
 SELECT j.job_profile_code,r.skill_code,r.skill_name,r.required_proficiency,r.active_course_count,r.shortest_active_course_hours,
 count(*)FILTER(WHERE f.unknown_skills=0 AND f.gap_count BETWEEN 1 AND 2 AND f.total_shortfall<=2 AND g.shortfall>0)::int AS candidates_below_requirement,
 coalesce(sum(g.shortfall)FILTER(WHERE f.unknown_skills=0 AND f.gap_count BETWEEN 1 AND 2 AND f.total_shortfall<=2 AND g.shortfall>0),0)::int AS total_shortfall
 FROM ${schema}.job_profiles j JOIN requirements r USING(job_profile_id)
 LEFT JOIN gaps g ON g.job_profile_id=j.job_profile_id AND g.skill_code=r.skill_code
 LEFT JOIN person_fit f ON f.job_profile_id=g.job_profile_id AND f.employee_id=g.employee_id
 WHERE j.active GROUP BY j.job_profile_code,r.skill_code,r.skill_name,r.required_proficiency,r.active_course_count,r.shortest_active_course_hours ORDER BY j.job_profile_code,r.skill_code`,
 role_recruiting:`${metric}
 SELECT j.job_profile_code,
 count(m.requisition_id)::int AS requisitions,
 count(*)FILTER(WHERE m.requisition_status='open' AND m.opened_date<=DATE '2026-09-30')::int AS open_requisitions,
 ${['applicants','advanced_candidates','interviews','offers'].map(k=>`coalesce(sum(m.${k})FILTER(WHERE m.requisition_status='open' AND m.opened_date<=DATE '2026-09-30'),0)::int AS open_${k}`).join(',')},
 count(*)FILTER(WHERE m.requisition_status='filled' AND m.external_internal='internal' AND m.closed_date<=DATE '2026-09-30')::int AS internal_fills,
 count(*)FILTER(WHERE m.requisition_status='filled' AND m.external_internal='external' AND m.closed_date<=DATE '2026-09-30')::int AS external_fills,
 ${['applicants','offers','accepted_offers'].map(k=>`coalesce(sum(m.${k})FILTER(WHERE m.requisition_status='filled' AND m.external_internal='external' AND m.closed_date<=DATE '2026-09-30'),0)::int AS external_${k}`).join(',')},
 min(m.closed_date)FILTER(WHERE m.requisition_status='filled' AND m.external_internal='external' AND m.closed_date<=DATE '2026-09-30') AS evidence_start,
 percentile_cont(0.5)WITHIN GROUP(ORDER BY m.time_to_fill_days)FILTER(WHERE m.requisition_status='filled' AND m.external_internal='external' AND m.closed_date<=DATE '2026-09-30') AS median_time_to_fill_days,
 count(*)FILTER(WHERE m.requisition_status='filled' AND m.external_internal='external' AND m.closed_date BETWEEN DATE '2025-10-01' AND DATE '2026-09-30')::int AS recent_external_fills
 FROM ${schema}.job_profiles j LEFT JOIN metrics m USING(job_profile_code) WHERE j.active GROUP BY j.job_profile_code ORDER BY j.job_profile_code`,
 role_recruiting_monthly:`SELECT j.job_profile_code,to_char(month,'YYYY-MM-01') AS month,count(m.requisition_id)::int AS external_fills
 FROM ${schema}.job_profiles j CROSS JOIN generate_series(DATE '2025-10-01',DATE '2026-09-01',INTERVAL '1 month')month
 LEFT JOIN ${schema}.ta_requisition_metrics m ON m.job_profile_code=j.job_profile_code AND m.requisition_status='filled' AND m.external_internal='external' AND m.closed_date>=month AND m.closed_date<month+INTERVAL '1 month'
 WHERE j.active GROUP BY j.job_profile_code,month ORDER BY j.job_profile_code,month`,
 role_recruiting_timing:`${metric}
 SELECT j.job_profile_code,count(p.requisition_id)::int AS eligible_rows,count(DISTINCT p.requisition_id)::int AS distinct_requisitions,
 count(DISTINCT p.requisition_id)FILTER(WHERE p.duplicate_count>1)::int AS duplicate_requisitions_excluded,
 count(*)FILTER(WHERE p.duplicate_count=1 AND NOT coalesce(p.accepted_valid,false))::int AS missing_or_invalid_acceptance,
 count(*)FILTER(WHERE p.accepted_valid AND (p.start_date IS NULL OR p.start_date<p.accepted_date))::int AS missing_or_invalid_start,
 count(*)FILTER(WHERE p.accepted_valid AND p.start_date>DATE '2026-09-30')::int AS future_starts_excluded,
 ${distribution('p.time_to_fill_days','p.accepted_valid')} AS opening_to_accepted_offer,
 ${distribution('p.start_date-p.accepted_date','p.start_valid')} AS accepted_offer_to_start,
 ${distribution('p.start_date-p.opened_date','p.start_valid')} AS opening_to_start
 FROM ${schema}.job_profiles j LEFT JOIN paired p USING(job_profile_code) WHERE j.active GROUP BY j.job_profile_code ORDER BY j.job_profile_code`,
 role_recruiting_integrity:`SELECT count(*)::int AS metric_rows,count(DISTINCT requisition_id)::int AS distinct_requisitions,
 count(*)FILTER(WHERE opened_date>DATE '2026-09-30' OR closed_date>DATE '2026-09-30' OR start_date>DATE '2026-09-30' OR closed_date<opened_date OR time_to_fill_days<0)::int AS chronology_errors,
 count(*)FILTER(WHERE applicants IS NULL OR advanced_candidates IS NULL OR interviews IS NULL OR offers IS NULL OR accepted_offers IS NULL OR applicants<0 OR advanced_candidates<0 OR interviews<0 OR offers<0 OR accepted_offers<0 OR accepted_offers>offers)::int AS invalid_metrics,
 count(*)FILTER(WHERE requisition_status='filled' AND (external_internal IS NULL OR external_internal NOT IN ('external','internal')))::int AS unknown_fill_class
 FROM ${schema}.ta_requisition_metrics`,
});
