import type {ResponseCreateParamsNonStreaming} from 'openai/resources/responses/responses';
/** Adapted from the earlier single-call Preview guard; no counting or context trimming. */
export const providerPreviewBranch='codex/pr204-bounded-preview-20261010';
export const providerPreviewLimits=Object.freeze({contextTokens:1050000,outputTokens:5000,rounds:1});
export const providerPreviewEnabled=(env:Readonly<Record<string,string|undefined>>)=>env.VERCEL_ENV==='preview'&&env.VERCEL_GIT_COMMIT_REF===providerPreviewBranch;
export class ProviderPreviewIncompleteError extends Error {
 constructor(){super('This bounded Preview test needs more than one model call and is incomplete. Earlier work is kept; nothing was saved or applied. No automatic retry.');}
}
const allowedKeys=new Set(['model','reasoning','service_tier','instructions','input','tools','text','tool_choice','parallel_tool_calls','max_output_tokens','truncation']);
/** Per-request limit only; duplicate submissions have separate allowances. Consume before dispatch. */
export function createProviderPreviewGuard(){
 let used=0;
 return (request:ResponseCreateParamsNonStreaming,signal:AbortSignal)=>{
  signal.throwIfAborted();
  if(used>=providerPreviewLimits.rounds)throw new ProviderPreviewIncompleteError();
  const choice=request.tool_choice;
  const staffingChoice=typeof choice==='object'&&choice!==null&&Object.keys(choice).length===2&&choice.type==='function'&&'name' in choice&&choice.name==='compare_required_staffing'&&request.tools?.some(tool=>tool.type==='function'&&tool.name===choice.name);
  if(Object.keys(request).some(key=>!allowedKeys.has(key))||request.model!=='gpt-6.1-sol'||request.reasoning?.effort!=='medium'||request.service_tier!=='default'||request.max_output_tokens!==5000||request.parallel_tool_calls!==false||!(choice==='auto'||choice==='none'||staffingChoice)||!Array.isArray(request.tools)||request.tools.some(tool=>tool.type!=='function')||(request.truncation!==undefined&&request.truncation!=='disabled'))throw Error('Unsupported bounded Preview request');
  used++;return {...request,truncation:'disabled' as const};
 };
}
