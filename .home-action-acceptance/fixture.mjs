import {createHash} from 'node:crypto';
import {ordinaryClientRequest} from './client-request.mjs';
import {readSolutionState,emptySolutionState,currentSolutionProposals,assertSolutionParticipationProvenance,resolveSolutionMetric} from '../lib/home-solution-conversation.ts';
import {actionBinding,actionBindingKey} from '../lib/home-action-drafts.ts';
import {assertSolutionShape,solutionFinalSchema} from '../lib/home-solution-conversation-schema.ts';
import {haveDuplicateBundleActivities} from '../lib/home-bundle-distinctness.ts';
export const appCommit='8bd365ea3173eda32fe5aa1f8f52557f6b202f93';
export const fixture=Object.freeze({
 id:'home-action-plans-independent-first-turns-v1',datasetToken:'legacy-v1:0',
 questions:Object.freeze(['I want to reduce turnover','A client wants a new digital product in six months. Should we recruit more engineers if our managers are already stretched?']),
 workforceFacts:false,acceptedForScenario:false,goalSaved:false,
});
const requests=fixture.questions.map(text=>ordinaryClientRequest(text));
export const firstRequest=()=>structuredClone(requests[0]);
export const secondRequest=()=>structuredClone(requests[1]);
export const modeForTurn=()=>null;
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export async function checkReply(request,reply,index,final){
 if(![0,1].includes(index)||request.message.text!==fixture.questions[index]||request.goal.id||request.goal.statement||request.goalContext!==null||request.catalog||request.selectedId||!equal(request.state,emptySolutionState()))throw Error('nonempty_or_injected_request');
 assertSolutionShape(final,solutionFinalSchema,'provider final');
 const state=readSolutionState(reply?.state);
 if(reply.requestId!==request.requestId||typeof reply.answer!=='string'||!reply.answer.trim()||reply.answer.length>10000||
  !Array.isArray(reply.candidateIds)||reply.candidateIds.length!==3||new Set(reply.candidateIds).size!==3||reply.analysisIds?.length!==0||reply.progressProposal||reply.demandReview||
  !equal(state.turns,[{id:request.message.id,role:'user',text:request.message.text},{id:'reply-'+request.requestId,role:'assistant',text:reply.answer}])||
  !Number.isInteger(reply.usage?.modelRounds)||reply.usage.modelRounds<1||reply.usage.modelRounds>4||!Number.isInteger(reply.usage?.toolCalls)||reply.usage.toolCalls<1||reply.usage.toolCalls>6||
  !equal(final.candidateIds,reply.candidateIds)||!equal(final.analysisIds,reply.analysisIds)||final.answer!==reply.answer||!equal(final.verifiedMetrics,state.verifiedMetrics))throw Error('reply_contract');
 const current=currentSolutionProposals(state);
 if(current.length!==3||state.analyses.length||state.businessPlanning||current.some(item=>!reply.candidateIds.includes(item.id)))throw Error('three_current_proposals_required');
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
 return {structuralAcceptance:true,checkedProposals:current.map(({id,revision})=>({id,revision})),threeUnblockedDraftsAndResults:true,finalReferencesChecked:true,codeArithmeticVerified:true,
  semanticReview:'pending',fullAcceptance:false,acceptedForScenario:false,goalSaved:false};
}
export function makeReplayPayload(request,replyText,final,index,checks){
 return {version:1,appCommit,fixtureId:fixture.id,scenarioIndex:index,request:structuredClone(request),requestSha256:digest(request),replyText,replySha256:digest(replyText),final:structuredClone(final),checks:structuredClone(checks)};
}
export async function readReplayPayload(raw){
 const value=raw?.receipt??raw;
 if(raw?.sanitization&&(raw.sanitization.redacted||raw.sanitization.truncated))throw Error('replay_receipt_altered');
 if(value?.version!==1||value.appCommit!==appCommit||value.fixtureId!==fixture.id||digest(value.request)!==value.requestSha256||typeof value.replyText!=='string'||digest(value.replyText)!==value.replySha256)throw Error('replay_identity_mismatch');
 const reply=JSON.parse(value.replyText),checks=await checkReply(value.request,reply,value.scenarioIndex,value.final);
 if(!equal(checks,value.checks))throw Error('replay_checks_mismatch');
 return {...value,reply};
}
export const semanticChecks=Object.freeze([
 'Start with a short summary and one supported conditional recommendation, its decisive reason and what would change it.',
 'After the summary, offer three meaningfully distinct usable Action Plans, then optional further reading, investigations and focus; no prerequisite scope questionnaire.',
 'Further reading cites only verified available evidence or links. Otherwise offer investigation topics or checks; never fabricate sources, titles, URLs or claims of reading.',
 'Give concrete work, suggested owners, sequencing or timing gates, intended outcomes and success measures for each plan.',
 'Keep missing quantities unknown; no causal retention claim, confirmed availability or fabricated feasibility. Six months is a requirement, not verified delivery.',
 'All three final candidate references resolve to current unblocked checked drafts/results; no goal save, acceptance or operational Apply.',
]);
