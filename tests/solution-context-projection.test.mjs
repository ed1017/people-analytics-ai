import test from 'node:test';
import assert from 'node:assert/strict';
import {converseSolutions,solutionModelContext} from '../lib/home-solution-conversation-service.ts';
import {evaluateSolutionCandidate,readSolutionState,saveSolutionCandidate} from '../lib/home-solution-conversation.ts';
import {solutionEvaluationView} from '../lib/home-solution-model-view.ts';
import {replayPreserved} from './helpers/preserved-context-replay.mjs';
import {solutionRequest,based,final,fixtureRuntime,constraint} from './fixtures/home-solution-conversation.mjs';
const size=x=>Buffer.byteLength(JSON.stringify(x));
const resultView=result=>result&&Object.fromEntries(Object.entries(result).filter(([key])=>!['inputKey','bindingKey','signature'].includes(key)));
const draftView=draft=>draft&&Object.fromEntries(Object.entries(draft).filter(([key])=>key!=='signature'));
test('complete preserved three-turn application sequence keeps exact calculations and reaches bounded continuation',async()=>{const report=await replayPreserved();assert.ok(report.turns[2].continuationReached);});
test('all retained user history, constraints, evidence and candidate revisions survive projection',async()=>{
 const r=solutionRequest('Compare the alternatives while retaining my original constraint.',true);
 r.state.turns=Array.from({length:30},(_,i)=>({id:'history-'+i,role:i%2?'assistant':'user',text:(i===0?'Original intent: protect voluntary participation. ':'Retained context. ')+('detail '.repeat(90))}));
 r.state.constraints=[constraint(2200,'history-28')];
 for(let i=0;i<8;i++){const c=based();c.id='candidate-'+(i%7);r.state.working.push(await evaluateSolutionCandidate(r,c,r.state.constraints));}
 const before=structuredClone(r),view=solutionModelContext(r);
 assert.deepEqual(view.recentTurns,r.state.turns);assert.deepEqual(view.currentConstraints,r.state.constraints);assert.deepEqual(view.currentEvidence,r.evidence);assert.deepEqual(view.currentMessage,r.message);
 assert.equal(view.workingProposals.length,8);assert.equal(view.currentWorkingRevisions.find(c=>c.id==='candidate-0').revision,2);
 assert.deepEqual(view.workingProposals.map(c=>[c.id,c.revision]),r.state.working.map(c=>[c.id,c.revision]));
 assert.ok(size(view)<120000);assert.deepEqual(r,before);
 await converseSolutions(r,fixtureRuntime([final('Let us compare the alternatives under the current ceiling.')]),new AbortController().signal);
});
test('read plan tool omits equality serialization but retains actual inputs, user intent and source provenance',async()=>{
 const r=solutionRequest('Read plan A.',true);let actual;
 await converseSolutions(r,fixtureRuntime([{name:'read_plans',args:{planIds:['A']}},input=>{actual=JSON.parse(input.at(-1).output)[0];return final('The saved inputs are available for review.');}]),new AbortController().signal);
 const expected=r.catalog.plans.find(p=>p.id==='A');assert.deepEqual(actual.draft,draftView(expected.draft));assert.deepEqual(actual.result,resultView(expected.result));assert.deepEqual(actual.operation,expected.operation);assert.deepEqual(actual.sourceRefs,expected.sourceRefs);
});
test('changed constraints, stale saved sources and missing evidence remain explicit',async()=>{
 const r=solutionRequest('Correct the ceiling.',true),c=based();const e=await evaluateSolutionCandidate(r,c,[]);r.state.working=[e];r.state.constraints=[constraint(1)];
 r.catalog.plans[0].draft.inputs.budget.amount.value=2;
 const view=solutionModelContext(r);assert.equal(view.workingProposals[0].sourcesCurrent,false);assert.deepEqual(view.currentConstraints,[constraint(1)]);assert.deepEqual(view.workingProposals[0].constraints,[]);
 await assert.rejects(saveSolutionCandidate(r,r.catalog,e,r.goal,r.evidence,true),/current reviewed revision/);
 const missing=solutionRequest('What does missing evidence say?');
 await converseSolutions(missing,fixtureRuntime([{name:'read_evidence',args:{sourceIds:['missing-source']}},input=>{assert.match(JSON.parse(input.at(-1).output).error,/unavailable/);return final('The requested evidence is unavailable.');}]),new AbortController().signal);
 assert.deepEqual(solutionModelContext(missing).currentEvidence,missing.evidence);
});
test('oversized semantic history fails the unchanged guard rather than silently dropping user intent',async()=>{
 const r=solutionRequest();r.state.turns=Array.from({length:30},(_,i)=>({id:'long-'+i,role:i%2?'assistant':'user',text:'x'.repeat(9990)}));const before=structuredClone(r);let calls=0;
 await assert.rejects(converseSolutions(r,{complete:async()=>{calls++;throw Error('Should not call');},loadProjection:async()=>{throw Error('Should not load');}},new AbortController().signal),/narrower set of sources/);
 assert.equal(calls,0);assert.deepEqual(r,before);
});
test('projected calculation is not a valid replacement for server authority',async()=>{
 const r=solutionRequest('Review A.',true),e=await evaluateSolutionCandidate(r,based(),[]);assert.ok(e.result.inputKey);assert.ok(e.sourceKeys.A);
 const view=solutionEvaluationView(r,e);assert.throws(()=>readSolutionState({...r.state,working:[view]}));assert.ok(e.result.inputKey);assert.ok(e.sourceKeys.A);
});
