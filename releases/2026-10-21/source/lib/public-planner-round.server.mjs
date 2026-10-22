/** Disabled public planner boundary. Every provider dispatch consumes an atomic
 * reservation from the existing lifetime ledger, including failed attempts. */
import {createHash} from 'node:crypto';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {boundedJson} from './public-qa-stream.server.mjs';
import {awaitPublicQaBinding} from './public-qa-application.server.mjs';
import {normalizePublicPlannerReceipt,PUBLIC_PLANNER_PROVIDER_REQUEST_ID} from './public-planner-receipt.server.mjs';

/** Safe admission category only; never includes ledger/provider internals. */
export class PublicPlannerAdmissionError extends Error { constructor(){super('planner_admission_unavailable');this.name='PublicPlannerAdmissionError';} }
export const PUBLIC_PLANNER_ENABLED=false;
export const PUBLIC_PLANNER_LEDGER='public-9037-ai-initial-v1';
export const PUBLIC_PLANNER_CAP_MICRO_USD=50000000;
export const PUBLIC_PLANNER_PROVIDER_URL='https://api.openai.com/v1/responses';
export const PUBLIC_PLANNER_ROUTE_LIMITS=Object.freeze({
 'home-solution':Object.freeze({model:'gpt-6.1-sol',rounds:4,outputTokens:4000}),
 chat:Object.freeze({model:'gpt-5.6-luna',rounds:6,outputTokens:10000}),
 plan:Object.freeze({model:'gpt-5.6-luna',rounds:1,outputTokens:1600}),
 intake:Object.freeze({model:'gpt-5.6-luna',rounds:1,outputTokens:3000}),
 capability:Object.freeze({model:'gpt-5.6-luna',rounds:4,outputTokens:1200}),
});
const policyKeys=['id','route','model','verifiedAt','validUntil','contextTokens','maxOutputTokens','maxInputBytes','maxRounds','timeoutMs','inputMicroUsdPerMillion','outputMicroUsdPerMillion','safetyBasisPoints','reserveMicroUsd'];
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const must=(v,code)=>{if(!v)throw Error(code);};
const frozen=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(frozen);Object.freeze(v);}return v;};
function json(v,depth=0){
 if(depth>64)return false;
 if(v===null||typeof v==='string'||typeof v==='boolean')return true;
 if(typeof v==='number')return Number.isFinite(v);
 if(Array.isArray(v))return v.length<=20000&&v.every(x=>json(x,depth+1));
 return object(v)&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length<=20000&&Object.values(v).every(x=>json(x,depth+1));
}
const bytes=v=>Buffer.byteLength(JSON.stringify(v),'utf8');

/** Prices/context ceilings must be independently verified server configuration.
 * This calculation is not a price lookup, token estimate, or billing invoice.
 * Reserve the ENTIRE certified input context ceiling plus bounded output. */
