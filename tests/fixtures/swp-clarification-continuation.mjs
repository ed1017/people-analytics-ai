/** Unarmed fictional continuation. Exact prior reply/state must be supplied separately. */
import {createHash} from 'node:crypto';
import {normalizeHomePack} from '../../lib/home-pack.mjs';
import {emptySolutionState,readSolutionRequest,readSolutionState} from '../../lib/home-solution-conversation.ts';
import {SWP_DEMAND_MODE} from '../../lib/swp-demand.ts';
export const fixture=Object.freeze({
 id:'swp-managed-services-clarified-continuation-v2',clock:'2026-10-08T12:00:00.000Z',datasetToken:'legacy-v1:0',
 origin:'newly-authored-fictional-only',workforceFacts:false,projectAllocations:false,
 paidExecutionAuthorized:false,firstReplyEmbedded:false,followupTurnCount:3,
 opener:'We’re taking on two new managed-services contracts. Can our current teams cover them?',
 followups:[
  'It is service-desk work in client operations: triage, troubleshoot, resolve or escalate client IT support tickets. Please propose a narrow illustrative role slice with editable assumptions for workload, productive hours, planning horizon and uncommitted availability. Treat these as assumptions, not measured capacity.',
  'Make that nine months.',
  'We have four existing staff in this same role slice. Assume 25% of each is available for these contracts; keep the other assumptions and explain the remaining uncertainty.',
 ],
 localAction:'Use your assumptions for now',
 localActionMeaning:'Explicit scenario-only acceptance after a review; not verification, plan save or implementation.',
});
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function request(number,text,state,review=null,comparison=null){
 const goal={id:'',statement:''};
 return readSolutionRequest({version:1,requestId:`swp-preview-${number}`,goal,
  scope:'Invented service-planning fixture; no source workforce facts',filters:{country:'all',org:'all',level:'all'},timeZone:'UTC',
  evidence:normalizeHomePack({workforceScope:'Fictional fixture with all source facts unavailable',sources:[]}),
  goalContext:{goalContext:null,scenarioReview:{conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',
   intakeId:'swp-demand-preview-fixture',datasetToken:fixture.datasetToken,boundGoal:goal,revision:1,
   demandProposal:review,acceptedForScenario:!!review,staffingComparison:comparison}},
  selectedId:null,catalog:null,state,message:{id:`swp-preview-user-${number}`,text},
 });
}
/** Offline reconstruction only; no provider call is part of this fixture. */
export const openerRequest=()=>request(1,fixture.opener,emptySolutionState());
/** Hashes bind supplied bytes; the executor must verify their separate origin proof. */
export function bindClarificationReply(raw){
 const reply=structuredClone(raw),state=readSolutionState(structuredClone(reply?.state));
 if(reply.requestId!=='swp-preview-1'||typeof reply.answer!=='string'||!reply.answer.trim()||reply.demandReview||reply.progressProposal||reply.candidateIds?.length!==0||reply.analysisIds?.length!==0||state.turns.length!==2||state.working.length||state.analyses.length||state.verifiedMetrics.length||state.constraints.length||state.focusCandidateId!==null)throw Error('Preserved clarification reply required; do not regenerate the opener.');
 const [user,assistant]=state.turns;
 if(user.id!=='swp-preview-user-1'||user.role!=='user'||user.text!==fixture.opener||assistant.id!=='reply-swp-preview-1'||assistant.role!=='assistant'||assistant.text!==reply.answer)throw Error('The preserved opener and reply do not match.');
 return {reply,state,replySha256:digest(reply),stateSha256:digest(state)};
}
export function continuationRequest(index,anchor,state=anchor?.state,review=null,comparison=null){
 if(!Number.isInteger(index)||index<0||index>=fixture.followupTurnCount)throw Error('Exactly three follow-up turns are defined.');
 if(!anchor||digest(anchor.reply)!==anchor.replySha256||digest(anchor.state)!==anchor.stateSha256)throw Error('Preserved clarification binding changed.');
 const checked=bindClarificationReply(anchor.reply);
 if(checked.stateSha256!==anchor.stateSha256)throw Error('Preserved clarification state changed.');
 const current=readSolutionState(structuredClone(state));
 if(current.turns.length!==(index+1)*2||digest(current.turns.slice(0,2))!==digest(anchor.state.turns))throw Error('Continuation must retain the exact clarification history.');
 if(index===0&&(digest(current)!==anchor.stateSha256||review!==null||comparison!==null))throw Error('The first continuation must use the exact prior state.');
 return request(index+2,fixture.followups[index],current,review,comparison);
}
