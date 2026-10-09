import test from 'node:test';
import assert from 'node:assert/strict';
import {converseSolutions,solutionModelContext} from '../lib/home-solution-conversation-service.ts';
import {currentSolutionProposals,saveSolutionCandidate} from '../lib/home-solution-conversation.ts';
import {solutionRequest,fixtureRuntime,final,evaluate,constraint} from './fixtures/home-solution-conversation.mjs';
import {productQuestion,turnoverQuestion,actionPlans,batch,recommendationSteps,combinedPlan,fourPlanSteps,answeredOwnerPlan,refinementQuestions} from './fixtures/action-plan-recommendations.mjs';
const signal=()=>new AbortController().signal;
for(const [kind,text] of [['product',productQuestion],['turnover',turnoverQuestion]])test(kind+' provides three usable unsaved proposals without scope or numerical prerequisites',async()=>{
 const body=solutionRequest(text),before=JSON.stringify(body),runtime=fixtureRuntime(recommendationSteps(kind,body));
 const reply=await converseSolutions(body,runtime,signal());
 assert.equal(reply.candidateIds.length,3);assert.equal(reply.state.working.length,3);assert.equal(JSON.stringify(body),before);assert.equal(body.catalog,null);assert.equal(body.goal.id,'');assert.equal(reply.state.businessPlanning,undefined);
 assert.ok(reply.answer.startsWith('Summary: I recommend '));assert.ok(reply.answer.indexOf('Proposed Action Plan 3')<reply.answer.indexOf('Further reading and investigations:'));assert.ok(reply.answer.indexOf('Further reading and investigations:')<reply.answer.indexOf('optionally focus'));
 assert.ok(reply.answer.indexOf('Supporting information:')<reply.answer.indexOf('Proposed Action Plan 1'));
 assert.ok(reply.answer.indexOf('Proposed Action Plan 3')<reply.answer.indexOf('Optional questions before choosing:'));
 assert.deepEqual(reply.state.questions,refinementQuestions(kind));assert.deepEqual(reply.state.verifiedMetrics,[]);assert.equal(reply.usage.modelRounds,2);
 for(const item of reply.state.working){assert.deepEqual(item.blocking,[]);assert.ok(item.draft);assert.equal(item.result.calculationStatus,'awaiting-scope');assert.equal(item.result.cashEstimate.cash,null);assert.equal(item.result.uniqueParticipants,null);assert.ok(item.candidate.successMeasure);assert.ok(item.candidate.nextStep);assert.equal(item.candidate.activities.length,2);assert.ok(item.candidate.activities.every(a=>a.ownerRole&&a.step));}
 const context=solutionModelContext(solutionRequest('Let us discuss the second plan.',false,reply.state,2));
 assert.deepEqual(context.currentWorkingRevisions.map(p=>p.label),['Proposed Action Plan 1','Proposed Action Plan 2','Proposed Action Plan 3']);
 const follow=await converseSolutions(solutionRequest('Let us discuss the second plan.',false,reply.state,2),fixtureRuntime([{...final('We can refine that proposal in chat; it remains unsaved.'),focusCandidateId:reply.candidateIds[1]}]),signal());
 assert.equal(follow.state.focusCandidateId,reply.candidateIds[1]);assert.deepEqual(follow.state.working,reply.state.working);assert.equal(body.catalog,null);
 const saveRequest={...body,state:{...reply.state,turns:body.state.turns}},item=reply.state.working[0];
 const selected=await saveSolutionCandidate(saveRequest,null,item,{id:'reviewed-goal',statement:item.candidate.goal.statement},body.evidence,true);
 assert.equal(selected.catalog.plans.length,1);assert.equal(selected.plan.draft.binding.goalId,'reviewed-goal');assert.equal(selected.plan.applied,false);assert.equal(selected.plan.result.cashEstimate.cash,null);
});
test('a clock/evidence read and three evaluations fit the existing four-round bound',async()=>{
 const body=solutionRequest(productQuestion),plans=actionPlans('product',body);
 const reply=await converseSolutions(body,fixtureRuntime([{name:'read_clock',args:{}},{name:'read_evidence',args:{sourceIds:[]}},batch(plans),final('Three proposed paths remain conditional.',plans.map(p=>p.id))]),signal());
 assert.equal(reply.usage.modelRounds,4);assert.equal(reply.usage.toolCalls,3);assert.equal(reply.candidateIds.length,3);
});
test('batching cannot exceed the existing six-operation budget',async()=>{
 const body=solutionRequest(productQuestion),plans=actionPlans('product',body);
 await assert.rejects(converseSolutions(body,fixtureRuntime([batch(plans),{name:'read_clock',args:{}},batch(plans)]),signal()),/bounded calculation limit/);
 assert.equal(body.state.working.length,0);
});
for(const invalid of ['duplicate-id','duplicate-activities','bad-citation','different-goals'])test('invalid '+invalid+' leaves the whole proposed set and constraints unchanged',async()=>{
 const body=solutionRequest(productQuestion),plans=actionPlans('product',body);
 if(invalid==='duplicate-id')plans[2].id=plans[0].id;
 if(invalid==='duplicate-activities')plans[2].activities=structuredClone(plans[0].activities);
 if(invalid==='bad-citation')plans[2].activities[0].evidenceIds=['invented-source'];
 if(invalid==='different-goals')plans[2].goal.statement='A different objective';
 const step=batch(plans);step.args.constraintUpdates=[constraint(10000)];
 const reply=await converseSolutions(body,fixtureRuntime([step,input=>{assert.equal(JSON.parse(input.at(-1).output).ok,false);return final('The proposed set needs correction; no plan was saved.');}]),signal());
 assert.deepEqual(reply.state.working,[]);assert.deepEqual(reply.state.constraints,[]);assert.deepEqual(reply.candidateIds,[]);
});
test('natural combination retains actual activity lineage without assumed shared resources or automatic save',async()=>{
 const opener=solutionRequest(turnoverQuestion),reply=await converseSolutions(opener,fixtureRuntime(recommendationSteps('turnover',opener)),signal());
 const body=solutionRequest('Combine the delivery activities from the first two proposed plans.',false,reply.state,2),combined=combinedPlan(body);
 const next=await converseSolutions(body,fixtureRuntime([evaluate(combined),final('Review the combined proposal; overlap and costs remain unknown.',[combined.id])]),signal());
 const item=next.state.working.at(-1);assert.deepEqual(item.blocking,[]);assert.equal(next.state.working.length,4);assert.equal(body.catalog,null);assert.equal(item.draft.inputs.groupsDisjoint.value,null);assert.equal(item.result.cashEstimate.cash,null);
 assert.deepEqual(item.draft.bundle.components.map(c=>c.firstStep),reply.state.working.slice(0,2).map(p=>p.draft.bundle.components[1].firstStep));
 assert.equal(currentSolutionProposals(next.state).length,4);
 const unrelated=await converseSolutions(solutionRequest('What does FTE mean?',false,next.state,3),fixtureRuntime([final('FTE means full-time equivalent; a workload measure, not a count of available people.')]),signal());
 assert.deepEqual(unrelated.state.working,next.state.working);assert.deepEqual(unrelated.candidateIds,[]);
});
test('develop an action plan turns an existing detailed discussion into usable proposals without restating the goal',async()=>{
 const original=solutionRequest(productQuestion),discussion=await converseSolutions(original,fixtureRuntime([final('Protect management capacity, agree a product slice, and review staffing at the scope checkpoint.')]),signal());
 const request=solutionRequest('Develop an action plan',false,discussion.state,2),plans=actionPlans('product',original);
 const reply=await converseSolutions(request,fixtureRuntime([batch(plans),final('Review these concrete proposed Action Plans, then refine the approach you prefer.',plans.map(p=>p.id))]),signal());
 assert.equal(reply.state.working.length,3);assert.equal(request.goal.id,'');
 for(const item of reply.state.working){assert.deepEqual(item.blocking,[]);assert.equal(item.candidate.goal.turnId,'user-1');assert.match(item.candidate.goal.statement,/digital product/);assert.equal(item.candidate.activities.length,2);}
 assert.equal(reply.state.turns[0].text,productQuestion);assert.match(reply.state.turns[1].text,/scope checkpoint/);
 const next=solutionRequest('Keep the first approach but use the product owner for the pilot review.',false,reply.state,3),base=reply.state.working[0],edited=structuredClone(base.candidate);
 edited.base={kind:'working',id:base.id,revision:base.revision};edited.activities=edited.activities.map((activity,index)=>({...activity,mode:index?'adapt':'retain',source:{kind:'working',id:base.id,revision:base.revision,activityId:activity.id},...(index?{ownerRole:'Product owner'}:{})}));
 const refined=await converseSolutions(next,fixtureRuntime([evaluate(edited),final('The owner changed in a new reviewed proposal. No plan was saved.',[edited.id])]),signal());
 const item=refined.state.working.at(-1);assert.deepEqual(item.blocking,[]);assert.equal(item.revision,2);assert.equal(item.draft.bundle.components[1].ownerRole,'Product owner');assert.equal(item.result.cashEstimate.cash,null);assert.equal(next.catalog,null);assert.deepEqual(refined.state.working[0],base);
});

