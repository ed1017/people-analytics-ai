import type {SolutionRequest} from './home-solution-conversation';
// @ts-expect-error Native fixtures share source.
import {normalizeHomeQuestion} from './home-question-text.ts';

/** Initial, unspecified starter only: collect premises without buying a model round. */
export function staffingStarterIntake(request:SolutionRequest){
 const text=normalizeHomeQuestion(request.message.text);
 const s=request.state;
 if(text!=='how can we close a staffing gap'||request.goal.statement||request.selectedId||request.catalog||request.goalContext||s.turns.length||s.constraints.length||s.working.length||s.analyses.length||s.requiredStaffing||s.staffingDeliveryTarget||s.hiringBudget||s.businessPlanning)return null;
 const questions=[
  'Which role or team needs capacity, and how many additional people or what workload must be covered?',
  'By when is it needed, and what budget or constraints apply to hiring, redeployment or training?',
 ];
 return {questions,answer:'Let’s define the gap before comparing options. '+questions.join(' ')+' If a quantity is unknown, say so. I have not calculated a gap, cost or staffing plan yet.'};
}
