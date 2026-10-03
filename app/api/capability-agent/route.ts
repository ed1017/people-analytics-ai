import {NextRequest,NextResponse} from "next/server";
import OpenAI from "openai";
import {openAIProxyTransport} from "@/lib/openai-proxy-transport";
import type {ResponseInput} from "openai/resources/responses/responses";
import {CHAT_MODEL} from "@/lib/chat-model";
import {AgentFailure,runCapabilityAgent,validateAgentInput,type AgentModelResponse} from "@/lib/capability-agent";
import {runPeopleAnalyticsTool} from "@/lib/people-analytics-tools";
import {GET as existingScenarioSource} from "../scenario-modeler/route";
import type {ScenarioModelResponse} from "@/lib/types";
export const dynamic="force-dynamic";
export const maxDuration=120;
const client=process.env.OPENAI_API_KEY?new OpenAI({...openAIProxyTransport(),apiKey:process.env.OPENAI_API_KEY,maxRetries:0,timeout:30000}):null;
async function limitedBody(request:NextRequest){
 if(Number(request.headers.get("content-length")??0)>24576)throw Error("Planner request exceeds 24 KiB.");
 const reader=request.body?.getReader();if(!reader)throw Error("Planner request is empty.");const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>24576){await reader.cancel();throw Error("Planner request exceeds 24 KiB.")}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return JSON.parse(new TextDecoder().decode(bytes));
}
async function abortable<T>(work:Promise<T>,signal:AbortSignal):Promise<T>{
 signal.throwIfAborted();let stop:()=>void=()=>{};
 try{return await Promise.race([work,new Promise<never>((_,reject)=>{stop=()=>reject(signal.reason);signal.addEventListener("abort",stop,{once:true})})])}finally{signal.removeEventListener("abort",stop)}
}
export async function POST(request:NextRequest){
 let input;try{input=validateAgentInput(await limitedBody(request))}catch{return NextResponse.json({error:"Invalid planning inputs. Use one or two valid quotes, explicit participant minimum and bounded numeric limits; no extra fields are accepted."},{status:400})}
 if(!client)return NextResponse.json({error:"The existing model connection is unavailable. Saved results remain intact."},{status:503});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(new Error("Planner timed out.")),90000),signal=AbortSignal.any([request.signal,controller.signal]);
 try{
  signal.throwIfAborted();const sourceResponse=await abortable(existingScenarioSource(),signal);if(!sourceResponse.ok)throw Error("Source unavailable");const source=await sourceResponse.json();
  const result=await runCapabilityAgent(input,source,async(spec,s)=>{
   const response=await client.responses.create({model:CHAT_MODEL,...spec,include:["reasoning.encrypted_content"],input:spec.input as ResponseInput},{signal:s});
   return {status:response.status,output:response.output,usage:response.usage??undefined} as AgentModelResponse;
  },async(assumptions,s)=>{
   s.throwIfAborted();return await abortable(runPeopleAnalyticsTool("run_workforce_scenario",{...assumptions,additional_attrition_pct_points:null}),s) as ScenarioModelResponse;
  },signal);
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  if(error instanceof AgentFailure)return NextResponse.json({error:error.message,trace:error.trace,partialResults:error.partialResults},{status:signal.aborted?408:502,headers:{"Cache-Control":"no-store"}});
  return NextResponse.json({error:signal.aborted?"Planning cancelled or timed out. Saved results remain intact.":"The approved scenario source is unavailable. No model-directed result was saved; retry explicitly."},{status:signal.aborted?408:503});
 }finally{clearTimeout(timer)}
}
