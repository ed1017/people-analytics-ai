import test from 'node:test';
import assert from 'node:assert/strict';
import {workforceScenarioOutcomes,workforceCostBreakdown,calculationStepFields,workforceSearchCountCopy} from '../lib/workforce-scenario-outcomes.ts';
import {calculateWorkforceIncrement} from '../lib/workforce-increment.ts';
import {workforceReviewFixture} from './fixtures/workforce-review.mjs';
const fixture=workforceReviewFixture();
test('scenario outcome presentation uses exact saved amounts, conditional deadline rows and no forecast',()=>{
 const plan=fixture.proposed,outcome=workforceScenarioOutcomes(plan),row=plan.rows.find(row=>row.month===plan.input.deadlineMonth);
 assert.equal(outcome.cash,plan.totalCash);assert.equal(outcome.employeeTime,plan.totalTime);assert.equal(outcome.covered,row.conditionalRoleCoverage);assert.equal(outcome.remaining,row.remainingRoles);assert.equal(outcome.fullCoverageMonth,'2026-11');assert.equal(outcome.kind,'scenario-estimate');assert.equal(outcome.forecast.status,'unavailable');assert.equal(outcome.method,'workforce-increment-v1');
 for(const key of ['probability','confidence','interval','roi','trainingImpact'])assert.ok(!Object.hasOwn(outcome,key));
});
test('unknown and missed deadlines stay distinct with explicit zero preserved',()=>{
 const unknown=workforceScenarioOutcomes(calculateWorkforceIncrement({...fixture.input,arrivalDate:'',annualHireCost:'',deadlineMonth:''},fixture.timing));assert.equal(unknown.cash,null);assert.equal(unknown.deadline,null);assert.equal(unknown.covered,null);assert.equal(unknown.remaining,null);assert.equal(unknown.coverageTiming,'unknown');
 const early=workforceScenarioOutcomes(calculateWorkforceIncrement({...fixture.input,deadlineMonth:'2026-10'},fixture.timing));assert.equal(early.covered,1);assert.equal(early.remaining,2);
 const zero=workforceScenarioOutcomes(calculateWorkforceIncrement({...fixture.input,annualHireCost:'0',hireFee:'0',internalAnnualCostChange:'0',trainingCash:'0',trainingHours:'0'},fixture.timing));assert.equal(zero.cash,0);assert.equal(zero.employeeTime,0);
});
test('cost breakdown reconciles calculator rows without adding employee time or structural budget',()=>{
 const costs=workforceCostBreakdown(fixture.proposed);assert.equal(costs.reduce((sum,item)=>sum+item.value,0),fixture.proposed.totalCash);assert.ok(!costs.some(item=>item.key==='employeeTimeValue'));
 const unknown=calculateWorkforceIncrement({...fixture.input,annualHireCost:''},fixture.timing);assert.equal(workforceCostBreakdown(unknown).find(item=>item.key==='hireStaffingCost').value,null);
 const inactive=calculateWorkforceIncrement({...fixture.input,build:'0',move:'2',trainingCash:'99999',trainingHours:'999'},fixture.timing);assert.equal(workforceCostBreakdown(inactive).find(item=>item.key==='trainingCash').value,0);assert.equal(inactive.totalTime,0);
});
test('breakdown editing links cover supported assumptions and exclude fixed scope',()=>{
 const fields=Object.values(calculationStepFields).flat();assert.equal(new Set(fields).size,fields.length);assert.equal(fields.length,21);for(const key of ['roles','jobProfile','businessUnit','months','planningMonth','intent'])assert.ok(!fields.includes(key));for(const key of ['build','move','buy','budget','deadlineMonth','trainingCash','arrivalDate'])assert.ok(fields.includes(key));
});

test('scenario footer uses 100 calculated scenarios threshold, never options or reference/invalid attempts',()=>{
 const summary={enumerated:100,calculatorInvocations:101,enumerationComplete:true,counts:{invalid:1},emitted:64,omittedByCap:36,excludedByFilter:0,truncated:true};
 assert.equal(workforceSearchCountCopy(null).headline,null);
 const small=workforceSearchCountCopy({...summary,enumerated:12,calculatorInvocations:13,counts:{invalid:0},emitted:12,omittedByCap:0,truncated:false});
 assert.equal(small.headline,null);assert.match(small.detail,/12 combinations enumerated; 12 candidate calculation attempts: 12 calculated, 0 invalid/);assert.match(small.detail,/13 total calculator calls including the separate reference/);
 assert.equal(workforceSearchCountCopy(summary).headline,'Saved search output capped');
 const complete=workforceSearchCountCopy({...summary,counts:{invalid:0}});assert.equal(complete.headline,'Compared 100 scenarios • Output capped');assert.match(complete.detail,/36 omitted by the output cap/);
 const partial=workforceSearchCountCopy({...summary,counts:{invalid:0},enumerationComplete:false,excludedByFilter:7});assert.match(partial.headline,/Partial search/);assert.match(partial.detail,/7 excluded by the filter/);assert.match(partial.detail,/Search incomplete/);
});
