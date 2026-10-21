import {PUBLIC_9037} from './public-9037-contract.mjs';
import {PUBLIC_AI_ENABLED,PUBLIC_AI_ROUTES,PUBLIC_AI_CAPABILITIES_PATH,readPublicAiCapabilityReceipt} from './public-ai-capabilities.mjs';
import {datasetFetch,datasetSession} from './dataset-client.mjs';

/** Configuration is presentation state, not balance or provider health. Every submission still requires server budget admission.
 * No polling, model call, credential or environment lookup. */
export function createPublicAiReadiness({enabled=PUBLIC_AI_ENABLED,session,transport,now=Date.now,timeoutMs=5000}={}){
 let receipt=null,pending=null,epoch=0,expiry,controller;
 const listeners=new Set();
 const publish=next=>{receipt=next;for(const listener of listeners)listener();};
 const invalidate=()=>{epoch++;controller?.abort();clearTimeout(expiry);publish(null);};
 const available=route=>session?.snapshot()==='legacy-v1:0'||enabled===true&&session?.snapshot()===PUBLIC_9037.token&&receipt?.status==='configured'&&Date.parse(receipt.expiresAt)>now()&&PUBLIC_AI_ROUTES.includes(route)&&receipt.routes.includes(route);
 async function refresh(){
  if(enabled!==true||session?.snapshot()!==PUBLIC_9037.token||typeof transport!=='function')return;
  if(pending)return pending;
  const captured=++epoch,token=session.snapshot(),abort=new AbortController();controller=abort;
  let timer;
  const expired=new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('Readiness timed out'));},timeoutMs);});
  pending=Promise.race([(async()=>{
   const response=await transport(PUBLIC_AI_CAPABILITIES_PATH,{method:'GET',cache:'no-store',headers:{'x-workforce-dataset':token},signal:abort.signal});
   if(abort.signal.aborted){void response.body?.cancel().catch(()=>{});abort.signal.throwIfAborted();}
   if(!response.ok||response.headers.get('x-workforce-dataset')!==token)throw Error('Readiness unavailable');
   const reader=response.body?.getReader();if(!reader)throw Error('Readiness unavailable');
   const cancelReader=()=>{void reader.cancel().catch(()=>{});};
   abort.signal.addEventListener('abort',cancelReader,{once:true});
   const chunks=[];let bytes=0;
   try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>8192)throw Error('Readiness too large');chunks.push(part.value);}}
   finally{abort.signal.removeEventListener('abort',cancelReader);await reader.cancel().catch(()=>{});}
   const joined=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.byteLength;}
   const next=readPublicAiCapabilityReceipt(JSON.parse(new TextDecoder().decode(joined)),now());
   if(!next||captured!==epoch||abort.signal.aborted||session.snapshot()!==token)return;
   clearTimeout(expiry);publish(next);
   expiry=setTimeout(()=>{if(receipt===next)publish(null);},Math.max(0,Date.parse(next.expiresAt)-now()));
  })(),expired]).catch(()=>{if(captured===epoch)publish(null);}).finally(()=>{clearTimeout(timer);abort.abort();if(controller===abort)controller=null;pending=null;});
  return pending;
 }
 const stop=session?.subscribe(invalidate);
 return Object.freeze({available,refresh,invalidate,snapshot:()=>receipt,subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},dispose:()=>{invalidate();stop?.();listeners.clear();}});
}
export const publicAiReadiness=createPublicAiReadiness({session:datasetSession,transport:datasetFetch});
/** One logical attempt, with a stable identifier; no transport retry. */
export async function publicAiFetch(path,init={}){
 const route=path.split('?')[0];
 if(!PUBLIC_AI_ROUTES.includes(route))throw Error('Unsupported AI route');
 const token=datasetSession.snapshot();
 await publicAiReadiness.refresh();
 if(datasetSession.snapshot()!==token||!publicAiReadiness.available(route))throw Error('Live AI is unavailable. Your saved work is kept.');
 init.signal?.throwIfAborted();
 const headers=new Headers(init.headers);
 if(init.method==='POST'){
  let body;try{body=JSON.parse(init.body);}catch{throw Error('Invalid AI request');}
  const requestId=body.request?.requestId??body.requestId??headers.get('x-workforce-request-id')??crypto.randomUUID();
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(requestId))throw Error('Invalid AI request identity');
  headers.set('x-workforce-request-id',requestId);
 }
 return datasetFetch(path,{...init,headers});
}
