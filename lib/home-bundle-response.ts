// Fixed classifications only. Never return exception messages, response prose or credentials.
// @ts-expect-error Native Node tests share TypeScript source.
import {inspectHomeBundleOutput,type BundleDiagnostic,type BundleProposal} from './home-solution-bundles.ts';
/** Narrow fresh-response check: no grammar inference or rewriting of saved text. */
export function visiblyIncompleteBundleText(proposal:BundleProposal):boolean{
 const incomplete=(text:string,max:number)=>{const value=text.trim();return (value.length===max&&!/[.!?]["'”’)\]]*$/.test(value))||/(?:[,:;—–-]|\.\.\.|…|(?:^|\s)(?:and|or|but|because|including))$/.test(value);};
 return proposal.bundles.some(bundle=>incomplete(bundle.objective,160)||incomplete(bundle.coordination,240)||incomplete(bundle.limitation,240)||bundle.components.some(component=>incomplete(component.firstStep,360)||incomplete(component.limitation,200)));
}
export async function inspectBundleResponse(call:()=>Promise<{status?:string;output_text?:string;usage?:unknown}>,goal:string,pack:unknown,task?:'delivery'|'diagnostic'):Promise<{proposal:BundleProposal;usage:unknown;diagnostic:null}|{proposal:null;diagnostic:BundleDiagnostic}>{
 let response;try{response=await call()}catch{return {proposal:null,diagnostic:'api_error'}}
 if(response.status!=='completed')return {proposal:null,diagnostic:'incomplete_output'};
 const inspected=inspectHomeBundleOutput(response.output_text,goal,pack,task);
 if(inspected.proposal&&visiblyIncompleteBundleText(inspected.proposal))return {proposal:null,diagnostic:'incomplete_output'};
 const raw=response.usage&&typeof response.usage==='object'?response.usage as Record<string,unknown>:{};
 const usage:Record<string,unknown>=Object.fromEntries(['input_tokens','output_tokens','total_tokens'].map(key=>[key,Number.isSafeInteger(raw[key])&&Number(raw[key])>=0?raw[key]:null]));
 for(const [detail,key] of [['input_tokens_details','cached_tokens'],['output_tokens_details','reasoning_tokens']]){const item=raw[detail];if(item&&typeof item==='object'){const count=(item as Record<string,unknown>)[key];usage[detail]={[key]:Number.isSafeInteger(count)&&Number(count)>=0?count:null};}}
 return inspected.proposal?{proposal:inspected.proposal,usage,diagnostic:null}:inspected;
}
