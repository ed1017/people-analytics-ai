import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {actionEvidenceCatalog} from '../lib/home-action-proposal.ts';
import {converseSolutions,solutionModelContext} from '../lib/home-solution-conversation-service.ts';
import {evaluateSolutionCandidate,readSolutionRequest,saveSolutionCandidate} from '../lib/home-solution-conversation.ts';
import {fixtureRuntime,final,evaluate,candidate,constraint,based,solutionRequest,quantity} from './fixtures/home-solution-conversation.mjs';
const preserved=JSON.parse(readFileSync(new URL('./fixtures/preserved-evidence-identifier-failure.json',import.meta.url),'utf8'));
const args=()=>JSON.parse(preserved.arguments);
const request=()=>readSolutionRequest(JSON.parse(preserved.request.text));
const last=input=>JSON.parse(input.at(-1).output);
const invoke=(r,steps)=>converseSolutions(r,fixtureRuntime(steps),new AbortController().signal);
const hash=s=>createHash('sha256').update(s).digest('hex');

test('preserved failing application payload hashes and exact validator boundary remain intact',async()=>{
 assert.equal(hash(preserved.arguments),preserved.provenance.argumentsSha256);
 assert.equal(hash(preserved.result),preserved.provenance.resultSha256);
 assert.equal(hash(preserved.request.text),preserved.request.sha256);
 const r=request(), item=await evaluateSolutionCandidate(r,args().candidate,[]);
 assert.deepEqual(item.blocking,JSON.parse(preserved.result).blocking);assert.equal(item.draft,null);
 await assert.rejects(saveSolutionCandidate({...r,state:{...r.state,working:[item]}},null,item,{id:'selected',statement:item.candidate.goal.statement},r.evidence,true),/blocking calculation/);
});
test('compact context and both evidence read modes carry the full canonical citation catalog',async()=>{
 const r=request(),catalog=actionEvidenceCatalog(r.evidence);
 assert.deepEqual(solutionModelContext(r).citationCatalog,catalog);
 assert.deepEqual(catalog.map(x=>x.id),['W1:summary','A1:summary']);
 for(const sourceIds of [[],['W1','A1']])await invoke(r,[{name:'read_evidence',args:{sourceIds}},input=>{
  const rows=last(input);assert.deepEqual(rows.flatMap(x=>x.citationCatalog),catalog);
  assert.ok(rows.every(row=>row.citationCatalog.every(item=>item.sourceId===row.id)));
  return final('Current scoped evidence is available.');
 }]);
 await invoke(r,[{name:'read_evidence',args:{sourceIds:['W1:summary']}},input=>{assert.match(last(input).error,/unavailable/);return final('Use packet IDs for source lookup.');}]);
});
test('preserved invalid call receives bounded exact-ID feedback without state or constraint changes',async()=>{
 const r=request(),before=structuredClone(r);
 const reply=await invoke(r,[evaluate(args().candidate,[constraint(1)]),input=>{
  const feedback=last(input);assert.equal(feedback.code,'invalid_evidence_identifiers');
  assert.deepEqual(feedback.allowedEvidenceIds,actionEvidenceCatalog(r.evidence).map(x=>x.id));
  assert.equal(feedback.invalidReferences.length,6);assert.ok(Buffer.byteLength(JSON.stringify(feedback))<4000);
  return final('The evidence citations require correction.');
 }]);
 assert.deepEqual(reply.state.working,[]);assert.deepEqual(reply.state.constraints,[]);assert.deepEqual(r,before);
 await assert.rejects(invoke(r,[evaluate(args().candidate),final('Checked.',[args().candidate.id])]),/not checked in this turn/);
});
test('explicit corrected identifiers allow preserved candidate selection within the existing loop',async()=>{
 const r=request(),corrected=args().candidate;
 // A test-authored correction, not a claimed historical or newly generated model answer.
 for(const activity of corrected.activities)activity.evidenceIds=activity.evidenceIds.map(id=>({W1:'W1:summary',A1:'A1:summary'})[id]);
 const reply=await invoke(r,[evaluate(args().candidate),input=>{assert.equal(last(input).code,'invalid_evidence_identifiers');return evaluate(corrected);},input=>{
  assert.deepEqual(last(input).blocking,[]);return final('Review the qualitative proposal with unknown resources.',[corrected.id]);
 }]);
 assert.equal(reply.usage.modelRounds,3);assert.equal(reply.usage.toolCalls,2);assert.equal(reply.state.working.length,1);
 const item=reply.state.working[0];assert.equal(item.result.uniqueParticipants,null);
 const saved=await saveSolutionCandidate({...r,state:reply.state},null,item,{id:'selected',statement:item.candidate.goal.statement},r.evidence,true);
 assert.equal(saved.status,'ready');
});
test('fabricated, parent, stale-row, unloaded and suppressed evidence never becomes an alias',async()=>{
 for(const id of ['W1','A1','W1:made-up','A1:row:99','unknown:summary']){
  const r=request(),c=candidate();c.activities[0].evidenceIds=[id];
  const reply=await invoke(r,[evaluate(c),input=>{assert.equal(last(input).code,'invalid_evidence_identifiers');assert.ok(!last(input).allowedEvidenceIds.includes(id));return final('Unsupported citation.');}]);
  assert.equal(reply.state.working.length,0);
 }
 for(const mode of ['unavailable','suppressed']){
  const r=request(),src=r.evidence.sources.find(x=>x.id==='W1');
  if(mode==='unavailable')src.status='unavailable';else src.facts.suppressed=true;
  const c=candidate();c.activities[0].evidenceIds=['W1:summary'];
  await invoke(r,[evaluate(c),input=>{assert.equal(last(input).code,'invalid_evidence_identifiers');assert.ok(!last(input).allowedEvidenceIds.includes('W1:summary'));return final('That citation is no longer current.');}]);
 }
});
test('feedback cannot add repair rounds, invoke loaders or mutate caller state',async()=>{
 const r=request(),before=structuredClone(r),runtime=fixtureRuntime(Array(4).fill(evaluate(args().candidate)));
 await assert.rejects(converseSolutions(r,runtime,new AbortController().signal),/bounded calculation limit/);
 assert.equal(runtime.rounds,4);assert.equal(runtime.reads,0);assert.deepEqual(r,before);
});
test('retained activities preserve source evidence, while fabricated source activity and stale revision still fail',async()=>{
 const r=solutionRequest('Retain the reviewed plan.',true),c=based();c.activities[0].evidenceIds=['ignored-model-label'];
 const reply=await invoke(r,[evaluate(c),final('Retained.',[c.id])]);
 assert.deepEqual(reply.state.working[0].draft.bundle.components[0].evidence,r.catalog.plans[0].draft.bundle.components[0].evidence);
 for(const change of [c=>c.activities[0].source.activityId='missing',c=>c.base.revision+=100]){
  const invalid=based();change(invalid);
  const item=await evaluateSolutionCandidate(r,invalid,[]);assert.ok(item.blocking.length);assert.equal(item.draft,null);
 }
});
test('participant source targets distinguish actual cohorts/activities from fabricated or stale IDs',async()=>{
 const r=solutionRequest('Use the prior participant count.',true),source={...based().base,field:'participants'};
 const cohort=r.catalog.plans[0].draft.inputs.groups[0].id;
 for(const target of [null,cohort,'c1','fabricated-cohort','deleted-activity']){
  const c=based();c.quantities=[{...quantity('participants',null,'people','c1'),kind:'reference',source:{...source,target}}];
  const item=await evaluateSolutionCandidate(r,c,[]);
  if([null,cohort,'c1'].includes(target)){assert.deepEqual(item.blocking,[]);assert.equal(item.result.uniqueParticipants,null);assert.ok(item.draft.inputs.groups.some(g=>g.count.value===10&&g.count.kind==='illustrative'));}
  else{assert.match(item.blocking.join(' '),/actual participant group or activity/);assert.equal(item.draft,null);}
 }
 r.catalog.plans[0].draft.inputs.groups.push({...structuredClone(r.catalog.plans[0].draft.inputs.groups[0]),id:'second-cohort'});
 const ambiguous=based();ambiguous.quantities=[{...quantity('participants',null,'people','c1'),kind:'reference',source:{...source,target:null}}];
 const blocked=await evaluateSolutionCandidate(r,ambiguous,[]);assert.match(blocked.blocking.join(' '),/actual participant group or activity/);assert.equal(blocked.draft,null);
});
