import {normalizeHomePack} from './home-pack.mjs';
import type {Assumption,BundleDraft,BundleInputs} from './home-bundle-reconciliation';
export type SuccessMeasure={goal:string;scopeKey:string;name:string;baseline:Assumption<string>;target:Assumption<string>};
export type MeasureSuggestion={name:string;status:string;baseline:Assumption<string>|null};
const unknown=():Assumption<string>=>({value:null,kind:'unknown',basis:null});
export function suggestSuccessMeasure(goal:string,pack:unknown):MeasureSuggestion{
 let name='Completion of agreed delivery milestones',id='',field='',unit='';
 if(/\b(turnover|retention|retain|exits)\b/i.test(goal)){name='Voluntary turnover (YTD %)';id='A1';field='voluntary_turnover_ytd_pct';unit='%';}
 else if(/\b(hiring|hire|recruiting|recruitment)\b/i.test(goal)){name='Median time to fill (days)';id='R1';field='median_time_to_fill_days';unit=' days';}
 else if(/\bengagement\b/i.test(goal)){name='Engagement favorable (%)';id='S1';field='engagement_favorable_pct';unit='%';}
 else if(/\bsatisfaction\b/i.test(goal))name='Comparable satisfaction score';
 else if(/\b(skills|learning|training|capability)\b/i.test(goal)){name='Weighted skill requirement coverage (%)';id='T1';field='weighted_requirement_met_pct';unit='%';}
 else if(/\b(capacity|roles|headcount)\b/i.test(goal))name='Additional roles covered at the reviewed deadline';
 const source=normalizeHomePack(pack).sources.find((item:{id:string})=>item.id===id),value=(source?.facts as Record<string,unknown>|undefined)?.[field];
 const baseline=source?.status==='loaded'&&typeof value==='number'&&Number.isFinite(value)?{value:String(value)+unit,kind:'adopted' as const,basis:`Recorded synthetic aggregate ${id}.${field}; ${source.scope}; ${source.date??'date unavailable'}. Confirm population and period.`.slice(0,240)}:null;
 return {name,baseline,status:baseline?'Suggested measure; source is context, not proof of a matching plan baseline. Review population, period and metric definition.':'Suggested measure for review; no matching observed baseline is available. Define the metric, population and period; leave missing values Unknown.'};
}
export function reviewSuccessMeasure(draft:BundleDraft,name:string,baseline:string,target:string,kind:'user-entered'|'illustrative',suggestion:MeasureSuggestion,useObserved:boolean):BundleInputs{
 if(!name.trim()||name.trim().length>240||baseline.length>240||target.length>240)throw Error('Use a measure name and values of at most 240 characters.');
 const assumed=(value:string,label:string):Assumption<string>=>value.trim()&&!/^unknown$/i.test(value.trim())?{value:value.trim(),kind,basis:kind==='illustrative'?`Illustrative ${label}; not observed evidence or a prediction.`:`User-entered ${label}; not independently verified or predicted.`}:unknown();
 if(useObserved&&(!suggestion.baseline||name!==suggestion.name))throw Error('The observed baseline must match the suggested measure; review a fresh baseline.');
 const inputs=structuredClone(draft.inputs);inputs.successMeasure={goal:draft.binding.goal,scopeKey:measurementScope(draft.inputs),name:name.trim(),baseline:useObserved?structuredClone(suggestion.baseline!):draft.inputs.successMeasure?.name===name&&draft.inputs.successMeasure.baseline.value===baseline?structuredClone(draft.inputs.successMeasure.baseline):assumed(baseline,'baseline'),target:assumed(target,'target')};inputs.scope.comparisonConfirmed={value:null,kind:'unknown',basis:null};return inputs;
}
export const measurementScope=(inputs:BundleInputs)=>JSON.stringify([inputs.scope.population.value,inputs.scope.startMonth.value,inputs.scope.months.value]);
export function successMeasureText(measure:SuccessMeasure|undefined,current=true):string{
 if(measure&&!current)return 'Saved measure needs renewed review: the plan population or horizon changed. Discuss the measure and current scope in chat.';
 if(!measure)return 'No reviewed success measure. Discuss the measure, baseline and target in chat.';
 const display=(value:Assumption<string>,target=false)=>value.value===null?(target?'Target: Unknown':'Baseline: Unknown'):`${value.kind==='adopted'?'Recorded baseline':value.kind==='illustrative'?(target?'Assumed target':'Assumed baseline'):target?'User target':'User-entered baseline'}: ${value.value}`;
 return `${measure.name}. ${display(measure.baseline)}; ${display(measure.target,true)}. Targets are not predicted effects.`;
}
