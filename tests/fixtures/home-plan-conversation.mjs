import {createBundleDraft,reviseBundleDraft} from '../../lib/home-bundle-reconciliation.ts';
import {createPlanAlternatives} from '../../lib/home-plan-alternatives.ts';
import {createPlanConversationRequest} from '../../lib/home-plan-conversation.ts';
import {bundleProposalFixture} from './home-bundles.mjs';
export const conversationContext={goalId:'turnover',goal:'Reduce turnover'};
export const entered=value=>({value,kind:'user-entered',basis:'Explicit fictional test assumption; not workforce evidence.'});
export function conversationBundleProposal(goal=conversationContext.goal){
 const proposal=bundleProposalFixture(goal);
 proposal.bundles.forEach((bundle,index)=>{bundle.name=['Manager support','Learning pilot','Delivery review'][index];bundle.components=[{...bundle.components[0],name:bundle.name,firstStep:'Run the proposed '+bundle.name.toLowerCase()+' and review the result.',dependsOn:[]}];});
 return proposal;
}
export function conversationCatalog(){
 const binding={version:1,...conversationContext,evidenceDigest:'a'.repeat(64),planningDigest:'b'.repeat(64)};
 return createPlanAlternatives(conversationContext,conversationBundleProposal().bundles.map(bundle=>{
  const draft=createBundleDraft(bundle,binding),input=draft.inputs;
  input.costPolicy='cash-hours-v2';input.scope.population=entered('Fictional test group');input.scope.startMonth=entered('2026-11');input.scope.months=entered(3);input.scope.capacityRequired=entered(false);input.scope.requirements=entered('Use existing staff; no promised retention effect.');
  input.groups=[{id:'people',label:'Reviewed test participants',count:entered(10)}];input.groupsDisjoint=entered(true);input.memberships=[{componentId:'c1',groupIds:['people'],complete:entered(true)}];
  input.timing=[{componentId:'c1',start:entered('2026-11-01'),finish:entered('2026-11-14')}];input.dependenciesConfirmed=entered(true);
  input.expenses=[{id:'fee',label:'Test delivery fee',kind:'cash',amount:entered(3000),startMonth:entered('2026-11'),months:entered(1)}];input.expenseLinks=[{expenseId:'fee',componentIds:['c1'],allocations:null}];input.costReviews=[{componentId:'c1',complete:entered(true)}];input.costsDistinct=entered(true);
  input.budget={amount:entered(10000),basis:entered('cash')};input.deliveryEstimate={hoursPerParticipant:entered(2),coordinationHours:entered(8),hourlyRate:{value:null,kind:'unknown',basis:null},acceptance:entered('Review participation and feedback.')};
  return {id:bundle.id,draft:reviseBundleDraft(draft,input)};
 }));
}
export const operation=(field,value,quote,targetId=null)=>({field,value,quote,targetId});
export const proposal=(intent,sourceIds=[],operations=[],question=null)=>({version:1,intent,sourceIds,operations,question});
export const request=(text,catalog=conversationCatalog(),selectedId='A',comparisonIds=[],requestId='request-1')=>createPlanConversationRequest(catalog,selectedId,comparisonIds,text,requestId);
