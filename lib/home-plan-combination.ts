import type {Assumption,BundleDraft,BundleInputs,BundleResult,ManualExpense} from './home-bundle-reconciliation';
// @ts-expect-error Native Node tests share TypeScript source.
import {createBundleDraft,readBundleDraft,reconcileBundle,reviseBundleDraft,unknownAssumption} from './home-bundle-reconciliation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {componentOrder,type BundleComponent} from './home-solution-bundles.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {actionBindingKey} from './home-action-drafts.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {bundleDisplayText} from './home-bundle-display.ts';

export type CombinationSource={id:string;number:number;draft:BundleDraft};
export type CombinationReview={participants?:'same'|'disjoint';participantCount?:number;fees?:'distinct'|'shared-matches'};
export type CombinedPlanResult={status:'ready';draft:BundleDraft;result:BundleResult;notes:string[]}|{status:'needs-review';questions:string[]};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const entered=<T>(value:T,basis:string):Assumption<T>=>({value,kind:'user-entered',basis});
const proposed=<T>(value:T,basis:string):Assumption<T>=>({value,kind:'illustrative',basis});
const total=(values:(number|null)[])=>values.every(value=>value!==null)?values.reduce<number>((sum,value)=>sum+value!,0):null;

/** Compose only these supplied snapshots. Local component/expense IDs never establish cross-plan identity. */
export function combinePlanSnapshots(sources:CombinationSource[],review:CombinationReview={}):CombinedPlanResult{
 if(sources.length!==2||sources[0].id===sources[1].id)throw Error('Choose two different current Action Plans.');
 if(Object.keys(review).some(key=>!['participants','participantCount','fees'].includes(key))||review.participants!==undefined&&!['same','disjoint'].includes(review.participants)||review.fees!==undefined&&!['distinct','shared-matches'].includes(review.fees)||review.participantCount!==undefined&&(!Number.isInteger(review.participantCount)||review.participantCount<0||review.participantCount>1000000||review.participants!=='same'))throw Error('Review valid participant overlap and fee assumptions.');
 if(sources.some(source=>!readBundleDraft(source.draft)))return {status:'needs-review',questions:['A source plan has unsupported or invalid inputs, including its currency. Review that plan before combining.']};
 const [left,right]=sources.map(source=>source.draft),scope=left.inputs.scope;
 if(left.binding.goalId!==right.binding.goalId||left.binding.goal!==right.binding.goal)throw Error('Plans from different goals cannot be combined.');
 if(actionBindingKey(left.binding)!==actionBindingKey(right.binding))return {status:'needs-review',questions:['These plans use different evidence or planning contexts. Review them in one current goal context before combining.']};
 const mismatched=(['population','businessUnit','jobProfile','startMonth','months','demand','capacityRequired','requirements'] as const).filter(key=>!same(scope[key].value,right.inputs.scope[key].value));
 if(scope.currency!==right.inputs.scope.currency||mismatched.length)return {status:'needs-review',questions:[`Which shared scope and period should the combined plan use? The saved plans differ in ${mismatched.join(', ')||'currency'}.`]};
 if(!scope.population.value||!scope.startMonth.value||!scope.months.value)return {status:'needs-review',questions:['Confirm the shared population and planning period before calculating a combined proposal.']};
 if(sources.some(source=>source.draft.inputs.capacity||source.draft.inputs.whatIf?.kind==='capacity'))return {status:'needs-review',questions:['Review one combined staffing mix first. Adding separate role requirements or staffing transitions could double-count the same roles.']};

 const components:BundleComponent[]=[],timing:BundleInputs['timing']=[],maps:Map<string,string>[]=[],fingerprints=new Map<string,string>(),notes:string[]=[];
 for(const {draft} of sources){
  const mapped=new Map<string,string>();maps.push(mapped);
  for(const oldId of componentOrder(draft.bundle.components)){
   const original=draft.bundle.components.find(item=>item.id===oldId)!,dates=draft.inputs.timing.find(item=>item.componentId===oldId)!;
   const action=bundleDisplayText(original.firstStep,draft.bundle,draft.inputs),dependsOn=original.dependsOn.map(id=>mapped.get(id)!);
   const fingerprint=JSON.stringify([original.name,original.domain,action,original.ownerRole,dependsOn,dates.start,dates.finish]);
   // Matching wording is not proof that two cohorts share one delivery activity.
   let id=review.participants==='same'?fingerprints.get(fingerprint):undefined;
   if(!id){id='c'+(components.length+1);fingerprints.set(fingerprint,id);components.push({...structuredClone(original),id,firstStep:action,dependsOn});timing.push({...structuredClone(dates),componentId:id});}
   else {const shared=components.find(item=>item.id===id)!;shared.evidence=[...new Set([...shared.evidence,...original.evidence])];if(shared.evidence.length>3)return {status:'needs-review',questions:['A shared activity has more source references than the current plan contract supports. Review its evidence selection.']};}
   mapped.set(oldId,id);
  }
 }
 if(components.length>6)return {status:'needs-review',questions:[`The combination has ${components.length} distinct activities; the existing calculator supports six. Review which activities belong in one plan.`]};
 const sharedActivities=left.bundle.components.length+right.bundle.components.length-components.length;
 if(sharedActivities)notes.push(`${sharedActivities} exactly matching activities with matching owners, dates and prerequisites are proposed once. Similar names alone are not merged.`);
 // Local-demo/assumptions-only origins certify exact templates and cannot be copied onto a new combination.
 if(components.some(component=>component.evidence.length===0))return {status:'needs-review',questions:['These local template activities do not carry source references for a new generated combination. Keep their demo plans separate until the combined-plan contract can retain that origin.']};
 const bundle={id:left.bundle.id,name:`Combined Action Plans #${sources[0].number} and #${sources[1].number}`,objective:'Carry out the combined activities for this goal, with shared assumptions reviewed before execution.',coordination:'Follow the saved prerequisites and dates; review shared participants, fees and effort before execution.',components,limitation:'Proposed activities and owner roles only. Combined availability, funding and outcome improvements are not established.'};
 const empty=createBundleDraft(bundle,left.binding),input:BundleInputs=structuredClone(empty.inputs);
 input.costPolicy='cash-hours-v2';input.scope=structuredClone(scope);input.scope.comparisonConfirmed=unknownAssumption();input.timing=timing;
 input.dependenciesConfirmed=sources.every(source=>source.draft.inputs.dependenciesConfirmed.value===true)?proposed(true,'Existing source dependencies retained without adding cross-plan dependencies.'):unknownAssumption();
 input.costReviews=[];
 const groupMaps:Map<string,string>[]=[];
 if(review.participants==='same'){
  if(sources.some(source=>source.draft.inputs.groups.length!==1))return {status:'needs-review',questions:['Identify which participant groups are shared; these plans do not each contain one group.']};
  const counts=sources.map(source=>source.draft.inputs.groups[0].count.value),count=review.participantCount??(counts[0]===counts[1]?counts[0]:null);
  if(count===null)return {status:'needs-review',questions:['How many participants are in the shared group? The source counts differ or are unknown.']};
  input.groups=[{id:'combined-group',label:'Shared participant group',count:entered(count,'Explicit combined-plan shared-participant assumption.')}];
  for(const source of sources)groupMaps.push(new Map([[source.draft.inputs.groups[0].id,'combined-group']]));
 }else{
  for(const [index,source] of sources.entries()){const map=new Map<string,string>();groupMaps.push(map);for(const group of source.draft.inputs.groups){const id=`s${index+1}-${group.id}`;map.set(group.id,id);input.groups.push({...structuredClone(group),id});}}
  if(input.groups.length>12)return {status:'needs-review',questions:['Review a combined population with at most twelve participant groups.']};
 }
 input.groupsDisjoint=review.participants==='disjoint'&&sources.every(source=>source.draft.inputs.groups.length<=1||source.draft.inputs.groupsDisjoint.value===true)?entered(true,'Explicit combined-plan assumption: these participant groups are disjoint.'):unknownAssumption();
 if(!review.participants&&input.groups.length>1)notes.push('Participant overlap is unknown. Source counts are retained separately; unique participants and combined effort may remain unknown.');
 for(const component of components){
  const memberships=sources.flatMap((source,index)=>source.draft.inputs.memberships.filter(member=>maps[index].get(member.componentId)===component.id).map(member=>({...member,groupIds:member.groupIds.map(id=>groupMaps[index].get(id)!)})));
  input.memberships.push({componentId:component.id,groupIds:[...new Set(memberships.flatMap(member=>member.groupIds))],complete:memberships.length&&memberships.every(member=>member.complete.value===true)?proposed(true,'Existing source population coverage retained.'):unknownAssumption()});
  const reviews=sources.flatMap((source,index)=>source.draft.inputs.costReviews.filter(item=>maps[index].get(item.componentId)===component.id));
  input.costReviews.push({componentId:component.id,complete:reviews.length&&reviews.every(item=>item.complete.value===true)?proposed(true,'Existing source cost coverage retained for this activity.'):unknownAssumption()});
 }
 let feesUnknown=false;const feeKeys=new Map<string,{row:ManualExpense;sourceIndex:number}[]>(),labels=new Map<string,number>(),matchedFees=new Set<string>();
 for(const [index,source] of sources.entries())for(const expense of source.draft.inputs.expenses.filter(row=>row.kind==='cash')){
  const link=source.draft.inputs.expenseLinks.find(item=>item.expenseId===expense.id),ids=link?.componentIds.map(id=>maps[index].get(id)!).sort()??[];
  const feeKey=JSON.stringify([expense.label,expense.amount,expense.startMonth,expense.months,ids]),prior=feeKeys.get(feeKey)?.find(item=>item.sourceIndex!==index&&!matchedFees.has(item.row.id));
  if(prior&&prior.sourceIndex!==index&&ids.length&&review.fees==='shared-matches'){matchedFees.add(prior.row.id);notes.push(`Matching allowance “${expense.label}” for the same merged activity counts once under the explicit shared-fee assumption.`);continue;}
  const normalized=expense.label.trim().toLowerCase();if(labels.has(normalized)&&labels.get(normalized)!==index&&review.fees!=='distinct')feesUnknown=true;labels.set(normalized,index);
  const row={...structuredClone(expense),id:`fee-${input.expenses.length+1}`};input.expenses.push(row);feeKeys.set(feeKey,[...(feeKeys.get(feeKey)??[]),{row,sourceIndex:index}]);
  if(ids.length)input.expenseLinks.push({expenseId:row.id,componentIds:ids,allocations:link?.allocations?.map(item=>({...item,componentId:maps[index].get(item.componentId)!}))??null});
 }
 if(input.expenses.length>24)return {status:'needs-review',questions:['Review a combined budget with at most twenty-four cash allowances.']};
 const allFeesShared=review.fees==='shared-matches'&&sources.every(source=>source.draft.inputs.expenses.filter(row=>row.kind==='cash').length===matchedFees.size);
 input.costsDistinct=feesUnknown?proposed(false,'Potentially shared fee labels across different activities require overlap review.'):review.fees==='distinct'?entered(true,'Explicit combined-plan assumption: the retained cash allowances are separate.'):(allFeesShared||input.expenses.length===0)&&sources.every(source=>source.draft.inputs.costsDistinct.value===true)?proposed(true,'Source cost reviews retained under the explicit shared-fee assumption.'):unknownAssumption();
 if(feesUnknown)notes.push('Are the repeated fee allowances shared or separate? Combined cash and affordability remain unknown until this overlap is reviewed.');
 else if(input.costsDistinct.value===null)notes.push('Review whether the combined cash allowances are distinct. Any listed subtotal does not establish available budget headroom.');
 const estimates=sources.map(source=>source.draft.inputs.deliveryEstimate),allMatching=maps.every(map=>map.size===components.length)&&estimates.every(estimate=>same(estimate,estimates[0]));
 if(allMatching&&review.participants==='same'&&estimates[0])input.deliveryEstimate={...structuredClone(estimates[0]),hourlyRate:unknownAssumption()};
 else if(estimates.every(Boolean)){
  const perPerson=estimates.map(item=>item!.hoursPerParticipant.value),coordination=total(estimates.map(item=>item!.coordinationHours.value));
  const hours=sharedActivities?null:review.participants==='same'?total(perPerson):review.participants==='disjoint'&&perPerson.every(value=>value===perPerson[0])?perPerson[0]:null;
  input.deliveryEstimate={hoursPerParticipant:hours===null?unknownAssumption():proposed(hours,'Combined effort under explicitly reviewed participant overlap.'),coordinationHours:sharedActivities||coordination===null?unknownAssumption():proposed(coordination,'Source coordination hours for distinct activities.'),hourlyRate:unknownAssumption(),acceptance:unknownAssumption()};
  if(hours===null||sharedActivities)notes.push('Staff hours cannot be safely combined without reviewing shared activity effort. No employee hours are priced.');
 }
 const budgets=sources.map(source=>source.draft.inputs.budget).filter((budget):budget is NonNullable<BundleInputs['budget']>=>!!budget);
 if(budgets.length){const amount=budgets.length===sources.length&&budgets.every(budget=>budget.amount.value===budgets[0].amount.value)?structuredClone(budgets[0].amount):unknownAssumption<number>();input.budget={amount,basis:proposed('cash','One shared cash ceiling is proposed for the combined horizon; source ceilings are never summed.')};if(amount.value===null)notes.push('Review one budget ceiling for the combined plan; source ceilings differ or are unknown.');}
 if(left.inputs.successMeasure&&same(left.inputs.successMeasure,right.inputs.successMeasure))input.successMeasure=structuredClone(left.inputs.successMeasure);
 if(left.inputs.whatIf&&left.inputs.whatIf.baseline.kind!=='illustrative'&&same(left.inputs.whatIf,right.inputs.whatIf))input.whatIf=structuredClone(left.inputs.whatIf);
 if(sources.some(source=>source.draft.inputs.whatIf||source.draft.inputs.successMeasure))notes.push('Matching outcome targets are retained once; differing source targets stay in their original plans and require review. Targets are never summed or treated as promised improvement.');
 try{const draft=reviseBundleDraft(empty,input);return {status:'ready',draft,result:reconcileBundle(draft),notes};}
 catch(error){return {status:'needs-review',questions:[(error as Error).message]};}
}
