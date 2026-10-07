import test from 'node:test';
import assert from 'node:assert/strict';
import {planDirections} from '../lib/plan-directions.ts';
import {createBundleDraft,reviseBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {demoBundle,demoBinding,homeDemoExamples} from '../lib/home-demo-catalog.ts';
const binding={version:1,goalId:'directions',goal:'Improve employee satisfaction',evidenceDigest:'a'.repeat(64),planningDigest:'b'.repeat(64)};
const component=(id,name,firstStep,ownerRole,dependsOn=[])=>({id,name,firstStep,ownerRole,dependsOn,domain:'manager_workload',evidence:['W1:summary'],limitation:'Proposed practice; effectiveness is not established.'});
const bundle={id:'A',name:'Manager Practice',objective:'Practice feedback and delegation, then review check-ins.',coordination:'Practice before check-ins.',limitation:'Proposed activities only.',components:[component('c2','Follow-up check-ins','Run check-ins with 10 participants after c1.','BU HR partner',['c1']),component('c1','Feedback and delegation practice','Run feedback and delegation practice with 10 participants.','People Ops lead')]};
const base=()=>prepareIllustrativePilot(createBundleDraft(bundle,binding),'2026-10-07T00:00:00Z',{includeDeliveryEstimate:true});
test('directions follow actual dependencies, current participants and per-step timing without assigning owners or cadence',()=>{
 const draft=base(),inputs=structuredClone(draft.inputs);inputs.groups[0].count={value:25,kind:'user-entered',basis:'User adjustment.'};const current=reviseBundleDraft(draft,inputs),before=JSON.stringify(current),steps=planDirections(current);
 assert.deepEqual(steps.map(step=>step.id),['c1','c2']);assert.match(steps[0].action,/25 participants/);assert.match(steps[1].action,/after Feedback and delegation practice/);
 assert.equal(steps[0].owner,'People Ops lead');assert.equal(steps[1].owner,'BU HR partner');assert.match(steps[1].timing,/Assumed: 2026-11-15.*Assumed: 2026-11-28/);
 assert.deepEqual(steps[1].prerequisites,['Feedback and delegation practice']);assert.match(steps[0].completionEvidence,/materials or work samples/);assert.match(steps[1].completionEvidence,/dated check-in notes/);
 assert.doesNotMatch(JSON.stringify(steps),/weekly|monthly|fortnightly|\$|USD|hourly|improved|achieved/);assert.equal(JSON.stringify(current),before);
});
test('legacy snapshots and pending revisions remain separate and unknown dates are not filled from the horizon',()=>{
 const old=base(),inputs=structuredClone(old.inputs);inputs.timing.find(item=>item.componentId==='c2').finish={value:'2026-12-05',kind:'user-entered',basis:'Updated finish.'};
 const newer=reviseBundleDraft(old,inputs);assert.match(planDirections(old)[1].timing,/2026-11-28/);assert.match(planDirections(newer)[1].timing,/User assumption: 2026-12-05/);
 const unknown=createBundleDraft(bundle,binding);assert.equal(planDirections(unknown)[0].timing,'Start — Not specified. Finish — Not specified.');assert.deepEqual(planDirections(JSON.parse(JSON.stringify(old))),planDirections(old));
});
test('demo directions preserve only explicitly supplied recurrence and independent steps gain no dependencies',()=>{
 const example=homeDemoExamples[0],draft=prepareIllustrativePilot(createBundleDraft(demoBundle(example),demoBinding(example)),'2026-10-07T00:00:00Z',{includeDeliveryEstimate:true});
 assert.match(planDirections(draft)[0].action,/fortnightly/);assert.deepEqual(planDirections(draft)[0].prerequisites,[]);
 const independent=structuredClone(bundle);independent.components[0].dependsOn=[];assert.deepEqual(planDirections(createBundleDraft(independent,binding)).map(step=>step.prerequisites),[[],[]]);
});