export function plannerWorstChargeMicroUsd(p){
 const numerator=(BigInt(p.contextTokens)*BigInt(p.inputMicroUsdPerMillion)+BigInt(p.maxOutputTokens)*BigInt(p.outputMicroUsdPerMillion))*BigInt(p.safetyBasisPoints);
 return Number((numerator+9999999999n)/10000000000n);
}
export function readPublicPlannerPolicy(raw){
 must(exact(raw,policyKeys),'planner_policy_unconfigured');
 const limits=PUBLIC_PLANNER_ROUTE_LIMITS[raw.route];
 must(limits&&raw.model===limits.model&&/^[a-zA-Z0-9_-]{1,80}$/.test(raw.id)&&raw.contextTokens===1050000&&integer(raw.maxOutputTokens,1,limits.outputTokens)&&integer(raw.maxInputBytes,1,1500000)&&integer(raw.maxRounds,1,limits.rounds)&&integer(raw.timeoutMs,1,60000)&&integer(raw.inputMicroUsdPerMillion,1,100000000)&&integer(raw.outputMicroUsdPerMillion,1,100000000)&&integer(raw.safetyBasisPoints,10000,20000)&&integer(raw.reserveMicroUsd,1,5000000),'planner_policy_unconfigured');
 const verified=Date.parse(raw.verifiedAt),until=Date.parse(raw.validUntil);
 must(typeof raw.verifiedAt==='string'&&typeof raw.validUntil==='string'&&Number.isFinite(verified)&&Number.isFinite(until)&&until>verified&&until-verified<=86400000&&raw.reserveMicroUsd>=plannerWorstChargeMicroUsd(raw),'planner_policy_unconfigured');
 return frozen(structuredClone(raw));
}
const live=(p,now)=>Number.isFinite(now)&&now>=Date.parse(p.verifiedAt)&&now+p.timeoutMs+30000<Date.parse(p.validUntil);
function textInput(item){
 if(!object(item))return false;
 if(item.type==='function_call')return Object.keys(item).every(k=>['type','id','call_id','name','arguments','status'].includes(k))&&typeof item.call_id==='string'&&typeof item.name==='string'&&typeof item.arguments==='string';
 if(item.type==='function_call_output')return Object.keys(item).every(k=>['type','id','call_id','output','status'].includes(k))&&typeof item.call_id==='string'&&typeof item.output==='string';
 if(item.type==='reasoning')return Object.keys(item).every(k=>['type','id','encrypted_content','summary','status','content'].includes(k))&&typeof item.encrypted_content==='string'&&Array.isArray(item.summary)&&item.summary.every(x=>exact(x,['type','text'])&&x.type==='summary_text'&&typeof x.text==='string')&&(!Object.hasOwn(item,'content')||item.content===null||Array.isArray(item.content)&&item.content.every(x=>exact(x,['type','text'])&&x.type==='reasoning_text'&&typeof x.text==='string'));
 if(!['user','assistant','system','developer'].includes(item.role)||item.type!==undefined&&item.type!=='message')return false;
 if(!Object.keys(item).every(k=>['type','role','content','id','status'].includes(k)))return false;
 return typeof item.content==='string'||Array.isArray(item.content)&&item.content.every(x=>object(x)&&Object.keys(x).every(k=>['type','text','annotations','logprobs'].includes(k))&&['input_text','output_text'].includes(x.type)&&typeof x.text==='string');
}
function specification(raw,p){
 if(object(raw)&&raw.model===undefined)raw={...raw,model:p.model};
 must(json(raw)&&object(raw)&&bytes(raw)<=p.maxInputBytes,'planner_input_invalid');
 const allowed=['model','instructions','input','tools','text','tool_choice','parallel_tool_calls','max_output_tokens','store','service_tier','reasoning','include','prompt_cache_options'];
 must(Object.keys(raw).every(k=>allowed.includes(k))&&raw.model===p.model&&raw.store===false&&raw.service_tier==='default'&&typeof raw.instructions==='string'&&Array.isArray(raw.input)&&raw.input.length>0&&raw.input.length<=2000&&raw.input.every(textInput)&&integer(raw.max_output_tokens,1,p.maxOutputTokens),'planner_input_invalid');
 if(raw.reasoning!==undefined)must(exact(raw.reasoning,['effort'])&&['none','low','medium','high','xhigh'].includes(raw.reasoning.effort),'planner_input_invalid');
 if(p.route==='home-solution')must(raw.reasoning?.effort==='medium','planner_input_invalid');
 if(raw.include!==undefined)must(Array.isArray(raw.include)&&raw.include.length===1&&raw.include[0]==='reasoning.encrypted_content','planner_input_invalid');
 if(raw.prompt_cache_options!==undefined)must(exact(raw.prompt_cache_options,['mode'])&&raw.prompt_cache_options.mode==='explicit','planner_input_invalid');
 if(raw.text!==undefined)must(exact(raw.text,['format'])&&object(raw.text.format)&&['json_schema','json_object','text'].includes(raw.text.format.type),'planner_input_invalid');
 const tools=raw.tools??[];
 must(Array.isArray(tools)&&tools.length<=96&&tools.every(t=>object(t)&&t.type==='function'&&/^[a-zA-Z0-9_-]{1,80}$/.test(t.name)&&object(t.parameters)&&Object.keys(t).every(k=>['type','name','description','parameters','strict'].includes(k))&&(t.description===undefined||typeof t.description==='string')&&(t.strict===undefined||typeof t.strict==='boolean'))&&new Set(tools.map(t=>t.name)).size===tools.length,'planner_input_invalid');
 must(raw.parallel_tool_calls===undefined&&!tools.length||raw.parallel_tool_calls===false,'planner_input_invalid');
 const choice=raw.tool_choice;
 must(['none','auto','required'].includes(choice)||exact(choice,['type','name'])&&choice.type==='function'&&tools.some(t=>t.name===choice.name),'planner_input_invalid');
 must(tools.length>0||choice==='none','planner_input_invalid');
 // Explicit-only mode with no breakpoints avoids cache-write charges. All
 // locations that could contain a breakpoint are rejected by the schema above.
 return frozen({...structuredClone(raw),prompt_cache_options:{mode:'explicit'}});
}
function response(raw,p,spec){
 must(json(raw)&&bytes(raw)<=2097152&&raw.status==='completed'&&raw.model===p.model&&Array.isArray(raw.output)&&raw.output.every(x=>object(x)&&['message','reasoning','function_call'].includes(x.type)),'planner_provider_invalid');
 const usage=raw.usage;
 must(usage&&integer(usage.input_tokens,0,p.contextTokens)&&integer(usage.output_tokens,0,spec.max_output_tokens)&&usage.total_tokens===usage.input_tokens+usage.output_tokens,'planner_usage_invalid');
 return raw;
}

