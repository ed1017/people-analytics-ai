import type {BusinessPlanning} from './home-business-planning';
// @ts-expect-error Native test replay uses application TypeScript.
import {readBusinessPlanning,selectBusinessPlanningMix} from './home-business-planning.ts';
// @ts-expect-error Native test replay uses application TypeScript.
import {reviseDemandReview} from './swp-demand.ts';
// @ts-expect-error Native test replay uses application TypeScript.
import {editStaffingInputs,calculateServiceStaffing} from './home-service-staffing.ts';

export type PreviewAssumptions={budget:string;arrivalDate:string;moveMonth:string;buildMonth:string};
export function previewAssumptions(state:BusinessPlanning):PreviewAssumptions{
 const values=state.staffing!.inputs.values;
 return {budget:state.review.spec.budgetUsd.value?.toString()??'',arrivalDate:String(values.arrivalDate.value??''),moveMonth:String(values.moveMonth.value??''),buildMonth:String(values.buildMonth.value??'')};
}
/** Explicit planner edits reuse the production validators and calculation. Original remains immutable. */
export function editPreviewAssumptions(original:BusinessPlanning,draft:PreviewAssumptions,id:string):BusinessPlanning{
 const state=readBusinessPlanning(original)!;if(!state.staffing)throw Error('A calculated staffing baseline is required.');
 const previous=previewAssumptions(state),budget=draft.budget.trim()===''?null:Number(draft.budget);
 if(budget!==null&&(!Number.isFinite(budget)||budget<0||budget>100000000))throw Error('Enter a budget from 0 to 100,000,000 USD, or leave it blank for unknown.');
 const lines=[`Budget USD: ${budget===null?'not supplied':budget}.`,...(['arrivalDate','moveMonth','buildMonth'] as const).map(key=>`${key}: ${draft[key]}.`)];
 const turn={id,text:lines.join('\n')},basis=(quote:string)=>({kind:'user-supplied' as const,turnId:id,quote,explanation:'Explicit planner entry; not operational approval.'});
 const review=budget===state.review.spec.budgetUsd.value?state.review:reviseDemandReview(state.review,{baseKey:state.review.key,changes:[{field:'budgetUsd',quantity:{...state.review.spec.budgetUsd,value:budget,basis:basis(lines[0])},number:null,text:null,basis:basis(lines[0])}]},state.context,id,[turn],id);
 const changes=(['arrivalDate','moveMonth','buildMonth'] as const).flatMap((key,index)=>draft[key]===previous[key]?[]:[{field:key,value:draft[key],basis:basis(lines[index+1])}]);
 const inputs=changes.length?editStaffingInputs(review,state.staffing.inputs,changes,turn,[turn]):state.staffing.inputs;
 const updated=readBusinessPlanning({...state,review,staffing:{inputs,result:calculateServiceStaffing(review,inputs)}})!;
 return state.staffing.selectedMix?selectBusinessPlanningMix(updated,state.staffing.selectedMix):updated;
}
