/** Conditional schedule arithmetic only. Every capacity/date is a user assumption. */
import {exact,DEMO_CUTOFF} from './dataset-demo-contracts.mjs';
import {PlanningRequestError} from './dataset-planning-adapters.mjs';
export const EXECUTION_PATHS=Object.freeze(['build','move','buy']);
const paths=EXECUTION_PATHS,all=[...paths,'borrow','automate'],scale=1e6,epsilon=1e-7;
const req=(v,m)=>{if(!v)throw new PlanningRequestError(m);};
const must=(v,m)=>{if(!v)throw Error(m);};
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const amount=v=>finite(v)&&v>=0&&v<=200000&&Math.abs(v*scale-Math.round(v*scale))<1e-5;
const units=v=>Math.round(v*scale),value=v=>v/scale;
const empty=()=>Object.fromEntries(all.map(p=>[p,0]));
const sum=a=>paths.reduce((n,p)=>n+a[p],0);
const close=(a,b)=>Math.abs(a-b)<=epsilon;
const key=r=>r.org_code+':'+r.job_profile_code;
const targetKey=r=>key(r)+':'+r.response_type;
const norm=s=>s.trim().toLowerCase();
const label=v=>typeof v==='string'&&v.trim().length>0&&v.length<=120;
const dims=r=>({org_code:r.org_code,org_name:r.org_name,job_profile_code:r.job_profile_code,job_profile_name:r.job_profile_name});
export function executionMonth(v){req(typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v),'Use a valid YYYY-MM execution month.');return Number(v.slice(0,4))*12+Number(v.slice(5))-1;}
const month=i=>`${Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`;
const first=executionMonth(DEMO_CUTOFF.slice(0,7))+1,last=first+35;
function boundedMonth(v){const n=executionMonth(v);req(n>=first&&n<=last,'Execution assumptions must be within October 2026–September 2029.');return n;}
export const CONSTRAINT_FIELDS=Object.freeze(['max_total_build','max_total_move','max_total_buy','max_monthly_build','max_monthly_move','max_monthly_buy','max_monthly_total','deadline_month','required_coverage_pct_by_deadline','require_all_approved_capacity_scheduled']);
export function validateExecutionConstraints(c){
 req(exact(c,CONSTRAINT_FIELDS),'Provide the complete supported constraint object.');
 for(const k of CONSTRAINT_FIELDS.filter(k=>k.startsWith('max_')))req(c[k]===null||amount(c[k]),'Constraint caps must be bounded finite amounts or null.');
 req(typeof c.require_all_approved_capacity_scheduled==='boolean','Schedule completeness must be explicitly true or false.');
 req((c.deadline_month===null)===(c.required_coverage_pct_by_deadline===null),'Deadline month and required coverage must both be supplied or both null.');
 if(c.deadline_month!==null){boundedMonth(c.deadline_month);req(finite(c.required_coverage_pct_by_deadline)&&c.required_coverage_pct_by_deadline>=0&&c.required_coverage_pct_by_deadline<=100,'Required deadline coverage must be between 0 and 100.');}
 return {...c};
}
export function validateExecutionSchedule(schedule){
 req(Array.isArray(schedule)&&schedule.length<=4320,'Provide at most 4320 explicit schedule entries; an empty schedule keeps all targets unscheduled.');
 return schedule.map(r=>{req(exact(r,['business_unit','job_profile','response_type','amount','effective_month'])&&label(r.business_unit)&&label(r.job_profile)&&paths.includes(r.response_type)&&amount(r.amount)&&r.amount>0,'Invalid schedule entry.');boundedMonth(r.effective_month);return {...r};});
}
export function validateSchedulingAssumptions(a){
 if(a===undefined||a===null)return null;
 req(exact(a,['start_month','earliest_effective_months','monthly_capacity'])&&exact(a.earliest_effective_months,paths)&&exact(a.monthly_capacity,paths),'Invalid scheduling assumptions.');
 if(a.start_month!==null)boundedMonth(a.start_month);
 for(const p of paths){const earliest=a.earliest_effective_months[p];if(earliest!==null){boundedMonth(earliest);req(a.start_month===null||executionMonth(earliest)>=executionMonth(a.start_month),'A path cannot become effective before the assumed scheduling start.');}req(a.monthly_capacity[p]===null||amount(a.monthly_capacity[p]),'Assumed monthly capacity must be bounded or null.');}
 return structuredClone(a);
}
function baseContract(base){
 must(base.as_of===DEMO_CUTOFF&&base.capacity_feasibility?.status==='not_assessed'&&base.capacity_feasibility.available_movers===null,'Candidate execution boundary');
 req(base.business_units.every(r=>all.every(p=>amount(r.allocation[p]))),'Execution supports capacity amounts with at most six decimals.');
 for(const p of all)must(close(base.business_units.reduce((n,r)=>n+r.allocation[p],0),base.allocation[p]),'Execution target partition');
}
const method=[
 'This is conditional arithmetic on user-authored effective dates or explicit scheduling assumptions. It does not assess staffing feasibility, promise completion dates or execute workforce changes.',
 'Capacity remains effective after its assumed month. Real attrition, failed training, source-team release, hiring concurrency and future availability are not supplied by the dataset.',
 'Each BU-role-path target caps the amount that can contribute. Excess is retained separately, unscheduled targets remain visible, and company coverage is capped separately for each role.',
 'Build and Move do not add company employees. Buy amounts are conditional external starts; this timeline is role capacity, not a workforce headcount forecast. Existing stock, departures and backfills are not implied.',
 'The permissible 36-month assumption window begins after September 2026. October–December 2026 is unmodeled workforce history, even if a user explicitly places conditional capacity in those months.',
];
function context(base){return {capacity_feasibility:{...base.capacity_feasibility},data_meta:{...base.data_meta,sourceLabel:'Constructed demo conditional schedule; capacity and effective months are user assumptions',schedulingStatus:'conditional-assumptions',confirmedCompletionDate:null},confirmed_completion_month:null,execution_cost:null};}

