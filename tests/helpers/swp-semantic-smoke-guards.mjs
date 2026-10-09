/** Offline support only. No provider SDK, network transport, execution entry
 * point or reservation. A future authorized consumer must wire these guards. */
import {createHash} from 'node:crypto';
import {readFileSync,openSync,writeFileSync,fsyncSync,closeSync,mkdirSync,readdirSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {encodeReceipt,decodeReceipt} from './swp-preview-receipt-log.mjs';

export const pin=Object.freeze({source:'02ddda844bcd4470a9dac9c015ed56b519ae6d68',manifest:'c4b66bf45f682c6e5fdddc621950d79b88f4756dbd5fc028e1fb49cc77c0e45f',runtime:'9afb384afb65f6bbdce4e36af3648842d33335bd4a5caeef13c7533c8aa737b3'});
export const supportBranch='codex/swp-semantic-smoke-offline-guards-20261009';
export const limits=Object.freeze({requests:6,generations:9,tools:3,countCalls:0,retries:0,payloadBytes:192000,inputBytes:120000,callMs:30000,requestMs:90000,batchMs:300000,priorMicrousd:18669877,totalMicrousd:50000000,reservedMicrousd:0});
export const cases=Object.freeze([
 {id:'home-opener',route:'/api/chat',mode:'ordinary-home',model:'gpt-5.6-luna',reasoning:null,maxGenerations:1,maxTools:0,maxOutput:4000},
 {id:'home-both',route:'/api/chat',mode:'ordinary-home',model:'gpt-5.6-luna',reasoning:null,maxGenerations:1,maxTools:0,maxOutput:4000},
 {id:'home-window',route:'/api/chat',mode:'ordinary-home',model:'gpt-5.6-luna',reasoning:null,maxGenerations:1,maxTools:0,maxOutput:4000},
 {id:'demand-no-review',route:'/api/home-solution-conversation',mode:'business-swp-demand-v1',model:'gpt-6.1-sol',reasoning:'medium',maxGenerations:2,maxTools:1,maxOutput:5000},
 {id:'demand-popup',route:'/api/home-solution-conversation',mode:'business-swp-demand-v1',model:'gpt-6.1-sol',reasoning:'medium',maxGenerations:2,maxTools:1,maxOutput:5000},
 {id:'solution-other',route:'/api/home-solution-conversation',mode:'ordinary-solution',model:'gpt-5.6-luna',reasoning:null,maxGenerations:2,maxTools:1,maxOutput:5000},
].map(Object.freeze));
const allowedTools=new Set(['read_clock','read_evidence','review_scoped_service_demand','revise_scoped_service_demand']);
export const digest=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const fail=code=>{throw Error(code);},hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const integer=value=>Number.isSafeInteger(value)&&value>=0;
function jsonOnly(value){if(value===null||typeof value==='string'||typeof value==='boolean')return;if(typeof value==='number'&&Number.isFinite(value))return;if(Array.isArray(value)){value.forEach(jsonOnly);return;}if(value&&Object.getPrototypeOf(value)===Object.prototype){Object.values(value).forEach(jsonOnly);return;}fail('non_json_payload');}

/** Verify the original published closure; new test-support files are outside it.
 * Never regenerate the frozen integrated manifest to bless support changes. */
export function verifyPinnedSource(root){
 const bytes=readFileSync(join(root,'tests/fixtures/swp-fluid-source-manifest.json'));
 if(digest(bytes)!==pin.manifest)fail('manifest_pin');const m=JSON.parse(bytes);
 if(m.runtimeSha256!==pin.runtime||m.paidExecutionAuthorized!==false)fail('runtime_pin');
 let deploymentOverlay=false;
 for(const [path,sha] of Object.entries({...m.runtimeFiles,...m.supportFiles})){
  if(!lstatSync(join(root,path)).isFile())fail('source_changed:'+path);
  const bytes=readFileSync(join(root,path));if(digest(bytes)===sha)continue;
  if(path!=='vercel.json')fail('source_changed:'+path);
  const config=JSON.parse(bytes),enabled=config.git?.deploymentEnabled;
  if(Object.keys(config).sort().join(',')!=='$schema,git'||config.$schema!=='https://openapi.vercel.sh/vercel.json'||Object.keys(config.git).join(',')!=='deploymentEnabled'||Object.keys(enabled??{}).sort().join(',')!==[m.publication.branch,supportBranch].sort().join(',')||enabled[m.publication.branch]!==false||enabled[supportBranch]!==false)fail('deployment_overlay_changed');
  deploymentOverlay=true;
 }
 const visit=dir=>readdirSync(join(root,dir),{withFileTypes:true}).flatMap(entry=>{const path=dir+'/'+entry.name;if(entry.isDirectory())return visit(path);if(!entry.isFile())fail('unexpected_runtime_entry');return [path];});
 const found=[...Object.keys(m.runtimeFiles).filter(path=>!path.includes('/')),...['app','components','lib','public'].flatMap(visit)].sort();
 if(JSON.stringify(found)!==JSON.stringify(Object.keys(m.runtimeFiles).sort()))fail('runtime_membership_changed');
 return {baseSource:pin.source,manifest:pin.manifest,baseRuntime:pin.runtime,deploymentOverlay,supportBranch,executionAuthorized:false};
}

/** Rates are consumer-supplied reviewed USD/million, never guessed prices.
 * Token maxima must cover the complete composed input and its tokenizer. */
export function maximumExposure({homeInputTokens,demandInputTokens,otherInputTokens,rates}){
 if(![homeInputTokens,demandInputTokens,otherInputTokens].every(n=>integer(n)&&n>0)||!rates||!['home','demand','other'].every(k=>rates[k]&&['input','output'].every(f=>typeof rates[k][f]==='number'&&Number.isFinite(rates[k][f])&&rates[k][f]>0)))fail('unverified_token_or_price_envelope');
 const micro=(n,t,o,r)=>n*Math.ceil(t*r.input+o*r.output);
 const maximumMicrousd=micro(3,homeInputTokens,4000,rates.home)+micro(4,demandInputTokens,5000,rates.demand)+micro(2,otherInputTokens,5000,rates.other);
 if(!integer(maximumMicrousd))fail('exposure_overflow');
 return {maximumMicrousd,fitsUnallocatedHeadroom:maximumMicrousd<=limits.totalMicrousd-limits.priorMicrousd,countCalls:0,reservedMicrousd:0};
}

export function preflight(config){
 const blockers=[];
 if(config?.source!==pin.source||config?.manifest!==pin.manifest||config?.runtime!==pin.runtime||config?.sourceVerified!==true)blockers.push('source_pin_verification');
 if(config?.consumerSerializerVerified!==true||!hex(config?.serializerReceiptSha256))blockers.push('complete_consumer_serializer_verification');
 if(config?.tokenizerVerified!==true||!hex(config?.tokenizerReceiptSha256)||!config?.inputTokenCaps||!['home','demand','other'].every(k=>integer(config.inputTokenCaps[k])&&config.inputTokenCaps[k]>0))blockers.push('tokenizer_and_complete_input_count_uncertainty');
 if(config?.mediumProfile!=='medium-acceptance-v1'||config?.mediumModel!=='gpt-6.1-sol'||!hex(config?.testedConfigReceiptSha256))blockers.push('demand_model_profile_verification');
 if(config?.transportVerified!==true||!hex(config?.transportReceiptSha256))blockers.push('no_retry_transport_and_deadline_verification');
 if(config?.syntheticSourcesOnly!==true)blockers.push('synthetic_source_read_binding');
 try{const exposure=maximumExposure({homeInputTokens:config?.inputTokenCaps?.home,demandInputTokens:config?.inputTokenCaps?.demand,otherInputTokens:config?.inputTokenCaps?.other,rates:config?.rates});if(!hex(config?.pricingReceiptSha256)||!exposure.fitsUnallocatedHeadroom)blockers.push('reviewed_pricing_or_retained_headroom');}
 catch{blockers.push('reviewed_pricing_or_retained_headroom');}
 return {blockers,requirementsSatisfied:blockers.length===0,executionAuthorized:false,reservedMicrousd:0};
}

/** Fresh exclusive directory; existing run dirs cannot be resumed as a new run.
 * Receipts reuse the bounded ASCII chunk transport, fsynced before return. */
export function receiptJournal(directory){
 mkdirSync(directory,{mode:0o700});let sequence=0;
 return record=>{
  const id='semantic-'+String(++sequence).padStart(4,'0'),lines=encodeReceipt(id,record),fd=openSync(join(directory,id+'.receipt'),'wx',0o600);
  try{writeFileSync(fd,lines.join('\n')+'\n');fsyncSync(fd);}finally{closeSync(fd);}
  const dir=openSync(directory,'r');try{fsyncSync(dir);}finally{closeSync(dir);}
  return {id,sha256:digest(record)};
 };
}
export function readJournal(directory){return readdirSync(directory).filter(p=>p.endsWith('.receipt')).sort().map(p=>decodeReceipt(readFileSync(join(directory,p),'utf8').trimEnd().split('\n')).receipt);}

/** This is an offline accounting machine, not permission to send. Attempts are
 * conservatively retained even if recording/transport/outcome becomes ambiguous. */
export function createSmokeGuard({config,record,now=Date.now}){
 if(typeof record!=='function')fail('durable_recorder_required');
 const start=now(),binding=structuredClone(config),requests=new Map(),attempts=new Map();let generations=0,tools=0,halted=false,sequence=0;
 const fresh=()=>{if(halted)fail('run_halted');if(now()-start>=limits.batchMs){halted=true;fail('batch_deadline');}};
 const emit=value=>{try{const receipt=record({...value,source:pin.source,executionAuthorized:false,reservedMicrousd:0});if(!receipt||typeof receipt.then==='function')fail('synchronous_durable_receipt_required');return receipt;}catch(error){halted=true;throw error;}};
 function beginRequest(id,context){
  fresh();if(preflight(binding).blockers.length)fail('preflight_blocked');
  const spec=cases.find(row=>row.id===id);if(!spec||requests.has(id)||requests.size>=6)fail('request_or_retry_limit');
  if(context.route!==spec.route||context.mode!==spec.mode||context.origin!=='fictional-authored-input'||!Array.isArray(context.history)||context.history.some(turn=>!['observed-model-reply','fictional-user-input','synthetic-boundary-history'].includes(turn.origin)))fail('request_mode_or_history_origin');
  if(id==='home-both'){
   const prior=requests.get('home-opener')?.reply,turn=context.history.at(-1);
   if(!prior||turn?.role!=='assistant'||turn.text!==prior||turn.origin!=='observed-model-reply')fail('actual_previous_reply_required');
  }
  if(id==='home-window'&&context.syntheticHistory!==true&&context.history.some(t=>t.origin==='synthetic-boundary-history'))fail('synthetic_history_must_be_labeled');
  const state={spec,start:now(),generations:0,tools:0,reply:null,finished:false,context:structuredClone(context)};requests.set(id,state);
  emit({phase:'request-start',id,route:spec.route,mode:spec.mode,historySha256:digest(context.history),origin:context.origin,syntheticHistory:context.syntheticHistory===true,liveContinuityProven:false});
 }
 function beforeGeneration(id,{payload,wireBytes,measurement}){
  fresh();const state=requests.get(id);if(!state||state.finished||[...attempts.values()].some(a=>a.status==='pending'))fail('request_not_ready');
  if(now()-state.start>=limits.requestMs){halted=true;fail('request_deadline');}
  if(generations>=9||state.generations>=state.spec.maxGenerations)fail('generation_limit');
  jsonOnly(payload);const serialized=Buffer.from(JSON.stringify(payload),'utf8');
  if(Object.keys(payload).some(k=>!['model','reasoning','instructions','input','tools','text','tool_choice','parallel_tool_calls','max_output_tokens'].includes(k)))fail('unapproved_sdk_body_field');
  if(!Buffer.isBuffer(wireBytes)||!serialized.equals(wireBytes)||wireBytes.length>limits.payloadBytes)fail('complete_sdk_payload_limit_or_serializer_mismatch');
  const payloadSha256=digest(wireBytes),inputBytes=Buffer.byteLength(JSON.stringify(payload.input));
  const kind=state.spec.mode==='ordinary-home'?'home':state.spec.mode==='ordinary-solution'?'other':'demand';
  if(!Array.isArray(payload.input)||inputBytes>limits.inputBytes)fail('measured_input_limit');
  if(measurement?.payloadSha256!==payloadSha256||measurement?.tokenizerReceiptSha256!==binding.tokenizerReceiptSha256||measurement?.inputBytes!==inputBytes||!integer(measurement?.inputTokens)||measurement.inputTokens>binding.inputTokenCaps[kind])fail('complete_input_token_measurement_required');
  if(payload.model!==state.spec.model||(payload.reasoning?.effort??null)!==state.spec.reasoning||payload.max_output_tokens!==state.spec.maxOutput||!['none','auto'].includes(payload.tool_choice)||payload.parallel_tool_calls!==false||typeof payload.instructions!=='string'||!payload.instructions||!payload.text?.format)fail('sdk_model_or_contract_pin');
  if(state.spec.reasoning===null&&payload.reasoning!==undefined)fail('unexpected_reasoning_override');
  if(measurement?.composedContractSha256!==digest({instructions:payload.instructions,tools:payload.tools??[],format:payload.text.format})||!hex(measurement?.compositionVerificationReceiptSha256))fail('composed_contract_verification');
  if(state.spec.mode==='ordinary-home'&&(payload.tool_choice!=='none'||payload.tools?.length))fail('home_tools_forbidden');
  if(payload.tools?.some(t=>!allowedTools.has(t.name))||state.spec.mode==='ordinary-solution'&&payload.tools?.some(t=>!['read_clock','read_evidence'].includes(t.name)))fail('tool_surface_forbidden');
  if(state.generations+1===state.spec.maxGenerations&&payload.tool_choice!=='none')fail('final_round_must_disable_tools');
  const key='attempt-'+String(++sequence).padStart(3,'0');generations++;state.generations++;
  const attempt={key,id,status:'pending',inputTokens:measurement.inputTokens,maxOutput:state.spec.maxOutput,start:now(),payloadSha256};attempts.set(key,attempt);
  emit({phase:'attempt-intent',...attempt,generations,tools,exposure:'retain-full-attempt-envelope-until-durable-reconciliation',options:{maxRetries:0,timeout:Math.min(limits.callMs,limits.requestMs-(now()-state.start),limits.batchMs-(now()-start))}});
  return Object.freeze({key,payloadSha256,executionAuthorized:false});
 }
 function finishGeneration(key,outcome){
  fresh();const attempt=attempts.get(key);if(!attempt||attempt.status!=='pending')fail('attempt_already_consumed');
  const state=requests.get(attempt.id),late=now()-attempt.start>=limits.callMs||now()-state.start>=limits.requestMs;
  if(outcome?.status!=='completed'||late){attempt.status='ambiguous';halted=true;emit({phase:'attempt-ambiguous',key,retainMaximum:true});return;}
  if(!integer(outcome.usage?.inputTokens)||!integer(outcome.usage?.outputTokens)||outcome.usage.inputTokens>attempt.inputTokens||outcome.usage.outputTokens>attempt.maxOutput||!Array.isArray(outcome.items)||JSON.stringify(outcome.items).length>70000){attempt.status='ambiguous';halted=true;emit({phase:'attempt-ambiguous',key,reason:'invalid_or_excess_usage_or_output',retainMaximum:true});return;}
  const calls=outcome.toolCalls??[];
  if(!Array.isArray(calls)||calls.length>state.spec.maxTools-state.tools||calls.length>3-tools||calls.some(c=>!allowedTools.has(c.name)||typeof c.arguments!=='string'||c.arguments.length>32000)||state.spec.mode==='ordinary-solution'&&calls.some(c=>!['read_clock','read_evidence'].includes(c.name))||state.generations===state.spec.maxGenerations&&calls.length){attempt.status='ambiguous';halted=true;emit({phase:'attempt-ambiguous',key,reason:'tool_limit_or_surface',retainMaximum:true});return;}
  if(!calls.length&&(typeof outcome.answer!=='string'||!outcome.answer.trim()||outcome.answer.length>20000)){attempt.status='ambiguous';halted=true;emit({phase:'attempt-ambiguous',key,reason:'missing_final_answer',retainMaximum:true});return;}
  tools+=calls.length;state.tools+=calls.length;attempt.status='completed';
  if(!calls.length){state.reply=outcome.answer;state.finished=true;}
  try{emit({phase:'attempt-completed',key,usage:outcome.usage,tools,toolCalls:calls.map(c=>({name:c.name,argumentsSha256:digest(c.arguments)})),...(state.finished?{answer:state.reply,answerSha256:digest(state.reply)}:{})});}
  catch(error){attempt.status='ambiguous';state.reply=null;state.finished=false;throw error;}
 }
 return {beginRequest,beforeGeneration,finishGeneration,snapshot:()=>({generations,tools,countCalls:0,halted,attempts:structuredClone([...attempts.values()]),pendingExposure:[...attempts.values()].filter(a=>a.status!=='completed'),executionAuthorized:false,reservedMicrousd:0})};
}
