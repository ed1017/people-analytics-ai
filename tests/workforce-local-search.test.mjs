import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionFixture,selectionSpec} from './fixtures/workforce-selection.mjs';
import {searchWorkforceMixes} from '../lib/workforce-mix-search.ts';
import {stageWorkforceMixSelection} from '../lib/workforce-mix-selection.ts';
import {searchWorkforceMixesLocally,stageWorkforceMixSelectionLocally,runLocalWorkforceSearch,originForSelection,previewWorkforceSearchReview,readLocalWorkforceReview,retainLocalWorkforceReview} from '../lib/workforce-local-search.ts';
import {preflightWorkforceMixes} from '../lib/workforce-mix-search-core.ts';
import {workforceIncrementMethodVersion,calculateWorkforceIncrement} from '../lib/workforce-increment.ts';
import {previewWorkforceAlternatives} from '../lib/workforce-planning-agent.ts';
import {reviseWorkforceSolution,recordSolutionApproval,beginSolutionRun,completeSolutionRun} from '../lib/workforce-solution.ts';
const at='2026-10-03T01:00:00.000Z',ids=['build-0-move-3-buy-0','build-1-move-2-buy-0'];
function setup(patch={}){
 const {solution,payload}=selectionFixture(patch),report=searchWorkforceMixes(solution,'source-result',selectionSpec());
 const context={solution,activeGoalId:solution.goalId,activeGoalStatement:'Synthetic bounded workforce comparison',evidenceResultId:'source-result',expectedSearchFingerprint:report.searchFingerprint,hasUnsavedPlanEdits:false};
 return {solution,payload,report,context};
}
test('calculator method version pins existing arithmetic independently from result schema',()=>{
 const {payload}=setup();assert.equal(workforceIncrementMethodVersion,'workforce-increment-v1');const plan=calculateWorkforceIncrement(payload.input,payload.timing);assert.equal(plan.version,1);assert.equal(plan.totalCash,22500);
});
for(const [name,patch] of Object.entries({normal:{},missing:{budget:'',trainingHours:''},backfills:{backfills:'2',backfillDate:'2026-11-01',annualBackfillCost:'100000',backfillFee:'1000'},historical:{arrivalMode:'historical-median',arrivalDate:''},failed:{budget:'1'},inactive:{build:'0',move:'0',buy:'3',buildMonth:'',moveMonth:'',backfills:''}}))test('Web Crypto full report exactly matches Node: '+name,async()=>{
 const f=setup(patch);assert.deepEqual(await searchWorkforceMixesLocally(f.solution,'source-result',selectionSpec()),f.report);
});
test('near-cap bounded search is identical and capped after complete enumeration',async()=>{
 const {solution}=selectionFixture({roles:'43',build:'0',move:'0',buy:'43'}),spec=selectionSpec({build:{min:0,max:43},move:{min:0,max:43},buy:{min:0,max:43},maxEvaluations:1000});
 const node=searchWorkforceMixes(solution,'source-result',spec),browser=await searchWorkforceMixesLocally(solution,'source-result',spec);assert.deepEqual(browser,node);assert.equal(browser.summary.calculatorInvocations,991);assert.equal(browser.results.length,64);
 const tooMany=selectionSpec({build:{min:0,max:43},move:{min:0,max:43},buy:{min:0,max:43},maxEvaluations:990});await assert.rejects(()=>searchWorkforceMixesLocally(solution,'source-result',tooMany));
});
test('preflight reports exact counts and validates fractions, negatives, reversed and inconsistent ranges',()=>{
 assert.equal(preflightWorkforceMixes(3,selectionSpec()).enumerated,10);
 assert.equal(preflightWorkforceMixes(3,selectionSpec({build:{min:0,max:0},move:{min:0,max:0},buy:{min:0,max:0}})).enumerated,0);
 for(const range of [{min:-1,max:2},{min:.5,max:2},{min:3,max:1},{min:0,max:4}])assert.throws(()=>preflightWorkforceMixes(3,selectionSpec({build:range})));
});
test('local staging uses identical validation, binding and proposal as Node',async()=>{
 const f=setup();assert.deepEqual(await stageWorkforceMixSelectionLocally(f.context,f.report,ids),stageWorkforceMixSelection(f.context,f.report,ids));
 for(const patch of [{activeGoalId:'other'},{activeGoalStatement:'changed'},{hasUnsavedPlanEdits:true},{evidenceResultId:'other'}])await assert.rejects(()=>runLocalWorkforceSearch({...f.context,...patch},selectionSpec()));
 const altered=structuredClone(f.report);altered.results[0].plan.totalCash=0;await assert.rejects(()=>stageWorkforceMixSelectionLocally(f.context,altered,ids));
});
async function reviewFixture(){
 const f=setup();f.context.solution=recordSolutionApproval(f.solution,1,'approval',['source-result'],'Keep approval',at);f.solution=f.context.solution;
 const proposal=await stageWorkforceMixSelectionLocally(f.context,f.report,ids),origin=originForSelection(f.report,ids,proposal.revisions);
 const review=await previewWorkforceSearchReview(f.context,proposal.revisions,origin,'search-review',at);
 return {...f,proposal,origin,review};
}
test('v2 lineage is minimal, replayable and preserves old v1 records and approval state',async()=>{
 const f=await reviewFixture(),before=structuredClone(f.solution);
 const v1=previewWorkforceAlternatives(f.solution,'source-result',[{...f.payload.input,trainingCash:'1000'}],'old-review',at);
 assert.equal(f.review.schemaVersion,2);assert.deepEqual(await readLocalWorkforceReview(f.review,f.solution),f.review);assert.deepEqual(await readLocalWorkforceReview(v1,f.solution),v1);
 const history=await retainLocalWorkforceReview([v1],f.review,f.solution);assert.deepEqual(history[0],v1);assert.deepEqual(f.solution,before);
 const text=JSON.stringify(f.review.selectionOrigin);for(const secret of ['KEEP PRIVATE NOTES','Keep approval','dependencyKey','"candidatePool":'])assert.equal(text.includes(secret),false);
 assert.equal(f.review.selectionOrigin.search.calculator.methodVersion,workforceIncrementMethodVersion);
});
test('draft edits derive lineage status and recompute outcomes rather than inherit matching constraints',async()=>{
 const f=await reviewFixture(),revisions=structuredClone(f.proposal.revisions);revisions[0].internalAnnualCostChange='1000000';
 const review=await previewWorkforceSearchReview(f.context,revisions,f.origin,'custom-review',at);
 assert.equal(review.selectionOrigin.selections[0].editedSinceSelection,true);assert.equal(review.selectionOrigin.selections[1].editedSinceSelection,false);assert.equal(review.comparisons[2].status,'not-met');
 assert.deepEqual(await readLocalWorkforceReview(review,f.solution),review);
 const bad=structuredClone(review);bad.selectionOrigin.selections[0].editedSinceSelection=false;assert.equal(await readLocalWorkforceReview(bad,f.solution),null);
});
for(const [name,change] of Object.entries({fingerprint:r=>{r.selectionOrigin.source.evidenceFingerprint='0'.repeat(64)},mix:r=>{r.selectionOrigin.selections[0].mix.build=9},calculator:r=>{r.selectionOrigin.search.calculator.methodVersion='future'},bounds:r=>{r.selectionOrigin.search.spec.build.max=2},extra:r=>{r.selectionOrigin.rawSource={}},slot:r=>{r.selectionOrigin.selections[1].revisionSlot=0}}))test('v2 rejects tampered '+name,async()=>{
 const f=await reviewFixture(),raw=structuredClone(f.review);change(raw);assert.equal(await readLocalWorkforceReview(raw,f.solution),null);await assert.rejects(()=>retainLocalWorkforceReview([],raw,f.solution));
});
test('source/evidence changes block new saves while historical reviews retain old version',async()=>{
 const f=await reviewFixture(),next=reviseWorkforceSolution(f.solution,1,{scope:{...f.solution.versions[0].inputs.scope,budget:'26000'}},'sidebar','Changed',at);
 assert.deepEqual(await readLocalWorkforceReview(f.review,next),f.review);await assert.rejects(()=>retainLocalWorkforceReview([],f.review,next));
 const changed=structuredClone(f.solution);changed.results[0].payload.source.businessUnit.org_name='Changed';assert.equal(await readLocalWorkforceReview(f.review,changed),null);
});
test('manual options do not gain fabricated lineage and two-slot limits remain enforced',async()=>{
 const f=await reviewFixture(),origin={...f.origin,selections:f.origin.selections.slice(0,1)},revisions=[f.proposal.revisions[0],{...f.payload.input,trainingCash:'1000'}];
 const review=await previewWorkforceSearchReview(f.context,revisions,origin,'mixed-review',at);assert.equal(review.selectionOrigin.selections.length,1);
 assert.equal((await previewWorkforceSearchReview(f.context,revisions,null,'manual-review',at)).schemaVersion,1);
 await assert.rejects(()=>previewWorkforceSearchReview(f.context,[...revisions,revisions[0]],origin,'too-many',at));
});
test('history limits, duplicate IDs and unsupported records preserve previous history',async()=>{
 const f=await reviewFixture(),full=Array.from({length:10},(_,i)=>({...f.review,id:'review-'+i})),before=structuredClone(full);
 await assert.rejects(()=>retainLocalWorkforceReview(full,f.review,f.solution));assert.deepEqual(full,before);
 await assert.rejects(()=>retainLocalWorkforceReview([f.review],f.review,f.solution));
 await assert.rejects(()=>retainLocalWorkforceReview([{schemaVersion:99}],f.review,f.solution));
});

