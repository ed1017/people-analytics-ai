import OpenAI from 'openai';
import type {ResponseInput} from 'openai/resources/responses/responses';
import {CHAT_MODEL} from '@/lib/chat-model';
import {openAIProxyTransport} from '@/lib/openai-proxy-transport';
import {solutionConversationEnabled} from '@/lib/home-solution-conversation';
import {solutionConversationInstructions,solutionResponseFormat,solutionTools} from '@/lib/home-solution-conversation-schema';
import {converseSolutions} from '@/lib/home-solution-conversation-service';

export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!solutionConversationEnabled)return Response.json({error:'Solution conversation is not enabled.'},{status:404});
 const body=await request.text();if(new TextEncoder().encode(body).length>900000)return Response.json({error:'The conversation request is too large.'},{status:413});
 try{
  if(!process.env.OPENAI_API_KEY)throw Error('Model unavailable');
  const client=new OpenAI({...openAIProxyTransport(),apiKey:process.env.OPENAI_API_KEY,maxRetries:0});
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(90000)]);
  const reply=await converseSolutions(JSON.parse(body),{
   complete:async(input,finalOnly,signal)=>{
    const response=await client.responses.create({model:CHAT_MODEL,instructions:solutionConversationInstructions,input:input as ResponseInput,tools:solutionTools,text:{format:solutionResponseFormat},tool_choice:finalOnly?'none':'auto',parallel_tool_calls:false,max_output_tokens:5000},{maxRetries:0,timeout:30000,signal});
    return {completed:response.status==='completed',items:response.output,calls:response.output.filter(item=>item.type==='function_call').map(item=>({id:item.call_id,name:item.name,arguments:item.arguments})),text:response.output_text};
   },
   loadProjection:async(filters,signal)=>(await import('@/lib/home-solution-projection-source')).loadSolutionProjectionInputs(filters,signal),
  },signal);
  return Response.json(reply,{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'The conversation could not be completed or verified. Your request and earlier work are kept. Try a narrower question or retry explicitly.'},{status:422});}
}
