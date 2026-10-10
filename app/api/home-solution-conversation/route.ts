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
import {solutionConversationInstructions,solutionResponseFormat,solutionTools} from '@/lib/home-solution-conversation-schema';
import {converseSolutions} from '@/lib/home-solution-conversation-service';
import {goalProgressConversationEnabled} from '@/lib/goal-progress-conversation';
import {reviewReadyInstructions,reviewReadySolutionTools} from '@/lib/home-solution-review-completion';

export const dynamic='force-dynamic';
// Leave response/cleanup headroom beyond the shared 90-second operation deadline.
export const maxDuration=120;
// This route owns the stronger Home conversation policy; other routes keep theirs.
const homeSolutionModel={model:'gpt-6.1-sol',reasoning:{effort:'medium' as const},service_tier:'default' as const};
async function handlePOST(request:Request){
 if(!solutionConversationEnabled)return Response.json({error:'Solution conversation is not enabled.'},{status:404});
 const body=await request.text();if(new TextEncoder().encode(body).length>900000)return Response.json({error:'The conversation request is too large.'},{status:413});
 const diagnostics=createSolutionDiagnostics();let signal:AbortSignal|undefined;
 try{
  const parsed=readSolutionRequest(JSON.parse(body));
  diagnostics.stage('configuration');
  const swpModel=swpConversationModel(request.headers.get(SWP_CONVERSATION_HEADER),parsed,datasetRouter.current().token,{profile:process.env.SWP_DEMO_MODEL_PROFILE,modelId:process.env.SWP_DEMO_MODEL_ID});
  if(swpModel.model&&swpModel.model!==homeSolutionModel.model)throw Error('Configured SWP model conflicts with the Home conversation policy.');
  const demand=request.headers.get(SWP_CONVERSATION_HEADER)===SWP_DEMAND_MODE?requestDemandContext(parsed,datasetRouter.current().token):null;
  if(!process.env.OPENAI_API_KEY)throw Error('Model unavailable');
  signal=AbortSignal.any([request.signal,AbortSignal.timeout(90000)]);
  diagnostics.stage('grounding');
  const grounding=await groundSolutionRequest(parsed,signal,diagnostics.groundingComplete);
  diagnostics.stage('model_setup');
  const client=new OpenAI({...openAIProxyTransport(),apiKey:process.env.OPENAI_API_KEY,maxRetries:0});
  const natural=request.headers.get(SWP_CONVERSATION_HEADER)===null;
  const planningInstructions=solutionPlanningInstructions(parsed,demand)+(natural?'\n'+businessPlanningInstructions+reviewReadyInstructions:'');
  diagnostics.stage('conversation_preparation');
  const reply=await converseSolutions(parsed,{
   reviewReady:natural,
   grounding,
   ...(demand?{demand:{datasetToken:datasetRouter.current().token,referenceContract:true}}:{}),
   ...(natural?{natural:{datasetToken:datasetRouter.current().token}}:{}),
   progress:{enabled:goalProgressConversationEnabled,datasetToken:datasetRouter.current().token},
   complete:async(input,finalOnly,signal,capabilities)=>{
    const progressContract=progressModelContract(goalProgressConversationEnabled,capabilities.progressEntryEnabled);
    // Offer source-bound operations after their checked source exists, including later rounds.
    // This is contract eligibility, not a keyword/intent filter; all valid workflows remain available.
    const planTools=natural?reviewReadySolutionTools.filter(tool=>tool.name==='read_plans'?capabilities.savedPlansAvailable:tool.name==='revise_parameters'?capabilities.planSourcesAvailable:true):solutionTools;
    const businessTools=businessPlanningModelTools.filter(tool=>capabilities.businessPlanningReady||!['revise_scoped_service_demand','compare_service_staffing'].includes(tool.name));
    const conversationTools=demand?demandReferenceModelContract.tools:[...planTools,...progressContract.tools,...(natural?businessTools:[])];
    const instructions=(demand?demandReferenceModelContract.instructions:solutionConversationInstructions+progressContract.instructions)+planningInstructions;
    const response=await datasetAI(() => {
     diagnostics.modelAttempt({inputBytes:new TextEncoder().encode(JSON.stringify(input)).length,instructionsBytes:new TextEncoder().encode(instructions).length,toolSchemaBytes:new TextEncoder().encode(JSON.stringify(conversationTools)).length});
     return client.responses.create({...homeSolutionModel,instructions,input:input as ResponseInput,tools:conversationTools,text:{format:solutionResponseFormat},tool_choice:finalOnly?'none':'auto',parallel_tool_calls:false,max_output_tokens:5000},{maxRetries:0,timeout:60000,signal});
    });
    diagnostics.providerResult(response);
    diagnostics.stage('response_validation');
    return {completed:response.status==='completed',items:toResponseInputItems(response.output),calls:response.output.filter(item=>item.type==='function_call').map(item=>({id:item.call_id,name:item.name,arguments:item.arguments})),text:response.output_text};
   },
   loadProjection:async(filters,signal)=>(await import('@/lib/home-solution-projection-source')).loadSolutionProjectionInputs(filters,signal),
  },signal);
  const receipt=diagnostics.success(reply.usage);
  return Response.json({...reply,...(receipt?{diagnostics:receipt}:{})},{headers:{'Cache-Control':'no-store',...(receipt?{'X-Correlation-ID':receipt.correlationId,'Server-Timing':Object.entries(receipt.stageElapsedMs).map(([name,ms])=>`${name};dur=${ms}`).concat(`total;dur=${receipt.elapsedMs}`).join(', ')}:{})}});
 }catch(error){
  const evidence=error instanceof SolutionEvidenceError,diagnostic=diagnostics.failure(error,evidence?error.diagnostic:null,request.signal.aborted,signal?.aborted===true);
  return Response.json({error:evidence?error.message:'The conversation could not be completed or verified. Your request and earlier work are kept. Try a narrower question or retry explicitly.',...diagnostic},
   {status:evidence?503:422,headers:{'Cache-Control':'no-store','X-Correlation-ID':diagnostic.correlationId}});
 }
}

export async function POST(request:Request) {
 return withDatasetRequest(request, () => handlePOST(request));
}
