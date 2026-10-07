import test from 'node:test';
import assert from 'node:assert/strict';
import {createBundleDraft,bundleInputKey,reviseBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {createPlanAlternatives,packPlanAlternatives,proposeEditedAlternative,proposeStaffingAlternative,changeAlternativeView,readPlanAlternatives} from '../lib/home-plan-alternatives.ts';
import {alternativeDiscussion} from '../lib/home-plan-alternative-discussion.ts';
import {alternativeQuestionReply,alternativeView,localPlanDiscussion} from '../lib/home-plan-alternative-chat.ts';
const context={goalId:'goal',goal:'Reduce turnover'},binding={version:1,...context,evidenceDigest:'a'.repeat(64),planningDigest:'b'.repeat(64)};
const catalog=()=>createPlanAlternatives(context,bundleProposalFixture(context.goal).bundles.map(bundle=>({id:bundle.id,draft:prepareIllustrativePilot(createBundleDraft(bundle,binding),'2026-10-07T00:00:00Z',{includeDeliveryEstimate:true})})));
test('chat resolves #4 and #5 snapshots and questions do not mutate storage candidates',()=>{
 let value=catalog();for(const [i,text] of ['have a budget of 6000','in Action Plan #4 use 25 participants'].entries())value=proposeEditedAlternative(value,context,alternativeDiscussion(value,context,value.order.at(-1)).prepareRequest(text,'request-'+i)).catalog;
 const before=JSON.stringify(value);
 assert.match(alternativeQuestionReply('What is the budget for Action Plan #4?',value,'A'),/Action Plan #4.*\$6,000 USD/);
 assert.match(alternativeQuestionReply('Explain Action Plan #5',value,'A'),/Action Plan #5/);
 assert.match(alternativeQuestionReply('Explain this plan',value,'alternative-5'),/Action Plan #5/);
 assert.match(alternativeQuestionReply('Can I combine action plans?',value,'A'),/Action Plan #4.*Action Plan #5/);
 assert.equal(alternativeQuestionReply('Combine Plan #1 and #2',value,'A'),null);
 assert.equal(alternativeQuestionReply('set budget to 8000',value,'A'),null);
 assert.equal(alternativeQuestionReply('What is FTE?',value,'A'),null);assert.equal(JSON.stringify(value),before);
 assert.throws(()=>alternativeQuestionReply('Explain Plan #8',value,'A'),/not available/);
});
test('routing and saved selection follow immutable identities through reorder and removal',()=>{
 for(const text of ['Explain Plan #4','Can I combine action plans?','Combine Plan #1 and #2','What is the selected plan?'])assert.equal(localPlanDiscussion(text),true);
 assert.equal(localPlanDiscussion('What is FTE?'),false);
 let value=catalog();value=changeAlternativeView(value,context,{order:['C','B','A']});
 assert.equal(alternativeView({version:1,selectedId:'B',collapsed:true},value).selectedId,'B');
 value=changeAlternativeView(value,context,{deleteId:'B'});assert.equal(alternativeView({version:1,selectedId:'B'},value).selectedId,'A');
 assert.equal(alternativeView({version:1,selectedId:'A',collapsed:'yes'},value).collapsed,false);
});

test('combination paraphrases stay local and explanation-only requests read the named saved plans',()=>{
 const value=catalog(),before=JSON.stringify(value);
 for(const text of ['I want a combination of action plan one and two','I want a combination of action plan 1 and 2']){assert.equal(localPlanDiscussion(text),true);assert.equal(alternativeQuestionReply(text,value,'C'),null);}
 for(const text of ['Explain the combination of action plan one and two','Compare action plan one and two','Why combine action plan one and two?']){
  assert.equal(localPlanDiscussion(text),true);const reply=alternativeQuestionReply(text,value,'C');assert.match(reply,/Action Plan #1/);assert.match(reply,/Action Plan #2/);assert.doesNotMatch(reply,/Action Plan #3|paste|summarize the contents/i);
 }
 assert.throws(()=>alternativeQuestionReply('Explain the combination of plan one and nine',value,'C'),/not available/);assert.equal(JSON.stringify(value),before);
});
test('reviewed staffing derivatives preserve sources and cannot cross goals or replace equal revisions',()=>{
 const value=catalog(),source=value.plans[0],input=structuredClone(source.draft.inputs);input.groups[0].count.value=14;
 const draft=reviseBundleDraft(source.draft,input),request={requestId:'staffing-1',text:'Apply reviewed staffing combination',sourceIds:[source.id],expectedInputs:{[source.id]:bundleInputKey(source.draft)}};
 const result=proposeStaffingAlternative(value,context,request,draft);assert.equal(result.plan.number,4);assert.deepEqual(result.catalog.plans.slice(0,3),value.plans);assert.equal(result.plan.operation.kind,'staffing');assert.ok(readPlanAlternatives(result.catalog,context));
 assert.equal(proposeStaffingAlternative(result.catalog,context,request,draft).reused,true);
 assert.throws(()=>proposeStaffingAlternative(value,context,request,source.draft),/exact source/);
 const wrong=structuredClone(draft);wrong.binding.goalId='other';assert.throws(()=>proposeStaffingAlternative(value,context,request,wrong),/exact source/);
});

test('compact storage preserves immutable numerical results and deduplicates input identities',()=>{
 const value=catalog(),packed=packPlanAlternatives(value);assert.ok(JSON.stringify(packed).length<JSON.stringify(value).length);assert.deepEqual(readPlanAlternatives(packed,context),value);
 assert.ok(packed.plans.every(plan=>!('inputKey' in plan.result)));const forged=structuredClone(packed);forged.plans[0].result.cashTotal=1;assert.equal(readPlanAlternatives(forged,context),null);
 const unknown=structuredClone(packed);unknown.encoding='other';assert.equal(readPlanAlternatives(unknown,context),null);
 const invalid=structuredClone(packed);invalid.plans[0].draft.inputs.scope.months.value=-1;assert.equal(readPlanAlternatives(invalid,context),null);
});
