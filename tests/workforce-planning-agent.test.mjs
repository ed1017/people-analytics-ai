import test from 'node:test';
import assert from 'node:assert/strict';
import {runWorkforcePlanningAgent, retainWorkforceAgentReview, workforceAgentReviewIsCurrent, readWorkforceAgentReview} from '../lib/workforce-planning-agent.ts';
import {createWorkforceSolution, emptySolutionInputs, reviseWorkforceSolution, beginSolutionRun, completeSolutionRun} from '../lib/workforce-solution.ts';
import {encodeDecisions, parseDecisions} from '../lib/local-decisions.ts';
import {calculateWorkforceIncrement} from '../lib/workforce-increment.ts';
import {workforceReviewFixture} from './fixtures/workforce-review.mjs';

const at='2026-10-03T01:00:00.000Z',goal='Compare three additional Engineer positions in Technology';
function make(patch={}) {
  const input={...workforceReviewFixture().input,...patch};
  let solution=createWorkforceSolution('solution-a','goal-a',{...emptySolutionInputs(),scope:{...input,goalStatement:goal,ownerNotes:'excluded-owner-note'}},at);
  const payload=workforceReviewFixture();payload.input=input;
  try {payload.proposed=calculateWorkforceIncrement(input,payload.timing);payload.hireOnly=calculateWorkforceIncrement({...input,build:'0',move:'0',buy:input.roles,backfills:'0',internalAnnualCostChange:'0',trainingCash:'0',trainingHours:'0'},payload.timing)} catch { /* Invalid-input tests must reach the runner guard. */ }
  const started=beginSolutionRun(solution,1,'source-run',['brief'],at);
  solution=completeSolutionRun(started.state,started.ticket,[{id:'evidence-result',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload}],at);
  return {input,solution};
}
const evaluate=id=>({name:'evaluate_workforce_option',arguments:{option_id:id}});
const finish=(conclusion='constraints_met_outcomes_unknown',preferred='reviewed-mix',ids=['reviewed-mix','hiring-only'])=>({name:'finish_workforce_review',arguments:{conclusion,preferred_option_id:preferred,reviewed_option_ids:ids}});
function run(solution,actions,extra={}) {
  let index=0;
  return runWorkforcePlanningAgent({solution,currentSolution:()=>solution,reviewedRevisions:[],allowRevision:false,evidenceResultId:'evidence-result',runId:'run-a',signal:new AbortController().signal,model:async()=>actions[index++],...extra});
}

