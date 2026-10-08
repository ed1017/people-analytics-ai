import test from 'node:test';
import assert from 'node:assert/strict';
import {solutionRequest,candidate,based,retained,activity,quantity} from './fixtures/home-solution-conversation.mjs';
import {entered} from './fixtures/home-plan-conversation.mjs';
import {evaluateSolutionCandidate,evaluateSolutionParameterEdit,assertSolutionParticipationProvenance,saveSolutionCandidate} from '../lib/home-solution-conversation.ts';
import {createBundleDraft,reviseBundleDraft,reviewBundleProposal as reconcileBundle} from '../lib/home-bundle-reconciliation.ts';
import {createPlanAlternatives} from '../lib/home-plan-alternatives.ts';

function confirmed(){
 const request=solutionRequest('Retain the reviewed activities.',true),original=request.catalog.plans[0].draft;
 const draft=createBundleDraft({...original.bundle,components:[original.bundle.components[0],{...original.bundle.components[0],id:'c2',name:'Reviewed learning activity'}]},original.binding);
 const input=structuredClone(original.inputs);input.memberships.push({componentId:'c2',groupIds:['people'],complete:entered(true)});input.timing.push({...input.timing[0],componentId:'c2'});input.costReviews.push({...input.costReviews[0],componentId:'c2'});input.expenseLinks[0].componentIds.push('c2');
 request.catalog=createPlanAlternatives({goalId:request.goal.id,goal:request.goal.statement},[{id:'A',draft:reviseBundleDraft(draft,input)}]);
 const c=based();c.base.revision=request.catalog.plans[0].draft.revision;c.activities=['c1','c2'].map(id=>({...activity(id),mode:'retain',source:{...c.base,activityId:id}}));return {request,c};
}
for(const count of [null,10])test(`model blend never establishes participation with ${count===null?'unknown':'known'} count`,async()=>{
 const request=solutionRequest('Combine the approaches.'),c=candidate();c.activities.push({...activity('c2'),audienceOf:'c1'});c.quantities=[count===null?{...quantity('participants',null,'people','all'),kind:'unknown'}:quantity('participants',count,'people','all')];
 const item=await evaluateSolutionCandidate(request,c,[]);assert.deepEqual(item.blocking,[]);assert.equal(item.provenanceVersion,1);assert.equal(item.result.uniqueParticipants,null);assert.equal(item.draft.inputs.groupsDisjoint.value,null);assert.ok(item.draft.inputs.memberships.every(m=>m.complete.value===null));assert.equal(new Set(item.draft.inputs.memberships.flatMap(m=>m.groupIds)).size,2);assert.ok(item.draft.inputs.groups.every(g=>g.count.value===count));
 // A null total is insufficient: even with null counts this forged shared mapping must fail.
 const forged=structuredClone(item.draft);forged.inputs.memberships.forEach(m=>{m.complete=entered(true);m.groupIds=[forged.inputs.groups[0].id];});
 assert.throws(()=>assertSolutionParticipationProvenance(request,c,forged),/exact retained/);
});
test('accepted manual source sharing is retained, count edits remain unconfirmed, activity edits invalidate it',async()=>{
 const {request,c}=confirmed();c.activities[1].audienceOf='c1';const item=await evaluateSolutionCandidate(request,c,[]);assert.deepEqual(item.blocking,[]);assert.equal(item.result.uniqueParticipants,10);assert.deepEqual(item.draft.inputs.memberships[0].groupIds,item.draft.inputs.memberships[1].groupIds);
 request.state.working=[item];const patch={id:'count-edit',source:{kind:'working',id:item.id,revision:item.revision},quantities:[quantity('participants',20,'people','all')]};const edited=await evaluateSolutionParameterEdit(request,patch,[]);assert.deepEqual(edited.blocking,[]);assert.equal(edited.result.uniqueParticipants,20);assert.equal(edited.draft.inputs.groups[0].count.kind,'illustrative');assert.equal(edited.draft.inputs.memberships[0].complete.kind,'user-entered');
 const adapted=structuredClone(c);adapted.activities[1].mode='adapt';const changed=await evaluateSolutionCandidate(request,adapted,[]);assert.deepEqual(changed.blocking,[]);assert.equal(changed.result.uniqueParticipants,null);assert.equal(changed.draft.inputs.memberships[1].complete.value,null);
});
test('rejected, canceled absent, stale and legacy working sources cannot supply confirmation',async()=>{
 const {request,c}=confirmed(),item=await evaluateSolutionCandidate(request,c,[]),derived=candidate('derived');derived.base={kind:'working',id:item.id,revision:item.revision};derived.activities=[{...activity(),mode:'retain',source:{...derived.base,activityId:'c1'}}];
 for(const mode of ['rejected','canceled','stale','legacy']){
  const req=structuredClone(request);req.state.working=mode==='canceled'?[]:[structuredClone(item)];if(mode==='rejected')req.state.rejected=[{candidateId:item.id,revision:item.revision,reason:'Review control rejected sharing.',turnId:'user-1'}];if(mode==='stale')req.state.working.push({...structuredClone(item),revision:item.revision+1});if(mode==='legacy')delete req.state.working[0].provenanceVersion;
  const result=await evaluateSolutionCandidate(req,derived,[]);assert.equal(result.draft,null);assert.ok(result.blocking.length,mode);
 }
});
test('different checked sources with equal counts and IDs do not establish sharing',async()=>{
 const request=solutionRequest('Combine approaches.',true),c=based();c.activities.push({...retained('B','c2'),audienceOf:'c1'});const item=await evaluateSolutionCandidate(request,c,[]);assert.deepEqual(item.blocking,[]);assert.equal(item.result.uniqueParticipants,null);assert.equal(item.draft.inputs.groupsDisjoint.value,null);assert.notDeepEqual(item.draft.inputs.memberships[0].groupIds,item.draft.inputs.memberships[1].groupIds);
});
test('save rechecks provenance; acknowledgement and copied version cannot confirm sharing',async()=>{
 const request=solutionRequest(),c=candidate();c.activities.push({...activity('c2'),audienceOf:'c1'});const item=await evaluateSolutionCandidate(request,c,[]);request.state.working=[item];item.draft.inputs.memberships.forEach(m=>m.complete=entered(true));item.result=reconcileBundle(item.draft);
 await assert.rejects(saveSolutionCandidate(request,null,item,{id:'goal',statement:'Reduce turnover'},request.evidence,true),/exact retained/);
});
test('model quantity and constraint turn references never become user-entered values',async()=>{
 const request=solutionRequest(),c=candidate();c.quantities=[quantity('population',null,'text'),quantity('horizon_months',3,'months'),quantity('costs_distinct',null,'boolean')];c.quantities[0].text='Proposed audience';c.quantities[2].text='true';const item=await evaluateSolutionCandidate(request,c,[{action:'set',field:'budget_usd',number:1000,text:null,unit:'USD',turnId:'user-1'}]);assert.deepEqual(item.blocking,[]);for(const atom of [item.draft.inputs.scope.population,item.draft.inputs.scope.months,item.draft.inputs.budget.amount])assert.equal(atom.kind,'illustrative');
});

