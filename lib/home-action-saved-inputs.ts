// @ts-expect-error Native Node tests share TypeScript source.
import {readRetentionRecord} from './retention-what-if-record.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readWorkforceSolution,currentSolutionVersion,solutionResultIsCurrent} from './workforce-solution.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readSavedWorkforceReview} from './workforce-solution-review.ts';
import type {ActionBinding} from './home-action-drafts';
import type {ScenarioRoute,SavedScenarioSource} from './home-action-scenarios';
/** Offer only validated local saved inputs. This never adopts them or copies their result. */
export function savedActionInputSource(route:ScenarioRoute,binding:ActionBinding,fields:Record<string,unknown>):SavedScenarioSource|null{
 try{
  if(route==='retention_what_if'){
   const record=readRetentionRecord(fields.retentionWhatIfV1,binding.goalId),latest=record.revisions.at(-1)!;
   return latest.goalStatement===binding.goal?{route,goalId:binding.goalId,goal:binding.goal,sourceId:`retention revision ${record.revisions.length}`,inputs:structuredClone(latest.input)}:null;
  }
  const solution=readWorkforceSolution(fields.workforceSolution);
  if(!solution||solution.goalId!==binding.goalId||currentSolutionVersion(solution).inputs.scope.goalStatement!==binding.goal)return null;
  const result=solution.results.findLast(item=>item.kind==='brief'&&item.calculator.name==='single-role-workforce-review'&&solutionResultIsCurrent(solution,item));
  const reviewed=result?readSavedWorkforceReview(solution,result):null;
  return reviewed?{route,goalId:binding.goalId,goal:binding.goal,sourceId:`capacity version ${result!.version}`,inputs:structuredClone(reviewed.input)}:null;
 }catch{return null}
}