/** One instance per logical operation. Ports are trusted server composition,
 * never request-body options. admit MUST be the persistent atomic RPC adapter.
 * The local consumed/round state is only extra protection, never the budget.
 * No default policy, provider, ledger reader, fetch, SDK or environment lookup. */
export function createPublicPlannerRoundBoundary({enabled=PUBLIC_PLANNER_ENABLED,policy,admit,settle,provider,currentContext,now=Date.now}={}){
 let p;try{p=readPublicPlannerPolicy(policy);}catch{}
 let operation=null,lastRound=0,busy=false,closed=false;
 return Object.freeze({async complete(raw,meta){
  must(enabled===true&&p&&typeof admit==='function'&&typeof provider==='function'&&typeof currentContext==='function','planner_unavailable');
  must(meta&&meta.signal instanceof AbortSignal&&typeof meta.requestId==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(meta.requestId)&&meta.datasetToken===P.token&&typeof meta.contextId==='string'&&/^[a-f0-9]{64}$/.test(meta.contextId)&&integer(meta.round,1,p.maxRounds),'planner_request_invalid');
  must(!closed&&!busy&&meta.round===lastRound+1,'planner_round_replayed');
  const identity=JSON.stringify([meta.requestId,meta.contextId,meta.datasetToken]);
  must(operation===null||operation===identity,'planner_context_changed');
  const spec=specification(raw,p);
  must(live(p,now()),'planner_policy_expired');
  meta.signal.throwIfAborted();
  meta={signal:meta.signal,requestId:meta.requestId,contextId:meta.contextId,datasetToken:meta.datasetToken,round:meta.round};
  operation=identity;busy=true;lastRound=meta.round;
  const controller=new AbortController(),signal=AbortSignal.any([meta.signal,controller.signal]);
  let timer=setTimeout(()=>controller.abort(),p.timeoutMs);
  const check=async()=>{signal.throwIfAborted();must(live(p,now()),'planner_policy_expired');must(await currentContext(signal)===meta.contextId,'planner_context_changed');signal.throwIfAborted();};
  try{return await awaitPublicQaBinding((async()=>{
   await check();
   const reservation=frozen({requestId:'planner_'+hash([p.route,meta.requestId,meta.round]),contextId:hash([meta.contextId,spec]),policyId:p.id,reserveMicroUsd:p.reserveMicroUsd});
   const grant=await admit(reservation,signal);
   if(!(exact(grant,['granted','requestId','contextId','policyId','reserveMicroUsd','reservationId'])&&grant.granted===true&&['requestId','contextId','policyId','reserveMicroUsd'].every(k=>grant[k]===reservation[k])&&typeof grant.reservationId==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(grant.reservationId)))throw new PublicPlannerAdmissionError();
   await check();
   const output=await provider(spec,signal);
   clearTimeout(timer); // Provider deadline ends with its body; finalization has its own bound.
   // A paid completed body is accounting evidence even if its answer is later
   // rejected or the caller leaves. Settlement never retries the provider.
   const receipt=normalizePublicPlannerReceipt(output,spec,p);
   if(receipt&&typeof settle==='function'){
    const finalization=new AbortController(),settlementTimer=setTimeout(()=>finalization.abort(),5000);
    try{await awaitPublicQaBinding(Promise.resolve().then(()=>settle({requestId:reservation.requestId,contextId:reservation.contextId,policyId:reservation.policyId,receipt},finalization.signal)),finalization.signal);}
    catch{/* Unconfirmed settlement retains the durable hold; answer handling continues. */}
    finally{clearTimeout(settlementTimer);finalization.abort();}
   }
   if(!signal.aborted)timer=setTimeout(()=>controller.abort(),p.timeoutMs); // Bound the final context check too.
   await check();
   return response(output,p,spec);
  })(),signal);}catch(error){closed=true;if(error instanceof PublicPlannerAdmissionError)throw error;throw Error('planner_round_unavailable');}
  finally{clearTimeout(timer);controller.abort();busy=false;}
 }});
}

