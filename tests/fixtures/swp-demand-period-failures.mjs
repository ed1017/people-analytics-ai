/** Reproduces observed quantity values, periods and basis kinds only.
 * Explanations below are synthetic; this is not an archived provider response.
 * Exact original argument bytes and hashes are retained separately, privately.
 */
import {illustrativeServiceReview,demandQuantityFields} from '../../lib/swp-demand.ts';
import {fixture} from './swp-clarification-continuation.mjs';
export function periodFailureSpec(variant,context){
 if(!['monthly-totals','horizon-totals'].includes(variant))throw Error('Unknown failure shape.');
 const spec=illustrativeServiceReview(context,fixture.clock).spec;
 spec.objective='Assess whether current teams can cover two new managed-services contracts.';spec.objectiveTurnId='swp-preview-user-1';spec.startMonth='2026-11';spec.months=6;
 for(const basis of [spec.scopeBasis,spec.linkageBasis,spec.startBasis,spec.monthsBasis,...demandQuantityFields.map(field=>spec[field].basis)])if(basis.kind==='illustrative'){basis.kind='model-proposed';basis.explanation='Synthetic reproduction of a proposed planning premise; not measured capacity.';}
 spec.contracts.basis={kind:'user-supplied',turnId:'swp-preview-user-1',quote:'We’re taking on two new managed-services contracts.',explanation:'User-supplied fictional count; not a staffing authorization.'};
 spec.linkageBasis={kind:'user-supplied',turnId:'swp-preview-user-2',quote:'It is service-desk work in client operations: triage, troubleshoot, resolve or escalate client IT support tickets.',explanation:'Fictional user identifies this role slice.'};
 const values={contracts:2,hoursPerContract:80,productiveHoursPerFte:120,existingRoles:null,existingFtePerRole:1,availabilityPct:0,ftePerRole:1,explicitAdditionalRoles:null,budgetUsd:null};
 for(const field of demandQuantityFields){
  spec[field].value=values[field];
  spec[field].period=['hoursPerContract','productiveHoursPerFte'].includes(field)?'month':variant==='monthly-totals'&&!['explicitAdditionalRoles','budgetUsd'].includes(field)?'month':'horizon';
  if(values[field]===null)spec[field].basis={kind:'unknown',turnId:null,quote:null,explanation:'Not supplied; preserve the unknown.'};
 }
 return spec;
}
