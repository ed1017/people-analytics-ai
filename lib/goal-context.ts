export type GoalNote = {text:string; page:string; scope:string; truncated:boolean; kind:"requirement"|"context"};
export type GoalRequirements = {constraints:string; decisions:string; notes:GoalNote[]};
export const emptyGoalRequirements = ():GoalRequirements=>({constraints:"",decisions:"",notes:[]});
const clean=(value:unknown,max:number)=>typeof value==="string"?value.slice(0,max):"";
export function normalizeGoalRequirements(value:unknown):GoalRequirements {
 const raw=value&&typeof value==="object"?value as Record<string,unknown>:{};
 const notes=Array.isArray(raw.notes)?raw.notes.slice(-12).filter(n=>n&&typeof n==="object"&&typeof n.text==="string").map(n=>({text:clean(n.text,800),page:clean(n.page,60),scope:clean(n.scope,200),truncated:n.truncated===true||n.text.length>800,kind:n.kind==="requirement"?"requirement" as const:"context" as const})):[];
 return {constraints:clean(raw.constraints,600),decisions:clean(raw.decisions,600),notes};
}
export function addGoalNote(previous:GoalRequirements,text:string,page:string,scope:string):GoalRequirements {
 const note={text:text.trim().slice(0,800),page:page.slice(0,60),scope:scope.slice(0,200),truncated:text.trim().length>800,kind:/\b(no net|without|must|do not|don.t|cannot|only|budget|constraint|at most|within|limit|no external|no new|no more)\b/i.test(text)?"requirement" as const:"context" as const};
 if(!note.text)return previous;
 const notes=previous.notes.filter(n=>!(n.text===note.text&&n.page===note.page&&n.scope===note.scope));
 const all=[...notes,note];
 return {...previous,notes:[...all.filter(n=>n.kind==="requirement").slice(-6),...all.filter(n=>n.kind!=="requirement").slice(-6)]};
}
export function normalizeGoalContext(value:unknown) {
 const raw=value&&typeof value==="object"?value as Record<string,unknown>:{};
 return {goal:clean(raw.goal,240),...normalizeGoalRequirements(raw),currentScope:clean(raw.currentScope,400)};
}
export const goalContextInstructions = `ACTIVE GOAL CONTEXT contains user-authored requirements, assumptions, confirmed decisions and recent user statements, not source evidence. Preserve explicit constraints (including no net headcount growth) across pages. User requirement notes are retained separately from the six most recent general statements, with up to six requirement notes. Notes retain their original page/scope; they may be questions, conditional proposals or constraints, so do not treat every note as an approved decision. Only the explicitly user-edited confirmed-decisions field is a decision record. Never promote assistant proposals or inferred preferences to decisions. A selected filter describes current evidence scope, not approval of a plan. Truncated notes are incomplete; ask one necessary clarification rather than inventing the omitted requirement. Related evidence is a bounded cached cross-page summary with its own date/population; current-page evidence is primary. Do not merge denominators, relabel company-only sources, imply comprehensive coverage or infer causal/ROI outcomes.`;
export const goalSummaryInstructions = `Write a NEW synthesis of this page's actual evidence in relation to ACTIVE GOAL CONTEXT. Do not recap or quote the conversation, list navigation destinations, or give a generic page tour. At most 90 words: one concise takeaway grounded in at most two relevant facts with source/date/scope, followed by one useful next action. Preserve stated requirements, assumptions and confirmed decisions, including workforce-growth limits. Use relevant supplied cross-page evidence only with its separate scope and provenance. If the needed evidence is unavailable, say exactly what is missing and give a feasible next step instead of inventing a finding. Course coverage is not proven capability gain; attrition is not a causal explanation; modeled plans are not approved or observed outcomes. No tools, new queries, calculations, filter changes or execution. This is a selected-goal page opening, not a request to run anything.`;

export function goalSummaryRequest(payload:Record<string,unknown>,context:unknown) {
 const goalContext=normalizeGoalContext(context);
 return {...payload,summaryOnly:true,summaryGoal:goalContext.goal,goalContext,hasFocusedIssue:true,history:[],message:"Give a concise new takeaway from this page's evidence for my active goal and requirements, then one relevant next action."};
}
