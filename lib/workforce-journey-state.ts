// Derived guidance only: never persist this projection or use it to authorize a save.
import type {LocalGoals} from './local-goals';
// @ts-expect-error Native Node tests share TypeScript source.
import {readWorkforceSolution,currentSolutionVersion,solutionResultIsCurrent,solutionSections} from './workforce-solution.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {emptyWorkforcePlanInput,workforcePlanFields,type WorkforcePlanInput,type WorkforcePlanField} from './workforce-increment.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {workforceInputReadiness} from './workforce-input-readiness.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {readSavedWorkforceReview} from './workforce-solution-review.ts';

export type JourneyRecords = {
  ready:boolean;
  writable:boolean;
  goals:LocalGoals;
  solution:unknown;
  selectedResultId?:string;
  alternativeHistory:unknown;
};
export type JourneyTransient = {context:string} & (
  | {kind:'working'; operation:'clarify'|'calculate'|'search'|'preview'|'verify'}
  | {kind:'proposal'}
  | {kind:'input-draft'; input:WorkforcePlanInput}
  | {kind:'alternatives'}
  | {kind:'tailoring'; input:WorkforcePlanInput; preview:'needed'|'ready'}
  | {kind:'cancelled'}
);
export type JourneyStep = 'loading'|'choose-goal'|'unavailable'|'storage-blocked'|'start-inputs'|
  'align-goal'|'working'|'review-proposal'|'correct-inputs'|'save-inputs'|'calculate'|
  'historical'|'verify-result'|'compare'|'review-alternatives'|'preview-tailoring'|'save-solution';
export type JourneyFocus = {kind:'field'; field:WorkforcePlanField}|{kind:'control'; id:JourneyStep};
export type JourneyState = {
  step:JourneyStep; focus:JourneyFocus; context:string; staleTransient:boolean;
  readiness:ReturnType<typeof workforceInputReadiness>|null;
  resultId:string|null;
};
/** In-memory equality token, not a digest, durable record, validation or permission. */
export function workforceJourneyContext(records:JourneyRecords):string {
  const goal=records.goals.goals.find(item=>item.id===records.goals.activeId);
  return JSON.stringify([records.ready,records.writable,records.goals.activeId,goal??null,
    records.solution??null,records.selectedResultId??null,records.alternativeHistory??null]);
}
/** verificationContext must come from the existing successful worker check, never this selector. */
export function selectWorkforceJourney(records:JourneyRecords, transient?:JourneyTransient,
  verificationContext?:string):JourneyState {
  const context=workforceJourneyContext(records);
  const staleTransient=!!transient&&transient.context!==context;
  const active=staleTransient?undefined:transient;
  let readiness:JourneyState['readiness']=null;
  let resultId:string|null=null;
  const state=(step:JourneyStep,field?:WorkforcePlanField):JourneyState=>({step,
    focus:field?{kind:'field',field}:{kind:'control',id:step},context,staleTransient,readiness,resultId});
  if(!records.ready)return state('loading');
  const goal=records.goals.goals.find(item=>item.id===records.goals.activeId);
  if(!goal)return state('choose-goal');
  if(!records.writable)return state('storage-blocked');
  if(records.solution==null)return state('start-inputs');
  const solution=readWorkforceSolution(records.solution);
  if(!solution||solution.goalId!==goal.id)return state('unavailable');
  const version=currentSolutionVersion(solution);
  if(version.inputs.scope.goalStatement!==goal.statement)return state('align-goal');
  if(active?.kind==='working'||solution.pending)return state('working');
  if(active?.kind==='proposal')return state('review-proposal');
  const input=emptyWorkforcePlanInput();
  for(const field of workforcePlanFields){
    const sections=solutionSections.filter(section=>Object.hasOwn(version.inputs[section],field));
    if(sections.length>1)return state('unavailable');
    const value=sections.length?version.inputs[sections[0]][field]:'';
    if(typeof value!=='string')return state('unavailable');
    input[field]=value;
  }
  const draft=active?.kind==='input-draft'||active?.kind==='tailoring'?active.input:input;
  readiness=workforceInputReadiness(draft);
  if(readiness.corrections.length){
    const fixed=['businessUnit','jobProfile','intent','roles','planningMonth','months'];
    const field=readiness.corrections[0].fields.find(key=>active?.kind!=='tailoring'||!fixed.includes(key));
    return state('correct-inputs',field);
  }
  if(active?.kind==='input-draft')return state('save-inputs');
  const results=solution.results.filter(item=>item.kind==='brief'&&item.calculator.name==='single-role-workforce-review');
  const result=records.selectedResultId?results.find(item=>item.id===records.selectedResultId):results.at(-1);
  if(records.selectedResultId&&!result)return state('unavailable');
  if(!result)return state('calculate');
  resultId=result.id;
  if(!readSavedWorkforceReview(solution,result))return state('unavailable');
  if(result.version!==version.version||!solutionResultIsCurrent(solution,result))return state('historical');
  if(active?.kind==='alternatives')return state('review-alternatives');
  // All card comparisons need their existing asynchronous validation, including history/lineage.
  if(verificationContext!==context)return state('verify-result');
  if(active?.kind==='tailoring')return state(active.preview==='ready'?'save-solution':'preview-tailoring');
  return state('compare');
}
