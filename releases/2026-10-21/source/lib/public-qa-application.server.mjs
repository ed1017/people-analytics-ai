import {PUBLIC_9037} from './public-9037-contract.mjs';
import {createPublicQaRuntime} from './public-qa-runtime.server.mjs';
import {createPublicQaPost} from './public-qa-http.server.mjs';

// Bound each request's wait without cancelling a binding shared by other requests.
// The load may continue, but cannot dispatch this request after its signal ends.
export function awaitPublicQaBinding(pending,signal){
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const abort=()=>{cleanup();reject(Error('Public binding wait aborted.'));};
  const cleanup=()=>signal.removeEventListener('abort',abort);
  signal.addEventListener('abort',abort,{once:true});
  pending.then(value=>{cleanup();if(signal.aborted)reject(Error('Public binding wait aborted.'));else resolve(value);},error=>{cleanup();reject(error);});
  if(signal.aborted)abort();
 });
}

/** In-process public projection only: no arbitrary URL, raw client or network read. */
export function createPublicQaReader(binding,hostname){
 if(!/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(hostname)||typeof binding?.handle!=='function'||typeof binding?.router?.bootstrapToken!=='function')throw Error('Invalid public reader binding.');
 const currentToken=()=>binding.router.bootstrapToken();
 const readPublic=async(target,{datasetToken,signal}={})=>{
  if(signal?.aborted||datasetToken!==PUBLIC_9037.token||typeof target!=='string')throw Error('Invalid public read.');
  const url=new URL(target,'https://'+hostname);
  if(url.origin!=='https://'+hostname||!target.startsWith('/')||target.startsWith('//')||url.hash||url.pathname+url.search!==target)throw Error('Invalid public read.');
  if(url.pathname==='/api/workforce'){if(url.search)throw Error('Invalid public scope.');}
  else if(url.pathname==='/api/dashboard'){
   if([...url.searchParams.keys()].join(',')!=='country,org,level'||[...url.searchParams.values()].some(value=>!/^[a-zA-Z0-9_-]{1,40}$/.test(value)))throw Error('Invalid public scope.');
   if('?'+new URLSearchParams(Object.fromEntries(url.searchParams)).toString()!==url.search)throw Error('Noncanonical public scope.');
  }else throw Error('Unsupported public source.');
  if(await currentToken()!==PUBLIC_9037.token)throw Error('Public dataset changed.');
  const response=await binding.handle(new Request(url,{method:'GET',headers:{'x-workforce-dataset':PUBLIC_9037.token},signal}));
  if(signal?.aborted||await currentToken()!==PUBLIC_9037.token){await response.body?.cancel();throw Error('Public dataset changed.');}
  return response;
 };
 return Object.freeze({readPublic,currentToken});
}

/** Release route supplies only the literal disabled gate. Ports are test/future
 * reviewed composition inputs; no environment, secret lookup, default fetch or
 * lazy fallback can activate this entrypoint. Failures stay failed.
 */
export function createPublicQaApplicationPost(options={}){
 if(options.enabled!==true)return createPublicQaPost();
 const {loadPublicBinding,hostname,runtimeConfig}=options;
 if(typeof loadPublicBinding!=='function'||!runtimeConfig)return createPublicQaPost();
 let pending;
 return createPublicQaPost({enabled:true,answer:async(input,signal)=>{
  signal.throwIfAborted();
  pending??=Promise.resolve().then(loadPublicBinding).then(binding=>{
   const reader=createPublicQaReader(binding,hostname);
   return createPublicQaRuntime({...runtimeConfig,...reader,enabled:true});
  });
  return (await awaitPublicQaBinding(pending,signal)).answer(input,signal);
 }});
}
