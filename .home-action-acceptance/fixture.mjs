import {ordinaryClientRequest} from './client-request.mjs';
import {readSolutionState,emptySolutionState,currentSolutionProposals,assertSolutionParticipationProvenance,resolveSolutionMetric} from '../lib/home-solution-conversation.ts';
import {actionBinding,actionBindingKey} from '../lib/home-action-drafts.ts';
import {assertSolutionShape,solutionFinalSchema} from '../lib/home-solution-conversation-schema.ts';
import {haveDuplicateBundleActivities} from '../lib/home-bundle-distinctness.ts';
export const appCommit='4d65d4e0dd86bd467687747827da8930cc0a25cc';
export const fixture=Object.freeze({
 id:'home-turnover-prior-policy-comparison-v1',datasetToken:'legacy-v1:0',
 questions:Object.freeze(['I want to reduce turnover']),
 workforceFacts:true,acceptedForScenario:false,goalSaved:false,
});
export const firstRequest=evidence=>ordinaryClientRequest(fixture.questions[0],evidence);
export const modeForTurn=()=>null;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export async function checkReply(request,reply,index,final){
 if(index!==0||request.message.text!==fixture.questions[index]||request.goal.id||request.goal.statement||request.goalContext!==null||request.catalog||request.selectedId||!equal(request.state,emptySolutionState()))throw Error('nonempty_or_injected_request');
 assertSolutionShape(final,solutionFinalSchema,'provider final');
 const state=readSolutionState(reply?.state);
 if(reply.requestId!==request.requestId||typeof reply.answer!=='string'||!reply.answer.trim()||reply.answer.length>10000||
  !Array.isArray(reply.candidateIds)||reply.candidateIds.length>4||new Set(reply.candidateIds).size!==reply.candidateIds.length||reply.analysisIds?.length!==0||reply.progressProposal||reply.demandReview||
  !equal(state.turns,[{id:request.message.id,role:'user',text:request.message.text},{id:'reply-'+request.requestId,role:'assistant',text:reply.answer}])||
  !Number.isInteger(reply.usage?.modelRounds)||reply.usage.modelRounds<1||reply.usage.modelRounds>3||!Number.isInteger(reply.usage?.toolCalls)||reply.usage.toolCalls<0||reply.usage.toolCalls>6||
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
 if(haveDuplicateBundleActivities(current.map(item=>item.draft.bundle)))throw Error('duplicate_plan_activities');
 for(const ref of state.verifiedMetrics){
  if(ref.kind!=='candidate'||!current.some(item=>item.id===ref.id&&item.revision===ref.revision)||resolveSolutionMetric(state,ref).value===null)throw Error('unchecked_final_metric');
 }
 return {comparisonOnly:true,structuralAcceptance:true,checkedPlanCount:current.length,
  threePlanAcceptance:current.length===3?'pending-semantic-review':'not-met',checkedProposals:current.map(({id,revision})=>({id,revision})),unblockedDraftsAndResults:current.length?true:null,finalReferencesChecked:true,codeArithmeticVerified:current.length?true:null,
  semanticReview:'pending',fullAcceptance:false,acceptedForScenario:false,goalSaved:false};
}
export const semanticChecks=Object.freeze([
 'Start with a short summary and one supported conditional recommendation, its decisive reason and what would change it.',
 'Assess the prior-policy response on its actual recommendation and checked plan count. Three-plan product acceptance is a separate unmet gate when fewer than three plans are returned; do not invent or require additional calls.',
 'Further reading cites only verified available evidence or links. Otherwise offer investigation topics or checks; never fabricate sources, titles, URLs or claims of reading.',
 'Give concrete work, suggested owners, sequencing or timing gates, intended outcomes and success measures for each plan.',
 'Keep missing quantities unknown; no causal retention claim, confirmed availability or fabricated feasibility. Aggregate associations do not establish individual risk, causes or future effects.',
 'Every returned candidate reference resolves to a current unblocked checked draft/result; an empty list establishes no proposal or save acceptance; no goal save, acceptance or operational Apply.',
]);