test('four initial checked plans including a sourced combination fit unchanged rounds and leave overlap unknown',async()=>{
 const body=solutionRequest(productQuestion),runtime=fixtureRuntime(fourPlanSteps('product',body));
 const reply=await converseSolutions(body,runtime,signal());
 assert.equal(reply.candidateIds.length,4);assert.equal(currentSolutionProposals(reply.state).length,4);
 assert.equal(reply.usage.modelRounds,3);assert.equal(reply.usage.toolCalls,2);assert.equal(body.catalog,null);
 const hybrid=reply.state.working.at(-1);assert.deepEqual(hybrid.blocking,[]);
 assert.deepEqual(hybrid.candidate.activities.map(a=>a.source),reply.state.working.slice(0,2).map(p=>({kind:'working',id:p.id,revision:p.revision,activityId:'c2'})));
 assert.equal(hybrid.draft.inputs.groupsDisjoint.value,null);assert.equal(hybrid.result.uniqueParticipants,null);assert.equal(hybrid.result.cashEstimate.cash,null);
 assert.ok(reply.answer.indexOf('Proposed Action Plan 4')<reply.answer.indexOf('Optional questions before choosing:'));
 const nextRequest=solutionRequest('Give me another combination of the first two plans.',false,reply.state,2),next=combinedPlan(nextRequest);
 const fifth=await converseSolutions(nextRequest,fixtureRuntime([evaluate(next),final('A further combination remains conditional and unsaved.',[next.id])]),signal());
 assert.equal(currentSolutionProposals(fifth.state).length,5);assert.deepEqual(fifth.state.working.slice(0,4),reply.state.working);
});
test('a partial answer revises the same plan and preserves the goal, prior revisions and unanswered uncertainty',async()=>{
 const first=solutionRequest(productQuestion),reply=await converseSolutions(first,fixtureRuntime(recommendationSteps('product',first)),signal());
 const body=solutionRequest('The product owner can own the pilot review for the first plan. Keep its other activities.',false,reply.state,2),edited=answeredOwnerPlan(body);
 const remaining=refinementQuestions('product').slice(0,1);
 const next=await converseSolutions(body,fixtureRuntime([evaluate(edited),{...final('The first plan now proposes the product owner for pilot review. Delivery scope remains unknown.',[edited.id]),questions:remaining}]),signal());
 const revised=next.state.working.at(-1),original=reply.state.working[0];
 assert.equal(revised.id,original.id);assert.equal(revised.revision,original.revision+1);assert.deepEqual(revised.candidate.goal,original.candidate.goal);
 assert.equal(revised.draft.bundle.components[1].ownerRole,'Product owner');assert.deepEqual(next.state.working.slice(0,3),reply.state.working);
 assert.equal(revised.draft.bundle.components[0].firstStep,original.draft.bundle.components[0].firstStep);
 assert.equal(revised.result.uniqueParticipants,null);assert.equal(revised.result.cashEstimate.cash,null);assert.deepEqual(next.state.questions,remaining);
 assert.equal(next.state.turns.at(-2).id,body.message.id);assert.equal(body.catalog,null);
});
test('unanswered optional questions do not block deliberate review/save',async()=>{
 const body=solutionRequest(turnoverQuestion),reply=await converseSolutions(body,fixtureRuntime(recommendationSteps('turnover',body)),signal());
 const item=reply.state.working[1],request={...body,state:reply.state};
 const saved=await saveSolutionCandidate(request,null,item,{id:'skip-questions-goal',statement:item.candidate.goal.statement},body.evidence,true);
 assert.equal(saved.status,'ready');assert.equal(saved.catalog.plans.length,1);assert.equal(saved.plan.applied,false);
 assert.deepEqual(request.state.questions,refinementQuestions('turnover'));assert.equal(item.result.cashEstimate.cash,null);
});
