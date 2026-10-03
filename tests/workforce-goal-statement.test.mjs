import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareGoalStatementCopy,acceptGoalStatementCopy} from '../lib/workforce-goal-statement.ts';
const context={goalId:'goal-a',goalText:'  Review three roles\nwithout inventing a budget.  ',solutionId:'solution-a',version:1,inputIdentity:'synthetic inputs',selectionId:'result-a',blocked:false};
test('blank statement receives exact goal text only after explicit preparation and acceptance',()=>{
 const before=structuredClone(context),result=prepareGoalStatementCopy(context,'');assert.equal(result.kind,'copy');assert.equal(acceptGoalStatementCopy(result.request,context,''),context.goalText);assert.deepEqual(context,before);
});
test('any nonempty statement including whitespace requires replacement confirmation',()=>{
 for(const statement of ['Keep my draft',' ','\n']){
  const result=prepareGoalStatementCopy(context,statement);assert.equal(result.kind,'confirm');assert.equal(result.request.previousStatement,statement);assert.equal(acceptGoalStatementCopy(result.request,context,statement),context.goalText);
 }
});
test('cancel can discard a proposal without changing either input; already-copied text is a no-op',()=>{
 const draft='Keep my exact text',copy=prepareGoalStatementCopy(context,draft);assert.equal(copy.kind,'confirm');assert.equal(draft,'Keep my exact text');assert.deepEqual(prepareGoalStatementCopy(context,context.goalText),{kind:'unchanged'});
});
test('changed goal, version, solution, inputs, selection, blocked state or draft rejects an old proposal',()=>{
 const request=prepareGoalStatementCopy(context,'Existing draft').request;
 for(const patch of [{goalId:'b'},{goalText:'New goal'},{solutionId:'b'},{version:2},{inputIdentity:'new inputs'},{selectionId:'historical-result'},{blocked:true}])assert.equal(acceptGoalStatementCopy(request,{...context,...patch},'Existing draft'),null);
 assert.equal(acceptGoalStatementCopy(request,context,'Edited after prompt'),null);
});
test('blocked/empty/oversized goals cannot be copied or silently truncated',()=>{
 for(const patch of [{blocked:true},{goalText:''},{goalText:' '},{goalText:'x'.repeat(3001)},{version:0},{goalId:''},{solutionId:''}])assert.deepEqual(prepareGoalStatementCopy({...context,...patch},''),{kind:'blocked'});
 assert.deepEqual(prepareGoalStatementCopy(context,'x'.repeat(3001)),{kind:'blocked'});
});
