/** Executable offline acceptance contract. No provider client, run claim or budget. */
import {readSolutionState} from '../../lib/home-solution-conversation.ts';
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {requestDemandContext,readDemandReview,calculateServiceDemand,demandQuantityFields} from '../../lib/swp-demand.ts';
import {fixture,digest,continuationRequest} from '../fixtures/swp-period-contract-continuation.mjs';
const equal=(a,b)=>digest(a)===digest(b);
function requireCheck(ok,code){if(!ok){const error=Error(`Continuation check failed: ${code}`);error.code=code;throw error;}}

/** Call on the real service reply after each turn, before advancing retained state.
 * A success here is structural acceptance only; narrative/model semantics still
 * require separate review. No values, periods, costs or provenance are repaired.
 */
export function checkContinuationTurn(index,request,reply,previous=null){
 const stage=fixture.stages[index];requireCheck(stage&&Number.isInteger(index),'stage');
 requireCheck(reply?.requestId===request.requestId,'request_identity');
 requireCheck(Array.isArray(reply.candidateIds)&&reply.candidateIds.length===0&&Array.isArray(reply.analysisIds)&&reply.analysisIds.length===0&&!reply.progressProposal,'scoped_outputs');
 requireCheck(request.goalContext.scenarioReview.acceptedForScenario===false&&request.goalContext.scenarioReview.staffingComparison===null,'no_implicit_acceptance');
 const state=readSolutionState(reply.state),turns=state.turns;
 requireCheck(turns.length===request.state.turns.length+2&&equal(turns.slice(0,-2),request.state.turns),'retained_history');
 requireCheck(equal(turns.at(-2),{id:request.message.id,role:'user',text:request.message.text})&&equal(turns.at(-1),{id:'reply-'+request.requestId.slice(0,70),role:'assistant',text:reply.answer}),'current_turns');
 for(const key of ['working','analyses','constraints','verifiedMetrics'])requireCheck(equal(state[key],request.state[key]),'unrequested_state_'+key);
 requireCheck(!!reply.demandReview,'structured_review_required');
 const context=requestDemandContext(request,fixture.datasetToken),review=readDemandReview(reply.demandReview,context);
 requireCheck(review.requestId===request.requestId,'review_request_identity');
 requireCheck(stage.allowedReviewStatuses.includes(review.result.status),'review_status_'+stage.id);
 requireCheck(equal(review.result,calculateServiceDemand(review.spec)),'code_calculation');
 requireCheck(review.spec.contracts.value===2&&review.spec.contracts.basis.kind==='user-supplied'&&review.spec.contracts.basis.turnId==='swp-preview-user-1','stated_contract_count');
 // The fictional user supplies no effort, productive-hours, FTE-conversion or
 // budget measurements. A model may propose them or leave them unresolved.
 for(const field of ['hoursPerContract','productiveHoursPerFte','existingFtePerRole','ftePerRole','budgetUsd','explicitAdditionalRoles'])requireCheck(['model-proposed','unknown'].includes(review.spec[field].basis.kind),'proposed_or_unknown_'+field);
 if(index===0){
  requireCheck(previous===null&&request.goalContext.scenarioReview.demandProposal===null,'initial_review');
  for(const field of ['existingRoles','availabilityPct'])requireCheck(['model-proposed','unknown'].includes(review.spec[field].basis.kind),'initial_capacity_basis_'+field);
 }else{
  requireCheck(previous&&equal(request.goalContext.scenarioReview.demandProposal,previous),'exact_previous_review');
  readDemandReview(previous,context);
  for(const key of Object.keys(previous.spec).filter(key=>!stage.changedFields.includes(key)))requireCheck(equal(previous.spec[key],review.spec[key]),'untouched_'+key);
  const changed=index===1?['months']:['existingRoles','availabilityPct'];
  for(const field of changed){const basis=field==='months'?review.spec.monthsBasis:review.spec[field].basis;requireCheck(basis.kind==='user-supplied'&&basis.turnId===request.message.id&&typeof basis.quote==='string'&&request.message.text.includes(basis.quote),'edit_provenance_'+field);}
  requireCheck(review.spec.months===9,'nine_months');
  if(index===2)requireCheck(review.spec.existingRoles.value===4&&review.spec.availabilityPct.value===25,'four_staff_25_percent');
 }
 if(review.result.status==='needs-inputs'){
  requireCheck(review.result.missing.length>0&&review.result.additionalRoles===null,'honest_incomplete_review');
 }else{
  requireCheck(review.result.missing.length===0&&Number.isSafeInteger(review.result.additionalRoles)&&review.result.additionalRoles>=0,'calculated_roles');
 }
 const unknownFields=demandQuantityFields.filter(field=>review.spec[field].value===null);
 return {stage:stage.id,review,state,checks:{structuralAcceptance:true,reviewStatus:review.result.status,unknownFields,codeArithmeticVerified:review.result.status==='calculated',verifiedWorkforceFacts:false,acceptedForScenario:false,staffingComparisonPerformed:false,staffingCostsReviewed:false,goalSaved:false,semanticReview:'pending',fullAcceptance:false}};
}

/** Portable unarmed driver. The caller must supply an independently authorized,
 * source-bound, budgeted completion transport and durable recorder. This module
 * supplies neither; offline tests supply a mocked completion. A failed check or
 * record stops progression, without a repair, retry or new reservation.
 */
export async function runPeriodContractContinuation({anchor,complete,record,signal=new AbortController().signal}){
 requireCheck(typeof complete==='function'&&typeof record==='function','explicit_transport_and_recorder');
 let state=anchor.state,review=null;const completedStages=[];
 for(let index=0;index<fixture.followupTurnCount;index++){
  signal.throwIfAborted();const request=continuationRequest(index,anchor,state,review),requestHash=digest(request);
  await record({phase:'before-turn',index,request:structuredClone(request),requestSha256:requestHash});signal.throwIfAborted();
  const reply=await converseSolutions(request,{now:()=>new Date(fixture.clock),demand:{datasetToken:fixture.datasetToken},loadProjection:async()=>{throw Error('Database loader forbidden for this fixture.');},complete:(input,finalOnly,active)=>complete({index,request,input,finalOnly,signal:active})},signal);
  signal.throwIfAborted();requireCheck(digest(request)===requestHash,'request_mutated');
  const checked=checkContinuationTurn(index,request,reply,review);
  await record({phase:'checked-turn',index,requestSha256:requestHash,reply:structuredClone(reply),checks:structuredClone(checked.checks)});signal.throwIfAborted();
  state=checked.state;review=checked.review;completedStages.push(checked.checks);
 }
 return {fixtureId:fixture.id,executionComplete:true,completedStages,state,review,acceptedForScenario:false,staffingComparisonPerformed:false,goalSaved:false,semanticReview:'pending',fullAcceptance:false};
}