export function composeExecution(base,schedule,{generated=false,horizonEnd=null}={}){
 baseContract(base);if(!generated)validateExecutionSchedule(schedule);else must(schedule.length<=4320,'Bounded generated schedule');
 const targets=base.business_units,consumed=new Map(),entries=schedule.map(r=>{
  const candidates=targets.filter(t=>[norm(t.org_code),norm(t.org_name)].includes(norm(r.business_unit))&&[norm(t.job_profile_code),norm(t.job_profile_name)].includes(norm(r.job_profile)));
  req(candidates.length===1,'A schedule entry must match one allocated BU-role destination.');return {...dims(candidates[0]),response_type:r.response_type,amount:r.amount,effective_month:r.effective_month,target:candidates[0]};
 }).sort((a,b)=>a.effective_month.localeCompare(b.effective_month)||targetKey(a).localeCompare(targetKey(b))||a.amount-b.amount).map(r=>{
  const k=targetKey(r),used=consumed.get(k)??0,available=units(r.target.allocation[r.response_type])-used,n=Math.min(units(r.amount),Math.max(0,available));consumed.set(k,used+n);
  return {...dims(r),response_type:r.response_type,amount:r.amount,effective_month:r.effective_month,effective_amount_within_target:value(n),excess_amount:value(units(r.amount)-n)};
 });
 const partition=(rows,k)=>Object.fromEntries(all.map(p=>[p,value(rows.filter(r=>r.response_type===p).reduce((n,r)=>n+units(r[k]),0))]));
 const scheduled=partition(entries,'effective_amount_within_target'),excess=partition(entries,'excess_amount'),difference=(a,b)=>Object.fromEntries(all.map(p=>[p,value(Math.max(0,units(a[p])-units(b[p])))]));
 const unscheduled=difference(base.allocation,scheduled),business_units=targets.map(t=>{const e=entries.filter(r=>key(r)===key(t)),s=partition(e,'effective_amount_within_target');return {...dims(t),target_allocation:t.allocation,scheduled_allocation:s,unscheduled_allocation:difference(t.allocation,s),overscheduled_allocation:partition(e,'excess_amount')};});
 for(const p of all){must(close(scheduled[p]+unscheduled[p],base.allocation[p]),'Scheduled/unscheduled target identity');must(close(entries.filter(r=>r.response_type===p).reduce((n,r)=>n+r.amount,0),scheduled[p]+excess[p]),'Requested/effective/excess identity');}
 const end=horizonEnd===null?(entries.length?executionMonth(entries.at(-1).effective_month):null):boundedMonth(horizonEnd),timeline=[],cumulative=empty(),roles=new Map();
 for(let i=first;end!==null&&i<=end;i++){
  const m=month(i),monthly=partition(entries.filter(r=>r.effective_month===m),'effective_amount_within_target');
  for(const p of all)cumulative[p]=value(units(cumulative[p])+units(monthly[p]));
  for(const r of entries.filter(r=>r.effective_month===m))roles.set(r.job_profile_code,value(units(roles.get(r.job_profile_code)??0)+units(r.effective_amount_within_target)));
  const covered=base.roles.reduce((n,r)=>n+Math.min(r.enterprise_net_role_demand,roles.get(r.job_profile_code)??0),0),remaining=Math.max(0,base.scenario_net_role_demand-covered);
  must(covered<=base.scenario_net_role_demand+epsilon&&close(covered+remaining,base.scenario_net_role_demand),'Conditional monthly coverage partition');
  timeline.push({month:m,effective_build:monthly.build,effective_move:monthly.move,effective_buy:monthly.buy,cumulative_build:cumulative.build,cumulative_move:cumulative.move,cumulative_buy:cumulative.buy,cumulative_effective_coverage:covered,remaining_net_gap:remaining,coverage_pct:base.scenario_net_role_demand>0?100*covered/base.scenario_net_role_demand:0});
 }
 const final=timeline.at(-1),covered=final?.cumulative_effective_coverage??0;
 return {...context(base),as_of:base.as_of,planning_start_month:month(first),planning_end_month:end===null?null:month(end),target_allocation:base.allocation,scheduled_allocation:scheduled,unscheduled_allocation:unscheduled,overscheduled_allocation:excess,scenario_net_role_demand:base.scenario_net_role_demand,final_effective_coverage:covered,final_remaining_net_gap:Math.max(0,base.scenario_net_role_demand-covered),final_coverage_pct:final?.coverage_pct??0,timeline,business_units,schedule_entries:entries,warnings:[...base.warnings,...(sum(unscheduled)>0?['Some target allocation has no effective month and remains unscheduled.']:[]),...(sum(excess)>0?['Excess above BU/path targets is excluded from conditional coverage.']:[])],methodology:method};
}

