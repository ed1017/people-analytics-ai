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
const count=(value:unknown,max:number):number|null=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?Math.min(value,max):null;
const providerModels=['gpt-6.1-sol'] as const;
const providerTiers=['default','standard','auto','flex','scale','priority','fast','ultrafast'] as const;
type ProviderRound={attempt:number;elapsedMs:number;inputBytes:number|null;instructionsBytes:number|null;toolSchemaBytes:number|null;model:string|null;serviceTier:string|null;inputTokens:number|null;cachedInputTokens:number|null;outputTokens:number|null;reasoningTokens:number|null;totalTokens:number|null};
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
 let stageStartedAt=startedAt,requestSizes={inputBytes:null,instructionsBytes:null,toolSchemaBytes:null} as Pick<ProviderRound,'inputBytes'|'instructionsBytes'|'toolSchemaBytes'>;
 const stageElapsedMs=Object.fromEntries(stages.map(key=>[key,0])) as Record<Stage,number>,providerRounds:ProviderRound[]=[];
 const closeStage=()=>{const at=Date.now();stageElapsedMs[stage]=bounded(stageElapsedMs[stage]+Math.max(0,at-stageStartedAt),600000);stageStartedAt=at;};
 const setStage=(value:Stage)=>{closeStage();stage=member(value,stages)??'request_validation';};
 return {
  stage:setStage,
  modelAttempt(sizes?:unknown){
   setStage('provider');modelAttempts=Math.min(4,modelAttempts+1);attemptStartedAt=Date.now();
   requestSizes={inputBytes:count(read(sizes,'inputBytes'),900000),instructionsBytes:count(read(sizes,'instructionsBytes'),900000),toolSchemaBytes:count(read(sizes,'toolSchemaBytes'),900000)};
  },
  providerResult(response:unknown){
   if(reported||attemptStartedAt===null||providerRounds.at(-1)?.attempt===modelAttempts||providerRounds.length===4)return;
   const usage=read(response,'usage');
   providerRounds.push({attempt:modelAttempts,elapsedMs:bounded(Date.now()-attemptStartedAt,600000),...requestSizes,
    model:member(read(response,'model'),providerModels),serviceTier:member(read(response,'service_tier'),providerTiers),
    inputTokens:count(read(usage,'input_tokens'),2000000),cachedInputTokens:count(read(read(usage,'input_tokens_details'),'cached_tokens'),2000000),
    outputTokens:count(read(usage,'output_tokens'),2000000),reasoningTokens:count(read(read(usage,'output_tokens_details'),'reasoning_tokens'),2000000),totalTokens:count(read(usage,'total_tokens'),4000000)});
  },
  success(usage:unknown){
   if(reported)return;reported=true;closeStage();
   // Numeric counters and allowlisted identifiers only; absent usage stays null.
   // response_validation includes local tool execution and continuation assembly.
   const diagnostic={version:1,correlationId,elapsedMs:bounded(Date.now()-startedAt,600000),stageElapsedMs:{...stageElapsedMs},modelAttempts,
    modelRounds:bounded(read(usage,'modelRounds'),4),toolCalls:bounded(read(usage,'toolCalls'),6),providerRounds:providerRounds.map(round=>({...round}))};
   try{console.info('Home solution conversation completed',diagnostic);}catch{/* Logging cannot change a successful response. */}
  },
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
