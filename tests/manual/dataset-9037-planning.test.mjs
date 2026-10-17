import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {development9037Options,load9037DevelopmentBinding} from '../../lib/dataset-9037-development.server.mjs';
import {readStaffingCatalog,readStaffingSupply,staffingTargetPoint} from '../../lib/staffing-target.ts';
import {emptyWorkforcePlanInput} from '../../lib/workforce-increment.ts';
import {CONSTRAINT_FIELDS} from '../../lib/dataset-execution-core.mjs';
import {local9037RequestAllowed} from '../../lib/dataset-9037-request-policy.mjs';
const options=development9037Options({...process.env,NODE_ENV:'development'});assert.ok(options);
const config=JSON.parse(fs.readFileSync(options.file)),bytes=fs.readFileSync(config.capturePath);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'921e9dbe52e516cbd9d28033c09a0f886127917b40b48bbb3f4448814440ce13');
const rows=JSON.parse(bytes),binding=await load9037DevelopmentBinding(options),token=await binding.router.bootstrapToken();
const request=(path,body,version=token)=>new Request('http://localhost:9037'+path,{method:body===undefined?'GET':'POST',headers:{'x-workforce-dataset':version,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
async function call(path,body,status=200){const response=await binding.handle(request(path,body));const data=await response.json();assert.equal(response.status,status,path+': '+JSON.stringify(data).slice(0,250));assert.equal(response.headers.get('x-workforce-dataset'),token);return data;}
const allocation={build:1,move:1,buy:2,borrow:0,automate:0},org='BU-TECH',job='ML-ENG';
const actions=[{action_type:'add_positions',business_unit:org,level:null,job_profile:job,amount:4,fill_pct:null}];
const base={actions,allocations:[{business_unit:org,job_profile:job,allocation}],role_plans:[{job_profile:job,allocation}]};
const schedule=['build','move','buy'].map(response_type=>({business_unit:org,job_profile:job,response_type,amount:allocation[response_type],effective_month:'2027-01'}));
const constraints={...Object.fromEntries(CONSTRAINT_FIELDS.map(k=>[k,null])),require_all_approved_capacity_scheduled:true};

test('9037 company and every BU scenario reconcile fixed stocks and default conditional flows',async()=>{
 const catalog=await call('/api/scenario-modeler');assert.equal(catalog.defaults.annual_attrition_pct,16.01);
 const company=await call('/api/scenario-modeler',{assumptions:{}});assert.equal(company.summary.starting_headcount,9037);assert.equal(company.points.length,12);assert.equal(company.accounting.ending_headcount,9037);
 for(const row of company.accounting.monthly)assert.ok(Math.abs(row.opening_headcount+row.hires-row.exits-row.closing_headcount)<1e-7);
 for(const bu of rows.workforce_business_unit_summary){const value=await call('/api/business-unit-scenario',{business_unit:bu.org_code});assert.equal(value.scope.current_headcount,bu.headcount);assert.equal(value.scope.current_fte,bu.fte);assert.equal(value.accounting.ending_headcount,bu.headcount);}
 const custom=await call('/api/scenario-modeler',{assumptions:{annual_growth_pct:10,fill_rate_pct:80}});assert.notEqual(custom.summary.modeled_end_headcount,9037);assert.equal(custom.data_meta.publicationApproved,false);
});

test('staffing target accepts only the explicit carried-stock 2027 horizon and Baseline assumptions',async()=>{
 const path='/api/business-unit-scenario?staffing_target=1',catalog=readStaffingCatalog(await call(path));
 for(const bu of catalog.business_units){const raw=await call(path,{business_unit:bu.org_code}),supply=readStaffingSupply(raw,catalog,bu.org_code);assert.equal(supply.points[0].planning_month,'2027-01-01');assert.equal(supply.points.length,12);assert.equal(staffingTargetPoint(supply,'2027-12-01',String(bu.headcount+5)).gap,5);
 for(const mutate of [d=>{d.staffing_target_horizon=null;},d=>{d.points.splice(1,1);},d=>{d.staffing_target_basis='business-unit-baseline-v1';},d=>{d.data_meta.datasetId='legacy-v1';}]){const bad=structuredClone(raw);mutate(bad);assert.throws(()=>readStaffingSupply(bad,catalog,bu.org_code));}}
 await call(path,{business_unit:org,fill_rate_pct:50},400);await call(path+'&staffing_target=1',undefined,400);await call('/api/business-unit-scenario?country=US',undefined,400);
});

test('position, role evidence, response and execution compose without changing population or inventing capacity',async()=>{
 const reference=await call('/api/occupational-reference');assert.equal(reference.profiles.length,50);assert.equal(reference.mappedProfileCount,0);assert.deepEqual(reference.occupations,[]);
 const initial=await call('/api/position-actions');assert.equal(initial.current.filled_positions,9037);
 const structural=await call('/api/position-structure',{actions});assert.equal(structural.accounting.company.before.filled,9037);assert.equal(structural.accounting.company.after.filled,9037);assert.equal(structural.accounting.company.after.authorized-structural.accounting.company.before.authorized,4);
 for(const role of rows.talent_catalog){const talent=await call('/api/internal-talent-readiness?job_profile='+role.code);assert.equal(talent.assessment_status,'not_assessed');assert.equal(talent.candidate_pool.role_ready,null);const fit=rows.talent_fit.find(r=>r.job_profile_code===role.code);assert.equal(talent.candidate_pool.active_with_profile_preference,fit.active_preferences);const buy=await call('/api/role-buy-feasibility?job_profile='+role.code+'&requested_buy=2');assert.equal(buy.future_capacity.available_hires,null);assert.equal(buy.historical_external.filled_requisitions,rows.role_recruiting.find(r=>r.job_profile_code===role.code).external_fills);}
 for(const [path,body]of [
 ['workforce-response-plan',{actions,skill_code:rows.response_recruiting[0].skill_code,allocation}],['role-workforce-response-plan',{actions,job_profile:job,allocation}],['workforce-response-portfolio',{actions,plans:base.role_plans}],['business-unit-response-allocation',base],['time-phased-workforce-execution',{...base,schedule}],['workforce-response-constraints',{...base,schedule,constraints}],['constraint-aware-workforce-scheduler',{...base,constraints,scheduling_assumptions:{start_month:'2027-01',earliest_effective_months:{build:'2027-01',move:'2027-01',buy:'2027-01'},monthly_capacity:{build:1,move:1,buy:2}}}]
 ]){const value=await call('/api/'+path,body);assert.equal(value.capacity_feasibility.available_movers,null);assert.equal(value.data_meta.datasetToken,token);}
 const solution=await call('/api/workforce-solution',{...emptyWorkforcePlanInput(),businessUnit:org,jobProfile:job,intent:'additional',roles:'4',build:'1',move:'1',buy:'2',backfills:'0',planningMonth:'2027-01',months:'12'});assert.equal(solution.capacity_feasibility.overall_feasible,null);assert.equal(solution.confirmed_completion_date,null);
});

test('candidate rejects unsupported calculations and all network/model paths',async()=>{
 await call('/api/scenario-modeler',{assumptions:{annual_growth_pct:999}},400);await call('/api/role-workforce-response-plan',{actions,job_profile:job,allocation:{...allocation,borrow:1}},400);
 for(const path of ['/api/chat','/api/capability-agent','/api/home-plan-conversation','/api/home-solution-conversation','/api/workforce-solution/intake']){await call(path,{},503);assert.equal(local9037RequestAllowed({...process.env,NODE_ENV:'development'},request(path,{})),false);}
 assert.equal(local9037RequestAllowed({...process.env,NODE_ENV:'development'},request('/api/bls')),false);
 assert.equal((await binding.handle(request('/api/scenario-modeler',{},'legacy-v1:0'))).status,409);
 assert.equal(globalThis.__offlineNetworkAttempts,0);
});
