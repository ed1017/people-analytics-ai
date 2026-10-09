import {createHash} from 'node:crypto';
import {firstRequest,secondRequest,checkReply,fixture} from './fixture.mjs';
import {loadRoute} from './route.mjs';
import {requestDemandContext,SWP_DEMAND_MODE} from '../lib/swp-demand.ts';
import {solutionPlanningInstructions} from '../lib/home-solution-planning.ts';
import {demandReferenceModelContract} from '../lib/swp-demand-reference.ts';
import {providerReceiptOutput} from '../tests/helpers/swp-preview-receipt-log.mjs';

export const hash = value => createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export const limits = Object.freeze({turns:2,generationAttempts:4,countAttempts:0,inputTokensPerCall:1050000,
  outputTokensPerCall:5000,batchTimeoutMs:180000,payloadBytes:160000,
  reservationMicrousd:23430000,priorRetainedMicrousd:23369877,remainingMicrousd:26630123,totalCapMicrousd:50000000});
export const model = Object.freeze({id:'gpt-6.1-sol',reasoning:'medium',serviceTier:'default',
  tierOverride:'Explicit test-only Standard billing override; production tier parity is not claimed.'});
export const apiBase = 'https://api.openai.com/v1';
const same = (a,b) => hash(a)===hash(b);
const integer = v => Number.isSafeInteger(v)&&v>=0;
const safeId = value => typeof value==='string'&&/^(?:req_|resp_|dpl_|prj_)[A-Za-z0-9_-]{1,160}$/.test(value)?value:null;
function safeFailure(error) { return {code:/^[a-z_]{1,70}$/.test(error?.message??'')?error.message:'provider_or_runtime_failure',
  httpStatus:Number.isInteger(error?.status)?error.status:null,requestId:safeId(error?.requestID??error?.request_id)}; }
