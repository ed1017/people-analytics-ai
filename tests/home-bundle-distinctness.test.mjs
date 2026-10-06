import test from 'node:test';
import assert from 'node:assert/strict';
import {hasDuplicatePlanActivities} from '../lib/home-bundle-distinctness.ts';
import {inspectBundleResponse} from '../lib/home-bundle-response.ts';
import {createHomeBundlePreparation,readBundlePreparation} from '../lib/home-bundle-preparation.ts';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {homeBundleInstructions,readHomeBundleProposal} from '../lib/home-solution-bundles.ts';
import {bundleProposalFixture,bundleWireFixture} from './fixtures/home-bundles.mjs';

const goal='Review workforce alternatives',packet={sources:[{id:'W1',status:'loaded',facts:{headcount:100}}]};
const duplicates=()=>{const p=bundleProposalFixture(goal);p.bundles[1]={...structuredClone(p.bundles[0]),id:'B',name:'A different title',objective:'A different intended objective.',coordination:'A differently described coordination.',limitation:'A different warning, with no changed activities.'};return p};
const inspect=p=>inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(bundleWireFixture(p))}),goal,packet);

test('fresh response rejects exact activities hidden behind different plan prose without partial acceptance',async()=>{
 const p=duplicates(),before=JSON.stringify(p);let calls=0;
 const result=await inspectBundleResponse(async()=>{calls++;return {status:'completed',output_text:JSON.stringify(bundleWireFixture(p))}},goal,packet);
 assert.equal(result.diagnostic,'duplicate_plans');assert.equal(result.proposal,null);assert.equal(calls,1);assert.equal(result.responseDiagnostic.reason,'invalid_output');assert.equal(JSON.stringify(p),before);assert.ok(!JSON.stringify(result).includes('A different title'));
 assert.deepEqual(readHomeBundleProposal(p,goal,packet),p,'saved contract remains unchanged');
});
test('comparison ignores cosmetic labels, component slot order, case and whitespace but preserves graph meaning',()=>{
 const p=duplicates(),b=p.bundles[1],mapping=Object.fromEntries(b.components.map((c,i)=>[c.id,'c'+(6-i)]));
 b.components=b.components.map(c=>({...c,id:mapping[c.id],dependsOn:c.dependsOn.map(id=>mapping[id]),name:'Renamed activity',firstStep:'  '+c.firstStep.toUpperCase().replaceAll(' ','  ')+'  ',ownerRole:c.ownerRole.toUpperCase(),limitation:'Another qualification.'})).reverse();
 assert.equal(hasDuplicatePlanActivities(p),true);
 b.components.find(c=>c.domain==='learning').dependsOn=[];
 assert.equal(hasDuplicatePlanActivities(p),false,'different prerequisite sequence is retained');
});
test('different concrete activity or proposed owner remains available without claiming meaningful diversity',async()=>{
 for(const change of [c=>{c.firstStep='Run a supervised practice session for the reviewed group.'},c=>{c.ownerRole='Learning lead'}]){
  const p=duplicates();change(p.bundles[1].components[0]);assert.equal(hasDuplicatePlanActivities(p),false);assert.ok((await inspect(p)).proposal);
 }
 assert.equal(hasDuplicatePlanActivities(bundleProposalFixture(goal)),false);
});
test('zero, one, two or three actual distinct options remain accepted; instructions prefer three only when supported',async()=>{
 for(const count of [0,1,2,3]){const p=bundleProposalFixture(goal);p.bundles=p.bundles.slice(0,count);assert.equal((await inspect(p)).proposal.bundles.length,count);}
 assert.match(homeBundleInstructions,/Aim for three meaningfully distinct alternatives when/);assert.match(homeBundleInstructions,/Do not pad.*fewer or no bundles is valid/);
});
test('fresh client response is also guarded and legacy cached duplicates remain untouched',async()=>{
 const binding=await actionBinding('g',goal,packet,{}),worker=createHomeBundlePreparation(),commits=[];let calls=0;
 const args={mode:'new-pin',binding,packet,stored:null,isCurrent:()=>true,prepare:async()=>{calls++;return {proposal:duplicates()}},commit:p=>commits.push(p)};
 assert.deepEqual(await worker.run(args),{status:'failed',diagnostic:'duplicate_plans'});assert.equal(commits.length,0);
 assert.equal((await worker.run(args)).status,'explicit_required');assert.equal(calls,1);
 assert.equal((await worker.run({...args,mode:'explicit',prepare:async()=>({proposal:bundleProposalFixture(goal)})})).status,'ready');
 const legacy=structuredClone(commits[0].value);legacy.proposal=duplicates();const before=JSON.stringify(legacy);
 assert.ok(readBundlePreparation(legacy,binding,packet));assert.equal((await worker.run({...args,stored:legacy})).status,'cached');assert.equal(JSON.stringify(legacy),before);assert.equal(calls,1);
});
