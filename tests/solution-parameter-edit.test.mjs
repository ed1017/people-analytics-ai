import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSolutionParameterEdit,evaluateSolutionCandidate,readSolutionState,emptySolutionState} from '../lib/home-solution-conversation.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {fictionalRequest,fictionalScenarios} from './fixtures/fictional-solution-evaluation.mjs';
import {quantity,fixtureRuntime,final} from './fixtures/home-solution-conversation.mjs';
const request=()=>fictionalRequest(fictionalScenarios[0],2);
const patch=(r,qs)=>({id:'edited',source:{kind:'saved',id:'A',revision:r.catalog.plans[0].draft.revision},quantities:qs});
const deadline=()=>({...quantity('activity_finish',null,'YYYY-MM-DD','c1','user-3'),text:'2026-11-20'});
test('deadline-only edit preserves exact activities and every unrelated assumption including unknowns',async()=>{
 const r=await request(),snapshot=structuredClone(r),original=r.catalog.plans[0].draft;
 const e=await evaluateSolutionParameterEdit(r,patch(r,[deadline()]),[]);
 assert.deepEqual(e.blocking,[]);assert.deepEqual(e.draft.bundle,original.bundle);
 const expected=structuredClone(original.inputs);expected.timing[0].finish=e.draft.inputs.timing[0].finish;
 assert.deepEqual(e.draft.inputs,expected);assert.equal(e.draft.inputs.timing[0].finish.value,'2026-11-20');
 assert.equal(e.result.deliveryEstimate.hours,28);assert.equal(e.draft.inputs.deliveryEstimate.hourlyRate.value,null);
 assert.deepEqual(r,snapshot);readSolutionState({...emptySolutionState(),working:[e]});
});
test('quantity-only edit retains timing, strategy, expense coverage and original uncertainty',async()=>{
 const r=await request(),original=r.catalog.plans[0].draft;
 const e=await evaluateSolutionParameterEdit(r,patch(r,[quantity('coordination_hours',4,'hours/total',null,'user-3')]),[]);
 assert.deepEqual(e.blocking,[]);const expected=structuredClone(original.inputs);expected.deliveryEstimate.coordinationHours=e.draft.inputs.deliveryEstimate.coordinationHours;
 assert.deepEqual(e.draft.inputs,expected);assert.equal(e.result.deliveryEstimate.hours,24);assert.deepEqual(e.draft.bundle,original.bundle);
});
test('mixed deadline and strategy change uses adaptation and still invalidates related effort and dates',async()=>{
 const r=await request(),retained=await evaluateSolutionParameterEdit(r,patch(r,[deadline()]),[]),c=structuredClone(retained.candidate);
 c.activities[0].mode='adapt';c.activities[0].step='Replace the trial with peer-led office hours.';
 const e=await evaluateSolutionCandidate(r,c,[]);assert.deepEqual(e.blocking,[]);
 assert.equal(e.draft.inputs.timing[0].finish.value,'2026-11-20');assert.equal(e.draft.inputs.timing[0].start.value,null);assert.equal(e.draft.inputs.deliveryEstimate.hoursPerParticipant.value,null);assert.equal(e.result.deliveryEstimate.hours,null);
});
test('parameter operation rejects strategy fields, stale sources and absent current-turn provenance',async()=>{
 const r=await request(),p=patch(r,[deadline()]);
 await assert.rejects(evaluateSolutionParameterEdit(r,{...p,activities:[]},[]),/fields/);
 await assert.rejects(evaluateSolutionParameterEdit(r,{...p,source:{...p.source,revision:999}},[]),/no longer current/);
 await assert.rejects(evaluateSolutionParameterEdit(r,patch(r,[{...deadline(),turnId:null}]),[]),/current user turn/);
});
test('ambiguous change can ask a question without creating a candidate or changing the source',async()=>{
 const r=await request();r.message.text='Change that.';const snapshot=structuredClone(r);
 const answer={...final('Which assumption would you like to change?'),questions:['Which assumption would you like to change?']};
 const reply=await converseSolutions(r,fixtureRuntime([answer]),new AbortController().signal);
 assert.deepEqual(reply.candidateIds,[]);assert.deepEqual(reply.state.working,[]);assert.deepEqual(r,snapshot);
});
test('cancelled parameter edit leaves caller state and catalog unchanged',async()=>{
 const r=await request(),snapshot=structuredClone(r),controller=new AbortController();
 const runtime=fixtureRuntime([{name:'revise_parameters',args:{edit:patch(r,[deadline()]),constraintUpdates:[]}},()=>{controller.abort();return final('Cancelled.');}]);
 await assert.rejects(converseSolutions(r,runtime,controller.signal),/cancelled/);assert.deepEqual(r,snapshot);
});
test('service exposes checked references for parameter edits and never saves',async()=>{
 const r=await request(),snapshot=structuredClone(r);
 const runtime=fixtureRuntime([{name:'revise_parameters',args:{edit:patch(r,[deadline()]),constraintUpdates:[]}},input=>{const e=JSON.parse(input.at(-1).output);assert.deepEqual(e.blocking,[]);return {...final('The requested date change is ready for review.',['edited']),verifiedMetrics:e.verifiedMetricReferences};}]);
 const reply=await converseSolutions(r,runtime,new AbortController().signal);
 assert.equal(reply.state.working[0].result.deliveryEstimate.hours,28);assert.equal(reply.state.verifiedMetrics.length,3);assert.deepEqual(r,snapshot);
});
test('participant-only edit keeps shared cohort identity and known effort without orphan groups',async()=>{
 const r=await request(),original=r.catalog.plans[0].draft;
 const e=await evaluateSolutionParameterEdit(r,patch(r,[quantity('participants',5,'people','c1','user-3')]),[]);
 assert.deepEqual(e.blocking,[]);assert.equal(e.result.uniqueParticipants,5);assert.equal(e.result.deliveryEstimate.hours,18);
 const expected=structuredClone(original.inputs);expected.groups[0].count=e.draft.inputs.groups[0].count;
 assert.deepEqual(e.draft.inputs,expected);
});
test('usable working candidate can recover from a budget block with a narrow fee correction',async()=>{
 const r=await request();const e=await evaluateSolutionParameterEdit(r,patch(r,[quantity('cash',12000,'USD','fictional-fee','user-3')]),[]);
 assert.match(e.blocking.join(' '),/ceiling/);assert.ok(e.draft&&e.result);
 r.state.working=[e];r.state.turns=[{id:'user-3',role:'user',text:r.message.text}];r.message={id:'user-4',text:'Lower that fee to 2000 dollars.'};r.requestId='correction-4';
 const fixed=await evaluateSolutionParameterEdit(r,{id:'edited',source:{kind:'working',id:e.id,revision:e.revision},quantities:[quantity('cash',2000,'USD','fictional-fee','user-4')]},[]);
 assert.deepEqual(fixed.blocking,[]);assert.equal(fixed.result.cashEstimate.cash,2000);assert.deepEqual(fixed.draft.bundle,e.draft.bundle);assert.deepEqual(fixed.draft.inputs.timing,e.draft.inputs.timing);
});
test('parameter edits do not promote original unknown overlap or cost certainty',async()=>{
 const r=await request(),source=r.catalog.plans[0].draft;
 source.inputs.groupsDisjoint={value:null,kind:'unknown',basis:null};source.inputs.costsDistinct={value:null,kind:'unknown',basis:null};
 const e=await evaluateSolutionParameterEdit(r,patch(r,[deadline()]),[]);
 assert.deepEqual(e.blocking,[]);assert.deepEqual(e.draft.inputs.groupsDisjoint,source.inputs.groupsDisjoint);assert.deepEqual(e.draft.inputs.costsDistinct,source.inputs.costsDistinct);
});
test('working parameter sources still reject changed saved lineage',async()=>{
 const r=await request(),e=await evaluateSolutionParameterEdit(r,patch(r,[deadline()]),[]);r.state.working=[e];
 r.catalog.plans[0].draft.inputs.deliveryEstimate.coordinationHours.value=99;
 await assert.rejects(evaluateSolutionParameterEdit(r,{...patch(r,[deadline()]),source:{kind:'working',id:e.id,revision:e.revision}},[]),/source plan changed/);
});
test('splitting a shared cohort uses a fresh identity and preserves the untargeted cohort',async()=>{
 const r=await request(),source=r.catalog.plans[0].draft;
 source.bundle.components.push({...structuredClone(source.bundle.components[0]),id:'c2'});
 source.inputs.groups[0].id='people-c1';source.inputs.memberships[0].groupIds=['people-c1'];
 source.inputs.memberships.push({...structuredClone(source.inputs.memberships[0]),componentId:'c2'});
 source.inputs.timing.push({...structuredClone(source.inputs.timing[0]),componentId:'c2'});
 source.inputs.costReviews.push({...structuredClone(source.inputs.costReviews[0]),componentId:'c2'});
 source.inputs.expenseLinks[0].componentIds.push('c2');
 const before=structuredClone(source.inputs.groups[0]);
 const e=await evaluateSolutionParameterEdit(r,patch(r,[quantity('participants',5,'people','c1','user-3')]),[]);
 assert.deepEqual(e.blocking,[]);assert.deepEqual(e.draft.inputs.groups.find(g=>g.id==='people-c1'),before);
 assert.deepEqual(e.draft.inputs.memberships.find(m=>m.componentId==='c2').groupIds,['people-c1']);
 const changed=e.draft.inputs.memberships.find(m=>m.componentId==='c1').groupIds[0];assert.notEqual(changed,'people-c1');assert.equal(e.draft.inputs.groups.find(g=>g.id===changed).count.value,5);
 assert.equal(e.draft.inputs.groupsDisjoint.value,null);assert.equal(e.result.uniqueParticipants,null);
});
