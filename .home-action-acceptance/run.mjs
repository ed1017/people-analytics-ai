import {createHash,randomBytes} from 'node:crypto';
import {providerReceiptOutput} from '../tests/helpers/swp-preview-receipt-log.mjs';
import {requirePrivateReview} from './private-review.mjs';
import {firstRequest,checkReply,fixture,semanticChecks} from './fixture.mjs';
import {loadRoute} from './route.mjs';
import {businessPlanningTools,businessPlanningInstructions} from '../lib/home-business-planning.ts';
import {solutionPlanningInstructions} from '../lib/home-solution-planning.ts';
import {solutionConversationInstructions,solutionResponseFormat,solutionTools} from '../lib/home-solution-conversation-schema.ts';
import {progressModelContract} from '../lib/goal-progress-entry-service.ts';
import {createAggregateReader,evidenceFor} from './aggregate.mjs';
import {safeFailure,recordReceipt,observeResponse,safeStatus,safeRequestId} from './diagnostics.mjs';

export const hash = value => createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
export const limits = Object.freeze({turns:1,generationAttempts:3,countAttempts:0,inputTokensPerCall:1050000,
  outputTokensPerCall:5000,batchTimeoutMs:180000,payloadBytes:160000,
  reservationMicrousd:17572500,priorExposureMicrousd:29948896,remainingMicrousd:20051104,totalCapMicrousd:50000000});
export const model = Object.freeze({id:'gpt-6.1-sol',reasoning:'medium',serviceTier:'default',
  tierSource:'Actual app route policy; no test-only billing override.'});
