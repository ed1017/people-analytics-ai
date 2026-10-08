import type {DemandContext,DemandPatch,DemandReview,DemandQuantityField} from './swp-demand';
// @ts-expect-error Native Node fixtures share TypeScript source.
import {demandQuantityFields,readDemandReview,reviseDemandReview} from './swp-demand.ts';

export const demandEditorLabels:Record<DemandQuantityField,string>={contracts:'Contracts',hoursPerContract:'Role hours per contract',productiveHoursPerFte:'Productive hours per FTE',existingRoles:'Existing roles',existingFtePerRole:'FTE per existing role',availabilityPct:'Uncommitted availability (%)',ftePerRole:'FTE per additional role',explicitAdditionalRoles:'Explicit additional-role premise',budgetUsd:'Cash ceiling (USD)'};
export type DemandEditorDraft={baseKey:string;months:string;startMonth:string;values:Record<DemandQuantityField,string>;periods:{hoursPerContract:string;productiveHoursPerFte:string}};

/** Consume only an explicit editor request. Ordinary corrections stay in chat. */
export function demandEditorIntent(text:string):'open'|'close'|null {
 const value=text.trim().toLowerCase().replaceAll('’',"'").replace(/[.!?]+$/,'').replace(/^please\s+|,?\s+please$/g,'');
 const target='(?:(?:an?|the) )?(?:(?:assumption|assumptions) editor|editor|edit box)(?: for (?:my|these|the) assumptions)?';
 if(new RegExp('^(?:(?:can|could|would) you |can i )?(?:open|show(?: me)?|give me) '+target+'$').test(value)||new RegExp("^(?:i want|i need|i'd like|i would like) "+target+'$').test(value))return 'open';
 if(/^(?:close|cancel|dismiss) (?:the )?(?:assumption editor|assumptions editor|editor|edit box)$/.test(value))return 'close';
 return null;
}
export function createDemandEditorDraft(review:DemandReview):DemandEditorDraft {
 return {baseKey:review.key,months:review.spec.months?.toString()??'',startMonth:review.spec.startMonth??'',values:Object.fromEntries(demandQuantityFields.map(k=>[k,review.spec[k].value?.toString()??''])) as DemandEditorDraft['values'],periods:{hoursPerContract:review.spec.hoursPerContract.period??'',productiveHoursPerFte:review.spec.productiveHoursPerFte.period??''}};
}
/** Only changed fields acquire the explicit editor action's user provenance. */
export function reviewDemandEditor(current:DemandReview,draft:DemandEditorDraft,context:DemandContext,turnId:string):DemandReview {
 const source=readDemandReview(current,context),initial=createDemandEditorDraft(source);
 if(draft.baseKey!==source.key)throw Error('These assumptions changed. Reopen the editor on the current review.');
 const edits:DemandPatch['changes']=[],lines:string[]=[];
 const number=(value:string,label:string)=>{if(!value.trim()||!Number.isFinite(Number(value)))throw Error(`Enter a number for ${label}, or cancel to keep the current assumption.`);return Number(value);};
 const basis=(line:string)=>{lines.push(line);return {kind:'user-supplied' as const,turnId,quote:line,explanation:'Explicit entry in the optional assumption editor; an unverified planning input.'};};
 if(draft.months!==initial.months){const n=number(draft.months,'Planning months');if(!Number.isInteger(n)||n<1||n>24)throw Error('Planning months must be a whole number from 1 to 24.');if(n!==source.spec.months)edits.push({field:'months',quantity:null,number:n,text:null,basis:basis(`Planning months: ${n}.`)});}
 if(draft.startMonth!==initial.startMonth)edits.push({field:'startMonth',quantity:null,number:null,text:draft.startMonth,basis:basis(`Planning start: ${draft.startMonth}.`)});
 for(const field of demandQuantityFields){
  const period=field==='hoursPerContract'||field==='productiveHoursPerFte'?draft.periods[field]||null:source.spec[field].period;
  if(draft.values[field]===initial.values[field]&&period===source.spec[field].period)continue;
  const value=number(draft.values[field],demandEditorLabels[field]);
  if(value===source.spec[field].value&&period===source.spec[field].period)continue;
  const provenance=basis(`${demandEditorLabels[field]}: ${value}${period?` per ${period}`:''}.`);
  edits.push({field,quantity:{...source.spec[field],value,period:period as typeof source.spec[typeof field]['period'],basis:provenance},number:null,text:null,basis:provenance});
 }
 if(!edits.length)throw Error('No assumption values changed. Cancel to keep the current review.');
 return reviseDemandReview(source,{baseKey:source.key,changes:edits},context,turnId,[{id:turnId,text:lines.join('\n')}],turnId);
}
