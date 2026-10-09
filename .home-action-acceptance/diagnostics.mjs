/** Bounded diagnostic metadata only. Never retain exception text, headers or bodies. */
const classes=new Set(['Error','TypeError','SyntaxError','RangeError','AbortError','TimeoutError','DOMException',
 'APIError','APIConnectionError','APIConnectionTimeoutError','APIUserAbortError','BadRequestError',
 'AuthenticationError','PermissionDeniedError','NotFoundError','ConflictError','UnprocessableEntityError',
 'RateLimitError','InternalServerError','ReceiptWriteError']);
const causeCodes=new Set(['ECONNRESET','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','ETIMEDOUT','EPIPE',
 'UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','UND_ERR_SOCKET',
 'UND_ERR_ABORTED','ABORT_ERR','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','DEPTH_ZERO_SELF_SIGNED_CERT',
 'EIO','ENOSPC','EDQUOT','EACCES','EPERM','EROFS','EEXIST','EMFILE','ENFILE']);
const localCodes=new Set(['private_review_required','private_review_invalid','private_review_size','private_review_retrieval_required','reservation_expired','stopped_or_overlapping_turn','invalid_or_repeated_turn',
 'route_client_options_changed','database_forbidden','transport_scope_or_attempt_ambiguity',
 'wire_request_identity_or_retry_changed','overlapping_generation','global_attempt_limit',
 'actual_route_payload_changed','checked_tool_failed','payload_limit','usage_or_attempt_ambiguity',
 'model_tier_or_completion_mismatch','tool_outside_acceptance_scope','actual_route_failed',
 'route_receipt_mismatch','receipt_write_failed','receipt_stage_invalid','replay_payload_requires_redaction',
 'transport_not_bound','wire_authentication_changed','unarmed','authorization_file_invalid',
 'legacy_arming_forbidden','unarmed_or_unbound_authorization','preview_identity_mismatch',
 'provider_override','reservation_formula_changed','runtime_changed','dependencies_changed',
 'source_entry_changed','source_inventory_changed','base_manifest_changed','base_file_changed',
 'base_membership_changed','build_config_or_output_changed','no_run_overrides','preview_key_unavailable',
 'nonempty_or_injected_request','reply_contract','three_current_proposals_required',
 'unblocked_current_evaluation_required','proposal_context_mismatch','duplicate_plan_activities',
 'aggregate_unavailable_or_changed','aggregate_transport_required','aggregate_phase_invalid','aggregate_verification_complete','aggregate_verification_required','aggregate_approval_required','current_proposals_required','unchecked_final_metric','replay_receipt_altered','replay_identity_mismatch','replay_checks_mismatch']);
const phases=new Set(['dispatch','response_read','json_validation','receipt_write','request_validation']);
const read=(value,key)=>{try{return value?.[key];}catch{return undefined;}};
export const safeStatus=value=>Number.isInteger(value)&&value>=100&&value<=599?value:null;
export const safeRequestId=value=>typeof value==='string'&&/^req_[A-Za-z0-9_-]{1,160}$/.test(value)&&
 !/(?:sk-|github_pat_|gh[pousr]_|bearer)/i.test(value)?value:null;
const classOf=error=>{
 const constructor=read(read(error,'constructor'),'name'),name=read(error,'name');
 if((constructor==='Error'||constructor==='DOMException')&&classes.has(name))return name;
 return classes.has(constructor)?constructor:classes.has(name)?name:'UnknownError';
};
const safeReceiptStage=value=>typeof value==='string'&&/^(?:claimed|aggregate|aggregate-verified|result|(?:before-turn|before-generation|generation|usage|attempt-stop|tool-failure|route-reply|checked-turn|replay)-[1-4])$/.test(value)?value:null;
export class ReceiptWriteError extends Error {
 constructor(stage,cause){super('receipt_write_failed');this.receiptStage=safeReceiptStage(stage);this.cause=cause;}
}
export function recordReceipt(record,stage,value){
 try{return record(stage,value);}catch(error){throw error instanceof ReceiptWriteError?error:new ReceiptWriteError(stage,error);}
}
export function safeFailure(error,context={},now=Date.now()){
 const errorClass=classOf(error),cause=read(error,'cause'),underlyingClass=cause?classOf(cause):null;
 const candidates=[read(error,'code'),read(cause,'code'),read(read(cause,'cause'),'code')];
 const causeCode=candidates.find(value=>causeCodes.has(value))??null;
 const timeout=errorClass==='APIConnectionTimeoutError'||errorClass==='TimeoutError'||
 ['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT'].includes(causeCode);
 const receipt=error instanceof ReceiptWriteError;
 const stage=receipt?'receipt_write':phases.has(context.stage)?context.stage:'request_validation';
 const httpStatus=safeStatus(read(error,'status'))??safeStatus(context.httpStatus);
 const requestId=safeRequestId(read(error,'requestID')??read(error,'request_id'))??safeRequestId(context.requestId);
 const message=read(error,'message');
 const code=localCodes.has(message)?message:'provider_or_runtime_failure';
 const source=receipt?'local_receipt':httpStatus!==null&&httpStatus>=400?'provider_http':
  localCodes.has(message)?'local_guard':stage==='dispatch'?'transport_or_sdk':'response_processing';
 const elapsed=now-context.startedAt;
 return {code,httpStatus,requestId,diagnostic:{errorClass,underlyingClass,causeCode,source,stage,timeout,
  elapsedMs:Number.isFinite(elapsed)&&elapsed>=0&&elapsed<=3600000?Math.floor(elapsed):null,
  receiptStage:receipt?safeReceiptStage(error.receiptStage):null}};
}
export function observeResponse(response,context){
 context.httpStatus=safeStatus(response.status);
 context.requestId=safeRequestId(response.headers.get('x-request-id'));
 context.stage='response_read';
 // Preserve the native Response and bind all native accessors/methods to it.
 // SDK 7.23.0 reads text before JSON.parse; no body is retained by this observer.
 return new Proxy(response,{get(target,key){
  if(key==='text')return async()=>{
   context.stage='response_read';const text=await target.text();
   context.stage=target.ok?'json_validation':'response_read';return text;
  };
  const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
 }});
}