export function composeConstraints(base,execution,constraints){
 const c=validateExecutionConstraints(constraints),checks=[];
 const push=(code,label,actual,limit,detail,minimum=false)=>{if(limit!==null)checks.push({constraint_code:code,label,actual_value:actual,limit_value:limit,passed:minimum?actual+epsilon>=limit:actual<=limit+epsilon,detail});};
 for(const p of paths){push('max_total_'+p,'Maximum total '+p,execution.target_allocation[p],c['max_total_'+p],'Tests the entered allocation; no source capacity is inferred.');push('max_monthly_'+p,'Maximum monthly '+p,Math.max(0,...execution.timeline.map(r=>r['effective_'+p])),c['max_monthly_'+p],'Tests conditional effective amounts within BU/path targets.');}
 push('max_monthly_total','Maximum combined monthly amount',Math.max(0,...execution.timeline.map(r=>r.effective_build+r.effective_move+r.effective_buy)),c.max_monthly_total,'Tests the entered or generated conditional timeline, not available staffing.');
 push('no_overscheduled_capacity','No amount above BU/path targets',sum(execution.overscheduled_allocation),0,'Excess is reported and excluded from conditional coverage.');
 if(c.require_all_approved_capacity_scheduled)push('all_capacity_scheduled','All entered allocation has a month',sum(execution.unscheduled_allocation),0,'Undated target allocation is retained as unscheduled.');
 let deadline={deadline_month:null,required_coverage_pct:null,actual_coverage_pct:null,passed:null};
 if(c.deadline_month!==null){const coverage=execution.timeline.filter(r=>r.month<=c.deadline_month).at(-1)?.coverage_pct??0;push('deadline_coverage','Conditional coverage by deadline',coverage,c.required_coverage_pct_by_deadline,'Cumulative role-capped coverage of explicit assumptions. This does not establish an achievable completion date.',true);deadline={deadline_month:c.deadline_month,required_coverage_pct:c.required_coverage_pct_by_deadline,actual_coverage_pct:coverage,passed:coverage+epsilon>=c.required_coverage_pct_by_deadline};}
 // Evaluate all allocated roles, even if the optional portfolio target list is absent.
 const evidence=base.roles.map(r=>{const b=r.role_evidence.external_recruiting_feasibility;return {job_profile_code:r.job_profile_code,job_profile_name:r.job_profile_name,build_target:r.allocation.build,fully_pathway_covered_near_ready:null,build_exceeds_current_path_covered:null,move_target:r.allocation.move,role_ready_internal_candidates:null,move_exceeds_role_ready:null,buy_target:r.allocation.buy,recent_12m_external_fills:b.historical_external.recent_12m_filled_requisitions,buy_pct_of_recent_12m_external_fills:b.buy_scale.pct_of_recent_12m_external_fills,available_movers:null,future_hiring_capacity:null};});
 const breaches=checks.filter(r=>!r.passed).length;
 return {...context(base),as_of:base.as_of,overall_feasible:null,user_constraints_satisfied:breaches===0,hard_constraint_count:checks.length,hard_constraint_breaches:breaches,hard_constraints:checks,deadline,evidence_checks:evidence,execution,warnings:[...execution.warnings,'Passing user constraints does not establish actual staffing feasibility. Assessed readiness, available movers, hiring capacity and execution costs remain unknown.'],methodology:[...method,'Total and monthly limits, completeness, overscheduling and deadline coverage are mathematical checks on the stated plan. Unknown physical capacity is never compared as zero.','Budget feasibility is unassessed here because path-specific costs are absent; the separate incremental solution can calculate explicitly entered costs.']};
}

