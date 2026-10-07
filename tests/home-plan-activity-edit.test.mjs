import test from 'node:test';
import assert from 'node:assert/strict';
import {createBundleDraft,bundleInputKey,readBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {createPlanAlternatives,proposeEditedAlternative,packPlanAlternatives,readPlanAlternatives,attachPlanAlternative} from '../lib/home-plan-alternatives.ts';
import {alternativeDiscussion} from '../lib/home-plan-alternative-discussion.ts';
import {alternativeQuestionReply} from '../lib/home-plan-alternative-chat.ts';
import {bundleChatEditIntent} from '../lib/home-bundle-chat-edit.ts';
import {retentionProposal} from './fixtures/home-retention-proposal.mjs';
import {homePlanSummary} from '../lib/home-plan-summary.ts';
import {planDirections} from '../lib/plan-directions.ts';
import {activityGoal as goal,activityPrompts as prompts,activityContext} from './fixtures/home-activity-revision.mjs';
const context={goalId:'goal',goal},binding={version:1,...context,evidenceDigest:'a'.repeat(64),planningDigest:'b'.repeat(64)};
function catalog(){
 const plans=retentionProposal(goal).bundles.map(bundle=>{
  const draft=prepareIllustrativePilot(createBundleDraft(bundle,binding),'2026-10-07T00:00:00Z',{includeDeliveryEstimate:true,goalContext:{goal,notes:[{text:activityContext}]}});
  draft.inputs.scope.population={value:'United States',kind:'user-entered',basis:'Saved Country US scope.'};draft.inputs.successMeasure.scopeKey=JSON.stringify(['United States',draft.inputs.scope.startMonth.value,12]);
  draft.inputs.budget.amount={value:100000,kind:'illustrative',basis:'Saved illustrative cash cap; budget is not approved.'};
  return {id:bundle.id,draft};
 });
 let value=createPlanAlternatives(context,plans);value=attachPlanAlternative(value,context,'A',{inputKey:bundleInputKey(plans[0].draft),attachmentId:'original-receipt',at:'2026-10-07T00:00:00Z',acknowledgeUnknowns:true});return value;
}
for(const [index,prompt] of prompts.entries())test('exact natural revision prompt '+(index+1)+' preserves constraints and immutable history',()=>{
 const value=catalog(),before=JSON.stringify(value),source=value.plans[0].draft;
 assert.equal(bundleChatEditIntent(prompt).edit,true);assert.equal(alternativeQuestionReply(prompt,value,'A'),null);
 const request=alternativeDiscussion(value,context,'A').prepareRequest(prompt,'request-'+index),result=proposeEditedAlternative(value,context,request);
 assert.equal(result.status,'ready');assert.equal(result.plan.number,4);assert.deepEqual(result.plan.sourceRefs,[{id:'A',revision:source.revision}]);
 assert.deepEqual(result.catalog.plans.slice(0,3),value.plans);assert.deepEqual(result.catalog.attachments,value.attachments);assert.equal(JSON.stringify(value),before);
 const draft=result.plan.draft;assert.deepEqual(draft.binding,source.binding);assert.deepEqual(draft.inputs.budget,source.inputs.budget);assert.deepEqual(draft.inputs.scope.population,source.inputs.scope.population);assert.deepEqual(draft.inputs.scope.months,source.inputs.scope.months);assert.deepEqual(draft.inputs.successMeasure,source.inputs.successMeasure);
 assert.deepEqual(draft.inputs.expenses.slice(0,source.inputs.expenses.length),source.inputs.expenses);assert.equal(draft.inputs.expenses.at(-1).amount.value,null);assert.equal(result.plan.result.cashEstimate.cash,null);assert.equal(result.plan.result.budget.headroom,null);assert.equal(result.plan.result.deliveryEstimate.hours,null);
 assert.match(JSON.stringify(homePlanSummary(draft,result.plan.result)),/monthly manager check-ins and quarterly turnover-signal reviews/);assert.match(JSON.stringify(planDirections(draft)),/quarterly turnover-signal reviews/);assert.ok(readBundleDraft(draft));assert.ok(readPlanAlternatives(packPlanAlternatives(result.catalog),context));
 assert.equal(proposeEditedAlternative(result.catalog,context,request).reused,true);
});
test('explanations remain read-only and added activities never discard an extra instruction',()=>{
 const value=catalog(),before=JSON.stringify(value),discussion=alternativeDiscussion(value,context,'A');
 for(const prompt of ['Explain Action Plan #1','How would adding monthly manager check-ins change the selected plan?','Can this plan retain the illustrative $100000 budget cap?']){
  assert.equal(bundleChatEditIntent(prompt).edit,false);assert.equal(discussion.prepareRequest(prompt,'question'),null);
 }
 assert.match(alternativeQuestionReply('Explain Action Plan #1',value,'A'),/Action Plan #1/);
 for(const prompt of [prompts[1].replace('$100000','$90000'),prompts[1].replace('2-percentage-point','3-percentage-point'),prompts[1].replace('12 months','6 months'),prompts[1]+' Approve the budget.',prompts[1].replace('monthly manager','monthly manager').replace('quarterly turnover-signal reviews','quarterly turnover-signal reviews and hire two people')])assert.throws(()=>proposeEditedAlternative(value,context,discussion.prepareRequest(prompt,'invalid')),/differs|separately|cadence/);
 assert.equal(JSON.stringify(value),before);
});
