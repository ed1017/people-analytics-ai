import {ordinaryClientRequest} from './client-request.mjs';
import {readSolutionState,emptySolutionState,currentSolutionProposals,assertSolutionParticipationProvenance,resolveSolutionMetric} from '../lib/home-solution-conversation.ts';
import {actionBinding,actionBindingKey} from '../lib/home-action-drafts.ts';
import {assertSolutionShape,solutionFinalSchema} from '../lib/home-solution-conversation-schema.ts';
export const appCommit='64b5124b329c26bf35cdf6eed2fb02b98d06bad1';
export const fixture=Object.freeze({
 id:'home-pilot-two-call-continuation-v1',datasetToken:'legacy-v1:0',
 questions:Object.freeze(["I want to reduce turnover. For a fictional mentoring pilot only, use 12 participants, 2 total hours per participant, 3 coordination hours and 240 USD total cash, starting October 2026 for three months. These are illustrative assumptions, not workforce facts. Show one checked proposal; do not save it."]),
 workforceFacts:true,fictionalPilotAssumptions:true,acceptedForScenario:false,goalSaved:false,
});
export const firstRequest=evidence=>ordinaryClientRequest(fixture.questions[0],evidence);
export const modeForTurn=()=>null;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export async function checkReply(request,reply,index,final){
 if(index!==0||request.message.text!==fixture.questions[index]||request.goal.id||request.goal.statement||request.goalContext!==null||request.catalog||request.selectedId||!equal(request.state,emptySolutionState()))throw Error('nonempty_or_injected_request');
 assertSolutionShape(final,solutionFinalSchema,'provider final');
 const state=readSolutionState(reply?.state);
 if(reply.requestId!==request.requestId||typeof reply.answer!=='string'||!reply.answer.trim()||reply.answer.length>10000||
  !Array.isArray(reply.candidateIds)||reply.candidateIds.length!==1||new Set(reply.candidateIds).size!==1||reply.analysisIds?.length!==0||reply.progressProposal||reply.demandReview||
  !equal(state.turns,[{id:request.message.id,role:'user',text:request.message.text},{id:'reply-'+request.requestId,role:'assistant',text:reply.answer}])||
  !Number.isInteger(reply.usage?.modelRounds)||reply.usage.modelRounds!==2||!Number.isInteger(reply.usage?.toolCalls)||reply.usage.toolCalls!==1||
  !equal(final.candidateIds,reply.candidateIds)||!equal(final.analysisIds,reply.analysisIds)||final.answer!==reply.answer||!equal(final.verifiedMetrics,state.verifiedMetrics)||!equal(final.questions,state.questions))throw Error('reply_contract');
 const current=currentSolutionProposals(state);
 if(current.length!==reply.candidateIds.length||state.analyses.length||state.businessPlanning||current.some(item=>!reply.candidateIds.includes(item.id)))throw Error('current_proposals_required');
 for(const item of current){
  if(item.blocking.length||!item.draft||!item.result||item.requestId!==request.requestId||!equal(item.message,request.message)||
   item.candidate.goal.turnId!==request.message.id||!equal(item.constraints,state.constraints)||item.provenanceVersion!==1||
   !equal(item.candidate.goal,current[0].candidate.goal))throw Error('unblocked_current_evaluation_required');
  const binding=await actionBinding('exploration',item.candidate.goal.statement,request.evidence,{scope:request.scope,constraints:item.constraints});
  if(actionBindingKey(binding)!==actionBindingKey(item.binding))throw Error('proposal_context_mismatch');
  assertSolutionParticipationProvenance({...request,state:{...state,working:state.working.filter(row=>row.id!==item.id||row.revision<item.revision)}},item.candidate,item.draft);
 }
 for(const ref of state.verifiedMetrics){
  if(ref.kind!=='candidate'||!current.some(item=>item.id===ref.id&&item.revision===ref.revision)||resolveSolutionMetric(state,ref).value===null)throw Error('unchecked_final_metric');
 }
 return {structuralAcceptance:true,checkedProposals:current.map(({id,revision})=>({id,revision})),unblockedDraftsAndResults:true,finalReferencesChecked:true,codeArithmeticVerified:true,
  semanticReview:'pending',fullAcceptance:false,acceptedForScenario:false,goalSaved:false};
}
export const semanticChecks=Object.freeze([
 'One checked fictional mentoring pilot; explicit assumptions remain distinct from verified workforce evidence.',
 'The app calculates the requested work; do not claim established retention improvement or available capacity.',
 'The final candidate and metric references resolve to the executed evaluation; unknown quantities remain unknown.',
 'No three-plan, React/browser, causal-fix or general model-quality acceptance is asserted.',
]);
