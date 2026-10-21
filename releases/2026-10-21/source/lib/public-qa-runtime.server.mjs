import {createPublicQaBoundary} from './public-qa-boundary.server.mjs';
import {createPublicQaProvider, PUBLIC_QA_MODEL} from './public-qa-provider.server.mjs';
import {boundedJson} from './public-qa-stream.server.mjs';

export const PUBLIC_QA_PRICE_POLICY = Object.freeze({
 id:'luna-20261020-standard-600000-v1', model:PUBLIC_QA_MODEL,
 maximumChargeMicroUsd:600000, validUntil:'2026-10-21T00:00:00.000Z',
 contextTokens:1050000, outputTokens:512,
});
export const PUBLIC_QA_QUOTA_HOST='noykvmztefmmhyuwuppv.supabase.co';
// Full model context at long-context/cache-write prices, output at long-context
// price, plus 10% uplift. Integer numerator is in 1/100 microUSD units.
export const PUBLIC_QA_WORST_CHARGE_MICRO_USD=Math.ceil((1050000*50+512*180)*110/10000);
const livePrice=now=>Number.isFinite(now)&&now+30000<Date.parse(PUBLIC_QA_PRICE_POLICY.validUntil);

/** Server-only transport. No default fetch or credential lookup; no retries.
 * The apikey header supports existing Supabase secret keys; legacy JWT service
 * keys additionally use Authorization. Never send a modern secret as a JWT.
 */
export function createPublicQaQuotaAdmission({supabaseUrl,secretKey,transport,now=Date.now}={}) {
 let valid=false;
 try {const u=new URL(supabaseUrl);valid=u.protocol==='https:'&&u.hostname===PUBLIC_QA_QUOTA_HOST&&!u.username&&!u.password&&!u.port&&u.pathname==='/'&&!u.search&&!u.hash;}catch{}
 valid=valid&&typeof secretKey==='string'&&secretKey.length>0&&typeof transport==='function';
 return async(reservation,signal)=>{
  if(!valid||!signal||signal.aborted||!livePrice(now())||reservation.policyId!==PUBLIC_QA_PRICE_POLICY.id||reservation.reserveMicroUsd!==600000)return {granted:false};
  try {
   const headers={'content-type':'application/json',apikey:secretKey};
   if(!secretKey.startsWith('sb_secret_'))headers.authorization=`Bearer ${secretKey}`;
   const response=await transport(`https://${PUBLIC_QA_QUOTA_HOST}/rest/v1/rpc/reserve_public_ai`,{method:'POST',headers,body:JSON.stringify({p_request_id:reservation.requestId,p_context_id:reservation.contextId,p_policy_id:reservation.policyId,p_reserve_micro_usd:reservation.reserveMicroUsd}),signal,redirect:'error',cache:'no-store'});
   if(!response.ok){await response.body?.cancel().catch(()=>{});return {granted:false};}
   const data=await boundedJson(response.body,4096,signal);
   return signal.aborted?{granted:false}:data;
  }catch{return {granted:false};}
 };
}

/** Disabled by default. Caller supplies only public-projected source reader and
 * current token, existing credentials, and transport. No environment reads, route
 * activation, persistence fallback, provider calls, or credential construction here.
 * audit receives numeric usage only, never prompts/context/keys/provider bodies.
 */
export function createPublicQaRuntime({enabled=false,readPublic,currentToken,supabaseUrl,secretKey,apiKey,transport,now=Date.now,audit}={}) {
 if(!enabled||typeof apiKey!=='string'||!apiKey||typeof transport!=='function')return createPublicQaBoundary();
 const admit=createPublicQaQuotaAdmission({supabaseUrl,secretKey,transport,now});
 const call=createPublicQaProvider({transport,apiKey});
 const provider=async(spec,signal)=>{
  if(!livePrice(now()))throw Error('pricing_expired');
  const result=await call(spec,signal);
  const u=result.usage;
  if(!u||!Number.isSafeInteger(u.input_tokens)||u.input_tokens<0||u.input_tokens>1050000||!Number.isSafeInteger(u.output_tokens)||u.output_tokens<0||u.output_tokens>512||u.total_tokens!==u.input_tokens+u.output_tokens)throw Error('invalid_usage');
  // Conservative usage-priced ceiling, not an invoice or actual billed amount.
  const usageUpperBoundMicroUsd=Math.ceil((u.input_tokens*50+u.output_tokens*180)*110/10000);
  if(typeof audit==='function')await audit(Object.freeze({policyId:PUBLIC_QA_PRICE_POLICY.id,inputTokens:u.input_tokens,outputTokens:u.output_tokens,usageUpperBoundMicroUsd,reservedMicroUsd:600000}));
  return result;
 };
 const {id,model,maximumChargeMicroUsd}=PUBLIC_QA_PRICE_POLICY;
 return createPublicQaBoundary({readPublic,currentToken,admit,provider,policy:{id,model,maximumChargeMicroUsd}});
}
