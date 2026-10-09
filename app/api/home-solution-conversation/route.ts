import {solutionPlanningInstructions} from '@/lib/home-solution-planning';
import {demandReferenceModelContract} from '@/lib/swp-demand-reference';
import {progressModelContract} from '@/lib/goal-progress-entry-service';
import { withDatasetRequest, datasetAI, datasetRouter } from '@/lib/dataset-runtime';
import OpenAI from 'openai';
import type {ResponseInput} from 'openai/resources/responses/responses';
import {CHAT_MODEL} from '@/lib/chat-model';
import {openAIProxyTransport} from '@/lib/openai-proxy-transport';
import {readSolutionRequest,solutionConversationEnabled} from '@/lib/home-solution-conversation';
import {SWP_CONVERSATION_HEADER,swpConversationModel} from '@/lib/swp-conversation-model';
import {SWP_DEMAND_MODE,requestDemandContext} from '@/lib/swp-demand';
import {solutionConversationInstructions,solutionResponseFormat,solutionTools} from '@/lib/home-solution-conversation-schema';
import {converseSolutions} from '@/lib/home-solution-conversation-service';
import {goalProgressConversationEnabled} from '@/lib/goal-progress-conversation';

export const dynamic='force-dynamic';
async function handlePOST(request:Request){
 if(!solutionConversationEnabled)return Response.json({error:'Solution conversation is not enabled.'},{status:404});
 const body=await request.text();if(new TextEncoder().encode(body).length>900000)return Response.json({error:'The conversation request is too large.'},{status:413});
 try{
  const parsed=readSolutionRequest(JSON.parse(body));
  const swpModel=swpConversationModel(request.headers.get(SWP_CONVERSATION_HEADER),parsed,datasetRouter.current().token,{profile:process.env.SWP_DEMO_MODEL_PROFILE,modelId:process.env.SWP_DEMO_MODEL_ID});
  const demand=request.headers.get(SWP_CONVERSATION_HEADER)===SWP_DEMAND_MODE?requestDemandContext(parsed,datasetRouter.current().token):null;
  if(!process.env.OPENAI_API_KEY)throw Error('Model unavailable');
  const client=new OpenAI({...openAIProxyTransport(),apiKey:process.env.OPENAI_API_KEY,maxRetries:0});
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(90000)]);
  const progressContract=progressModelContract(goalProgressConversationEnabled);
  const planningInstructions=solutionPlanningInstructions(parsed,demand);
  const conversationTools=demand?demandReferenceModelContract.tools:[...solutionTools,...progressContract.tools];
  const reply=await converseSolutions(parsed,{
   ...(demand?{demand:{datasetToken:datasetRouter.current().token,referenceContract:true}}:{}),
   progress:{enabled:goalProgressConversationEnabled,datasetToken:datasetRouter.current().token},
   complete:async(input,finalOnly,signal)=>{
    const response=await datasetAI(() => client.responses.create({model:CHAT_MODEL,...swpModel,instructions:(demand?demandReferenceModelContract.instructions:solutionConversationInstructions+progressContract.instructions)+planningInstructions,input:input as ResponseInput,tools:conversationTools,text:{format:solutionResponseFormat},tool_choice:finalOnly?'none':'auto',parallel_tool_calls:false,max_output_tokens:5000},{maxRetries:0,timeout:30000,signal}));
    return {completed:response.status==='completed',items:response.output,calls:response.output.filter(item=>item.type==='function_call').map(item=>({id:item.call_id,name:item.name,arguments:item.arguments})),text:response.output_text};
   },
   loadProjection:async(filters,signal)=>(await import('@/lib/home-solution-projection-source')).loadSolutionProjectionInputs(filters,signal),
  },signal);
  return Response.json(reply,{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'The conversation could not be completed or verified. Your request and earlier work are kept. Try a narrower question or retry explicitly.'},{status:422});}
}

export async function POST(request:Request) {
 return withDatasetRequest(request, () => handlePOST(request));
}
