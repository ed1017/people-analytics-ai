import {DEMO_BUS,DEMO_CUTOFF,exact,plain} from './dataset-demo-contracts.mjs';
import {PLANNING_COLUMNS} from './dataset-planning-queries.mjs';
import {runScenarioModel,buildScenarioSegmentBreakdown} from './scenario-engine.ts';
import {positionActionDefaults,positionActionScenario} from './position-action-engine.ts';
import {structuralPositionCatalog,structuralPositionScenario} from './structural-position-engine.ts';

export const LOCAL_PLANNING_ROUTES=Object.freeze(['/api/position-actions','/api/position-structure','/api/scenario-modeler','/api/business-unit-scenario']);
export const SCENARIO_BOUNDS=Object.freeze({annual_growth_pct:{min:-10,max:20},salary_inflation_pct:{min:-5,max:15},annual_attrition_pct:{min:0,max:30},fill_rate_pct:{min:0,max:100},productivity_hiring_reduction_pct:{min:0,max:50}});
const must=(v,m)=>{if(!v)throw Error(m);};
const count=n=>Number.isSafeInteger(n)&&n>=0;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const sum=(rows,k)=>rows.reduce((n,r)=>n+r[k],0);
const round=(n,p=1)=>Math.round(n*10**p)/10**p;
const close=(a,b,tolerance=1e-7)=>finite(a)&&finite(b)&&Math.abs(a-b)<=tolerance;
const key=r=>[r.org_code,r.level_code,r.job_profile_code].join(':');
// PostgreSQL numeric rounds positive half cents up. Divide integer cents to avoid binary-dollar ties.
const costPerHead=(dollars,heads)=>Math.round(Math.round(dollars*100)/heads)/100;
const unique=(rows,fn)=>new Set(rows.map(fn)).size===rows.length;
const pick=(r,keys)=>Object.fromEntries(keys.map(k=>[k,r[k]]));
class RequestError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const requestMust=(v,m)=>{if(!v)throw new RequestError(m);};
const allowed=(v,keys)=>plain(v)&&Object.keys(v).every(k=>keys.includes(k));
const validNumber=(v,min,max)=>finite(v)&&v>=min&&v<=max;
const match=(row,action)=>[['org_code','org_name','business_unit'],['level_code','level_name','level'],['job_profile_code','job_profile_name','job_profile']].every(([code,name,scope])=>!action[scope]||[row[code].toLowerCase(),row[name].toLowerCase()].includes(action[scope].trim().toLowerCase()));
const stock=rows=>({authorized:sum(rows,'filled')+sum(rows,'vacant')+sum(rows,'frozen'),filled:sum(rows,'filled'),vacant:sum(rows,'vacant'),frozen:sum(rows,'frozen')});

