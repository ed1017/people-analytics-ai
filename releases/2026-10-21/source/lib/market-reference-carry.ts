import {marketCarryEvidence as oewsCarryEvidence} from './oews-reference.mjs';
// @ts-expect-error Native tests share this canonical source.
import {UK_SOFTWARE_PAY_REFERENCE,TORONTO_SOFTWARE_VACANCY_REFERENCE} from './external-workforce-evidence.ts';
import type {DecisionStore,Json} from './local-decisions';

export type MarketCarry = {soc:string;area:string;goal:string} | {version:1;kind:'external-workforce-reference';referenceId:string;goal:string};
export const marketReferenceLimitations='Reference only; no model assumptions changed. Keep currencies, periods, populations and occupation taxonomies separate. Do not convert currency, annualize hourly pay, map internal roles, infer available candidates or hiring time, or treat wages as total employer cost. This evidence alone cannot establish whether hiring or development is preferable.';
/** Resolve only known identifiers. Client values, labels and URLs never become source evidence. */
export function marketCarryEvidence(input:unknown,expectedGoal?:string){
 if(!input||typeof input!=='object')return null;
 const value=input as Record<string,unknown>;
 if(typeof value.goal!=='string'||!value.goal.trim()||value.goal.length>240)return null;
 if(expectedGoal!==undefined&&value.goal!==expectedGoal)return null;
 if(value.kind===undefined&&value.version===undefined)return oewsCarryEvidence(input);
 if(value.kind!=='external-workforce-reference'||value.version!==1)return null;
 const reference=value.referenceId===UK_SOFTWARE_PAY_REFERENCE.id?UK_SOFTWARE_PAY_REFERENCE:value.referenceId===TORONTO_SOFTWARE_VACANCY_REFERENCE.id?TORONTO_SOFTWARE_VACANCY_REFERENCE:null;
 return reference?{kind:'external-workforce-reference' as const,version:1,goal:value.goal,reference:structuredClone(reference),planningStatus:marketReferenceLimitations}:null;
}
export function canonicalMarketCarry(input:unknown):MarketCarry|null{
 const evidence=marketCarryEvidence(input);if(!evidence)return null;
 const value=input as Record<string,unknown>;
 return value.kind==='external-workforce-reference'?{version:1,kind:'external-workforce-reference',referenceId:String(value.referenceId),goal:String(value.goal)}:{soc:String(value.soc),area:String(value.area),goal:String(value.goal)};
}
/** Same goal envelope and revision transaction as scenario saves; no new storage channel. */
export function saveMarketReference({store,datasetToken,goalId,goal,revision,carry,at}:{store:DecisionStore;datasetToken:string;goalId:string;goal:string;revision:number;carry:unknown;at:string}){
 if(store.getDatasetToken()!==datasetToken||!goalId)throw Error('Select a saved goal in the current dataset before carrying a reference.');
 const canonical=carry===null?null:canonicalMarketCarry(carry);
 if(carry!==null&&(!canonical||canonical.goal!==goal))throw Error('The reference or goal changed. Review your selection.');
 const evidence=canonical?marketCarryEvidence(canonical):null;
 return store.commitGoalFields(goalId,goal,revision,at,fields=>{
  if(fields.evidence!==undefined&&!Array.isArray(fields.evidence))throw Error('Existing evidence history is unavailable; previous values are retained.');
  const history=Array.isArray(fields.evidence)?fields.evidence:[];
  const entry=evidence?{page:'labor-market',capturedAt:at,schemaVersion:1,evidence}:null;
  const duplicate=history.some(item=>item&&typeof item==='object'&&!Array.isArray(item)&&item.page==='labor-market'&&JSON.stringify(item.evidence)===JSON.stringify(evidence));
  return {marketCarry:canonical as Json,evidence:(entry&&!duplicate?[...history,entry]:history) as Json};
 });
}
