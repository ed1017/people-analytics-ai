/** Diagnostic adapter only. No provider import, HTTP route, DB loader or automatic execution. */
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {converseSolutions} from '../../../lib/home-solution-conversation-service.ts';
import {solutionConversationInstructions,solutionResponseFormat,solutionTools,solutionFinalSchema,assertSolutionShape} from '../../../lib/home-solution-conversation-schema.ts';
import {solutionPlanningInstructions} from '../../../lib/home-solution-planning.ts';
import {businessPlanningInstructions} from '../../../lib/home-business-planning.ts';
import {hiringBudgetInstructions,readHiringBudgetReview,hiringBudgetView} from '../../../lib/home-hiring-budget.ts';
import {requiredStaffingInstructions} from '../../../lib/home-required-staffing.ts';
import {businessPlanningModelTools} from '../../../lib/home-model-tool-schemas.ts';
import {planningCalculationRef} from '../../../lib/guided-planning-adapters.ts';
import {prepareHiringPlan} from '../../../lib/home-hiring-plan-save.ts';
import {progressModelContract} from '../../../lib/goal-progress-entry-service.ts';
import {providerReceiptOutput} from '../../helpers/swp-preview-receipt-log.mjs';
import {fixture,fixtureRequest} from './fixture.mjs';
export const branch='codex/pr212-hiring-two-call-preview-20261011';
export const application='c682a5b2a57b44c681c29d4d8f3d3e7dac4fe99f';
export const limits=Object.freeze({generationCalls:2,countCalls:0,rounds:2,tools:1,contextTokensPerCall:1050000,outputTokensPerCall:5000,sdkRetries:0,callTimeoutMs:60000,operationTimeoutMs:90000,reservedMicrousd:11715000,userCapMicrousd:11720000,perCallReservationMicrousd:5857500});
export const hash=value=>createHash('sha256').update(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const fail=code=>{const error=Error('Protected hiring Preview stopped: '+code);error.code=code;throw error;};
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
export const diagnosticFiles=['tests/diagnostics/hiring-preview/application-files.json','tests/diagnostics/hiring-preview/fixture.mjs','tests/diagnostics/hiring-preview/guard.mjs','tests/diagnostics/hiring-preview/run.mjs','tests/diagnostics/hiring-preview/guard.test.mjs','tests/diagnostics/hiring-preview/plan.json','tests/diagnostics/hiring-preview/replay-browser.mjs','tests/fixtures/home-hiring-budget-client.tsx','tests/fixtures/typescript-browser-loader.mjs','tests/helpers/swp-preview-receipt-log.mjs','vercel.json'];
export function sourceManifest(root){
 const base=JSON.parse(readFileSync(join(root,diagnosticFiles[0]),'utf8'));if(base.commit!==application)fail('application_identity');
 const current=[];const walk=dir=>{for(const item of readdirSync(join(root,dir),{withFileTypes:true})){const path=dir+'/'+item.name;if(item.isDirectory())walk(path);else if(item.isFile())current.push(path);else fail('unexpected_source_entry');}};
 for(const dir of ['app','components','lib','public'])walk(dir);
 if(hash(current.sort())!==hash(Object.keys(base.files).filter(p=>/^(app|components|lib|public)\//.test(p)).sort()))fail('application_file_set_changed');
 for(const [path,digest] of Object.entries(base.files))if(hash(readFileSync(join(root,path)))!==digest)fail('application_source_changed');
 return Object.fromEntries([...Object.keys(base.files),...diagnosticFiles].sort().map(path=>[path,hash(readFileSync(join(root,path)))]));
}
export function unarmedManifest(root){return {version:1,kind:'pr212-hiring-two-call-preview',application,branch,fixtureSha256:hash(fixture),files:sourceManifest(root),limits,model:{id:'gpt-6.1-sol',reasoning:'medium',serviceTier:'default',testedConfigReceiptSha256:null},parentReserved:false,overlayReviewed:false,runId:null,reservationId:null,ledgerReceiptSha256:null,projectId:null,overlayCommit:null,reservedMicrousd:null,capMicrousd:limits.userCapMicrousd,createdAt:null,expiresAt:null};}
export function validateManifest(m,env,now=Date.now()){
 if(m?.version!==1||m.kind!=='pr212-hiring-two-call-preview'||m.application!==application||m.branch!==branch||m.fixtureSha256!==hash(fixture)||hash(m.limits)!==hash(limits))fail('manifest_identity');
 if(m.parentReserved!==true||m.overlayReviewed!==true||!uuid(m.runId)||!uuid(m.reservationId)||!hex(m.ledgerReceiptSha256)||m.reservedMicrousd!==limits.reservedMicrousd||m.capMicrousd!==limits.userCapMicrousd)fail('reservation_or_review_missing');
 if(m.model?.id!=='gpt-6.1-sol'||m.model.reasoning!=='medium'||m.model.serviceTier!=='default'||!hex(m.model.testedConfigReceiptSha256))fail('model_unverified');
 if(!/^[a-f0-9]{40}$/.test(m.overlayCommit??'')||env.VERCEL!=='1'||env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!==branch||env.VERCEL_GIT_COMMIT_SHA!==m.overlayCommit||!/^prj_[A-Za-z0-9]+$/.test(m.projectId??'')||env.VERCEL_PROJECT_ID!==m.projectId||!/^dpl_[A-Za-z0-9]+$/.test(env.VERCEL_DEPLOYMENT_ID??'')||env.HIRING_PREVIEW_RUN_ID!==m.runId)fail('wrong_preview');
 if(['OPENAI_BASE_URL','OPENAI_ORG_ID','OPENAI_PROJECT_ID','OPENAI_LOG'].some(key=>env[key]))fail('provider_override');
 const start=Date.parse(m.createdAt),end=Date.parse(m.expiresAt);if(!Number.isFinite(start)||!Number.isFinite(end)||start>now||now>=end||end<=start||end-start>3600000)fail('reservation_expired');
 return limits.reservedMicrousd;
}
const allowedKeys=['model','reasoning','service_tier','instructions','input','tools','text','tool_choice','parallel_tool_calls','max_output_tokens','truncation'];
export function modelPayload(request,input,finalOnly,capabilities){
 if(capabilities.requiredStaffingCalculation||capabilities.progressEntryEnabled)fail('unexpected_capability');
 const progress=progressModelContract(true,false);
 return {model:'gpt-6.1-sol',reasoning:{effort:'medium'},service_tier:'default',instructions:solutionConversationInstructions+progress.instructions+solutionPlanningInstructions(request,null)+'\n'+businessPlanningInstructions+'\n'+hiringBudgetInstructions+'\n'+requiredStaffingInstructions,input,tools:[...solutionTools,...progress.tools,...businessPlanningModelTools],text:{format:solutionResponseFormat},tool_choice:finalOnly?'none':'auto',parallel_tool_calls:false,max_output_tokens:5000,truncation:'disabled'};
}
export function createGuard(request){
 let attempts=0,phase='first',callId=null,expectedBinding=null,expectedView=null;
 const stop=code=>{phase='stopped';fail(code);};
 return {
  get attempts(){return attempts;},
  async before(payload,signal){
   signal.throwIfAborted();if(attempts>=2||!['first','calculation'].includes(phase))stop('call_limit_or_state');
   if(Object.keys(payload).some(k=>!allowedKeys.includes(k))||payload.model!=='gpt-6.1-sol'||payload.reasoning?.effort!=='medium'||payload.service_tier!=='default'||payload.max_output_tokens!==5000||payload.truncation!=='disabled'||payload.parallel_tool_calls!==false||!['auto','none'].includes(payload.tool_choice)||!Array.isArray(payload.tools)||payload.tools.some(t=>t.type!=='function'))stop('unsupported_provider_policy');
   if(phase==='calculation'){
    const outputs=payload.input.filter(item=>item.type==='function_call_output');if(outputs.length!==1||outputs[0].call_id!==callId)stop('missing_native_result');
    let result;try{result=JSON.parse(outputs[0].output);}catch{stop('invalid_native_result');}
    if(!result?.planningGuidance?.binding||!result.hiringBudget||result.ok===false)stop('failed_native_calculation');
    const binding=result.planningGuidance.binding;
    if(!expectedBinding||binding.reference!==expectedBinding.reference||hash(binding)!==hash(expectedBinding))stop('native_reference_mismatch');
    if(hash(result.hiringBudget)!==hash(expectedView)||result.hiringBudget.listedCost!==1540000||result.hiringBudget.budgetStatus!=='over')stop('native_subtotal_mismatch');
   }
   attempts++;phase='awaiting';return {maxRetries:0,timeout:limits.callTimeoutMs,signal};
  },
  failed(){phase='stopped';},
  async accept(response,items){
   if(phase!=='awaiting')stop('unexpected_response');
   if(response?.status!=='completed'||response.service_tier!=='default'||!Array.isArray(response.output))stop('incomplete_or_tier');
   const usage=response.usage;if(!usage||!Number.isSafeInteger(usage.input_tokens)||usage.input_tokens<0||usage.input_tokens>limits.contextTokensPerCall||!Number.isSafeInteger(usage.output_tokens)||usage.output_tokens<0||usage.output_tokens>5000)stop('invalid_usage');
   const calls=response.output.filter(item=>item.type==='function_call');
   if(attempts===1){
    if(calls.length!==1||calls[0].name!=='review_hiring_budget'||typeof calls[0].call_id!=='string'||response.output.some(item=>!['function_call','reasoning','message'].includes(item.type)))stop('invalid_first_tool');
    callId=calls[0].call_id;phase='calculation';
   }else{
    if(calls.length||response.output.some(item=>!['reasoning','message'].includes(item.type)))stop('second_response_has_tools');
    let final;try{final=JSON.parse(response.output_text);assertSolutionShape(final,solutionFinalSchema);}catch{stop('invalid_final');}
    if(!final.answer?.recommendedPlan||final.answer.recommendedPlan.calculationRefs.length!==1||final.answer.recommendedPlan.calculationRefs[0]!==expectedBinding?.reference||final.candidateIds.length||final.analysisIds.length||final.verifiedMetrics.length||final.constraintUpdates.length||final.rejected.length||final.focusCandidateId!==null)stop('invalid_final_reference');
    phase='done';
   }
   return {completed:true,items,calls:calls.map(c=>({id:c.call_id,name:c.name,arguments:c.arguments})),text:response.output_text};
  },
  async bindNative(state){
   if(phase!=='calculation')stop('unexpected_native_binding');
   const review=readHiringBudgetReview(state.hiringBudget);if(!review)stop('missing_hiring_review');
   for(const [key,value] of Object.entries(fixture.inputs))if(key==='role'?!/^engineers?$/i.test(review.inputs.role??''):review.inputs[key]!==value)stop('changed_fixture_input');
   for(const key of Object.keys(review.inputs).filter(key=>!Object.hasOwn(fixture.inputs,key)))if(review.inputs[key]!==null)stop('invented_fixture_input');
   for(const key of Object.keys(fixture.inputs)){const origin=review.origins[key];if(origin?.kind!=='user-supplied'||origin.turnId!==request.message.id||!request.message.text.includes(origin.quote))stop('changed_fixture_provenance');}
   expectedView=hiringBudgetView(review);expectedBinding=await planningCalculationRef('hiring',request,state);return expectedBinding;
  }
 };
}
/** Separate transport ceiling, including attempts that throw. No count endpoint or redirects. */
export function createGuardedFetch(baseFetch){
 let attempts=0;
 return async(input,init)=>{
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url),method=init?.method??(typeof input==='object'&&'method' in input?input.method:'GET');
  if(url.origin!=='https://api.openai.com'||url.pathname!=='/v1/responses'||url.search||method!=='POST'||attempts>=2)fail('transport_scope_or_limit');
  attempts++;return baseFetch(input,{...init,redirect:'error'});
 };
}
export function safeText(value,max=200000){const raw=typeof value==='string'?value:JSON.stringify(value);const clean=raw.replace(/(?:sk-[A-Za-z0-9_-]{8,}|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]+|Bearer\s+\S+)/gi,'[REDACTED]');return {text:clean.slice(0,max),sha256:hash(raw),truncated:clean.length>max,redacted:clean!==raw};}
export async function runDiagnostic({manifest,env,client,claim,record,items=response=>response.output,now=Date.now}){
 validateManifest(manifest,env,now());if(client.baseURL!=='https://api.openai.com/v1')fail('endpoint_changed');claim();
 const request=fixtureRequest(),guard=createGuard(request),signal=AbortSignal.timeout(limits.operationTimeoutMs);let nativeReview=null;
 record('claimed',{application,overlayCommit:manifest.overlayCommit,runId:manifest.runId,reservationId:manifest.reservationId,projectId:manifest.projectId,deploymentId:env.VERCEL_DEPLOYMENT_ID,manifestSha256:hash(manifest),reservedMicrousd:limits.reservedMicrousd,fixtureOnly:true});
 try{
  const reply=await converseSolutions(request,{natural:{datasetToken:fixture.datasetToken},progress:{enabled:true,datasetToken:fixture.datasetToken},now:()=>new Date(fixture.clock),loadProjection:async()=>fail('database_forbidden'),complete:async(input,finalOnly,active,capabilities)=>{
   if(guard.attempts===1){
    // Recover the native review from the exact production tool arguments, never model prose.
    // The unchanged service has already executed those arguments and returned its reference.
    const call=input.find(item=>item.type==='function_call'&&item.name==='review_hiring_budget');
    if(call){const {editHiringBudget}=await import('../../../lib/home-hiring-budget.ts');nativeReview=editHiringBudget(request,fixture.datasetToken,JSON.parse(call.arguments).changes);await guard.bindNative({...request.state,hiringBudget:nativeReview});}
   }
   const payload=modelPayload(request,input,finalOnly,capabilities),options=await guard.before(payload,active);
   record('before-'+guard.attempts,{attempt:guard.attempts,payloadSha256:hash(payload),payloadBytes:Buffer.byteLength(JSON.stringify(payload)),input:safeText(input.filter(item=>item.type!=='reasoning').map(item=>item.role?item:item.type==='function_call_output'?{type:item.type,call_id:item.call_id,output:item.output}:providerReceiptOutput([item])[0]).filter(Boolean)),reservedMicrousd:limits.reservedMicrousd});
   try{const response=await client.responses.create(payload,{...options,headers:{'X-Client-Request-Id':manifest.runId+'-'+guard.attempts}});record('provider-'+guard.attempts,{attempt:guard.attempts,status:response.status,requestId:response._request_id??null,usage:response.usage??null,output:safeText(providerReceiptOutput(response.output??[])),text:safeText(response.output_text??'')});return await guard.accept(response,items(response));}catch(error){guard.failed();throw error;}
  }},signal);
  if(guard.attempts!==2||!nativeReview||hash(reply.state.hiringBudget)!==hash(nativeReview))fail('native_state_mismatch');
  const view=hiringBudgetView(reply.state.hiringBudget),selection=await prepareHiringPlan(reply.state.hiringBudget,fixture.externalHires,{id:'hiring-preview-goal',statement:'Cover 10 engineering roles within the reviewed budget.'});
  if(view.listedCost!==1540000||selection.facts.externalSubtotal!==924000||selection.facts.remainingBeforeUnknownCosts!==76000||selection.facts.requiredRoles!==10||selection.facts.externalFte!==6||selection.facts.fullCost!==null||selection.facts.internalAvailability!==null)fail('handoff_mismatch');
  record('completed',{application,overlayCommit:manifest.overlayCommit,runId:manifest.runId,reservationId:manifest.reservationId,attempts:guard.attempts,reply:safeText(reply),request:safeText(request),hiringSelection:safeText(selection),semanticReview:'pending',browserAcceptance:false,fullAcceptance:false,retainedMicrousd:limits.reservedMicrousd});return {completed:true,attempts:guard.attempts,reply,selection};
 }catch(error){record('stopped',{attempts:guard.attempts,code:typeof error.code==='string'?error.code:'service_or_provider_failure',message:safeText(error.message??'',2000),retainedMicrousd:limits.reservedMicrousd,fullAcceptance:false});return {completed:false,attempts:guard.attempts};}
}
