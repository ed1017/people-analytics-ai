import {APIError,APIConnectionError,APIConnectionTimeoutError,APIUserAbortError} from 'openai/core/error';
/** Server diagnostics are projections of fixed codes and bounded counters, never error text. */
const readers = ['dashboard','workforce','attrition','talent-acquisition','survey-sentiment','skills','learning-development','career-mobility','career-growth-mobility','succession-coverage','workforce-planning','position-modeling','finance','bls'] as const;
const triggers = ['deadline','cancelled','reader_failed','dataset_mismatch','scope_mismatch','facts_changed','verification_failed'] as const;
const readFailures = ['http_error','mixed_dataset','invalid_json','unavailable_result','exception'] as const;
type Stage = 'request_validation'|'configuration'|'grounding'|'model_setup'|'conversation_preparation'|'provider'|'response_validation';
const stages:Stage[] = ['request_validation','configuration','grounding','model_setup','conversation_preparation','provider','response_validation'];
const record = (value:unknown):Record<string,unknown> => value && typeof value==='object' ? value as Record<string,unknown> : {};
const member = <T extends string>(value:unknown,choices:readonly T[]):T|null => typeof value==='string' ? choices.find(item=>item===value)??null : null;
const bounded = (value:unknown,max:number) => typeof value==='number'&&Number.isFinite(value) ? Math.min(max,Math.max(0,Math.floor(value))) : 0;
const httpStatus = (value:unknown) => typeof value==='number'&&Number.isInteger(value)&&value>=400&&value<=599 ? value : null;
const read = (value:unknown,key:string):unknown => {try{return value!==null&&(typeof value==='object'||typeof value==='function')?(value as Record<string,unknown>)[key]:undefined;}catch{return undefined;}};
const providerClasses=['APIConnectionTimeoutError','APIConnectionError','APIUserAbortError','APIError','BadRequestError','AuthenticationError','PermissionDeniedError','NotFoundError','ConflictError','UnprocessableEntityError','RateLimitError','InternalServerError','SyntaxError','TypeError','RangeError','AbortError','TimeoutError','Error'] as const;
const connectionCodes=['ECONNRESET','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','ETIMEDOUT','EPIPE','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','UND_ERR_SOCKET','UND_ERR_ABORTED','ABORT_ERR'] as const;
function providerFailureDetails(error:unknown){
 // SDK 7.23.0 subclasses inherit name="Error". Identity survives minification;
 // bounded constructor/name fallbacks also cover a second SDK copy or realm.
 let errorClass:typeof providerClasses[number]|null=null;
 try{
  errorClass=error instanceof APIConnectionTimeoutError?'APIConnectionTimeoutError':error instanceof APIConnectionError?'APIConnectionError':error instanceof APIUserAbortError?'APIUserAbortError':error instanceof APIError?'APIError':null;
 }catch{/* A hostile prototype/getter must not replace the original failure. */}
 errorClass??=member(read(read(error,'constructor'),'name'),providerClasses);
 if(errorClass===null||errorClass==='Error')errorClass=member(read(error,'name'),providerClasses)??errorClass;
 const status=httpStatus(read(error,'status')),cause=read(error,'cause');
 const causeCode=[read(error,'code'),read(cause,'code'),read(read(cause,'cause'),'code')].map(value=>member(value,connectionCodes)).find(value=>value!==null)??null;
 const kind=errorClass==='APIConnectionTimeoutError'||errorClass==='TimeoutError'?'timeout':errorClass==='APIConnectionError'?'connection':errorClass==='APIUserAbortError'||errorClass==='AbortError'?'aborted':status!==null?'http':'other';
 return {kind,errorClass,causeCode,status};
}

/** Also applied at the log boundary; adding properties to an error never expands logging. */
export function groundingFailureDetails(value:unknown){
 const raw=record(value);
 return Object.freeze({trigger:member(raw.trigger,triggers)??'verification_failed',reader:member(raw.reader,readers),
  elapsedMs:bounded(raw.elapsedMs,600000),readerElapsedMs:raw.readerElapsedMs==null?null:bounded(raw.readerElapsedMs,600000),
  readersStarted:bounded(raw.readersStarted,readers.length),readersCompleted:bounded(raw.readersCompleted,readers.length),
  readFailure:member(raw.readFailure,readFailures),httpStatus:httpStatus(raw.httpStatus),
  activeReaders:(Array.isArray(raw.activeReaders)?raw.activeReaders:[]).slice(0,2).flatMap(item=>{
   const entry=record(item),reader=member(entry.reader,readers);return reader?[{reader,elapsedMs:bounded(entry.elapsedMs,600000)}]:[];
  })});
}

export function createSolutionDiagnostics(){
 const correlationId=crypto.randomUUID(),startedAt=Date.now();let stage:Stage='request_validation',modelAttempts=0,attemptStartedAt:number|null=null,reported=false;
 return {
  stage(value:Stage){stage=member(value,stages)??'request_validation';},
  modelAttempt(){stage='provider';modelAttempts=Math.min(4,modelAttempts+1);attemptStartedAt=Date.now();},
  failure(error:unknown,grounding:unknown,callerAborted:boolean,deadlineAborted:boolean){
   const evidence=grounding==null?null:groundingFailureDetails(grounding);
   // Classification only; no messages, stacks, request/response bodies or headers.
   const provider=stage==='provider'?providerFailureDetails(error):null,providerKind=provider?.kind??null;
   const code=evidence?'evidence_'+evidence.trigger:callerAborted?'conversation_cancelled':deadlineAborted?'conversation_deadline':
    stage==='provider'?'provider_'+(providerKind==='http'?'http_error':providerKind==='other'?'failed':providerKind):
    ({request_validation:'invalid_request',configuration:'configuration_unavailable',grounding:'evidence_verification_failed',model_setup:'model_setup_failed',conversation_preparation:'conversation_preparation_failed',response_validation:'response_validation_failed'} as const)[stage];
   const diagnostic={version:2,correlationId,code,stage,elapsedMs:bounded(Date.now()-startedAt,600000),modelAttempts,
    // An SDK attempt is not proof of a wire dispatch, provider receipt, usage or spend.
    providerKind,providerHttpStatus:provider?.status??null,providerErrorClass:provider?.errorClass??null,providerCauseCode:provider?.causeCode??null,
    providerElapsedMs:provider&&attemptStartedAt!==null?bounded(Date.now()-attemptStartedAt,600000):null,grounding:evidence};
   if(!reported){reported=true;try{console.error('Home solution conversation failed',diagnostic);}catch{/* Logging cannot change the failure response. */}}
   return {code,correlationId};
  },
 };
}
