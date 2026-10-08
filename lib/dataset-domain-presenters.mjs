import {DEMO_CUTOFF,DEMO_SUCCESSION_LABEL,exact} from './dataset-demo-contracts.mjs';
import {validateSuccessionPublicSummary} from './succession-public-contract.mjs';

const must=(value,message)=>{if(!value)throw Error(message);};
const count=n=>Number.isSafeInteger(n)&&n>=0;
const finite=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const label=v=>typeof v==='string'&&v.length>0&&v.length<300;
const sum=(rows,key)=>rows.reduce((n,r)=>n+r[key],0);
const round=(n,places=1)=>Math.round(n*10**places)/10**places;
const unique=(rows,key)=>new Set(rows.map(key)).size===rows.length;
const totals=(rows,keys)=>Object.fromEntries(keys.map(k=>[k,sum(rows,k)]));
const duration=n=>n===null||finite(n)&&n>0;
const currentCounts='current_positions filled_positions vacant_positions planned_positions frozen_positions closed_positions'.split(' ');
const planCounts='planned_positions planned_hires planned_exits'.split(' ');
const planMetrics=[...planCounts,'planned_fte','planned_labor_cost_usd'];
const dimensions='org_code org_name level_code level_name level_rank'.split(' ');
function grouped(rows,keys,metrics){
 const groups=new Map();
 for(const r of rows){const key=r[keys[0]],prior=groups.get(key)??Object.fromEntries([...keys.map(k=>[k,r[k]]),...metrics.map(k=>[k,0])]);
  for(const k of keys)must(prior[k]===r[k],'Inconsistent dimension label');
  for(const k of metrics)prior[k]+=r[k];groups.set(key,prior);
 }
 return [...groups.values()];
}

