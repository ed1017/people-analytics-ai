/** Disabled Home orchestration. Root owns authentication, capability dispatch and admission composition. */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as same} from 'node:util';
import {toResponseInputItems} from 'openai/lib/responses/ResponseInputItems';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {loadPublic9037Binding} from './public-9037.server.mjs';
import {createPublicHomeGrounding} from './public-home-grounding.server.mjs';
import {createPublicSavedEvidence} from './public-saved-evidence.server.mjs';
import {loadPublicProjectionSource} from './public-projection-source.server.mjs';
import {boundedJson} from './public-qa-stream.server.mjs';
import {awaitPublicQaBinding} from './public-qa-application.server.mjs';
import {readSolutionRequest} from './home-solution-conversation.ts';
import {converseSolutions} from './home-solution-conversation-service.ts';
import {projectionCurrentnessFilters} from './home-projection-currentness.ts';
import {readStaffingScenario} from './home-staffing-scenario.ts';
import {SWP_CONVERSATION_HEADER,swpConversationModel} from './swp-conversation-model.ts';
import {SWP_DEMAND_MODE,requestDemandContext} from './swp-demand.ts';
import {requiredStaffingInstructions,requiredStaffingTool} from './home-required-staffing.ts';
import {hiringBudgetInstructions} from './home-hiring-budget.ts';
import {businessPlanningInstructions} from './home-business-planning.ts';
import {businessPlanningModelTools} from './home-model-tool-schemas.ts';
import {solutionPlanningInstructions} from './home-solution-planning.ts';
import {demandReferenceModelContract} from './swp-demand-reference.ts';
import {progressModelContract} from './goal-progress-entry-service.ts';
import {solutionConversationInstructions,solutionCompletionInstructions,solutionResponseFormat,solutionTools} from './home-solution-conversation-schema.ts';
export const PUBLIC_HOME_ROUTE_ENABLED=false;
const headers={'Cache-Control':'no-store','x-workforce-dataset':P.token};
const must=v=>{if(!v)throw Error('Public Home request could not be verified.');};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const exact=(v,keys)=>v&&typeof v==='object'&&same(Object.keys(v).sort(),[...keys].sort());
/** No raw client fallback. completionFactory must return the reviewed admitted completion capability. */
export function createPublicHomeRoute({enabled=PUBLIC_HOME_ROUTE_ENABLED,hostname,completionFactory,progressEnabled=false}={}){
 return createPublicHomeRouteTestAdapter({enabled,hostname,completionFactory,progressEnabled,
  loadBinding:()=>loadPublic9037Binding({hostname,production:false}),
  verifyHome:(request,signal)=>createPublicHomeGrounding({enabled:true,hostname}).verify(request,signal),
  verifySaved:(request,signal)=>createPublicSavedEvidence({enabled:true,hostname}).verify(request,signal),
  loadProjection:signal=>loadPublicProjectionSource({hostname,production:false},signal)});
}
/** Offline dependencies only. Never pass request-controlled factories or readers here. */
export function createPublicHomeRouteTestAdapter({enabled=PUBLIC_HOME_ROUTE_ENABLED,hostname,completionFactory,progressEnabled=false,loadBinding,verifyHome,verifySaved,loadProjection,timeoutMs=90000}={}){
 return Object.freeze({async handle(request){
  if(enabled!==true)return Response.json({error:'Public Home restoration is unavailable.'},{status:503,headers});
  const url=new URL(request.url);
  if(!/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(hostname)||url.protocol!=='https:'||url.host!==hostname||url.pathname!=='/api/home-solution-conversation'||!['POST','GET'].includes(request.method))return Response.json({error:'Unsupported Home request.'},{status:404,headers});
  if(request.headers.get('x-workforce-dataset')!==P.token)return Response.json({error:'Dataset changed.'},{status:409,headers});
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>90000)return Response.json({error:'Invalid deadline.'},{status:503,headers});
  const controller=new AbortController(),signal=AbortSignal.any([request.signal,controller.signal]),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{signal.throwIfAborted();return await awaitPublicQaBinding((async()=>{
   const binding=await loadBinding();signal.throwIfAborted();const identity=structuredClone(binding.router.current());
   must(identity.datasetId===P.datasetId&&identity.token===P.token&&identity.generation===2&&/^[a-f0-9]{64}$/.test(identity.digest)&&await binding.router.bootstrapToken()===P.token);
   const current=()=>{signal.throwIfAborted();must(same(binding.router.current(),identity));};current();
   if(request.method==='GET'){
    const filters=projectionCurrentnessFilters(url.searchParams),source=await loadProjection(signal),receipt=await source.currentness(filters,signal);current();must(receipt.datasetToken===P.token&&receipt.inputs.datasetVersion.publicDigest===identity.digest);return Response.json(receipt,{headers});
   }
   must(!url.search&&request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()==='application/json');
   const raw=await boundedJson(request.body,900000,signal);current();
   const envelope=raw&&Object.hasOwn(raw,'request');if(envelope)must(exact(raw,['request','current','previous']));
   const original=envelope?raw.request:raw,parsed=readSolutionRequest(structuredClone(original));
   must(same(original.evidence,parsed.evidence));
   must(request.headers.get('x-workforce-request-id')===parsed.requestId);
   const hasSaved=!!(parsed.catalog?.plans.length||parsed.state.working.length||parsed.state.analyses.length);
   must(!hasSaved||envelope);
   if(envelope){const replay=await verifySaved({kind:'solution',request:raw.request,current:raw.current,previous:raw.previous},signal);current();must(replay.datasetToken===P.token&&replay.publicDigest===identity.digest&&same(replay.goal,parsed.goal)&&replay.selectedId===parsed.selectedId);}
   const mode=request.headers.get(SWP_CONVERSATION_HEADER);swpConversationModel(mode,parsed,P.token,{});
   const natural=mode===null,demand=mode===SWP_DEMAND_MODE?requestDemandContext(parsed,P.token):null;
   const staffingScenarioOnly=readStaffingScenario(parsed,{natural,datasetToken:P.token})!==null;
   const grounding=staffingScenarioOnly?undefined:await verifyHome({...parsed,datasetToken:P.token},signal);current();
   if(grounding)must(grounding.datasetToken===P.token&&grounding.bundleDigest===identity.digest);
   const contextId=hash({identity,request:parsed}),requestTime=new Date();let round=0,completion;
   const currentContext=()=>{current();return contextId;};
   const planningInstructions=staffingScenarioOnly?'':solutionPlanningInstructions(parsed,demand)+(natural?'\n'+businessPlanningInstructions+'\n'+hiringBudgetInstructions+'\n'+requiredStaffingInstructions:'');
   const reply=await converseSolutions(parsed,{grounding,staffingScenarioOnly,requestTime,
    ...(natural?{natural:{datasetToken:P.token}}:{}),...(demand?{demand:{datasetToken:P.token,referenceContract:true}}:{}),progress:{enabled:progressEnabled===true,datasetToken:P.token},
    complete:async(input,finalOnly,completionSignal,capabilities)=>{
     current();must(!staffingScenarioOnly&&typeof completionFactory==='function');
     completion??=completionFactory({requestId:parsed.requestId,contextId,datasetToken:P.token,currentContext});must(typeof completion?.complete==='function');
     const progress=progressModelContract(progressEnabled===true,capabilities.progressEntryEnabled);
     const tools=capabilities.requiredStaffingCalculation?[requiredStaffingTool]:demand?demandReferenceModelContract.tools:[...solutionTools,...progress.tools,...(natural?businessPlanningModelTools:[])];
     const instructions=(demand?demandReferenceModelContract.instructions:solutionConversationInstructions+'\n'+solutionCompletionInstructions+progress.instructions)+planningInstructions;
     const response=await completion.complete({model:'gpt-6.1-sol',reasoning:{effort:'medium'},service_tier:'default',store:false,include:['reasoning.encrypted_content'],instructions,input,tools,text:{format:solutionResponseFormat},tool_choice:capabilities.requiredStaffingCalculation?{type:'function',name:requiredStaffingTool.name}:finalOnly?'none':'auto',parallel_tool_calls:false,max_output_tokens:5000},{signal:completionSignal,requestId:parsed.requestId,contextId,datasetToken:P.token,round:++round});
     current();must(response&&Array.isArray(response.output));
     return {completed:response.status==='completed',items:toResponseInputItems(response.output),calls:response.output.filter(item=>item.type==='function_call').map(item=>({id:item.call_id,name:item.name,arguments:item.arguments})),text:response.output_text};
    },loadProjection:async(filters,readSignal)=>{current();const source=await loadProjection(readSignal),inputs=await source.projection(filters,readSignal);current();must(inputs.datasetVersion.publicDigest===identity.digest);return inputs;}
   },signal);current();return Response.json(reply,{headers});
  })(),signal);}catch{return Response.json({error:'The public Home conversation or evidence could not be verified. Earlier work is preserved.'},{status:503,headers});}
  finally{clearTimeout(timer);controller.abort();}
 }});
}
