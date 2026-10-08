/** Synthetic regressions. Exact original model arguments remain private. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {SWP_DEMAND_MODE,illustrativeServiceReview,createDemandReview,readDemandReview,reviseDemandReview,requestDemandContext,serviceDemandSchema,demandPatchSchema} from '../lib/swp-demand.ts';
import {assertSolutionShape} from '../lib/home-solution-conversation-schema.ts';

const context={conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:'swp-demand-provenance-fixture',datasetToken:'legacy-v1:0',boundGoal:{id:'goal-a',statement:'Review delivery capacity'},revision:1};
const text='Use four existing staff. Assume 25% available.',turn={id:'edit-1',text};
const basis={kind:'user-supplied',turnId:turn.id,quote:text,explanation:'Explicit fictional edit; unverified scenario input.'};
const base=()=>illustrativeServiceReview(context,'2026-10-08T12:00:00Z');
function edit(review){return {baseKey:review.key,changes:[['existingRoles',4],['availabilityPct',25]].map(([field,value])=>({field,quantity:{...review.spec[field],value,basis:{quote:basis.quote,explanation:'A different description of the same user source.',turnId:basis.turnId,kind:basis.kind}},number:null,text:null,basis:{...basis}}))};}
const revise=(review,patch,turns=[turn],current=turn.id)=>reviseDemandReview(review,patch,context,'edited-review',turns,current);

test('same source accepts different explanations and property order; outer explanation is retained',()=>{
 const review=base(),patch=edit(review),before=structuredClone({review,patch}),next=revise(review,patch);
 assert.equal(next.spec.existingRoles.value,4);assert.equal(next.spec.availabilityPct.value,25);
 for(const field of ['existingRoles','availabilityPct'])assert.deepEqual(next.spec[field].basis,basis);
 for(const field of Object.keys(review.spec).filter(f=>!['existingRoles','availabilityPct'].includes(f)))assert.deepEqual(next.spec[field],review.spec[field]);
 assert.deepEqual({review,patch},before);assert.deepEqual(readDemandReview(next,context),next);
 assert.equal(next.result.sourceClass,'unverified-scenario-inputs');
});

test('contradictory kind, turn or exact quote rejects the entire multi-edit patch',()=>{
 for(const mutate of [b=>Object.assign(b,{kind:'model-proposed',turnId:null,quote:null}),b=>b.turnId='edit-other',b=>b.quote='Assume 25% available.']){
  const review=base(),patch=edit(review),before=structuredClone(review);mutate(patch.changes[1].quantity.basis);
  assert.throws(()=>revise(review,patch,[turn,{id:'edit-other',text}]),/basis/);assert.deepEqual(review,before);
 }
});

test('schemas and validation reject non-user provenance carrying a user turn or quote',()=>{
 for(const kind of ['model-proposed','illustrative','unknown'])for(const borrowed of [{turnId:turn.id,quote:null},{turnId:null,quote:text},{turnId:turn.id,quote:text}]){
  const review=base(),spec=structuredClone(review.spec);spec.existingRoles={...spec.existingRoles,value:kind==='unknown'?null:4,basis:{kind,explanation:'Synthetic invalid provenance.',...borrowed}};
  assert.throws(()=>assertSolutionShape(spec,serviceDemandSchema));assert.throws(()=>createDemandReview(spec,context,'invalid',[...review.basisTurns,turn]));
 }
 const review=base(),patch=edit(review);patch.changes[0].basis={kind:'model-proposed',turnId:null,quote:null,explanation:'A proposal cannot authorize an edit.'};
 assert.throws(()=>assertSolutionShape(patch,demandPatchSchema));assert.throws(()=>revise(review,patch));
});

test('missing user source, fabricated quote, wrong current turn and stale identity still reject',()=>{
 const review=base(),before=structuredClone(review);
 assert.throws(()=>revise(review,edit(review),[]),/exact quote/);
 assert.throws(()=>revise(review,edit(review),[turn],'other'),/current user turn/);
 const forged=edit(review);for(const c of forged.changes)c.quantity.basis.quote=c.basis.quote='Never supplied';
 assert.throws(()=>revise(review,forged),/exact quote/);
 const stale=edit(review);stale.baseKey+=' ';assert.throws(()=>revise(review,stale),/exact current/);
 const tampered=structuredClone(review);tampered.result.additionalRoles=99;assert.throws(()=>revise(tampered,edit(tampered)),/calculation changed/);
 assert.deepEqual(review,before);
});

test('duplicate turn IDs cannot replace retained evidence text',()=>{
 const review=base(),retained=review.basisTurns[0];
 assert.throws(()=>revise(review,edit(review),[turn,{...retained,text:'Changed the original evidence.'}]),/Conflicting text/);
 assert.throws(()=>revise(review,edit(review),[turn,{...turn,text:'Conflicting current text.'}]),/Conflicting text/);
 assert.throws(()=>createDemandReview(review.spec,context,'bad',[retained,{...retained,text:'Conflict'}]),/Conflicting text/);
 assert.doesNotThrow(()=>revise(review,edit(review),[retained,turn,{...turn}]));
});

test('goal identity uses exact fields, independent of object property order',()=>{
 const request={goal:{statement:context.boundGoal.statement,id:context.boundGoal.id},goalContext:{scenarioReview:context}};
 assert.deepEqual(requestDemandContext(request,context.datasetToken),context);
 for(const field of ['id','statement']){const changed=structuredClone(request);changed.goal[field]+=' changed';assert.throws(()=>requestDemandContext(changed,context.datasetToken),/goal or dataset changed/);}
 assert.throws(()=>requestDemandContext(request,'legacy-v1:1'),/goal or dataset changed/);
});

test('valid capacity edits preserve missing date and mismatched scope until an explicit clarification',()=>{
 const original=base(),spec=structuredClone(original.spec);
 spec.startMonth=null;spec.startBasis={kind:'unknown',turnId:null,quote:null,explanation:'No date supplied.'};spec.contracts.scope='A different contract delivery slice';
 const review=createDemandReview(spec,context,'incomplete',original.basisTurns),next=revise(review,edit(review));
 assert.equal(next.result.status,'needs-inputs');assert.equal(next.result.additionalRoles,null);assert.equal(next.result.missing.length,2);
 assert.deepEqual(next.spec.startBasis,spec.startBasis);assert.equal(next.spec.startMonth,null);assert.equal(next.spec.contracts.scope,spec.contracts.scope);
 const supplied={id:'explicit-clarification',text:'Start in January 2027. The contracts use the same illustrative role slice.'};
 const b={kind:'user-supplied',turnId:supplied.id,quote:supplied.text,explanation:'Explicit fictional clarification, not verified operations.'};
 const clarified=revise(next,{baseKey:next.key,changes:[{field:'startMonth',quantity:null,number:null,text:'2027-01',basis:b},{field:'contracts',quantity:{...next.spec.contracts,scope:next.spec.scope,basis:b},number:null,text:null,basis:b}]},[supplied],supplied.id);
 assert.equal(clarified.result.status,'calculated');assert.equal(clarified.spec.months,12);assert.equal(clarified.result.workloadHours,8000);assert.equal(clarified.result.capacityHours,1600);assert.equal(clarified.result.additionalRoles,4);
 for(const field of Object.keys(next.spec).filter(f=>!['startMonth','startBasis','contracts'].includes(f)))assert.deepEqual(clarified.spec[field],next.spec[field]);
});