test('both review schemas remain inspectable after later completed runs and approvals exist',async()=>{
 const f=await reviewFixture(),v1=previewWorkforceAlternatives(f.solution,'source-result',[{...f.payload.input,trainingCash:'1000'}],'v1-history',at);
 let next=reviseWorkforceSolution(f.solution,1,{scope:{...f.solution.versions[0].inputs.scope,budget:'26000'}},'sidebar','Changed',at);
 const payload=structuredClone(f.payload);payload.input.budget='26000';payload.proposed=calculateWorkforceIncrement(payload.input,payload.timing);payload.hireOnly=calculateWorkforceIncrement({...payload.input,build:'0',move:'0',buy:'3',backfills:'0',internalAnnualCostChange:'0',trainingCash:'0',trainingHours:'0'},payload.timing);
 const run=beginSolutionRun(next,2,'later-run',['brief'],at);next=completeSolutionRun(run.state,run.ticket,[{id:'later-result',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload}],at);
 next=recordSolutionApproval(next,2,'later-approval',['later-result'],'New approval',at);const before=structuredClone(next);
 assert.deepEqual(await readLocalWorkforceReview(v1,next),v1);assert.deepEqual(await readLocalWorkforceReview(f.review,next),f.review);assert.deepEqual(next,before);
});
test('retaining mixed history enforces the existing 256 KiB cap without eviction',async()=>{
 const f=setup();let solution=reviseWorkforceSolution(f.solution,1,{scope:{...f.solution.versions[0].inputs.scope,ownerNotes:'Synthetic note '.repeat(2200)}},'sidebar','Notes only',at);
 const run=beginSolutionRun(solution,2,'note-run',['brief'],at);solution=completeSolutionRun(run.state,run.ticket,[{id:'note-result',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload:f.payload}],at);
 const review=previewWorkforceAlternatives(solution,'note-result',[{...f.payload.input,trainingCash:'1000'}],'new-review',at);
 const previous=Array.from({length:9},(_,i)=>({...review,id:'prior-'+i})),before=JSON.stringify(previous);
 await assert.rejects(()=>retainLocalWorkforceReview(previous,review,solution),/storage limit/);assert.equal(JSON.stringify(previous),before);
});
