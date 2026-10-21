/** Temporary text-copy contract. No parsing, numeric assumptions, storage or transport. */
export type GoalStatementContext={goalId:string;goalText:string;solutionId:string;version:number;inputIdentity:string;selectionId:string;blocked:boolean};
export type GoalStatementCopy={context:GoalStatementContext;previousStatement:string};
function valid(context:GoalStatementContext){return !context.blocked&&!!context.goalId&&!!context.solutionId&&Number.isSafeInteger(context.version)&&context.version>0&&!!context.goalText.trim()&&context.goalText.length<=3000}
function same(a:GoalStatementContext,b:GoalStatementContext){return a.goalId===b.goalId&&a.goalText===b.goalText&&a.solutionId===b.solutionId&&a.version===b.version&&a.inputIdentity===b.inputIdentity&&a.selectionId===b.selectionId&&a.blocked===b.blocked}
export function prepareGoalStatementCopy(context:GoalStatementContext,statement:string):{kind:'blocked'|'unchanged'}|{kind:'copy'|'confirm';request:GoalStatementCopy}{
 if(!valid(context)||typeof statement!=='string'||statement.length>3000)return {kind:'blocked'};
 if(statement===context.goalText)return {kind:'unchanged'};
 return {kind:statement===''?'copy':'confirm',request:{context:{...context},previousStatement:statement}};
}
export function acceptGoalStatementCopy(request:GoalStatementCopy,context:GoalStatementContext,statement:string):string|null{
 return valid(context)&&same(request.context,context)&&request.previousStatement===statement?context.goalText:null;
}
