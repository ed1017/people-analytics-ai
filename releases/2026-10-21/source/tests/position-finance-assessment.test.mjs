import test from 'node:test';import assert from 'node:assert/strict';
import {DEMO_POSITION_INVENTORY,COMPANY_POSITION_INVENTORY} from '../lib/position-inventory.ts';
import {createPositionAllocation,calculatePositionAllocation} from '../lib/position-allocation.ts';
import {POSITION_FINANCE_MODEL,assessPositionFinance,unknownPositionFinance,noPositionAddition,requirePositionFinanceAssessment,positionReleaseRequirements} from '../lib/position-finance-assessment.ts';
const ids=DEMO_POSITION_INVENTORY.positions.filter(p=>p.status==='vacant'&&p.vacancyStatus!=='frozen').map(p=>p.id);
function input(){const allocation=createPositionAllocation(ids,true);return {version:1,modelVersion:POSITION_FINANCE_MODEL,allocation,finance:unknownPositionFinance(allocation),addition:noPositionAddition()};}
function approved(basis='approved-source'){const x=input();Object.assign(x.finance,{basis,reference:'Reviewed test envelope, September 2026',fundedPositionIds:[...ids],incrementalFundingUsd:150000});return x;}
test('legacy v1 allocation remains byte-identical and unknown approvals are never inferred from modeled budgeted flags',()=>{
 const x=input(),before=JSON.stringify(x.allocation),old=calculatePositionAllocation(x.allocation),r=assessPositionFinance(x);
 assert.equal(r.status,'funding-unknown');assert.equal(r.fundedPositionCount,null);assert.deepEqual(r.allocation,old);assert.equal(JSON.stringify(x.allocation),before);
 const companyIds=COMPANY_POSITION_INVENTORY.positions.filter(p=>p.status==='vacant'&&p.vacancyStatus!=='frozen').slice(0,3).map(p=>p.id);
 x.allocation=createPositionAllocation(companyIds,false,COMPANY_POSITION_INVENTORY);x.allocation.input.hire=3;x.finance=unknownPositionFinance(x.allocation);
 assert.equal(assessPositionFinance(x).status,'funding-unknown');assert.equal(assessPositionFinance(x).evidence.basis,'unknown');
});
test('supplied approved envelope uses exact existing engine cash and IDs while demo envelope stays demo',()=>{
 const x=approved(),r=assessPositionFinance(x);assert.equal(r.status,'within-supplied-approved-envelope');assert.equal(r.requiredCashUsd,127500);assert.equal(r.fundingRemainingUsd,22500);assert.equal(r.fundedPositionCount,12);assert.equal(r.allocatedPositionCount,12);
 assert.equal(assessPositionFinance(approved('illustrative-demo')).status,'within-demo-envelope');
});
test('a budget entered in the allocation is not Finance approval or the Finance funding amount',()=>{
 const x=approved();x.allocation.input.budgetUsd=1;assert.equal(assessPositionFinance(x).status,'within-supplied-approved-envelope');x.finance.incrementalFundingUsd=100000;x.allocation.input.budgetUsd=1000000;
 const r=assessPositionFinance(x);assert.equal(r.status,'approval-required');assert.deepEqual(r.approvalReasons,['funding-exceeded']);assert.equal(r.fundingRemainingUsd,-27500);assert.equal(r.allocation.valid,true);
});
test('out-of-envelope positions require approval even when the cash allowance is sufficient',()=>{
 const x=approved();x.finance.fundedPositionIds=ids.slice(0,9);const r=assessPositionFinance(x);assert.equal(r.status,'approval-required');assert.equal(r.unfundedPositionIds.length,3);assert.ok(r.approvalReasons.includes('positions-outside-funded-envelope'));
});
test('added positions remain vacant proposals, never automatic ready FTE or hidden hires',()=>{
 const x=approved(),before=JSON.stringify(x.allocation);x.addition={count:2,ftePerPosition:0.5,incrementalCashAllowanceUsd:12000,availableFromMonth:3};const r=assessPositionFinance(x);
 assert.equal(r.status,'approval-required');assert.equal(r.requiredCashUsd,139500);assert.equal(r.proposedAddition.positions,2);assert.equal(r.proposedAddition.positionFte,1);assert.equal(r.proposedAddition.filledPositions,0);assert.equal(r.proposedAddition.readyFte,0);assert.equal(r.allocation.targetReadyFte,6);assert.equal(r.allocation.netCapacityDeltaFte,3);assert.equal(JSON.stringify(x.allocation),before);
});
test('unknown addition estimates remain unknown; explicit zero is retained',()=>{
 const x=approved();x.addition={count:1,ftePerPosition:null,incrementalCashAllowanceUsd:null,availableFromMonth:null};let r=assessPositionFinance(x);assert.equal(r.requiredCashUsd,null);assert.equal(r.proposedAddition.positionFte,null);assert.ok(r.unknowns.includes('scenario-cost'));
 x.addition.incrementalCashAllowanceUsd=0;r=assessPositionFinance(x);assert.equal(r.requiredCashUsd,127500);assert.equal(r.proposedAdditionCashAllowanceUsd,0);
});
test('a freeze cannot become approved merely by enabling scenario thaw',()=>{
 const x=approved(),frozen=DEMO_POSITION_INVENTORY.positions.find(p=>p.vacancyStatus==='frozen');x.allocation=createPositionAllocation([frozen.id]);Object.assign(x.allocation.input,{hire:1,thawFrozen:true});x.finance={...unknownPositionFinance(x.allocation),basis:'approved-source',reference:'Test funding envelope',fundedPositionIds:[frozen.id],incrementalFundingUsd:100000};const r=assessPositionFinance(x);assert.equal(r.allocation.valid,true);assert.equal(r.status,'approval-required');assert.deepEqual(r.frozenPositionIds,[frozen.id]);assert.ok(r.approvalReasons.includes('frozen-positions'));
});
test('invalid existing allocation and donor effects are preserved rather than relabeled funded',()=>{
 const x=approved();x.allocation.input.hire=4;assert.equal(assessPositionFinance(x).status,'invalid-scenario');x.allocation.input.hire=3;x.allocation.input.repurposeMode='redeploy';assert.equal(assessPositionFinance(x).status,'invalid-scenario');x.allocation.input.releaseFte=9;const r=assessPositionFinance(x);assert.equal(r.allocation.sourceGapFte,9);assert.equal(r.allocation.netCapacityDeltaFte,3);
});
test('funding scope mismatches reject instead of carrying an old approval across inventories/horizons/currency',()=>{
 for(const [key,value] of [['inventoryKey','wrong'],['asOf','2026-08-31'],['horizonMonths',12],['currency','CAD']]){const x=approved();x.finance[key]=value;assert.throws(()=>assessPositionFinance(x),/must match/);}
});
test('malformed evidence, duplicate or foreign IDs and unsupported numeric inputs reject',()=>{
 const cases=[x=>x.finance.fundedPositionIds=[ids[0],ids[0]],x=>x.finance.fundedPositionIds=['foreign'],x=>x.finance.reference='',x=>x.finance.incrementalFundingUsd=-1,x=>x.addition.count=1.5,x=>x.addition.count=-1,x=>x.addition={count:1,ftePerPosition:NaN,incrementalCashAllowanceUsd:0,availableFromMonth:1},x=>x.addition={count:1,ftePerPosition:1,incrementalCashAllowanceUsd:0,availableFromMonth:1.5},x=>x.finance.extra='ignored',x=>x.version=2];
 for(const mutate of cases){const x=approved();mutate(x);assert.throws(()=>requirePositionFinanceAssessment(x));}
});
test('unknown evidence cannot smuggle approved amounts or IDs and empty additions have no phantom costs',()=>{
 const x=input();x.finance.incrementalFundingUsd=0;assert.throws(()=>assessPositionFinance(x),/Unknown approval/);x.finance.incrementalFundingUsd=null;x.addition.incrementalCashAllowanceUsd=10;assert.throws(()=>assessPositionFinance(x),/phantom/);
});
test('returned evidence is detached from inputs and JSON round trip preserves the additive assessment',()=>{
 const x=approved(),r=assessPositionFinance(x);r.evidence.fundedPositionIds.length=0;assert.equal(x.finance.fundedPositionIds.length,12);assert.deepEqual(assessPositionFinance(JSON.parse(JSON.stringify(x))),assessPositionFinance(x));
});

