// New fictional two-turn test; all historical fixtures remain unchanged.
import {openerRequest} from '../tests/fixtures/swp-reference-continuation.mjs';
import {readSolutionRequest, readSolutionState} from '../lib/home-solution-conversation.ts';
import {readDemandReview, requestDemandContext, calculateServiceDemand} from '../lib/swp-demand.ts';
export const fixture = Object.freeze({
  id: 'swp-plan-b-actual-route-two-turn-v1', datasetToken: 'legacy-v1:0',
  clarification: 'It is service-desk work in client operations: triage, troubleshoot, resolve or escalate client IT support tickets. The two contracts cover this same Service Analyst role slice. Use a nine-month horizon starting in November 2026 (2026-11). We have four existing Service Analysts in this same role slice; assume 25% of each is available for these contracts. Propose clearly labelled illustrative assumptions for other missing inputs, including workload and productive hours. Treat every proposed number as an editable assumption, not measured capacity. Do not save or accept a plan.',
  workforceFacts: false, acceptedForScenario: false, goalSaved: false,
});
export function firstRequest() { return openerRequest(); }
export function secondRequest(firstReply) {
  const first = firstRequest();
  checkReply(first, firstReply);
  return readSolutionRequest({...first, requestId: 'swp-preview-2',
    state: structuredClone(firstReply.state),
    message: {id: 'swp-preview-user-2', text: fixture.clarification},
    goalContext: {...first.goalContext, scenarioReview: {...first.goalContext.scenarioReview,
      demandProposal: firstReply.demandReview ?? null, acceptedForScenario: false, staffingComparison: null}},
  });
}
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export function checkReply(request, reply) {
  const state = readSolutionState(reply?.state);
  if (reply.requestId !== request.requestId || typeof reply.answer !== 'string' || !reply.answer.trim() ||
      reply.candidateIds?.length !== 0 || reply.analysisIds?.length !== 0 || reply.progressProposal ||
      !equal(state.turns.slice(0,-2), request.state.turns) ||
      !equal(state.turns.at(-2), {id:request.message.id,role:'user',text:request.message.text}) ||
      !equal(state.turns.at(-1), {id:'reply-'+request.requestId,role:'assistant',text:reply.answer}) ||
      !Number.isInteger(reply.usage?.modelRounds) || reply.usage.modelRounds < 1 || reply.usage.modelRounds > 4 ||
      !Number.isInteger(reply.usage?.toolCalls) || reply.usage.toolCalls < 0 || reply.usage.toolCalls > 6)
    throw Error('reply_contract');
  for (const key of ['working','analyses','constraints','verifiedMetrics'])
    if (!equal(state[key], request.state[key])) throw Error('unexpected_planning_mutation');
  if (reply.demandReview) {
    const review = readDemandReview(reply.demandReview, requestDemandContext(request, fixture.datasetToken));
    if (!equal(review.result, calculateServiceDemand(review.spec))) throw Error('arithmetic_mismatch');
  }
  return {structuralAcceptance:true, reviewStatus:reply.demandReview?.result.status ?? 'no-review',
    codeArithmeticVerified:reply.demandReview?.result.status === 'calculated',
    semanticReview:'pending', fullAcceptance:false, acceptedForScenario:false, goalSaved:false};
}
