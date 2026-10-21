// @ts-expect-error Native Node tests share TypeScript source.
import {readBundleDraft,reviseBundleDraft,unknownAssumption,type Assumption,type BundleDraft} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planningStatements,resolveHomePlanningIntent,planningRequirementText} from './home-planning-intent.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {refreshGeneratedReductionHorizon} from './home-action-plan-pilot.ts';

const entered=<T>(value:T,basis:string):Assumption<T>=>({value,kind:'user-entered',basis});
const pilotDefault=(value:Assumption<unknown>)=>value.kind==='illustrative'&&value.basis?.startsWith('illustrative-pilot-v1; prepared ');
const scenarioDefault=(value:Assumption<number>,expected:number)=>value.kind==='illustrative'&&value.value===expected&&value.basis==='Visible illustrative what-if starting assumption, not an observed baseline, forecast, quote or validated effect.';
export type SavedPilotCorrection={draft:BundleDraft;changes:string[]};

/** Read-only offer for known generated defaults. Saved snapshots are never migrated on read.
 * An explicit or adopted plan edit wins over the goal; only untouched defaults/missing fields qualify.
 */
export function savedPilotCorrection(source:BundleDraft,goalContext?:unknown):SavedPilotCorrection|null {
 if(!readBundleDraft(source)||source.revision>=100000||source.pilot?.version!=='illustrative-pilot-v1'||!/\b(turnover|retention|retain)\b/i.test(source.binding.goal))return null;
 const intent=resolveHomePlanningIntent([source.binding.goal,...planningStatements(goalContext)]);
 if(intent.rateConflict)return null;
 const input=structuredClone(source.inputs),changes:string[]=[];
 const scenario=input.whatIf;
 const explicit=(value:Assumption<unknown>)=>value.kind==='user-entered'||value.kind==='adopted';
 const defaultScenario=scenario?.kind==='turnover'&&(scenarioDefault(scenario.baseline,15)||explicit(scenario.baseline))&&scenarioDefault(scenario.target,12);
 const retainedRatePeriod=scenario&&explicit(scenario.baseline)?scenario.ratePeriod??null:intent.baseline!==null?intent.baselinePeriod:null;
 let correctedMeasure=false,populationReviewed=false;
 const reduction=intent.pointReduction!==null?`${intent.pointReduction} percentage-point reduction`:intent.relativeReduction!==null?`${intent.relativeReduction}% relative reduction`:null;
 if(defaultScenario&&!input.successMeasure&&reduction){
  const preserveDenominator=explicit(scenario.population),preserveBaseline=explicit(scenario.baseline);
  correctedMeasure=true;populationReviewed=true;
  if(preserveDenominator||preserveBaseline){input.whatIf={...scenario,baseline:preserveBaseline?scenario.baseline:unknownAssumption(),target:unknownAssumption(),population:preserveDenominator?scenario.population:unknownAssumption()};}
  else delete input.whatIf;
  input.successMeasure={goal:source.binding.goal,scopeKey:'pending',name:'Turnover rate for the stated plan population',baseline:explicit(scenario.baseline)?{...scenario.baseline,value:`${scenario.baseline.value}%`}:intent.baseline===null?unknownAssumption():entered(`${intent.baseline}%`,'Baseline explicitly stated in the original goal context; confirm the same scope and period.'),target:entered(reduction+(intent.target===null?'':`; ending rate ${intent.target}%`),'Original user-requested reduction, not an estimated or validated intervention effect. No missing rate or workforce denominator is inferred.')};
  changes.push(`Restore the requested ${reduction}; remove the generated ending rate${scenarioDefault(scenario.baseline,15)?' and baseline':''}. ${preserveDenominator?'Keep the user-supplied workforce denominator separate from activity participants.':'Remove the generated 100-person denominator.'}`);
 }
 // Generated workforce/participant counts are independent of an edited rate pair.
 // Never interpret a supplied average-workforce denominator as activity participants.
 if(reduction&&input.whatIf?.kind==='turnover'&&scenarioDefault(input.whatIf.population,100)){
  input.whatIf.population=unknownAssumption();populationReviewed=true;
  changes.push('Remove the generated 100-person workforce denominator; the average-workforce count remains unknown. Your edited rates are preserved.');
 }
 if(reduction)for(const group of input.groups)if(group.id==='pilot-group'&&group.count.value===10&&pilotDefault(group.count)){
  group.count=intent.participants===null?unknownAssumption():entered(intent.participants,'Participant count explicitly stated in the original goal context.');
  group.label=intent.participants===null?'Participant population requires review':'User-stated participant population';populationReviewed=true;
  changes.push(intent.participants===null?'Remove the generated ten-person pilot group; the participant count requires review.':`Restore the original ${intent.participants}-participant group; keep workforce counts separate.`);
 }
 if(populationReviewed&&pilotDefault(input.scope.population))input.scope.population=intent.companyWide?entered('Company-wide turnover; all countries and business units','Original user scope; matching average-workforce denominator remains unknown.'):{value:'Population unspecified; confirm before using this plan',kind:'illustrative',basis:'The original goal did not identify the population. This label supplies no population or workforce count.'};
 if(intent.months!==null&&input.scope.months.value===3&&pilotDefault(input.scope.months)&&intent.months!==3){input.scope.months=entered(intent.months,'Planning horizon explicitly stated in the original goal context.');changes.push(`Restore the requested ${intent.months}-month horizon; retain existing activity dates for review.`);}
 if(intent.budgetCap!==null&&!input.budget){input.budget={amount:entered(intent.budgetCap,'Original user cash budget ceiling; not a confirmed expense or funding source.'),basis:entered('cash','Incremental cash only; existing employee time stays in hours.')};changes.push(`Carry the original $${intent.budgetCap.toLocaleString('en-US')} cash ceiling into the calculator.`);}
 if(!changes.length)return null;
 if(defaultScenario&&reduction&&!source.inputs.successMeasure&&input.whatIf)input.whatIf.scopeKey=JSON.stringify([input.scope.population.value,input.scope.startMonth.value,input.scope.months.value]);
 if(input.successMeasure&&correctedMeasure){
  const measure=input.successMeasure,months=input.scope.months.value,periodLabel=retainedRatePeriod==='ytd'?'YTD':retainedRatePeriod;
  measure.scopeKey=JSON.stringify([input.scope.population.value,input.scope.startMonth.value,months]);
  measure.name=`Turnover reduction target over ${months??'the requested'} months for the stated plan population`;
  if(periodLabel&&measure.baseline.value!==null){
   measure.baseline.value+=` ${periodLabel}`;
   const mismatch=retainedRatePeriod==='ytd'||retainedRatePeriod==='annualized'&&months!==12;
   if(mismatch){measure.name+=`; the ${periodLabel} baseline is not a confirmed ${months??'matching'}-month baseline`;changes.push(`Keep the supplied ${periodLabel} baseline in its original period. Review a matching baseline before comparing rates; no automatic conversion is applied.`);}
  }
 }
 const requirements=planningRequirementText(intent);if(input.scope.requirements.value===null&&requirements)input.scope.requirements=entered(requirements,'Explicit original goal constraints; this ceiling is not an expense.');
 refreshGeneratedReductionHorizon(source,input);
 return {draft:reviseBundleDraft(source,input),changes};
}

/** A user-edited target is deliberate saved work, even when its old generated baseline needs review. */
export function savedPilotReviewNotes(source:BundleDraft,goalContext?:unknown):string[]{
 const scenario=source.inputs.whatIf,intent=resolveHomePlanningIntent([source.binding.goal,...planningStatements(goalContext)]);
 if(intent.pointReduction===null&&intent.relativeReduction===null)return [];
 return source.pilot?.version==='illustrative-pilot-v1'&&scenario?.kind==='turnover'&&scenarioDefault(scenario.baseline,15)&&(scenario.target.kind==='user-entered'||scenario.target.kind==='adopted')?['This plan pairs an earlier generated 15% baseline with your edited target rate. Review the baseline and target together in chat. An automatic correction will not replace your target.']:[];
}