test('allocated on-hold vacancies require release approval without inventing current company statuses',()=>{
 // Explicit status fixture: the current reviewed inventories contain no on-hold rows.
 const positions=[{id:'paused',vacancyStatus:'on-hold'},{id:'active',vacancyStatus:'recruiting'},{id:'frozen',vacancyStatus:'frozen'}];
 const before=JSON.stringify(positions);
 const r=positionReleaseRequirements(['paused','active'],positions);assert.deepEqual(r.onHoldPositionIds,['paused']);assert.deepEqual(r.approvalReasons,['on-hold-positions']);assert.deepEqual(r.frozenPositionIds,[]);assert.equal(JSON.stringify(positions),before);
 const both=positionReleaseRequirements(['paused','frozen'],positions);assert.deepEqual(both.approvalReasons,['frozen-positions','on-hold-positions']);
});
test('on-hold positions outside routed allocations do not imply a resume proposal',()=>{
 const positions=[{id:'paused',vacancyStatus:'on-hold'},{id:'active',vacancyStatus:'recruiting'}];assert.deepEqual(positionReleaseRequirements(['active'],positions),{frozenPositionIds:[],onHoldPositionIds:[],approvalReasons:[]});
 const r=assessPositionFinance(approved());assert.deepEqual(r.onHoldPositionIds,[]);assert.equal(r.status,'within-supplied-approved-envelope');
});
