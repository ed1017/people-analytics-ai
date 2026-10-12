// @ts-expect-error Native fixtures share source.
import {captureMetricHistory,resolveHistoricalMetric,historicalMetrics,legacyAggregateBaseline,type MetricHistory} from './home-metric-context.ts';
// @ts-expect-error Native fixtures share source.
import {type CompanyTurnoverContext} from './home-turnover-context.ts';
import type {Assumption,BundleDraft,BundleInputs} from './home-bundle-reconciliation';
export type SuccessMeasure={goal:string;scopeKey:string;name:string;baseline:Assumption<string>;target:Assumption<string>;history?:MetricHistory;companyTurnover?:CompanyTurnoverContext};
export type MeasureSuggestion={name:string;status:string;baseline:Assumption<string>|null;history?:MetricHistory;companyTurnover?:CompanyTurnoverContext};
const unknown=():Assumption<string>=>({value:null,kind:'unknown',basis:null});
export function suggestSuccessMeasure(goal:string,pack:unknown,evidenceDigest?:string):MeasureSuggestion{
 const resolution=resolveHistoricalMetric(goal),history=evidenceDigest?captureMetricHistory(goal,pack,evidenceDigest):undefined;
 const name=(resolution.kind==='supported'||resolution.kind==='suggested')?historicalMetrics[resolution.metric].name:resolution.kind==='unsupported'?'Requested metric (definition required)':'Completion of agreed delivery milestones';
 return {name,baseline:null,...(history?{history}:{}),status:'Historical context is not a matching plan baseline. Define the plan population, metric and observation period; baseline and target remain separate assumptions.'};
}
export function reviewSuccessMeasure(draft:BundleDraft,name:string,baseline:string,target:string,kind:'user-entered'|'illustrative',suggestion:MeasureSuggestion,useObserved:boolean):BundleInputs{
 if(!name.trim()||name.trim().length>240||baseline.length>240||target.length>240)throw Error('Use a measure name and values of at most 240 characters.');
 const assumed=(value:string,label:string):Assumption<string>=>value.trim()&&!/^unknown$/i.test(value.trim())?{value:value.trim(),kind,basis:kind==='illustrative'?`Illustrative ${label}; not observed evidence or a prediction.`:`User-entered ${label}; not independently verified or predicted.`}:unknown();
 if(useObserved)throw Error('Historical aggregates are context only; review a separate plan baseline.');
 const legacy=draft.inputs.successMeasure?.companyTurnover;
 const context=legacy?undefined:draft.inputs.successMeasure?.history??suggestion.history;
 const inputs=structuredClone(draft.inputs);inputs.successMeasure={goal:draft.binding.goal,scopeKey:measurementScope(draft.inputs),name:name.trim(),baseline:draft.inputs.successMeasure?.name===name&&draft.inputs.successMeasure.baseline.value===baseline?structuredClone(draft.inputs.successMeasure.baseline):assumed(baseline,'baseline'),target:assumed(target,'target'),...(context?{history:structuredClone(context)}:{}),...(legacy?{companyTurnover:structuredClone(legacy)}:{})};inputs.scope.comparisonConfirmed={value:null,kind:'unknown',basis:null};return inputs;
}
export const measurementScope=(inputs:BundleInputs)=>JSON.stringify([inputs.scope.population.value,inputs.scope.startMonth.value,inputs.scope.months.value]);
export const legacyCompanyBaseline=(measure:SuccessMeasure)=>legacyAggregateBaseline(measure.baseline);
export function successMeasureText(measure:SuccessMeasure|undefined,current=true):string{
 if(measure&&!current)return 'Saved measure needs renewed review: the plan population or horizon changed. Discuss the measure and current scope in chat.';
 if(!measure)return 'No reviewed success measure. Discuss the measure, baseline and target in chat.';
 const display=(value:Assumption<string>,target=false)=>value.value===null?(target?'Target: Unknown':'Baseline: Unknown'):`${value.kind==='adopted'?'Recorded baseline':value.kind==='illustrative'?(target?'Assumed target':'Assumed baseline'):target?'User target':'User-entered baseline'}: ${value.value}`;
 return `${measure.name}. ${legacyCompanyBaseline(measure)?'Legacy source value: '+measure.baseline.value+'; plan baseline: Unverified':display(measure.baseline)}; ${display(measure.target,true)}. Targets are not predicted effects.`;
}