function proportional(rows,budget){
 const total=rows.reduce((n,r)=>n+r.available,0);if(total<=budget)return new Map(rows.map(r=>[r.key,r.available]));if(budget<=0)return new Map();
 const denominator=BigInt(total),numerator=BigInt(budget);
 const quotas=rows.map(r=>{const q=BigInt(r.available)*numerator;return {...r,n:Number(q/denominator),remainder:q%denominator};});let left=budget-quotas.reduce((n,r)=>n+r.n,0);
 for(const r of [...quotas].sort((a,b)=>a.remainder===b.remainder?a.key.localeCompare(b.key):a.remainder>b.remainder?-1:1)){if(!left)break;r.n++;left--;}
 must(left===0,'Scheduling unit allocation');return new Map(quotas.map(r=>[r.key,r.n]));
}
export function composeSchedule(base,constraints,rawAssumptions){
 baseContract(base);const c=validateExecutionConstraints(constraints),a=validateSchedulingAssumptions(rawAssumptions),missing=[];
 if(!a?.start_month)missing.push('An explicit scheduling start month is required.');
 for(const p of paths)if(base.allocation[p]>0){if(!a?.earliest_effective_months[p])missing.push('Supply the assumed earliest effective '+p+' month.');if(a?.monthly_capacity[p]==null)missing.push('Supply assumed monthly '+p+' delivery capacity; a cap alone is not capacity.');}
 const output={...context(base),as_of:base.as_of,scheduling_start_month:a?.start_month??null,scheduling_end_month:null,target_allocation:base.allocation,generated_schedule:[],scheduled_allocation:empty(),unscheduled_allocation:{...base.allocation},fully_scheduled:false,hard_constraint_feasible:null,user_constraints_satisfied:null,constraint_result:null,scheduling_assumptions:a,missing_assumptions:missing,status:'needs_assumptions',blockers:missing,methodology:[...method,'Generation requires explicit start, earliest path month and assumed monthly effective capacity for every nonzero path. Blank user limits remove a limit but do not create capacity.','The algorithm proportionally assigns assumed capacity in six-decimal role units within each month. It retains the requested mix, applies monthly limits and reports remaining amounts. It does not optimize a deadline or prove an achievable schedule.']};
 if(sum(base.allocation)===0){const checked=composeConstraints(base,composeExecution(base,[]),c);return {...output,status:'no_allocation',fully_scheduled:true,missing_assumptions:[],blockers:['No response allocation was supplied to schedule. No completion dates are generated.'],user_constraints_satisfied:checked.user_constraints_satisfied,constraint_result:checked};}
 if(missing.length)return output;
 const rows=base.business_units.flatMap(r=>paths.filter(p=>r.allocation[p]>0).map(p=>({...dims(r),response_type:p,key:key(r)+':'+p,remaining:units(r.allocation[p])}))),generated=[];
 for(let i=executionMonth(a.start_month);i<=last;i++){
  const available=paths.map(p=>({key:p,available:!base.allocation[p]||i<executionMonth(a.earliest_effective_months[p])?0:Math.min(rows.filter(r=>r.response_type===p).reduce((n,r)=>n+r.remaining,0),units(a.monthly_capacity[p]),c['max_monthly_'+p]===null?Infinity:units(c['max_monthly_'+p]))}));
  const budget=Math.min(available.reduce((n,r)=>n+r.available,0),c.max_monthly_total===null?Infinity:units(c.max_monthly_total)),byPath=proportional(available,budget);
  for(const p of paths){const group=rows.filter(r=>r.response_type===p),assigned=proportional(group.map(r=>({key:r.key,available:r.remaining})),byPath.get(p)??0);for(const r of group){const n=assigned.get(r.key)??0;if(n){r.remaining-=n;generated.push({...dims(r),response_type:p,amount:value(n),effective_month:month(i)});}}}
  if(rows.every(r=>r.remaining===0))break;
 }
 const fully=rows.every(r=>r.remaining===0),schedule=generated.map(r=>({business_unit:r.org_code,job_profile:r.job_profile_code,response_type:r.response_type,amount:r.amount,effective_month:r.effective_month})),execution=composeExecution(base,schedule,{generated:true,horizonEnd:fully?(generated.at(-1)?.effective_month??a.start_month):month(last)}),checked=composeConstraints(base,execution,c),blockers=checked.hard_constraints.filter(r=>!r.passed).map(r=>'Assumption limit breach: '+r.label+'.');
 if(!fully)blockers.unshift('The assumed capacities and limits leave unscheduled amounts within the bounded horizon. This result does not prove no alternative schedule could work.');
 return {...output,status:'conditional_schedule',scheduling_end_month:execution.planning_end_month,generated_schedule:generated,scheduled_allocation:execution.scheduled_allocation,unscheduled_allocation:execution.unscheduled_allocation,fully_scheduled:fully,user_constraints_satisfied:checked.user_constraints_satisfied,constraint_result:checked,blockers};
}
