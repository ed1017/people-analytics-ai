import {trackingPreviewBudgetEnabled,trackingPreviewLimits,createTrackingPreviewBudget,PreviewBudgetError} from '@/lib/home-preview-budget';
import {readStaffingScenario} from '@/lib/home-staffing-scenario';
import {requiredStaffingInstructions,requiredStaffingTool} from '@/lib/home-required-staffing';
import {hiringBudgetInstructions} from '@/lib/home-hiring-budget';
import {groundSolutionRequest} from '@/lib/home-solution-grounding-source';
import {SolutionEvidenceError} from '@/lib/home-solution-grounding.mjs';
import {createSolutionDiagnostics} from '@/lib/home-solution-diagnostics';
import {businessPlanningInstructions} from '@/lib/home-business-planning';
import {businessPlanningModelTools} from '@/lib/home-model-tool-schemas';
import {solutionPlanningInstructions} from '@/lib/home-solution-planning';
import {demandReferenceModelContract} from '@/lib/swp-demand-reference';
import {progressModelContract} from '@/lib/goal-progress-entry-service';
import { withDatasetRequest, datasetAI, datasetRouter } from '@/lib/dataset-runtime';
import OpenAI from 'openai';
import {toResponseInputItems} from 'openai/lib/responses/ResponseInputItems';
import type {ResponseInput} from 'openai/resources/responses/responses';
import {openAIProxyTransport} from '@/lib/openai-proxy-transport';
import {readSolutionRequest,solutionConversationEnabled} from '@/lib/home-solution-conversation';
import {SWP_CONVERSATION_HEADER,swpConversationModel} from '@/lib/swp-conversation-model';
import {SWP_DEMAND_MODE,requestDemandContext} from '@/lib/swp-demand';
import {solutionConversationInstructions,solutionCompletionInstructions,solutionResponseFormat,solutionTools} from '@/lib/home-solution-conversation-schema';
import {converseSolutions} from '@/lib/home-solution-conversation-service';
import {goalProgressConversationEnabled} from '@/lib/goal-progress-conversation';

