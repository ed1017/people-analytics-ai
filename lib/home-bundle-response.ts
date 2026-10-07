// Fixed classifications only. Never return exception messages, response prose or credentials.
// @ts-expect-error Native Node tests share TypeScript source.
import {inspectHomeBundleOutput,type BundleDiagnostic,type BundleProposal} from './home-solution-bundles.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {homeBundleOutputTokens,bundleResponseDiagnostic,type BundleResponseDiagnostic} from './home-bundle-response-diagnostic.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {incompleteBundleTextField} from './home-bundle-text-completeness.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {hasDuplicatePlanActivities} from './home-bundle-distinctness.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {homeAnswerScopeViolation} from './home-answer-scope.ts';
export const visiblyIncompleteBundleText=(proposal:BundleProposal)=>incompleteBundleTextField(proposal)!==null;
export async function inspectBundleResponse(call:()=>Promise<{status?:string;output_text?:string;usage?:unknown;incomplete_details?:unknown;output?:unknown}>,goal:string,pack:unknown,task?:'delivery'|'diagnostic',outputTokenLimit=homeBundleOutputTokens):Promise<{proposal:BundleProposal;usage:unknown;diagnostic:null}|{proposal:null;diagnostic:BundleDiagnostic;responseDiagnostic:BundleResponseDiagnostic}>{
 const rejected=(response:unknown,diagnostic:BundleDiagnostic,reason:BundleResponseDiagnostic['reason'],textField:BundleResponseDiagnostic['textField']=null)=>({proposal:null as null,diagnostic,responseDiagnostic:bundleResponseDiagnostic(response,reason,outputTokenLimit,textField)});
 let response;try{response=await call()}catch{return rejected(null,'api_error','api_error')}
 const details=bundleResponseDiagnostic(response,'incomplete_response',outputTokenLimit);
 if(response.status==='incomplete')return rejected(response,'incomplete_output',details.incompleteReason==='max_output_tokens'?'output_token_limit':details.incompleteReason==='content_filter'?'content_filter':'incomplete_response');
 if(response.status!=='completed')return rejected(response,'incomplete_output','response_not_completed');
 if(Array.isArray(response.output)&&response.output.some(item=>item&&Array.isArray(item.content)&&item.content.some((part:{type?:unknown})=>part?.type==='refusal')))return rejected(response,'incomplete_output','refusal');
 if(typeof response.output_text!=='string'||!response.output_text.trim())return rejected(response,'incomplete_output','empty_output');
 const inspected=inspectHomeBundleOutput(response.output_text,goal,pack,task);
 if(!inspected.proposal)return rejected(response,inspected.diagnostic,'invalid_output');
 const proposal=inspected.proposal;
 if(proposal.bundles.some(bundle=>{
  const references=bundle.components.flatMap(component=>component.evidence);
  if([bundle.name,bundle.objective,bundle.coordination,bundle.limitation].some(text=>homeAnswerScopeViolation(text,pack,{references,scopeContext:goal})))return true;
  return bundle.components.some(component=>[component.name,component.firstStep,component.limitation,component.ownerRole].some(text=>homeAnswerScopeViolation(text,pack,{references:component.evidence,scopeContext:goal})));
 })||[proposal.question,proposal.unavailableReason].some(text=>text&&homeAnswerScopeViolation(text,pack)))return rejected(response,'source_scope_mismatch','source_scope_mismatch');
 const field=incompleteBundleTextField(inspected.proposal);if(field)return rejected(response,'incomplete_output','incomplete_text',field);
 if(hasDuplicatePlanActivities(inspected.proposal))return rejected(response,'duplicate_plans','invalid_output');
 const raw=response.usage&&typeof response.usage==='object'?response.usage as Record<string,unknown>:{};
 const usage:Record<string,unknown>=Object.fromEntries(['input_tokens','output_tokens','total_tokens'].map(key=>[key,Number.isSafeInteger(raw[key])&&Number(raw[key])>=0?raw[key]:null]));
 for(const [detail,key] of [['input_tokens_details','cached_tokens'],['output_tokens_details','reasoning_tokens']]){const item=raw[detail];if(item&&typeof item==='object'){const count=(item as Record<string,unknown>)[key];usage[detail]={[key]:Number.isSafeInteger(count)&&Number(count)>=0?count:null};}}
 return {proposal:inspected.proposal,usage,diagnostic:null};
}
