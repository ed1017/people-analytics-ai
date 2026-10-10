import type {ResponseCreateParamsNonStreaming} from 'openai/resources/responses/responses';
/** Single-call serving-tier screen only; never a context trimmer or production limit. */
export const ultrafastPreviewLimits=Object.freeze({contextTokens:1050000,outputTokens:5000,rounds:1});
export function ultrafastPreviewEnabled(env:Readonly<Record<string,string|undefined>>){
 return env.VERCEL_ENV==='preview'&&env.VERCEL_GIT_COMMIT_REF==='codex/home-reviewed-plan-fast-path-20261010'&&env.HOME_ULTRAFAST_EXPERIMENT==='single-call-v1';
}
export class UltrafastPreviewIncompleteError extends Error {
 constructor(){super('This single-call Preview test needs another model round and is incomplete. Your request and earlier work are kept; nothing was saved or applied.');}
}
const allowedKeys=new Set(['model','reasoning','service_tier','instructions','input','tools','text','tool_choice','parallel_tool_calls','max_output_tokens','truncation']);
/** Reserve the one attempt before dispatch. A continuation fails without a second call.
 * The provider's full context ceiling bounds input; truncation is explicitly disabled.
 * No counting endpoint, extra request, local token estimate or context reduction.
 */
export function createUltrafastPreviewGuard(){
 let used=false;
 return (request:ResponseCreateParamsNonStreaming,signal:AbortSignal)=>{
  signal.throwIfAborted();
  if(used)throw new UltrafastPreviewIncompleteError();
  // Fail closed if later code adds hosted tools, hidden state, another model or looser limits.
  if(Object.keys(request).some(key=>!allowedKeys.has(key))||request.model!=='gpt-6.1-sol'||request.reasoning?.effort!=='medium'||request.service_tier!=='ultrafast'||request.max_output_tokens!==5000||request.parallel_tool_calls!==false||!['auto','none'].includes(String(request.tool_choice))||!Array.isArray(request.tools)||request.tools.some(tool=>tool.type!=='function')||(request.truncation!==undefined&&request.truncation!=='disabled'))throw Error('Unsupported Preview experiment request');
  used=true;
  return {...request,truncation:'disabled' as const};
 };
}
