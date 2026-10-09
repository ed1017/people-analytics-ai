/** Versioned, unarmed fictional script. The added user clarification is authored
 * test input, never an observed real-user answer or permission to run a model. */
import {fixture as prior,continuationRequest as priorRequest,openerRequest,bindClarificationReply,digest} from './swp-provenance-contract-continuation.mjs';
import {readSolutionRequest,readSolutionState} from '../../lib/home-solution-conversation.ts';
export {openerRequest,bindClarificationReply,digest};
const clarification='Start in January 2027. The two contracts cover the same client-operations role slice already under review. Keep the nine-month horizon, four staff at 25% availability, and all other assumptions unchanged.';
export const fixture=Object.freeze({...prior,id:'swp-managed-services-reference-continuation-v5',previousFixtureId:prior.id,
 followupTurnCount:4,maxModelRounds:16,maxToolCalls:24,
 clarification,followups:[...prior.followups,clarification],
 stages:[...prior.stages,{id:'explicit-date-and-scope-clarification',allowedReviewStatuses:['needs-inputs','calculated'],changedFields:['startMonth','startBasis','contracts']}],
 clarificationOrigin:'newly-authored-fictional-user-turn; not an observed user response',
 finalPolicy:'After the explicit date/scope clarification, require calculation only when all required inputs are resolved. Other legitimate unknowns remain incomplete. Neither branch constitutes full acceptance.',
});
export function continuationRequest(index,anchor,state=anchor?.state,review=null){
 if(index<3)return priorRequest(index,anchor,state,review);
 if(index!==3||!anchor||digest(anchor.reply)!==anchor.replySha256||digest(anchor.state)!==anchor.stateSha256)throw Error('Invalid bounded clarification stage or preserved anchor.');
 const checked=bindClarificationReply(anchor.reply),current=readSolutionState(structuredClone(state));
 if(current.turns.length!==8||digest(current.turns.slice(0,2))!==digest(checked.state.turns))throw Error('Keep the exact prior continuation history.');
 const request=openerRequest();request.requestId='swp-preview-5';request.state=current;
 request.message={id:'swp-preview-user-5',text:fixture.clarification};
 request.goalContext.scenarioReview.demandProposal=review;
 request.goalContext.scenarioReview.acceptedForScenario=false;request.goalContext.scenarioReview.staffingComparison=null;
 return readSolutionRequest(request);
}
