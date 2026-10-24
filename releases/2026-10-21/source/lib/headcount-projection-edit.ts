import type {HeadcountProjection} from './home-solution-projection';
import type {ProjectionField,ProjectionSpec} from './home-solution-conversation-schema';
// @ts-expect-error Native offline tests share TypeScript source.
import {calculateHeadcountProjection,readHeadcountProjections,projectionDigest} from './home-solution-projection.ts';
export type ProjectionEdit={months:number;values:Partial<Record<ProjectionField,number>>};
export function projectionEditFields(analysis:HeadcountProjection):ProjectionField[]{
 return analysis.spec.method==='monthly_flow'?['monthly_hires','monthly_exits',...(Object.values(analysis.inputs.filters).some(v=>v!=='all')?['monthly_transfers_in','monthly_transfers_out'] as ProjectionField[]:[])]:['annual_growth_pct','annual_attrition_pct','fill_rate_pct','productivity_hiring_reduction_pct'];
}
export async function previewProjectionEdit(base:HeadcountProjection,edit:ProjectionEdit,turnId:string,prior:HeadcountProjection[]=[base]){
 readHeadcountProjections([base]);
 if(!Number.isSafeInteger(edit.months)||edit.months<1||edit.months>24)throw Error('Enter a horizon of 1–24 whole months.');
 const fields=projectionEditFields(base);
 if(Object.keys(edit.values).some(k=>!fields.includes(k as ProjectionField)))throw Error('This control does not apply to the projection method or scope.');
 const changes:ProjectionSpec['changes']=Object.entries(edit.values).filter(([k,v])=>v!==base.assumptions[k as ProjectionField]).map(([field,value])=>({field:field as ProjectionField,kind:'literal',value:value!,basis:'user',turnId,interpretation:'Explicit local scenario control; a conditional assumption, not an observed rate.'}));
 const result=await calculateHeadcountProjection({...base.spec,base:{id:base.id,revision:base.revision},months:edit.months,changes},base.inputs,prior,[turnId]);
 // The user operates these controls directly; do not call their entry a model interpretation.
 result.interpretations=[...base.interpretations,...changes.map(c=>`${c.field}: ${c.value}. Explicit local scenario assumption.`),...(edit.months!==base.spec.months?[`Horizon: ${edit.months} months, explicitly entered.`]:[])];
 readHeadcountProjections([result]);return result;
}
/** Fresh GET receipt validation. No model request or source substitution. */
export async function verifyProjectionEditSource(base:HeadcountProjection,receipt:unknown,datasetToken:string){
 const r=receipt as {version:number;provenance:string;datasetToken:string;checkedAt:string;inputs:unknown;inputDigest:string};
 const canonical=(v:unknown)=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
 const expected=base.inputs.datasetVersion&&'publicDigest' in base.inputs.datasetVersion?'approved-public-projection-read':'legacy-live-source-read';
 if(!r||Object.keys(r).sort().join(',')!=='checkedAt,datasetToken,inputDigest,inputs,provenance,version'||r.version!==1||r.provenance!==expected||r.datasetToken!==datasetToken||typeof r.checkedAt!=='string'||!Number.isFinite(Date.parse(r.checkedAt))||new Date(r.checkedAt).toISOString()!==r.checkedAt||canonical(r.inputs)!==canonical(base.inputs)||r.inputDigest!==base.inputDigest||await projectionDigest(base.inputs)!==r.inputDigest)throw Error('The projection source changed or could not be verified. Your saved scenario is unchanged.');
}
