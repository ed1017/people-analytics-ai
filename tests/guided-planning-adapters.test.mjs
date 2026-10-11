import test from 'node:test';
import assert from 'node:assert/strict';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {planningCalculationRef} from '../lib/guided-planning-adapters.ts';
import {editHiringBudget,hiringBudgetView} from '../lib/home-hiring-budget.ts';
import {calculateHiringBudget,emptyHiringBudget} from '../lib/hiring-budget.ts';
import {solutionRequest,fixtureRuntime,final,project,projectionSpec} from './fixtures/home-solution-conversation.mjs';
const proposed={kind:'model-proposed',turnId:null,quote:null,explanation:'Illustrative sensitivity premise for review; not a source fact or salary quote.'};
const supplied=request=>({kind:'user-supplied',turnId:request.message.id,quote:request.message.text,explanation:'Interpreted current user premise.'});
const initial=request=>[{field:'hires',value:10,basis:supplied(request)},{field:'budget',value:1000000,basis:supplied(request)},{field:'role',value:'engineers',basis:supplied(request)}];
const assumptions=Object.entries({currency:'USD',months:12,startMonth:'2027-01',arrivalDate:'2027-01-01',ftePerHire:1,payBasis:'per_hire',annualAdditionalCostPerHire:20000,recruitingFeePerHire:10000}).map(([field,value])=>({field,value,basis:proposed}));
const recommend=(input,reference)=>{
 const output=input.findLast(x=>x.type==='function_call_output'),result=JSON.parse(output.output),binding=result.planningGuidance.binding;
 return {...final(),answer:{findings:'The requested count and cap are retained; company salary is unavailable.',decisionRationale:'Use a conditional spending ceiling to screen quotes; it is not an assumed salary or demonstrated affordability.',caveats:['Currency, timing and additional costs are proposed scenario inputs. Availability, readiness and unlisted costs remain unverified.'],recommendedPlan:{name:'Validate an affordable hiring route',steps:['Confirm the proposed currency and budget period with Finance.','Request comparable quotes against the checked ceiling and review remaining costs before committing.'],calculationRefs:[reference??binding.reference]}}};
};
const ask=async(request,steps)=>{const runtime=fixtureRuntime(steps);runtime.natural={datasetToken:'fixture:0'};const result=await converseSolutions(request,runtime,new AbortController().signal);assert.equal(runtime.reads,0);return {result,runtime};};
test('hiring recommendation binds preserved user premises and hypothetical inputs to checked spending ceiling without inventing salary',async()=>{
 const request=solutionRequest('We need 10 engineers, but Finance capped the budget at $1 million. What are our options?'),before=JSON.stringify(request);
 const {result,runtime}=await ask(request,[{name:'review_hiring_budget',args:{changes:[...initial(request),...assumptions]}},input=>recommend(input)]);
 const view=hiringBudgetView(result.state.hiringBudget);assert.equal(view.input.hires,10);assert.equal(view.input.budget,1000000);assert.equal(view.annualBasePayCeiling,70000);assert.equal(view.input.annualBasePay,null);assert.equal(view.periodCost,null);assert.equal(view.budgetStatus,'unknown');
 assert.equal(result.state.hiringBudget.origins.currency.kind,'model-proposed');assert.equal(result.state.hiringBudget.origins.budget.kind,'user-supplied');assert.match(result.answer,/Recommended Action Plan/);assert.deepEqual(result.candidateIds,[]);assert.equal(runtime.rounds,2);assert.equal(JSON.stringify(request),before);
});
test('absent currency/period/non-base cost never generates a salary ceiling or zero fallback',()=>{
 const base={...emptyHiringBudget(),hires:10,budget:1000000,...Object.fromEntries(assumptions.map(c=>[c.field,c.value]))};
 for(const field of ['currency','months','startMonth','arrivalDate','annualAdditionalCostPerHire','recruitingFeePerHire'])assert.equal(calculateHiringBudget({...base,[field]:null}).annualBasePayCeiling,null,field);
 assert.equal(calculateHiringBudget({...base,arrivalDate:'2028-01-01'}).annualBasePayCeiling,null);
});
test('earlier model-proposed null can receive a proposal, but user withdrawal/count/cap cannot be overwritten',()=>{
 const r=solutionRequest('Ten engineers with a million dollar cap.'),s=editHiringBudget(r,'fixture:0',[...initial(r),{field:'annualBasePay',value:null,basis:proposed}]);
 const next=solutionRequest('Propose a hypothetical scenario.',false,{...r.state,hiringBudget:s},2),changed=editHiringBudget(next,'fixture:0',[{field:'annualBasePay',value:90000,basis:proposed}]);assert.equal(changed.inputs.annualBasePay,90000);
 for(const field of ['hires','budget'])assert.throws(()=>editHiringBudget(next,'fixture:0',[{field,value:5,basis:proposed}]),/user correction/);
 const withdrawal=editHiringBudget(next,'fixture:0',[{field:'annualBasePay',value:null,basis:supplied(next)}]);
 // Explicit withdrawal of a prior value is never a model invitation.
 const r2=solutionRequest('Salary is unknown.',false,{...r.state,hiringBudget:changed},3);const withdrawn=editHiringBudget(r2,'fixture:0',[{field:'annualBasePay',value:null,basis:supplied(r2)}]);
 assert.throws(()=>editHiringBudget({...r2,state:{...r2.state,hiringBudget:withdrawn}},'fixture:0',[{field:'annualBasePay',value:90000,basis:proposed}]),/user correction/);assert.equal(withdrawal.inputs.annualBasePay,null);
});
test('foreign, stale and changed-scope calculation references fail before persistence',async()=>{
 const r=solutionRequest('Ten engineers and a million dollar cap.');let old;
 const step={name:'review_hiring_budget',args:{changes:initial(r)}};
 await assert.rejects(ask(r,[step,input=>recommend(input,'hiring-foreign')]),/current checked inputs/);
 await assert.rejects(ask(r,[step,input=>{old=JSON.parse(input.findLast(x=>x.type==='function_call_output').output).planningGuidance.binding.reference;return {name:'review_hiring_budget',args:{changes:assumptions}};},input=>recommend(input,old)]),/current checked inputs/);
 const s=editHiringBudget(r,'fixture:0',initial(r)),state={...r.state,hiringBudget:s},ref=await planningCalculationRef('hiring',r,state);
 for(const request of [{...r,scope:'Another scope'},{...r,requestId:'another'},{...r,evidence:{sources:[]}}])assert.notEqual((await planningCalculationRef('hiring',request,state)).reference,ref.reference);
 const changed=structuredClone(state);changed.hiringBudget.origins.budget.explanation='Changed provenance';assert.notEqual((await planningCalculationRef('hiring',r,changed)).reference,ref.reference);
});
test('projection recommendation references the exact scenario while preserving causality limits',async()=>{
 const request=solutionRequest('Plan for this headcount scenario.'),runtime=fixtureRuntime([project(projectionSpec()),input=>({...recommend(input),answer:{...recommend(input).answer,findings:'This is a scenario, not a prediction.',recommendedPlan:{name:'Review the capacity gap',steps:['Validate the scenario assumptions before choosing an intervention.'],calculationRefs:[JSON.parse(input.findLast(x=>x.type==='function_call_output').output).planningGuidance.binding.reference]}}})]);
 const result=await converseSolutions(request,runtime,new AbortController().signal);assert.match(result.answer,/scenario, not a prediction/);assert.equal(result.state.analyses.length,1);assert.deepEqual(result.candidateIds,[]);
});
test('workload and fixed-staffing adapters preserve native missing inputs and reject changed revisions',async()=>{
 const {editRequiredStaffing,requiredStaffingView}=await import('../lib/home-required-staffing.ts');
 const {fixedChanges,fixedMessages}=await import('./fixtures/required-staffing.mjs');
 const {initialSpec}=await import('./fixtures/natural-business-planning.mjs');
 const r=solutionRequest(fixedMessages.start),fixed=editRequiredStaffing(r,'fixture:0',fixedChanges(r));
 const state={...r.state,requiredStaffing:fixed},ref=await planningCalculationRef('fixed-staffing',r,state);
 assert.equal(ref.revision,fixed.revision);assert.equal(ref.dataset,'fixture:0');assert.deepEqual(ref.missing,requiredStaffingView(fixed).missing);assert.equal(ref.inputKey.length,64);
 const changed=structuredClone(state);changed.requiredStaffing.revision++;assert.notEqual((await planningCalculationRef('fixed-staffing',r,changed)).reference,ref.reference);
 const workloadRequest=solutionRequest('Help plan extra contract work.');
 const run=fixtureRuntime([{name:'review_scoped_service_demand',args:{spec:initialSpec(workloadRequest)}},final('Confirm which operational slice this work covers.')]);run.natural={datasetToken:'fixture:0'};
 const workload=await converseSolutions(workloadRequest,run,new AbortController().signal),binding=await planningCalculationRef('workload',workloadRequest,workload.state);
 assert.ok(binding.missing.includes('Clarify the operational role slice.'));assert.equal(binding.dataset,'fixture:0');assert.equal(binding.resultKey.length,64);
});
test('actual POST emits checked hiring guidance with the existing call and output budgets',async()=>{
 const {offlineBusinessRoute}=await import('./helpers/offline-business-route.mjs');
 const {responseForStep}=await import('./fixtures/natural-business-planning.mjs');
 const route=await offlineBusinessRoute(),body=solutionRequest('We need 10 engineers, but Finance capped the budget at $1 million. What are our options?');
 route.sandbox.__replies.push(responseForStep({name:'review_hiring_budget',args:{changes:[...initial(body),...assumptions]}},0),request=>responseForStep(recommend(request.input),1));
 const response=await route.post(new Request('http://fixture/api/home-solution-conversation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
 const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.match(result.answer,/Recommended Action Plan/);assert.equal(result.state.hiringBudget.inputs.annualBasePay,null);
 assert.equal(route.sandbox.__requests.length,2);for(const request of route.sandbox.__requests){assert.equal(request.max_output_tokens,5000);assert.equal(request.parallel_tool_calls,false);}for(const opts of route.sandbox.__requestOptions)assert.equal(opts.maxRetries,0);
});
test('fixed-staffing discussion retains caveats without adding a competing recommended plan',async()=>{
 const {fixedChanges,fixedMessages}=await import('./fixtures/required-staffing.mjs');
 const body=solutionRequest(fixedMessages.start.replace('fill 10','consider 10')),runtime=fixtureRuntime([{name:'compare_required_staffing',args:{changes:fixedChanges(body)}},{...final(),answer:{findings:'Review the entered staffing premises.',decisionRationale:'The result is conditional on readiness and release.',caveats:['Operational readiness is unverified.']}}]);runtime.natural={datasetToken:'fixture:0'};
 const result=await converseSolutions(body,runtime,new AbortController().signal);assert.match(result.answer,/Operational readiness is unverified/);assert.equal((result.answer.match(/Recommendation:/g)||[]).length,1);
 const duplicate=fixtureRuntime([{name:'compare_required_staffing',args:{changes:fixedChanges(body)}},input=>recommend(input)]);duplicate.natural={datasetToken:'fixture:0'};
 await assert.rejects(converseSolutions(body,duplicate,new AbortController().signal),/already owns its recommendation/);
});
test('same-value explicit null withdrawal replaces proposed provenance and prevents later model fill',()=>{
 const r=solutionRequest('Help with a hiring estimate.'),initial=editHiringBudget(r,'fixture:0',[{field:'annualBasePay',value:null,basis:proposed}]);
 const next=solutionRequest('Leave annual base pay unknown; do not assume it.',false,{...r.state,hiringBudget:initial},2),withdrawn=editHiringBudget(next,'fixture:0',[{field:'annualBasePay',value:null,basis:supplied(next)}]);
 assert.equal(withdrawn.origins.annualBasePay.kind,'user-supplied');assert.equal(withdrawn.origins.annualBasePay.turnId,next.message.id);
 assert.throws(()=>editHiringBudget({...next,state:{...next.state,hiringBudget:withdrawn}},'fixture:0',[{field:'annualBasePay',value:90000,basis:proposed}]),/user correction/);
});
test('annual salary ceilings round down and round-trip within the stated cap',()=>{
 for(const [hires,budget,months,arrivalDate,nonbase,fee] of [[6,1000,12,'2027-01-01',0,0],[7,10000,6,'2027-02-15',100,25],[10,1000000,12,'2027-01-01',20000,10000]]){
  const input={...emptyHiringBudget(),hires,budget,months,startMonth:'2027-01',arrivalDate,currency:'USD',ftePerHire:1,payBasis:'per_hire',annualAdditionalCostPerHire:nonbase,recruitingFeePerHire:fee,otherCostsComplete:true};
  const ceiling=calculateHiringBudget(input).annualBasePayCeiling;if(hires===6)assert.equal(ceiling,166.66);
  const checked=calculateHiringBudget({...input,annualBasePay:ceiling});assert.ok(checked.periodCost<=budget,JSON.stringify(checked));assert.equal(checked.budgetStatus,'within');
 }
});
test('distinct current-turn projections can jointly support a plan, superseded revisions cannot',async()=>{
 const r=solutionRequest('Compare baseline and slower hiring scenarios and recommend a next move.');let firstRef;
 const second=input=>{firstRef=JSON.parse(input.findLast(x=>x.type==='function_call_output').output).planningGuidance.binding.reference;return project({...projectionSpec('slower'),changes:[{field:'fill_rate_pct',kind:'literal',value:50,basis:'illustrative',turnId:null,interpretation:'Unconfirmed slower hiring sensitivity scenario.'}]});};
 const combined=input=>{const answer=recommend(input);answer.answer.recommendedPlan.calculationRefs.unshift(firstRef);return answer;};
 const result=await converseSolutions(r,fixtureRuntime([project(projectionSpec('baseline')),second,combined]),new AbortController().signal);assert.equal(result.state.analyses.length,2);
 const revise=input=>{firstRef=JSON.parse(input.findLast(x=>x.type==='function_call_output').output).planningGuidance.binding.reference;return project({...projectionSpec('baseline'),base:{id:'baseline',revision:1},changes:[{field:'fill_rate_pct',kind:'literal',value:50,basis:'illustrative',turnId:null,interpretation:'Revised sensitivity scenario.'}]});};
 await assert.rejects(converseSolutions(r,fixtureRuntime([project(projectionSpec('baseline')),revise,input=>recommend(input,firstRef)]),new AbortController().signal),/current checked inputs/);
});
test('planning calculations reject prose-only completion and accept a specific unsupported decision with a concrete next step',async()=>{
 const {initialSpec}=await import('./fixtures/natural-business-planning.mjs'),r=solutionRequest('Help plan extra contract work.'),step={name:'review_scoped_service_demand',args:{spec:initialSpec(r)}};
 await assert.rejects(ask(r,[step,{...final(),answer:'Confirm which operational slice this work covers.'}]),/specific unsupported planning outcome/);
 const outcome=input=>{const ref=JSON.parse(input.findLast(x=>x.type==='function_call_output').output).planningGuidance.binding.reference;return {...final(),answer:{findings:'The contract work has no defined operational role slice.',decisionRationale:'A workload-to-staffing calculation is unsupported until scope and effort units are defined.',caveats:['Headcount does not establish free capacity.'],unsupportedPlan:{decision:'Which operational role slice and contracted activities are in scope?',nextStep:'Ask the contract owner to list the activities and their effort period, then compare the resulting workload with explicitly available capacity.',calculationRefs:[ref]}}};};
 const {result}=await ask(r,[step,outcome]);assert.match(result.answer,/Decision needed:/);assert.match(result.answer,/Next step: Ask the contract owner/);assert.deepEqual(result.candidateIds,[]);
});
test('hiring to train/redeploy/hire followup reuses exact original count and role without copying annual rates or availability',async()=>{
 const {editRequiredStaffing,requiredStaffingView}=await import('../lib/home-required-staffing.ts');
 const first=solutionRequest('We need 10 engineers with a million dollar cap.'),review=editHiringBudget(first,'fixture:0',initial(first));
 const follow=solutionRequest('Compare training, redeployment and hiring for the client project in three months.',false,{...first.state,hiringBudget:review},2);
 const changes=[{field:'requiredRoles',value:10,basis:review.origins.hires},{field:'role',value:'engineers',basis:review.origins.role},{field:'months',value:3,basis:supplied(follow)}];
 const state=editRequiredStaffing(follow,'fixture:0',changes),view=requiredStaffingView(state);assert.equal(state.inputs.requiredRoles,10);assert.equal(state.inputs.months,3);assert.equal(state.origins.requiredRoles.turnId,first.message.id);assert.equal(state.inputs.hireCostPerPerson,null);assert.equal(state.inputs.trainablePeople,null);assert.equal(state.inputs.redeployablePeople,null);assert.ok(!view.missing.some(x=>/required headcount/.test(x)));
 assert.throws(()=>editRequiredStaffing({...follow,scope:'Different role scope'},'fixture:0',changes),/scope/);
 assert.throws(()=>editRequiredStaffing(follow,'fixture:0',[{...changes[0],value:11},changes[1]]),/current user turn/);
 assert.throws(()=>editRequiredStaffing({...follow,state:{...follow.state,requiredStaffing:state}},'fixture:0',[{...changes[0],value:9}]),/current user turn/);
});
