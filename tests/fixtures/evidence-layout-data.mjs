// Populated fictional layout fixtures, not observed people data or a survey release.
import {workforce,attrition,survey,talent,career} from './theme-audit-data.mjs';
import {scopeDashboard} from './home-scope-evidence.mjs';
import {runScenarioModel} from '../../lib/scenario-engine.ts';
const rows=Array.from({length:6},(_,i)=>i);
const names=['Synthetic Research and Product Engineering','Synthetic Customer Operations and Support','Synthetic Finance and Corporate Services','Synthetic Global Delivery and Partnerships','Synthetic Digital Platforms and Infrastructure','Synthetic Learning and Organizational Development'];
const defaults={annual_growth_pct:2,salary_inflation_pct:3,annual_attrition_pct:12,fill_rate_pct:90,productivity_hiring_reduction_pct:5};
const points=Array.from({length:12},(_,i)=>({planning_month:`2027-${String(i+1).padStart(2,'0')}-01`,planned_headcount:1000+i*10,planned_fte:980+i*10,planned_hires:15,planned_exits:5,planned_labor_cost_usd:10000000+i*100000}));
const skillRows=rows.map(i=>({skill_id:i+1,skill_code:`FIXTURE-${i}`,skill_name:names[i]+' analytical capability',skill_category:i%2?'Technical':'AI',employees_in_roles_requiring_skill:100+i*20,employees_with_observed_proficiency:80+i*10,employees_meeting_requirement:50+i*10,employees_below_or_missing_requirement:50+i*10,avg_required_proficiency:4,avg_observed_proficiency:2.5,avg_proficiency_gap:1.5,profile_coverage_pct:80,requirement_met_pct:50,avg_requirement_weight:1}));
const skills={as_of:'2026-09-30',summary:{active_skills:6,current_workforce:5000,skills_with_demand:6,skills_below_60_pct:6,skills_below_75_pct:6,weighted_requirement_met_pct:50,average_profile_coverage_pct:80,onet_mapped_job_profiles:10,total_job_profiles:20},largest_gaps:skillRows,highest_demand:skillRows,strongest_coverage:skillRows};
const dimension=(i,code='ENG-26')=>({survey_code:code,survey_name:'Synthetic layout survey',survey_type:'engagement',question_code:'Q'+i,dimension:names[i],question_text:'Fictional question for layout only.',employee_respondents:100,candidate_respondents:null,separation_respondents:null,avg_score:3.5+i/10,favorable_pct:60+i});
const fixtures={
 '/api/workforce':{...structuredClone(workforce),business_units:rows.map(i=>({org_code:'BU-'+i,org_name:names[i],headcount:500+i*20,fte:495+i*20,people_managers:40,avg_span_of_control:8,avg_tenure_years:3})),levels:rows.map(i=>({level_code:'L'+i,level_name:names[i]+' level',level_rank:i,headcount:500,fte:495,people_managers:40,avg_tenure_years:3})),tenure:rows.map(i=>({tenure_band:`${i*2}–${i*2+2} years`,tenure_sort:i,headcount:500+i*20,fte:495+i*20}))},
 '/api/attrition':{...structuredClone(attrition),business_units:rows.map(i=>({org_code:'BU-'+i,org_name:names[i],exits:20,voluntary_exits:15,regrettable_exits:4,voluntary_turnover_ytd_pct:5+i})),levels:rows.map(i=>({level_code:'L'+i,level_name:names[i]+' level',level_rank:i,exits:20,voluntary_exits:15,regrettable_exits:4})),reasons:rows.map(i=>({separation_reason:names[i]+' fictional reason',separation_type:'voluntary',exits:10+i,pct_of_exits:10+i}))},
 '/api/talent-acquisition':{...structuredClone(talent),business_units:rows.map(i=>({org_code:'BU-'+i,org_name:names[i],open_positions:10+i,hires:20+i,avg_time_to_fill_days:40+i})),sources:rows.map(i=>({source_code:'SRC-'+i,source_name:names[i]+' source',applications:100+i*20,hires:10+i,application_to_hire_pct:10})),recruiters:rows.map(i=>({recruiter_name:'Synthetic Recruiter '+i,region:'Fictional region '+i,specialty:names[i],open_requisitions:10+i,avg_time_to_fill_days:40+i}))},
 '/api/survey-sentiment':{...structuredClone(survey),exit_reasons:rows.map(i=>({primary_reason:names[i]+' fictional exit feedback',exits:10,pct_of_exit_responses:10})),exit_dimensions:rows.map(i=>({...dimension(i,'EXIT'),employee_respondents:null,separation_respondents:90})),engagement_dimensions:rows.map(i=>dimension(i)),pulse_dimensions:rows.map(i=>dimension(i,'PULSE-26')),manager_dimensions:rows.map(i=>dimension(i,'MAN-26')),onboarding_dimensions:['ONB-30','ONB-60','ONB-90'].flatMap(code=>rows.map(i=>dimension(i,code))),business_units:rows.map(i=>({org_code:'BU-'+i,org_name:names[i],respondents:100,avg_score:3.5,favorable_pct:60+i}))},
 '/api/skills':skills,
 '/api/career-growth-mobility':{...structuredClone(career),composition:['promotion','lateral_move','transfer'].map((movement_type,i)=>({movement_type,events:30+i*10,distinct_employees:25+i*10,share_pct:25+i*10})),level_transitions:['promotion','lateral_move','transfer'].flatMap(movement_type=>rows.map(i=>({movement_type,from_level:'Synthetic specialist level '+i,to_level:'Synthetic senior specialist level '+(i+1),events:10+i})))},
 '/api/workforce-planning':{scenarios:['Baseline','Growth'].map((scenario_name,i)=>({scenario_name,scenario_type:i?'growth':'baseline',description:'Fictional company layout scenario; no forecast or commitment.',assumptions:[{assumption_name:'fixture_scope',assumption_value:null,assumption_text:'Synthetic layout inputs only.'}],points:points.map(p=>({...p,planned_headcount:p.planned_headcount+i*50}))}))},
 '/api/finance':{as_of:'2026-09-30',current:{headcount:5000,fte:4990,labor_cost_usd:510000,cost_per_fte_usd:100,vacant_positions:20,estimated_vacancy_cost_exposure_usd:2000},by_business_unit:[],scenarios:[]},
 '/api/business-unit-scenario':{defaults,business_units:[]},
 '/api/position-modeling':{as_of:'2026-09-30',planning_month:'2026-10-01',current:{current_positions:5100,filled_positions:5080,vacant_positions:20,planned_positions:5100,frozen_positions:0,closed_positions:0,vacancy_rate_pct:1},scenarios:[]},
 '/api/compensation-ranges':{jobs:[],levels:[],combinations:[]},
};
export function evidenceLayoutPayload(path,query='',body=null){
 if(path==='/api/dashboard')return scopeDashboard(query);
 if(path==='/api/scenario-modeler'){
  const model=runScenarioModel({asOf:'2026-09-30',startingHeadcount:1000,baselinePoints:points,defaults,assumptions:body?.assumptions??defaults});
  const segments=rows.map(i=>({segment_code:'SEG-'+i,segment_name:names[i],baseline_headcount:100,modeled_headcount:110,headcount_delta_vs_baseline:10,baseline_labor_cost_usd:100000,modeled_labor_cost_usd:110000,labor_cost_delta_vs_baseline_usd:10000}));
  return {...model,segment_breakdown:{planning_month:'2027-12-01',allocation_method:'Fictional segment rows for layout; not reconciled planning evidence.',business_units:segments,job_families:segments,reconciliation:{}}};
 }
 return fixtures[path]??null;
}
