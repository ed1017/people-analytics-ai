/** Pure typed-output contract checks; no language-model behavior is asserted. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,openerRequest,bindClarificationReply,continuationRequest,digest} from './fixtures/swp-clarification-continuation.mjs';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {illustrativeServiceReview,demandQuantityFields,serviceIllustrationScope,createDemandReview} from '../lib/swp-demand.ts';
import {createServiceStaffingDemo,compareSwpDemo,serviceOptionEffort} from '../lib/swp-demo.ts';
import {fixtureRuntime,final} from './fixtures/home-solution-conversation.mjs';
const runtime=steps=>({...fixtureRuntime(steps),now:()=>new Date(fixture.clock),demand:{datasetToken:fixture.datasetToken},loadProjection:async()=>{throw Error('Database loader forbidden');}});
const signal=()=>new AbortController().signal;
async function syntheticAnchor(){
 const request=openerRequest();
 const reply=await converseSolutions(request,runtime([final('Productive availability is unknown. What kind of work will these contracts require?')]),signal());
 return bindClarificationReply(reply);
}
test('a synthetic clarification is preserved before exactly three unarmed follow-ups',async()=>{
 const anchor=await syntheticAnchor(),before=structuredClone(anchor),r=continuationRequest(0,anchor);
 assert.equal(fixture.paidExecutionAuthorized,false);assert.equal(fixture.firstReplyEmbedded,false);
 assert.equal(fixture.followups.length,3);assert.equal(anchor.state.turns.length,2);
 assert.equal(anchor.reply.demandReview,undefined);assert.deepEqual(r.state,anchor.state);assert.deepEqual(anchor,before);
 assert.equal(r.evidence.sources.length,18);assert(r.evidence.sources.every(s=>['unavailable','invalid'].includes(s.status)));
 assert(!fixture.followups[0].includes(serviceIllustrationScope));
 assert.throws(()=>continuationRequest(3,anchor),/Exactly three/);
 assert.throws(()=>continuationRequest(0,null),/binding/);
});
test('changed reply, first-turn state and discarded history cannot become the continuation anchor',async()=>{
 const anchor=await syntheticAnchor();
 for(const mutate of [a=>a.reply.answer+='changed',a=>a.state.questions.push('Changed'),a=>a.state.turns[1].text+='changed']){
  const bad=structuredClone(anchor);mutate(bad);assert.throws(()=>continuationRequest(0,bad),/binding changed/);
 }
 const changed=structuredClone(anchor.state);changed.questions.push('Changed');assert.throws(()=>continuationRequest(0,anchor,changed),/exact prior state/);
 const swapped=structuredClone(anchor.state);swapped.turns[1].text='Replacement';assert.throws(()=>continuationRequest(0,anchor,swapped),/exact clarification history/);
 assert.throws(()=>bindClarificationReply({...anchor.reply,demandReview:{}}),/clarification reply required/);
});
test('proposed client-operations scope and two partial corrections retain code/provenance guards',async()=>{
 const anchor=await syntheticAnchor(),first=continuationRequest(0,anchor),context=first.goalContext.scenarioReview;
 const spec=illustrativeServiceReview(context,fixture.clock).spec;
 spec.objective=fixture.opener;spec.objectiveTurnId='swp-preview-user-1';
 for(const b of [...demandQuantityFields.map(k=>spec[k].basis),spec.scopeBasis,spec.linkageBasis,spec.startBasis,spec.monthsBasis])if(b.kind==='illustrative')b.kind='model-proposed';
 spec.scopeBasis={kind:'model-proposed',turnId:null,quote:null,explanation:'Proposed narrow client-operations slice for the stated client ticket work; not a complete technical delivery or service-level model.'};
 spec.contracts.basis={kind:'user-supplied',turnId:'swp-preview-user-1',quote:'two new managed-services contracts',explanation:'Stated contract count, still an unverified scenario premise.'};
 let reply=await converseSolutions(first,runtime([{name:'review_service_demand',args:{spec}},final('Review these proposed editable assumptions; they are not measured availability.')]),signal());
 let review=reply.demandReview,state=reply.state,priorDraft,priorBridge;
 assert.equal(review.result.status,'calculated');assert.equal(review.spec.scopeBasis.kind,'model-proposed');
 assert.equal(review.spec.hoursPerContract.basis.kind,'model-proposed');assert.equal(review.spec.budgetUsd.basis.kind,'unknown');
 async function localAcceptance(){
  const bridge={review,reviewedAt:fixture.clock,staffingReviewedAt:fixture.clock,priorAccepted:priorBridge?[...priorBridge.priorAccepted,{review:priorBridge.review,reviewedAt:priorBridge.reviewedAt}]:[]};
  const draft=await createServiceStaffingDemo('guided-swp-preview',bridge,fixture.clock,priorDraft?{draft:priorDraft,bridge:priorBridge}:undefined),result=await compareSwpDemo(draft);
  priorDraft=draft;priorBridge=bridge;
  return result.options.map(o=>({mix:o.candidate.mix,cash:o.candidate.cash.complete,endDateLimits:o.candidate.status,effort:serviceOptionEffort(o,bridge)}));
 }
 let comparison=await localAcceptance();
 for(const [index,fields] of [[1,[['months',9]]],[2,[['existingRoles',4],['availabilityPct',25]]]]){
  const request=continuationRequest(index,anchor,state,review,comparison),before=structuredClone(review),basis={kind:'user-supplied',turnId:request.message.id,quote:request.message.text,explanation:'Explicit scenario correction; not verified.'};
  const changes=fields.map(([field,value])=>({field,quantity:field==='months'?null:{...review.spec[field],value,basis},number:field==='months'?value:null,text:null,basis}));
  reply=await converseSolutions(request,runtime([{name:'revise_service_demand',args:{edit:{baseKey:review.key,changes}}},final('Changed only the requested inputs. Other assumptions and uncertainty remain.')]),signal());
  review=reply.demandReview;state=reply.state;
  const allowed=fields.flatMap(([f])=>f==='months'?['months','monthsBasis']:[f]);
  for(const key of Object.keys(before.spec).filter(k=>!allowed.includes(k)))assert.deepEqual(review.spec[key],before.spec[key]);
  for(const [field,value]of fields){assert.equal(field==='months'?review.spec.months:review.spec[field].value,value);assert.equal(field==='months'?review.spec.monthsBasis.turnId:review.spec[field].basis.turnId,request.message.id);}
  comparison=await localAcceptance();
 }
 assert.equal(review.result.workloadHours,6000);assert.equal(review.result.availableFte,1);assert.equal(review.result.capacityHours,1200);assert.equal(review.result.gapHours,4800);assert.equal(review.result.additionalRoles,4);
 assert(comparison.every(o=>o.mix.build+o.mix.move===0));assert.equal(state.turns.length,8);assert.equal(digest(state.turns.slice(0,2)),digest(anchor.state.turns));
 const other=structuredClone(review.spec);other.scope='Infrastructure engineers';for(const field of demandQuantityFields)other[field].scope=other.scope;
 const otherReview=createDemandReview(other,context,'unrelated-role',review.basisTurns);
 await assert.rejects(()=>createServiceStaffingDemo('guided-swp-other',{review:otherReview,reviewedAt:fixture.clock,staffingReviewedAt:fixture.clock,priorAccepted:[]},fixture.clock),/another role needs separately reviewed/);
});
