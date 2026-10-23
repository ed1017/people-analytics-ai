import {verifyPublicBundle} from './verify-receipts.mjs';
import {PUBLIC_9037} from '../source/lib/public-9037-contract.mjs';
const TOKEN=PUBLIC_9037.token;
const loopback=host=>['localhost','127.0.0.1','[::1]'].includes(host);
export function createFixtureHandler(capture){
 if(!['https://www.ed-ai.app','local public-route replay; not a hosted capture'].includes(capture.origin)||!Number.isFinite(Date.parse(capture.capturedAt)))throw Error('Invalid fixture provenance');
 if(capture.documents.some(d=>d.token!==TOKEN))throw Error('Invalid fixture token');
 const digest=capture.documents[0]?.body?.data_meta?.bundleDigest;
 const checked=verifyPublicBundle(capture.documents.map(d=>d.body),digest);
 if(capture.documents.some((d,i)=>d.route!==checked.routes[i].route))throw Error('Invalid fixture order');
 const bodies=new Map(capture.documents.map(d=>[d.route,structuredClone(d.body)]));
 const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','x-workforce-dataset':TOKEN,'x-public-fixture':'historical-public-response-replay-v1'}});
 return function handle(request,env={}){
  let url;try{url=new URL(request.url);}catch{return reply({error:'Invalid local request.'},400);}
  if(Object.keys(env).some(k=>k.startsWith('VERCEL'))||url.protocol!=='http:'||!loopback(url.hostname)||url.username||url.password)return reply({error:'This reproduction is loopback-only.'},403);
  for(const h of ['host','x-forwarded-host']){
   const value=request.headers.get(h);if(value===null)continue;
   if(!/^(localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/.test(value))return reply({error:'Invalid local host.'},403);
   if(new URL('http://'+value).port!==url.port)return reply({error:'Invalid local port.'},403);
  }
  const proto=request.headers.get('x-forwarded-proto');if(proto!==null&&proto!=='http')return reply({error:'Invalid local protocol.'},403);
  if(!['GET','HEAD'].includes(request.method))return reply({error:'Calculation and AI requests are not reproduced.'},405);
  try{if(decodeURIComponent(url.pathname)!==url.pathname)return reply({error:'Noncanonical path.'},400);}catch{return reply({error:'Noncanonical path.'},400);}
  if(!url.pathname.startsWith('/api/'))return ['/', '/planning/headcount-demo','/planning/assumptions','/favicon.ico'].includes(url.pathname)||url.pathname.startsWith('/_next/')?null:reply({error:'Unsupported local page.'},404);
  if(request.method!=='GET')return reply({error:'Unsupported fixture method.'},405);
  const token=request.headers.get('x-workforce-dataset');if(token!==null&&token!==TOKEN)return reply({error:'Wrong fixture dataset.'},409);
  if(url.pathname==='/api/public-ai-capabilities'&&!url.search)return reply({version:2,datasetToken:TOKEN,status:'unavailable',expiresAt:new Date(Date.now()+30000).toISOString(),routes:[]});
  if(!bodies.has(url.pathname))return reply({error:'This operation is outside the recorded public fixture.'},503);
  for(const [key,value]of url.searchParams){
   const scoped=['/api/dashboard','/api/compensation-job-release'].includes(url.pathname);
   const allowed=scoped&&(['country','org','level'].includes(key)&&value==='all'||url.pathname==='/api/compensation-job-release'&&key==='release'&&value===PUBLIC_9037.compensationRelease);
   if(!allowed||url.searchParams.getAll(key).length!==1)return reply({error:'Only recorded company-wide scope is available.'},400);
  }
  return reply(bodies.get(url.pathname));
 };
}
