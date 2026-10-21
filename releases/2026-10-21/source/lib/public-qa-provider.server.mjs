import {publicQaLimits} from './public-qa-boundary.server.mjs';
import {boundedJson} from './public-qa-stream.server.mjs';
export {boundedJson} from './public-qa-stream.server.mjs';

export const PUBLIC_QA_MODEL = 'gpt-5.6-luna';
export const PUBLIC_QA_PROVIDER_URL = 'https://api.openai.com/v1/responses';

/** Only call behind the reviewed atomic reservation boundary. No default fetch,
 * key lookup, SDK, retries, redirects, fallback model, proxy or price assumption.
 * Parent must certify policy/expiry before any runtime wiring is enabled.
 */
export function createPublicQaProvider({transport,apiKey}={}) {
 return async (spec,signal) => {
  if(typeof transport!=='function'||typeof apiKey!=='string'||!apiKey||!signal)throw Error('provider_unconfigured');
  signal.throwIfAborted();
  const keys=['model','service_tier','store','tool_choice','tools','max_output_tokens','instructions','input','text'];
  if(!spec||Object.keys(spec).length!==keys.length||!keys.every(k=>Object.hasOwn(spec,k))||
   spec.model!==PUBLIC_QA_MODEL||spec.service_tier!=='default'||spec.store!==false||
   spec.tool_choice!=='none'||!Array.isArray(spec.tools)||spec.tools.length||
   spec.max_output_tokens!==publicQaLimits.outputTokens)throw Error('invalid_provider_request');
  const body=JSON.stringify(spec);
  if(Buffer.byteLength(body)>publicQaLimits.inputBytes)throw Error('invalid_provider_request');
  const response=await transport(PUBLIC_QA_PROVIDER_URL,{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body,signal,redirect:'error',cache:'no-store'});
  if(!response.ok){await response.body?.cancel().catch(()=>{});throw Error('provider_failed');}
  const raw=await boundedJson(response.body,65536,signal);
  if(!raw||raw.model!==PUBLIC_QA_MODEL||raw.status!=='completed'||!Array.isArray(raw.output))throw Error('invalid_provider_response');
  // HTTP Responses API has no SDK convenience output_text property.
  const messages=raw.output.filter(item=>item?.type==='message');
  if(raw.output.some(item=>!['reasoning','message'].includes(item?.type))||
   messages.some(item=>item.role!=='assistant'||item.content?.some(part=>part.type!=='output_text')))throw Error('invalid_provider_response');
  const output_text=messages.flatMap(item=>item.content??[]).map(part=>part.text).join('');
  if(Buffer.byteLength(output_text)>publicQaLimits.outputBytes)throw Error('invalid_provider_response');
  return {status:raw.status,output:raw.output,output_text,usage:raw.usage};
 };
}
