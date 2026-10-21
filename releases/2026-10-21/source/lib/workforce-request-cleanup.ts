// Cancellation may outlive the selected goal; never reconstruct a missing record.
// @ts-expect-error Native Node tests share the lifecycle TypeScript source.
import {readWorkforceSolution,cancelSolutionRun,type RunTicket} from './workforce-solution.ts';
export function cancelOwnedWorkforceRequest(raw:unknown,ticket:RunTicket){
 const solution=readWorkforceSolution(raw);
 if(!solution||solution.id!==ticket.solutionId||solution.goalId!==ticket.goalId||
  solution.pending?.id!==ticket.id||solution.pending.version!==ticket.version)return null;
 return cancelSolutionRun(solution,ticket.id);
}
