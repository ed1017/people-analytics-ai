import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pin,limits,cases,digest,verifyPinnedSource,preflight,maximumExposure,receiptJournal,readJournal,createSmokeGuard} from './helpers/swp-semantic-smoke-guards.mjs';
const sha='a'.repeat(64);
const config=()=>({source:pin.source,manifest:pin.manifest,runtime:pin.runtime,sourceVerified:true,consumerSerializerVerified:true,serializerReceiptSha256:sha,tokenizerVerified:true,tokenizerReceiptSha256:sha,inputTokenCaps:{home:10000,demand:20000,other:15000},mediumProfile:'medium-acceptance-v1',mediumModel:'gpt-6.1-sol',testedConfigReceiptSha256:sha,transportVerified:true,transportReceiptSha256:sha,syntheticSourcesOnly:true,pricingReceiptSha256:sha,rates:{home:{input:1,output:2},demand:{input:3,output:4},other:{input:1,output:2}}});
const context=(id,history=[])=>{const c=cases.find(c=>c.id===id);return {route:c.route,mode:c.mode,origin:'fictional-authored-input',history,syntheticHistory:id==='home-window'};};
function harness(overrides={}){const rows=[];let time=0;return {rows,advance:n=>time+=n,guard:createSmokeGuard({config:config(),now:()=>time,record:row=>{rows.push(row);return {durable:true};},...overrides})};}
function envelope(id,extra={}){
 const c=cases.find(c=>c.id===id),payload={model:c.model,...(c.reasoning?{reasoning:{effort:c.reasoning}}:{}),instructions:'Synthetic fixture instructions; not generated advice.',input:[{role:'user',content:'Fictional question'}],tools:[],text:{format:{type:'json_schema'}},tool_choice:'none',parallel_tool_calls:false,max_output_tokens:c.maxOutput,...extra},wireBytes=Buffer.from(JSON.stringify(payload));
 return {payload,wireBytes,measurement:{payloadSha256:digest(wireBytes),inputBytes:Buffer.byteLength(JSON.stringify(payload.input)),inputTokens:100,tokenizerReceiptSha256:sha,composedContractSha256:digest({instructions:payload.instructions,tools:payload.tools,format:payload.text.format}),compositionVerificationReceiptSha256:sha}};
}
const completed=(answer='Actual preceding reply bytes — fictional test completion',toolCalls=[])=>({status:'completed',usage:{inputTokens:100,outputTokens:50},answer,toolCalls,items:[]});
test('published original closure stays pinned and smoke budgets do not import v5 allowances',()=>{
 const source=verifyPinnedSource(process.cwd());assert.equal(source.executionAuthorized,false);assert.equal(source.deploymentOverlay,true);assert.equal(source.supportBranch,'codex/swp-semantic-smoke-offline-guards-20261009');
 assert.equal(limits.generations,9);assert.equal(limits.tools,3);assert.equal(limits.countCalls,0);assert.equal(limits.reservedMicrousd,0);assert.ok(limits.payloadBytes>143568);
});
test('missing tokenizer, complete serializer, source, model and transport remain blockers; never arms',()=>{
 assert.equal(preflight({}).requirementsSatisfied,false);assert.ok(preflight({}).blockers.includes('tokenizer_and_complete_input_count_uncertainty'));
 assert.equal(preflight(config()).executionAuthorized,false);
 const {guard}=harness({config:{...config(),tokenizerVerified:false}});assert.throws(()=>guard.beginRequest('home-opener',context('home-opener')),/preflight_blocked/);
});
test('complete UTF8 wire bytes, measured input and hash-bound tokens are guarded before intent',()=>{
 const {guard}=harness();guard.beginRequest('home-opener',context('home-opener'));
 const changed=envelope('home-opener');changed.wireBytes=Buffer.from('{}');assert.throws(()=>guard.beforeGeneration('home-opener',changed),/serializer_mismatch/);
 assert.throws(()=>guard.beforeGeneration('home-opener',envelope('home-opener',{instructions:'x'.repeat(192000)})),/payload_limit/);
 assert.throws(()=>guard.beforeGeneration('home-opener',envelope('home-opener',{input:[{role:'user',content:'é'.repeat(60000)}]})),/measured_input_limit/);
 const unknown=envelope('home-opener');unknown.measurement.inputTokens=10001;assert.throws(()=>guard.beforeGeneration('home-opener',unknown),/token_measurement/);
 assert.equal(guard.snapshot().generations,0);
});
test('mode/model/output/schema/tool pins reject incompatible or forbidden request surfaces',()=>{
 const {guard}=harness();assert.throws(()=>guard.beginRequest('home-opener',{...context('home-opener'),mode:'business-swp-demand-v1'}),/mode_or_history/);
 guard.beginRequest('home-opener',context('home-opener'));
 for(const extra of [{model:'gpt-6.1-sol'},{max_output_tokens:5000},{reasoning:{effort:'medium'}},{parallel_tool_calls:true},{tool_choice:'auto'}])assert.throws(()=>guard.beforeGeneration('home-opener',envelope('home-opener',extra)));
 const h=harness();h.guard.beginRequest('demand-popup',context('demand-popup'));assert.throws(()=>h.guard.beforeGeneration('demand-popup',envelope('demand-popup',{tools:[{name:'propose_goal_progress'}]})),/forbidden/);
});
test('both must use byte-exact preceding completed reply; fictional synthetic history is labeled',()=>{
 const {guard}=harness();assert.throws(()=>guard.beginRequest('home-both',context('home-both')),/actual_previous_reply/);
 guard.beginRequest('home-opener',context('home-opener'));const {key}=guard.beforeGeneration('home-opener',envelope('home-opener'));const answer='Keep punctuation and exact prior answer.';guard.finishGeneration(key,completed(answer));
 assert.throws(()=>guard.beginRequest('home-both',context('home-both',[{role:'assistant',text:answer+' ',origin:'observed-model-reply'}])),/actual_previous_reply/);
 guard.beginRequest('home-both',context('home-both',[{role:'assistant',text:answer,origin:'observed-model-reply'}]));
 assert.throws(()=>guard.beginRequest('home-window',{...context('home-window',[{role:'assistant',text:'Fictional filler',origin:'synthetic-boundary-history'}]),syntheticHistory:false}),/must_be_labeled/);
});
test('nine generations and three tools are separate hard ceilings; no repeated logical requests',()=>{
 const {guard}=harness();let prior;
 for(const c of cases){guard.beginRequest(c.id,context(c.id,c.id==='home-both'?[{role:'assistant',text:prior,origin:'observed-model-reply'}]:[]));
  for(let round=0;round<c.maxGenerations;round++){
   const first=c.maxGenerations===2&&round===0,call=guard.beforeGeneration(c.id,envelope(c.id,{tool_choice:first?'auto':'none'}));
   guard.finishGeneration(call.key,completed('Retained synthetic answer',first?[{name:'read_clock',arguments:'{}'}]:[]));
  }prior='Retained synthetic answer';
 }
 assert.equal(guard.snapshot().generations,9);assert.equal(guard.snapshot().tools,3);assert.throws(()=>guard.beginRequest('home-opener',context('home-opener')),/retry_limit/);
 assert.throws(()=>guard.beforeGeneration('solution-other',envelope('solution-other')),/request_not_ready/);
});
test('per-request tool excess, final-round calls and timeout retain ambiguous exposure and stop',()=>{
 for(const outcome of [completed('reply',[{name:'read_clock',arguments:'{}'},{name:'read_evidence',arguments:'{}'}]),{status:'timeout'},completed('reply',[{name:'save_plan',arguments:'{}'}]),{...completed(),usage:null}]){
  const {guard}=harness();guard.beginRequest('demand-popup',context('demand-popup'));const call=guard.beforeGeneration('demand-popup',envelope('demand-popup'));guard.finishGeneration(call.key,outcome);assert.equal(guard.snapshot().halted,true);assert.equal(guard.snapshot().pendingExposure.length,1);
  assert.throws(()=>guard.beforeGeneration('demand-popup',envelope('demand-popup')),/halted/);
 }
});
test('deadline and recorder failures block further attempts, including late completed replies',()=>{
 const h=harness();h.guard.beginRequest('home-opener',context('home-opener'));h.advance(90000);assert.throws(()=>h.guard.beforeGeneration('home-opener',envelope('home-opener')),/deadline/);
 const b=harness();b.advance(300000);assert.throws(()=>b.guard.beginRequest('home-opener',context('home-opener')),/batch_deadline/);
 const late=harness();late.guard.beginRequest('home-opener',context('home-opener'));const call=late.guard.beforeGeneration('home-opener',envelope('home-opener'));late.advance(30000);late.guard.finishGeneration(call.key,completed());assert.equal(late.guard.snapshot().pendingExposure[0].status,'ambiguous');
 let writes=0;const broken=harness({record:()=>{if(++writes>1)throw Error('disk failure');return {};}});broken.guard.beginRequest('home-opener',context('home-opener'));assert.throws(()=>broken.guard.beforeGeneration('home-opener',envelope('home-opener')),/disk failure/);assert.equal(broken.guard.snapshot().halted,true);assert.equal(broken.guard.snapshot().pendingExposure.length,1);
});
test('bounded receipt transport durably records pending intent; directory cannot be reused',()=>{
 const parent=mkdtempSync(join(tmpdir(),'semantic-guard-test-')),directory=join(parent,'fresh'),record=receiptJournal(directory),{guard}=harness({record});
 guard.beginRequest('home-opener',context('home-opener'));guard.beforeGeneration('home-opener',envelope('home-opener'));
 const rows=readJournal(directory);assert.equal(rows[1].phase,'attempt-intent');assert.equal(rows[1].status,'pending');assert.equal(rows[1].exposure,'retain-full-attempt-envelope-until-durable-reconciliation');assert.throws(()=>receiptJournal(directory),/EEXIST/);
});
test('failure recording a received completion keeps full ambiguous exposure and forbids reuse',()=>{
 let writes=0;const h=harness({record:()=>{if(++writes===3)throw Error('completion fsync failed');return {};}});
 h.guard.beginRequest('home-opener',context('home-opener'));const attempt=h.guard.beforeGeneration('home-opener',envelope('home-opener'));
 assert.throws(()=>h.guard.finishGeneration(attempt.key,completed()),/fsync/);
 assert.equal(h.guard.snapshot().pendingExposure[0].status,'ambiguous');assert.equal(h.guard.snapshot().halted,true);
});
test('maximum exposure uses separate actual model rates without counting allowance or reservation',()=>{
 assert.throws(()=>maximumExposure({}),/unverified/);
 const result=maximumExposure({homeInputTokens:100,demandInputTokens:200,otherInputTokens:300,rates:{home:{input:1,output:2},demand:{input:3,output:4},other:{input:5,output:6}}});
 assert.equal(result.maximumMicrousd,3*(100+8000)+4*(600+20000)+2*(1500+30000));assert.equal(result.countCalls,0);assert.equal(result.reservedMicrousd,0);assert.equal(result.fitsUnallocatedHeadroom,true);
 const c=config();c.rates.demand.input=100000;assert.ok(preflight(c).blockers.includes('reviewed_pricing_or_retained_headroom'));
 assert.throws(()=>maximumExposure({homeInputTokens:1e15,demandInputTokens:1e15,otherInputTokens:1e15,rates:c.rates}),/overflow/);
});
