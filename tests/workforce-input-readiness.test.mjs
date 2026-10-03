import test from 'node:test';
import assert from 'node:assert/strict';
import {workforceInputReadiness} from '../lib/workforce-input-readiness.ts';
import {validateWorkforcePlanInput,calculateWorkforceIncrement,emptyWorkforcePlanInput} from '../lib/workforce-increment.ts';
import {workforceReviewFixture} from './fixtures/workforce-review.mjs';
const base=workforceReviewFixture().input;
test('blank required inputs produce actionable shared errors without modifying input',()=>{
 const input=emptyWorkforcePlanInput(),before=structuredClone(input),r=workforceInputReadiness(input);
 for(const field of ['businessUnit','jobProfile','intent','roles','build','move','buy','planningMonth','months'])assert.ok(r.corrections.some(issue=>issue.fields.includes(field)),field);
 assert.ok(r.corrections.every(issue=>issue.kind==='missing'));
 assert.throws(()=>validateWorkforcePlanInput(input),{message:r.corrections[0].message});assert.deepEqual(input,before);
});
test('invalid numeric/date/cross-field values point to precise editable fields',()=>{
 for(const [patch,field] of [[{roles:'0'},'roles'],[{build:'0.5'},'build'],[{buy:'-1'},'buy'],[{months:'25'},'months'],[{budget:'NaN'},'budget'],[{planningMonth:'2026-13'},'planningMonth'],[{moveMonth:'2027-01'},'moveMonth'],[{arrivalDate:'2026-02-30'},'arrivalDate'],[{arrivalMode:'other'},'arrivalMode'],[{backfills:'3'},'backfills']]){
  const input={...base,...patch},r=workforceInputReadiness(input);assert.ok(r.corrections.some(issue=>issue.fields.includes(field)&&issue.kind==='invalid'),field);assert.throws(()=>calculateWorkforceIncrement(input,null));
 }
 const r=workforceInputReadiness({...base,buy:'2'});assert.ok(r.corrections.some(issue=>issue.fields.join(',')==='roles,build,move,buy'));
});
test('internal backfills are required while optional blanks remain unknown and calculable',()=>{
 assert.ok(workforceInputReadiness({...base,backfills:''}).corrections.some(issue=>issue.fields.includes('backfills')&&issue.kind==='missing'));
 const input={...base,backfills:'0',annualHireCost:'',hireFee:'',buildMonth:'',budget:'',maxAddedEmployees:'',deadlineMonth:'',trainingCash:'',trainingHours:'',moveMonth:'',internalAnnualCostChange:''};
 const r=workforceInputReadiness(input);assert.deepEqual(r.corrections,[]);
 for(const field of ['annualHireCost','hireFee','buildMonth','budget','maxAddedEmployees','deadlineMonth','trainingCash','trainingHours','moveMonth','internalAnnualCostChange'])assert.ok(r.unknowns.some(item=>item.field===field),field);
 const result=calculateWorkforceIncrement(input,null);assert.equal(result.totalCash,null);assert.equal(result.totalTime,null);assert.ok(result.checks.every(check=>check.status==='unknown'));
});
test('explicit zero remains a known assumption; inactive paths create no spurious unknowns',()=>{
 const input={...base,build:'0',move:'0',buy:'3',backfills:'',buildMonth:'',moveMonth:'',trainingCash:'',trainingHours:'',loadedHourlyCost:'',internalAnnualCostChange:'',hireFee:'0',annualHireCost:'0',budget:'0',maxAddedEmployees:'0'};
 const r=workforceInputReadiness(input);assert.deepEqual(r.corrections,[]);assert.deepEqual(r.unknowns,[]);assert.match(r.capacity,/unverified/);
 const zeroTime=workforceInputReadiness({...base,trainingHours:'0',loadedHourlyCost:''});assert.ok(!zeroTime.unknowns.some(item=>item.field==='loadedHourlyCost'));
 assert.ok(workforceInputReadiness({...base,loadedHourlyCost:''}).unknowns.some(item=>item.field==='loadedHourlyCost'));
});
test('historical timing requires launch for active hires and never treats old evidence as current',()=>{
 let r=workforceInputReadiness({...base,arrivalMode:'historical-median',recruitingStart:''});assert.ok(r.corrections.some(issue=>issue.fields.includes('recruitingStart')));assert.equal(r.evidenceChecks.length,1);
 r=workforceInputReadiness({...base,arrivalMode:'historical-median'});assert.deepEqual(r.corrections,[]);assert.match(r.evidenceChecks[0].message,/does not refresh or verify/);
 const evidence={scope:{job_profile_code:'ENGINEER'},opening_to_start:{median_days:null,valid_sample_count:2}};
 assert.equal(calculateWorkforceIncrement({...base,arrivalMode:'historical-median'},evidence).arrivalDate,null);
});
test('active explicit arrivals share calculator horizon checks and corrections disappear when fixed',()=>{
 for(const patch of [{arrivalDate:'2027-01-01'},{backfills:'1',backfillDate:'2027-01-01'}]){
  const input={...base,...patch},r=workforceInputReadiness(input);assert.match(r.corrections[0].message,/planning horizon/);assert.throws(()=>calculateWorkforceIncrement(input,null),{message:r.corrections[0].message});
 }
 assert.deepEqual(workforceInputReadiness(base).corrections,[]);assert.deepEqual(workforceInputReadiness(base).unknowns,[]);
});
test('hiring-only unknowns are distinct from an inactive Buy path',()=>{
 const r=workforceInputReadiness({...base,build:'3',move:'0',buy:'0',annualHireCost:'',hireFee:'',arrivalMode:'',arrivalDate:''});
 assert.deepEqual(r.corrections,[]);assert.ok(r.unknowns.filter(item=>['annualHireCost','hireFee','arrivalMode'].includes(item.field)).every(item=>item.message.startsWith('Hiring-only comparison')));
});
test('independent issues accumulate without inventing cross-field errors from invalid operands',()=>{
 const input={...base,build:'bad',backfills:'',budget:'bad',planningMonth:'',annualHireCost:''};
 const r=workforceInputReadiness(input);
 for(const field of ['build','budget','planningMonth'])assert.ok(r.corrections.some(issue=>issue.fields.includes(field)),field);
 assert.ok(!r.corrections.some(issue=>issue.message.includes('must sum')||issue.message.includes('within the planning horizon')));
 assert.ok(r.unknowns.some(item=>item.field==='annualHireCost'));
 const corrected=workforceInputReadiness({...input,build:'1',budget:'25000',planningMonth:'2026-10'});
 assert.deepEqual(corrected.corrections.map(issue=>issue.fields),[['backfills']]);
});
