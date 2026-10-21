/** Offline preparation only: no transport, credentials, billing policy or runtime wiring. */
import {createHash} from 'node:crypto';
import {awaitPublicQaBinding} from './public-qa-application.server.mjs';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';

export const PUBLIC_PLANNER_EXACT_COUNT_ENABLED=false;
const inputKeys=['model','instructions','input','tools','tool_choice','parallel_tool_calls','reasoning','text'];
// SDK7.23.0 InputTokenCountParams has no fields for these output/delivery controls.
const outputKeys=['max_output_tokens','store','service_tier','include'];
const must=(v)=>{if(!v)throw Error('planner_count_unavailable');};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(v,keys)=>object(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
function json(v,depth=0){
 if(depth>64)return false;
 if(v===null||typeof v==='string'||typeof v==='boolean')return true;
 if(typeof v==='number')return Number.isFinite(v);
 if(Array.isArray(v))return v.length<=20000&&v.every(x=>json(x,depth+1));
 return object(v)&&Object.keys(v).length<=20000&&Object.values(v).every(x=>json(x,depth+1));
}
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const binding=m=>{
 must(m&&typeof m.requestId==='string'&&/^[a-zA-Z0-9_-]{1,120}$/.test(m.requestId)&&typeof m.contextId==='string'&&/^[a-f0-9]{64}$/.test(m.contextId)&&m.datasetToken===P.token&&integer(m.round,1,6));
 return freeze({requestId:m.requestId,contextId:m.contextId,datasetToken:m.datasetToken,round:m.round});
};

/** Strict projection against the installed count schema. Cache controls are
 * deliberately UNSUPPORTED: absence from that schema is not equivalence proof.
 * Existing admitted planner specs contain prompt_cache_options and are blocked. */
export function projectPublicPlannerCountRequest(raw){
 must(object(raw)&&json(raw)&&Buffer.byteLength(JSON.stringify(raw),'utf8')<=1500000);
 const noCache=v=>!v||typeof v!=='object'||Object.entries(v).every(([k,x])=>!k.startsWith('prompt_cache')&&k!=='cache_control'&&noCache(x));
 must(noCache(raw));
 must(Object.keys(raw).every(k=>inputKeys.includes(k)||outputKeys.includes(k)));
 must(['gpt-6.1-sol','gpt-5.6-luna'].includes(raw.model)&&typeof raw.instructions==='string'&&Array.isArray(raw.input)&&raw.input.length>0);
 must(raw.store===false&&raw.service_tier==='default'&&integer(raw.max_output_tokens,1,10000));
 must(raw.include===undefined||Array.isArray(raw.include)&&raw.include.length===1&&raw.include[0]==='reasoning.encrypted_content');
 const spec=freeze(structuredClone(raw)),payload={};
 for(const key of inputKeys)if(Object.hasOwn(spec,key))payload[key]=spec[key];
 return freeze({spec,payload,specDigest:digest(spec),payloadDigest:digest(payload)});
}

/** Inject only a reviewed count port, never a raw generation port. The billing
 * evidence flag is a trusted server configuration requirement, not a user input.
 * This module does not establish that evidence or make counting free.
 * Receipts are local single-use capabilities; no durable budget grant is issued. */
export function createPublicPlannerExactCounter({enabled=PUBLIC_PLANNER_EXACT_COUNT_ENABLED,billingVerified=false,count,currentContext,now=Date.now,timeoutMs=3000,receiptTtlMs=5000,maxInputTokens}={}){
 const receipts=new WeakMap();let busy=false,closed=false,lastRound=0,operation;
 return Object.freeze({
  async count(raw,meta){
   must(enabled===true&&billingVerified===true&&typeof count==='function'&&typeof currentContext==='function'&&integer(timeoutMs,1,10000)&&integer(receiptTtlMs,1,30000)&&integer(maxInputTokens,1,1050000));
   must(meta?.signal instanceof AbortSignal);meta.signal.throwIfAborted();
   const captured=binding(meta),identity=digest({...captured,round:0}),projection=projectPublicPlannerCountRequest(raw);
   must(!closed&&!busy&&captured.round===lastRound+1&&(operation===undefined||operation===identity));
   operation=identity;busy=true;lastRound=captured.round;
   const controller=new AbortController(),signal=AbortSignal.any([meta.signal,controller.signal]),timer=setTimeout(()=>controller.abort(),timeoutMs);
   const check=async()=>{signal.throwIfAborted();must(await currentContext(signal)===captured.contextId);signal.throwIfAborted();};
   try{
    signal.throwIfAborted();
    return await awaitPublicQaBinding((async()=>{
     await check();
     const result=await count(projection.payload,signal);
     await check();
     must(exact(result,['object','input_tokens'])&&result.object==='response.input_tokens'&&integer(result.input_tokens,1,maxInputTokens));
     const at=now();must(Number.isFinite(at));
     const receipt=freeze({binding:captured,specDigest:projection.specDigest,payloadDigest:projection.payloadDigest,inputTokens:result.input_tokens,createdAt:at,expiresAt:at+receiptTtlMs});
     receipts.set(receipt,true);return receipt;
    })(),signal);
   }catch{closed=true;throw Error('planner_count_unavailable');}
   finally{clearTimeout(timer);controller.abort();busy=false;}
  },
  async consume(receipt,raw,meta){
   must(receipts.get(receipt)===true);receipts.delete(receipt);
   must(meta?.signal instanceof AbortSignal);meta.signal.throwIfAborted();
   const captured=binding(meta),projection=projectPublicPlannerCountRequest(raw);
   must(digest(captured)===digest(receipt.binding)&&projection.specDigest===receipt.specDigest&&projection.payloadDigest===receipt.payloadDigest&&now()>=receipt.createdAt&&now()<receipt.expiresAt);
   // Consumption also has a bounded cancellation window; an ignored signal in
   // a context port cannot leave a caller waiting indefinitely.
   const controller=new AbortController(),signal=AbortSignal.any([meta.signal,controller.signal]),timer=setTimeout(()=>controller.abort(),timeoutMs);
   try{
    signal.throwIfAborted();
    must(await awaitPublicQaBinding(Promise.resolve().then(()=>currentContext(signal)),signal)===captured.contextId);
    signal.throwIfAborted();must(now()>=receipt.createdAt&&now()<receipt.expiresAt);
    return receipt.inputTokens;
   }finally{clearTimeout(timer);controller.abort();}
  },
 });
}
