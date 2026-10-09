/** Local, user-directed conditional response arithmetic. No legacy loaders or model ports. */
import {DEMO_CUTOFF,exact,plain} from './dataset-demo-contracts.mjs';
import {readPlanningRequest,PlanningRequestError} from './dataset-planning-adapters.mjs';
import {TalentRequestError} from './dataset-talent-adapters.mjs';
import {PLANNING_COLUMNS} from './dataset-planning-queries.mjs';

export const LOCAL_RESPONSE_ROUTES=Object.freeze(['/api/role-workforce-response-plan','/api/workforce-response-plan','/api/workforce-response-portfolio','/api/business-unit-response-allocation']);
const paths=['build','move','buy','borrow','automate'],epsilon=1e-7;
const must=(v,m)=>{if(!v)throw Error(m);};
const req=(v,m)=>{if(!v)throw new PlanningRequestError(m);};
const finite=v=>typeof v==='number'&&Number.isFinite(v),positive=v=>v>epsilon;
const tidy=n=>Math.abs(n)<epsilon?0:n;
const sum=(rows,key)=>rows.reduce((n,r)=>n+r[key],0);
const key=r=>r.org_code+':'+r.job_profile_code;
const label=v=>typeof v==='string'&&v.trim().length>0&&v.length<=120;
const norm=v=>v.trim().toLowerCase();
const pick=(r,keys)=>Object.fromEntries(keys.map(k=>[k,r[k]]));
const total=a=>paths.reduce((n,k)=>n+a[k],0);
const add=rows=>Object.fromEntries(paths.map(k=>[k,rows.reduce((n,r)=>n+r.allocation[k],0)]));
const ratio=(n,d)=>d>0?100*n/d:0;
const coverage=(d,a)=>({raw:total(a),effective:Math.min(d,total(a)),remaining:Math.max(0,d-total(a)),excess:Math.max(0,total(a)-d)});
function allocation(a){
 req(exact(a,paths)&&paths.every(k=>finite(a[k])&&a[k]>=0&&a[k]<=5000),'Each response allocation must contain five finite amounts between 0 and 5000.');
 req(a.borrow===0&&a.automate===0,'Borrow and Automate require evidence that is not supplied by this candidate dataset.');return {...a};
}
function resolve(rows,requested,code,name){const matches=rows.filter(r=>[norm(r[code]),norm(r[name])].includes(norm(requested)));req(matches.length===1,'The requested scope must identify one modeled dimension.');return matches[0];}
function unique(rows,identity,message){req(new Set(rows.map(identity)).size===rows.length,message);}
function planList(plans){req(Array.isArray(plans)&&plans.length>0&&plans.length<=20,'Provide between 1 and 20 role plans.');return plans.map(p=>{req(exact(p,['job_profile','allocation'])&&label(p.job_profile),'Invalid role plan.');return {...p,allocation:allocation(p.allocation)};});}
function validate(path,b){
 req(plain(b),'A response request object is required.');
 if(path==='/api/workforce-response-portfolio'){req(exact(b,['actions','plans']),'Unsupported portfolio fields.');return {...b,plans:planList(b.plans)};}
 if(path==='/api/business-unit-response-allocation'){
  req(Object.keys(b).every(k=>['actions','allocations','role_plans'].includes(k))&&Object.hasOwn(b,'actions')&&Array.isArray(b.allocations)&&b.allocations.length>0&&b.allocations.length<=40,'Provide between 1 and 40 BU-role allocations.');
  return {...b,allocations:b.allocations.map(r=>{req(exact(r,['business_unit','job_profile','allocation'])&&label(r.business_unit)&&label(r.job_profile),'Invalid BU-role allocation.');return {...r,allocation:allocation(r.allocation)};}),role_plans:b.role_plans==null||Array.isArray(b.role_plans)&&b.role_plans.length===0?[]:planList(b.role_plans)};
 }
 const scope=path==='/api/workforce-response-plan'?'skill_code':'job_profile';
 req(exact(b,['actions',scope,'allocation'])&&label(b[scope]),'Invalid response scope.');return {...b,allocation:allocation(b.allocation)};
}
const method=[
 'Allocations are explicit user assumptions. Conditional coverage counts each role unit once, capped at its own demand; it is not confirmed staffing or a forecast.',
 'Assessed readiness, available movers, release capacity, learning effectiveness, time to readiness and future hiring capacity are unknown. Unknowns stay null through every rollup; profile-fit and historical recruiting never supply future capacity.',
 'Internal placements change group membership, not company headcount. Structural position changes and response allocations do not create employment starts, exits or employee records.',
 'Buy fill counts exclude internal movements; skill-level timing is opening to accepted offer. Evidence is company-wide constructed history through September 30, 2026. No future outcomes, employee decisions, requisitions, learning assignments or database changes are executed.',
 'No execution schedule or deadline assessment is supplied here. October–December 2026 remains unmodeled; history cutoff alignment is not independent forecast validation.',
];
const warning='Staffing feasibility is unknown: the constructed profile comparisons, course catalog and recruiting history do not establish assessed readiness or available future capacity.';
function feasibility(){return {status:'not_assessed',overall_feasible:null,assessed_ready_people:null,available_movers:null,release_capacity:null,build_capacity:null,buy_capacity:null,confirmed_coverage:null,time_to_readiness:null,scheduled_coverage:null,deadline_feasible:null};}

