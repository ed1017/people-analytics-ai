import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {PUBLIC_AI_ENABLED,PUBLIC_AI_ROUTES,PUBLIC_AI_CAPABILITIES_PATH,publicAiRequestAllowed} from './public-ai-capabilities.mjs';
import {awaitPublicQaBinding} from './public-qa-application.server.mjs';

const reply=(body,status=200)=>Response.json(body,{status,headers:{'x-workforce-dataset':P.token,'cache-control':'no-store','x-content-type-options':'nosniff'}});
/** Trusted composition only. Missing configuration/handlers denies without loading a
 * provider. No legacy fallback, credential lookup, fetch, or paid probe.
 * Configuration describes installed capabilities, never budget or provider health.
 * @param {{options?:{hostname:string,production?:boolean},enabled?:boolean,handlers?:Record<string,(request:Request)=>Response|Promise<Response>>,configurationCheck?:(signal:AbortSignal)=>boolean|Promise<boolean>,now?:()=>number}} config
 */
export function createPublicAiDispatcher({options,enabled=PUBLIC_AI_ENABLED,handlers={},configurationCheck,now=Date.now}={}){
 const fixedHandlers=Object.freeze(Object.fromEntries(PUBLIC_AI_ROUTES.map(path=>[path,handlers[path]])));
 const fixedOptions=options?Object.freeze({...options}):undefined;
 const configured=PUBLIC_AI_ROUTES.every(path=>typeof fixedHandlers[path]==='function')&&typeof configurationCheck==='function';
 return async function dispatch(request){
  let path;try{path=new URL(request.url).pathname;}catch{return reply({error:'Invalid request.'},400);}
  if(!PUBLIC_AI_ROUTES.includes(path)&&path!==PUBLIC_AI_CAPABILITIES_PATH)return null;
  if(!publicAiRequestAllowed(fixedOptions,request,enabled))return reply({error:'Public AI is unavailable for this request.'},503);
  if(path===PUBLIC_AI_CAPABILITIES_PATH){
   let available=false;
   if(enabled&&configured){
    const signal=AbortSignal.any([request.signal,AbortSignal.timeout(2000)]);
    try{signal.throwIfAborted();available=await awaitPublicQaBinding(Promise.resolve().then(()=>configurationCheck(signal)),signal)===true;}catch{}
   }
   return reply({version:2,datasetToken:P.token,status:available?'configured':'unavailable',expiresAt:new Date(now()+30000).toISOString(),routes:available?[...PUBLIC_AI_ROUTES]:[]});
  }
  if(!enabled||!configured)return reply({error:'Public AI is not configured.'},503);
  try{
   // Handler owns its bounded operation and per-round atomic admission. Checking
   // configuration never substitutes for admission immediately before each attempt.
   request.signal.throwIfAborted();
   const target=new URL(request.url);target.hostname=fixedOptions.hostname;
   const canonicalRequest=new Request(target,{method:request.method,headers:request.headers,signal:request.signal,...(!['GET','HEAD'].includes(request.method)?{body:request.body,duplex:'half'}:{})});
   const result=await fixedHandlers[path](canonicalRequest);
   if(!(result instanceof Response))throw Error('Invalid handler result');
   const headers=new Headers(result.headers);headers.set('x-workforce-dataset',P.token);headers.set('cache-control','no-store');headers.set('x-content-type-options','nosniff');
   return new Response(result.body,{status:result.status,headers});
  }catch{return reply({error:'Public AI is unavailable. Earlier work is preserved.'},503);}
 };
}