/** Only called inside the pinned dataset request. This does not register a runtime provider. */
export function createDomainPresenters({analytics,component,metadata}) {
 async function learning(){
  const [skills,workforce,courses,jobs]=await Promise.all([component('skills'),component('workforce'),analytics.read('learning_courses'),analytics.read('learning_jobs')]);
  must(workforce.data[0]?.headcount===9847,'Learning workforce');
  must(courses.length===5&&unique(courses,r=>r.skill_id)&&unique(courses,r=>r.skill_code),'Learning skill catalog');
  for(const c of courses)must(exact(c,['skill_id','skill_code','active_course_count','shortest_catalog_duration_hours','avg_catalog_duration_hours'])&&label(c.skill_id)&&label(c.skill_code)&&count(c.active_course_count)&&duration(c.shortest_catalog_duration_hours)&&duration(c.avg_catalog_duration_hours)&&
   (c.active_course_count>0||c.shortest_catalog_duration_hours===null&&c.avg_catalog_duration_hours===null),'Learning course aggregate');
  must(jobs.length===50&&unique(jobs,r=>r.job_profile_code),'Learning role catalog');
  for(const j of jobs)must(exact(j,['job_profile_code','job_profile_name','required_skill_count','required_skills_with_active_pathway','active_course_count','shortest_catalog_duration_hours'])&&label(j.job_profile_code)&&label(j.job_profile_name)&&
   ['required_skill_count','required_skills_with_active_pathway','active_course_count'].every(k=>count(j[k]))&&j.required_skills_with_active_pathway<=j.required_skill_count&&j.active_course_count>=j.required_skills_with_active_pathway&&duration(j.shortest_catalog_duration_hours),'Learning role aggregate');
  const skill_pathways=skills.data.filter(r=>r.employees_in_roles_requiring_skill>0&&r.employees_below_or_missing_requirement>0).map(r=>{
   const c=courses.find(c=>c.skill_id===r.skill_id&&c.skill_code===r.skill_code);must(c,'Missing skill catalog mapping');
   return {...Object.fromEntries('skill_id skill_code skill_name skill_category employees_in_roles_requiring_skill employees_below_or_missing_requirement requirement_met_pct'.split(' ').map(k=>[k,r[k]])),
    pathway_available:c.active_course_count>0,active_course_count:c.active_course_count,shortest_catalog_duration_hours:c.shortest_catalog_duration_hours,avg_catalog_duration_hours:c.avg_catalog_duration_hours};
  }).sort((a,b)=>b.employees_below_or_missing_requirement-a.employees_below_or_missing_requirement||a.skill_name.localeCompare(b.skill_name));
  const job_profile_pathways=jobs.map(j=>({...j,pathway_coverage_pct:j.required_skill_count?round(100*j.required_skills_with_active_pathway/j.required_skill_count):0}))
   .sort((a,b)=>b.pathway_coverage_pct-a.pathway_coverage_pct||b.required_skill_count-a.required_skill_count||a.job_profile_name.localeCompare(b.job_profile_name));
  const available=skill_pathways.filter(s=>s.pathway_available).length;
  return {as_of:DEMO_CUTOFF,summary:{current_workforce:9847,current_gap_skills:skill_pathways.length,gap_skills_with_active_pathway:available,
   gap_pathway_coverage_pct:skill_pathways.length?round(100*available/skill_pathways.length):0,active_courses_on_gap_skills:sum(skill_pathways,'active_course_count'),
   active_job_profiles:jobs.length,job_profiles_with_any_pathway:jobs.filter(j=>j.required_skills_with_active_pathway>0).length,
   fully_covered_job_profiles:jobs.filter(j=>j.required_skill_count>0&&j.required_skills_with_active_pathway===j.required_skill_count).length},
   skill_pathways,job_profile_pathways,methodology:[
    'Constructed demo skill profiles, requirements and course catalog; not measured learning outcomes.',
    'Below or missing role requirements are gap signals; missing or stale proficiency is not proof of inability.',
    'Active course mapping establishes catalog availability only, not enrollment, completion, proficiency gain or readiness.',
    'Catalog duration is course time, not time-to-readiness, hiring suitability or promotion eligibility.',
    'Role pathway coverage counts required skills, not ready employees. Employee preferences are separate from assessed readiness.',
    'Only company aggregates are returned; no employee identities or individual rankings.',
   ],data_meta:metadata({sourceLabel:'Constructed demo learning pathways; catalog availability, not assessed readiness or learning gains'})};
 }
 async function positions(){
  const [rows,plans,integrity,workforce,planning]=await Promise.all([analytics.read('position_current'),analytics.read('position_plan'),analytics.read('position_integrity'),component('workforce'),component('planning')]);
  const key=r=>r.org_code+':'+r.level_code;
  must(rows.length>0&&unique(rows,key)&&plans.length===rows.length&&unique(plans,key),'Position group completeness');
  for(const r of rows)must(exact(r,[...dimensions,...currentCounts])&&dimensions.filter(k=>k!=='level_rank').every(k=>label(r[k]))&&count(r.level_rank)&&currentCounts.every(k=>count(r[k]))&&r.current_positions===r.filled_positions+r.vacant_positions,'Position current partition');
  for(const r of plans)must(exact(r,['scenario_name','scenario_type','planning_month',...dimensions,...planMetrics])&&r.scenario_name==='Baseline'&&r.scenario_type==='draft_assumption'&&r.planning_month==='2027-12-01'&&
   rows.some(c=>key(c)===key(r)&&dimensions.every(k=>c[k]===r[k]))&&planCounts.every(k=>count(r[k]))&&finite(r.planned_fte)&&finite(r.planned_labor_cost_usd)&&r.planned_fte<=r.planned_positions,'Position draft group');
  const checked=integrity[0];
  must(integrity.length===1&&exact(checked,['snapshot_positions','distinct_positions','filled_positions','distinct_incumbents','vacant_positions','active_employees','closed_positions','chronology_errors','inventory_mismatches','assignment_mismatches'])&&Object.values(checked).every(count),'Position integrity aggregate');
  const current=totals(rows,currentCounts),stock=workforce.data[0],draft=planning.data.find(r=>r.planning_month==='2027-12-01');
  must(checked.inventory_mismatches===0&&checked.assignment_mismatches===0&&checked.chronology_errors===0&&checked.closed_positions===current.closed_positions&&checked.active_employees===9847&&checked.filled_positions===9847&&checked.distinct_incumbents===9847&&
   checked.snapshot_positions===checked.distinct_positions&&checked.snapshot_positions===current.current_positions&&checked.filled_positions===current.filled_positions&&checked.vacant_positions===current.vacant_positions&&
   current.filled_positions===stock.headcount&&current.vacant_positions===stock.open_positions,'Position snapshot/employee reconciliation');
  const planned=totals(plans,planMetrics);
  must(draft&&planned.planned_positions===draft.planned_headcount&&['planned_hires','planned_exits'].every(k=>planned[k]===draft[k])&&Math.abs(planned.planned_fte-draft.planned_fte)<0.011&&Math.abs(planned.planned_labor_cost_usd-draft.planned_labor_cost_usd)<0.011,'Position/workforce draft reconciliation');
  const orgKeys=['org_code','org_name'],levelKeys=['level_code','level_name','level_rank'],inventoryMetrics=['current_positions','filled_positions','vacant_positions'];
  const byOrg=grouped(rows,orgKeys,inventoryMetrics),byLevel=grouped(rows,levelKeys,inventoryMetrics);
  const plannedGroups=(keys,currentGroups)=>grouped(plans,keys,planMetrics).map(r=>{const c=currentGroups.find(c=>c[keys[0]]===r[keys[0]]);must(c,'Missing current position group');return {...r,planned_fte:round(r.planned_fte),planned_labor_cost_usd:round(r.planned_labor_cost_usd,2),current_positions:c.current_positions,net_position_change:r.planned_positions-c.current_positions,...(keys===orgKeys?{vacancy_rate_pct:c.current_positions?round(100*c.vacant_positions/c.current_positions):0}:{})};});
  return {as_of:DEMO_CUTOFF,planning_month:'2027-12-01',current:{...current,vacancy_rate_pct:current.current_positions?round(100*current.vacant_positions/current.current_positions):0,
   by_business_unit:byOrg.sort((a,b)=>b.current_positions-a.current_positions),by_level:byLevel.sort((a,b)=>a.level_rank-b.level_rank)},
   scenarios:[{scenario_name:'Baseline',scenario_type:'draft_assumption',planning_month:'2027-12-01',totals:{...planned,planned_fte:round(planned.planned_fte),planned_labor_cost_usd:round(planned.planned_labor_cost_usd,2),current_positions:current.current_positions,net_position_change:planned.planned_positions-current.current_positions},
    by_business_unit:plannedGroups(orgKeys,byOrg).sort((a,b)=>b.net_position_change-a.net_position_change),by_level:plannedGroups(levelKeys,byLevel).sort((a,b)=>a.level_rank-b.level_rank)}],
   data_meta:metadata({sourceLabel:'Constructed demo position inventory and flat draft assumptions; not approved position actions',
    planningCaveat:`The 2027 draft carries ${planned.planned_positions.toLocaleString('en-US')} filled positions and omits ${current.vacant_positions} current vacancies. The ${planned.planned_positions-current.current_positions} inventory comparison is not an approved closure or headcount reduction. October–December 2026 is unmodeled; no independent forecast validation.`,
    planningAvailabilityLabel:'Local position actions, structural scenarios and company/business-unit what-if calculations are available. Response-plan orchestration and assessed-readiness integrations remain unfinished.',
    unavailable:['response-plan orchestration','assessed-readiness integration']})};
 }
 async function succession(){
  const [release,counts]=await Promise.all([component('succession'),analytics.read('succession_counts')]);
  const validation=validateSuccessionPublicSummary(release.data),c=counts[0];
  must(validation.ok&&release.sourceLabel===DEMO_SUCCESSION_LABEL,'Succession suppression/provenance');
  must(counts.length===1&&exact(c,['critical_job_profiles','filled_critical_positions','positions_with_recorded_plan','positions_with_ready_now','plan_rows','flag_rows','invalid_plans','invalid_flag_labels'])&&Object.values(c).every(count),'Succession aggregate shape');
  must(c.invalid_plans===0&&c.invalid_flag_labels===0&&c.plan_rows===c.positions_with_recorded_plan&&c.flag_rows===c.plan_rows,'Succession chronology/membership/flag integrity');
  for(const k of ['critical_job_profiles','filled_critical_positions','positions_with_recorded_plan','positions_with_ready_now'])if(validation.value[k]!==null)must(c[k]===validation.value[k],'Succession sealed count mismatch');
  // Never rebuild complements from private counts. The frozen suppression projection wins.
  return {...validation.value,data_meta:metadata({sourceLabel:DEMO_SUCCESSION_LABEL,releaseId:release.releaseId,successionSemantics:'illustrative-plan-flags'})};
 }
 return Object.freeze({learning,positions,succession});
}
