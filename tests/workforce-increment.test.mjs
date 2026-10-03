import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorkforcePlanInput,validateWorkforcePlanInput,calculateWorkforceIncrement} from '../lib/workforce-increment.ts';
const input={...emptyWorkforcePlanInput(),businessUnit:'TECH',jobProfile:'ENGINEER',intent:'additional',roles:'3',build:'1',move:'1',buy:'1',backfills:'0',planningMonth:'2026-10',months:'3',recruitingStart:'2026-10-01',arrivalMode:'explicit',arrivalDate:'2026-11-16',buildMonth:'2026-11',moveMonth:'2026-10',annualHireCost:'120000',hireFee:'2000',internalAnnualCostChange:'12000',trainingCash:'3000',trainingHours:'20',loadedHourlyCost:'50',budget:'25000',maxAddedEmployees:'1',deadlineMonth:'2026-12'};
test('incremental headcount excludes internal transfers and cash excludes employee time',()=>{
 const r=calculateWorkforceIncrement(input,null);assert.deepEqual(r.rows.map(x=>x.addedEmployees),[0,1,1]);assert.deepEqual(r.rows.map(x=>x.conditionalRoleCoverage),[1,3,3]);
 assert.equal(r.rows[1].hireStaffingCost,5000);assert.equal(r.rows[2].hireStaffingCost,10000);assert.equal(r.rows[0].internalSalaryUplift,500);assert.equal(r.rows[1].internalSalaryUplift,1000);
 assert.equal(r.totalCash,22500);assert.equal(r.totalTime,1000);assert.equal(r.totalWithTime,23500);assert.ok(r.checks.every(c=>c.status==='met'));
});
test('explicit backfill increases headcount and adds separately costed recurring and one-time amounts',()=>{
 const r=calculateWorkforceIncrement({...input,backfills:'1',backfillDate:'2026-12-01',annualBackfillCost:'60000',backfillFee:'1000'},null);
 assert.equal(r.rows[2].addedEmployees,2);assert.equal(r.rows[2].backfillStaffingCost,5000);assert.equal(r.totalCash,28500);assert.equal(r.checks[0].status,'not met');assert.equal(r.checks[1].status,'not met');
});
test('missing costs and timing remain unknown rather than creating a passing budget',()=>{
 const r=calculateWorkforceIncrement({...input,annualHireCost:'',arrivalDate:'',internalAnnualCostChange:'',loadedHourlyCost:''},null);
 assert.equal(r.totalCash,null);assert.equal(r.totalTime,null);assert.equal(r.rows[2].addedEmployees,null);assert.equal(r.checks[0].status,'unknown');assert.equal(r.checks[2].status,'unknown');
});
test('internal-source backfill requires an explicit zero or number',()=>{
 assert.throws(()=>calculateWorkforceIncrement({...input,backfills:''},null),/external backfills/);
 assert.throws(()=>calculateWorkforceIncrement({...input,backfills:'3'},null),/cannot exceed/);
});
test('hiring-only plan does not invent training costs or require irrelevant internal fields',()=>{
 const r=calculateWorkforceIncrement({...input,build:'0',move:'0',buy:'3',backfills:'',internalAnnualCostChange:'',trainingCash:'',trainingHours:'',loadedHourlyCost:''},null);
 assert.equal(r.totalTime,0);assert.equal(r.rows[0].internalSalaryUplift,0);assert.equal(r.rows[0].trainingCash,0);assert.equal(r.maxAddedEmployees,3);
});
test('historical assumption uses paired opening-to-start median and preserves missing comparable evidence',()=>{
 const e={scope:{job_profile_code:'ENGINEER'},opening_to_start:{median_days:45.5,valid_sample_count:10}};
 let r=calculateWorkforceIncrement({...input,arrivalMode:'historical-median'},e);assert.equal(r.arrivalDate,'2026-11-16');
 r=calculateWorkforceIncrement({...input,arrivalMode:'historical-median'},{...e,opening_to_start:{median_days:null,valid_sample_count:2}});assert.equal(r.arrivalDate,null);assert.equal(r.totalCash,null);
 assert.throws(()=>calculateWorkforceIncrement({...input,arrivalMode:'historical-median'},{...e,scope:{job_profile_code:'OTHER'}}),/does not match/);
});
test('replacement demand, fractional people, incompatible counts and invalid chronology are rejected',()=>{
 for(const patch of [{intent:'replacement'},{roles:'2'},{move:'1.5'},{roles:'-1'},{months:'0'},{arrivalDate:'2026-02-30'},{arrivalDate:'2026-09-01'},{buildMonth:'2027-01'},{planningMonth:'2026-13'},{budget:'NaN'}])assert.throws(()=>validateWorkforcePlanInput({...input,...patch}));
});
test('an early deadline fails conditional coverage without silently shifting hire dates',()=>{
 const r=calculateWorkforceIncrement({...input,deadlineMonth:'2026-10'},null);assert.equal(r.checks[2].status,'not met');assert.equal(r.arrivalDate,'2026-11-16');
});
test('unsafe monetary products and arrivals outside the horizon are rejected',()=>{
 assert.throws(()=>calculateWorkforceIncrement({...input,trainingHours:'100000000',loadedHourlyCost:'100000000'},null),/numeric precision/);
 assert.throws(()=>calculateWorkforceIncrement({...input,arrivalDate:'2027-01-01'},null),/planning horizon/);
});
test('arrival-month proration respects leap-year calendar days',()=>{
 const r=calculateWorkforceIncrement({...input,planningMonth:'2028-02',months:'1',recruitingStart:'2028-02-01',arrivalDate:'2028-02-29',buildMonth:'2028-02',moveMonth:'2028-02',deadlineMonth:'2028-02'},null);
 assert.equal(r.rows[0].hireStaffingCost,344.83);
});
test('annual cohort uplift is invariant to same-month Build/Move partitions before cents rounding',()=>{
 for(const cents of [1,6,12,18,36,12001,120012])for(let roles=1;roles<=12;roles++)for(let build=0;build<=roles;build++){
  const r=calculateWorkforceIncrement({...input,roles:String(roles),build:String(build),move:String(roles-build),buy:'0',buildMonth:'2026-10',moveMonth:'2026-10',internalAnnualCostChange:String(cents/100),trainingCash:'0',trainingHours:'0'},null);
  const expected=Math.round(cents/12)/100;
  assert.ok(r.rows.every(row=>row.internalSalaryUplift===expected),`cents=${cents}, roles=${roles}, build=${build}`);
  assert.equal(r.totalCash,Math.round(expected*3*100)/100);assert.equal(r.maxAddedEmployees,0);
 }
});
test('staggered cohort uplift charges only active shares of an annual total once per month',()=>{
 const r=calculateWorkforceIncrement({...input,roles:'3',build:'1',move:'2',buy:'0',internalAnnualCostChange:'0.18',trainingCash:'0',trainingHours:'0'},null);
 assert.deepEqual(r.rows.map(row=>row.internalSalaryUplift),[0.01,0.02,0.02]);assert.equal(r.totalCash,0.05);
});
test('annual hire/backfill rates and one-time fees stay separate over a twelve-month horizon',()=>{
 const r=calculateWorkforceIncrement({...input,planningMonth:'2026-01',months:'12',recruitingStart:'2026-01-01',arrivalDate:'2026-01-01',buildMonth:'2026-01',moveMonth:'2026-01',backfills:'1',backfillDate:'2026-07-01',annualBackfillCost:'60000',backfillFee:'1000',deadlineMonth:'2026-12',budget:'168000',maxAddedEmployees:'2'},null);
 assert.equal(r.totalCash,168000);assert.equal(r.totalTime,1000);assert.equal(r.totalWithTime,169000);
 assert.equal(r.rows.reduce((n,row)=>n+row.recruitingFees,0),3000);assert.equal(r.rows.at(-1).addedEmployees,2);assert.equal(r.rows.at(-1).conditionalRoleCoverage,3);
});