export const apiBase = 'https://api.openai.com/v1';
const same = (a,b) => hash(a)===hash(b);
const integer = v => Number.isSafeInteger(v)&&v>=0;
const safeId = value => typeof value==='string'&&/^(?:req_|resp_|dpl_|prj_)[A-Za-z0-9_-]{1,160}$/.test(value)?value:null;
function safeUsage(usage) {
  if (!usage || typeof usage!=='object') return null;
  return {input_tokens:integer(usage.input_tokens)?usage.input_tokens:null,
    output_tokens:integer(usage.output_tokens)?usage.output_tokens:null,total_tokens:integer(usage.total_tokens)?usage.total_tokens:null,
    input_tokens_details:{cached_tokens:integer(usage.input_tokens_details?.cached_tokens)?usage.input_tokens_details.cached_tokens:null},
    output_tokens_details:{reasoning_tokens:integer(usage.output_tokens_details?.reasoning_tokens)?usage.output_tokens_details.reasoning_tokens:null}};
}
export function createBoundary({client,record,runId,signal,expiresAt,now=Date.now,requireWireProof=false,aggregateReader,phase='aggregate-verification',privateReview}) {
  if(!Number.isSafeInteger(expiresAt))throw Error('reservation_expired');
  if(!aggregateReader||!['aggregate-verification','model-assessment'].includes(phase))throw Error('aggregate_phase_invalid');
  const report = {fixtureId:fixture.id,phase,aggregateVerificationPassed:false,model,limits,generationAttempts:0,wireAttempts:0,countAttempts:0,
    sdkRetries:0,databaseAttempts:0,completedTurns:[],partial:true,executionComplete:false,
    inputTokens:0,outputTokens:0,knownUsageUpperEstimateMicrousd:0,budgetClosure:'pending-external-review',
    reservationRetainedMicrousd:phase==='model-assessment'?limits.reservationMicrousd:0,attemptAmbiguous:false,
    comparisonOnly:true,checkedPlanCount:null,threePlanAcceptance:'not-assessed',fullAcceptance:false,semanticReview:'pending',semanticChecks,browserAcceptance:false,productionTierParity:false,appRouteTierParity:true,actualAppRequestConstructor:true,hostedBrowserRun:false,
    acceptedForScenario:false,goalSaved:false,validatedUsage:[],unpricedUsageAttempts:[],receiptFailures:[]};
  let current=null,turn=0,failed=null,busy=false,wireExpected=null,wireCount=0,lastTurn=-1;
  let diagnostic={stage:'request_validation',startedAt:now(),httpStatus:null,requestId:null};
  const finalAnswers=new Map();
  const stop = code => { report.stopReason??=code;failed ??= Error(code); throw failed; };
  const checkExpiry = () => {
    const time=now();
    if(!Number.isFinite(time)||time>=expiresAt)stop('reservation_expired');
  };
  const emit = (stage,value) => recordReceipt(record,stage,structuredClone(value));
  const boundary = {
    report,
    routeDiagnostic(value){report.appFailureDiagnostic=structuredClone(value);},
    observeResponse(response){if(!busy||wireCount!==1)stop('transport_scope_or_attempt_ambiguity');return observeResponse(response,diagnostic);},
    finalForTurn:index=>structuredClone(finalAnswers.get(index)),
    beginTurn(request,index) { if(failed||busy)stop('stopped_or_overlapping_turn');if(!Number.isInteger(index)||index<0||index>=limits.turns||index!==lastTurn+1)stop('invalid_or_repeated_turn');lastTurn=index;current=request;turn=index+1; },
    checkClient(options) { if(options.maxRetries!==0||options.apiKey!=='build-owned-transport'||Object.keys(options).sort().join(',')!=='apiKey,maxRetries')stop('route_client_options_changed');
      checkExpiry();aggregateReader.verified();report.aggregateVerificationPassed=true;
      if(phase==='aggregate-verification')stop('aggregate_verification_complete');
    },
    aggregateGET:request=>aggregateReader.GET(request),
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
      diagnostic.stage='dispatch';
    },
    async create(payload,options) {
      if(failed)throw failed;
      if(!report.aggregateVerificationPassed||phase!=='model-assessment')stop('aggregate_verification_required');
      if(busy)stop('overlapping_generation');
      signal.throwIfAborted();options.signal.throwIfAborted();
      checkExpiry(); // Every generation attempt, including later turns/tool rounds.
      if(!current||report.generationAttempts>=limits.generationAttempts)stop('global_attempt_limit');
      const progress=progressModelContract(false),tools=[...solutionTools,...progress.tools,...businessPlanningTools];
      const instructions=solutionConversationInstructions+progress.instructions+solutionPlanningInstructions(current,null)+'\n'+businessPlanningInstructions;
      if(Object.keys(payload).sort().join(',')!=='input,instructions,max_output_tokens,model,parallel_tool_calls,reasoning,service_tier,text,tool_choice,tools'||
         payload.model!==model.id||payload.service_tier!==model.serviceTier||!same(payload.reasoning,{effort:model.reasoning})||payload.max_output_tokens!==5000||
         payload.parallel_tool_calls!==false||!['auto','none'].includes(payload.tool_choice)||
         payload.instructions!==instructions||
         !same(payload.tools,tools)||!same(payload.text,{format:solutionResponseFormat})||
         options.maxRetries!==0||options.timeout!==30000||Object.keys(options).sort().join(',')!=='maxRetries,signal,timeout')stop('actual_route_payload_changed');
      for(const item of payload.input) if(item.type==='function_call_output') {
        const result=JSON.parse(item.output);
        if(result?.ok===false) {emit('tool-failure-'+turn,{turn,resultSha256:hash(result)});stop('checked_tool_failed');}
      }
      // Forward the app payload unchanged, including its own Standard tier.
      const outbound=payload;
      const payloadMetrics={serializedBytes:Buffer.byteLength(JSON.stringify(outbound)),inputBytes:Buffer.byteLength(JSON.stringify(payload.input)),
        instructionsBytes:Buffer.byteLength(payload.instructions),toolSchemaBytes:Buffer.byteLength(JSON.stringify(payload.tools))};
      if(payloadMetrics.serializedBytes>limits.payloadBytes)stop('payload_limit');
      const attempt=++report.generationAttempts; // Consumed BEFORE record, SDK invocation or wire dispatch.
      diagnostic={stage:'dispatch',startedAt:now(),httpStatus:null,requestId:null};
      report.attemptAmbiguous=true;busy=true;wireExpected=structuredClone(outbound);wireCount=0;
      const clientRequestId=runId+'-generation-'+attempt;
      try {
        emit('before-generation-'+attempt,{turn,attempt,clientRequestId,model,testOnlyBillingOverride:false,
          payloadSha256:hash(outbound),payloadMetrics,reservationMicrousd:limits.reservationMicrousd});
        signal.throwIfAborted();options.signal.throwIfAborted();
        checkExpiry(); // Receipt IO cannot extend the authorization window.
        const generated=await client.responses.create(outbound,{...options,
          signal:AbortSignal.any([signal,options.signal]),headers:{'X-Client-Request-Id':clientRequestId}}).withResponse();
        const response=generated.data,usage=safeUsage(response?.usage),requestId=safeId(generated.request_id);
        diagnostic.httpStatus=safeStatus(generated.response?.status)??diagnostic.httpStatus;
        diagnostic.requestId=safeRequestId(generated.request_id)??diagnostic.requestId;
        diagnostic.stage='json_validation';
        const validUsage=!!requestId&&!!safeId(response?.id)&&!!usage&&integer(usage.input_tokens)&&integer(usage.output_tokens)&&
          integer(usage.total_tokens)&&usage.total_tokens===usage.input_tokens+usage.output_tokens&&
          usage.input_tokens<=limits.inputTokensPerCall&&usage.output_tokens<=limits.outputTokensPerCall&&
          (usage.input_tokens_details.cached_tokens===null||usage.input_tokens_details.cached_tokens<=usage.input_tokens)&&
          (usage.output_tokens_details.reasoning_tokens===null||usage.output_tokens_details.reasoning_tokens<=usage.output_tokens)&&
          (!requireWireProof||wireCount===1);
        const priceIdentityVerified=response?.model===model.id&&response?.service_tier===model.serviceTier;
        if(validUsage){
          const retained={turn,attempt,clientRequestId,requestId,responseId:safeId(response.id),httpStatus:diagnostic.httpStatus,
            actualModel:typeof response.model==='string'&&response.model===model.id?model.id:null,
            actualServiceTier:response.service_tier==='default'?'default':null,usage,usageKnown:true,priceIdentityVerified,
            pricedUpperEstimateMicrousd:priceIdentityVerified?Math.ceil((usage.input_tokens*5+usage.output_tokens*15)*11/10):null,usageReceiptRecorded:false};
          report.validatedUsage.push(retained);
          report.inputTokens+=usage.input_tokens;report.outputTokens+=usage.output_tokens;
          if(!priceIdentityVerified){
            report.unpricedUsageAttempts.push(attempt);report.knownUsageUpperEstimateMicrousd=null;
          }else if(report.knownUsageUpperEstimateMicrousd!==null)report.knownUsageUpperEstimateMicrousd+=retained.pricedUpperEstimateMicrousd;
          // Small independent receipt precedes verbose output/receipt processing.
          emit('usage-'+attempt,{...retained,usageReceiptRecorded:true});
          retained.usageReceiptRecorded=true;report.attemptAmbiguous=!priceIdentityVerified;
        }
        privateReview.write('provider-'+attempt,{attempt,payloadMetrics,status:response?.status??null,output:providerReceiptOutput(response?.output??[]),outputText:response?.output_text??null});
        emit('generation-'+attempt,{turn,attempt,clientRequestId,requestId,
          httpStatus:Number.isInteger(generated.response?.status)?generated.response.status:null,
          responseId:safeId(response?.id),actualModel:response?.model===model.id?model.id:null,
          actualServiceTier:response?.service_tier===model.serviceTier?model.serviceTier:null,
          status:['completed','incomplete','failed'].includes(response?.status)?response.status:null,usage,
          responseSha256:hash(response??null),outputSha256:hash(response?.output??null),rawOutputRetained:false,privateVisibleOutputRetained:true,
          omittedProviderInternals:true,requestedModel:model,testOnlyBillingOverride:false});
        if(!validUsage)stop('usage_or_attempt_ambiguity');
        if(response.model!==model.id||response.service_tier!=='default'||response.status!=='completed'||
           generated.response.status<200||generated.response.status>=300||!Array.isArray(response.output))stop('model_tier_or_completion_mismatch');
        const allowed=['read_clock','read_evidence','evaluate_candidate','revise_parameters'];
        if(response.output.some(item=>item.type==='function_call'&&!allowed.includes(item.name)))stop('tool_outside_acceptance_scope');
        if(!response.output.some(item=>item.type==='function_call'))finalAnswers.set(turn-1,JSON.parse(response.output_text));
        signal.throwIfAborted();options.signal.throwIfAborted();
        return response;
      } catch(error) {
        failed??=error;
        const failure=safeFailure(error,diagnostic,now());report.lastAttemptFailure=failure;
        try{emit('attempt-stop-'+attempt,{turn,attempt,attemptAmbiguous:report.attemptAmbiguous,...failure});}
        catch(receiptError){report.receiptFailures.push(safeFailure(receiptError,diagnostic,now()));}
        throw error;
      } finally {busy=false;wireExpected=null;}
    },
  };
  return boundary;
}
export async function runDiagnostic({code,client,record,runId,expiresAt,now=Date.now,requireWireProof=false,bindBoundary=()=>{},
 phase='aggregate-verification',aggregateDispatch,approvedAggregateSha256=null,privateReview,signal:outer=new AbortController().signal}) {
  if(!['aggregate-verification','model-assessment'].includes(phase)||phase==='model-assessment'&&!/^[a-f0-9]{64}$/.test(approvedAggregateSha256??''))throw Error('aggregate_approval_required');
  requirePrivateReview(privateReview);
  const signal=AbortSignal.any([outer,AbortSignal.timeout(limits.batchTimeoutMs)]);
  const aggregate=createAggregateReader({dispatch:aggregateDispatch,signal,approvedAggregateSha256,now});
  const boundary=createBoundary({client,record,runId,signal,expiresAt,now,requireWireProof,aggregateReader:aggregate,phase,privateReview});bindBoundary(boundary);
  const report=boundary.report,POST=loadRoute(code,boundary);
  try {
    signal.throwIfAborted();if(now()>=expiresAt)throw Error('reservation_expired');
    const observed=await aggregate.initial(),request=firstRequest(evidenceFor(observed)),requestHash=hash(request);
    privateReview.write('request',{request,aggregate:observed});
    boundary.beginTurn(request,0);
    recordReceipt(record,'aggregate',aggregate.provenance());
    recordReceipt(record,'before-turn-1',{turn:1,requestSha256:requestHash});
    const response=await POST(new Request('http://build-only.invalid/api/home-solution-conversation',{
      method:'POST',headers:{'content-type':'application/json','x-workforce-dataset':fixture.datasetToken},body:JSON.stringify(request),signal}));
    const replyText=await response.text(),reply=JSON.parse(replyText);
    privateReview.write('reply',{replyText,httpStatus:response.status,datasetToken:response.headers.get('x-workforce-dataset')});
    recordReceipt(record,'route-reply-1',{turn:1,httpStatus:response.status,datasetToken:response.headers.get('x-workforce-dataset'),replySha256:hash(replyText)});
    if(phase==='aggregate-verification'){
      if(!report.aggregateVerificationPassed||report.generationAttempts!==0||report.wireAttempts!==0||response.status!==422)throw Error('aggregate_verification_required');
      const nonce=randomBytes(32).toString('hex');privateReview.write('canary',{nonce});report.privateCanaryNonceSha256=hash(nonce);
      report.zeroProviderCheckpoint=true;report.budgetClosure='not-applicable-zero-provider';
    }else{
      if(response.status!==200)throw Error('actual_route_failed');
      const final=boundary.finalForTurn(0),checks=await checkReply(request,reply,0,final);
      privateReview.write('checks',{final,checks});
      report.checkedPlanCount=checks.checkedPlanCount;report.threePlanAcceptance=checks.threePlanAcceptance;
      if(hash(request)!==requestHash||response.headers.get('x-workforce-dataset')!==fixture.datasetToken||reply.usage.modelRounds!==report.generationAttempts)throw Error('route_receipt_mismatch');
      recordReceipt(record,'checked-turn-1',{turn:1,requestSha256:requestHash,replySha256:hash(reply),
        structuralAcceptance:checks.structuralAcceptance,checkedPlanCount:checks.checkedProposals.length,
        checkedPlanReferencesSha256:hash(checks.checkedProposals),codeArithmeticVerified:checks.codeArithmeticVerified,finalReferencesChecked:true,
        comparisonOnly:true,threePlanAcceptance:checks.threePlanAcceptance,
        semanticReview:'pending',rawPlansRetained:false});
      report.completedTurns.push(1);
    }
    report.executionComplete=true;report.partial=false;
  } catch(error) { report.failure=safeFailure(error); }
  finally{aggregate.close();report.aggregate=aggregate.provenance();}
  report.privateReview=privateReview.finish(report);
  recordReceipt(record,'result',report);return report;
}
