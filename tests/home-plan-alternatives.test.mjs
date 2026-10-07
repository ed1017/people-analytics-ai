import test from 'node:test';
import assert from 'node:assert/strict';
import {createBundleDraft,reconcileBundle,reviseBundleDraft,bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {createPlanAlternatives,readPlanAlternatives,proposeEditedAlternative,proposeCombinedAlternative,resolveNumberedPlans,changeAlternativeView,applyPlanAlternative,attachPlanAlternative} from '../lib/home-plan-alternatives.ts';
import {alternativeDiscussion} from '../lib/home-plan-alternative-discussion.ts';
import {combinePlanSnapshots} from '../lib/home-plan-combination.ts';
import {planDirections} from '../lib/plan-directions.ts';
import {proposePlanRevision,readPlanRevisions} from '../lib/home-plan-revisions.ts';
import {demoBundle,demoBinding,homeDemoExamples} from '../lib/home-demo-catalog.ts';
import {planReferenceNumbers} from '../lib/home-plan-references.ts';

const context={goalId:'turnover',goal:'Reduce turnover'},binding={version:1,...context,evidenceDigest:'a'.repeat(64),planningDigest:'b'.repeat(64)};
const entered=value=>({value,kind:'user-entered',basis:'Explicit test planning assumption.'});
function original(id='A',name='Manager practice'){
 const bundle=bundleProposalFixture(context.goal).bundles[0];
 bundle.id=id;bundle.name=name;
 bundle.components=[{...bundle.components[0],name,firstStep:`Run ${name} with 10 participants.`},{...bundle.components[5],id:'c2',name:`${name} check-ins`,firstStep:'Run check-ins after c1.',dependsOn:['c1']}];
 return prepareIllustrativePilot(createBundleDraft(bundle,binding),'2026-10-07T00:00:00Z',{includeDeliveryEstimate:true});
}
const originals=()=>['A','B','C'].map((id,i)=>({id:`source-${id}`,draft:original(id,`Practice ${i+1}`)}));
const catalog=()=>createPlanAlternatives(context,originals());
const request=(value,text,requestId='request-1',selectedId=value.order[0],review)=>alternativeDiscussion(value,context,selectedId).prepareRequest(text,requestId,review);
function combined(value,review){return proposeCombinedAlternative(value,context,request(value,'combine action plan #1 and #2','combine-1',value.order[0],review));}
const asSources=(left,right)=>[{id:'left',number:1,draft:left},{id:'right',number:2,draft:right}];
function reviewed(draft){
 const input=structuredClone(draft.inputs);input.scope.capacityRequired=entered(false);input.dependenciesConfirmed=entered(true);input.groupsDisjoint=entered(true);input.costsDistinct=entered(true);
 input.costReviews.forEach(row=>row.complete=entered(true));input.memberships.forEach(row=>row.complete=entered(true));input.budget={amount:entered(8000),basis:entered('cash')};
 return reviseBundleDraft(draft,input);
}

test('exact budget request creates #4 while #1–#3, dates, currency and attached snapshots remain unchanged',()=>{
 let value=catalog();const first=value.plans[0];
 value=attachPlanAlternative(value,context,first.id,{inputKey:bundleInputKey(first.draft),attachmentId:'original-attachment',at:'2026-10-07T00:00:00Z',acknowledgeUnknowns:true});
 const before=JSON.stringify(value),out=proposeEditedAlternative(value,context,request(value,'have a budget of 6000'));
 assert.equal(out.status,'ready');assert.equal(out.plan.number,4);assert.equal(out.plan.applied,false);assert.equal(out.catalog.nextNumber,5);
 assert.deepEqual(out.catalog.plans.slice(0,3),value.plans);assert.deepEqual(out.catalog.attachments,value.attachments);assert.equal(JSON.stringify(value),before);
 assert.deepEqual(out.plan.sourceRefs,[{id:first.id,revision:first.draft.revision}]);assert.deepEqual(out.plan.draft.inputs.scope,first.draft.inputs.scope);assert.deepEqual(out.plan.draft.inputs.timing,first.draft.inputs.timing);
 assert.equal(out.plan.result.deliveryEstimate.hours,36);assert.equal(out.plan.result.deliveryEstimate.finish,'2026-11-28');
 assert.deepEqual(out.plan.result.budget,{limit:6000,basis:'cash',cash:3500,employeeTime:null,comparedCost:3500,headroom:null,status:'unknown',assumed:true});
 assert.deepEqual(out.plan.result,reconcileBundle(out.plan.draft));assert.deepEqual(planDirections(out.plan.draft),planDirections(first.draft));
});

test('sequential edits create #5 with fresh directions and lineage; retry, reload, reorder and deletion never recycle numbers',()=>{
 const first=proposeEditedAlternative(catalog(),context,request(catalog(),'have a budget of 6000'));
 const edit=request(first.catalog,'in Action Plan #4 use 25 participants','request-2',first.plan.id);
 const second=proposeEditedAlternative(first.catalog,context,edit);assert.equal(second.plan.number,5);assert.equal(second.plan.result.deliveryEstimate.hours,66);assert.equal(second.plan.result.budget.limit,6000);
 assert.deepEqual(second.plan.sourceRefs,[{id:first.plan.id,revision:first.plan.draft.revision}]);assert.match(planDirections(second.plan.draft)[0].action,/25 participants/);assert.match(planDirections(first.plan.draft)[0].action,/10 participants/);
 assert.throws(()=>proposeEditedAlternative(second.catalog,context,request(second.catalog,'use 25 participants','no-change',second.plan.id)),/No draft change is needed/);
 const retry=proposeEditedAlternative(second.catalog,context,edit);assert.equal(retry.reused,true);assert.deepEqual(retry.catalog,second.catalog);
 let restored=readPlanAlternatives(JSON.parse(JSON.stringify(second.catalog)),context);assert.deepEqual(restored,second.catalog);
 restored=changeAlternativeView(restored,context,{order:[...restored.order].reverse()});assert.equal(resolveNumberedPlans('Action Plan #1',restored,context)[0].id,'source-A');
 restored=changeAlternativeView(restored,context,{deleteId:first.plan.id});assert.equal(restored.plans.find(plan=>plan.number===4).deleted,true);assert.equal(restored.nextNumber,6);
 const next=proposeEditedAlternative(restored,context,request(restored,'set budget to 9000','request-3',second.plan.id));assert.equal(next.plan.number,6);assert.equal(next.catalog.plans.length,6);
 assert.equal(readPlanAlternatives(next.catalog,context).nextNumber,7);assert.throws(()=>resolveNumberedPlans('#4',restored,context),/not available/);
});

test('ordinary questions, invalid requests, stale sources and other goals allocate no alternative',()=>{
 const value=catalog(),before=JSON.stringify(value);
 for(const text of ['What is the budget?','How would a budget of 6000 change this?','Why combine Action Plans #1 and #2?'])assert.equal(request(value,text),null);
 for(const text of ['have a budget of EUR 6000','use about 20 participants','set budget to 6000 or 7000'])assert.throws(()=>proposeEditedAlternative(value,context,request(value,text)));
 const stale=request(value,'have a budget of 6000');stale.expectedInputs[stale.sourceIds[0]]='old';assert.throws(()=>proposeEditedAlternative(value,context,stale),/revision changed/);
 assert.throws(()=>proposeEditedAlternative(value,{goalId:'other',goal:context.goal},request(value,'have a budget of 6000')),/active goal changed/);
 assert.throws(()=>proposeCombinedAlternative(value,context,request(value,'combine plan #1 and #9')),/not available/);
 assert.throws(()=>proposeCombinedAlternative(value,context,request(value,'combine plan #1 and #1')),/different/);
 assert.equal(proposeEditedAlternative(value,context,{requestId:'q',text:'What is the budget?',sourceIds:[],expectedInputs:{}}).status,'not-an-edit');
 assert.equal(proposeCombinedAlternative(value,context,request(value,'combine plan #1 and #2 and remove the check-ins')).status,'needs-review');
 assert.equal(proposeCombinedAlternative(value,context,request(value,'Could you merge Action Plans 1 with 2 into a single plan?','courtesy')).status,'ready');assert.equal(JSON.stringify(value),before);assert.equal(value.nextNumber,4);
});

test('spoken and digit combination requests resolve the active saved catalog and keep immutable history',()=>{
 let value=catalog();const first=value.plans[0];
 value=attachPlanAlternative(value,context,first.id,{inputKey:bundleInputKey(first.draft),attachmentId:'attached-before-combination',at:'2026-10-07T00:00:00Z',acknowledgeUnknowns:true});
 value=changeAlternativeView(value,context,{order:[...value.order].reverse()});const before=JSON.stringify(value);
 for(const text of ['I want a combination of action plan one and two','I want a combination of action plan 1 and 2','Please combine action plan one with plan two','Could you merge Action Plans 1 and two into a single plan?']){
  const pending=request(value,text),out=proposeCombinedAlternative(value,context,pending);
  assert.deepEqual(pending.sourceIds,['source-A','source-B']);assert.equal(out.status,'ready');assert.equal(out.plan.number,4);
  assert.equal(out.plan.result.cashEstimate.cash,null);assert.equal(out.plan.result.uniqueParticipants,null);assert.equal(out.plan.result.budget?.headroom??null,null);
  assert.deepEqual(out.catalog.plans.slice(0,3),value.plans);assert.deepEqual(out.catalog.attachments,value.attachments);assert.equal(JSON.stringify(value),before);
  assert.deepEqual(readPlanAlternatives(JSON.parse(JSON.stringify(out.catalog)),context),out.catalog);
  assert.equal(proposeCombinedAlternative(out.catalog,context,pending).reused,true);
  assert.throws(()=>proposeCombinedAlternative(value,{goalId:'other',goal:context.goal},pending),/active goal changed/);
 }
 for(const text of ['I want a combination of action plan one and nine','Combine Action Plan #1 and #99'])assert.throws(()=>request(value,text),/not available/);
 assert.throws(()=>request(value,'Combine plan one and one'),/different/);
 assert.equal(proposeCombinedAlternative(value,context,request(value,'I want a combination of action plan one and two and remove check-ins')).status,'needs-review');
 for(const text of ['Explain the combination of action plan one and two','Compare action plan one and two','Why combine action plan one and two?'])assert.equal(request(value,text),null);
});

test('word references remain stable labels and never consume unrelated budget or quantity values',()=>{
 assert.deepEqual(planReferenceNumbers('Compare action plans twenty-one and twenty two with thirty'),[21,22,30]);
 assert.deepEqual(planReferenceNumbers('Combine Plan one and Plan two'),[1,2]);
 assert.deepEqual(planReferenceNumbers('Plan #1: set budget to 6000 for two participants'),[1]);
 assert.deepEqual(planReferenceNumbers('What is FTE?'),[]);
 assert.deepEqual(planReferenceNumbers('Plan #1.5 or plan #1-2'),[]);
});

test('combination uses numbered current snapshots after reorder; unknown overlap produces a proposal without made-up affordability',()=>{
 const value=catalog(),reordered=changeAlternativeView(value,context,{order:['source-C','source-B','source-A']}),out=combined(reordered);
 assert.equal(out.status,'ready');assert.equal(out.plan.number,4);assert.deepEqual(out.plan.sourceRefs.map(ref=>ref.id),['source-A','source-B']);assert.equal(out.plan.draft.bundle.components.length,4);
 assert.deepEqual(out.plan.result,reconcileBundle(out.plan.draft));assert.equal(out.plan.result.deliveryEstimate.hours,null);assert.equal(out.plan.result.cashEstimate.cash,null);assert.equal(out.plan.result.uniqueParticipants,null);
 assert.equal(out.plan.draft.inputs.whatIf,undefined);assert.equal(out.plan.draft.inputs.successMeasure,undefined);assert.equal(out.plan.result.employeeTimeTotal,null);
 assert.deepEqual(out.catalog.plans.slice(0,3),value.plans);assert.deepEqual(planDirections(out.plan.draft).map(step=>step.owner),value.plans.slice(0,2).flatMap(plan=>planDirections(plan.draft).map(step=>step.owner)));
 assert.equal(out.plan.draft.inputs.timing.at(-1).finish.value,'2026-11-28');assert.match(out.plan.notes.join(' '),/overlap is unknown/);
 const edit=proposeEditedAlternative(out.catalog,context,request(out.catalog,'Action Plan #4: have a budget of 6000','combined-edit',out.plan.id));assert.equal(edit.plan.number,5);assert.equal(edit.plan.result.budget.status,'unknown');assert.equal(edit.plan.result.budget.headroom,null);
 assert.equal(planDirections(edit.plan.draft).length,4);
});

test('exact shared activities and cash are proposed once only for an explicitly shared participant group',()=>{
 const left=reviewed(original()),right=reviewed(original('B'));
 const out=combinePlanSnapshots(asSources(left,right),{participants:'same',fees:'shared-matches'});assert.equal(out.status,'ready');
 assert.equal(out.draft.bundle.components.length,2);assert.equal(out.draft.inputs.expenses.length,2);assert.equal(out.result.cashTotal,3500);assert.equal(out.result.deliveryEstimate.hours,36);assert.equal(out.result.uniqueParticipants,10);assert.equal(out.result.budget.headroom,4500);
 assert.match(out.notes.join(' '),/proposed once/);assert.equal(out.result.deliveryEstimate.employeeTime,null);
 const uniqueLabels=structuredClone(right.inputs);uniqueLabels.expenses.forEach(row=>row.label+=' second allowance');const unreviewedCash=combinePlanSnapshots(asSources(left,reviseBundleDraft(right,uniqueLabels)),{participants:'disjoint'});assert.equal(unreviewedCash.result.budget.headroom,null);assert.equal(unreviewedCash.result.cashEstimate.coverage,'partial');
 const feesUnknown=combinePlanSnapshots(asSources(left,right),{participants:'same'});assert.equal(feesUnknown.result.budget.headroom,null);assert.equal(feesUnknown.result.cashEstimate.cash,null);
 const unknown=combinePlanSnapshots(asSources(left,right));assert.equal(unknown.draft.bundle.components.length,4);assert.equal(unknown.result.cashEstimate.cash,null);assert.equal(unknown.result.budget.headroom,null);
 const distinct=combinePlanSnapshots(asSources(left,right),{participants:'disjoint',fees:'distinct'});assert.equal(distinct.draft.bundle.components.length,4);assert.equal(distinct.result.cashTotal,7000);assert.equal(distinct.result.deliveryEstimate.hours,72);assert.equal(distinct.result.uniqueParticipants,20);
 const samePeopleSeparateFees=combinePlanSnapshots(asSources(left,right),{participants:'same',fees:'distinct'});assert.equal(samePeopleSeparateFees.result.cashTotal,7000);
});

test('distinct activity hours reconcile under reviewed same/disjoint participants; differing budgets are never added',()=>{
 const left=reviewed(original()),right=reviewed(original('B','Delegation'));
 const same=combinePlanSnapshots(asSources(left,right),{participants:'same',fees:'distinct'});assert.equal(same.status,'ready');assert.equal(same.result.deliveryEstimate.hours,72);assert.equal(same.result.uniqueParticipants,10);
 const input=structuredClone(right.inputs);input.groups[0].count=entered(25);input.budget.amount=entered(10000);const changed=reviseBundleDraft(right,input);
 assert.equal(combinePlanSnapshots(asSources(left,changed),{participants:'same'}).status,'needs-review');
 const explicit=combinePlanSnapshots(asSources(left,changed),{participants:'same',participantCount:25,fees:'distinct'});assert.equal(explicit.result.deliveryEstimate.hours,132);assert.equal(explicit.result.budget.limit,null);assert.equal(explicit.result.budget.headroom,null);assert.match(planDirections(explicit.draft)[0].action,/25 participants/);
});

test('incompatible context, scope, currency, contract capacity and local origins require review without allocating a number',()=>{
 const value=catalog(),left=value.plans[0].draft,right=value.plans[1].draft;
 for(const [field,change] of [['businessUnit','Other BU'],['startMonth','2026-12'],['requirements','Only managers']]){
  const input=structuredClone(right.inputs);input.scope[field]=entered(change);const source=reviseBundleDraft(right,input);assert.equal(combinePlanSnapshots(asSources(left,source)).status,'needs-review');
 }
 const currency=structuredClone(right);currency.inputs.scope.currency='EUR';assert.equal(combinePlanSnapshots(asSources(left,currency)).status,'needs-review');
 const differentGoal=structuredClone(right);differentGoal.binding.goalId='other';assert.throws(()=>combinePlanSnapshots(asSources(left,differentGoal)),/different goals/);
 const changedBinding=structuredClone(right);changedBinding.binding.evidenceDigest='c'.repeat(64);assert.equal(combinePlanSnapshots(asSources(left,changedBinding)).status,'needs-review');
 const bundle=bundleProposalFixture(context.goal).bundles[0],large=prepareIllustrativePilot(createBundleDraft(bundle,binding),'2026-10-07T00:00:00Z');assert.match(combinePlanSnapshots(asSources(left,large)).questions[0],/six/);
 const demo=homeDemoExamples[0],local=prepareIllustrativePilot(createBundleDraft(demoBundle(demo),demoBinding(demo)),'2026-10-07T00:00:00Z');assert.equal(combinePlanSnapshots(asSources(local,local),{participants:'same'}).status,'needs-review');
 const input=structuredClone(right.inputs);input.scope.businessUnit=entered('Other BU');value.plans[1].draft=reviseBundleDraft(right,input);value.plans[1].result=reconcileBundle(value.plans[1].draft);
 assert.equal(combined(value).status,'needs-review');assert.equal(value.nextNumber,4);
});

test('explicit Apply and Attach never rewrite old plans or attachments, including deleted-plan history',()=>{
 const value=catalog(),out=proposeEditedAlternative(value,context,request(value,'have a budget of 6000')),id=out.plan.id,inputKey=bundleInputKey(out.plan.draft);
 const attached=attachPlanAlternative(value,context,'source-A',{inputKey:bundleInputKey(value.plans[0].draft),attachmentId:'old',at:'2026-10-07T00:00:00Z',acknowledgeUnknowns:true});
 out.catalog.attachments=attached.attachments;const old=JSON.stringify(attached.plans[0]);
 let next=applyPlanAlternative(out.catalog,context,id,inputKey);assert.equal(next.plans.at(-1).applied,true);assert.deepEqual(next.attachments,attached.attachments);
 assert.throws(()=>attachPlanAlternative(next,context,id,{inputKey,attachmentId:'new',at:'2026-10-07T00:01:00Z',acknowledgeUnknowns:false}),/Acknowledge/);
 const confirmation={inputKey,attachmentId:'new',at:'2026-10-07T00:01:00Z',acknowledgeUnknowns:true};next=attachPlanAlternative(next,context,id,confirmation);assert.equal(next.attachments.length,2);assert.equal(JSON.stringify(next.plans[0]),old);
 assert.deepEqual(attachPlanAlternative(next,context,id,confirmation),next);const deleted=changeAlternativeView(next,context,{deleteId:id});assert.equal(deleted.attachments.length,2);assert.deepEqual(deleted.plans.at(-1).draft,out.plan.draft);
 assert.throws(()=>applyPlanAlternative(next,context,id,'stale'),/changed/);assert.throws(()=>attachPlanAlternative(next,context,id,{...confirmation,inputKey:'stale'}),/exact alternative/);
});

test('retry tokens cannot cross operations and tampered saved results/lineage/numbers cannot restore',()=>{
 const value=catalog(),edit=request(value,'have a budget of 6000'),out=proposeEditedAlternative(value,context,edit);
 assert.throws(()=>proposeEditedAlternative(out.catalog,context,{...edit,text:'have a budget of 7000'}),/different request/);
 const combo=combined(value);assert.equal(proposeCombinedAlternative(combo.catalog,context,request(value,'combine action plan #1 and #2','combine-1')).reused,true);
 for(const mutate of [v=>v.plans[3].result.budget.headroom=123,v=>v.plans[3].sourceRefs[0].revision++,v=>v.plans[3].number=8,v=>v.plans[3].operation.kind='unrecognized',v=>v.nextNumber=4,v=>v.plans[3].id=v.plans[0].id]){const bad=structuredClone(out.catalog);mutate(bad);assert.equal(readPlanAlternatives(bad,context),null);}
});

test('legacy revision histories remain independently readable and catalog initialization does not rewrite them',()=>{
 const draft=original(),legacy=proposePlanRevision(undefined,draft,'have a budget of 6000',{option:1,count:3}).history,before=JSON.stringify(legacy);
 const value=createPlanAlternatives(context,[{id:'original',draft},{id:'legacy-revision',draft:legacy.revisions[0].draft}]);assert.equal(value.plans[1].draft.inputs.budget.amount.value,6000);assert.deepEqual(readPlanRevisions(legacy,context.goalId),legacy);assert.equal(JSON.stringify(legacy),before);
});
