// Home-only response inspection. Fixed diagnostics and numeric counts; never raw failure text.
// @ts-expect-error Native Node tests share TypeScript source.
import {decodeHomeModelReply,HomeReplyError} from './home-chat-reply.ts';
import type {CandidatePack} from './home-candidate-options.ts';
type HomeReplyReason='ready'|'token_limit'|'incomplete_output'|'response_not_completed'|'refusal'|'empty_output'|'output_too_large'|'invalid_json'|'invalid_reply';
const record=(raw:unknown):Record<string,unknown>=>raw!==null&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
const count=(raw:unknown):number|null=>Number.isSafeInteger(raw)&&Number(raw)>=0?Number(raw):null;
const statuses=['completed','incomplete','failed','cancelled','queued','in_progress'] as const;
const incompleteReasons=['max_output_tokens','max_messages','content_filter','steered'] as const;
export function inspectHomeChatResponse(raw:unknown,hasFocusedIssue:boolean,pack:CandidatePack|undefined,outputTokenLimit:number,prepareGoal=true){
 const response=record(raw),usage=record(response.usage),status=statuses.find(value=>value===response.status)??'unknown';
 const incomplete=record(response.incomplete_details).reason,incompleteReason=incomplete==null?null:incompleteReasons.find(value=>value===incomplete)??'other';
 const text=typeof response.output_text==='string'?response.output_text:'',outputBytes=new TextEncoder().encode(text).length;
 const diagnostic=(reason:HomeReplyReason)=>({stage:'home_reply' as const,reason,status,incompleteReason,outputTokenLimit,outputBytes,usage:{input_tokens:count(usage.input_tokens),output_tokens:count(usage.output_tokens),total_tokens:count(usage.total_tokens),reasoning_tokens:count(record(usage.output_tokens_details).reasoning_tokens)}});
 const rejected=(reason:Exclude<HomeReplyReason,'ready'>)=>({ok:false as const,body:{error:`Home answer unavailable. Preparation diagnostic: ${reason}. No retry ran automatically; your draft is kept.`,homeReplyDiagnostic:diagnostic(reason)}});
 if(status==='incomplete')return rejected(incompleteReason==='max_output_tokens'?'token_limit':'incomplete_output');
 if(status!=='completed')return rejected('response_not_completed');
 const refusal=Array.isArray(response.output)&&response.output.some(item=>{const message=record(item);return Array.isArray(message.content)&&message.content.some(part=>record(part).type==='refusal')});
 if(refusal)return rejected('refusal');
 if(!text.trim())return rejected('empty_output');
 if(outputBytes>48000)return rejected('output_too_large');
 try{return {ok:true as const,body:{...decodeHomeModelReply(text,hasFocusedIssue,pack,prepareGoal),homeReplyDiagnostic:diagnostic('ready')}}}
 catch(error){return rejected(error instanceof HomeReplyError?error.reason:'invalid_reply')}
}
