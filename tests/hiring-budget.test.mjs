import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyHiringBudget,calculateHiringBudget,readHiringBudgetInput,resolveSalaryReference} from '../lib/hiring-budget.ts';
const input=(patch={})=>({...emptyHiringBudget(),role:'Fixture engineer',level:'Fixture L3',location:'Fixture location',snapshotDate:'2026-09-30',hires:10,budget:1000000,currency:'USD',startMonth:'2027-01',months:12,arrivalDate:'2027-01-01',ftePerHire:1,annualBasePay:120000,payBasis:'per_hire',annualAdditionalCostPerHire:30000,recruitingFeePerHire:10000,otherCostsComplete:true,...patch});
const cohort=(patch={})=>({datasetToken:'fixture:0',releaseId:'fictional-test-only',snapshotDate:'2026-09-30',role:'Fixture engineer',level:'Fixture L3',location:'Fixture location',currencies:['USD'],eligibleCount:12,coveredCount:12,coveredFte:12,fteMin:1,fteMax:1,meanAnnualBase:120000,aggregation:'employee_mean',payBasis:'annual_contracted_base',coverage:'complete',status:'published',provenance:'company-synthetic',...patch});
test('the concrete count/budget question yields a period allowance, never an invented annual salary',()=>{
 const s=calculateHiringBudget({...emptyHiringBudget(),hires:10,budget:1000000});
 assert.equal(s.budgetPerHire,100000);assert.equal(s.annualBasePerHire,null);assert.equal(s.periodCost,null);assert.equal(s.budgetStatus,'unknown');assert.equal(s.salary.status,'unavailable');assert.equal(s.input.currency,null);assert.equal(s.input.months,null);assert.equal(s.rateSource,'unknown');
});
test('code separates full-year costs, later arrivals and unchanged annual recurring cost',()=>{
 const full=calculateHiringBudget(input()),later=calculateHiringBudget(input({arrivalDate:'2027-07-01'}));
 assert.equal(full.periodCost,1600000);assert.equal(full.baseCost,1200000);assert.equal(full.budgetStatus,'over');assert.equal(full.maxAffordableHires,6);
 assert.equal(later.periodCost,850000);assert.equal(later.budgetStatus,'within');assert.equal(later.maxAffordableHires,11);assert.equal(later.annualRunRate,1500000);assert.equal(full.annualRunRate,later.annualRunRate);assert.equal(later.rows[5].hiresPresent,0);assert.equal(later.rows[6].hiresPresent,10);
});
test('mid-month and leap-month proration, once-only fees and rounding reconcile',()=>{
 const s=calculateHiringBudget(input({hires:1,months:1,arrivalDate:'2027-01-16',annualAdditionalCostPerHire:0,recruitingFeePerHire:0}));assert.equal(s.baseCost,5161.29);
 const leap=calculateHiringBudget(input({hires:1,startMonth:'2028-02',months:1,arrivalDate:'2028-02-15',annualAdditionalCostPerHire:0,recruitingFeePerHire:0}));assert.equal(leap.baseCost,5172.41);
 const fractional=calculateHiringBudget(input({hires:1,months:3,annualBasePay:100000.01,annualAdditionalCostPerHire:0,recruitingFeePerHire:0}));assert.equal(Math.round(fractional.rows.reduce((n,r)=>n+r.listedCost,0)*100)/100,fractional.periodCost);
 assert.equal(calculateHiringBudget(input()).rows.reduce((n,r)=>n+r.listedCost,0),1600000);
});
test('missing fees, benefits, completeness, currency and pay basis never become zero or affordability',()=>{
 for(const field of ['annualAdditionalCostPerHire','recruitingFeePerHire','otherCostsComplete','currency','payBasis','ftePerHire']){const s=calculateHiringBudget(input({[field]:null}));assert.equal(s.periodCost,null,field);assert.notEqual(s.budgetStatus,'within',field);assert.equal(s.maxAffordableHires,null,field);}
 const zero=calculateHiringBudget(input({annualAdditionalCostPerHire:0,recruitingFeePerHire:0}));assert.equal(zero.periodCost,1200000);
 assert.equal(calculateHiringBudget(input({annualBasePay:null})).baseCost,null);
 assert.equal(calculateHiringBudget(input({budget:null})).budgetStatus,'unknown');
 assert.equal(calculateHiringBudget(input({annualAdditionalCostPerHire:null})).budgetStatus,'over');
});
test('a start outside the budget horizon does not satisfy the requested hires',()=>{
 const s=calculateHiringBudget(input({arrivalDate:'2028-02-01'}));assert.equal(s.periodCost,0);assert.equal(s.hiresInHorizon,0);assert.equal(s.maxAffordableHires,null);assert.equal(s.annualRunRate,1500000);
 assert.equal(calculateHiringBudget(input({hires:null})).rows[0].hiresPresent,null);
 for(const patch of [{arrivalDate:'2026-12-31'},{months:0},{months:25},{startMonth:'2027-13'},{arrivalDate:'2027-02-30'},{hires:1.5},{ftePerHire:0},{ftePerHire:1.1},{annualBasePay:Infinity},{annualBasePay:-1},{budget:''}])assert.throws(()=>readHiringBudgetInput(input(patch)));
});
test('a complete exact synthetic cohort carries count, currency, snapshot, coverage and FTE basis',()=>{
 const s=calculateHiringBudget(input({annualBasePay:null,payBasis:null}),'fixture:0',cohort({incidental_person_record:'must not escape'}));
 assert.equal(s.rateSource,'company-synthetic-aggregate');assert.equal(s.annualBasePerHire,120000);assert.equal(s.salary.cohort.coveredCount,12);assert.equal(s.salary.cohort.coverage,'complete');assert.equal(s.salary.cohort.snapshotDate,'2026-09-30');assert.equal(s.salary.cohort.coveredFte,12);assert.deepEqual(s.salary.cohort.currencies,['USD']);assert.ok(!JSON.stringify(s).includes('must not escape'));
 const override=calculateHiringBudget(input({annualBasePay:90000}),'fixture:0',cohort());assert.equal(override.annualBasePerHire,90000);assert.equal(override.rateSource,'scenario-override');
});
test('missing, suppressed, partial, wrong identity, wrong cohort and mixed currencies fail closed',()=>{
 for(const raw of [undefined,null,cohort({status:'withheld'}),cohort({coveredCount:4}),cohort({coveredCount:11,coverage:'partial'}),cohort({provenance:'comp-demo'}),cohort({datasetToken:'other:0'}),cohort({location:'Other location'}),cohort({snapshotDate:'2026-08-31'}),cohort({currencies:['USD','EUR']}),cohort({currencies:['EUR']}),cohort({meanAnnualBase:null}),cohort({meanAnnualBase:0})]){
  const s=calculateHiringBudget(input({annualBasePay:null}),'fixture:0',raw);assert.equal(s.salary.status,'unavailable');assert.equal(s.annualBasePerHire,null);assert.equal(s.periodCost,null);
 }
});
test('contracted pay does not mix FTE fractions; normalized pay explicitly scales to target FTE',()=>{
 const mixed=cohort({fteMin:.5,fteMax:1,coveredFte:9});
 assert.equal(resolveSalaryReference(input(),'fixture:0',mixed).status,'unavailable');
 assert.equal(resolveSalaryReference(input({ftePerHire:.5}),'fixture:0',cohort()).status,'unavailable');
 const normalized=resolveSalaryReference(input({ftePerHire:.5}),'fixture:0',{...mixed,payBasis:'annual_base_per_fte',aggregation:'fte_weighted_mean'});assert.equal(normalized.status,'available');assert.equal(normalized.annualBasePerHire,60000);
 assert.equal(calculateHiringBudget(input({annualBasePay:120000,payBasis:'per_fte',ftePerHire:.5})).annualBasePerHire,60000);
 assert.equal(calculateHiringBudget(input({annualBasePay:120000,payBasis:'per_hire',ftePerHire:.5})).annualBasePerHire,120000);
 assert.equal(resolveSalaryReference(input(),'fixture:0',cohort({coveredFte:100})).status,'unavailable');
});
