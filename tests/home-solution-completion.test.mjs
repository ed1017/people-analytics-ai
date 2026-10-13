/** Offline completion safety: provider text is explicit intent, never inferred from a tool. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {solutionPreparation} from '../lib/home-solution-preparation.ts';
import {solutionRequest,candidate,evaluate,final,quantity,constraint,projectionInputs} from './fixtures/home-solution-conversation.mjs';
import {fixedMessages,fixedChanges,fixedValues} from './fixtures/required-staffing.mjs';
import {editRequiredStaffing,requiredStaffingView} from '../lib/home-required-staffing.ts';
const signal=()=>new AbortController().signal;
const unsupported=()=>final({findings:'The current packet does not rank the requested groups.',decisionRationale:'Confirm comparable scope and period before selecting a population.',caveats:['Company-wide figures do not identify a weakest team.'],unsupportedPlan:{decision:'Which population should receive the pilot?',nextStep:'Confirm comparable group evidence and review an unconfirmed pilot.',calculationRefs:[]}});
function response(steps=[],answer=null){const calls=steps.map((step,i)=>({id:'call-'+i,name:step.name,arguments:JSON.stringify(step.args)}));return {completed:true,calls,items:calls.map(c=>({type:'function_call',call_id:c.id,name:c.name,arguments:c.arguments})),text:answer?JSON.stringify(answer):''};}
function runtime(outputs){const contexts=[],events=[];let rounds=0;return {contexts,events,get rounds(){return rounds;},requestTime:new Date('2026-10-12T00:30:00Z'),now:()=>new Date('2026-10-12T01:00:00Z'),loadProjection:async()=>projectionInputs(),onToolResult:e=>events.push(e),complete:async input=>{contexts.push(structuredClone(input));const next=outputs[rounds++];assert.ok(next,'No unexpected provider round');return typeof next==='function'?next(input):next;}};}
const run=(body,rt,s=signal())=>converseSolutions(body,rt,s);
const checked=id=>response([evaluate(candidate(id))],final('An unconfirmed pilot is ready for review.',[id]));

test('request-start clock uses browser timezone and supplied coverage without fetching or changing facts',async()=>{
 const body=solutionRequest();body.timeZone='America/Los_Angeles';const before=structuredClone(body),rt=runtime([response([],unsupported())]);
 await run(body,rt);const ctx=JSON.parse(rt.contexts[0][0].content.split('\n').slice(1).join('\n'));
 assert.equal(ctx.preparation.clock.utc,'2026-10-12T00:30:00.000Z');assert.match(ctx.preparation.clock.local,/Sunday, October 11, 2026/);assert.match(ctx.preparation.clock.basis,/request-start/);
 assert.deepEqual(ctx.preparation.coverage.sources,body.evidence.sources.map(({id,status})=>({id,status})));
 assert.deepEqual(body,before);assert.match(ctx.preparation.coverage.boundary,/Do not relabel business units as teams/);
 const fallback=solutionPreparation(body,new Date('2026-10-12T00:30:00Z'),'conversation-preparation');assert.match(fallback.clock.basis,/conversation-preparation/);
});
test('explicit checked candidate plus typed final completes in one round across existing domains',async()=>{
 for(const domain of ['manager_workload','learning','mobility','compensation','hiring','execution']){
  const c=candidate(domain);c.activities[0].domain=domain;const rt=runtime([response([evaluate(c)],final('Review this unconfirmed proposal.',[c.id]))]);const reply=await run(solutionRequest(),rt);
  assert.deepEqual(reply.usage,{modelRounds:1,toolCalls:1});assert.deepEqual(reply.candidateIds,[c.id]);assert.deepEqual(reply.state.working[0].blocking,[]);assert.equal(rt.events[0].status,'ok');
 }
});
test('candidate-only output never finishes early; requested alternatives and mixed domains retain continuation',async()=>{
 const a=candidate('workload'),b=candidate('learning');a.activities[0].domain='manager_workload';b.activities.push({...b.activities[0],id:'c2',domain:'mobility'});
 const rt=runtime([response([evaluate(a)]),response([evaluate(b)]),response([],final('Compare workload changes with learning and mobility; effectiveness remains unproven.',[a.id,b.id]))]);
 const reply=await run(solutionRequest('Compare two alternatives combining workload, learning and mobility.'),rt);assert.equal(reply.usage.modelRounds,3);assert.deepEqual(reply.candidateIds,[a.id,b.id]);assert.equal(reply.state.working[1].candidate.activities.length,2);
});
test('two checked alternatives with explicit final retain both; no automatic winner',async()=>{
 const a=candidate('a'),b=candidate('b'),rt=runtime([response([evaluate(a),evaluate(b)],final('Two options to review; no validated effectiveness ranking.',['a','b']))]);
 assert.deepEqual((await run(solutionRequest('Compare two options.'),rt)).candidateIds,['a','b']);assert.equal(rt.rounds,1);
});
test('successful candidate plus failed second tool cannot use a valid accompanying final',async()=>{
 const rt=runtime([response([evaluate(candidate('a')),{name:'read_evidence',args:{sourceIds:['missing']}}],final('Ready.',['a'])),response([],unsupported())]);
 const reply=await run(solutionRequest(),rt);assert.equal(reply.usage.modelRounds,2);assert.deepEqual(reply.candidateIds,[]);assert.deepEqual(rt.events.map(e=>e.status),['ok','feedback']);
});
test('blocking candidate and later corrected candidate keep continuation after feedback',async()=>{
 const c=candidate('a');c.quantities=[quantity('horizon_months',2,'months',null,'nonexistent')];const rt=runtime([response([evaluate(c)],final('Ready.',['a'])),checked('b'),response([],final('Review the corrected draft.',['b']))]);
 const reply=await run(solutionRequest(),rt);assert.equal(rt.rounds,3);assert.ok(reply.state.working[0].blocking.length);assert.deepEqual(reply.candidateIds,['b']);
});
test('late constraints in final or another candidate do not activate completion',async()=>{
 const a=candidate('a'),b=candidate('b');
 for(const first of [response([evaluate(a)],{...final('Ready.',['a']),constraintUpdates:[constraint(100)]}),response([evaluate(a),evaluate(b,[constraint(100)])],final('Ready.',['a','b']))]){
  const rt=runtime([first,response([],unsupported())]);assert.equal((await run(solutionRequest('Use a budget of 100 USD.'),rt)).usage.modelRounds,2);
 }
});
test('missing required staffing cannot be replaced by a checked pilot and typed final',async()=>{
 const rt=runtime([checked('a'),response([],final('Staffing is ready.'))]);rt.natural={datasetToken:'legacy-v1:0'};
 await assert.rejects(run(solutionRequest(fixedMessages.start),rt),/not calculated/);assert.equal(rt.rounds,2);
});
test('temporary staffing mutation exceeding result bounds cannot finalize or mutate caller state',async()=>{
 const body=solutionRequest(fixedMessages.start+' '+'x'.repeat(3300));
 const prior=editRequiredStaffing(body,'legacy-v1:0',fixedChanges(body,{...fixedValues,hireTrainingHoursPerPerson:0,backfillCostPerInternalPerson:0,internalRelease:false,costsComplete:false,hireReadyAfterMonths:0,trainingReadyAfterMonths:0,redeployReadyAfterMonths:0}));
 assert.ok(JSON.stringify(requiredStaffingView(prior)).length>65000);
 const next=solutionRequest(fixedMessages.followup,false,{...body.state,requiredStaffing:prior},2);
 const before=structuredClone(next),rt=runtime([response([{name:'compare_required_staffing',args:{changes:[]}}],final('Ready.')),response([],final('Ready.'))]);rt.natural={datasetToken:'legacy-v1:0'};
 await assert.rejects(run(next,rt),/not calculated/);assert.equal(rt.rounds,2);assert.equal(rt.events[0].status,'feedback');assert.deepEqual(next,before);
});
test('guessed calculation references, stale metric revisions and unsupported metric IDs use centralized final validation',async()=>{
 const forged=unsupported();forged.answer.unsupportedPlan.calculationRefs=['guessed'];
 for(const answer of [forged,{...final('Ready.',['a']),verifiedMetrics:[{kind:'candidate',id:'a',revision:999,metric:'cash_usd'}]}]){
  const rt=runtime([response([evaluate(candidate('a'))],answer)]);
  await assert.rejects(run(solutionRequest(),rt),/checked|metric|Unexpected|unexpected/);
 }
});
test('unsupported ranking can finish honestly from supplied coverage and a local lookup',async()=>{
 const rt=runtime([response([{name:'read_evidence',args:{sourceIds:[]}}],unsupported())]);const reply=await run(solutionRequest('Which team has the highest recorded voluntary turnover?'),rt);
 assert.equal(reply.usage.modelRounds,1);assert.match(reply.answer,/does not rank/);assert.deepEqual(reply.candidateIds,[]);
});
test('incomplete provider status rejects otherwise valid text before any tool executes',async()=>{
 const rt=runtime([{...checked('a'),completed:false}]);await assert.rejects(run(solutionRequest(),rt),/incomplete/);assert.deepEqual(rt.events,[]);
});
test('cancellation immediately after tools rejects before returning any state',async()=>{
 const c=new AbortController(),body=solutionRequest(),before=structuredClone(body),rt=runtime([checked('a')]);rt.onToolResult=()=>c.abort();
 await assert.rejects(run(body,rt,c.signal),/cancelled/);assert.deepEqual(body,before);
});
test('diagnostic callback failure cannot change a validated answer',async()=>{
 const rt=runtime([checked('a')]);rt.onToolResult=()=>{throw Error('diagnostic failure');};assert.equal((await run(solutionRequest(),rt)).usage.modelRounds,1);
});
test('ordinary one, two and four round responses retain original limits and clock refresh',async()=>{
 for(const calls of [[],[evaluate(candidate('a'))],[{name:'read_clock',args:{}},{name:'read_evidence',args:{sourceIds:[]}},evaluate(candidate('a'))]]){
  const rt=runtime([...calls.map(c=>response([c])),response([],calls.length?final('Review the pilot.',['a']):unsupported())]);const reply=await run(solutionRequest(),rt);assert.equal(reply.usage.modelRounds,calls.length+1);
  if(calls.length===3){const clock=JSON.parse(rt.contexts[1].find(item=>item.type==='function_call_output').output);assert.equal(clock.utc,'2026-10-12T01:00:00.000Z');assert.match(clock.basis,/tool-execution/);}
 }
});

test('invalid metric names and a provisional constraint change cannot leak into a valid continuation',async()=>{
 const provisional={...final('Ready.',['a']),constraintUpdates:[constraint(100)],verifiedMetrics:[{kind:'candidate',id:'a',revision:999,metric:'unsupported'}]};
 const body=solutionRequest('Use a 100 USD budget.'),before=structuredClone(body),rt=runtime([response([evaluate(candidate('a'))],provisional),response([],unsupported())]);
 const reply=await run(body,rt);assert.equal(rt.rounds,2);assert.deepEqual(reply.state.constraints,[]);assert.deepEqual(body,before);
 const result=JSON.parse(rt.contexts[1].find(item=>item.type==='function_call_output').output);assert.deepEqual(result.constraints,[]);
});

test('co-produced final scope rejection fails atomically rather than continuing with provisional state',async()=>{
 const body=solutionRequest(),before=structuredClone(body),rt=runtime([response([{name:'read_clock',args:{}}],final('United States exits were 4 [A1:summary].')),response([],unsupported())]);
 await assert.rejects(run(body,rt),/unsupported population/);assert.equal(rt.rounds,1);assert.deepEqual(body,before);
});