async function requestBody(request,maxBytes=16384){
 requestMust(/^application\/json(?:;|$)/i.test(request.headers.get('content-type')??''),'Use an application/json request body.');
 requestMust(request.body,'A JSON request body is required.');
 const reader=request.body.getReader(),parts=[];let length=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes){await reader.cancel();throw new RequestError(`Scenario request exceeds ${maxBytes/1024} KiB.`,413);}parts.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new RequestError('Invalid JSON request.');}
}
function validateBody(path,body){
 const scenarioKeys=Object.keys(SCENARIO_BOUNDS);
 if(path==='/api/position-actions'){
  requestMust(allowed(body,['add_positions','close_vacant_positions','freeze_vacancies','vacancy_fill_pct']),'Unsupported position assumptions.');
  for(const [k,v] of Object.entries(body))requestMust(validNumber(v,0,k==='vacancy_fill_pct'?100:5000)&&(k==='vacancy_fill_pct'||Number.isInteger(v)),'Position assumptions must be bounded numbers.');
 }else if(path==='/api/position-structure'){
  requestMust(exact(body,['actions'])&&Array.isArray(body.actions)&&body.actions.length>0&&body.actions.length<=20,'Provide between 1 and 20 structural actions.');
  for(const a of body.actions){requestMust(exact(a,['action_type','business_unit','level','job_profile','amount','fill_pct'])&&['add_positions','close_vacant_positions','freeze_vacancies','fill_vacancies'].includes(a.action_type),'Unsupported structural action.');
   for(const k of ['business_unit','level','job_profile'])requestMust(a[k]===null||typeof a[k]==='string'&&a[k].trim().length>0&&a[k].length<=120,'Invalid structural scope.');
   requestMust(a.action_type==='fill_vacancies'?validNumber(a.fill_pct,0,100)&&(a.amount===null||a.amount===0):validNumber(a.amount,0,5000)&&(a.fill_pct===null||a.fill_pct===0),'Invalid structural amount or fill percentage.');
  }
 }else{
  const bu=path==='/api/business-unit-scenario';
  requestMust(bu?allowed(body,['business_unit','additional_attrition_pct_points',...scenarioKeys])&&typeof body.business_unit==='string'&&body.business_unit.trim().length>0&&body.business_unit.length<=120:exact(body,['assumptions'])&&plain(body.assumptions),'Invalid scenario scope or assumptions.');
  const a=bu?body:body.assumptions;requestMust(bu||allowed(a,scenarioKeys),'Unsupported scenario assumption.');
  for(const k of scenarioKeys)if(Object.hasOwn(a,k))requestMust(validNumber(a[k],SCENARIO_BOUNDS[k].min,SCENARIO_BOUNDS[k].max),'Scenario assumption is outside supported bounds.');
  if(bu&&Object.hasOwn(a,'additional_attrition_pct_points'))requestMust(validNumber(a.additional_attrition_pct_points,-30,30)&&!Object.hasOwn(a,'annual_attrition_pct'),'Use either explicit attrition or an additional attrition delta.');
 }
 return body;
}

