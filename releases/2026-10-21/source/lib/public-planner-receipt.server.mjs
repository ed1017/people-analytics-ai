/** Server-only accounting metadata. Never retain prompts, output text or credentials. */
export const PUBLIC_PLANNER_PROVIDER_REQUEST_ID=Symbol('public-planner-provider-request-id');
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const keys=(value,allowed)=>object(value)&&Object.keys(value).every(key=>allowed.includes(key));
const count=value=>Number.isSafeInteger(value)&&value>=0;
const id=(value,prefix)=>typeof value==='string'&&new RegExp('^'+prefix+'[A-Za-z0-9_-]{1,120}$').test(value);
const zeroFields=(value,names)=>names.every(name=>!Object.hasOwn(value,name)||value[name]===0);
function textOnly(spec){
 return spec?.service_tier==='default'&&spec.prompt_cache_options?.mode==='explicit'&&typeof spec.instructions==='string'&&Array.isArray(spec.input)&&spec.input.length>0&&spec.input.every(item=>{
  if(!object(item))return false;
  if(item.type==='function_call')return typeof item.arguments==='string';
  if(item.type==='function_call_output')return typeof item.output==='string';
  if(item.type==='reasoning')return typeof item.encrypted_content==='string';
  return ['user','assistant','system','developer'].includes(item.role)&&(typeof item.content==='string'||Array.isArray(item.content)&&item.content.every(part=>keys(part,['type','text','annotations','logprobs'])&&['input_text','output_text'].includes(part.type)&&typeof part.text==='string'));
 })&&(!spec.tools||Array.isArray(spec.tools)&&spec.tools.every(tool=>tool.type==='function'));
}

/** Called only with the boundary's already validated, frozen request. Unknown
 * accounting categories keep the original hold instead of guessing a charge. */
export function normalizePublicPlannerReceipt(raw,spec,policy){
 if(!object(raw)||!textOnly(spec)||raw.status!=='completed'||raw.service_tier!=='default'||raw.model!==policy?.model||spec.model!==policy.model||!id(raw.id,'resp_'))return null;
 if(Array.isArray(raw.output)&&raw.output.some(item=>!object(item)||!['message','reasoning','function_call'].includes(item.type)))return null;
 const requestId=raw[PUBLIC_PLANNER_PROVIDER_REQUEST_ID]??null;
 if(requestId!==null&&!id(requestId,'req_'))return null;
 const usage=raw.usage;
 if(!keys(usage,['input_tokens','output_tokens','total_tokens','input_tokens_details','output_tokens_details','input_text_tokens','output_text_tokens','input_audio_tokens','output_audio_tokens','input_image_tokens','output_image_tokens']))return null;
 const input=usage.input_tokens,output=usage.output_tokens,total=usage.total_tokens;
 if(![input,output,total].every(count)||input>policy.contextTokens||output>spec.max_output_tokens||!Number.isSafeInteger(input+output)||total!==input+output)return null;
 const incoming=usage.input_tokens_details,outgoing=usage.output_tokens_details;
 if(!keys(incoming,['cached_tokens','cache_write_tokens','cache_write_tokens_details','text_tokens','audio_tokens','image_tokens'])||!keys(outgoing,['reasoning_tokens','text_tokens','audio_tokens','image_tokens']))return null;
 if(!count(incoming.cached_tokens)||incoming.cached_tokens>input||!count(outgoing.reasoning_tokens)||outgoing.reasoning_tokens>output)return null;
 if(!zeroFields(usage,['input_audio_tokens','output_audio_tokens','input_image_tokens','output_image_tokens'])||!zeroFields(incoming,['audio_tokens','image_tokens','cache_write_tokens'])||!zeroFields(outgoing,['audio_tokens','image_tokens']))return null;
 if(Object.hasOwn(incoming,'cache_write_tokens_details')&&(!keys(incoming.cache_write_tokens_details,['ttl_12h_tokens','ttl_30m_tokens'])||!zeroFields(incoming.cache_write_tokens_details,['ttl_12h_tokens','ttl_30m_tokens'])))return null;
 if([[usage,'input_text_tokens',input],[incoming,'text_tokens',input],[usage,'output_text_tokens',output],[outgoing,'text_tokens',output]].some(([record,key,total])=>Object.hasOwn(record,key)&&record[key]!==total))return null;
 return Object.freeze({version:1,response_id:raw.id,provider_request_id:requestId,model:raw.model,service_tier:'default',status:'completed',input_tokens:input,output_tokens:output,total_tokens:total,cached_tokens:incoming.cached_tokens,cache_write_tokens:0,reasoning_tokens:outgoing.reasoning_tokens,input_text_tokens:input,output_text_tokens:output});
}
