import test from 'node:test';
import assert from 'node:assert/strict';
import {progressFixture,day,scope} from './fixtures/goal-progress-summary.mjs';
import {readProgressSnapshot,readProgressLinkedPlan} from '../lib/goal-progress-summary.ts';
import {appendGoalProgressEvent,goalProgressField,HEADCOUNT_DEFINITION} from '../lib/goal-progress.ts';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {createBundleDraft,bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {createPlanAlternatives,planAlternativesField} from '../lib/home-plan-alternatives.ts';
import {DecisionStore} from '../lib/local-decisions.ts';
import {progressEntryContext,retainProgressEntryProposal,confirmProgressEntry,cancelProgressEntry} from '../lib/goal-progress-entry-store.ts';
import {createProgressEntryProposal} from '../lib/goal-progress-entry.ts';
for(const direction of ['increase','decrease','maintain','ceiling'])test(direction+' uses existing dated gap without a trajectory or current reassurance',()=>{
 const ledger=progressFixture('test',direction),before=structuredClone(ledger),s=readProgressSnapshot(ledger,'test',day);
 assert.equal(s.baseline.value,100);assert.equal(s.latest.value,direction==='increase'?110:90);assert.equal(s.context.assessment.gap,10);assert.equal(s.context.assessment.currentStatus,'unavailable');assert.equal(s.stale,false);assert.deepEqual(ledger,before);
});
test('missing, baseline-only, stale and unsupported metrics keep honest unavailable states',()=>{
 const missing=readProgressSnapshot(progressFixture('a','increase',{missing:true}),'a',day);assert.equal(missing.latest,null);assert.equal(missing.context.assessment.gap,null);assert.equal(missing.hasObservations,false);
 const only=readProgressSnapshot(progressFixture('a','increase',{baselineOnly:true}),'a',day);assert.equal(only.latest.period.end,only.baseline.period.end);assert.match(only.nextAction,/later dated/);
 const stale=readProgressSnapshot(progressFixture('a','decrease',{stale:true}),'a',day);assert.equal(stale.stale,true);assert.equal(stale.context.assessment.gap,10);assert.match(stale.nextAction,/fresh dated/);
 const unsupported=readProgressSnapshot(progressFixture('a','increase',{unsupported:true}),'a',day);assert.equal(unsupported.latest,null);assert.equal(unsupported.supported,false);assert.equal(unsupported.context.assessment.gap,null);
 const noBaseline=readProgressSnapshot(progressFixture('a','increase',{noBaseline:true}),'a',day);assert.equal(noBaseline.latest.value,110);assert.equal(noBaseline.baseline,null);assert.equal(noBaseline.context.assessment.gap,null);
});
test('scenarios, incomplete reports and wrong scopes cannot become actuals',()=>{
 for(const mutate of [o=>o.source.classification='scenario',o=>o.quality.complete=false,o=>o.scope={...scope,org:'BU-OTHER'},o=>o.quality.suppressed=true]){
  const l=progressFixture('a');mutate(l.events.find(e=>e.id==='latest').data);const s=readProgressSnapshot(l,'a',day);assert.equal(s.latest.value,100);assert.match(s.nextAction,/later dated/);
 }
 assert.throws(()=>readProgressSnapshot(progressFixture('a'),'b',day),/Invalid/);
});
test('plan linkage checks exact goal, revision, inputs, dataset and saved evidence without writes',async()=>{
 const goal='Grow the synthetic workforce',binding=await actionBinding('linked',goal,{},{}),draft=createBundleDraft({...bundleProposalFixture(goal).bundles[0],origin:'conversation-v1'},binding),fields={[planAlternativesField]:createPlanAlternatives({goalId:'linked',goal},[{id:'original',draft}])};
 let ledger=progressFixture('linked');ledger=appendGoalProgressEvent(ledger,{id:'link',kind:'plan-linked',at:day+'T12:00:00Z',supersedes:null,data:{planId:'original',revision:draft.revision,inputKey:bundleInputKey(draft),evidenceDigest:binding.evidenceDigest,datasetToken:'legacy-v1:0'}});
 const context=readProgressSnapshot(ledger,'linked',day).context,plan=readProgressLinkedPlan(ledger,fields,context,goal,'legacy-v1:0');assert.equal(plan.status,'available');assert.ok(plan.steps[0].ownerRole);assert.ok(plan.steps[0].firstStep);assert.equal(plan.steps[0].checkpoint.value,null);
 for(const [g,token] of [[goal,'other:1'],['Other goal','legacy-v1:0']])assert.equal(readProgressLinkedPlan(ledger,fields,context,g,token).status,'unavailable');
 for(const mutate of [link=>link.revision++,link=>link.inputKey+='stale',link=>link.evidenceDigest='b'.repeat(64)]){const changed=structuredClone(ledger);mutate(changed.events.at(-1).data);assert.equal(readProgressLinkedPlan(changed,fields,readProgressSnapshot(changed,'linked',day).context,goal,'legacy-v1:0').status,'unavailable');}
 assert.equal(readProgressLinkedPlan(ledger,{},context,goal,'legacy-v1:0').status,'unavailable');
});
test('existing quoted-chat proposal path requires confirmation and preserves repeated updates and goal binding',async()=>{
 const values=new Map(),store=new DecisionStore();store.initialize({getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)});
 store.saveGoals({version:1,activeId:'growth',goals:[{id:'growth',statement:'Grow the synthetic workforce'},{id:'other',statement:'Other goal'}]});store.setField('growth',goalProgressField,progressFixture('growth'));
 const text='Our complete saved population has 114 people on 2026-10-01.',turns=[{id:'report',text}],c=progressEntryContext(store,'update',turns,true),spec={metric:'headcount',definition:HEADCOUNT_DEFINITION,unit:'people',scope,measurement:null,observation:{value:114,date:'2026-10-01',complete:true,supersedes:null,useAsBaseline:false},basis:[{turnId:'report',quote:text}]};
 const p=await createProgressEntryProposal(spec,c);assert.deepEqual(p.blocking,[]);await retainProgressEntryProposal(store,p,c,{enabled:true});assert.equal(readProgressSnapshot(store.getField('growth',goalProgressField,null),'growth',day).latest.value,110);
 store.saveGoals({...store.getSnapshot().data.goals,activeId:'other'});await assert.rejects(confirmProgressEntry(store,p,{enabled:true}),/changed/);store.saveGoals({...store.getSnapshot().data.goals,activeId:'growth'});
 await confirmProgressEntry(store,p,{enabled:true});const saved=store.getField('growth',goalProgressField,null);assert.equal(readProgressSnapshot(saved,'growth',day).latest.value,114);const repeated=await confirmProgressEntry(store,p,{enabled:true});assert.equal(repeated.changed,false);assert.deepEqual(store.getField('growth',goalProgressField,null),saved);
 const text2='Our complete saved population has 116 people on 2026-10-07.',c2=progressEntryContext(store,'update2',[{id:'report2',text:text2}],true),p2=await createProgressEntryProposal({...spec,observation:{...spec.observation,value:116,date:'2026-10-07'},basis:[{turnId:'report2',quote:text2}]},c2);await retainProgressEntryProposal(store,p2,c2,{enabled:true});cancelProgressEntry(store,p2,true);assert.deepEqual(store.getField('growth',goalProgressField,null),saved);
 const c3=progressEntryContext(store,'update3',[{id:'report2',text:text2}],true),p3=await createProgressEntryProposal(p2.spec,c3);await retainProgressEntryProposal(store,p3,c3,{enabled:true});await confirmProgressEntry(store,p3,{enabled:true});assert.equal(readProgressSnapshot(store.getField('growth',goalProgressField,null),'growth',day).latest.value,116);assert.equal(store.getField('growth',goalProgressField,null).events.filter(e=>e.kind==='observed').length,4);
});

test('accepted milestones and zero dated gaps do not become completed-goal or execution claims',()=>{
 let ledger=progressFixture('a','ceiling');ledger.events.find(e=>e.id==='latest').data.value=70;
 ledger=appendGoalProgressEvent(ledger,{id:'accept',kind:'milestone-accepted',at:'2026-10-02T12:00:00Z',supersedes:null,data:{proposalId:'milestone',intent:'accept-milestone'}});
 const s=readProgressSnapshot(ledger,'a',day);assert.equal(s.context.milestones[0].status,'accepted');assert.equal(s.context.assessment.gap,0);assert.equal(s.context.assessment.completion,'not_assessed');assert.equal(s.context.assessment.forecast.status,'unavailable');assert.equal(s.context.assessment.currentStatus,'unavailable');
 const earlier=readProgressSnapshot(ledger,'a','2026-09-01');assert.equal(earlier.latest.value,100);assert.equal(earlier.context.milestones.length,0);
});
