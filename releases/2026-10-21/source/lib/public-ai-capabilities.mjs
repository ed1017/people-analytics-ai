import {PUBLIC_9037 as P} from './public-9037-contract.mjs';

// Change only with integrated route/provider acceptance, never from request data.
export const PUBLIC_AI_ENABLED=true;
export const PUBLIC_AI_CAPABILITIES_PATH='/api/public-ai-capabilities';
export const PUBLIC_AI_ROUTES=Object.freeze(['/api/chat','/api/home-solution-conversation','/api/home-plan-conversation','/api/workforce-solution/intake','/api/capability-agent']);
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
export const publicAiRequestId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value);

/** Public-only ingress. Never changes the private/deterministic route allowlist. */
export function publicAiRequestAllowed(options,request,enabled=PUBLIC_AI_ENABLED){
 try{
  const u=new URL(request.url);
  const hosts=[options.hostname,'people-analytics-9037review-ed-56dc.vercel.app',...(options.production?['www.ed-ai.app','ed-ai.app','ed-workforce-ai.vercel.app','people-analytics-ai-git-main-ed-56dc.vercel.app']:[])];
  if(u.protocol!=='https:'||u.port||u.username||u.password||u.hash||!hosts.includes(u.hostname)||decodeURIComponent(u.pathname)!==u.pathname||request.headers.get('x-workforce-dataset')!==P.token)return false;
  if(u.pathname===PUBLIC_AI_CAPABILITIES_PATH)return request.method==='GET'&&!u.search;
  if(enabled!==true||!PUBLIC_AI_ROUTES.includes(u.pathname))return false;
  if(request.method==='GET'&&u.pathname==='/api/home-solution-conversation'){
   const keys=['country','org','level'];
   return [...u.searchParams.keys()].length===3&&keys.every(k=>u.searchParams.getAll(k).length===1&&/^[a-zA-Z0-9_-]{1,40}$/.test(u.searchParams.get(k)));
  }
  return request.method==='POST'&&!u.search&&publicAiRequestId(request.headers.get('x-workforce-request-id'));
 }catch{return false;}
}

/** Version2 describes configuration only, never provider health/budget balance. */
// Allow five seconds of clock skew for presentation; clamp client lifetime to thirty seconds.
// Every paid round still requires independent server admission and valid pricing windows.
export function readPublicAiCapabilityReceipt(raw,now=Date.now()){
 if(!Number.isFinite(now)||!exact(raw,['version','datasetToken','status','expiresAt','routes'])||raw.version!==2||raw.datasetToken!==P.token||!['configured','unavailable'].includes(raw.status)||typeof raw.expiresAt!=='string'||!Number.isFinite(Date.parse(raw.expiresAt))||new Date(raw.expiresAt).toISOString()!==raw.expiresAt||Date.parse(raw.expiresAt)<=now||Date.parse(raw.expiresAt)>now+35000||!Array.isArray(raw.routes))return null;
 const expected=raw.status==='configured'?PUBLIC_AI_ROUTES:[];
 if(raw.routes.length!==expected.length||raw.routes.some((v,i)=>v!==expected[i]))return null;
 return Object.freeze({...raw,expiresAt:new Date(Math.min(Date.parse(raw.expiresAt),now+30000)).toISOString(),routes:Object.freeze([...raw.routes])});
}

