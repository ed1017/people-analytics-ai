import test from 'node:test';import a from 'node:assert/strict';
import {emptyHiringBudget} from '../releases/2026-10-21/source/lib/hiring-budget.ts';import {hiringAnswerContract} from '../releases/2026-10-21/source/lib/home-hiring-plan.ts';import {SolutionResponseError} from '../releases/2026-10-21/source/lib/home-solution-response-failure.ts';import {createSolutionDiagnostics} from '../releases/2026-10-21/source/lib/home-solution-diagnostics.ts';
const review=values=>({version:1,revision:1,datasetToken:'synthetic',scopeKey:'synthetic',inputs:{...emptyHiringBudget(),...values},origins:Object.fromEntries(Object.keys(values).map(k=>[k,{kind:'user-entry',turnId:null,quote:null,explanation:'Explicit synthetic test input.'}])),basisTurns:[]});
test('hiring tool answer contract reflects count/budget eligibility, including zero and withdrawal',()=>{
 for(const values of [{hires:6},{hires:6,budget:null},{hires:null,budget:240000}])a.deepEqual(hiringAnswerContract(review(values)).allowedAnswerKinds,['discussionOnly']);
 for(const budget of [0,240000])a.deepEqual(hiringAnswerContract(review({hires:6,budget})).allowedAnswerKinds,['conditionalHiringPlan']);
});
test('reference diagnostic is allowlisted and never logs messages or arbitrary details',()=>{
 for(const detail of ['conditional_hiring_ineligible','RAW_PRIVATE_TEXT']){const logs=[],old=console.error;console.error=(...args)=>logs.push(args);try{const d=createSolutionDiagnostics();d.stage('response_validation');d.failure(new SolutionResponseError('calculation_reference','SECRET_BODY',detail),null,false,false);const v=JSON.parse(logs[0][1]);a.equal(v.referenceDetail,detail==='RAW_PRIVATE_TEXT'?null:detail);a.doesNotMatch(JSON.stringify(logs),/SECRET_BODY|RAW_PRIVATE_TEXT/);}finally{console.error=old;}}
});

test('costed presentation requires the existing USD cost and FTE contract, not an invented cap',()=>{
 const values={hires:6,currency:'USD',startMonth:'2027-01',months:12,arrivalDate:'2027-01-01',ftePerHire:1,annualBasePay:40000,payBasis:'per_hire',annualAdditionalCostPerHire:0,recruitingFeePerHire:0,otherCostsComplete:true};
 a.deepEqual(hiringAnswerContract(review(values)).allowedAnswerKinds,['recommendedPlan','unsupportedPlan']);
 a.deepEqual(hiringAnswerContract(review({...values,ftePerHire:null})).allowedAnswerKinds,['discussionOnly']);
 a.deepEqual(hiringAnswerContract(review({...values,ftePerHire:null,budget:240000})).allowedAnswerKinds,['conditionalHiringPlan']);
});
