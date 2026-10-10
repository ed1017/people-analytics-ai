import test from 'node:test';
import assert from 'node:assert/strict';
import {splitPlanDiscussion,splitPlanFollowUp,solutionReviewPresentation,solutionDiscussionPresentations} from '../lib/home-plan-presentation.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {candidate,evaluate,final,fixtureRuntime,solutionRequest} from './fixtures/home-solution-conversation.mjs';
const prose='Workload may contribute; the evidence does not establish a cause.\n\n### Proposed Action Plan\n\n1. Launch listening circles. Owner: HR director.\n2. Commission a workload survey. Owner: Operations.\n\nCosts and population are unknown; do not assume availability.\n\n### Why this approach\nSmall trials help test a hypothesis before expansion.';
const messages=state=>state.turns.map(t=>({role:t.role,content:t.text}));
const run=(body,steps)=>converseSolutions(body,fixtureRuntime(steps),new AbortController().signal);
test('differently worded prose steps are reference-only; explanations, unknowns and the original answer survive',async()=>{
 const c=candidate(),reply=await run(solutionRequest(),[evaluate(c),final(prose,[c.id])]);
 const before=JSON.stringify(reply.state),visible=messages(reply.state),p=solutionDiscussionPresentations(visible,reply.state).get(visible.at(-1));
 assert.match(p.reference,/Launch listening circles/);assert.doesNotMatch(p.discussion,/Launch listening|Commission a workload/);
 for(const text of ['does not establish a cause','Costs and population are unknown','Small trials'])assert.ok(p.discussion.includes(text));
 assert.equal(reply.answer,prose);assert.equal(JSON.stringify(reply.state),before);
 const view=solutionReviewPresentation(reply.state);assert.equal(view.recommended.candidate.name,c.name);assert.equal(view.recommended.candidate.activities[0].step,c.activities[0].step);assert.equal(view.recommended.result.cashEstimate.cash,null);
});
test('unlabelled discussion, procedural explanations and genuine alternatives stay verbatim',()=>{
 for(const value of ['1. Compare the denominator.\n2. Explain the difference.','### Alternative Action Plan\n\n1. Keep recruiting as another option.','### Proposed Action Plan\n\nThis is a discussion of possible approaches, not checked steps.','### Why these steps\n\n1. Mentoring is a hypothesis.'])assert.equal(splitPlanDiscussion(value).reference,'');
 const p=splitPlanDiscussion(prose+'\n\n### Alternative approach\n1. Consider redeployment if availability is confirmed.');assert.match(p.discussion,/Alternative approach\n1. Consider redeployment/);
});
test('plain, bold and ATX plan headings with numbered steps or owner tables are supported conservatively',()=>{
 for(const title of ['Proposed Action Plan','**Recommended Action Plan:**','### Proposed Action Plan 1: Mentoring'])for(const body of ['1. Mentor volunteers.\nOwner: Learning lead.','**1. Mentor volunteers**\nOwner: Learning lead.','| Step | Owner |\n| --- | --- |\n| Mentor volunteers | Learning lead |'])assert.ok(splitPlanDiscussion(title+'\n\n'+body).reference,title);
 assert.ok(splitPlanDiscussion('### Proposed Action Plan\n\n### 1. Mentor volunteers\nOwner: Learning lead.').reference);
});
test('ordinary replies or same wording in an unrelated turn cannot borrow a proposal',async()=>{
 const c=candidate(),first=await run(solutionRequest(),[evaluate(c),final(prose,[c.id])]);
 const second=await run(solutionRequest('Explain this without proposing a plan',false,first.state,2),[final(prose)]);
 const items=messages(second.state),presentations=solutionDiscussionPresentations(items,second.state);assert.equal(presentations.has(items.at(-1)),false);assert.equal(presentations.has(items[1]),true);
 assert.equal(solutionDiscussionPresentations([{role:'user',content:'Unrelated question'},{role:'assistant',content:prose}],first.state).size,0);
});
test('discard and recommend again never revive the discarded revision or hide requested alternatives',async()=>{
 const a=candidate('a'),first=await run(solutionRequest(),[evaluate(a),final(prose,['a'])]);
 const discarded=structuredClone(first.state);discarded.rejected.push({candidateId:'a',revision:1,reason:'Discarded',turnId:'discard-1'});discarded.turns.push({id:'discard-1',role:'user',text:'Discard this proposal.'});discarded.focusCandidateId=null;
 assert.equal(solutionReviewPresentation(discarded).recommended,null);assert.deepEqual(solutionReviewPresentation(discarded).alternatives,[]);
 assert.equal(solutionDiscussionPresentations(messages(discarded),discarded).size,1);
 const b=candidate('b');b.name='Workload review';b.goal.turnId='user-2';
 const next=await run(solutionRequest('Recommend again',false,discarded,2),[evaluate(b),final(prose,['b'])]);assert.equal(solutionReviewPresentation(next.state).recommended.id,'b');assert.deepEqual(solutionReviewPresentation(next.state).earlier,[]);
 const c=candidate('c');c.name='Hiring review';c.goal.turnId='user-3';b.goal.turnId='user-3';
 const compare=await run(solutionRequest('Compare both alternatives',false,next.state,3),[evaluate(b),evaluate(c),final('Here are two alternatives.',['b','c'])]);
 const view=solutionReviewPresentation(compare.state);assert.equal(view.recommended.id,'b');assert.deepEqual(view.alternatives.map(i=>i.id),['c']);
 compare.state.rejected.push({candidateId:'b',revision:view.recommended.revision,reason:'Discarded',turnId:'discard-2'});compare.state.focusCandidateId=null;
 assert.equal(solutionReviewPresentation(compare.state).recommended,null,'discarding a recommendation does not silently recommend the remaining alternative');
});
test('new proposals retain earlier candidates for review without presenting both as the current recommendation',async()=>{
 const a=candidate('a'),first=await run(solutionRequest(),[evaluate(a),final(prose,['a'])]);
 const b=candidate('b');b.goal.turnId='user-2';const second=await run(solutionRequest('Recommend a different approach',false,first.state,2),[evaluate(b),final(prose,['b'])]);
 const view=solutionReviewPresentation(second.state);assert.equal(view.recommended.id,'b');assert.deepEqual(view.earlier.map(i=>i.id),['a']);
});

