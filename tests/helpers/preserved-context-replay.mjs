import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertSolutionParticipationProvenance} from '../../lib/home-solution-conversation.ts';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {selectFictionalCandidate} from './solution-preview-acceptance.mjs';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/preserved-context-growth.json',import.meta.url),'utf8'));
const size=x=>Buffer.byteLength(JSON.stringify(x));
function assertMeaning(actual,expected,request){
 // The original payload is immutable evidence of the old provenance bug. Reevaluate
 // its exact candidate arguments, while checking the new contract instead of blessing old flags.
 for(const key of ['id','candidate','binding','constraints'])assert.deepEqual(actual[key],expected[key],key);
 assert.deepEqual(actual.blocking,expected.blocking);
 if(actual.draft)assertSolutionParticipationProvenance(request,actual.candidate,actual.draft);
 assert.equal(actual.sourceKeys,undefined);
}
export async function replayPreserved(){
 let previous=null,networkAttempts=0;const report=[],rejectedEvaluations=new Set();const oldFetch=globalThis.fetch;
 globalThis.fetch=()=>{networkAttempts++;throw Error('Network forbidden in offline replay');};
 try{for(let n=0;n<3;n++){
  const saved=fixture.turns[n],request=structuredClone(saved.request);let rounds=0,continuation=false;const sizes=[];
  // The citation preflight now refuses these arguments before creating working state.
  // Preserve the original fixture; explicitly omit only evaluations rejected during this replay.
  request.state.working=request.state.working.filter(item=>!rejectedEvaluations.has(JSON.stringify([item.id,item.revision])));
  if(previous){request.state=structuredClone(previous.state);request.catalog=structuredClone(previous.catalog);request.goal=structuredClone(previous.goal);}
  const before=structuredClone(request);
  const runtime={loadProjection:async()=>{throw Error('No live data loader in preserved replay');},complete:async input=>{
   sizes.push(size(input));assert.ok(size(input)<=120000);
   for(const row of input.filter(i=>i.type==='function_call_output')){const expected=saved.toolResults.find(t=>t.callId===row.call_id)?.result;if(expected){const actual=JSON.parse(row.output);
    if(actual.code==='invalid_evidence_identifiers'){
     assert.equal(expected.draft,null);assert.deepEqual(expected.blocking,['A new/adapted activity cites unavailable current evidence.']);
     rejectedEvaluations.add(JSON.stringify([expected.id,expected.revision]));
    }else if(expected.candidate)assertMeaning(actual,expected,request);else assert.deepEqual(actual,expected);
   }}
   const response=saved.responses[rounds++];
   if(!response){assert.equal(n,2);const actual=JSON.parse(input.at(-1).output);assertMeaning(actual,fixture.expectedThirdEvaluation,request);assert.deepEqual(actual.blocking,[]);continuation=true;throw Error('OFFLINE_CONTINUATION_REACHED_NO_MODEL_ANSWER');}
   return {items:response.items,calls:response.items.filter(i=>i.type==='function_call').map(i=>({id:i.call_id,name:i.name,arguments:i.arguments})),text:response.text,completed:true};
  }};
  if(n===2)await assert.rejects(converseSolutions(request,runtime,new AbortController().signal),/OFFLINE_CONTINUATION_REACHED_NO_MODEL_ANSWER/);
  else{const reply=await converseSolutions(request,runtime,new AbortController().signal);const expectedFinal=JSON.parse(saved.responses.at(-1).text);assert.equal(reply.answer,expectedFinal.answer);previous=n===0?await selectFictionalCandidate(request,reply):{state:reply.state,catalog:request.catalog,goal:request.goal};}
  assert.deepEqual(request,before);report.push({turn:saved.id,preservedResponses:saved.responses.length,modelInputBytes:sizes,continuationReached:continuation});
 }}finally{globalThis.fetch=oldFetch;}
 assert.equal(networkAttempts,0);return {applicationPayloadReplay:true,provenanceMigration:"Exact preserved provider arguments replayed; subsequent state/catalog replaced by freshly evaluated outputs. Original fixture kept unchanged. Old confirmation flags are not accepted.",thirdFinalAnswerNotInvented:true,rejectedArgumentEvaluationsOmitted:[...rejectedEvaluations].map(JSON.parse),networkAttempts,turns:report};
}
