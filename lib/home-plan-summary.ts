import type {Assumption,BundleDraft,BundleResult} from './home-bundle-reconciliation';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleAssumptionText,bundleDisplayText,bundleHorizonEnd,bundleIsAnalysisOnly} from './home-bundle-display.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planDeliveryEstimate,planStaffEffort} from './home-plan-delivery-estimate.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planCashEstimate} from './home-plan-cash.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {calculatePlanWhatIf} from './home-plan-what-if.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {measurementScope,suggestSuccessMeasure} from './home-success-measures.ts';

export type PlanSummarySection={heading:string;items:string[];label?:string};
const money=(value:number|null|undefined)=>value==null?'Unknown':`$${value.toLocaleString('en-US',{maximumFractionDigits:2})} USD`;
/** Break prose at sentence boundaries without changing saved wording or quantities. */
export const planSummarySentences=(text:string)=>Array.from(new Intl.Segmenter('en',{granularity:'sentence'}).segment(text),part=>part.segment.trim()).filter(Boolean);
function measureValue(value:Assumption<string|number>,target=false,suffix=''){
 const label=value.kind==='adopted'?'Recorded baseline':value.kind==='illustrative'?(target?'Assumed target':'Assumed baseline'):target?'User target':'User-entered baseline';
 return value.value===null?`${target?'Target':'Baseline'}: Unknown.`:`${label}: ${value.value}${suffix}.`;
}

/** Presentation only: use the existing calculators and preserve unresolved values. */
export function homePlanSummary(draft:BundleDraft,result:BundleResult|null|undefined,measurePack?:unknown):PlanSummarySection[]{
 const {inputs,bundle,binding}=draft,delivery=planDeliveryEstimate(draft),effort=planStaffEffort(draft),cash=planCashEstimate(draft,result?.cashTotal??null),whatIf=calculatePlanWhatIf(inputs),measure=inputs.successMeasure;
 const participants=delivery?delivery.participants:result?.uniqueParticipants??(inputs.groups.length===1?inputs.groups[0].count.value:null);
 const people=[participants===null?'Participants: Unknown; review the population and any overlap.':`${participants} assumed participants.`];
 if(effort.hasDelivery&&effort.hasCapacity)people.push(`Delivery staff hours: ${effort.deliveryHours??'Unknown'}.`,`Staffing training hours: ${effort.trainingHours??'Unknown'}.`,`Combined staff hours: ${effort.totalHours??'Unknown; review overlap before adding'}.`);
 else people.push(`${effort.totalHours??'Unknown'} total staff hours${effort.hasCapacity?' for staffing training':''}.`);
 if(result?.conditionalCoverage)people.push(`Conditional roles covered: ${result.conditionalCoverage.at(-1)??'Unknown'}.`,`Planned added employees: ${result.plannedAddedEmployees??'Unknown'}.`);
 const costs=[`Assumed cash ${money(cash.cash)}${cash.coverage==='partial'?' — listed subtotal':''}.`];
 if(cash.coverage!=='reviewed')costs.push(cash.coverage==='partial'?'Unresolved costs: omitted obligations and complete cost coverage.':'Cash costs are unresolved; unknown costs are not zero.');
 costs.push(`Reviewed full budget: ${money(result?.cashTotal)}.`);
 if(inputs.budget){
  costs.push(`Budget limit ${money(inputs.budget.amount.value)} (${inputs.budget.basis.value==='all-in'?'all-in cap':'cash cap'}, not an expense).`);
  const budget=result?.budget,complete=cash.coverage==='reviewed'&&result?.costPolicy!=='cash-hours-v1'&&result?.cashTotal!=null&&inputs.budget.basis.value==='cash';
  costs.push(!complete||budget?.headroom==null?'Budget feasibility is unresolved; no available headroom is established.':budget.headroom<0?`${money(-budget.headroom)} over the limit under reviewed assumptions.`:`${money(budget.headroom)} headroom under reviewed assumptions.`);
 }
 const timeline=[delivery?.finish?`Assumed deliverables by ${delivery.finish}.`:result?.planFinish?`Assumed component finish ${result.planFinish}.`:'Deliverable finish: Unknown.'];
 timeline.push(`Planning start: ${bundleAssumptionText(inputs.scope.startMonth)}.`,`Planning horizon: ${bundleAssumptionText(inputs.scope.months,value=>`${value} months`)}.`,`Horizon end: ${bundleAssumptionText(bundleHorizonEnd(inputs.scope))}.`);
 if(result?.capacityReadyMonth)timeline.push(`Conditional capacity from ${result.capacityReadyMonth}.`);
 const outcomes=(delivery?.deliverables??bundle.components.map(component=>component.name)).map(item=>`Deliverable target: ${item}.`);
 outcomes.push('Proposed deliverables; effects unvalidated.');
 if(/\b(turnover|retention|retain|exits)\b/i.test(binding.goal))outcomes.push('Retention effects are not established.');
 const measurement=[`Goal: ${binding.goal}`];
 if(measure){
  if(measure.scopeKey!==measurementScope(inputs))measurement.push('Saved measure needs renewed review: the plan population or horizon changed.');
  else measurement.push(`Metric: ${measure.name}.`,measureValue(measure.baseline),measureValue(measure.target,true));
 }else if(inputs.whatIf&&inputs.whatIf.scopeKey===measurementScope(inputs)){
  const kind=inputs.whatIf.kind;
  measurement.push(`Metric: ${kind==='turnover'?'Turnover rate (%)':'Additional roles covered'}.`,measureValue(inputs.whatIf.baseline,false,kind==='turnover'?'%':' roles'),measureValue(inputs.whatIf.target,true,kind==='turnover'?'%':' roles'));
  if(whatIf&&whatIf.status!=='ready')measurement.push(whatIf.reason);
 }else{
  measurement.push(`Suggested metric: ${suggestSuccessMeasure(binding.goal,measurePack).name}.`,'Baseline: Unknown.','Target: Unknown.');
  if(whatIf&&whatIf.status!=='ready')measurement.push(whatIf.reason);
 }
 const approach=planSummarySentences(bundleDisplayText(bundle.coordination,bundle,inputs));
 if(bundleIsAnalysisOnly(bundle))approach.push('Analytical first steps; a delivery intervention still needs review.');
 return [
  {heading:'Approach',items:approach},
  {heading:'Stakeholders',items:[...new Set(bundle.components.map(item=>`Proposed role: ${item.ownerRole}.`)),'Owners are not assigned.']},
  {heading:'People needed',items:people},
  {heading:'Cost',label:'Plan budget check',items:costs},
  {heading:'Timeline',items:timeline},
  {heading:'Expected outcome',items:outcomes},
  {heading:'How success is measured',items:measurement},
 ];
}
