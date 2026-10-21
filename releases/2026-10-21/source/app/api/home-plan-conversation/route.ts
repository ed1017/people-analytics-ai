import { withDatasetRequest, datasetAI } from '@/lib/dataset-runtime';
import OpenAI from 'openai';
import {CHAT_MODEL} from '@/lib/chat-model';
import {openAIProxyTransport} from '@/lib/openai-proxy-transport';
import {structuredPlansEnabled,planConversationInstructions,planConversationFormat} from '@/lib/home-plan-conversation';
import {interpretPlanConversation} from '@/lib/home-plan-conversation-service';

export const dynamic='force-dynamic';
async function handlePOST(request:Request) {
 if(!structuredPlansEnabled)return Response.json({error:'Saved-plan conversation is not enabled. Use the existing controls.'},{status:404});
 const body=await request.text();
 if(new TextEncoder().encode(body).length>460000)return Response.json({error:'The saved-plan request is too large.'},{status:413});
 try{
  const reply=await interpretPlanConversation(JSON.parse(body),async(context,message)=>{
   if(!process.env.OPENAI_API_KEY)throw Error('Model unavailable');
   const client=new OpenAI({...openAIProxyTransport(),apiKey:process.env.OPENAI_API_KEY});
   const result=await datasetAI(() => client.responses.create({model:CHAT_MODEL,instructions:planConversationInstructions,input:[{role:'user',content:'CURRENT SAVED PLAN DATA: '+JSON.stringify(context)+'\nCURRENT USER REQUEST: '+message}],text:{format:planConversationFormat},tool_choice:'none',max_output_tokens:1600},{maxRetries:0,signal:request.signal,timeout:30000}));
   if(result.status!=='completed')throw Error('Incomplete response');
   return result.output_text;
  });
  return Response.json(reply);
 }catch{
  // Never return provider payloads or accept an incomplete proposal. Retry is explicit.
  return Response.json({error:'The plan request could not be verified. Nothing was saved. Try again or use the existing plan controls.'},{status:422});
 }
}

export async function POST(request:Request) {
 return withDatasetRequest(request, () => handlePOST(request));
}
