import test from 'node:test';
import assert from 'node:assert/strict';
import {selectWorkforceJourney as select,workforceJourneyContext as context} from '../lib/workforce-journey-state.ts';
import {emptySolutionInputs,createWorkforceSolution,beginSolutionRun,completeSolutionRun,reviseWorkforceSolution} from '../lib/workforce-solution.ts';
import {workforceReviewFixture} from './fixtures/workforce-review.mjs';
const at='2026-10-03T01:00:00.000Z';
const base=workforceReviewFixture().input;
function records(calculated=false,patch={}){
 const inputs=emptySolutionInputs();inputs.scope={...base,...patch,goalStatement:'Synthetic goal'};
 let solution=createWorkforceSolution('solution','goal',inputs,at);
 if(calculated){const run=beginSolutionRun(solution,1,'run',['brief'],at);solution=completeSolutionRun(run.state,run.ticket,[{id:'result',kind:'brief',calculator:{name:'single-role-workforce-review',version:'1'},payload:workforceReviewFixture()}],at)}
 return {ready:true,writable:true,goals:{version:1,activeId:'goal',goals:[{id:'goal',statement:'Synthetic goal'}]},solution,alternativeHistory:[]};
}
const transient=(r,value)=>({context:context(r),...value});
test('loading, goal selection, first inputs and unavailable storage are explicit',()=>{
 const r=records();assert.equal(select({...r,ready:false}).step,'loading');
 assert.equal(select({...r,goals:{...r.goals,activeId:''}}).step,'choose-goal');
 assert.equal(select({...r,solution:null}).step,'start-inputs');
 assert.equal(select({...r,writable:false}).step,'storage-blocked');
 for(const solution of [{}, {...r.solution,goalId:'other'}])assert.equal(select({...r,solution}).step,'unavailable');
});
test('blocking corrections focus exact fields; optional unknowns permit explicit calculation',()=>{
 const r=records(false,{roles:''});const next=select(r);assert.equal(next.step,'correct-inputs');assert.deepEqual(next.focus,{kind:'field',field:'roles'});
 const optional=select(records(false,{budget:'',annualHireCost:'',buildMonth:''}));
 assert.equal(optional.step,'calculate');assert.ok(optional.readiness.unknowns.some(item=>item.field==='budget'));
 assert.match(optional.readiness.capacity,/unverified/);
 assert.equal(select(records(false,{budget:'0'})).step,'calculate');
});
test('proposal review, draft correction, save inputs, calculation, verification and comparison remain separate',()=>{
 const r=records();assert.equal(select(r,transient(r,{kind:'proposal'})).step,'review-proposal');
 assert.equal(select(r,transient(r,{kind:'input-draft',input:{...base,buy:'-1'}})).step,'correct-inputs');
 assert.equal(select(r,transient(r,{kind:'input-draft',input:base})).step,'save-inputs');
 assert.equal(select(r).step,'calculate');
 const done=records(true);assert.equal(select(done).step,'verify-result');assert.equal(select(done,undefined,context(done)).step,'compare');
});
test('alternatives and tailoring require verified current source; saving is a separate recommendation',()=>{
 const r=records(true),verified=context(r);
 for(const [value,step] of [[{kind:'alternatives'},'review-alternatives'],[{kind:'tailoring',input:{...base,budget:'1'},preview:'needed'},'preview-tailoring'],[{kind:'tailoring',input:{...base,budget:'1'},preview:'ready'},'save-solution']]){
  assert.equal(select(r,transient(r,value)).step,'verify-result');assert.equal(select(r,transient(r,value),verified).step,step);
 }
});
test('cancellation resumes records; pending runs stay cancellable until lifecycle clears them',()=>{
 const r=records();assert.equal(select(r,transient(r,{kind:'working',operation:'calculate'})).step,'working');
 assert.equal(select(r,transient(r,{kind:'cancelled'})).step,'calculate');
 const pending={...r,solution:beginSolutionRun(r.solution,1,'run',['brief'],at).state};
 assert.equal(select(pending,transient(pending,{kind:'cancelled'})).step,'working');
});
test('goal changes, evidence/history changes and selection changes discard stale temporary guidance',()=>{
 const r=records(true),draft=transient(r,{kind:'tailoring',input:base,preview:'ready'});
 const changes=[{...r,alternativeHistory:[{}]},{...r,selectedResultId:'result'}];
 for(const next of changes){assert.equal(select(next,draft,context(r)).staleTransient,true);assert.equal(select(next,draft,context(r)).step,'verify-result')}
 const evidenceChanged=structuredClone(r);evidenceChanged.solution.results[0].payload.source.asOf='2026-09-29';
 assert.equal(select(evidenceChanged,draft,context(r)).staleTransient,true);
 const revised={...r,solution:reviseWorkforceSolution(r.solution,1,{scope:{...r.solution.versions[0].inputs.scope,budget:'1'}},'sidebar','Edit',at)};
 assert.equal(select(revised,draft,context(r)).staleTransient,true);assert.equal(select(revised,draft,context(r)).step,'historical');
 const changed=structuredClone(r);changed.goals.goals[0].statement='Changed goal';assert.equal(select(changed,draft).step,'align-goal');
 const switched={...r,goals:{version:1,activeId:'other',goals:[{id:'other',statement:'Other'}]}};assert.equal(select(switched,draft).step,'unavailable');
});
test('reopening uses exact selected result; historical, missing and malformed results cannot be current',()=>{
 const r=records(true);assert.equal(select({...r,selectedResultId:'missing'}).step,'unavailable');
 const historical={...r,selectedResultId:'result',solution:reviseWorkforceSolution(r.solution,1,{scope:{...r.solution.versions[0].inputs.scope,budget:'1'}},'sidebar','Edit',at)};
 assert.equal(select(historical,undefined,context(historical)).step,'historical');
 const reverted={...historical,solution:reviseWorkforceSolution(historical.solution,2,{scope:{...r.solution.versions[0].inputs.scope,budget:base.budget}},'sidebar','Revert',at)};
 assert.equal(select(reverted,undefined,context(reverted)).step,'historical');
 const bad=structuredClone(r);bad.solution.results[0].payload={};assert.equal(select(bad).step,'unavailable');
 assert.equal(select({...r,selectedResultId:'result'},undefined,context({...r,selectedResultId:'result'})).step,'compare');
});
test('projection is deterministic, non-mutating and does not repair ambiguous saved fields',()=>{
 const r=records(true),before=structuredClone(r);assert.deepEqual(select(r),select(r));assert.deepEqual(r,before);
 const duplicate=records();duplicate.solution.versions[0].inputs.costs.budget='2';assert.equal(select(duplicate).step,'unavailable');
});
