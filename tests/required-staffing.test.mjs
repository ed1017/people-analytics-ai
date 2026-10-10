import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateRequiredStaffing,emptyRequiredStaffing,readRequiredStaffingInput} from '../lib/required-staffing.ts';
import {fixedValues} from './fixtures/required-staffing.mjs';
const input=(patch={})=>({...emptyRequiredStaffing(),...fixedValues,...patch});
test('fixed ten-role requirement produces the three reviewed cash and training comparisons without workload inputs',()=>{
 const s=calculateRequiredStaffing(input());assert.equal(s.enumerated,35);assert.equal(s.options.length,3);
 assert.deepEqual(s.options.map(o=>[o.train,o.redeploy,o.hire,o.listedCash,o.plannedTrainingHours]),[[0,0,10,1600000,0],[6,4,0,30000,480],[3,4,3,495000,240]]);
 assert.ok(s.options.every(o=>o.coveredRoles===10&&o.completeCash===null&&o.readyAfterMonths===null&&o.coverage==='conditional'));
 assert.equal(s.options[0].budgetStatus,'over');assert.equal(s.options[1].budgetStatus,'unknown');assert.equal(s.recommendation.optionId,s.options[1].id);assert.equal(s.operationalFeasibilityVerified,false);
 assert.ok(s.options[1].unknowns.some(x=>x.includes('Backfill')));assert.equal(s.source,'explicit-scenario-inputs');
});
test('period hiring cost is never annualized or prorated from an unknown arrival',()=>{
 const s=calculateRequiredStaffing(input({months:6,hireCostPerPerson:80000}));assert.equal(s.options[0].listedCash,800000);assert.equal(s.options[0].readyAfterMonths,null);
 const late=calculateRequiredStaffing(input({hireReadyAfterMonths:13}));assert.equal(late.options[0].listedCash,1600000);assert.equal(late.options[0].coverage,'not-met');
});
test('per-trainee rates scale per option and quoted backfill costs scale only across internal people',()=>{
 const s=calculateRequiredStaffing(input({trainingCostPerPerson:7000,backfillCostPerInternalPerson:2000}));
 assert.equal(s.options.find(o=>o.train===6).listedCash,62000);assert.equal(s.options.find(o=>o.train===3).listedCash,515000);
 assert.equal(s.options[0].listedCash,1600000);
});
test('hire-only zero planned hours never means zero training requirements',()=>{
 const s=calculateRequiredStaffing(input());assert.equal(s.options[0].plannedTrainingHours,0);assert.equal(s.options[0].totalTrainingHours,null);assert.equal(s.options[0].newHireTrainingUnspecified,true);
 assert.equal(s.options[2].plannedTrainingHours,240);assert.equal(s.options[2].totalTrainingHours,null);
 const explicit=calculateRequiredStaffing(input({hireTrainingHoursPerPerson:20}));assert.equal(explicit.options[0].totalTrainingHours,200);assert.equal(explicit.options[2].totalTrainingHours,300);
});
test('unknown pools, overlap, release and incomplete costs cannot become verified availability or affordability',()=>{
 const unknown=calculateRequiredStaffing(input({trainablePeople:null,redeployablePeople:null}));assert.equal(unknown.enumerated,1);assert.match(unknown.missing.join(' '),/availability remains unknown/);
 const overlap=calculateRequiredStaffing(input({poolsDistinct:false}));assert.ok(overlap.options.every(o=>!(o.train&&o.redeploy)));
 const unavailable=calculateRequiredStaffing(input({internalRelease:false}));assert.equal(unavailable.recommendation,null);assert.equal(unavailable.options.find(o=>o.train===6).coverage,'not-met');
 const noPay=calculateRequiredStaffing(input({hireCostPerPerson:null}));assert.equal(noPay.options[0].listedCash,null);assert.equal(noPay.options[0].budgetStatus,'unknown');
 const complete=calculateRequiredStaffing(input({backfillCostPerInternalPerson:0,costsComplete:true}));assert.equal(complete.options[1].completeCash,30000);assert.equal(complete.options[1].budgetStatus,'within');assert.equal(complete.options[1].coverage,'conditional');
});
test('bounded valid combinations fill exactly the required count and unknown money units stay unknown',()=>{
 const large=calculateRequiredStaffing(input({requiredRoles:20,trainablePeople:20,redeployablePeople:20}));assert.equal(large.enumerated,231);assert.ok(large.options.every(o=>o.coveredRoles===20));
 for(const patch of [{requiredRoles:21},{trainablePeople:21},{requiredRoles:1.5},{trainingCostPerPerson:-1},{months:0},{months:25},{currency:'XXX'},{hireReadyAfterMonths:1.5}])assert.throws(()=>readRequiredStaffingInput(input(patch)));
 for(const patch of [{currency:null},{months:null}])assert.ok(calculateRequiredStaffing(input(patch)).options.every(o=>o.listedCash===null&&o.completeCash===null&&o.budgetStatus==='unknown'));
 assert.equal(calculateRequiredStaffing(input({requiredRoles:0})).enumerated,0);
});
