import {createHash,timingSafeEqual} from 'node:crypto';
import {PUBLIC_PRICING_SOURCES} from './public-pricing-verifier.server.mjs';

export const PRICING_RENEWAL_PATH='/api/internal/pricing-renewal';
export const PRICING_RENEWAL_TIMEOUT_MS=60000;
export const APPROVED_PRICING_DIGEST='ea1e9ef799beccc24cfe6b1a2e5720d1bcbef4579a16486768ea27385482a1b3';
const hash=value=>createHash('sha256').update(value).digest('hex');
const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const iso=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(Date.parse(value)).toISOString()===value;
function authorized(header,secret){
 if(typeof secret!=='string'||secret.length<32||secret.length>4096||/\s/.test(secret)||typeof header!=='string')return false;
 // Hash both complete values to fixed lengths; no token-length comparison leak.
 return timingSafeEqual(Buffer.from(hash(header),'hex'),Buffer.from(hash(`Bearer ${secret}`),'hex'));
}
function verifiedProof(value,started,finished){
 if(!value||value.verified!==true||value.digest!==APPROVED_PRICING_DIGEST||!iso(value.verifiedAt))return false;
 const observed=Date.parse(value.verifiedAt);
 if(observed<started||observed>finished||finished-started>PRICING_RENEWAL_TIMEOUT_MS)return false;
 if(hash(JSON.stringify(value.terms))!==APPROVED_PRICING_DIGEST)return false;
 return Array.isArray(value.sources)&&value.sources.length===PUBLIC_PRICING_SOURCES.length&&PUBLIC_PRICING_SOURCES.every((expected,index)=>{
  const actual=value.sources[index];return actual&&Object.keys(actual).length===2&&actual.url===expected.url&&actual.sha256===expected.sha256;
 });
}

/** Pure orchestration: only injected server ports may fetch or write. No retries,
 * provider requests, cap edits, admission changes, or caller-selected proof.
 * @param {{production?:boolean,deploymentHostname?:string,cronSecret?:string,verify?:(signal:AbortSignal)=>Promise<unknown>,renew?:(proof:{eventId:string,pricingDigest:string,observedAt:string,sources:{url:string,sha256:string}[],matches:boolean},signal:AbortSignal)=>Promise<unknown>,now?:()=>number,timeoutMs?:number}} options
 */
export function createPricingRenewalHandler({production=false,deploymentHostname,cronSecret,verify,renew,now=Date.now,timeoutMs=PRICING_RENEWAL_TIMEOUT_MS}={}){
 const hosts=['www.ed-ai.app','ed-ai.app'];
 // Only a trusted runtime setting can add one exact project deployment host.
 if(typeof deploymentHostname==='string'&&/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(deploymentHostname))hosts.push(deploymentHostname);
 return async function handle(request){
  if(request.method!=='GET')return reply(405,{error:'Method not allowed.'});
  let url;try{url=new URL(request.url);}catch{return reply(404,{error:'Not found.'});}
  if(!production||url.protocol!=='https:'||!hosts.includes(url.host)||url.pathname!==PRICING_RENEWAL_PATH||url.search||url.hash||url.username||url.password)return reply(404,{error:'Not found.'});
  if(!authorized(request.headers.get('authorization'),cronSecret))return reply(401,{error:'Unauthorized.'});
  if(typeof verify!=='function'||typeof renew!=='function'||typeof now!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>PRICING_RENEWAL_TIMEOUT_MS)return reply(503,{error:'Renewal unavailable.'});
  const controller=new AbortController();let timer,stage='verification';
  const abort=()=>controller.abort();request.signal.addEventListener('abort',abort,{once:true});
  if(request.signal.aborted)controller.abort();
  let rejectAbort;const aborted=new Promise((_,reject)=>{rejectAbort=()=>reject(Error('aborted'));controller.signal.addEventListener('abort',rejectAbort,{once:true});});
  timer=setTimeout(abort,timeoutMs);
  try{
   const work=(async()=>{
    controller.signal.throwIfAborted();const started=now();
    if(!Number.isSafeInteger(started)||started<=0)throw Error('clock');
    const proof=await verify(controller.signal);controller.signal.throwIfAborted();const finished=now();
    if(!Number.isSafeInteger(finished)||!verifiedProof(proof,started,finished))throw Error('verification');
    const eventId=hash(`${proof.digest}:${proof.verifiedAt}`);
    stage='renewal';
    const result=await renew({eventId,pricingDigest:proof.digest,observedAt:proof.verifiedAt,sources:proof.sources,matches:true},controller.signal);
    controller.signal.throwIfAborted();
    const expectedUntil=null; // Explicitly non-expiring; verification and revocation remain mandatory.
    if(!result||result.recorded!==true||typeof result.replayed!=='boolean'||result.version!==eventId||typeof result.verifiedAt!=='string'||Date.parse(result.verifiedAt)!==Date.parse(proof.verifiedAt)||result.validUntil!==expectedUntil)throw Error('receipt');
    return reply(200,{ok:true,status:result.replayed?'already-recorded':'renewed',validUntil:expectedUntil});
   })();
   return await Promise.race([work,aborted]);
  }catch{
   // A failed RPC may have committed. Never retry it automatically or claim no write.
   return reply(503,{error:stage==='renewal'?'Renewal outcome unconfirmed. Check the recorded event before retrying.':'Pricing verification unavailable; renewal was not requested.'});
  }finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',rejectAbort);controller.abort();}
 };
}
