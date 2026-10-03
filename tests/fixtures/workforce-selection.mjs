import {calculateWorkforceIncrement} from '../../lib/workforce-increment.ts';
import {createWorkforceSolution, emptySolutionInputs, beginSolutionRun, completeSolutionRun, attachSolutionEvidence, currentSolutionVersion} from '../../lib/workforce-solution.ts';
import {workforceReviewFixture} from './workforce-review.mjs';
const at = '2026-10-03T01:00:00.000Z';
export function selectionFixture(patch = {}, changePayload = () => {}, withEvidence = false) {
  const payload = workforceReviewFixture(); Object.assign(payload.input, patch); changePayload(payload);
  payload.proposed = calculateWorkforceIncrement(payload.input, payload.timing);
  payload.hireOnly = calculateWorkforceIncrement({...payload.input, build:'0', move:'0', buy:payload.input.roles, backfills:'0', internalAnnualCostChange:'0', trainingCash:'0', trainingHours:'0'}, payload.timing);
  let solution = createWorkforceSolution('solution-search', 'goal-search', {...emptySolutionInputs(), scope:{...payload.input, goalStatement:'Synthetic bounded workforce comparison', ownerNotes:'KEEP PRIVATE NOTES'}}, at);
  if(withEvidence) solution=attachSolutionEvidence(solution,1,{id:'capacity-source',kind:'skills',source:'Synthetic aggregate',sourceVersion:'1',capturedAt:at,asOf:'2026-10-01',periodStart:null,periodEnd:null,scope:{businessUnit:'TECH'},provenance:'synthetic',payload:{candidatePool:3},limitations:['Not assignable employees']},null,at);
  const started = beginSolutionRun(solution, currentSolutionVersion(solution).version, 'source-run', ['brief'], at);
  solution = completeSolutionRun(started.state, started.ticket, [{id:'source-result', kind:'brief', calculator:{name:'single-role-workforce-review', version:'1'}, payload}], at);
  return {solution, payload};
}
export function selectionSpec(patch = {}) {return {build:{min:0,max:3}, move:{min:0,max:3}, buy:{min:0,max:3}, maxEvaluations:100, maxResults:64, resultFilter:'all', assumptionPolicy:'preserve-reviewed-path-totals-and-timing', ...patch}}
