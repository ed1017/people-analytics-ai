/** Offline reference/identity checks; no provider client or recorded reply in source. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {illustrativeServiceReview,createDemandReview,serviceIllustrationScope} from '../lib/swp-demand.ts';
import {createReferencedDemandReview,reviseReferencedDemandReview,referencedDemandView,demandReferenceId,reviewReferencedDemandTool,reviseReferencedDemandTool,demandReferenceInstructions} from '../lib/swp-demand-reference.ts';
import {assertSolutionShape} from '../lib/home-solution-conversation-schema.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {solutionRequest,fixtureRuntime,final} from './fixtures/home-solution-conversation.mjs';
const context={conversationMode:'business-swp-demand-v1',classification:'unverified-business-inputs',intakeId:'swp-demand-reference',datasetToken:'legacy-v1:0',boundGoal:{id:'',statement:''},revision:1};
const base=()=>illustrativeServiceReview(context,'2026-10-08T12:00:00Z');
const turn={id:'user-change',text:'Use four staff, 25% available for this role slice.'};
const basis={kind:'user-supplied',turnId:turn.id,quote:turn.text,explanation:'Explicit fictional scenario correction.'};
const ref=demandReferenceId('request-edit',0),retain={ref:'retain'};
const edit=()=>({reviewRef:ref,changes:[{field:'existingRoles',quantity:{value:4,period:retain,scope:retain},number:null,text:null,basis:{...basis}}]});
const revise=(source,raw)=>reviseReferencedDemandReview(source,raw,context,'request-edit',[turn],turn.id,ref);
test('initial scope references resolve explicitly; genuinely different and unknown scopes remain distinct',()=>{
 const source=base(),spec=structuredClone(source.spec);spec.scope={ref:'illustrative-service-role'};spec.existingRoles.scope={ref:'scenario-scope'};spec.contracts.scope='Different delivery work';
 const next=createReferencedDemandReview(spec,context,'proposal',source.basisTurns);assert.equal(next.spec.scope,serviceIllustrationScope);assert.equal(next.spec.existingRoles.scope,next.spec.scope);assert.equal(next.spec.contracts.scope,'Different delivery work');assert.equal(next.result.status,'needs-inputs');
 const unknown=structuredClone(spec);unknown.scope=null;unknown.scopeBasis={kind:'unknown',turnId:null,quote:null,explanation:'Unresolved role slice.'};assert.throws(()=>createReferencedDemandReview(unknown,context,'unknown',source.basisTurns),/explicit role slice/);
 const invalid=structuredClone(spec);invalid.scope={ref:'real-engineering-workforce'};assert.throws(()=>createReferencedDemandReview(invalid,context,'invalid',source.basisTurns));
});
test('compact edit retains period and scope by code, without repeating basis or equality key',()=>{
 const source=base(),before=structuredClone(source),next=revise(source,edit());
 assert.equal(next.spec.existingRoles.value,4);assert.equal(next.spec.existingRoles.period,null);assert.equal(next.spec.existingRoles.scope,source.spec.existingRoles.scope);assert.deepEqual(next.spec.existingRoles.basis,basis);
 for(const field of Object.keys(source.spec).filter(k=>k!=='existingRoles'))assert.deepEqual(next.spec[field],source.spec[field]);assert.deepEqual(source,before);
 const projected=referencedDemandView(next,context,ref);assert(!('key' in projected));assert(!('basisTurns' in projected));assert.equal(projected.reviewRef,ref);assert.deepEqual(projected.spec,next.spec);
});
test('source reference, current turn, exact quote, duplicate fields and units still fail closed',()=>{
 const source=base();
 for(const mutate of [p=>p.reviewRef=demandReferenceId('other-request',0),p=>p.reviewRef=demandReferenceId('request-edit',1),p=>p.changes[0].basis.turnId='other',p=>p.changes[0].basis.quote='Never supplied',p=>p.changes.push(structuredClone(p.changes[0])),p=>p.changes[0].quantity.period='month',p=>p.changes[0].quantity.basis=basis]){const bad=edit();mutate(bad);assert.throws(()=>revise(source,bad));}
 const changed=structuredClone(source);changed.result.additionalRoles=42;assert.throws(()=>revise(changed,edit()));
});
test('retaining a mismatched scope cannot repair it; linking requires an explicit named edit',()=>{
 const spec=base().spec;spec.existingRoles.scope='Another pool';const source=createDemandReview(spec,context,'prior',base().basisTurns);
 assert.equal(revise(source,edit()).result.status,'needs-inputs');
 const linked=edit();linked.changes[0].quantity.scope={ref:'scenario-scope'};assert.equal(revise(source,linked).spec.existingRoles.scope,spec.scope);
 const literal=edit();literal.changes[0].quantity.scope={literal:'A third pool'};assert.equal(revise(source,literal).spec.existingRoles.scope,'A third pool');
});
test('scope references use a separately explicit scope edit while leaving other quantity scopes unresolved',()=>{
 const source=base(),patch=edit();patch.changes.push({field:'scope',quantity:null,number:null,text:'New explicitly reviewed role',basis});patch.changes[0].quantity.scope={ref:'scenario-scope'};
 const next=revise(source,patch);assert.equal(next.spec.scope,'New explicitly reviewed role');assert.equal(next.spec.existingRoles.scope,next.spec.scope);assert.equal(next.spec.contracts.scope,source.spec.contracts.scope);assert.equal(next.result.status,'needs-inputs');
});
test('only one user basis is accepted per wire edit and instructions match advertised tools',()=>{
 assert.doesNotThrow(()=>assertSolutionShape({edit:edit()},reviseReferencedDemandTool.parameters));
 assert.equal(reviewReferencedDemandTool.name,'review_scoped_service_demand');assert.equal(reviseReferencedDemandTool.name,'revise_scoped_service_demand');
 assert(!demandReferenceInstructions.includes('revise_service_demand'));assert(!demandReferenceInstructions.includes('review_service_demand'));assert(!demandReferenceInstructions.includes('both basis objects'));assert(demandReferenceInstructions.includes('reviewRef'));
});

test('service rotates references after a successful edit and refuses the stale one without losing the first result',async()=>{
 const request=solutionRequest(turn.text);request.goalContext={scenarioReview:{...context,demandProposal:base()}};
 const sourceRef=demandReferenceId(request.requestId,0),patch=edit();patch.reviewRef=sourceRef;patch.changes[0].basis.turnId=request.message.id;
 const stale=structuredClone(patch);stale.changes[0].quantity.value=9;let observedError=false;
 const runtime=fixtureRuntime([{name:'revise_scoped_service_demand',args:{edit:patch}},input=>{const result=JSON.parse(input.at(-1).output);assert.equal(result.reviewRef,demandReferenceId(request.requestId,1));assert(!('key' in result));return {name:'revise_scoped_service_demand',args:{edit:stale}};},input=>{const result=JSON.parse(input.at(-1).output);observedError=/reference changed/.test(result.error);return final('The first edit is retained; the stale edit did not apply.');}]);
 const reply=await converseSolutions(request,{...runtime,demand:{datasetToken:context.datasetToken,referenceContract:true}},new AbortController().signal);
 assert(observedError);assert.equal(reply.demandReview.spec.existingRoles.value,4);assert.equal(reply.usage.toolCalls,2);assert.equal(reply.usage.modelRounds,3);
});