/** Existing-provider HTTP adapter; exactly one transport invocation, fixed URL,
 * no redirects/retries/fallback/key lookup. Call only behind the boundary. */
export function createPublicPlannerProvider({transport,apiKey}={}){
 return async(spec,signal)=>{
  must(typeof transport==='function'&&typeof apiKey==='string'&&apiKey.length>0&&signal instanceof AbortSignal,'planner_provider_unconfigured');
  signal.throwIfAborted();
  const r=await transport(PUBLIC_PLANNER_PROVIDER_URL,{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify(spec),signal,redirect:'error',cache:'no-store'});
  if(!r.ok){await r.body?.cancel().catch(()=>{});throw Error('planner_provider_failed');}
  const raw=await boundedJson(r.body,2097152,signal);
  // Native HTTP has no SDK convenience output_text property.
  const output={...raw,output_text:Array.isArray(raw?.output)?raw.output.filter(x=>x?.type==='message').flatMap(x=>x.content??[]).filter(x=>x?.type==='output_text').map(x=>x.text).join(''):''};
  Object.defineProperty(output,PUBLIC_PLANNER_PROVIDER_REQUEST_ID,{value:r.headers.get('x-request-id'),enumerable:false});
  return output;
 };
}

/** Readiness needs a separately approved read-only ledger port. There is no
 * existing read RPC in this patch; never reserve just to advertise readiness. */
export async function publicPlannerReadiness({enabled=false,policy,readLedgerStatus,ledgerPolicyId=policy?.id,ledgerPerCallMicroUsd=policy?.reserveMicroUsd,now=Date.now,signal=new AbortController().signal}={}){
 try{
  const p=readPublicPlannerPolicy(policy),at=now();
  if(!enabled||typeof readLedgerStatus!=='function'||!live(p,at))return false;
  const controller=new AbortController(),stopped=AbortSignal.any([signal,controller.signal]),timer=setTimeout(()=>controller.abort(),3000);
  try{
   stopped.throwIfAborted();
   const row=await awaitPublicQaBinding(Promise.resolve().then(()=>readLedgerStatus(stopped)),stopped);
   return !stopped.aborted&&live(p,now())&&exact(row,['id','cap_micro_usd','reserved_micro_usd','enabled','policy_id','per_call_micro_usd','pricing_valid_until'])&&row.id===PUBLIC_PLANNER_LEDGER&&row.cap_micro_usd===PUBLIC_PLANNER_CAP_MICRO_USD&&integer(row.reserved_micro_usd,0,row.cap_micro_usd)&&row.enabled===true&&row.policy_id===ledgerPolicyId&&row.per_call_micro_usd===ledgerPerCallMicroUsd&&integer(ledgerPerCallMicroUsd,p.reserveMicroUsd,5000000)&&Date.parse(row.pricing_valid_until)===Date.parse(p.validUntil)&&row.cap_micro_usd-row.reserved_micro_usd>=p.reserveMicroUsd;
  }finally{clearTimeout(timer);controller.abort();}
 }catch{return false;}
}