/** Fixed local inputs plus pure arithmetic. No Supabase client or model transport. */
export function createPlanningAdapters({analytics,component,domains,metadata}){
 async function read(name){
  const rows=await analytics.read(name),fields=PLANNING_COLUMNS[name];must(Array.isArray(rows)&&rows.length>0&&rows.every(r=>exact(r,fields)),'Missing planning aggregate: '+name);
  for(const r of rows)for(const k of fields){const v=r[k];if(/(_code|_name|_category)$|^as_of$|^planning_month$/.test(k))must(typeof v==='string'&&v.length>0&&v.length<300,'Invalid planning dimension');else must(finite(v)&&v>=0||v===null&&['annual_cost_per_position','avg_course_duration_hours','median_time_to_fill_days','avg_active_bill_rate'].includes(k),'Missing planning metric: '+k);}
  return rows;
 }
 function provenance(extra={}){return metadata({sourceLabel:'Constructed demo what-if calculation; user assumptions, not observed outcomes or a validated forecast',historyCutoff:DEMO_CUTOFF,planningStart:'2027-01-01',planningEnd:'2027-12-01',unmodeledGap:['2026-10','2026-11','2026-12'],independentForecastValidation:false,...extra});}
 async function positionInputs(){const p=await domains.positions(),c=p.current;return {asOf:p.as_of,authorizedPositions:c.current_positions+c.frozen_positions,filledPositions:c.filled_positions,openVacancies:c.vacant_positions,frozenPositions:c.frozen_positions,closedPositions:c.closed_positions};}
 async function planInputs(){
  const [defaultRows,history,orgs,families,businessUnits,release,workforce]=await Promise.all([read('scenario_defaults'),analytics.read('scenario_history'),read('scenario_org'),read('scenario_family'),analytics.read('workforce_business_unit_summary'),component('planning'),component('workforce')]);
  must(defaultRows.length===1&&defaultRows[0].as_of===DEMO_CUTOFF,'Scenario defaults cutoff');
  const defaults=Object.fromEntries(Object.keys(SCENARIO_BOUNDS).map(k=>[k,defaultRows[0]['baseline_'+k]]));
  for(const [k,b] of Object.entries(SCENARIO_BOUNDS))must(validNumber(defaults[k],b.min,b.max),'Invalid scenario default');
  const h=history[0];must(history.length===1&&exact(h,['months','first_date','last_date','average_headcount','exits'])&&h.months===9&&h.first_date==='2026-01-31'&&h.last_date===DEMO_CUTOFF&&count(h.exits)&&finite(h.average_headcount)&&h.average_headcount>0&&defaults.annual_attrition_pct===round(100*h.exits/h.average_headcount*12/9,2),'Constructed history/default reconciliation');
  must(defaults.annual_growth_pct===0&&defaults.salary_inflation_pct===0&&defaults.fill_rate_pct===100&&defaults.productivity_hiring_reduction_pct===0,'Stored flat assumptions');
  const baseline=release.data;
  must(baseline.length===12&&businessUnits.length===8&&unique(businessUnits,r=>r.org_code)&&businessUnits.every(b=>DEMO_BUS.includes(b.org_code)&&b.as_of===DEMO_CUTOFF&&count(b.headcount)&&finite(b.fte))&&sum(businessUnits,'headcount')===9847,'Business-unit stock');
  must(orgs.length===96&&unique(orgs,r=>r.planning_month+':'+r.org_code)&&families.length===324&&unique(families,r=>r.planning_month+':'+r.family_code),'Scenario segment completeness');
  let opening=9847;const prior=new Map(businessUnits.map(b=>[b.org_code,b.headcount]));
  for(const [i,b] of baseline.entries()){
   must(b.planning_month===`2027-${String(i+1).padStart(2,'0')}-01`&&b.scenario_name==='Baseline'&&b.scenario_type==='draft_assumption'&&opening+b.planned_hires-b.planned_exits===b.planned_headcount,'Stored plan chronology/flows');opening=b.planned_headcount;
   const groups=orgs.filter(r=>r.planning_month===b.planning_month),f=families.filter(r=>r.planning_month===b.planning_month);
   must(groups.length===8&&f.length===27&&sum(groups,'planned_headcount')===b.planned_headcount&&sum(f,'planned_headcount')===b.planned_headcount&&close(sum(groups,'planned_fte'),b.planned_fte,0.011)&&close(sum(groups,'planned_labor_cost_usd'),b.planned_labor_cost_usd,0.011)&&close(sum(f,'planned_labor_cost_usd'),b.planned_labor_cost_usd,0.011),'Plan segment partitions');
   for(const g of groups){must(prior.has(g.org_code)&&prior.get(g.org_code)+g.planned_hires-g.planned_exits===g.planned_headcount&&g.planned_fte<=g.planned_headcount,'Business-unit stored flows');prior.set(g.org_code,g.planned_headcount);}
  }
  must(workforce.data[0].headcount===9847,'Scenario starting stock');
  return {defaults,baseline,orgs,families,businessUnits,history:h};
 }
 function calculate(inputs,assumptions,bu=null){
  const baseline=bu?inputs.orgs.filter(r=>r.org_code===bu.org_code):inputs.baseline,opening=bu?bu.headcount:9847,ledger=[];
  const result=runScenarioModel({asOf:DEMO_CUTOFF,startingHeadcount:opening,baselinePoints:baseline,defaults:inputs.defaults,assumptions,onPoint:r=>{must(close(r.opening_headcount+r.hires-r.exits,r.closing_headcount),'Scenario monthly stock/flow');ledger.push(r);}});
  must(ledger.length===12&&close(opening+sum(ledger,'hires')-sum(ledger,'exits'),ledger.at(-1).closing_headcount),'Scenario total stock/flow');
  result.methodology=result.methodology.filter(s=>!s.includes('do not fully explain')).concat([
   'Constructed September 2026 stock is carried to January 2027; October–December 2026 is unmodeled, not an observed or forecast bridge.',
   'Stored flat draft hires/exits are zero and reconcile. What-if hires/exits are separate engine-implied gross flows; they are not stored plan flows or observed future outcomes.',
   `The ${inputs.defaults.annual_attrition_pct}% company annualized January–September exit rate is a shared scenario assumption${bu?' applied to this business unit; it is not an observed business-unit attrition rate':''}. Fill rate and productivity are authored assumptions, not estimated capacity.`,
   'Growth and inflation adjustments span the twelve explicit planning points; there is no independent forecast validation.',
  ]);
  result.accounting={scope:bu?{type:'business_unit',org_code:bu.org_code}:{type:'company'},basis:'Unrounded conditional arithmetic; display values are rounded separately.',monthly:ledger,starting_headcount:opening,total_hires:sum(ledger,'hires'),total_exits:sum(ledger,'exits'),ending_headcount:ledger.at(-1).closing_headcount};
  if(bu){const company=inputs.baseline.at(-1);result.scope={type:'business_unit',org_code:bu.org_code,org_name:bu.org_name,current_headcount:bu.headcount,current_fte:bu.fte,planning_horizon_start:baseline[0].planning_month,planning_horizon_end:baseline.at(-1).planning_month};result.enterprise_impact={baseline_end_headcount:company.planned_headcount,implied_end_headcount:round(company.planned_headcount+result.summary.headcount_delta_vs_baseline),headcount_delta_vs_baseline:result.summary.headcount_delta_vs_baseline,baseline_end_labor_cost_usd:company.planned_labor_cost_usd,implied_end_labor_cost_usd:round(company.planned_labor_cost_usd+result.summary.labor_cost_delta_vs_baseline_usd,2),labor_cost_delta_vs_baseline_usd:result.summary.labor_cost_delta_vs_baseline_usd};result.methodology.push('Only the selected business unit is rerun. Enterprise impact holds every other business unit at its stored draft. Internal movements are not added as company hires or exits.');}
  else{
   const org=inputs.orgs.map(r=>({...r,segment_code:r.org_code,segment_name:r.org_name})),family=inputs.families.map(r=>({...r,segment_code:r.family_code,segment_name:r.family_name}));
   result.segment_breakdown=buildScenarioSegmentBreakdown(result,org,family);
   reconcileSegments(result.segment_breakdown,result.summary);
  }
  result.data_meta=provenance({scenarioFlowConvention:'Engine-implied conditional gross flows; stored draft has zero gross flows',attritionDefaultProvenance:'Company annualized constructed YTD exits / average month-end stock, multiplied by 12/9'});
  return result;
 }
 async function structuralInputs(){
  const [rows,requirements,supply,signals,positions,plan]=await Promise.all([read('structural_inventory'),read('structural_requirements'),read('structural_supply'),read('structural_signals'),domains.positions(),component('planning')]);
  must(unique(rows,key)&&sum(rows,'filled_positions')===9847&&sum(rows,'vacant_positions')===positions.current.vacant_positions&&sum(rows,'current_positions')===positions.current.current_positions&&sum(rows,'planned_headcount')===plan.data.at(-1).planned_headcount&&close(sum(rows,'planned_labor_cost_usd'),plan.data.at(-1).planned_labor_cost_usd,0.011),'Structural inventory partition');
  must(requirements.length===150&&unique(requirements,r=>r.job_profile_code+':'+r.skill_code)&&supply.length===5&&unique(supply,r=>r.skill_code)&&signals.length===5&&unique(signals,r=>r.skill_code),'Structural skill coverage');
  for(const r of rows)must(['level_rank','current_positions','filled_positions','vacant_positions','planned_headcount','open_requisition_vacancies','on_hold_requisition_vacancies','uncovered_vacancies'].every(k=>count(r[k]))&&r.current_positions===r.filled_positions+r.vacant_positions&&r.vacant_positions===r.open_requisition_vacancies+r.on_hold_requisition_vacancies+r.uncovered_vacancies&&(r.annual_cost_per_position===null?r.planned_headcount===0&&r.planned_labor_cost_usd===0:r.planned_headcount>0&&close(r.annual_cost_per_position,costPerHead(r.planned_labor_cost_usd,r.planned_headcount),0.001)),'Structural vacancy/cost coverage');
  for(const r of requirements)must(supply.some(s=>s.skill_code===r.skill_code)&&signals.some(s=>s.skill_code===r.skill_code)&&rows.some(p=>p.job_profile_code===r.job_profile_code),'Missing structural role evidence');
  must(supply.every(r=>count(r.employees_with_skill)&&r.employees_with_skill<=9847),'Skill presence population');
  return {asOf:DEMO_CUTOFF,rows:rows.map(r=>({...pick(r,['org_code','org_name','level_code','level_name','level_rank','job_profile_code','job_profile_name']),filled:r.filled_positions,vacant:r.vacant_positions,frozen:0,open_req:r.open_requisition_vacancies,on_hold_req:r.on_hold_requisition_vacancies,uncovered:r.uncovered_vacancies,frozen_open_req:0,frozen_on_hold_req:0,frozen_uncovered:0,planned_weight:r.planned_headcount,cost_per_position:r.annual_cost_per_position})),skillRequirements:requirements,skillSupply:new Map(supply.map(r=>[r.skill_code,r.employees_with_skill])),responseStrategySignals:new Map(signals.map(r=>[r.skill_code,r]))};
 }
 function structuralRun(inventory,actions){
  for(const a of actions)requestMust(inventory.rows.some(r=>match(r,a)),'Structural scope has no matching constructed inventory.');
  const ledger=[],finalRows=new Map(inventory.rows.map(r=>[key(r),{...r}]));
  const result=structuralPositionScenario(actions,inventory,step=>{
   for(const r of step.after)finalRows.set(key(r),r);
   const before=stock(step.before),after=stock(step.after),type=step.action.action_type,n=step.applied;
   must(close(after.authorized,before.authorized+(type==='add_positions'?n:type==='close_vacant_positions'?-n:0))&&close(after.filled,before.filled+(type==='fill_vacancies'?n:0))&&close(after.frozen,before.frozen+(type==='freeze_vacancies'?n:0))&&close(after.authorized,after.filled+after.vacant+after.frozen),'Scoped structural stock/flow');
   ledger.push({action_index:step.action_index,action_type:type,scope:pick(step.action,['business_unit','level','job_profile']),matched_combinations:step.before.length,before,after,applied:n,cost_basis_missing_combinations:step.before.filter(r=>r.cost_per_position===null).length});
  });
  exactStructuralPartitions(result,inventory.rows,[...finalRows.values()]);
  result.accounting={company:{before:stock(inventory.rows),after:stock([...finalRows.values()])},basis:'Unrounded position capacity by ordered action scope; fills are conditional staffing, not observed external hires.',actions:ledger};
  result.methodology.unshift('Constructed demo what-if arithmetic only. No observed future employment or independently validated forecast is supplied.');
  result.methodology.push('Missing cost bases stay unavailable when affected; a zero-amount action has zero cost effect. A scope with zero draft allocation weight cannot receive weighted added positions.','Company, business-unit and role inventory partitions retain unrounded values for reconciliation; the UI rounds labels independently. Skill indicators and action display summaries are rounded estimates.',
   'Skill supply counts profile presence, not assessed proficiency or ready employees. Move counts express recorded preferences and may overlap; they are not assessed readiness or available movers.','Recruiting and learning signals are company-wide constructed history through September 2026; action scopes do not turn them into filtered supply.');
  result.response_strategy.provenance='Constructed company-wide catalog/history/preferences; not assessed readiness, guaranteed staffing, causal learning gains or filtered supply.';
  result.data_meta=provenance({sourceLabel:'Constructed demo structural actions; scoped inventory arithmetic and explicit cost gaps',missingCostCombinations:inventory.rows.filter(r=>r.cost_per_position===null).length,unavailable:['assessed readiness','contingent evidence','automation potential','execution/scheduling orchestration']});
  return result;
 }
 async function handle(request){
  const path=new URL(request.url).pathname;must(LOCAL_PLANNING_ROUTES.includes(path),'Unknown local planning route');metadata();
  try{
   if(!['GET','POST'].includes(request.method))throw new RequestError('Method not allowed.',405);
   requestMust(new URL(request.url).searchParams.size===0,'This scenario API does not accept query filters.');
   if(request.method==='GET')requestMust(request.body===null&&Number(request.headers.get('content-length')??0)===0&&!request.headers.has('transfer-encoding'),'GET does not accept a request body.');
   const body=request.method==='POST'?validateBody(path,await requestBody(request)):null;let data;
   if(path==='/api/position-actions'){
    const current=await positionInputs();data=body?positionActionScenario(body,current):positionActionDefaults(current);
    if(body){
     const a=data.assumptions,fillable=current.openVacancies+a.add_positions-a.close_vacant_positions-a.freeze_vacancies,fills=fillable*(body.vacancy_fill_pct??0)/100;
     const after={authorized:current.authorizedPositions+a.add_positions-a.close_vacant_positions,filled:current.filledPositions+fills,vacant:fillable-fills,frozen:current.frozenPositions+a.freeze_vacancies};
     must(close(after.authorized,after.filled+after.vacant+after.frozen),'Position action partition');
     Object.assign(data.modeled,{authorized_positions:after.authorized,filled_positions:after.filled,open_vacancies:after.vacant,frozen_positions:after.frozen,projected_fills:fills,net_filled_position_change:fills});
     data.accounting={basis:'Unrounded conditional capacity; UI labels round independently. No observed hires or exits.',before:{authorized:current.authorizedPositions,filled:current.filledPositions,vacant:current.openVacancies,frozen:current.frozenPositions},after,effective_fill_pct:body.vacancy_fill_pct??0,added:a.add_positions,closed:a.close_vacant_positions,newly_frozen:a.freeze_vacancies,conditional_fills:fills};
     data.methodology.unshift('Constructed what-if position capacity. Fills do not create employee records or establish realized hires.');
    }
    data.data_meta=provenance({sourceLabel:'Constructed demo position actions; conditional position capacity, not realized workforce movements'});
   }else if(path==='/api/position-structure'){
    const inventory=await structuralInputs();data=body?structuralRun(inventory,body.actions):{...structuralPositionCatalog(inventory),data_meta:provenance({sourceLabel:'Constructed demo structural catalog; missing cost bases are unavailable',missingCostCombinations:inventory.rows.filter(r=>r.cost_per_position===null).length})};
   }else{
    const inputs=await planInputs(),buRoute=path==='/api/business-unit-scenario';
    if(!body)data=buRoute?{as_of:DEMO_CUTOFF,defaults:inputs.defaults,business_units:inputs.businessUnits.map(r=>pick(r,['org_code','org_name','headcount','fte'])),data_meta:provenance()}:{as_of:DEMO_CUTOFF,defaults:inputs.defaults,bounds:SCENARIO_BOUNDS,data_meta:provenance()};
    else{
     const requested=buRoute?body:body.assumptions,assumptions={...inputs.defaults,...pick(requested,Object.keys(SCENARIO_BOUNDS).filter(k=>Object.hasOwn(requested,k)))};
     if(Object.hasOwn(requested,'additional_attrition_pct_points')){assumptions.annual_attrition_pct+=requested.additional_attrition_pct_points;requestMust(validNumber(assumptions.annual_attrition_pct,0,30),'Combined attrition assumption is outside supported bounds.');}
     const bu=buRoute?inputs.businessUnits.find(r=>[r.org_code.toLowerCase(),r.org_name.toLowerCase()].includes(body.business_unit.trim().toLowerCase())):null;
     requestMust(!buRoute||bu,'Unknown business unit.');data=calculate(inputs,assumptions,bu);
    }
   }
   return Response.json(data,{headers:{'Cache-Control':'no-store'}});
  }catch(error){return Response.json({error:error instanceof RequestError?error.message:'Local planning inputs or accounting are unavailable.'},{status:error instanceof RequestError?error.status:503,headers:{'Cache-Control':'no-store'}});}
 }
 return Object.freeze({handle,async responseContext(actions){
  metadata();validateBody('/api/position-structure',{actions});
  const inventory=await structuralInputs();
  return {scenario:structuralRun(inventory,actions),skillRequirements:inventory.skillRequirements,signals:inventory.responseStrategySignals};
 }});
}