function safeUsage(usage) {
  if (!usage || typeof usage!=='object') return null;
  return {input_tokens:integer(usage.input_tokens)?usage.input_tokens:null,
    output_tokens:integer(usage.output_tokens)?usage.output_tokens:null,total_tokens:integer(usage.total_tokens)?usage.total_tokens:null,
    input_tokens_details:{cached_tokens:integer(usage.input_tokens_details?.cached_tokens)?usage.input_tokens_details.cached_tokens:null},
    output_tokens_details:{reasoning_tokens:integer(usage.output_tokens_details?.reasoning_tokens)?usage.output_tokens_details.reasoning_tokens:null}};
}
function visibleOutput(output) {
  // Reuse the frozen receipt projection after checking shape; omit reasoning and SDK internals.
  return providerReceiptOutput((Array.isArray(output)?output:[]).filter(item=>item&&typeof item==='object').map(item=>
    item.type==='message'?{...item,content:Array.isArray(item.content)?item.content.filter(part=>part&&typeof part==='object'):[]}:item));
}
export function createBoundary({client,record,runId,signal,expiresAt,now=Date.now,requireWireProof=false}) {
  if(!Number.isSafeInteger(expiresAt))throw Error('reservation_expired');
  const report = {fixtureId:fixture.id,model,limits,generationAttempts:0,wireAttempts:0,countAttempts:0,
    sdkRetries:0,databaseAttempts:0,completedTurns:[],partial:true,executionComplete:false,
    inputTokens:0,outputTokens:0,knownUsageUpperEstimateMicrousd:0,budgetClosure:'pending-external-review',
    reservationRetainedMicrousd:limits.reservationMicrousd,attemptAmbiguous:false,
    fullAcceptance:false,semanticReview:'pending',browserAcceptance:false,productionTierParity:false,
    acceptedForScenario:false,goalSaved:false};
  let current=null,turn=0,failed=null,busy=false,wireExpected=null,wireCount=0;
  const stop = code => { report.stopReason??=code;failed ??= Error(code); throw failed; };
  const checkExpiry = () => {
    const time=now();
    if(!Number.isFinite(time)||time>=expiresAt)stop('reservation_expired');
  };
  const emit = (stage,value) => record(stage,structuredClone(value));
  const boundary = {
    report,
    beginTurn(request,index) { if(failed||busy)stop('stopped_or_overlapping_turn');current=request;turn=index+1; },
    checkClient(options) { if(options.maxRetries!==0||options.apiKey!=='build-owned-transport'||Object.keys(options).sort().join(',')!=='apiKey,maxRetries')stop('route_client_options_changed'); },
    forbiddenDatabase() { report.databaseAttempts++;stop('database_forbidden'); },
    verifyTransport(input,init) {
      checkExpiry();signal.throwIfAborted(); // Immediately before the actual outgoing request.
      const url = new URL(typeof input==='string'||input instanceof URL?input:input.url);
      if(!busy||!wireExpected||wireCount!==0||url.origin!=='https://api.openai.com'||url.pathname!=='/v1/responses'||url.search||
         init?.method!=='POST'||typeof init.body!=='string'||!same(JSON.parse(init.body),wireExpected))stop('transport_scope_or_attempt_ambiguity');
      if(requireWireProof) {
        const headers=new Headers(init.headers);
        if(headers.get('x-client-request-id')!==runId+'-generation-'+report.generationAttempts||headers.get('x-stainless-retry-count')!=='0')stop('wire_request_identity_or_retry_changed');
      }
      wireCount++;report.wireAttempts++;
    },
    async create(payload,options) {
      if(failed)throw failed;
      if(busy)stop('overlapping_generation');
      signal.throwIfAborted();options.signal.throwIfAborted();
      checkExpiry(); // Every generation attempt, including later turns/tool rounds.
      if(!current||report.generationAttempts>=limits.generationAttempts)stop('global_attempt_limit');
      const context=requestDemandContext(current,fixture.datasetToken);
      if(Object.keys(payload).sort().join(',')!=='input,instructions,max_output_tokens,model,parallel_tool_calls,reasoning,text,tool_choice,tools'||
         payload.model!==model.id||!same(payload.reasoning,{effort:model.reasoning})||payload.max_output_tokens!==5000||
         payload.parallel_tool_calls!==false||!['auto','none'].includes(payload.tool_choice)||
         payload.instructions!==demandReferenceModelContract.instructions+solutionPlanningInstructions(current,context)||
         !same(payload.tools,demandReferenceModelContract.tools)||!same(payload.text,{format:demandReferenceModelContract.responseFormat})||
         options.maxRetries!==0||options.timeout!==30000||Object.keys(options).sort().join(',')!=='maxRetries,signal,timeout')stop('actual_route_payload_changed');
      for(const item of payload.input) if(item.type==='function_call_output') {
        const result=JSON.parse(item.output);
        if(result?.ok===false) {emit('tool-failure-'+turn,{turn,result});stop('checked_tool_failed');}
      }
      // This is the sole test adaptation to the actual app model payload.
      const outbound={...payload,service_tier:'default'};
      if(Buffer.byteLength(JSON.stringify(outbound))>limits.payloadBytes)stop('payload_limit');
      const attempt=++report.generationAttempts; // Consumed BEFORE record, SDK invocation or wire dispatch.
      report.attemptAmbiguous=true;busy=true;wireExpected=structuredClone(outbound);wireCount=0;
      const clientRequestId=runId+'-generation-'+attempt;
      try {
        emit('before-generation-'+attempt,{turn,attempt,clientRequestId,model,testOnlyBillingOverride:true,
          payload:outbound,payloadSha256:hash(outbound),reservationMicrousd:limits.reservationMicrousd});
        signal.throwIfAborted();options.signal.throwIfAborted();
        checkExpiry(); // Receipt IO cannot extend the authorization window.
        const generated=await client.responses.create(outbound,{...options,
          signal:AbortSignal.any([signal,options.signal]),headers:{'X-Client-Request-Id':clientRequestId}}).withResponse();
        const response=generated.data,usage=safeUsage(response?.usage),requestId=safeId(generated.request_id);
        emit('generation-'+attempt,{turn,attempt,clientRequestId,requestId,
          httpStatus:Number.isInteger(generated.response?.status)?generated.response.status:null,
          responseId:safeId(response?.id),actualModel:typeof response?.model==='string'?response.model:null,
          actualServiceTier:typeof response?.service_tier==='string'?response.service_tier:null,
          status:typeof response?.status==='string'?response.status:null,usage,
          output:visibleOutput(response?.output),
          outputText:typeof response?.output_text==='string'?response.output_text:null,
          omittedProviderInternals:true,requestedModel:model,testOnlyBillingOverride:true});
        if(!requestId||!safeId(response?.id)||!usage||!integer(usage.input_tokens)||!integer(usage.output_tokens)||
           !integer(usage.total_tokens)||usage.total_tokens!==usage.input_tokens+usage.output_tokens||
           usage.input_tokens>limits.inputTokensPerCall||usage.output_tokens>limits.outputTokensPerCall||
           (usage.input_tokens_details.cached_tokens!==null&&usage.input_tokens_details.cached_tokens>usage.input_tokens)||
           (usage.output_tokens_details.reasoning_tokens!==null&&usage.output_tokens_details.reasoning_tokens>usage.output_tokens)||
           (requireWireProof&&wireCount!==1))stop('usage_or_attempt_ambiguity');
        report.inputTokens+=usage.input_tokens;report.outputTokens+=usage.output_tokens;
        report.knownUsageUpperEstimateMicrousd+=Math.ceil((usage.input_tokens*5+usage.output_tokens*15)*11/10);
        report.attemptAmbiguous=false;
        if(response.model!==model.id||response.service_tier!=='default'||response.status!=='completed'||
           generated.response.status<200||generated.response.status>=300||!Array.isArray(response.output))stop('model_tier_or_completion_mismatch');
        signal.throwIfAborted();options.signal.throwIfAborted();
        return response;
      } catch(error) {
        failed??=error;
        emit('attempt-stop-'+attempt,{turn,attempt,attemptAmbiguous:report.attemptAmbiguous,...safeFailure(error)});
        throw error;
      } finally {busy=false;wireExpected=null;}
    },
  };
  return boundary;
}
export async function runTwoTurns({code,client,record,runId,expiresAt,now=Date.now,requireWireProof=false,bindBoundary=()=>{},signal:outer=new AbortController().signal}) {
  const signal=AbortSignal.any([outer,AbortSignal.timeout(limits.batchTimeoutMs)]);
  const boundary=createBoundary({client,record,runId,signal,expiresAt,now,requireWireProof});bindBoundary(boundary);
  const report=boundary.report,POST=loadRoute(code,boundary);let first=null;
  try {
    for(let index=0;index<2;index++) {
      signal.throwIfAborted();const request=index===0?firstRequest():secondRequest(first),requestHash=hash(request);
      boundary.beginTurn(request,index);record('before-turn-'+(index+1),{turn:index+1,request,requestSha256:requestHash});
      const before=report.generationAttempts;
      const response=await POST(new Request('http://build-only.invalid/api/home-solution-conversation',{
        method:'POST',headers:{'content-type':'application/json','x-workforce-conversation':SWP_DEMAND_MODE,
          'x-workforce-dataset':fixture.datasetToken},body:JSON.stringify(request),signal}));
      const reply=await response.json();
      record('route-reply-'+(index+1),{turn:index+1,httpStatus:response.status,
        datasetToken:response.headers.get('x-workforce-dataset'),reply});
      if(response.status!==200)throw Error('actual_route_failed');
      const checks=checkReply(request,reply);
      if(hash(request)!==requestHash||response.headers.get('x-workforce-dataset')!==fixture.datasetToken||
         reply.usage.modelRounds!==report.generationAttempts-before)throw Error('route_receipt_mismatch');
      record('checked-turn-'+(index+1),{turn:index+1,requestSha256:requestHash,replySha256:hash(reply),checks});
      report.completedTurns.push(index+1);if(index===0)first=reply;
    }
    report.executionComplete=true;report.partial=false;
  } catch(error) { report.failure=safeFailure(error); }
  record('result',report);return report;
}
