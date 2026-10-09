/** Unarmed v4 successor; v3 remains a frozen historical acceptance contract. */
import {fixture as previous,continuationRequest,bindClarificationReply,openerRequest,digest} from './swp-period-contract-continuation.mjs';
export {continuationRequest,bindClarificationReply,openerRequest,digest};
export const fixture=Object.freeze({
 ...previous,id:'swp-managed-services-provenance-contract-continuation-v4',previousFixtureId:previous.id,
 paidExecutionAuthorized:false,
 stages:previous.stages.map(stage=>({...stage,allowedReviewStatuses:['needs-inputs','calculated']})),
 finalPolicy:'Accept a valid structured capacity edit with retained unknowns and precise missing requirements. A useful focused clarification is allowed and needs semantic review; unresolved dates or quantity scopes cannot pass calculated acceptance.',
 localActionTiming:'Only a calculated review can proceed to a separate explicit scenario acceptance. No automatic clarification turn, save, comparison, acceptance, or provider retry.',
 semanticCriteria:['Explain unresolved requirements accurately.','Ask a useful focused clarification or propose clearly labeled assumptions for review.','Do not invent a date or silently normalize a mismatched role scope.','Do not claim calculated, accepted, saved or operational outcomes while inputs remain unresolved.'],
});
