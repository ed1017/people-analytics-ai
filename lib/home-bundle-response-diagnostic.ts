// One response can contain 18 components; this cap covers visible JSON and reasoning together.
export const homeBundleOutputTokens=10000;
// Fixed classifications and bounded counts only. Never retain response prose, errors or identifiers.
export const bundleResponseReasons=['output_token_limit','content_filter','incomplete_response','response_not_completed','empty_output','refusal','incomplete_text','invalid_output','api_error'] as const;
const statuses=['completed','incomplete','failed','cancelled','queued','in_progress','unknown'] as const;
const incompleteReasons=['max_output_tokens','max_messages','content_filter','steered','other'] as const;
const textFields=['objective','coordination','limitation','firstStep','component_limitation'] as const;
export type BundleResponseDiagnostic={version:1;reason:typeof bundleResponseReasons[number];status:typeof statuses[number];incompleteReason:typeof incompleteReasons[number]|null;outputTokenLimit:number;outputBytes:number;outputTokens:number|null;reasoningTokens:number|null;textField:typeof textFields[number]|null};
const object=(raw:unknown):Record<string,unknown>|null=>raw!==null&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:null;
const count=(raw:unknown)=>Number.isSafeInteger(raw)&&Number(raw)>=0&&Number(raw)<=100_000_000;
export function readBundleResponseDiagnostic(raw:unknown):BundleResponseDiagnostic|null{
 const value=object(raw);if(!value||Object.keys(value).sort().join()!=='incompleteReason,outputBytes,outputTokenLimit,outputTokens,reason,reasoningTokens,status,textField,version'||value.version!==1||!bundleResponseReasons.includes(value.reason as BundleResponseDiagnostic['reason'])||!statuses.includes(value.status as BundleResponseDiagnostic['status'])||value.incompleteReason!==null&&!incompleteReasons.includes(value.incompleteReason as NonNullable<BundleResponseDiagnostic['incompleteReason']>)||value.textField!==null&&!textFields.includes(value.textField as NonNullable<BundleResponseDiagnostic['textField']>)||!count(value.outputTokenLimit)||!count(value.outputBytes)||value.outputTokens!==null&&!count(value.outputTokens)||value.reasoningTokens!==null&&!count(value.reasoningTokens))return null;
 return {...value} as BundleResponseDiagnostic;
}
export function bundleResponseDiagnostic(raw:unknown,reason:BundleResponseDiagnostic['reason'],outputTokenLimit:number,textField:BundleResponseDiagnostic['textField']=null):BundleResponseDiagnostic{
 const response=object(raw)??{},usage=object(response.usage)??{},incomplete=object(response.incomplete_details)?.reason;
 const safeCount=(value:unknown)=>count(value)?Number(value):null;
 return {version:1,reason,status:statuses.find(value=>value===response.status)??'unknown',incompleteReason:incomplete==null?null:incompleteReasons.find(value=>value===incomplete)??'other',outputTokenLimit,outputBytes:Math.min(100_000_000,new TextEncoder().encode(typeof response.output_text==='string'?response.output_text:'').length),outputTokens:safeCount(usage.output_tokens),reasoningTokens:safeCount(object(usage.output_tokens_details)?.reasoning_tokens),textField};
}
export function bundleResponseDiagnosticText(value:BundleResponseDiagnostic){
 return `Reason: ${value.reason}. Response status: ${value.status}. Incomplete reason: ${value.incompleteReason??'not supplied'}. Output limit: ${value.outputTokenLimit} tokens. Output: ${value.outputBytes} bytes; ${value.outputTokens??'unknown'} tokens, including ${value.reasoningTokens??'unknown'} reasoning tokens.${value.textField?` Incomplete field: ${value.textField}.`:''}`;
}
