import {NextRequest,NextResponse} from "next/server";
import OpenAI from "openai";
import {CHAT_MODEL} from "@/lib/chat-model";
import {supabaseServer} from "@/lib/supabase-server";
import {clarificationRequest,validateClarificationInput,validateClarificationResult} from "@/lib/workforce-clarification";
import {workforcePlanFields} from "@/lib/workforce-increment";
export const dynamic='force-dynamic';
export const maxDuration=60;
const client=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY,maxRetries:0,timeout:30000}):null;
async function limitedBody(request:NextRequest) {
  const reader=request.body?.getReader();if(!reader)throw Error('Empty clarification request.');
  const chunks:Uint8Array[]=[];let size=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw Error('Clarification request too large.');}chunks.push(value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return validateClarificationInput(JSON.parse(new TextDecoder().decode(bytes)));
}
export async function POST(request:NextRequest) {
  let input;try{input=await limitedBody(request);}catch{return NextResponse.json({error:'Use only a planning goal, statement and supported workforce inputs; extra fields are not accepted.'},{status:400});}
  if(!client)return NextResponse.json({error:'The existing model connection is unavailable. Saved inputs and results are retained.'},{status:503});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),40000),signal=AbortSignal.any([controller.signal,request.signal]);
  let diagnostic='catalog-unavailable';
  try {
    signal.throwIfAborted();
    // Only synthetic role/BU codes and names. No employee or cost/readiness rows.
    const {data,error}=await supabaseServer.from('position_action_structural_inventory').select('org_code, org_name, job_profile_code, job_profile_name');
    if(error||!data?.length)throw Error('Catalog unavailable');signal.throwIfAborted();
    const catalog={business_units:Array.from(new Map(data.map(r=>[r.org_code,{org_code:r.org_code,org_name:r.org_name}])).values()),job_profiles:Array.from(new Map(data.map(r=>[r.job_profile_code,{job_profile_code:r.job_profile_code,job_profile_name:r.job_profile_name}])).values()),combinations:data.map(r=>({org_code:r.org_code,job_profile_code:r.job_profile_code}))};
    diagnostic='invalid-catalog-or-input';const spec=clarificationRequest(input,catalog);
    diagnostic='model-unavailable';
    const response=await client.responses.create({model:CHAT_MODEL,...spec},{signal});
    diagnostic='model-incomplete';signal.throwIfAborted();if(response.status!=='completed'||!response.output_text)throw Error('Model response incomplete');
    diagnostic='invalid-model-json';const parsed=JSON.parse(response.output_text);
    diagnostic='invalid-model-proposal';const result=validateClarificationResult(parsed,input,catalog);
    return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(error){const known=['Unexpected clarification fields.','Invalid clarification response.','Missing or excessive planning text.','Unknown or repeated proposed field.','Proposed input is not grounded in the supplied planning statement.','This role and BU combination is unavailable.'];if(diagnostic==='invalid-model-proposal'&&error instanceof Error&&known.includes(error.message))diagnostic+='-'+known.indexOf(error.message);if(error instanceof Error&&workforcePlanFields.includes(error.cause as typeof workforcePlanFields[number]))diagnostic+='-'+error.cause;return NextResponse.json({error:signal.aborted?'Clarification cancelled or timed out. Saved inputs and results are retained.':'Clarification could not be validated. No proposed input was saved; retry or use the input editor.',diagnostic:signal.aborted?'cancelled':diagnostic},{status:signal.aborted?408:502,headers:{'Cache-Control':'no-store'}});}finally{clearTimeout(timer);}
}
