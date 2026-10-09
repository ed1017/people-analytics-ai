/** Offline schema/runtime regressions; mocked tool calls are not model validation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {SWP_DEMAND_MODE,illustrativeServiceReview,demandQuantityFields,serviceDemandTool,demandPatchTool,validateServiceDemand,createDemandReview,reviseDemandReview,demandPeriodFeedback} from '../lib/swp-demand.ts';
import {assertSolutionShape} from '../lib/home-solution-conversation-schema.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {solutionRequest,fixtureRuntime,final} from './fixtures/home-solution-conversation.mjs';
import {periodFailureSpec} from './fixtures/swp-demand-period-failures.mjs';
import {fixture,openerRequest,bindClarificationReply,continuationRequest} from './fixtures/swp-clarification-continuation.mjs';

const context={conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:'swp-demand-period-contract',datasetToken:'legacy-v1:0',boundGoal:{id:'',statement:''},revision:1};
const rateFields=['hoursPerContract','productiveHoursPerFte'];
const totalFields=demandQuantityFields.filter(field=>!rateFields.includes(field));
const base=()=>illustrativeServiceReview(context,'2026-10-08T12:00:00Z');
const userBasis={kind:'user-supplied',turnId:'user-1',quote:'Use four existing roles.',explanation:'Explicit fictional scenario input; not measured allocation.'};
const change=(review,field,period)=>({field,quantity:{...review.spec[field],period,basis:userBasis},number:null,text:null,basis:userBasis});
const patch=(review,field,period)=>({baseKey:review.key,changes:[change(review,field,period)]});
const runtime=steps=>({...fixtureRuntime(steps),demand:{datasetToken:context.datasetToken},loadProjection:async()=>{throw Error('Source reads forbidden');}});
const signal=()=>new AbortController().signal;
function request(review=null){const r=solutionRequest(userBasis.quote);r.goalContext={scenarioReview:{...context,demandProposal:review}};return r;}
function initialSpec(){const spec=structuredClone(base().spec);spec.objectiveTurnId='user-1';return spec;}

test('initial and revision tool schemas expose only the period supported by each quantity',()=>{
 const review=base();
 for(const field of demandQuantityFields)for(const period of [null,'month','year','horizon','week']){
  const spec=structuredClone(review.spec);spec[field].period=period;
  const initial=()=>assertSolutionShape({spec},serviceDemandTool.parameters);
  const edited=()=>assertSolutionShape({edit:patch(review,field,period)},demandPatchTool.parameters);
  if(period===null||rateFields.includes(field)&&period!=='week'){assert.doesNotThrow(initial);assert.doesNotThrow(edited);}
  else {assert.throws(initial);assert.throws(edited);assert.throws(()=>validateServiceDemand(spec,review.basisTurns));}
 }
});

test('count, FTE fraction and percentage units match the existing runtime bounds',()=>{
 const review=base();
 for(const [field,value] of [['contracts',1.5],['existingRoles',1.5],['explicitAdditionalRoles',1.5],['existingFtePerRole',1.01],['ftePerRole',1.01],['availabilityPct',100.01]]){
  const spec=structuredClone(review.spec);spec[field].value=value;
  if(spec[field].basis.kind==='unknown')spec[field].basis=structuredClone(spec.contracts.basis);
  assert.throws(()=>assertSolutionShape({spec},serviceDemandTool.parameters),field);
  const edit=patch(review,field,null);edit.changes[0].quantity.value=value;
  assert.throws(()=>assertSolutionShape({edit},demandPatchTool.parameters),field);
  assert.throws(()=>validateServiceDemand(spec,review.basisTurns),field);
 }
 for(const field of totalFields){
  const spec=structuredClone(review.spec);spec[field]={...spec[field],value:null,period:null,basis:{kind:'unknown',turnId:null,quote:null,explanation:'Not supplied.'}};
  assert.doesNotThrow(()=>validateServiceDemand(spec,review.basisTurns));
  spec[field].period='horizon';assert.throws(()=>validateServiceDemand(spec,review.basisTurns));
 }
});

test('monthly, annual and horizon hour rates retain explicit equivalent calculations',()=>{
 const review=base(),hourValues={year:4000,month:4000/12,horizon:1000},fteValues={year:1600,month:1600/12,horizon:400};
 for(const effortPeriod of ['month','year','horizon'])for(const capacityPeriod of ['month','year','horizon']){
  const spec=structuredClone(review.spec);spec.months=3;spec.existingRoles.value=4;spec.availabilityPct.value=25;
  spec.hoursPerContract.period=effortPeriod;spec.hoursPerContract.value=hourValues[effortPeriod];
  spec.productiveHoursPerFte.period=capacityPeriod;spec.productiveHoursPerFte.value=fteValues[capacityPeriod];
  const result=createDemandReview(spec,context,'rates',review.basisTurns).result;
  assert.equal(result.status,'calculated');assert(Math.abs(result.workloadHours-2000)<1e-7);assert(Math.abs(result.capacityHours-400)<1e-7);assert.equal(result.additionalRoles,4);
 }
 for(const field of rateFields){const spec=structuredClone(review.spec);spec[field].period=null;const result=createDemandReview(spec,context,'unknown-rate',review.basisTurns).result;assert.equal(result.status,'needs-inputs');assert.equal(result.additionalRoles,null);assert(result.missing.some(reason=>reason.startsWith(field+':')));}
});

test('revision schemas bind field to quantity, number or text without changing retained values',()=>{
 const review=base(),turns=[{id:'user-1',text:userBasis.quote}];
 const edit=patch(review,'existingRoles',null);edit.changes[0].quantity.value=4;
 const before=structuredClone(review),next=reviseDemandReview(review,edit,context,'edit',turns,'user-1');
 assert.deepEqual(review,before);assert.equal(next.spec.existingRoles.value,4);assert.equal(next.spec.existingRoles.period,null);assert.deepEqual(next.spec.existingRoles.basis,userBasis);
 for(const field of demandQuantityFields.filter(field=>field!=='existingRoles'))assert.deepEqual(next.spec[field],review.spec[field]);
 const months={baseKey:review.key,changes:[{field:'months',quantity:null,number:9,text:null,basis:userBasis}]};
 assert.doesNotThrow(()=>assertSolutionShape({edit:months},demandPatchTool.parameters));
 for(const mutate of [p=>p.changes[0].number=9.5,p=>p.changes[0].quantity=review.spec.contracts,p=>p.changes[0].text='9']){const bad=structuredClone(months);mutate(bad);assert.throws(()=>assertSolutionShape({edit:bad},demandPatchTool.parameters));}
 const wrongBasis=structuredClone(edit);wrongBasis.changes[0].quantity.basis=review.spec.contracts.basis;
 assert.throws(()=>reviseDemandReview(review,wrongBasis,context,'bad-basis',turns,'user-1'),/basis/);
});

test('invalid periods receive field-specific feedback and never mutate or calculate a review',async()=>{
 const spec=initialSpec();spec.contracts.period='horizon';spec.existingRoles.period='year';const before=structuredClone(spec);
 let seen;
 const r=runtime([{name:'review_service_demand',args:{spec}},input=>{seen=JSON.parse(input.at(-1).output);return final('The proposal did not calculate; its count periods need correction.');}]);
 const reply=await converseSolutions(request(),r,signal());
 assert.equal(reply.demandReview,undefined);assert.equal(seen.code,'invalid_demand_period');assert.deepEqual(seen.invalidPeriods.map(issue=>[issue.field,issue.allowedPeriods]),[['contracts',[null]],['existingRoles',[null]]]);
 assert.match(seen.instruction,/Do not silently convert values or change provenance/);assert.deepEqual(spec,before);assert.equal(reply.usage.toolCalls,1);assert.equal(reply.usage.modelRounds,2);
});

test('only an explicit corrected tool proposal can calculate within the existing round budget',async()=>{
 const bad=initialSpec();bad.contracts.period='year';const corrected=structuredClone(bad);corrected.contracts.period=null;
 const r=runtime([{name:'review_service_demand',args:{spec:bad}},input=>{assert.equal(JSON.parse(input.at(-1).output).code,'invalid_demand_period');return {name:'review_service_demand',args:{spec:corrected}};},final('Review these unverified scenario assumptions.')]);
 const reply=await converseSolutions(request(),r,signal());assert.equal(reply.demandReview.result.status,'calculated');assert.deepEqual(reply.demandReview.spec,corrected);assert.equal(bad.contracts.period,'year');assert.equal(reply.usage.toolCalls,2);assert.equal(reply.usage.modelRounds,3);
});

test('invalid revision feedback preserves the prior review and all provenance',async()=>{
 const review=base(),before=structuredClone(review),edit=patch(review,'existingRoles','horizon');edit.changes[0].quantity.value=4;
 let seen;const r=runtime([{name:'revise_service_demand',args:{edit}},input=>{seen=JSON.parse(input.at(-1).output);return final('The current assumptions are unchanged; the proposed count period is invalid.');}]);
 const reply=await converseSolutions(request(review),r,signal());assert.equal(reply.demandReview,undefined);assert.equal(seen.code,'invalid_demand_period');assert.equal(seen.invalidPeriods[0].path,'edit.changes[0].quantity.period');assert.deepEqual(review,before);
 assert.throws(()=>reviseDemandReview(review,edit,context,'bad-edit',[{id:'user-1',text:userBasis.quote}],'user-1'));
});

test('period guidance covers both tools, while non-demand calls retain ordinary validation',()=>{
 for(const tool of [serviceDemandTool,demandPatchTool])for(const field of demandQuantityFields)assert(tool.description.includes(field));
 assert.equal(demandPeriodFeedback('read_clock',{spec:{contracts:{period:'year'}}}),null);
 assert.equal(demandPeriodFeedback('review_service_demand',{spec:initialSpec()}),null);
 const malformed=initialSpec();malformed.contracts.extra='unexpected';assert.throws(()=>assertSolutionShape({spec:malformed},serviceDemandTool.parameters));
});

test('both observed invalid proposal shapes reject all seven non-rate periods, including unknown values',()=>{
 for(const variant of ['monthly-totals','horizon-totals']){
  const args={spec:periodFailureSpec(variant,context)},before=structuredClone(args);
  assert.throws(()=>assertSolutionShape(args,serviceDemandTool.parameters));
  const feedback=demandPeriodFeedback('review_service_demand',args);
  assert.equal(feedback.code,'invalid_demand_period');assert.deepEqual(feedback.invalidPeriods.map(issue=>issue.field),totalFields);
  assert.equal(args.spec.existingRoles.value,null);assert.equal(args.spec.availabilityPct.value,0);assert.equal(args.spec.explicitAdditionalRoles.value,null);assert.equal(args.spec.budgetUsd.value,null);
  assert.deepEqual(args,before);
 }
});

test('a structured incomplete review survives nine-month correction until user supplies four staff at 25%',async()=>{
 const opener=await converseSolutions(openerRequest(),runtime([final('Which work will these contracts require?')]),signal());
 const anchor=bindClarificationReply(opener),first=continuationRequest(0,anchor),c=first.goalContext.scenarioReview;
 const spec=periodFailureSpec('horizon-totals',c);
 // Explicit offline counterfactual proposal. Production never coerces invalid periods.
 for(const field of totalFields)spec[field].period=null;
 let reply=await converseSolutions(first,runtime([{name:'review_service_demand',args:{spec}},final('Review the proposed assumptions; the existing staff count is still unknown.')]),signal());
 let review=reply.demandReview,state=reply.state;
 assert.equal(review.result.status,'needs-inputs');assert.equal(review.result.additionalRoles,null);assert.equal(review.spec.existingRoles.basis.kind,'unknown');assert.equal(review.spec.availabilityPct.value,0);
 for(const [index,fields] of [[1,[['months',9]]],[2,[['existingRoles',4],['availabilityPct',25]]]]){
  const nextRequest=continuationRequest(index,anchor,state,review);
  // A retained proposal is not an accepted staffing scenario. The historical
  // helper targets the fully specified lane; this incomplete lane must not claim acceptance.
  nextRequest.goalContext.scenarioReview.acceptedForScenario=false;
  const before=structuredClone(review),basis={kind:'user-supplied',turnId:nextRequest.message.id,quote:nextRequest.message.text,explanation:'Explicit fictional user correction, not verified allocation.'};
  const changes=fields.map(([field,value])=>({field,quantity:field==='months'?null:{...review.spec[field],value,basis},number:field==='months'?value:null,text:null,basis}));
  reply=await converseSolutions(nextRequest,runtime([{name:'revise_service_demand',args:{edit:{baseKey:review.key,changes}}},final('Updated the named assumptions and retained the remaining uncertainty.')]),signal());
  review=reply.demandReview;state=reply.state;
  const changed=fields.flatMap(([field])=>field==='months'?['months','monthsBasis']:[field]);
  for(const field of Object.keys(before.spec).filter(field=>!changed.includes(field)))assert.deepEqual(review.spec[field],before.spec[field]);
  for(const [field] of fields)assert.equal(field==='months'?review.spec.monthsBasis.turnId:review.spec[field].basis.turnId,nextRequest.message.id);
  if(index===1){assert.equal(review.result.status,'needs-inputs');assert.equal(review.spec.existingRoles.value,null);assert.equal(review.spec.existingRoles.basis.kind,'unknown');assert.equal(review.result.additionalRoles,null);}
 }
 assert.equal(review.result.status,'calculated');assert.equal(review.spec.months,9);assert.equal(review.result.workloadHours,1440);assert.equal(review.result.productiveHoursInHorizon,1080);assert.equal(review.result.availableFte,1);assert.equal(review.result.capacityHours,1080);assert.equal(review.result.gapHours,360);assert.equal(review.result.additionalFte,1/3);assert.equal(review.result.additionalRoles,1);
 assert.equal(review.spec.budgetUsd.basis.kind,'unknown');assert.equal(review.spec.budgetUsd.value,null);assert.equal(review.spec.explicitAdditionalRoles.value,null);assert.equal(state.turns.length,8);assert.deepEqual(state.turns.slice(0,2),anchor.state.turns);assert.equal(fixture.paidExecutionAuthorized,false);
});
