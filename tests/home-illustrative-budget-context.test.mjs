import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveHomePlanningIntent,homeGoalForPin} from '../lib/home-planning-intent.ts';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {createBundleDraft,reviseBundleDraft,reconcileBundle,compareBundleDrafts,bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {createPlanAlternatives,attachPlanAlternative,packPlanAlternatives,readPlanAlternatives,planAlternativesField} from '../lib/home-plan-alternatives.ts';
import {DecisionStore,DECISIONS_STORAGE_KEY} from '../lib/local-decisions.ts';
import {retentionProposal} from './fixtures/home-retention-proposal.mjs';

const request='reduce turnover by 2 percentage points over 12 months with a $100,000 illustrative budget';
const context={goalId:'illustrative-budget',goal:request};
const entered=value=>({value,kind:'user-entered',basis:'Explicitly reviewed matching comparison context in this test.'});

test('the exact illustrative-budget request and demo wording retain identical quantified intent',()=>{
 const illustrative=resolveHomePlanningIntent([request]);
 assert.equal(illustrative.budgetCap,100000);
 assert.equal(illustrative.pointReduction,2);
 assert.equal(illustrative.relativeReduction,null);
 assert.equal(illustrative.months,12);
 assert.equal(illustrative.baseline,null);
 assert.equal(illustrative.target,null);
 assert.equal(illustrative.participants,null);
 assert.deepEqual(illustrative,resolveHomePlanningIntent([request.replace('illustrative budget','demo budget')]));
 assert.equal(homeGoalForPin([request]),request);
});

test('budget wording does not adopt a negated amount, unrelated cost, or superseded earlier amount',()=>{
 const cases=[
  ['Use a $100,000 illustrative budget, not a $200,000 demo budget.',100000],
  ['Use a $100,000 demo budget rather than a $200,000 illustrative budget.',100000],
  ['Do not use a $200,000 illustrative budget.',null],
  ['Do not set budget to $200,000.',null],
  ['Replace the $50,000 demo budget with a $100,000 illustrative budget.',100000],
  ['Use a $100,000 illustrative budget; a vendor estimate is $25,000.',100000],
  ['Use a $100,000 illustrative budget and a $25,000 vendor estimate.',100000],
  ['Maximum one-time programme budget $500000 USD.',500000],
  ['The budget must not exceed $100,000.',100000],
  ['Use a USD 100,000 illustrative cash budget.',100000],
 ];
 for(const [text,expected] of cases)assert.equal(resolveHomePlanningIntent([text]).budgetCap,expected,text);
 assert.equal(resolveHomePlanningIntent([request,'Do not use a $200,000 illustrative budget.']).budgetCap,100000);
 assert.equal(resolveHomePlanningIntent([request,'Use a $75,000 illustrative budget instead.']).budgetCap,75000);
});

async function alternatives(at){
 const binding=await actionBinding(context.goalId,request,{sources:[]},{goal:request});
 return retentionProposal(request).bundles.map(bundle=>({id:bundle.id,draft:prepareIllustrativePilot(createBundleDraft(bundle,binding),at,{goalContext:{goal:request},includeDeliveryEstimate:true})}));
}
function assertExact(draft){
 assert.equal(draft.binding.goal,request);
 assert.equal(draft.inputs.scope.months.value,12);
 assert.equal(draft.inputs.budget.amount.value,100000);
 assert.equal(draft.inputs.budget.amount.kind,'user-entered');
 assert.equal(draft.inputs.budget.basis.value,'cash');
 assert.equal(draft.inputs.successMeasure.target.value,'2 percentage-point reduction');
 assert.equal(draft.inputs.successMeasure.baseline.value,null);
 assert.equal(draft.inputs.whatIf,undefined);
 const result=reconcileBundle(draft);
 assert.equal(result.budget.limit,100000,'The parsed cap must reach the calculator, not only the requirements prose.');
 assert.equal(result.budget.headroom,null,'Unknown costs must not become budget headroom.');
 assert.equal(result.uniqueParticipants,null,'An illustrative pilot is not a known workforce population.');
 assert.equal(result.employeeTimeTotal,null);
 assert.equal(draft.inputs.deliveryEstimate.hourlyRate.value,null);
}

test('fresh and regenerated alternatives carry the illustrative budget into calculation and comparison',async()=>{
 for(const at of ['2026-10-07T00:00:00Z','2026-11-07T00:00:00Z']){
  const plans=await alternatives(at);
  for(const {draft} of plans)assertExact(draft);
  const reviewed=plans.map(({draft})=>{const inputs=structuredClone(draft.inputs);inputs.scope.comparisonConfirmed=entered(true);return reviseBundleDraft(draft,inputs);});
  for(const other of reviewed.slice(1)){
   assert.equal(compareBundleDrafts(reviewed[0],other).comparable,true);
   assert.equal(compareBundleDrafts(reviewed[0],other).cashDifference,null);
   assertExact(other);
  }
 }
});

test('saving, attaching and reopening preserve the original request and all alternative budgets',async()=>{
 let catalog=createPlanAlternatives(context,await alternatives('2026-10-07T00:00:00Z'));
 const selected=catalog.plans[1];
 catalog=attachPlanAlternative(catalog,context,selected.id,{inputKey:bundleInputKey(selected.draft),attachmentId:'illustrative-budget-attachment',at:'2026-10-07T01:00:00Z',acknowledgeUnknowns:true});
 const values=new Map(),port={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const store=new DecisionStore();
 store.initialize(port,()=>({goals:{version:1,activeId:context.goalId,goals:[{id:context.goalId,statement:request}]},workspaces:{}}));
 store.setField(context.goalId,planAlternativesField,packPlanAlternatives(catalog));
 assert.equal(store.getSnapshot().saved,true);
 const saved=port.getItem(DECISIONS_STORAGE_KEY),reopened=new DecisionStore();
 reopened.initialize(port);
 assert.equal(reopened.getSnapshot().data.goals.goals[0].statement,request);
 const loaded=readPlanAlternatives(reopened.getField(context.goalId,planAlternativesField,null),context);
 assert.ok(loaded);
 assert.deepEqual(loaded.attachments,catalog.attachments);
 assert.equal(loaded.attachments[0].planId,selected.id);
 assert.deepEqual(loaded.plans.map(plan=>[plan.id,plan.number]),catalog.plans.map(plan=>[plan.id,plan.number]));
 for(const plan of loaded.plans)assertExact(plan.draft);
 assert.equal(port.getItem(DECISIONS_STORAGE_KEY),saved,'Reading must not rewrite saved plans.');
});
