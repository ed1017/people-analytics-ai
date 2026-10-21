/** Candidate-only composition. No database client, model transport or production binding. */
import {plain,DEMO_CUTOFF} from './dataset-demo-contracts.mjs';
import {PlanningRequestError,readPlanningRequest} from './dataset-planning-adapters.mjs';
import {composeExecution,composeConstraints,composeSchedule,validateExecutionConstraints,validateExecutionSchedule,validateSchedulingAssumptions,executionMonth} from './dataset-execution-core.mjs';
import {calculateWorkforceIncrement,validateWorkforcePlanInput} from './workforce-increment.ts';
import {clarificationCatalog,clarificationRequest,validateClarificationInput,validateClarificationResult} from './workforce-clarification.ts';

export const LOCAL_EXECUTION_ROUTES=Object.freeze(['/api/time-phased-workforce-execution','/api/workforce-response-constraints','/api/constraint-aware-workforce-scheduler','/api/workforce-solution']);
const req=(v,m)=>{if(!v)throw new PlanningRequestError(m);};
const must=(v,m)=>{if(!v)throw Error(m);};
const baseKeys=['actions','allocations','role_plans'];
const first=executionMonth(DEMO_CUTOFF.slice(0,7))+1,last=first+35;
const pickBase=b=>Object.fromEntries(baseKeys.filter(k=>Object.hasOwn(b,k)).map(k=>[k,b[k]]));
function executionBody(path,b){
 const scheduler=path==='/api/constraint-aware-workforce-scheduler',extra=scheduler?['constraints','scheduling_assumptions']:path==='/api/workforce-response-constraints'?['schedule','constraints']:['schedule'];
 req(plain(b)&&Object.keys(b).every(k=>[...baseKeys,...extra].includes(k))&&Object.hasOwn(b,'actions')&&Object.hasOwn(b,'allocations'),'Unsupported execution request fields.');
 if(!scheduler)validateExecutionSchedule(b.schedule);
 if(extra.includes('constraints'))validateExecutionConstraints(b.constraints);
 if(scheduler)validateSchedulingAssumptions(b.scheduling_assumptions);
 return b;
}
export function createExecutionAdapters({planning,response,metadata,now=()=>new Date().toISOString()}){
 const context=()=>metadata({sourceLabel:'Constructed demo conditional execution; staffing feasibility remains unassessed',independentForecastValidation:false});
 async function invoke(api,path,body){
  const r=await api.handle(new Request('http://local.invalid'+path,{method:body===undefined?'GET':'POST',...(body===undefined?{}:{headers:{'content-type':'application/json'},body:JSON.stringify(body)})})),data=await r.json();
  if(r.status===400||r.status===413)throw new PlanningRequestError(data.error,r.status);must(r.ok,'Candidate composition input unavailable');
  const m=context();must(data.data_meta?.datasetId===m.datasetId&&data.data_meta?.bundleDigest===m.bundleDigest&&data.data_meta?.datasetToken===m.datasetToken,'Mixed composition binding');return data;
 }
 async function catalog(){return invoke(planning,'/api/position-structure');}
 async function solution(raw){
  let input;try{input=validateWorkforcePlanInput(raw);}catch(e){throw new PlanningRequestError(e.message);}
  const start=executionMonth(input.planningMonth);req(start>=first&&start+Number(input.months)-1<=last,'The candidate incremental horizon must lie within October 2026–September 2029.');
  const c=await catalog(),combinations=c.combinations.filter(r=>r.org_code===input.businessUnit&&r.job_profile_code===input.jobProfile);req(combinations.length>0,'Choose an available candidate BU-role combination.');
  const actions=[{action_type:'add_positions',business_unit:input.businessUnit,job_profile:input.jobProfile,level:null,amount:Number(input.roles),fill_pct:null}],structural=(await planning.responseContext(actions)).scenario;
  const selectedRole=structural.job_profile_impact.find(r=>r.job_profile_code===input.jobProfile),selectedDestination=structural.business_unit_job_profile_impact.find(r=>r.org_code===input.businessUnit&&r.job_profile_code===input.jobProfile);
  must(structural.as_of===DEMO_CUTOFF&&selectedRole&&selectedDestination&&Math.abs(selectedDestination.authorized_position_delta-Number(input.roles))<1e-7,'Requested structural demand was not fully allocated');
  const role=await invoke(response,'/api/role-workforce-response-plan',{actions,job_profile:input.jobProfile,allocation:{build:Number(input.build),move:Number(input.move),buy:Number(input.buy),borrow:0,automate:0}}),timing=role.external_recruiting_feasibility.timing_evidence;
  let proposed,hireOnly;try{proposed=calculateWorkforceIncrement(input,timing);hireOnly=calculateWorkforceIncrement({...input,build:'0',move:'0',buy:input.roles,backfills:'0',internalAnnualCostChange:'0',trainingCash:'0',trainingHours:'0'},timing);}catch(e){throw new PlanningRequestError(e.message);}
  const costKnown=combinations.every(r=>typeof r.annual_cost_per_position_usd==='number'&&Number.isFinite(r.annual_cost_per_position_usd)&&r.annual_cost_per_position_usd>0);
  return {version:1,calculatedAt:now(),input,source:{asOf:DEMO_CUTOFF,provenance:'constructed synthetic company aggregates; timing and costs are explicit planning assumptions',businessUnit:c.business_units.find(r=>r.org_code===input.businessUnit),jobProfile:c.job_profiles.find(r=>r.job_profile_code===input.jobProfile),data_meta:context()},structural:{actions:structural.actions,current:structural.current,modeled:structural.modeled,selectedRole,selectedDestination,authorizedAnnualBudgetDelta:costKnown?structural.modeled.authorized_budget_delta_usd:null,costBasisCoverage:costKnown?'Selected catalog combinations have stored constructed cost bases':'At least one selected cost basis is missing; the structural annual budget reference is unknown',costBasisPeriod:'Constructed Baseline December 2027 annual cost per planned position; not a salary quote'},response:role,timing,proposed,hireOnly,capacity_feasibility:{...role.capacity_feasibility},confirmed_completion_date:null,data_meta:context(),limitations:[
   'Structural additions are authorized vacancies. Numeric conditional coverage and constraint checks do not establish assessed readiness, available movers, release approval or future hiring capacity.',
   'Blank optional timing and costs remain unknown. Entered dates and common batches are assumptions; an explicitly selected historical median is an authored-demo timing comparison, not a predicted or confirmed completion date.',
   'The proposed mix and hire-only comparison use the same stated cost/timing assumptions. They do not establish recruiting concurrency or independent forecast validation.',
   'Only assumed external hires and explicit external backfills add employees in the incremental calculation. Build and Move do not change company headcount; this is not a reconciled total workforce forecast.',
   'The destination BU scopes structural demand. Profile evidence and recruiting history remain company-wide; no BU-specific readiness or available supply is inferred.',
   'Annual structural budget reference and incremental cash are separate quantities and must never be added together. Missing stored cost bases and missing user cash assumptions remain null.',
   'October–December 2026 has no modeled baseline history bridge. User-entered conditional capacity in that period does not fill the historical or forecast gap.',
  ]};
 }
 async function handle(request){
  metadata();try{
   const url=new URL(request.url);must(LOCAL_EXECUTION_ROUTES.includes(url.pathname),'Unknown execution route');req(url.searchParams.size===0,'Execution APIs do not accept query filters.');if(request.method!=='POST')throw new PlanningRequestError('Method not allowed.',405);
   // The 40 destinations × 3 paths × 36 months generated bound must round-trip.
   const raw=await readPlanningRequest(request,url.pathname==='/api/workforce-solution'?16384:2097152);let data;
   if(url.pathname==='/api/workforce-solution')data=await solution(raw);
   else{const b=executionBody(url.pathname,raw),base=await invoke(response,'/api/business-unit-response-allocation',pickBase(b));if(url.pathname==='/api/constraint-aware-workforce-scheduler')data=composeSchedule(base,b.constraints,b.scheduling_assumptions);else{const execution=composeExecution(base,b.schedule);data=url.pathname==='/api/workforce-response-constraints'?composeConstraints(base,execution,b.constraints):execution;}}
   return Response.json(data,{headers:{'Cache-Control':'no-store'}});
  }catch(e){return Response.json({error:e instanceof PlanningRequestError?e.message:'Local execution inputs or reconciliation are unavailable.'},{status:e instanceof PlanningRequestError?e.status:503,headers:{'Cache-Control':'no-store'}});}
 }
 /** Server-only intake contract preparation. No model call and no endpoint success.
  * The validated envelope and result guard are ready for a separately bound transport.
  */
 async function intakeInputs(raw){
  const before=context();let input;try{input=validateClarificationInput(raw);}catch(e){throw new PlanningRequestError(e.message);}
  const c=await catalog(),source=clarificationCatalog(c);let modelRequest;try{modelRequest=clarificationRequest(input,source);}catch(e){throw new PlanningRequestError(e.message);}
  return Object.freeze({input,catalog:source,modelRequest,data_meta:before,modelTransport:null,validateResult(result){must(context().datasetToken===before.datasetToken&&context().bundleDigest===before.bundleDigest,'Intake binding changed');return validateClarificationResult(result,input,source);}});
 }
 return Object.freeze({handle,intakeInputs});
}
