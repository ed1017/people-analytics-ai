import {readFileSync} from 'node:fs';
import {createBundleDraft,reconcileBundle,unknownAssumption} from '../../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../../lib/home-action-plan-pilot.ts';
const legacy=JSON.parse(readFileSync(new URL('./home-plan-legacy-costs.json',import.meta.url)));
export const entered=value=>({value,kind:'user-entered',basis:'Explicit offline fixture.'});
export function summaryFixture(mode='known'){
 const draft=prepareIllustrativePilot(createBundleDraft(legacy.base.bundle,{...legacy.base.binding,goal:'Review training and hiring for 10 participants over 6 months.'}),'2026-10-06T12:00:00Z',{includeDeliveryEstimate:true});
 delete draft.inputs.whatIf;draft.inputs.scope.months=entered(6);draft.inputs.scope.capacityRequired=entered(false);draft.inputs.costsDistinct=entered(true);draft.inputs.dependenciesConfirmed=entered(true);
 draft.inputs.groups=[{id:'participants',label:'Reviewed participants',count:entered(10)}];draft.inputs.groupsDisjoint=entered(true);draft.inputs.memberships=draft.bundle.components.map(component=>({componentId:component.id,groupIds:['participants'],complete:entered(true)}));
 draft.inputs.expenses=[['training','Training',1000],['hiring','Hiring fees',2000]].map(([id,label,amount])=>({id,label,kind:'cash',amount:entered(amount),startMonth:draft.inputs.scope.startMonth,months:entered(1)}));
 draft.inputs.expenseLinks=draft.inputs.expenses.map(row=>({expenseId:row.id,componentIds:[draft.bundle.components[0].id],allocations:null}));
 draft.inputs.costReviews.forEach(row=>row.complete=entered(mode!=='partial'));
 if(mode==='unknown'){draft.inputs.expenses[0].amount=unknownAssumption();draft.inputs.timing[0].start=unknownAssumption();}
 if(mode==='zero')draft.inputs.expenses.forEach(row=>row.amount=entered(0));
 const result=reconcileBundle(draft);return {name:mode,draft,result};
}