/** Dependency for later constraints composition. Checks explicit total caps only.
 * Passing a user cap is not staffing feasibility. Schedule/deadline stay unevaluated.
 */
export function evaluateCandidateAllocationConstraints(target,caps){
 req(exact(target,paths)&&paths.every(k=>finite(target[k])&&target[k]>=0),'Invalid aggregate allocation.');
 req(exact(caps,['max_total_build','max_total_move','max_total_buy'])&&Object.values(caps).every(v=>v===null||finite(v)&&v>=0&&v<=200000),'Only explicit bounded total Build/Move/Buy caps are supported.');
 const checks=['build','move','buy'].filter(p=>caps['max_total_'+p]!==null).map(p=>({constraint_code:'max_total_'+p,actual_value:target[p],limit_value:caps['max_total_'+p],passed:target[p]<=caps['max_total_'+p]+epsilon}));
 return {scope:'allocation_totals_only',user_constraints_satisfied:checks.every(c=>c.passed),hard_constraint_count:checks.length,hard_constraint_breaches:checks.filter(c=>!c.passed).length,hard_constraints:checks,overall_feasible:null,monthly_constraints_satisfied:null,deadline_feasible:null,capacity_feasibility:feasibility()};
}

export function createResponseAdapters({planning,talent,analytics,metadata}){
 const context=()=>metadata({sourceLabel:'Constructed demo response assumptions; staffing feasibility is not assessed',independentForecastValidation:false,coverageSemantics:'conditional-if-executed',readinessSemantics:'not-assessed',schedulingStatus:'not-composed'});
 function common(){return {as_of:DEMO_CUTOFF,capacity_feasibility:feasibility(),data_meta:context()};}
 async function recruiting(c){
  const rows=await analytics.read('response_recruiting');must(Array.isArray(rows)&&rows.length===5&&new Set(rows.map(r=>r.skill_code)).size===5,'Missing external skill recruiting');
  for(const r of rows){const s=c.signals.get(r.skill_code);must(exact(r,PLANNING_COLUMNS.response_recruiting)&&s&&['external_filled_requisitions','internal_fills_excluded'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)&&r.external_filled_requisitions<=4327&&r.internal_fills_excluded<=619&&r.external_filled_requisitions+r.internal_fills_excluded===s.historical_filled_requisitions&&(r.external_filled_requisitions===0?r.median_open_to_accepted_days===null:finite(r.median_open_to_accepted_days)&&r.median_open_to_accepted_days>=0),'Skill external/internal fill partition');}
  return new Map(rows.map(r=>[r.skill_code,r]));
 }
 async function requirements(c){
  const rows=await analytics.read('response_requirements');must(Array.isArray(rows)&&rows.length===150&&new Set(rows.map(r=>r.job_profile_code+':'+r.skill_code)).size===150,'Missing response requirements');
  for(const r of rows)must(exact(r,PLANNING_COLUMNS.response_requirements)&&r.required_proficiency===3&&r.importance==='required'&&r.weight===1&&c.skillRequirements.some(s=>['job_profile_code','skill_code','skill_name','skill_category'].every(k=>s[k]===r[k])),'Invalid response requirements');return rows;
 }
 async function role(c,requested,a,requirements){
  const p=resolve(c.scenario.job_profile_impact,requested,'job_profile_code','job_profile_name');req(positive(p.authorized_position_delta),'The selected role has no positive scenario-created demand.');
  const evidence=await talent.roleEvidence(p.job_profile_code,a.buy),ready=evidence.readiness,buy=evidence.buy;
  must(ready.assessment_status==='not_assessed'&&ready.candidate_pool.role_ready===null&&ready.availability.available_movers===null&&buy.future_capacity.available_hires===null&&ready.job_profile_code===p.job_profile_code&&buy.job_profile_code===p.job_profile_code,'Candidate capacity boundary');
  const skills=requirements.filter(r=>r.job_profile_code===p.job_profile_code).map(r=>{
   const s=c.signals.get(r.skill_code),h=c.external.get(r.skill_code);must(s&&h&&evidence.role.requirements.some(t=>t.skill_code===r.skill_code&&t.requiredProficiency===r.required_proficiency),'Role skill coverage');
   return {...pick(r,['skill_code','skill_name','skill_category','required_proficiency','importance','weight']),build_pathway_available:s.active_course_count>0,...pick(s,['active_course_count','mobility_candidates']),historical_filled_requisitions:h.external_filled_requisitions,median_time_to_fill_days:h.median_open_to_accepted_days,internal_fills_excluded:h.internal_fills_excluded,available_movers:null};
  });must(skills.length===3,'Whole-role requirement completeness');
  const d=tidy(p.authorized_position_delta),v=coverage(d,a);
  return {...common(),job_profile_code:p.job_profile_code,job_profile_name:p.job_profile_name,scenario_created_role_demand:d,allocation:a,planned_role_coverage_if_executed:v.raw,remaining_role_gap_if_executed:v.remaining,overplanned_capacity:v.excess,coverage_pct_if_executed:ratio(v.effective,d),internal_talent_readiness:ready,external_recruiting_feasibility:buy,skill_bundle:skills,evidence_summary:{required_skill_count:skills.length,skills_with_build_pathway:skills.filter(s=>s.build_pathway_available).length,skills_with_move_signal:skills.filter(s=>s.mobility_candidates>0).length,skills_with_buy_history:skills.filter(s=>s.historical_filled_requisitions>0).length},warnings:[warning,...(a.buy>0?buy.warnings:[]),...(v.excess>epsilon?['Excess allocation is contingency and cannot close another role gap.']:[])],methodology:[...method,'Skill-level course, preference and fill counts can overlap across required skills; never sum them as unique people. Separate profile-fit buckets are constructed comparisons, not assessed readiness.']};
 }
 function skill(c,b){
  const s=resolve(c.scenario.response_strategy.skills,b.skill_code,'skill_code','skill_name'),v=coverage(s.modeled_position_gap,b.allocation),h=c.external.get(s.skill_code);must(h,'Skill recruiting coverage');
  req(positive(s.modeled_position_gap),'The selected skill has no positive scenario-widened gap.');
  return {...common(),...pick(s,['skill_code','skill_name','skill_category','modeled_position_gap']),allocation:b.allocation,planned_coverage_if_executed:v.raw,remaining_gap_if_executed:v.remaining,overplanned_capacity:v.excess,coverage_pct_if_executed:ratio(v.effective,s.modeled_position_gap),evidence:{build:pick(s.build,['pathway_available','active_course_count','avg_course_duration_hours','enrolled_learners','in_progress_learners']),move:{mobility_candidates:s.move.mobility_candidates,available_movers:null},buy:{active_recruiting_demand:s.buy.active_recruiting_demand,historical_filled_requisitions:h.external_filled_requisitions,median_time_to_fill_days:h.median_open_to_accepted_days,internal_fills_excluded:h.internal_fills_excluded},borrow:pick(s.borrow,['data_available','active_contingent_workers','avg_active_bill_rate']),automate:pick(s.automate,['data_available','reason'])},warnings:[warning,...(v.excess>epsilon?['Excess skill allocation is contingency.']:[]),...(b.allocation.build>0&&!s.build.pathway_available?['No active course pathway is supplied for this skill.']:[])],methodology:[...method,'One unit is assumed to close one unit of this skill gap. Do not add plans across skills as unique employees, roles or company headcount. Skill mobility counts are preference signals, never assessed or available movers.']};
 }
 function resolvePlans(s,plans){const rows=plans.map(p=>{const r=resolve(s.job_profile_impact,p.job_profile,'job_profile_code','job_profile_name');req(positive(r.authorized_position_delta),'Every planned role needs positive company demand.');return {...p,job_profile:r.job_profile_code};});unique(rows,r=>r.job_profile,'Duplicate role plans, including aliases, are not supported.');return rows;}
 async function portfolio(c,b,requirements){
  const s=c.scenario,plans=resolvePlans(s,b.plans),roles=await Promise.all(plans.map(p=>role(c,p.job_profile,p.allocation,requirements))),positiveRoles=s.job_profile_impact.filter(r=>positive(r.authorized_position_delta)),codes=new Set(plans.map(p=>p.job_profile)),positiveCodes=new Set(positiveRoles.map(p=>p.job_profile_code));
  const unplanned=positiveRoles.filter(r=>!codes.has(r.job_profile_code)).map(r=>({...pick(r,['job_profile_code','job_profile_name']),scenario_created_role_demand:r.authorized_position_delta}));
  const demand=sum(positiveRoles,'authorized_position_delta'),planned=sum(roles,'scenario_created_role_demand'),covered=roles.reduce((n,r)=>n+Math.min(r.scenario_created_role_demand,r.planned_role_coverage_if_executed),0),byBU=new Map();
  for(const r of s.business_unit_job_profile_impact.filter(r=>positiveCodes.has(r.job_profile_code)&&Math.abs(r.authorized_position_delta)>epsilon)){
   const g=byBU.get(r.org_code)??{org_code:r.org_code,org_name:r.org_name,scenario_role_demand_delta:0,portfolio_role_demand_delta:0,roles:[]};
   g.scenario_role_demand_delta+=r.authorized_position_delta;if(codes.has(r.job_profile_code))g.portfolio_role_demand_delta+=r.authorized_position_delta;
   g.roles.push({...pick(r,['job_profile_code','job_profile_name']),scenario_created_role_demand_delta:r.authorized_position_delta,included_in_portfolio:codes.has(r.job_profile_code)});byBU.set(r.org_code,g);
  }
  must(Math.abs(sum([...byBU.values()],'scenario_role_demand_delta')-demand)<epsilon&&Math.abs(sum([...byBU.values()],'portfolio_role_demand_delta')-planned)<epsilon,'Portfolio ownership reconciliation');
  return {...common(),scenario_positive_role_demand:demand,planned_role_demand:planned,unplanned_role_demand:sum(unplanned,'scenario_created_role_demand'),allocation:add(roles),planned_coverage_if_executed:covered,remaining_gap_if_executed:tidy(planned-covered),overplanned_capacity:sum(roles,'overplanned_capacity'),coverage_pct_of_planned_roles:ratio(covered,planned),coverage_pct_of_all_positive_role_demand:ratio(covered,demand),internal_supply:{role_ready:null,near_ready:null,fully_pathway_covered_near_ready:null,available_movers:null,release_capacity:null},recruiting_evidence:{current_open_requisitions:roles.reduce((n,r)=>n+r.external_recruiting_feasibility.current_pipeline.open_requisitions,0),recent_12m_external_fills:roles.reduce((n,r)=>n+r.external_recruiting_feasibility.historical_external.recent_12m_filled_requisitions,0),future_hiring_capacity:null},demand_by_business_unit:[...byBU.values()].sort((a,b)=>a.org_code.localeCompare(b.org_code)),roles,unplanned_roles:unplanned,warnings:[warning,...roles.flatMap(r=>r.warnings.filter(w=>w!==warning).map(w=>r.job_profile_name+': '+w)),...(unplanned.length?['Unplanned roles remain uncovered.']:[])],methodology:[...method,'All plans use one structural scenario. Signed business-unit role changes reconcile to company role demand. Coverage is capped separately for each role; overplanning never covers an unplanned role.','Unknown role readiness and availability remain unknown in the portfolio. Historical recruiting totals partition distinct selected roles; history does not establish future capacity.']};
 }
 async function businessUnits(c,b,requirements){
  const s=c.scenario,positiveRoles=s.job_profile_impact.filter(r=>positive(r.authorized_position_delta)),positiveCodes=new Set(positiveRoles.map(r=>r.job_profile_code)),targets=new Map(resolvePlans(s,b.role_plans).map(p=>[p.job_profile,p.allocation]));
  const resolved=b.allocations.map(a=>{
   const p=resolve(s.job_profile_impact,a.job_profile,'job_profile_code','job_profile_name'),segments=s.business_unit_job_profile_impact.filter(r=>r.job_profile_code===p.job_profile_code),r=resolve(segments,a.business_unit,'org_code','org_name');
   req(positiveCodes.has(p.job_profile_code)&&positive(r.authorized_position_delta),'BU allocation needs positive destination and net-positive company role demand.');return {...r,allocation:a.allocation};
  });unique(resolved,key,'Duplicate BU-role allocations, including aliases, are not supported.');
  const codes=[...new Set(resolved.map(r=>r.job_profile_code))],relevant=s.business_unit_job_profile_impact.filter(r=>positiveCodes.has(r.job_profile_code)),roles=[],warnings=[warning];
  for(const code of codes){
   const r=positiveRoles.find(r=>r.job_profile_code===code),segments=relevant.filter(r=>r.job_profile_code===code),a=add(resolved.filter(r=>r.job_profile_code===code)),v=coverage(r.authorized_position_delta,a),target=targets.get(code)??null,delta=target?Object.fromEntries(paths.map(k=>[k,tidy(a[k]-target[k])])):null;
   const gross=segments.reduce((n,r)=>n+Math.max(0,r.authorized_position_delta),0),contraction=-segments.reduce((n,r)=>n+Math.min(0,r.authorized_position_delta),0);must(Math.abs(gross-contraction-r.authorized_position_delta)<epsilon,'Role contraction partition');
   const reconciled=delta?Object.values(delta).every(n=>Math.abs(n)<epsilon):null;
   if(reconciled===false)warnings.push(r.job_profile_name+': BU allocations do not reconcile to the role target by response type.');
   if(targets.size&&!target)warnings.push(r.job_profile_name+': BU allocation has no supplied role target.');
   roles.push({...pick(r,['job_profile_code','job_profile_name']),enterprise_net_role_demand:r.authorized_position_delta,gross_positive_bu_demand:gross,contraction_offset:contraction,allocation:a,portfolio_target_allocation:target,allocation_delta_vs_portfolio:delta,portfolio_allocation_reconciled:reconciled,effective_coverage_if_executed:v.effective,remaining_net_gap_if_executed:v.remaining,overplanned_capacity:v.excess,role_evidence:await role(c,code,a,requirements)});
  }
  for(const code of targets.keys())if(!codes.includes(code))warnings.push(code+': role target has no BU destination allocation.');
  const business_units=resolved.map(r=>{const v=coverage(r.authorized_position_delta,r.allocation);return {...pick(r,['org_code','org_name','job_profile_code','job_profile_name','allocation']),gross_destination_demand:r.authorized_position_delta,raw_allocated_response:v.raw,effective_destination_coverage:v.effective,destination_gap_before_enterprise_offsets:v.remaining,destination_overallocation:v.excess};});
  const allocated=new Set(resolved.map(key)),unallocated=relevant.filter(r=>positive(r.authorized_position_delta)&&!allocated.has(key(r))).map(r=>({...pick(r,['org_code','org_name','job_profile_code','job_profile_name']),gross_destination_demand:r.authorized_position_delta})),contractions=relevant.filter(r=>r.authorized_position_delta< -epsilon).map(r=>({...pick(r,['org_code','org_name','job_profile_code','job_profile_name']),contraction_delta:r.authorized_position_delta}));
  const demand=sum(positiveRoles,'authorized_position_delta'),gross=relevant.reduce((n,r)=>n+Math.max(0,r.authorized_position_delta),0),offset=-sum(contractions,'contraction_delta'),covered=sum(roles,'effective_coverage_if_executed');must(Math.abs(gross-offset-demand)<epsilon,'Company contraction partition');
  if(unallocated.length)warnings.push('Some positive BU destinations have no allocation. Company contraction offsets do not assign staffing to destinations.');
  for(const r of roles)warnings.push(...r.role_evidence.warnings.filter(w=>w!==warning).map(w=>r.job_profile_name+': '+w));
  for(const r of business_units)if(positive(r.destination_overallocation))warnings.push(r.org_name+' / '+r.job_profile_name+': excess destination allocation is contingency, not additional gap closure.');
  if(positive(offset))warnings.push('BU contractions reduce net authorized-position demand; they do not establish transferable employees or available movers.');
  return {...common(),scenario_net_role_demand:demand,gross_destination_demand:gross,contraction_offset:offset,allocation:add(resolved),effective_coverage_if_executed:covered,remaining_net_gap_if_executed:tidy(demand-covered),overplanned_capacity:sum(roles,'overplanned_capacity'),roles,business_units,unallocated_destinations:unallocated,contractions,warnings,methodology:[...method,'BU allocations assign intended destinations. Move source BU and release approval remain unknown. Gross positive demand minus signed contractions equals net company demand for net-positive roles.','Each response path is reconciled independently to supplied role targets. Matching the grand total cannot hide a Build/Move/Buy mismatch. Effective company coverage is capped per net role and destination coverage per positive BU-role demand.']};
 }
 async function handle(request){
  metadata();try{
   const url=new URL(request.url),path=url.pathname;must(LOCAL_RESPONSE_ROUTES.includes(path),'Unknown response route');req(url.searchParams.size===0,'Response planning does not accept query filters.');
   if(request.method!=='POST')throw new PlanningRequestError('Method not allowed.',405);
   const b=validate(path,await readPlanningRequest(request)),c=await planning.responseContext(b.actions);c.external=await recruiting(c);let data;
   if(path==='/api/workforce-response-plan')data=skill(c,b);
   else{const r=await requirements(c);data=path==='/api/role-workforce-response-plan'?await role(c,b.job_profile,b.allocation,r):path==='/api/workforce-response-portfolio'?await portfolio(c,b,r):await businessUnits(c,b,r);}
   return Response.json(data,{headers:{'Cache-Control':'no-store'}});
  }catch(e){const bad=e instanceof PlanningRequestError||e instanceof TalentRequestError;return Response.json({error:bad?e.message:'Local response inputs or reconciliation are unavailable.'},{status:bad?e.status:503,headers:{'Cache-Control':'no-store'}});}
 }
 return Object.freeze({handle});
}