export {requestBody as readPlanningRequest,RequestError as PlanningRequestError};

/** Allocate display rounding only; preserve company targets exactly. */
function reconcileSegments(breakdown,summary){
 for(const rows of [breakdown.business_units,breakdown.job_families]){
  for(const [field,target,places] of [['modeled_headcount',summary.modeled_end_headcount,1],['modeled_labor_cost_usd',summary.modeled_end_labor_cost_usd,2]]){
   const scale=10**places,units=rows.map(r=>Math.round(r[field]*scale));let residual=Math.round(target*scale)-units.reduce((a,b)=>a+b,0);
   const order=rows.map((r,i)=>({i,weight:r[field],code:r.segment_code})).sort((a,b)=>b.weight-a.weight||a.code.localeCompare(b.code));
   must(Math.abs(residual)<=rows.length,'Unexpected segment allocation residual');
   for(const {i} of order){if(!residual)break;const step=Math.sign(residual);must(units[i]+step>=0,'Negative rounded segment');units[i]+=step;residual-=step;}
   rows.forEach((r,i)=>{r[field]=units[i]/scale;});
  }
  for(const r of rows){r.headcount_delta_vs_baseline=round(r.modeled_headcount-r.baseline_headcount);r.labor_cost_delta_vs_baseline_usd=round(r.modeled_labor_cost_usd-r.baseline_labor_cost_usd,2);}
 }
 breakdown.allocation_method+=' Display rounding residuals are allocated deterministically by descending modeled size, then segment code, so partitions reconcile.';
 for(const [kind,rows] of [['business_unit',breakdown.business_units],['job_family',breakdown.job_families]]){breakdown.reconciliation[kind+'_modeled_headcount_total']=round(sum(rows,'modeled_headcount'));breakdown.reconciliation[kind+'_modeled_labor_cost_total_usd']=round(sum(rows,'modeled_labor_cost_usd'),2);must(close(sum(rows,'modeled_headcount'),summary.modeled_end_headcount,0.001)&&close(sum(rows,'modeled_labor_cost_usd'),summary.modeled_end_labor_cost_usd,0.001),'Scenario display segment reconciliation');}
}