export const dynamic='force-dynamic';
// Leave response/cleanup headroom beyond the shared 90-second operation deadline.
export const maxDuration=120;
// This route owns the stronger Home conversation policy; other routes keep theirs.
const homeSolutionModel={model:'gpt-6.1-sol',reasoning:{effort:'medium' as const},service_tier:'default' as const};
async function handlePOST(request:Request){
 const requestTime=new Date();
 if(!solutionConversationEnabled)return Response.json({error:'Solution conversation is not enabled.'},{status:404});
 const body=await request.text();if(new TextEncoder().encode(body).length>900000)return Response.json({error:'The conversation request is too large.'},{status:413});
 const previewBudget=trackingPreviewBudgetEnabled(process.env)?createTrackingPreviewBudget():null;
 const diagnostics=createSolutionDiagnostics();let signal:AbortSignal|undefined;
 try{
  const parsed=readSolutionRequest(JSON.parse(body));
  diagnostics.stage('configuration');
  const swpModel=swpConversationModel(request.headers.get(SWP_CONVERSATION_HEADER),parsed,datasetRouter.current().token,{profile:process.env.SWP_DEMO_MODEL_PROFILE,modelId:process.env.SWP_DEMO_MODEL_ID});
  if(swpModel.model&&swpModel.model!==homeSolutionModel.model)throw Error('Configured SWP model conflicts with the Home conversation policy.');
  const demand=request.headers.get(SWP_CONVERSATION_HEADER)===SWP_DEMAND_MODE?requestDemandContext(parsed,datasetRouter.current().token):null;
  if(!process.env.OPENAI_API_KEY)throw Error('Model unavailable');
  signal=AbortSignal.any([request.signal,AbortSignal.timeout(90000)]);
  signal.throwIfAborted();
  const natural=request.headers.get(SWP_CONVERSATION_HEADER)===null;
  const staffingScenarioOnly=readStaffingScenario(parsed,{natural,datasetToken:datasetRouter.current().token})!==null;
  diagnostics.stage('grounding');
  const grounding=staffingScenarioOnly?undefined:await groundSolutionRequest(parsed,signal,diagnostics.groundingResult);
  diagnostics.stage(staffingScenarioOnly?'conversation_preparation':'model_setup');
  const client=staffingScenarioOnly?null:new OpenAI({...openAIProxyTransport(),apiKey:process.env.OPENAI_API_KEY,maxRetries:0});
  const planningInstructions=staffingScenarioOnly?'':solutionPlanningInstructions(parsed,demand)+(natural?'\n'+businessPlanningInstructions+'\n'+hiringBudgetInstructions+'\n'+requiredStaffingInstructions:'');
  diagnostics.stage('conversation_preparation');
  const reply=await converseSolutions(parsed,{
   grounding,staffingScenarioOnly,requestTime,onToolResult:diagnostics.toolResult,
   ...(previewBudget?{maxModelRounds:trackingPreviewLimits.rounds}:{}),
   ...(demand?{demand:{datasetToken:datasetRouter.current().token,referenceContract:true}}:{}),
   ...(natural?{natural:{datasetToken:datasetRouter.current().token}}:{}),
   progress:{enabled:goalProgressConversationEnabled,datasetToken:datasetRouter.current().token},
   complete:async(input,finalOnly,signal,capabilities)=>{
    if(staffingScenarioOnly||!client)throw Error('Illustrative staffing calculations cannot dispatch a model.');
    const progressContract=progressModelContract(goalProgressConversationEnabled,capabilities.progressEntryEnabled);
    const conversationTools=capabilities.requiredStaffingCalculation?[requiredStaffingTool]:demand?demandReferenceModelContract.tools:[...solutionTools,...progressContract.tools,...(natural?businessPlanningModelTools:[])];
    const instructions=(demand?demandReferenceModelContract.instructions:solutionConversationInstructions+'\n'+solutionCompletionInstructions+progressContract.instructions)+planningInstructions;
    let providerRequest:import('openai/resources/responses/responses').ResponseCreateParamsNonStreaming={...homeSolutionModel,instructions,input:input as ResponseInput,tools:conversationTools,text:{format:solutionResponseFormat},tool_choice:capabilities.requiredStaffingCalculation?{type:'function',name:requiredStaffingTool.name}:finalOnly?'none':'auto',parallel_tool_calls:false,max_output_tokens:5000};
    if(previewBudget)providerRequest=await datasetAI(()=>previewBudget.prepare(providerRequest,body=>client.responses.inputTokens.count(body,{maxRetries:0,timeout:15000,signal})));
    signal.throwIfAborted();
    const response=await datasetAI(() => {
     diagnostics.modelAttempt({inputBytes:new TextEncoder().encode(JSON.stringify(input)).length,instructionsBytes:new TextEncoder().encode(instructions).length,toolSchemaBytes:new TextEncoder().encode(JSON.stringify(conversationTools)).length});
     return client.responses.create(providerRequest,{maxRetries:0,timeout:60000,signal});
    });
    diagnostics.providerResult(response);
    diagnostics.stage('response_validation');
    return {completed:response.status==='completed',items:toResponseInputItems(response.output),calls:response.output.filter(item=>item.type==='function_call').map(item=>({id:item.call_id,name:item.name,arguments:item.arguments})),text:response.output_text};
   },
   loadProjection:async(filters,signal)=>(await import('@/lib/home-solution-projection-source')).loadSolutionProjectionInputs(filters,signal),
  },signal);
  diagnostics.success(reply.usage);
  return Response.json(reply,{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const evidence=error instanceof SolutionEvidenceError,diagnostic=diagnostics.failure(error,evidence?error.diagnostic:null,request.signal.aborted,signal?.aborted===true);
  return Response.json({error:error instanceof PreviewBudgetError?error.message:evidence?error.message:'The conversation could not be completed or verified. Your request and earlier work are kept. Try a narrower question or retry explicitly.',...diagnostic},
   {status:evidence?503:422,headers:{'Cache-Control':'no-store','X-Correlation-ID':diagnostic.correlationId}});
 }
}

export async function POST(request:Request) {
 return withDatasetRequest(request, () => handlePOST(request));
}

/** Current aggregate projection inputs only: no conversation, model or writes. */
export async function GET(request:Request){
 return withDatasetRequest(request,async()=>{
  const headers:Record<string,string>={'Cache-Control':'no-store'};
  if(trackingPreviewBudgetEnabled(process.env))headers['X-Tracking-Preview-Budget']='v1; rounds=2; input=25000; output=2000';
  if(!solutionConversationEnabled)return Response.json({error:'Solution conversation is not enabled.'},{status:404,headers});
  const {projectionCurrentnessFilters,createProjectionCurrentnessReceipt}=await import('@/lib/home-projection-currentness');
  let filters;
  try{filters=projectionCurrentnessFilters(new URL(request.url).searchParams);}
  catch{return Response.json({error:'Supply exactly valid country, org and level filters.'},{status:400,headers});}
  try{
   const signal=AbortSignal.any([request.signal,AbortSignal.timeout(15000)]);
   signal.throwIfAborted();
   const token=datasetRouter.current().token;
   if(token!=='legacy-v1:0')throw Error('Unsupported projection source binding.');
   const {loadSolutionProjectionInputs}=await import('@/lib/home-solution-projection-source');
   const inputs=await loadSolutionProjectionInputs(filters,signal);
   signal.throwIfAborted();
   const receipt=await createProjectionCurrentnessReceipt(inputs,token,filters);
   signal.throwIfAborted();
   return Response.json(receipt,{headers});
  }catch{return Response.json({error:'Current projection inputs could not be verified. Refresh and try again.'},{status:503,headers});}
 });
}
