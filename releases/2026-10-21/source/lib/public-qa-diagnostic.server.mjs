import {boundedJson} from './public-qa-stream.server.mjs';
import {publicQaDiagnosticAllowed,PUBLIC_QA_DIAGNOSTIC_ENABLED,PUBLIC_QA_DIAGNOSTIC_CONCURRENCY_ENABLED} from './public-qa-diagnostic-options.mjs';
// No AI module import. Existing server key is used only for this fixed RPC host.
const origin='https://noykvmztefmmhyuwuppv.supabase.co';
const policy='validation_sql_only_v1',wrongPolicy='diagnostic_no_reservation_v1';
const ids=Object.freeze([...Array.from({length:12},(_,i)=>'preview_rpc_v1_'+String(i).padStart(2,'0')),...Array(8).fill('preview_rpc_duplicate_v1')]);
const context='a'.repeat(64);
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
function waitFor(promise,signal){
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const abort=()=>{signal.removeEventListener('abort',abort);reject(Error('stopped'));};
  signal.addEventListener('abort',abort,{once:true});
  promise.then(value=>{signal.removeEventListener('abort',abort);if(signal.aborted){void value?.body?.cancel().catch(()=>{});reject(Error('stopped'));}else resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
  if(signal.aborted)abort();
 });
}
export function createPublicQaDiagnosticPost({env=()=>process.env,transport=(...args)=>fetch(...args),enabled=PUBLIC_QA_DIAGNOSTIC_ENABLED,concurrency=PUBLIC_QA_DIAGNOSTIC_CONCURRENCY_ENABLED}={}){
 return async request=>{
  const state=env();
  if(!publicQaDiagnosticAllowed(state,request,enabled))return reply({available:false},404);
  if(request.body!==null)return reply({available:false},400);
  // Read existing secret names only after all nonsecret preview/request gates.
  const urlMatches=state.SUPABASE_URL===origin,keyPresent=typeof state.SUPABASE_SECRET_KEY==='string'&&state.SUPABASE_SECRET_KEY.length>0;
  const base={previewOnly:true,urlMatches,keyPresent};
  if(!urlMatches||!keyPresent)return reply({...base,rpcReached:false});
  const headers={'content-type':'application/json',apikey:state.SUPABASE_SECRET_KEY};
  if(!state.SUPABASE_SECRET_KEY.startsWith('sb_secret_'))headers.authorization='Bearer '+state.SUPABASE_SECRET_KEY;
  const owned=new AbortController(),signal=AbortSignal.any([request.signal,owned.signal]),timer=setTimeout(()=>owned.abort(),10000),start=performance.now();
  async function call(id){
   const began=performance.now();
   try{
    const response=await waitFor(Promise.resolve().then(()=>{signal.throwIfAborted();return transport(origin+'/rest/v1/rpc/reserve_public_ai',{method:'POST',headers,body:JSON.stringify({p_request_id:id,p_context_id:context,p_policy_id:concurrency?policy:wrongPolicy,p_reserve_micro_usd:1}),signal,redirect:'error',cache:'no-store'});}),signal);
    if(!response.ok){void response.body?.cancel().catch(()=>{});return {status:response.status===401||response.status===403?'authDenied':'rpcError',granted:false,elapsedMs:Math.round(performance.now()-began)};}
    const body=await boundedJson(response.body,4096,signal);
    const denied=body&&Object.keys(body).length===1&&body.granted===false;
    const granted=concurrency&&body?.granted===true&&Object.keys(body).sort().join(',')==='contextId,granted,policyId,requestId,reservationId,reserveMicroUsd'&&body.requestId===id&&body.reservationId===id&&body.contextId===context&&body.policyId===policy&&body.reserveMicroUsd===1;
    return {status:denied?'denied':granted?'granted':'invalid',granted:!!granted,elapsedMs:Math.round(performance.now()-began)};
   }catch{return {status:signal.aborted?'stopped':'rpcError',granted:false,elapsedMs:Math.round(performance.now()-began)};}
  }
  try{
   const results=await Promise.all((concurrency?ids:['preview_rpc_binding_v1']).map(call));
   const counts={denied:0,granted:0,authDenied:0,rpcError:0,invalid:0,stopped:0};for(const r of results)counts[r.status]++;
   return reply({...base,rpcReached:counts.denied+counts.granted>0,concurrency:!!concurrency,counts,grantFlags:results.map(r=>r.granted),elapsedMs:Math.round(performance.now()-start),requestElapsedMs:results.map(r=>r.elapsedMs)});
  }finally{clearTimeout(timer);owned.abort();}
 };
}