/** Retain arithmetic precision in candidate partitions; presentation rounding must not alter stocks. */
function exactStructuralPartitions(result,initial,modeled){
 const totals=stock(modeled),before=stock(initial);
 Object.assign(result.modeled,{authorized_positions:totals.authorized,filled_positions:totals.filled,open_vacancies:totals.vacant,frozen_positions:totals.frozen,net_authorized_position_change:totals.authorized-before.authorized,net_filled_position_change:totals.filled-before.filled});
 for(const [field,identify] of [['job_profile_impact',r=>r.job_profile_code],['business_unit_job_profile_impact',r=>r.org_code+':'+r.job_profile_code]]){
  const groups=new Map();
  for(let i=0;i<modeled.length;i++){
   const r=modeled[i],b=initial[i],id=identify(r),g=groups.get(id)??{current_authorized_positions:0,current_filled_positions:0,modeled_filled_positions:0,modeled_open_vacancies:0,modeled_frozen_positions:0,modeled_active_recruiting_demand:0};
   g.current_authorized_positions+=b.filled+b.vacant+b.frozen;g.current_filled_positions+=b.filled;g.modeled_filled_positions+=r.filled;g.modeled_open_vacancies+=r.vacant;g.modeled_frozen_positions+=r.frozen;g.modeled_active_recruiting_demand+=r.open_req+r.uncovered;groups.set(id,g);
  }
  must(groups.size===result[field].length,'Structural group coverage');
  for(const r of result[field]){const g=groups.get(identify(r));must(g,'Structural group identity');Object.assign(r,g,{modeled_authorized_positions:g.modeled_filled_positions+g.modeled_open_vacancies+g.modeled_frozen_positions});r.authorized_position_delta=r.modeled_authorized_positions-r.current_authorized_positions;r.filled_position_delta=r.modeled_filled_positions-r.current_filled_positions;}
  for(const [metric,total] of [['modeled_authorized_positions',totals.authorized],['modeled_filled_positions',totals.filled],['modeled_open_vacancies',totals.vacant],['modeled_frozen_positions',totals.frozen]])must(close(sum(result[field],metric),total),'Structural output partition');
 }
 const recruitment=result.recruiting_demand;
 for(const [field,metric] of [['active_open_requisitions','open_req'],['on_hold_requisitions','on_hold_req'],['uncovered_open_vacancies','uncovered']]){recruitment[field]=sum(modeled,metric);for(const g of recruitment.by_business_unit)g[field]=sum(modeled.filter(r=>r.org_code===g.org_code),metric);}
 recruitment.active_recruiting_demand=recruitment.active_open_requisitions+recruitment.uncovered_open_vacancies;recruitment.incremental_requisitions_needed=recruitment.uncovered_open_vacancies;
 for(const g of recruitment.by_business_unit){g.active_recruiting_demand=g.active_open_requisitions+g.uncovered_open_vacancies;g.modeled_fills=sum(modeled.filter(r=>r.org_code===g.org_code),'filled')-sum(initial.filter(r=>r.org_code===g.org_code),'filled');}
 must(close(sum(recruitment.by_business_unit,'active_recruiting_demand'),recruitment.active_recruiting_demand)&&close(sum(recruitment.by_business_unit,'modeled_fills'),result.modeled.net_filled_position_change),'Recruiting partition');
}
