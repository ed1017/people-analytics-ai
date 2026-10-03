import test from 'node:test';
import assert from 'node:assert/strict';
import {workforceReviewFixture} from './fixtures/workforce-review.mjs';
import {emptySolutionInputs,createWorkforceSolution,beginSolutionRun,completeSolutionRun,recordSolutionApproval,reviseWorkforceSolution,readWorkforceSolution} from '../lib/workforce-solution.ts';
import {loadSolutionCards,rankSolutionCards,previewSolutionWhatIf,saveSolutionWhatIf,pinSavedSolution,resolveSolutionPin,unpinSolution,readSolutionPins} from '../lib/workforce-solution-cards.ts';
import {previewWorkforceAlternatives} from '../lib/workforce-planning-agent.ts';
import {readSavedWorkforceReview} from '../lib/workforce-solution-review.ts';
const at='2026-10-03T01:00:00.000Z';
function fixture(){const payload=workforceReviewFixture(),inputs=emptySolutionInputs();inputs.scope={...payload.input,goalStatement:'Synthetic goal'};let state=createWorkforceSolution('solution','goal',inputs,at);const run=beginSolutionRun(state,1,'run',['brief'],at);state=completeSolutionRun(run.state,run.ticket,[{id:'result',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload}],at);return recordSolutionApproval(state,1,'approval',['result'],'Preserve prior note',at)}
const revision=(input)=>({...input,build:'2',move:'0',buy:'1'});
const makePreview=(state,patch={},history=[],cardId='saved',priority='')=>previewSolutionWhatIf(state,'result',history,cardId,{...workforceReviewFixture().input,...patch},priority);
test('two honest cards with no reviews; base plus two saved alternatives remains three with hiring benchmark',async()=>{
 const state=fixture(),base=workforceReviewFixture().input;
 assert.equal((await loadSolutionCards(state,'result',[])).cards.length,2);
 const review=previewWorkforceAlternatives(state,'result',[revision(base),{...base,build:'0',move:'2',buy:'1'}],'alternatives',at);
 const snapshot=await loadSolutionCards(state,'result',[review]);assert.equal(snapshot.cards.length,3);assert.equal(snapshot.benchmark.id,'hiring-only');
 assert.throws(()=>previewWorkforceAlternatives(state,'result',[revision(base),revision(base),revision(base)],'many',at));
 assert.match((await loadSolutionCards(state,'result',[{broken:true}])).historyNotice,/unreadable/);
});
test('neutral until explicit priority; rank only met constraints with known metric and disclose ties',async()=>{
 const {cards}=await loadSolutionCards(fixture(),'result',[]);assert.equal(rankSolutionCards(cards,'').preferred,null);
 assert.equal(rankSolutionCards(cards,'cash').preferred,'saved');
 const passing=cards.map(card=>({...card,plan:{...card.plan,checks:card.plan.checks.map(check=>({...check,status:'met'}))}}));
 passing[0].plan.totalCash=10;passing[1].plan.totalCash=10;
 assert.equal(rankSolutionCards(passing,'cash').preferred,null);assert.match(rankSolutionCards(passing,'cash').message,/tie/);
 passing[1].plan.totalCash=null;assert.match(rankSolutionCards(passing,'cash').message,/unknown/);assert.equal(rankSolutionCards(passing,'cash').preferred,null);
 passing.forEach(card=>card.plan.checks[0].status='not met');assert.match(rankSolutionCards(passing,'cash').message,/No preferred/);
 assert.throws(()=>rankSolutionCards(cards,'hidden-weight'));
});
test('employee and coverage priorities compare their own metrics with no composite score',async()=>{
 const {cards}=await loadSolutionCards(fixture(),'result',[]);const passing=cards.map(card=>({...card,plan:{...card.plan,checks:card.plan.checks.map(check=>({...check,status:'met'}))}}));
 assert.equal(rankSolutionCards(passing,'employees').preferred,'saved');assert.equal(rankSolutionCards(passing,'coverage').preferred,null);
 passing[1].plan.rows=passing[1].plan.rows.map((row,i)=>({...row,conditionalRoleCoverage:i===0?3:row.conditionalRoleCoverage}));assert.equal(rankSolutionCards(passing,'coverage').preferred,'hiring-only');
});
test('shared edits are applied fairly and exact calculator deltas stay temporary',async()=>{
 const state=fixture(),before=structuredClone(state),p=await makePreview(state,{budget:'999999',maxAddedEmployees:'4',annualHireCost:'60000',arrivalDate:'2026-10-15',trainingCash:'5000'});
 for(const card of p.cards){assert.equal(card.input.budget,'999999');assert.equal(card.input.annualHireCost,'60000');assert.equal(card.input.arrivalDate,'2026-10-15')}
 assert.equal(p.cards[0].input.trainingCash,'5000');assert.equal(p.cards[1].input.trainingCash,'0');assert.notEqual(p.cards[0].plan.totalCash,state.results[0].payload.proposed.totalCash);assert.deepEqual(state,before);
});
test('each editable category uses validated arithmetic, and scope/horizon cannot be changed',async()=>{
 const state=fixture();for(const patch of [{build:'2',move:'0',buy:'1'},{backfills:'1',backfillDate:'2026-11-01',annualBackfillCost:'50000',backfillFee:'0'},{buildMonth:'2026-12',moveMonth:'2026-11'},{trainingHours:'40',loadedHourlyCost:'75'},{internalAnnualCostChange:'24000'},{arrivalMode:'historical-median',recruitingStart:'2026-10-05'}])assert.ok((await makePreview(state,patch)).cards.length===2);
 for(const patch of [{roles:'4',buy:'2'},{months:'4'},{businessUnit:'OTHER'},{budget:'NaN'},{build:'0.5'},{arrivalDate:'2027-12-01'}])await assert.rejects(makePreview(state,patch));
 const unknown=await makePreview(state,{budget:'',arrivalMode:'',arrivalDate:'',annualHireCost:''});assert.equal(unknown.cards[0].plan.totalCash,null);assert.equal(rankSolutionCards(unknown.cards,'cash').preferred,null);
});
test('explicit save appends version/run/result, retains evidence dates, approvals and original bytes',async()=>{
 const state=fixture(),before=structuredClone(state),preview=await makePreview(state,{trainingCash:'5000'},[],'saved','cash');
 const next=await saveSolutionWhatIf(state,'result',[],preview,'new-run','new-result',at);
 assert.ok(readWorkforceSolution(next));assert.equal(next.versions.length,2);assert.deepEqual(next.versions[0],before.versions[0]);assert.deepEqual(next.results[0],before.results[0]);assert.deepEqual(next.approvals,before.approvals);assert.deepEqual(next.evidence,before.evidence);assert.deepEqual(state,before);
 assert.equal(next.results[1].payload.source.asOf,'2026-09-30');assert.equal(next.results[1].payload.localWhatIf.priority,'cash');assert.ok(readSavedWorkforceReview(next,next.results[1]));assert.equal(next.pending,null);
 const again=await previewSolutionWhatIf(next,'new-result',[],'saved',{...preview.draft,trainingCash:'6000'},'');const last=await saveSolutionWhatIf(next,'new-result',[],again,'last-run','last-result',at);assert.ok(readSavedWorkforceReview(last,last.results[2]));assert.equal((await loadSolutionCards(last,'last-result',[])).cards.length,2);
});
test('no-op, tampered preview, stale versions/history and storage caps refuse save preserving originals',async()=>{
 const state=fixture(),p=await makePreview(state,{trainingCash:'5000'});await assert.rejects(saveSolutionWhatIf(state,'result',[],await makePreview(state),'new','same',at),/matches/);
 await assert.rejects(saveSolutionWhatIf(state,'result',[],{...p,sourceHash:'0'.repeat(64)},'new','tampered',at),/changed/);
 const newer=reviseWorkforceSolution(state,1,{constraints:{budget:'1'}},'sidebar','new',at);await assert.rejects(saveSolutionWhatIf(newer,'result',[],p,'new','stale',at));await assert.rejects(saveSolutionWhatIf(state,'result',[{}],p,'new','history',at),/changed/);
 const capped=structuredClone(state);for(let i=2;i<=50;i++)capped.versions.push({...capped.versions[0],version:i});const cp=await makePreview(capped,{trainingCash:'5000'});await assert.rejects(saveSolutionWhatIf(capped,'result',[],cp,'cap','cap',at),/limit/);
});
test('saved alternative lineage refers to exact review/slot; review history is not rewritten',async()=>{
 const state=fixture(),base=workforceReviewFixture().input,review=previewWorkforceAlternatives(state,'result',[revision(base)],'alternative',at),history=[review],before=structuredClone(history);
 const p=await makePreview(state,revision(base),history,'alternative-1');const next=await saveSolutionWhatIf(state,'result',history,p,'new','alternative-result',at);const origin=next.results.at(-1).payload.localWhatIf;
 assert.equal(origin.alternativeReviewId,'alternative');assert.equal(origin.alternativeSlot,0);assert.match(origin.alternativeHash,/^[a-f0-9]{64}$/);assert.deepEqual(history,before);
});
test('local saved reader rejects arithmetic, source, scope, origin and ancestor corruption',async()=>{
 const state=fixture(),p=await makePreview(state,{trainingCash:'5000'}),next=await saveSolutionWhatIf(state,'result',[],p,'new','revised',at);
 for(const mutate of [s=>s.results[1].payload.proposed.totalCash++,s=>s.results[1].payload.source.asOf='2026-10-01',s=>s.results[1].payload.localWhatIf.sourceVersion=2,s=>s.results[1].payload.localWhatIf.changedFields=[],s=>s.results[1].payload.localWhatIf.method='invented']){const bad=structuredClone(next);mutate(bad);assert.equal(readSavedWorkforceReview(bad,bad.results[1]),null)}
 const bad=structuredClone(next);bad.results[0].payload.proposed.totalCash++;await assert.rejects(loadSolutionCards(bad,'revised',[]),/lineage changed/);
});
test('pins resolve exact saved results after reload/version changes; unpin never deletes result or approval',async()=>{
 const state=fixture(),pins=await pinSavedSolution([],state,'result','pin',at),p=await makePreview(state,{trainingCash:'5000'}),next=await saveSolutionWhatIf(state,'result',[],p,'new','revised',at);
 assert.deepEqual(await resolveSolutionPin(JSON.parse(JSON.stringify(pins))[0],next),{resultId:'result',historical:true});assert.deepEqual(unpinSolution(pins,'pin'),[]);assert.equal(next.results.length,2);assert.equal(next.approvals.length,1);
 await assert.rejects(pinSavedSolution(pins,state,'result','pin2',at),/already pinned/);await assert.rejects(pinSavedSolution([],state,'draft','pin2',at),/unavailable/);
 assert.equal(await resolveSolutionPin(pins[0],null),null);assert.equal(await resolveSolutionPin(pins[0],{...state,goalId:'deleted-goal'}),null);
 const changed=structuredClone(state);changed.results[0].payload.source.asOf='2026-10-01';assert.equal(await resolveSolutionPin(pins[0],changed),null);
 assert.equal(readSolutionPins([{...pins[0],extra:true}]),null);
});
test('pin cap never evicts and corrupted history is retained',async()=>{
 const state=fixture(),[pin]=await pinSavedSolution([],state,'result','pin',at);const full=Array.from({length:10},(_,i)=>({...pin,id:`pin-${i}`,resultId:`result-${i}`}));
 await assert.rejects(pinSavedSolution(full,state,'result','extra',at),/Ten-pin/);await assert.rejects(pinSavedSolution([{}],state,'result','extra',at),/unreadable/);assert.throws(()=>unpinSolution([{}],'anything'),/unreadable/);assert.equal(full.length,10);
});
