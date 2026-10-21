/** Fixed existing-project RPC transport. No environment access, default network,
 * retries, redirects, schema exposure, refunds, or ledger creation. */
import {boundedJson} from './public-qa-stream.server.mjs';
export const PUBLIC_PLANNER_DATABASE_URL='https://noykvmztefmmhyuwuppv.supabase.co';
export function createPublicPlannerLedger({transport,url,secretKey}={}){
 const configured=typeof transport==='function'&&url===PUBLIC_PLANNER_DATABASE_URL&&typeof secretKey==='string'&&secretKey.length>0;
 const rpc=async(name,args,signal)=>{
  if(!configured||!(signal instanceof AbortSignal))throw Error('Planner ledger unavailable.');
  signal.throwIfAborted();
  const headers={'content-type':'application/json',apikey:secretKey};
  if(!secretKey.startsWith('sb_secret_'))headers.authorization=`Bearer ${secretKey}`;
  const response=await transport(`${PUBLIC_PLANNER_DATABASE_URL}/rest/v1/rpc/${name}`,{
   method:'POST',headers,body:JSON.stringify(args),signal,redirect:'error',cache:'no-store',
  });
  if(!response.ok){await response.body?.cancel().catch(()=>{});throw Error('Planner ledger unavailable.');}
  return boundedJson(response.body,4096,signal);
 };
 return Object.freeze({
  async admit(reservation,signal){
   try{return await rpc('reserve_public_ai',{p_request_id:reservation.requestId,p_context_id:reservation.contextId,
    p_policy_id:reservation.policyId,p_reserve_micro_usd:reservation.reserveMicroUsd},signal);}
   catch{return {granted:false};}
  },
 });
}
