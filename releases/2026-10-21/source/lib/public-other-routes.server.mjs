/** Disabled complete public composition for four legacy AI contracts. No SDK or database fallback. */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as same} from 'node:util';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {public9037Metadata,public9037Fields} from './public-9037-projection.mjs';
import {loadPublic9037Binding} from './public-9037.server.mjs';
import {boundedJson} from './public-qa-stream.server.mjs';
import {awaitPublicQaBinding} from './public-qa-application.server.mjs';
import {createPublicHomeGrounding} from './public-home-grounding.server.mjs';
import {createPublicSavedEvidence} from './public-saved-evidence.server.mjs';
import {createPublicChatConversation} from './public-chat-conversation.mjs';
import {normalizeHomePack} from './home-pack.mjs';
import {clarificationCatalog,clarificationRequest,validateClarificationInput,validateClarificationResult} from './workforce-clarification.ts';
import {runCapabilityAgent,validateAgentInput,AgentFailure} from './capability-agent.ts';
import {planConversationInstructions,planConversationFormat,readPlanConversationRequest} from './home-plan-conversation.ts';
import {interpretPlanConversation} from './home-plan-conversation-service.ts';
export const PUBLIC_OTHER_ROUTES_ENABLED=false;
export const publicOtherRouteKinds=Object.freeze({'/api/chat':'chat','/api/home-plan-conversation':'plan','/api/workforce-solution/intake':'intake','/api/capability-agent':'capability'});
const must=(v,m='Public conversation input or source is unavailable.')=>{if(!v)throw Error(m);};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&same(Object.keys(v).sort(),[...keys].sort());
/** Fixed approved public readers. Complete ports must be supplied by the independently admitted boundary. */
export function createPublicOtherRoutes({enabled=PUBLIC_OTHER_ROUTES_ENABLED,hostname,completionFactory,progressEnabled=false,timeoutMs=90000,now}={}){
 return createPublicOtherRoutesTestAdapter({enabled,hostname,completionFactory,progressEnabled,timeoutMs,now,loadBinding:()=>loadPublic9037Binding({hostname,production:false}),groundHome:createPublicHomeGrounding({enabled,hostname}),savedEvidence:createPublicSavedEvidence({enabled,hostname})});
}
/** Fake provider/source seam for offline parity; never accept caller-supplied adapters on runtime ingress. */
export function createPublicOtherRoutesTestAdapter({enabled=PUBLIC_OTHER_ROUTES_ENABLED,hostname,completionFactory,progressEnabled=false,timeoutMs=90000,now,loadBinding,groundHome,savedEvidence}={}){
 return Object.freeze({supports:path=>Object.hasOwn(publicOtherRouteKinds,path),async handle(request){
  const url=new URL(request.url),kind=publicOtherRouteKinds[url.pathname];
  const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','x-workforce-dataset':P.token}});
  if(!kind)return reply({error:'Unsupported public conversation route.'},404);
  if(!enabled)return reply({error:'Public conversation restoration is disabled.'},503);
  if(url.origin!=='https://'+hostname)return reply({error:'Unexpected public host.'},400);
  if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')return reply({error:'JSON content type is required.'},415);
  if(url.search||request.headers.get('x-workforce-dataset')!==P.token)return reply({error:'Explicit current public dataset is required.'},409);
  const requestId=request.headers.get('x-workforce-request-id');
  if(!requestId||!/^[A-Za-z0-9_-]{1,80}$/.test(requestId))return reply({error:'A stable bounded request identity is required.'},400);
  if(typeof completionFactory!=='function')return reply({error:'Admitted completion is unavailable. Saved work is retained.'},503);
  if(!/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(hostname)||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>90000)return reply({error:'Public runtime unavailable.'},503);
  const controller=new AbortController(),signal=AbortSignal.any([request.signal,controller.signal]),timer=setTimeout(()=>controller.abort(),timeoutMs);let phase='input',completion;
  try{signal.throwIfAborted();return await awaitPublicQaBinding((async()=>{
   const body=await boundedJson(request.body,kind==='intake'?16384:kind==='capability'?24576:kind==='plan'?900000:180000,signal);
   phase='source';const binding=await loadBinding();signal.throwIfAborted();const identity=structuredClone(binding.router.current());
   must(identity.datasetId===P.datasetId&&identity.token===P.token&&identity.generation===P.generation&&/^[a-f0-9]{64}$/.test(identity.digest)&&await binding.router.bootstrapToken()===P.token);
   const check=()=>{signal.throwIfAborted();must(same(binding.router.current(),identity),'Public binding changed.');};
   const observed=[];
   async function read(path,body,readSignal=signal){
    check();readSignal.throwIfAborted();const target=new URL(path,'https://'+hostname);must(target.origin==='https://'+hostname&&path.startsWith('/api/')&&Object.hasOwn(public9037Fields,target.pathname));
    const response=await binding.handle(new Request(target,{signal:readSignal,method:body===undefined?'GET':'POST',headers:{'x-workforce-dataset':P.token,...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})}));
    must(response.ok&&response.headers.get('x-workforce-dataset')===P.token);const data=await boundedJson(response.body,8*1024*1024,readSignal);check();must(same(data.data_meta,public9037Metadata(identity.digest,data.data_meta)));
    observed.push({path,input:body??null,digest:hash(data)});return data;
   }
   const inputs={read,async home(raw,context,s){must(exact(context,['filters','scope']),'Home evidence requires explicit public scope.');const receipt=await groundHome.verify({datasetToken:P.token,evidence:raw,...context},s);check();must(receipt.bundleDigest===identity.digest);observed.push({home:receipt.packetSha256,filters:context.filters,scope:context.scope});return normalizeHomePack(raw);}};
   let round=0,contextId=null;
   const currentContext=()=>{check();return contextId;};
   const call=async(spec,s=signal)=>{
    check();s.throwIfAborted();phase='model';
    contextId??=hash({route:url.pathname,requestId,identity,request:body,verifiedSources:observed});
    const prepared={...structuredClone(spec),store:false,service_tier:'default',...(spec.tools?.length?{parallel_tool_calls:false,include:['reasoning.encrypted_content']}:{})};
    completion??=await completionFactory({kind,route:url.pathname,requestId,contextId,datasetToken:P.token,currentContext});
    check();must(typeof completion?.complete==='function','Admitted completion unavailable.');
    const result=await awaitPublicQaBinding(Promise.resolve().then(()=>{check();s.throwIfAborted();return completion.complete(prepared,{signal:s,requestId,contextId,datasetToken:P.token,round:++round});}),s);check();must(JSON.stringify(result).length<=200000,'Oversized model output');return result;
   };
   let result;
   if(kind==='intake'){
    phase='input';const input=validateClarificationInput(body);phase='source';const catalog=clarificationCatalog(await read('/api/position-structure'));
    const spec=clarificationRequest(input,catalog),response=await call(spec);must(response.status==='completed'&&typeof response.output_text==='string'&&response.output_text.length<=20000);
    result=validateClarificationResult(JSON.parse(response.output_text),input,catalog);
   }else if(kind==='capability'){
    phase='input';const input=validateAgentInput(body);phase='source';const source=await read('/api/scenario-modeler');
    result=await runCapabilityAgent(input,source,call,(assumptions,s)=>read('/api/scenario-modeler',{assumptions},s),signal);
   }else if(kind==='plan'){
    phase='input';must(exact(body,['request','current','previous']));const parsed=readPlanConversationRequest(body.request);must(parsed.requestId===requestId,'Saved-plan request identity mismatch.');phase='source';
    const checked=await savedEvidence.verify({kind:'plan',...body},signal);check();must(checked.publicDigest===identity.digest);observed.push({saved:checked});
    result=await interpretPlanConversation(parsed,async(context,message)=>{const response=await call({instructions:planConversationInstructions,input:[{role:'user',content:'CURRENT SAVED PLAN DATA: '+JSON.stringify(context)+'\nCURRENT USER REQUEST: '+message}],text:{format:planConversationFormat},tool_choice:'none',max_output_tokens:1600});must(response.status==='completed');return response.output_text;});
   }else{
    result=await createPublicChatConversation({inputs,progressEnabled,now})(body,call,signal);
   }
   check();if(result.failure)return reply(result.failure,result.status);
   return reply({...result,data_meta:public9037Metadata(identity.digest)});
  })(),signal);}catch(error){
   return reply({error:signal.aborted?'Public conversation cancelled or timed out. Saved work is retained.':phase==='input'?'Invalid conversation inputs. Nothing was saved.':phase==='source'?'Current public evidence is unavailable or changed. Nothing was saved.':'The model result could not be validated. Nothing was saved.',...(error instanceof AgentFailure?{trace:error.trace,partialResults:error.partialResults}:{})},signal.aborted?408:phase==='input'?400:phase==='source'?503:502);
  }finally{clearTimeout(timer);controller.abort();completion?.dispose?.();}
 }});
}
