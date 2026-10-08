import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {selectFictionalCandidate} from './solution-preview-acceptance.mjs';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/preserved-context-growth.json',import.meta.url),'utf8'));
const size=x=>Buffer.byteLength(JSON.stringify(x));
const resultView=result=>result&&Object.fromEntries(Object.entries(result).filter(([key])=>!['inputKey','bindingKey','signature'].includes(key)));
const draftView=draft=>draft&&Object.fromEntries(Object.entries(draft).filter(([key])=>key!=='signature'));
function assertMeaning(actual,expected){
 for(const key of Object.keys(expected))if(!['draft','result','sourceKeys'].includes(key))assert.deepEqual(actual[key],expected[key],key);
 assert.deepEqual(actual.draft,draftView(expected.draft));assert.deepEqual(actual.result,resultView(expected.result));
 assert.equal(actual.sourceKeys,undefined);
}
export async function replayPreserved(){
 let previous=null,networkAttempts=0;const report=[];const oldFetch=globalThis.fetch;
 globalThis.fetch=()=>{networkAttempts++;throw Error('Network forbidden in offline replay');};
 try{for(let n=0;n<3;n++){
  const saved=fixture.turns[n],request=structuredClone(saved.request),before=structuredClone(request);let rounds=0,continuation=false;const sizes=[];
  if(previous){assert.deepEqual(request.state,previous.state);assert.deepEqual(request.catalog,previous.catalog);assert.deepEqual(request.goal,previous.goal);}
  const runtime={loadProjection:async()=>{throw Error('No live data loader in preserved replay');},complete:async input=>{
   sizes.push(size(input));assert.ok(size(input)<=120000);
   for(const row of input.filter(i=>i.type==='function_call_output')){const expected=saved.toolResults.find(t=>t.callId===row.call_id)?.result;if(expected){const actual=JSON.parse(row.output);if(expected.candidate)assertMeaning(actual,expected);else assert.deepEqual(actual,expected);}}
   const response=saved.responses[rounds++];
   if(!response){assert.equal(n,2);const actual=JSON.parse(input.at(-1).output);assertMeaning(actual,fixture.expectedThirdEvaluation);assert.deepEqual(actual.blocking,[]);continuation=true;throw Error('OFFLINE_CONTINUATION_REACHED_NO_MODEL_ANSWER');}
   return {items:response.items,calls:response.items.filter(i=>i.type==='function_call').map(i=>({id:i.call_id,name:i.name,arguments:i.arguments})),text:response.text,completed:true};
  }};
  if(n===2)await assert.rejects(converseSolutions(request,runtime,new AbortController().signal),/OFFLINE_CONTINUATION_REACHED_NO_MODEL_ANSWER/);
  else{const reply=await converseSolutions(request,runtime,new AbortController().signal);const expectedFinal=JSON.parse(saved.responses.at(-1).text);assert.equal(reply.answer,expectedFinal.answer);previous=n===0?await selectFictionalCandidate(request,reply):{state:reply.state,catalog:request.catalog,goal:request.goal};}
  assert.deepEqual(request,before);report.push({turn:saved.id,preservedResponses:saved.responses.length,modelInputBytes:sizes,continuationReached:continuation});
 }}finally{globalThis.fetch=oldFetch;}
 assert.equal(networkAttempts,0);return {applicationPayloadReplay:true,thirdFinalAnswerNotInvented:true,networkAttempts,turns:report};
}
