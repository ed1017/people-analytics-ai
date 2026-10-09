/** Portable bounded driver. Caller owns authorization, origin proof, transport,
 * cancellation, counting/cost limits and durable receipts. No provider SDK here. */
import {converseSolutions} from '../../lib/home-solution-conversation-service.ts';
import {readSolutionState} from '../../lib/home-solution-conversation.ts';
import {readDemandReview,requestDemandContext,calculateServiceDemand} from '../../lib/swp-demand.ts';
import {checkContinuationTurn as checkPrior} from './swp-provenance-contract-continuation.mjs';
import {fixture,continuationRequest,digest} from '../fixtures/swp-reference-continuation.mjs';
const equal=(a,b)=>digest(a)===digest(b);
function check(ok,code){if(!ok)throw Error('Reference continuation check failed: '+code);}
export function checkReferenceContinuationTurn(index,request,reply,previous=null){
 if(index<3)return checkPrior(index,request,reply,previous);
 check(index===3&&request.message.text===fixture.clarification,'explicit_clarification');
 check(reply?.requestId===request.requestId&&reply.candidateIds?.length===0&&reply.analysisIds?.length===0&&!reply.progressProposal,'scoped_reply');
 check(!request.goalContext.scenarioReview.acceptedForScenario&&request.goalContext.scenarioReview.staffingComparison===null,'no_implicit_acceptance');
 const state=readSolutionState(reply.state),context=requestDemandContext(request,fixture.datasetToken);
 check(previous&&equal(request.goalContext.scenarioReview.demandProposal,previous),'exact_prior');readDemandReview(previous,context);
 const review=readDemandReview(reply.demandReview,context);
 check(review.requestId===request.requestId&&equal(review.result,calculateServiceDemand(review.spec)),'calculation_identity');
 check(state.turns.length===request.state.turns.length+2&&equal(state.turns.slice(0,-2),request.state.turns),'history');
 check(equal(state.turns.at(-2),{id:request.message.id,role:'user',text:request.message.text})&&equal(state.turns.at(-1),{id:'reply-'+request.requestId,role:'assistant',text:reply.answer}),'current_turns');
 for(const key of ['working','analyses','constraints','verifiedMetrics'])check(equal(state[key],request.state[key]),'unchanged_'+key);
 for(const key of Object.keys(previous.spec).filter(k=>!['startMonth','startBasis','contracts'].includes(k)))check(equal(review.spec[key],previous.spec[key]),'retained_'+key);
 const userBasis=b=>b.kind==='user-supplied'&&b.turnId===request.message.id&&typeof b.quote==='string'&&request.message.text.includes(b.quote);
 check(review.spec.startMonth==='2027-01'&&userBasis(review.spec.startBasis),'explicit_start');
 check(review.spec.contracts.value===previous.spec.contracts.value&&review.spec.contracts.period===previous.spec.contracts.period,'retained_contract_quantity');
 if(previous.spec.scope!==null){check(review.spec.contracts.scope===previous.spec.scope,'explicit_scope_reference');if(!equal(review.spec.contracts,previous.spec.contracts))check(userBasis(review.spec.contracts.basis),'scope_provenance');}
 else check(equal(review.spec.contracts,previous.spec.contracts),'unknown_scope_not_invented');
 const expected=calculateServiceDemand({...previous.spec,startMonth:'2027-01',contracts:{...previous.spec.contracts,scope:previous.spec.scope}});
 check(review.result.status===expected.status,'no_forced_calculation_or_omitted_clarification');
 return {review,state,checks:{structuralAcceptance:true,reviewStatus:review.result.status,codeArithmeticVerified:review.result.status==='calculated',requiresClarification:review.result.status==='needs-inputs',missingRequirements:review.result.missing,acceptedForScenario:false,calculatedAcceptance:false,semanticReview:'pending',fullAcceptance:false}};
}
export async function runReferenceContinuation({anchor,complete,record,signal=new AbortController().signal}){
 check(typeof complete==='function'&&typeof record==='function','explicit_transport_and_recorder');
 let state=anchor.state,review=null;const completedStages=[];
 for(let index=0;index<fixture.followupTurnCount;index++){
  signal.throwIfAborted();const request=continuationRequest(index,anchor,state,review),requestSha256=digest(request);
  await record({phase:'before-turn',index,request:structuredClone(request),requestSha256});signal.throwIfAborted();
  const reply=await converseSolutions(request,{now:()=>new Date(fixture.clock),demand:{datasetToken:fixture.datasetToken,referenceContract:true},loadProjection:async()=>{throw Error('Database loader forbidden for this fixture.');},complete:(input,finalOnly,active)=>complete({index,request,input,finalOnly,signal:active})},signal);
  signal.throwIfAborted();check(digest(request)===requestSha256,'request_mutated');
  const checked=checkReferenceContinuationTurn(index,request,reply,review);
  await record({phase:'checked-turn',index,requestSha256,reply:structuredClone(reply),checks:checked.checks});signal.throwIfAborted();
  state=checked.state;review=checked.review;completedStages.push(checked.checks);
 }
 return {fixtureId:fixture.id,scriptedTurnsComplete:true,completedStages,state,review,requiresClarification:review.result.status==='needs-inputs',missingRequirements:review.result.missing,codeArithmeticVerified:review.result.status==='calculated',calculatedAcceptance:false,fullAcceptance:false,semanticReview:'pending',acceptedForScenario:false,staffingComparisonPerformed:false,goalSaved:false,replyOrigin:'caller completion; separate origin proof required'};
}
