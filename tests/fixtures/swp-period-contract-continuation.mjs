/** Unarmed successor: retained proposals do not imply calculation or acceptance. */
import {fixture as previous,continuationRequest as historicalRequest,bindClarificationReply,openerRequest,digest} from './swp-clarification-continuation.mjs';
export {bindClarificationReply,openerRequest,digest};
export const fixture=Object.freeze({
 ...previous,id:'swp-managed-services-period-contract-continuation-v3',
 previousFixtureId:previous.id,paidExecutionAuthorized:false,
 stages:[
  {id:'proposed-role-slice',allowedReviewStatuses:['needs-inputs','calculated'],changedFields:null},
  {id:'nine-month-edit',allowedReviewStatuses:['needs-inputs','calculated'],changedFields:['months','monthsBasis']},
  {id:'four-staff-availability-edit',allowedReviewStatuses:['calculated'],changedFields:['existingRoles','availabilityPct']},
 ],
 intermediatePolicy:'Retain a valid structured incomplete review and its unknowns. No staffing comparison or scenario acceptance is implied.',
 finalPolicy:'Require code-recomputed arithmetic after the final capacity inputs, using the actual proposed workload and productivity assumptions; no fixed numeric outcome.',
 localActionTiming:'Only after a calculated review, as a separate explicit action; never automatic at an incomplete stage.',
});
export function continuationRequest(index,anchor,state=anchor?.state,review=null){
 const request=historicalRequest(index,anchor,state,review,null);
 request.goalContext.scenarioReview.acceptedForScenario=false;
 request.goalContext.scenarioReview.staffingComparison=null;
 return request;
}