test('same-ID working refinement saves against its exact consumed predecessor',async()=>{
 const {request,c}=confirmed(),first=await evaluateSolutionCandidate(request,c,[]);request.state.working=[first];const next=structuredClone(c);next.base={kind:'working',id:first.id,revision:first.revision};next.activities=next.activities.map(a=>({...a,source:{...next.base,activityId:a.id}}));const second=await evaluateSolutionCandidate(request,next,[]);assert.deepEqual(second.blocking,[]);request.state.working.push(second);const saved=await saveSolutionCandidate(request,request.catalog,second,request.goal,request.evidence,true);assert.equal(saved.status,'ready');assert.equal(saved.plan.operation.provenanceVersion,1);
});
import {readFileSync} from 'node:fs';
import {readSolutionRequest} from '../lib/home-solution-conversation.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {final,fixtureRuntime} from './fixtures/home-solution-conversation.mjs';
const preserved=JSON.parse(readFileSync(new URL('./fixtures/preserved-overlap-failure.json',import.meta.url),'utf8'));
test('exact canceled-run blend payload cannot promote unknown-count participation',async()=>{
 const request=readSolutionRequest(JSON.parse(preserved.originalInput.request.text)),old=JSON.parse(preserved.originalToolResult.result.text),args=JSON.parse(preserved.originalToolResult.arguments.text);
 assert.equal(preserved.originalInput.request.truncated,false);assert.equal(preserved.originalToolResult.result.truncated,false);assert.equal(old.result.uniqueParticipants,null);assert.ok(old.draft.inputs.memberships.every(m=>m.complete.value===true));
 const result=await evaluateSolutionCandidate(request,args.candidate,args.constraintUpdates);assert.deepEqual(result.blocking,[]);assert.equal(result.result.uniqueParticipants,null);assert.ok(result.draft.inputs.memberships.some(m=>m.complete.value===null));assert.equal(result.draft.inputs.groupsDisjoint.value,null);
});
test('model rejection remains interpretation while explicit review rejection still blocks reuse',async()=>{
 const request=solutionRequest('Consider this'),c=candidate(),reply=await converseSolutions(request,fixtureRuntime([{name:'evaluate_candidate',args:{candidate:c,constraintUpdates:[]}},{...final('Consider rejecting it.',['mentoring']),rejected:[{candidateId:'mentoring',reason:'Inferred preference',turnId:'user-1'}]}]),new AbortController().signal);assert.deepEqual(reply.state.rejected,[]);assert.match(reply.state.working[0].interpretations.at(-1),/unconfirmed/);
});
test('legacy conversation ancestry blocks an otherwise checked non-conversation descendant',async()=>{
 const {request,c}=confirmed(),original=request.catalog.plans[0],ancestor={...structuredClone(original),id:'legacy',operation:{kind:'conversation',text:'Old model interpretation',sourceIds:[]},sourceRefs:[]};request.catalog.plans.push(ancestor);original.sourceRefs=[{id:'legacy',revision:ancestor.draft.revision}];original.operation={kind:'edit',text:'Later edit',sourceIds:['legacy']};const result=await evaluateSolutionCandidate(request,c,[]);assert.equal(result.draft,null);assert.match(result.blocking.join(' '),/Legacy conversation provenance/);
});

test('same-label source expenses cannot exchange user-confirmed amount atoms',async()=>{
 const {request,c}=confirmed(),draft=request.catalog.plans[0].draft;draft.inputs.expenses.push({...structuredClone(draft.inputs.expenses[0]),id:'fee2',amount:entered(700)});draft.inputs.expenseLinks.push({...structuredClone(draft.inputs.expenseLinks[0]),expenseId:'fee2'});request.catalog.plans[0].result=reconcileBundle(draft);
 const item=await evaluateSolutionCandidate(request,c,[]);assert.deepEqual(item.blocking,[]);const bad=structuredClone(item.draft);bad.inputs.expenses.find(e=>e.id==='s0-fee').amount=structuredClone(bad.inputs.expenses.find(e=>e.id==='s0-fee2').amount);assert.throws(()=>assertSolutionParticipationProvenance(request,c,bad),/checked source field and target/);
});