test('nested unknowns and explanation lists stay visible',()=>{
 const value='### Proposed Action Plan\n\n1. Mentor volunteers. Owner: Learning lead.\n\n#### Unknowns\n\n- Costs are unknown.\n- Availability needs review.';
 const result=splitPlanDiscussion(value);assert.match(result.reference,/Mentor volunteers/);assert.doesNotMatch(result.reference,/Costs|Availability/);assert.match(result.discussion,/Costs are unknown/);
});

test('unheaded bullet and numbered caveats stay visible under an explicit plan heading',()=>{
 for(const caveats of ['- Costs are unknown.\n- Availability needs review.','1. Costs are unknown.\n2. Availability needs review.']){
  const answer='### Proposed Action Plan\n\n1. Launch mentoring. Owner: Learning lead.\n\n'+caveats;
  const result=splitPlanDiscussion(answer);assert.match(result.reference,/Launch mentoring/);assert.ok(result.discussion.includes(caveats));assert.doesNotMatch(result.reference,/Costs|Availability/);
 }
 const mixed='### Proposed Action Plan\n\n1. Launch mentoring. Owner: Learning lead.\n2. Costs are unknown.';
 assert.equal(splitPlanDiscussion(mixed).discussion,mixed);assert.equal(splitPlanDiscussion(mixed).reference,'');
});

test('only labelled reading moves after the plan; risks and short tables stay in the takeaway',()=>{
 const answer='Start a small trial.\n\n| Choice | Constraint |\n| --- | --- |\n| Mentoring | Capacity unknown |\n\n### Further reading / investigation\nReview [T1] and ask managers about availability.\n\n### Risk\nDo not add workload without confirming capacity.';
 const split=splitPlanFollowUp(answer);assert.match(split.furtherReading,/Review \[T1\]/);assert.doesNotMatch(split.discussion,/Review \[T1\]/);assert.match(split.discussion,/Do not add workload/);assert.match(split.discussion,/Capacity unknown/);
 assert.equal(splitPlanFollowUp('Read more about capacity risks before acting.').furtherReading,'');
 const inline=splitPlanFollowUp('Takeaway.\n\nFurther reading and investigations: Review the workload baseline.\n\nRisk: capacity remains unknown.');
 assert.equal(inline.furtherReading,'Review the workload baseline.');assert.match(inline.discussion,/Risk: capacity remains unknown/);
});
test('reported assumptions paragraphs remain available with the plan without duplicating the introduction',()=>{
 const value='Use a small trial.\n\nMissing factual inputs: scope; available hours.\n\nEditable scenario assumptions—not established facts: timing.\n\nRisk: available capacity has not been verified.';
 const split=splitPlanFollowUp(value);assert.match(split.planningNotes,/scope; available hours/);assert.match(split.planningNotes,/timing/);assert.doesNotMatch(split.discussion,/Missing factual inputs|Editable scenario/);assert.match(split.discussion,/Risk: available capacity/);
});

 test('reported capacity explanation and exact standalone question move below the plan without losing evidence',()=>{
 const explanation='The decisive condition is whether qualified management hours cover demand **when needed**, without displacing essential obligations or weakening delivery quality. The proposal includes a baseline and pilot review to test that condition; it does not establish affordability, additional capacity or improved outcomes.';
 const question='Which client-delivery team or manager group should we assess first?';
 const answer='Test manager capacity before expanding delivery.\n\n'+explanation+'\n\n'+question+'\n\nRisk: capacity has not been verified.';
 const split=splitPlanFollowUp(answer,[question]);
 assert.equal(split.explanation,explanation);assert.equal(split.furtherReading,question);
 assert.equal(split.capacityRisk,'Confirm that qualified management hours cover demand when needed.');
 assert.doesNotMatch(split.discussion,/decisive condition|Which client-delivery/);assert.match(split.discussion,/Risk: capacity has not been verified/);
 assert.equal(splitPlanFollowUp('Could capacity be a risk?').discussion,'Could capacity be a risk?');
 });
