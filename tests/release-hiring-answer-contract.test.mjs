import test from 'node:test';import a from 'node:assert/strict';
import {emptyHiringBudget} from '../releases/2026-10-21/source/lib/hiring-budget.ts';import {hiringAnswerContract} from '../releases/2026-10-21/source/lib/home-hiring-plan.ts';import {SolutionResponseError} from '../releases/2026-10-21/source/lib/home-solution-response-failure.ts';import {createSolutionDiagnostics} from '../releases/2026-10-21/source/lib/home-solution-diagnostics.ts';
const review=values=>({version:1,revision:1,datasetToken:'synthetic',scopeKey:'synthetic',inputs:{...emptyHiringBudget(),...values},origins:Object.fromEntries(Object.keys(values).map(k=>[k,{kind:'user-entry',turnId:null,quote:null,explanation:'Explicit synthetic test input.'}])),basisTurns:[]});
test('hiring tool answer contract reflects count/budget eligibility, including zero and withdrawal',()=>{
 for(const values of [{hires:0},{hires:null,budget:240000}])a.deepEqual(hiringAnswerContract(review(values)).allowedAnswerKinds,['discussionOnly']);
 for(const budget of [null,0,240000])a.deepEqual(hiringAnswerContract(review({hires:6,budget})).allowedAnswerKinds,['conditionalHiringPlan']);
});
test('reference diagnostic is allowlisted and never logs messages or arbitrary details',()=>{
 for(const detail of ['conditional_hiring_ineligible','RAW_PRIVATE_TEXT']){const logs=[],old=console.error;console.error=(...args)=>logs.push(args);try{const d=createSolutionDiagnostics();d.stage('response_validation');d.failure(new SolutionResponseError('calculation_reference','SECRET_BODY',detail),null,false,false);const v=JSON.parse(logs[0][1]);a.equal(v.referenceDetail,detail==='RAW_PRIVATE_TEXT'?null:detail);a.doesNotMatch(JSON.stringify(logs),/SECRET_BODY|RAW_PRIVATE_TEXT/);}finally{console.error=old;}}
});

test('costed presentation requires the existing USD cost and FTE contract, not an invented cap',()=>{
 const values={hires:6,currency:'USD',startMonth:'2027-01',months:12,arrivalDate:'2027-01-01',ftePerHire:1,annualBasePay:40000,payBasis:'per_hire',annualAdditionalCostPerHire:0,recruitingFeePerHire:0,otherCostsComplete:true};
 a.deepEqual(hiringAnswerContract(review(values)).allowedAnswerKinds,['recommendedPlan','unsupportedPlan']);
 a.deepEqual(hiringAnswerContract(review({...values,ftePerHire:null})).allowedAnswerKinds,['conditionalHiringPlan']);
 a.deepEqual(hiringAnswerContract(review({...values,ftePerHire:null,budget:240000})).allowedAnswerKinds,['conditionalHiringPlan']);
});

import {editHiringBudget} from '../releases/2026-10-21/source/lib/home-hiring-budget.ts';
import {prepareConditionalHiringPlan,hiringPlanFields} from '../releases/2026-10-21/source/lib/home-hiring-plan-save.ts';
test('estimate adoption cannot create a budget or base-pay input without user authority',()=>{
 const request={scope:'all',filters:{country:'all',org:'all',level:'all'},state:{turns:[]},message:{id:'u1',text:'Use annual base pay USD 60000; budget remains unknown.'}};
 const proposed={kind:'model-proposed',turnId:null,quote:null,explanation:'Policy midpoint estimate.'};
 for(const field of ['budget','annualBasePay'])a.throws(()=>editHiringBudget(request,'synthetic',[{field,value:60000,basis:proposed}]),/explicit user input/);
 const confirmed=editHiringBudget(request,'synthetic',[{field:'annualBasePay',value:60000,basis:{kind:'user-supplied',turnId:'u1',quote:request.message.text,explanation:'Explicitly selected base-pay assumption.'}}]);
 a.equal(confirmed.inputs.annualBasePay,60000);a.equal(confirmed.inputs.budget,null);
});
test('exploratory no-budget plan saves its null ceiling without converting it to zero',async()=>{
 const selection=await prepareConditionalHiringPlan(review({hires:6}),{id:'g1',statement:'Explore six additional roles'});
 a.equal(selection.receipt.review.inputs.budget,null);a.equal(selection.facts.affordability,null);
 const fields=hiringPlanFields(selection,null,'synthetic-save','2026-10-22T18:00:00.000Z');a.ok(Object.keys(fields).length);
 a.equal(JSON.parse(JSON.stringify(selection)).receipt.review.inputs.budget,null);
});

import {confirmsBudgetAmount} from '../releases/2026-10-21/source/lib/hiring-budget-authority.ts';
test('pay confirmation never supplies budget authority; explicit zero and later ceilings work',()=>{
 for(const text of ['Use annual base pay USD 60000; budget remains unknown.','Yes, use the midpoint.','The estimate is USD 60000','No budget of USD 60000 is approved','Do not set the budget to 60000.','What if the budget is 60000?','Assume a budget of 60000 for illustration only.'])a.equal(confirmsBudgetAmount(text,60000),false);
 for(const [text,value]of [['Set budget to USD 60,000',60000],['Our budget is 0',0],['Use a 50k total budget',50000]])a.equal(confirmsBudgetAmount(text,value),true);
 const request={scope:'all',filters:{country:'all',org:'all',level:'all'},state:{turns:[]},message:{id:'u1',text:'Use annual base pay USD 60000; budget remains unknown.'}};
 a.throws(()=>editHiringBudget(request,'synthetic',[{field:'budget',value:60000,basis:{kind:'user-supplied',turnId:'u1',quote:request.message.text,explanation:'Incorrect funding attribution.'}}]),/budget ceiling/);
});

test('cropping an exact quote cannot remove budget negation',()=>{const request={scope:'all',filters:{country:'all',org:'all',level:'all'},state:{turns:[]},message:{id:'u1',text:'Do not set the budget to 50000.'}};a.throws(()=>editHiringBudget(request,'synthetic',[{field:'budget',value:50000,basis:{kind:'user-supplied',turnId:'u1',quote:'budget to 50000',explanation:'Cropped quote must not authorize budget.'}}]),/budget ceiling/);});

import {confirmsBasePayAmount} from '../releases/2026-10-21/source/lib/hiring-budget-authority.ts';
test('base-pay selection requires an explicit rate, not ambiguous midpoint confirmation',()=>{a.equal(confirmsBasePayAmount('Yes, use the midpoint',60000),false);a.equal(confirmsBasePayAmount('Use annual base pay USD 60000; budget remains unknown.',60000),true);a.equal(confirmsBasePayAmount('Use annual base pay USD 60000; budget remains unknown.',70000),false);});

test('budget command rejects per-person units, alternatives and pending authority',()=>{for(const text of ['Budget is 50000 per hire.','Budget is 50000 or 60000.','Budget is 50000 pending approval.'])a.equal(confirmsBudgetAmount(text,50000),false);});
