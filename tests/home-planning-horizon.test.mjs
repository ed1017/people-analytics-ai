import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolvePlanningHorizon,resolveHomePlanningIntent} from '../lib/home-planning-intent.ts';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {createBundleDraft,reviseBundleDraft,reconcileBundle,bundleInputKey,readBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {savedPilotCorrection} from '../lib/home-saved-pilot-correction.ts';
import {bundleChatEditIntent,previewBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
import {createPlanAlternatives,proposeEditedAlternative,proposeCorrectedPilotAlternative,attachPlanAlternative,readPlanAlternatives,packPlanAlternatives} from '../lib/home-plan-alternatives.ts';
import {retentionProposal} from './fixtures/home-retention-proposal.mjs';
import {proposePlanRevision,readPlanRevisions} from '../lib/home-plan-revisions.ts';

const durationPhrases=['over 12 months','over the next 12 months','within the next twelve months','with a 12-month timeline','for a year'];
const request=phrase=>`Reduce turnover by 2 percentage points ${phrase} with a $100,000 illustrative budget for 40 participants`;
async function fresh(goal=request(durationPhrases[0]),at='2026-10-07T00:00:00Z'){
 const binding=await actionBinding('horizon-regression',goal,{sources:[]},{goal});
 return retentionProposal(goal).bundles.map(bundle=>prepareIllustrativePilot(createBundleDraft(bundle,binding),at,{goalContext:{goal},includeDeliveryEstimate:true}));
}
const scopeKey=input=>JSON.stringify([input.scope.population.value,input.scope.startMonth.value,input.scope.months.value]);
const preserved=input=>({budget:input.budget,target:input.successMeasure?.target,baseline:input.successMeasure?.baseline,groups:input.groups,expenses:input.expenses,timing:input.timing});

test('everyday goal horizons reach fresh calculators and regeneration without replacing target, cash cap or participants',async()=>{
 for(const phrase of durationPhrases){
  const goal=request(phrase),intent=resolveHomePlanningIntent([goal]);assert.equal(intent.months,12,phrase);assert.equal(intent.pointReduction,2);assert.equal(intent.budgetCap,100000);assert.equal(intent.participants,40);
  for(const at of ['2026-10-07T00:00:00Z','2026-11-07T00:00:00Z'])for(const draft of await fresh(goal,at)){
   assert.equal(draft.inputs.scope.months.value,12,phrase);assert.equal(draft.inputs.scope.months.kind,'user-entered');assert.equal(draft.inputs.successMeasure.target.value,'2 percentage-point reduction');assert.equal(draft.inputs.successMeasure.baseline.value,null);assert.equal(draft.inputs.groups[0].count.value,40);assert.equal(reconcileBundle(draft).budget.limit,100000);assert.equal(reconcileBundle(draft).budget.headroom,null);
   assert.deepEqual(prepareIllustrativePilot(JSON.parse(JSON.stringify(draft)),'2026-11-07T00:00:00Z',{goalContext:{goal}}),draft);
  }
 }
});

test('distinct pilot and historical windows cannot override an explicit goal horizon',()=>{
 for(const text of ['Reduce turnover over 12 months with a 3-month pilot.','Use a 3-month pilot for a 12-month goal.','Reduce turnover over the next twelve months; the pilot runs for 3 months.','Reduce turnover over 12 months using the previous 6 months as context.','Reduce turnover over 12 months, not 3 months.','Reduce turnover over 12 months; baseline measured over 6 months.'])assert.deepEqual(resolvePlanningHorizon([text]),{months:12,needsReview:false},text);
 assert.equal(resolvePlanningHorizon(['Reduce turnover over 6 months.','Actually, use a 12-month timeline.']).months,12);
 for(const text of ['Reduce turnover over 6 or 12 months.','Reduce turnover over 6 months or over 12 months.','Reduce turnover over about 12 months.','Reduce turnover within 25 months.','Reduce turnover with a 12-month timeline and a 6-month horizon.'])assert.deepEqual(resolvePlanningHorizon([text]),{months:null,needsReview:true},text);
 assert.deepEqual(resolvePlanningHorizon(['Reduce turnover over 12 months.','Review the previous 3 months.']),{months:12,needsReview:false});
 assert.equal(resolvePlanningHorizon(['Use at most 40 participants to reduce turnover over 12 months.']).months,12);
 for(const text of ['Reduce turnover by 2 percentage points over 12 months, starting in 3 months.','Starting in 3 months, reduce turnover over 12 months.','Reduce turnover over 12 months with monthly check-ins for 3 months.','Reduce turnover over 12 months with a $100,000 allowance per year.','Reduce turnover over 12 months with a $100,000 allowance per one year.'])assert.deepEqual(resolvePlanningHorizon([text]),{months:12,needsReview:false},text);
 assert.deepEqual(resolvePlanningHorizon(['Reduce turnover with a $100,000 allowance per year.']),{months:null,needsReview:false});
});

test('ambiguous explicit horizons stay Unknown instead of becoming a three-month demo plan or a zero expense',async()=>{
 for(const draft of await fresh(request('over 6 or 12 months'))){assert.equal(draft.inputs.scope.months.value,null);assert.equal(draft.inputs.scope.months.kind,'unknown');assert.ok(draft.inputs.expenses.every(expense=>expense.months.value===null));assert.match(draft.inputs.successMeasure.name,/requested period/);assert.equal(draft.inputs.successMeasure.target.value,'2 percentage-point reduction');assert.equal(draft.inputs.budget.amount.value,100000);assert.ok(readBundleDraft(draft));assert.throws(()=>reconcileBundle(draft),/Confirm.*planning horizon/);}
});

const naturalEdits=['Change the timeline to 12 months','Please make the timeline 12 months','Extend the plan to 12 months','The plan should run for 12 months','Use a 12-month timeline','Correct the timeline to match my 12-month goal','Run the plan for a year','Set plan duration to one year'];
test('natural duration requests route to reviewed local edits without touching dates, costs, population or targets',async()=>{
 const source=(await fresh(request('over 3 months')))[0],before=JSON.stringify(source);
 for(const text of naturalEdits){assert.equal(bundleChatEditIntent(text).edit,true,text);const preview=previewBundleChatEdit(source,text);assert.equal(preview.inputs.scope.months.value,12,text);assert.equal(preview.changes.length,1);assert.deepEqual(preserved(preview.inputs),preserved(source.inputs));}
 for(const text of ['Change the timeline to 6 or 12 months','Extend the plan by 12 months','Use about a 12-month timeline','Make the timeline 12 months and cut all costs','Do not extend the plan to 12 months','Correct the timeline to match my goal','Change the timeline to 12 months; change duration to 6 months'])assert.throws(()=>previewBundleChatEdit(source,text),text);
 for(const text of ['Why does the plan last 3 months?','Should the plan last 12 months?'])assert.equal(bundleChatEditIntent(text).edit,false,text);
 assert.equal(JSON.stringify(source),before);
});

test('natural edits create stable numbered alternatives that retain originals and attachment history after reload',async()=>{
 const drafts=await fresh(request('over 3 months')),context={goalId:drafts[0].binding.goalId,goal:drafts[0].binding.goal};let catalog=createPlanAlternatives(context,drafts.map(draft=>({id:draft.bundle.id,draft})));
 const source=catalog.plans[0];catalog=attachPlanAlternative(catalog,context,source.id,{inputKey:bundleInputKey(source.draft),attachmentId:'original-attachment',at:'2026-10-07T00:00:00Z',acknowledgeUnknowns:true});const original=structuredClone(catalog);
 for(const [i,text] of naturalEdits.entries()){
  const edit={requestId:'horizon-edit-'+i,text,sourceIds:[source.id],expectedInputs:{[source.id]:bundleInputKey(source.draft)}},out=proposeEditedAlternative(catalog,context,edit);assert.equal(out.status,'ready',text);assert.equal(out.plan.number,4+i);assert.equal(out.plan.draft.inputs.scope.months.value,12);assert.deepEqual(preserved(out.plan.draft.inputs),preserved(source.draft.inputs));assert.match(out.plan.draft.inputs.successMeasure.name,/over 12 months/);assert.equal(out.plan.draft.inputs.successMeasure.scopeKey,scopeKey(out.plan.draft.inputs));
  catalog=out.catalog;assert.equal(proposeEditedAlternative(catalog,context,edit).plan.number,4+i);
 }
 const selected=catalog.plans.at(-1);catalog=attachPlanAlternative(catalog,context,selected.id,{inputKey:bundleInputKey(selected.draft),attachmentId:'revised-attachment',at:'2026-10-07T01:00:00Z',acknowledgeUnknowns:true});const reload=readPlanAlternatives(JSON.parse(JSON.stringify(packPlanAlternatives(catalog))),context);assert.ok(reload);assert.deepEqual(reload.plans.slice(0,3),original.plans);assert.deepEqual(reload.attachments[0],original.attachments[0]);assert.equal(reload.attachments[1].planId,selected.id);assert.equal(reload.nextNumber,4+naturalEdits.length);
});

test('legacy saved text-edit histories retain their old measure-review requirement and remain readable',async()=>{
 const source=(await fresh(request('over 3 months')))[0],out=proposePlanRevision(undefined,source,'Set Shared horizon to 12',{option:1,count:3});
 assert.deepEqual(out.record.draft.inputs.successMeasure,source.inputs.successMeasure);assert.match(reconcileBundle(out.record.draft).issues.join(' '),/Success measure population or horizon changed/);
 assert.deepEqual(readPlanRevisions(JSON.parse(JSON.stringify(out.history)),source.binding.goalId),out.history);
});

const legacy=JSON.parse(readFileSync(new URL('./fixtures/home-saved-pilot-before-pr175.json',import.meta.url),'utf8'));
test('actual pre-fix saved drafts offer a new 12-month correction for ordinary wording without rewriting saved work',()=>{
 assert.equal(legacy.sourceCommit,'979570af119f74ef5b019b3a73474fcbf8cddb81');const before=JSON.stringify(legacy);
 for(const phrase of durationPhrases){const goalContext={...legacy.planningContext,constraints:legacy.request.replace('over 12 months',phrase)};for(const source of legacy.drafts){const offer=savedPilotCorrection(source,goalContext);assert.equal(offer.draft.inputs.scope.months.value,12,phrase);assert.equal(offer.draft.inputs.budget.amount.value,100000);assert.equal(offer.draft.inputs.successMeasure.target.value,'2 percentage-point reduction');assert.equal(offer.draft.inputs.successMeasure.baseline.value,null);assert.deepEqual(offer.draft.inputs.timing,source.inputs.timing);assert.deepEqual(offer.draft.inputs.expenses,source.inputs.expenses);}}
 const context={goalId:legacy.drafts[0].binding.goalId,goal:legacy.planningContext.goal},catalog=createPlanAlternatives(context,legacy.drafts.map(draft=>({id:draft.bundle.id,draft}))),source=catalog.plans[0],result=proposeCorrectedPilotAlternative(catalog,context,{requestId:'correct-horizon',text:'Restore original goal horizon',sourceIds:[source.id],expectedInputs:{[source.id]:bundleInputKey(source.draft)}},{...legacy.planningContext,constraints:legacy.request.replace('over 12 months','over the next 12 months')});assert.equal(result.plan.number,4);assert.deepEqual(result.catalog.plans.slice(0,3),catalog.plans);assert.ok(readPlanAlternatives(JSON.parse(JSON.stringify(packPlanAlternatives(result.catalog))),context));assert.equal(JSON.stringify(legacy),before);
});

test('horizon-only corrections refresh only generated unknown-baseline measures; explicit period and measure edits still require review',async()=>{
 const freshDraft=(await fresh(request('over the next 12 months')))[0],input=structuredClone(freshDraft.inputs);
 // The saved shape emitted by PR175 when the duration phrase was not recognized.
 input.scope.months={...legacy.drafts[0].inputs.scope.months};input.successMeasure.name='Turnover rate over 3 months for the stated plan population';input.successMeasure.scopeKey=scopeKey(input);const source=reviseBundleDraft(freshDraft,input),before=JSON.stringify(source),offer=savedPilotCorrection(source);
 assert.equal(offer.draft.inputs.scope.months.value,12);assert.match(offer.draft.inputs.successMeasure.name,/over 12 months/);assert.equal(offer.draft.inputs.successMeasure.scopeKey,scopeKey(offer.draft.inputs));assert.deepEqual(preserved(offer.draft.inputs),preserved(source.inputs));assert.equal(JSON.stringify(source),before);
 for(const mutation of [i=>{i.successMeasure.baseline={value:'8.2% annualized',kind:'adopted',basis:'Recorded baseline in its original annual period.'};},i=>{i.successMeasure.name='My custom reviewed metric';},i=>{i.successMeasure.target.basis='Explicit saved user edit.';}]){
  const changed=structuredClone(source.inputs);mutation(changed);const reviewed=reviseBundleDraft(source,changed),corrected=savedPilotCorrection(reviewed).draft;assert.deepEqual(corrected.inputs.successMeasure,reviewed.inputs.successMeasure);assert.match(reconcileBundle(corrected).issues.join(' '),/Success measure population or horizon changed/);
 }
 const edited=structuredClone(source.inputs);edited.scope.months={value:6,kind:'user-entered',basis:'Explicit saved user edit.'};assert.equal(savedPilotCorrection(reviseBundleDraft(source,edited)),null);
});