test('model chooses evaluation order; deterministic constraints gate its final preference',async()=>{
  const {solution}=make();
  const result=await run(solution,[evaluate('hiring-only'),evaluate('reviewed-mix'),finish()]);
  assert.deepEqual(result.evaluations.map(item=>item.optionId),['hiring-only','reviewed-mix']);
  assert.equal(result.evaluations[0].status,'not-met');assert.equal(result.evaluations[1].plan.totalCash,22500);
  assert.equal(result.preferredOptionId,'reviewed-mix');assert.equal(result.modelTurns,3);assert.equal(result.requiresUserReview,true);
  assert.equal(solution.results.length,1);assert.equal(solution.approvals.length,0);
});
test('a model-directed reviewed revision can pass after both original options fail',async()=>{
  const {solution,input}=make({budget:'20000'}),revision={...input,trainingCash:'0'};
  let turn=0;
  const result=await run(solution,[],{allowRevision:true,reviewedRevisions:[revision],model:async envelope=>{
    turn++;
    if(turn===1)return evaluate('reviewed-mix');
    if(turn===2)return evaluate('hiring-only');
    if(turn===3){assert.ok(envelope.evaluations.every(item=>item.status==='not-met'));return evaluate('revision-1')}
    assert.equal(envelope.evaluations[2].cash,19500);
    return finish('constraints_met_outcomes_unknown','revision-1',['reviewed-mix','hiring-only','revision-1']);
  }});
  assert.equal(result.modelTurns,4);assert.equal(result.revisionEvaluations,1);assert.equal(result.preferredOptionId,'revision-1');
  assert.equal(result.evaluations[0].plan.input.trainingCash,'3000');assert.equal(solution.versions.length,1);
});
test('model may stop without revision; an infeasible option is never promoted to success',async()=>{
  const {solution,input}=make({budget:'1000'});
  const result=await run(solution,[evaluate('reviewed-mix'),evaluate('hiring-only'),finish('no_evaluated_option_meets_entered_constraints',null)],{allowRevision:true,reviewedRevisions:[{...input,trainingCash:'0'}]});
  assert.equal(result.revisionEvaluations,0);assert.equal(result.preferredOptionId,null);assert.equal(result.evaluations.length,2);
});
test('unknown costs remain unknown and require an incomplete conclusion',async()=>{
  const {solution}=make({annualHireCost:''});
  let index=0;
  const result=await run(solution,[],{model:async envelope=>{
    if(index===2){assert.deepEqual(envelope.tools.find(tool=>tool.name==='finish_workforce_review').parameters.properties.preferred_option_id,{type:'null'});assert.ok(!JSON.stringify(envelope.tools).includes('"enum":[]'))}
    return [evaluate('reviewed-mix'),evaluate('hiring-only'),finish('constraints_incomplete',null)][index++];
  }});
  assert.equal(result.evaluations[0].plan.totalCash,null);assert.equal(result.evaluations[0].status,'unknown');
  await assert.rejects(run(solution,[evaluate('reviewed-mix'),evaluate('hiring-only'),finish()]),/contradicts/);
});
test('unsupported replacement demand stops before any model call',async()=>{
  const {solution}=make({intent:'replacement'});let calls=0;
  await assert.rejects(run(solution,[],{model:async()=>{calls++;return evaluate('reviewed-mix')}}),/additional positions only/);
  assert.equal(calls,0);
});
test('no model envelope includes saved owner notes, approvals, full evidence or solution identifiers',async()=>{
  const {solution}=make();let index=0;
  await run(solution,[],{model:async envelope=>{
    const json=JSON.stringify(envelope);for(const excluded of ['excluded-owner-note','solution-a','goal-a','internal_talent_readiness','skill_bundle'])assert.ok(!json.includes(excluded));
    assert.deepEqual(Object.keys(envelope),['goal','options','evaluations','tools']);
    return [evaluate('reviewed-mix'),evaluate('hiring-only'),finish()][index++];
  }});
});
test('schema permits only currently available tools and finite reviewed option IDs',async()=>{
  const {solution,input}=make();let index=0;
  await run(solution,[],{allowRevision:true,reviewedRevisions:[{...input,trainingCash:'0'}],model:async envelope=>{
    if(index===0){assert.deepEqual(envelope.tools.map(item=>item.name),['evaluate_workforce_option']);assert.deepEqual(envelope.tools[0].parameters.properties.option_id.enum,['reviewed-mix','hiring-only'])}
    if(index===2){const finishTool=envelope.tools.find(tool=>tool.name==='finish_workforce_review');assert.deepEqual(finishTool.parameters.properties.conclusion.enum,['constraints_met_outcomes_unknown']);assert.deepEqual(finishTool.parameters.properties.preferred_option_id.anyOf[1].enum,['reviewed-mix'])}
    return [evaluate('reviewed-mix'),evaluate('hiring-only'),finish()][index++];
  }});
});
test('unknown tools, invented inputs, duplicate calculations and premature finish are rejected',async()=>{
  const {solution}=make();
  for(const actions of [[{name:'fetch_employees',arguments:{}}],[{name:'evaluate_workforce_option',arguments:{option_id:'reviewed-mix',buy:0}}],[evaluate('invented')],[evaluate('reviewed-mix'),evaluate('reviewed-mix')],[finish()]])await assert.rejects(run(solution,actions));
});
test('revision permission, scope and single-revision limit are enforced outside model instructions',async()=>{
  const {solution,input}=make(),revision={...input,trainingCash:'0'};
  await assert.rejects(run(solution,[],{reviewedRevisions:[revision]}),/explicitly permitted/);
  for(const patch of [{roles:'4',buy:'2'},{budget:'999999'},{businessUnit:'OTHER'},{arrivalDate:'2026-12-01'}])await assert.rejects(run(solution,[],{allowRevision:true,reviewedRevisions:[{...revision,...patch}]}),/cannot change/);
  await assert.rejects(run(solution,[evaluate('revision-1')],{allowRevision:true,reviewedRevisions:[revision]}),/revision boundary/);
  await assert.rejects(run(solution,[evaluate('reviewed-mix'),evaluate('hiring-only'),evaluate('revision-1'),evaluate('revision-2')],{allowRevision:true,reviewedRevisions:[revision,{...input,trainingCash:'1000'}]}),/unavailable tool/);
});
test('final review rejects failed preference, missing results and uncalculated claims',async()=>{
  const {solution}=make();
  for(const final of [finish('constraints_met_outcomes_unknown','hiring-only'),finish('constraints_met_outcomes_unknown','invented'),finish('constraints_met_outcomes_unknown','reviewed-mix',['reviewed-mix']),finish('constraints_met_outcomes_unknown','reviewed-mix',['reviewed-mix','reviewed-mix']),{...finish(),arguments:{...finish().arguments,claimedSavings:1000}}])await assert.rejects(run(solution,[evaluate('reviewed-mix'),evaluate('hiring-only'),final]));
});
test('model adapter mutation cannot widen available tools or overwrite reviewed numeric inputs',async()=>{
  const {solution}=make();
  await assert.rejects(run(solution,[],{model:async envelope=>{envelope.tools.push({name:'finish_workforce_review'});return finish('no_evaluated_option_meets_entered_constraints',null,[])}}),/unavailable tool/);
  let index=0;
  const result=await run(solution,[],{model:async envelope=>{envelope.options[0].input.trainingCash='0';return [evaluate('reviewed-mix'),evaluate('hiring-only'),finish()][index++]}});
  assert.equal(result.evaluations[0].plan.totalCash,22500);
});
test('solution change, cancellation and timeout reject late responses without saving results',async()=>{
  const {solution,input}=make();let current=solution;
  await assert.rejects(run(solution,[],{currentSolution:()=>current,model:async()=>{current=reviseWorkforceSolution(solution,1,{scope:{...input,goalStatement:goal,budget:'1000'}},'sidebar','Changed budget',at);return evaluate('reviewed-mix')}}),/solution changed/);
  const controller=new AbortController();
  await assert.rejects(run(solution,[],{signal:controller.signal,model:async()=>{controller.abort();return evaluate('reviewed-mix')}}));
  await assert.rejects(run(solution,[],{timeoutMs:20,model:async()=>new Promise(resolve=>setTimeout(()=>resolve(evaluate('reviewed-mix')),50))}),/cancelled or timed out/);
  assert.equal(solution.results.length,1);assert.equal(solution.approvals.length,0);
});
test('explicit goal-local retention preserves brief notes, approvals and prior single-role results',async()=>{
  const {solution,input}=make();
  const result=await run(solution,[evaluate('reviewed-mix'),evaluate('hiring-only'),finish()]);
  const history=retainWorkforceAgentReview([],result,solution);assert.equal(history.length,1);
  const data={version:1,revision:1,goals:{version:1,activeId:'goal-a',goals:[{id:'goal-a',statement:goal}]},workspaces:{'goal-a':{savedAt:at,fields:{workforceSolution:solution,workforceAgentReviews:history,brief:{owner:'Keep owner',approvals:[{text:'Keep review',recordedAt:at}]}}}}};
  const restored=parseDecisions(encodeDecisions(data));
  assert.deepEqual(restored.workspaces['goal-a'].fields.brief,data.workspaces['goal-a'].fields.brief);
  assert.deepEqual(restored.workspaces['goal-a'].fields.workforceSolution,solution);
  assert.throws(()=>retainWorkforceAgentReview(history,result,solution),/duplicate run/);
  const next=reviseWorkforceSolution(solution,1,{scope:{...input,goalStatement:goal,trainingCash:'0'}},'conversation','Changed training cost',at);
  assert.equal(workforceAgentReviewIsCurrent(next,result),false);assert.throws(()=>retainWorkforceAgentReview([],result,next),/stale/);
  const other=createWorkforceSolution('other-solution','other-goal',emptySolutionInputs(),at);
  assert.equal(workforceAgentReviewIsCurrent(other,result),false);
});
test('saved timing identity is required, bound to the review, and checked again after model return',async()=>{
 const {solution}=make({arrivalMode:'historical-median'});
 let calls=0;
 await assert.rejects(run(solution,[],{evidenceResultId:'invented',model:async()=>{calls++;return evaluate('reviewed-mix')}}),/current saved/);assert.equal(calls,0);
 const result=await run(solution,[evaluate('reviewed-mix'),evaluate('hiring-only'),finish()]);
 const changed=structuredClone(solution);changed.results[0].payload.timing.opening_to_start.median_days=60;
 assert.equal(workforceAgentReviewIsCurrent(changed,result),false);assert.equal(readWorkforceAgentReview(result,changed),null);
 let current=solution;
 await assert.rejects(run(solution,[],{currentSolution:()=>current,model:async()=>{current=changed;return evaluate('reviewed-mix')}}),/solution changed/);
 const missing=structuredClone(solution);delete missing.results[0].payload.timing;
 await assert.rejects(run(missing,[]),/unreadable/);
});
test('reordered JSON fields cannot disguise a duplicate reviewed revision',async()=>{
 const {solution,input}=make();const reordered=Object.fromEntries(Object.entries(input).reverse());
 await assert.rejects(run(solution,[],{allowRevision:true,reviewedRevisions:[reordered]}),/duplicates/);
 const revision={...input,trainingCash:'0'};
 await assert.rejects(run(solution,[],{allowRevision:true,reviewedRevisions:[revision,Object.fromEntries(Object.entries(revision).reverse())]}),/duplicates/);
});
test('retention replays calculations and rejects forged conclusions, preferences, counts and money',async()=>{
 const {solution}=make();const result=await run(solution,[evaluate('reviewed-mix'),evaluate('hiring-only'),finish()]);
 assert.deepEqual(readWorkforceAgentReview(JSON.parse(JSON.stringify(result)),solution),result);
 for(const mutate of [r=>r.evaluations=[],r=>r.requiresUserReview=false,r=>r.preferredOptionId='invented',r=>r.conclusion='constraints_incomplete',r=>r.modelTurns=5,r=>r.revisionEvaluations=1,r=>r.evaluations[0].plan.totalCash=0,r=>r.evaluations[0].status='unknown',r=>r.evaluations[1].optionId='reviewed-mix',r=>r.reviewedOptions[0].input.trainingCash='0',r=>r.binding.evidenceResultId='invented',r=>r.id='bad/id']){
  const bad=structuredClone(result);mutate(bad);assert.equal(readWorkforceAgentReview(bad,solution),null);assert.throws(()=>retainWorkforceAgentReview([],bad,solution));
 }
 const next=structuredClone(result);next.id='run-b';const badHistory=structuredClone(result);badHistory.evaluations[0].plan.totalCash=0;
 assert.throws(()=>retainWorkforceAgentReview([badHistory],next,solution),/history is unreadable/);
});
test('historical agent review stays inspectable after edits but cannot be retained as current',async()=>{
 const {solution,input}=make();const result=await run(solution,[evaluate('reviewed-mix'),evaluate('hiring-only'),finish()]);
 const next=reviseWorkforceSolution(solution,1,{scope:{...input,goalStatement:goal,trainingCash:'0'}},'sidebar','Changed training cost',at);
 assert.deepEqual(readWorkforceAgentReview(result,next),result);assert.equal(workforceAgentReviewIsCurrent(next,result),false);
});
test('pre-cancellation and A-to-B-to-A cancellation cannot accept a delayed completion',async()=>{
 const {solution}=make();const controller=new AbortController();controller.abort();let calls=0;
 await assert.rejects(run(solution,[],{signal:controller.signal,model:async()=>{calls++;return evaluate('reviewed-mix')}}));assert.equal(calls,0);
 const switched=new AbortController();let current=solution;
 await assert.rejects(run(solution,[],{signal:switched.signal,currentSolution:()=>current,model:async()=>{
  current=createWorkforceSolution('other','other',emptySolutionInputs(),at);switched.abort();current=solution;return evaluate('reviewed-mix');
 }}));assert.equal(solution.results.length,1);
});
test('model failure and repeated invalid finish cannot extend execution or retain partial results',async()=>{
 const {solution,input}=make();let calls=0;
 await assert.rejects(run(solution,[],{model:async()=>{calls++;throw Error('fixture model failure')}}),/fixture model failure/);assert.equal(calls,1);
 calls=0;const actions=[evaluate('reviewed-mix'),evaluate('hiring-only'),evaluate('revision-1'),evaluate('revision-2')];
 await assert.rejects(run(solution,[],{allowRevision:true,reviewedRevisions:[{...input,trainingCash:'0'},{...input,trainingCash:'1'}],model:async()=>actions[calls++]}));assert.equal(calls,4);assert.equal(solution.approvals.length,0);
});
