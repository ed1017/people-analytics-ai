import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {assertSolutionShape,solutionFinalSchema} from '../lib/home-solution-conversation-schema.ts';
import {fictionalScenarios,fictionalRequest,fictionalProjection} from './fixtures/fictional-solution-evaluation.mjs';
import {based,candidate,quantity,evaluate,final,project,projectionSpec,fixtureRuntime,constraint} from './fixtures/home-solution-conversation.mjs';

const preserved=JSON.parse(readFileSync(new URL('./fixtures/clock-deadline-preserved-answer.json',import.meta.url),'utf8'));
const deadline=()=>{const c=based();c.id=preserved.candidateIds[0];c.quantities=[{...quantity('activity_finish',null,'YYYY-MM-DD','c1','user-3'),text:'2026-11-20'}];return c;};
const request=()=>fictionalRequest(fictionalScenarios.find(s=>s.id==='clock-deadline'),2);
const lastResult=input=>JSON.parse(input.findLast(row=>row.type==='function_call_output').output);
const invoke=(req,steps)=>converseSolutions(req,fixtureRuntime(steps,fictionalProjection()),new AbortController().signal);

test('preserved final is schema-valid but reconstructed evaluation rejects nested draft revision',async()=>{
 // Exact captured final; candidate tool arguments are an explicit reconstruction, not a historical replay.
 assertSolutionShape(preserved,solutionFinalSchema);
 let calculated;
 await assert.rejects(invoke(await request(),[evaluate(deadline()),input=>{
  calculated=lastResult(input);return structuredClone(preserved);
 }]),/A claimed quantitative result was not checked in this turn/);
 assert.equal(calculated.revision,1);assert.equal(calculated.draft.revision,3);
 assert.deepEqual(calculated.blocking,[]);
});

test('server-issued candidate references use evaluation revision and accept valid claims',async()=>{
 let calculated;
 const reply=await invoke(await request(),[evaluate(deadline()),input=>{
  calculated=lastResult(input);
  return {...structuredClone(preserved),verifiedMetrics:calculated.verifiedMetricReferences};
 }]);
 assert.deepEqual(calculated.verifiedMetricReferences,['cash_usd','staff_hours','participants'].map(metric=>({kind:'candidate',id:preserved.candidateIds[0],revision:1,metric})));
 assert.deepEqual(reply.state.verifiedMetrics,calculated.verifiedMetricReferences);
 assert.equal(calculated.result.cashEstimate.cash,3000);
 assert.equal(calculated.result.deliveryEstimate.hours,28);
 assert.equal(calculated.result.uniqueParticipants,10);
});

test('re-evaluation does not make stale metric references acceptable',async()=>{
 let first;
 await assert.rejects(invoke(await request(),[evaluate(deadline()),input=>{
  first=lastResult(input).verifiedMetricReferences;return evaluate(deadline());
 },input=>{
  assert.ok(lastResult(input).verifiedMetricReferences.every(ref=>ref.revision===2));
  return {...structuredClone(preserved),verifiedMetrics:first};
 }]),/A claimed quantitative result was not checked in this turn/);
});

test('blocked candidate calculations advertise no quantitative references',async()=>{
 await invoke(await request(),[evaluate(deadline(),[constraint(1,'user-3')]),input=>{
  const result=lastResult(input);assert.ok(result.blocking.length>0);
  assert.deepEqual(result.verifiedMetricReferences,[]);
  return final('This proposal exceeds the current constraint and needs review.');
 }]);
});

test('unknown candidate quantities are not advertised as checked numeric claims',async()=>{
 const req=await fictionalRequest(fictionalScenarios.find(s=>s.id==='goal-select-refine'),0);
 await invoke(req,[evaluate(candidate()),input=>{
  const result=lastResult(input);
  assert.deepEqual(result.verifiedMetricReferences,[]);
  return final('Resources and effects remain unknown.');
 }]);
});

test('projection results expose current checked references without changing chart values',async()=>{
 const req=await fictionalRequest(fictionalScenarios.find(s=>s.id==='headcount-followup'),0);
 const reply=await invoke(req,[project(projectionSpec()),input=>{
  const result=lastResult(input);
  assert.deepEqual(result.verifiedMetricReferences,['opening_headcount','closing_headcount'].map(metric=>({kind:'projection',id:'headcount',revision:1,metric})));
  return {...final('This is a scenario under explicit assumptions.',[],['headcount']),verifiedMetrics:result.verifiedMetricReferences};
 }]);
 assert.equal(reply.state.analyses[0].inputs.opening,127);
 assert.equal(reply.state.verifiedMetrics.length,2);
});
