import test from 'node:test';
import assert from 'node:assert/strict';
import {assertSolutionShape,solutionFinalSchema,solutionAnswerText,solutionConversationInstructions} from '../lib/home-solution-conversation-schema.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {candidate,evaluate,final,fixtureRuntime,solutionRequest} from './fixtures/home-solution-conversation.mjs';
import {solutionReviewPresentation} from '../lib/home-plan-presentation.ts';
const discussion={findings:'The evidence cannot identify the weakest team.',decisionRationale:'A limited trial can test the workload hypothesis before expansion.',caveats:['Availability is unverified. No improvement is guaranteed.']};
const response=ids=>({...final('unused',ids),answer:structuredClone(discussion)});
const run=(request,steps)=>converseSolutions(request,fixtureRuntime(steps),new AbortController().signal);
test('new plan-bearing replies cannot include a second unrestricted prose plan',async()=>{
 const request=solutionRequest(),c=candidate(),before=JSON.stringify(request),bad={...final('unused',[c.id]),answer:'Recommended route: start listening circles, assign HR and budget a quarter.'};
 // New finals require a typed outcome even before candidate linkage is checked.
 assert.throws(()=>assertSolutionShape(bad,solutionFinalSchema));
 await assert.rejects(run(request,[evaluate(c),bad]),/specific unsupported planning outcome/);assert.equal(JSON.stringify(request),before);
 const extra=response([c.id]);extra.answer.actionPlan='A different plan';assert.throws(()=>assertSolutionShape(extra,solutionFinalSchema));
 assert.match(solutionConversationInstructions,/single source of general Action Plan details/);
});
test('service renders all explicit findings, rationale and caveats without semantic hiding',async()=>{
 const c=candidate(),reply=await run(solutionRequest(),[evaluate(c),response([c.id])]);
 assert.equal(reply.answer,solutionAnswerText(response([c.id])));for(const text of Object.values(discussion).flat())assert.ok(reply.answer.includes(text));
 assert.equal(reply.state.turns.at(-1).text,reply.answer);assert.equal(solutionReviewPresentation(reply.state).recommended.candidate.activities[0].step,c.activities[0].step);
});
test('requested multiple options remain separate checked plans with visible comparison rationale',async()=>{
 const a=candidate('a'),b=candidate('b');b.name='Workload redesign';b.activities[0].step='Map recurring tasks and propose one workload adjustment.';
 const result=response(['a','b']);result.answer={...discussion,decisionRationale:'Mentoring tests support; workload redesign tests task allocation.'};
 const reply=await run(solutionRequest('Compare two distinct options.'),[evaluate(a),evaluate(b),result]),view=solutionReviewPresentation(reply.state);
 assert.equal(view.recommended.id,'a');assert.deepEqual(view.alternatives.map(x=>x.id),['b']);assert.match(reply.answer,/Mentoring tests support; workload redesign tests task allocation/);
});
test('no-plan answers remain verbatim; discussion objects without checked plans are rejected',async()=>{
 const text='Explain the denominator first.\n\n1. Compare like periods.\n2. Keep the uncertainty visible.';
 const reply=await run(solutionRequest('Explain without proposing.'),[final(text)]);assert.equal(reply.answer,text);assert.deepEqual(reply.candidateIds,[]);
 await assert.rejects(run(solutionRequest(),[response([])]),/ordinary conversational answer/);
});
test('old prose history survives a new reply, revision, discard and renewed recommendation',async()=>{
 const request=solutionRequest(),a=candidate('a'),first=await run(request,[evaluate(a),response(['a'])]);
 const old='Original wording: first run a differently named plan. Keep this historical caveat.';first.state.turns.at(-1).text=old;
 const current=first.state.working[0],refined={...a,base:{kind:'working',id:a.id,revision:1},activities:a.activities.map(x=>({...x,mode:'retain',source:{kind:'working',id:a.id,revision:1,activityId:x.id}})),quantities:[]};
 const second=await run(solutionRequest('Keep the approach.',false,first.state,2),[evaluate(refined),response(['a'])]);assert.equal(second.state.working.at(-1).revision,2);assert.ok(second.state.turns.some(x=>x.text===old));assert.equal(current.revision,1);
 second.state.rejected.push({candidateId:'a',revision:2,reason:'Discarded using review.',turnId:'user-2'});second.state.focusCandidateId=null;assert.equal(solutionReviewPresentation(second.state).recommended,null);
 const b=candidate('b');b.goal.turnId='user-3';const third=await run(solutionRequest('Recommend again.',false,second.state,3),[evaluate(b),response(['b'])]);
 assert.equal(solutionReviewPresentation(third.state).recommended.id,'b');assert.equal(solutionReviewPresentation(third.state).earlier.length,0);assert.ok(third.state.turns.some(x=>x.text===old));
});

test('new Home finals cannot bypass typed outcomes without a successful specialist tool',async()=>{
 const request=solutionRequest('Help plan the next move.'),before=JSON.stringify(request);
 await assert.rejects(run(request,[{...final(),answer:'Which budget do you have?'}]),/specific unsupported planning outcome/);assert.equal(JSON.stringify(request),before);
 const unsupported={...final(),answer:{...discussion,unsupportedPlan:{decision:'Define the scope and currency.',nextStep:'Confirm the scope with the owner, then compare supplied costs.',calculationRefs:[]}}};
 const reply=await run(request,[unsupported]);assert.match(reply.answer,/Decision needed: Define the scope/);assert.equal(reply.usage.modelRounds,1);
 const factual=await run(solutionRequest('Explain only; make no assumptions.'),[final('No new assumptions or plan were created.')]);assert.equal(factual.answer,'No new assumptions or plan were created.');assert.equal(factual.state.working.length,0);
});
