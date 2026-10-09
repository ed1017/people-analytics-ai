/** Synthetic typed proposals only; no provider calls or claims of model success. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {createDemandReview,demandQuantityFields} from '../lib/swp-demand.ts';
import {fixture,openerRequest,bindClarificationReply,continuationRequest} from './fixtures/swp-provenance-contract-continuation.mjs';
import {checkContinuationTurn,runProvenanceContractContinuation} from './helpers/swp-provenance-contract-continuation.mjs';
import {periodFailureSpec} from './fixtures/swp-demand-period-failures.mjs';
import {fixtureRuntime,final} from './fixtures/home-solution-conversation.mjs';
const signal=()=>new AbortController().signal;
const runtime=steps=>({...fixtureRuntime(steps),now:()=>new Date(fixture.clock),demand:{datasetToken:fixture.datasetToken},loadProjection:async()=>{throw Error('Database loader forbidden');}});
async function anchor(){return bindClarificationReply(await converseSolutions(openerRequest(),runtime([final('Which work will these contracts require?')]),signal()));}
async function lane({hours=80,productive=120,initialRoles=null,unresolvedScopeAndStart=false}={}){
 const preserved=await anchor(),history=[],runtimes=new Map(),requests=new Map();
 const result=await runProvenanceContractContinuation({anchor:preserved,signal:signal(),record:async event=>{
  if(event.phase==='before-turn')requests.set(event.index,event.request);
  else {const request=requests.get(event.index);history.push({index:event.index,request,reply:event.reply,previous:request.goalContext.scenarioReview.demandProposal,checked:{checks:event.checks}});}
 },complete:async ({index,request,input,finalOnly})=>{
  if(runtimes.has(index))return runtimes.get(index).complete(input,finalOnly);
  const review=request.goalContext.scenarioReview.demandProposal;let tool;
  if(index===0){const spec=periodFailureSpec('horizon-totals',request.goalContext.scenarioReview);for(const field of demandQuantityFields.filter(field=>!['hoursPerContract','productiveHoursPerFte'].includes(field)))spec[field].period=null;spec.hoursPerContract.value=hours;spec.productiveHoursPerFte.value=productive;if(unresolvedScopeAndStart){spec.startMonth=null;spec.startBasis={kind:'unknown',turnId:null,quote:null,explanation:'No start supplied.'};spec.contracts.scope='A different delivery scope';}if(initialRoles!==null){spec.existingRoles.value=initialRoles;spec.existingRoles.basis={...spec.existingFtePerRole.basis};}tool={name:'review_service_demand',args:{spec}};}
  else {const basis={kind:'user-supplied',turnId:request.message.id,quote:request.message.text,explanation:'Explicit synthetic user correction.'},fields=index===1?[['months',9]]:[['existingRoles',4],['availabilityPct',25]];tool={name:'revise_service_demand',args:{edit:{baseKey:review.key,changes:fields.map(([field,value])=>({field,quantity:field==='months'?null:{...review.spec[field],value,basis:{...basis,explanation:'Different explanation for the same user quote.'}},number:field==='months'?value:null,text:null,basis}))}}};}
  const r=fixtureRuntime([tool,final(unresolvedScopeAndStart?'The capacity edits are retained as assumptions. What start month should we use, and do these contracts cover the same role slice?':'Review these scenario assumptions and their remaining uncertainty.')]);runtimes.set(index,r);return r.complete(input,finalOnly);
 }});
 return {preserved,history,review:result.review,state:result.state,result};
}
test('executable fixture allows incomplete initial/horizon stages and calculates only after capacity input',async()=>{
 const r=await lane();assert.deepEqual(r.history.map(h=>h.checked.checks.reviewStatus),['needs-inputs','needs-inputs','calculated']);
 for(const h of r.history){assert.equal(h.request.goalContext.scenarioReview.acceptedForScenario,false);assert.equal(h.request.goalContext.scenarioReview.staffingComparison,null);assert.equal(h.checked.checks.fullAcceptance,false);assert.equal(h.checked.checks.staffingCostsReviewed,false);assert.equal(h.checked.checks.semanticReview,'pending');}
 assert.equal(r.review.result.workloadHours,1440);assert.equal(r.review.result.capacityHours,1080);assert.equal(r.review.result.gapHours,360);assert.equal(r.review.result.additionalRoles,1);
 assert.equal(r.review.spec.budgetUsd.value,null);assert.equal(r.review.spec.budgetUsd.basis.kind,'unknown');assert.equal(r.review.spec.explicitAdditionalRoles.value,null);assert.deepEqual(r.state.turns.slice(0,2),r.preserved.state.turns);assert.equal(fixture.paidExecutionAuthorized,false);
});
test('final arithmetic follows variable model assumptions, including a zero gap',async()=>{
 for(const [hours,productive,workload,capacity,gap,roles] of [[150,100,2700,900,1800,2],[20,120,360,1080,0,0]]){
  const r=await lane({hours,productive});assert.equal(r.review.result.workloadHours,workload);assert.equal(r.review.result.capacityHours,capacity);assert.equal(r.review.result.gapHours,gap);assert.equal(r.review.result.additionalRoles,roles);
 }
});
test('fully specified initial proposals also remain valid without automatic acceptance',async()=>{
 const r=await lane({initialRoles:0});assert.deepEqual(r.history.map(h=>h.checked.checks.reviewStatus),['calculated','calculated','calculated']);assert(r.history.every(h=>!h.checked.checks.acceptedForScenario));
});
test('failed tool calls and fabricated outputs cannot count as an incomplete review',async()=>{
 const r=await lane(),first=r.history[0];
 const missing=structuredClone(first.reply);delete missing.demandReview;assert.throws(()=>checkContinuationTurn(0,first.request,missing),/structured_review_required/);
 const forged=structuredClone(first.reply);forged.demandReview.result.status='calculated';forged.demandReview.result.additionalRoles=1;assert.throws(()=>checkContinuationTurn(0,first.request,forged),/calculation changed/);
 const changed=structuredClone(first.request);changed.goalContext.scenarioReview.acceptedForScenario=true;assert.throws(()=>checkContinuationTurn(0,changed,first.reply),/no_implicit_acceptance/);
});
test('invented missing inputs, changed untouched assumptions and stale provenance fail closed',async()=>{
 const r=await lane(),last=r.history[2],context=last.request.goalContext.scenarioReview;
 function changedReply(mutate){const reply=structuredClone(last.reply),spec=structuredClone(reply.demandReview.spec);mutate(spec);reply.demandReview=createDemandReview(spec,context,last.request.requestId,reply.demandReview.basisTurns);return reply;}
 const incomplete=changedReply(s=>{s.productiveHoursPerFte.value=null;s.productiveHoursPerFte.basis={kind:'unknown',turnId:null,quote:null,explanation:'Still unresolved.'};});assert.throws(()=>checkContinuationTurn(2,last.request,incomplete,last.previous),/untouched_productiveHoursPerFte/);
 const changed=changedReply(s=>s.hoursPerContract.value=81);assert.throws(()=>checkContinuationTurn(2,last.request,changed,last.previous),/untouched_hoursPerContract/);
 const stale=changedReply(s=>s.existingRoles.basis=structuredClone(s.contracts.basis));assert.throws(()=>checkContinuationTurn(2,last.request,stale,last.previous),/edit_provenance/);
 const count=changedReply(s=>s.existingRoles.value=5);assert.throws(()=>checkContinuationTurn(2,last.request,count,last.previous),/four_staff_25_percent/);
 const history=structuredClone(last.reply);history.state.turns[1].text='Replaced the preserved reply';assert.throws(()=>checkContinuationTurn(2,last.request,history,last.previous),/retained_history/);
});
test('portable driver stops after rejection or recorder failure without advancing or coercing',async()=>{
 const preserved=await anchor(),request=continuationRequest(0,preserved),spec=periodFailureSpec('monthly-totals',request.goalContext.scenarioReview),before=structuredClone(spec),r=fixtureRuntime([{name:'review_service_demand',args:{spec}},final('The proposal did not calculate.')]),seen=[];
 await assert.rejects(()=>runProvenanceContractContinuation({anchor:preserved,complete:({index,input,finalOnly})=>{seen.push(index);return r.complete(input,finalOnly);},record:async()=>{}}),/structured_review_required/);
 assert.deepEqual(seen,[0,0]);assert.deepEqual(spec,before);
 await assert.rejects(()=>runProvenanceContractContinuation({anchor:preserved,complete:()=>assert.fail('No completion after receipt failure'),record:async()=>{throw Error('receipt write failed');}}),/receipt write failed/);
});


test('adaptive final stage retains missing date and contract scope instead of forcing a calculation',async()=>{
 const r=await lane({unresolvedScopeAndStart:true});
 assert.deepEqual(r.history.map(h=>h.checked.checks.reviewStatus),['needs-inputs','needs-inputs','needs-inputs']);
 assert.equal(r.review.spec.existingRoles.value,4);assert.equal(r.review.spec.availabilityPct.value,25);
 assert.equal(r.review.spec.startMonth,null);assert.equal(r.review.spec.contracts.scope,'A different delivery scope');
 assert.equal(r.review.result.additionalRoles,null);assert.equal(r.result.requiresClarification,true);assert.equal(r.result.missingRequirements.length,2);
 assert.equal(r.result.scriptedTurnsComplete,true);assert.equal(r.result.journeyComplete,false);assert.equal(r.result.calculatedAcceptance,false);assert.equal(r.result.fullAcceptance,false);
 assert.equal(r.result.nextStep,'explicit-user-clarification-or-reviewed-proposal');assert.equal(r.result.semanticReview,'pending');
 assert.equal(r.history.length,3);assert.equal(fixture.paidExecutionAuthorized,false);
 for(const h of r.history){assert.equal(h.checked.checks.requiresClarification,true);assert.equal(h.checked.checks.calculatedAcceptance,false);}
});
