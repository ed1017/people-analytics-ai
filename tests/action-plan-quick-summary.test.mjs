import test from 'node:test';
import assert from 'node:assert/strict';
import {actionPlanQuickSummary} from '../lib/action-plan-quick-summary.ts';
import {summaryFixture,entered} from './fixtures/plan-quick-summary.mjs';
test('complete checked cash preserves its ledger breakdown and never turns participants into FTE',()=>{
 const {draft,result}=summaryFixture(),before=JSON.stringify({draft,result}),value=actionPlanQuickSummary(draft,result);
 assert.equal(value.cash,3000);assert.equal(value.chart,true);assert.deepEqual(value.costs.map(row=>row.value),[1000,2000]);assert.equal(value.fte,null);assert.equal(value.people,10);assert.equal(value.deliveryHours,result.deliveryEstimate.hours);assert.equal(JSON.stringify({draft,result}),before);
});
test('partial cash remains a listed subtotal, not total cost or a full breakdown chart',()=>{
 const {draft,result}=summaryFixture('partial'),value=actionPlanQuickSummary(draft,result);assert.equal(value.cash,null);assert.equal(value.subtotal,3000);assert.equal(value.coverage,'partial');assert.equal(value.chart,false);
});
test('unknown cost and dates remain unknown without losing the known cost item',()=>{
 const {draft,result}=summaryFixture('unknown'),value=actionPlanQuickSummary(draft,result);assert.equal(value.cash,null);assert.equal(value.costs[0].value,null);assert.equal(value.costs[1].value,2000);assert.equal(value.start,null);assert.equal(value.days,null);assert.equal(value.chart,false);
});
test('reviewed zero is distinct from unknown and does not create a divided-by-zero chart',()=>{
 const {draft,result}=summaryFixture('zero'),value=actionPlanQuickSummary(draft,result);assert.equal(value.cash,0);assert.equal(value.chart,false);
});
test('stale, mismatched currency and mismatched horizon results cannot populate totals',()=>{
 for(const mode of ['stale','currency','horizon']){const {draft,result}=summaryFixture();if(mode==='stale')draft.revision++;if(mode==='currency')result.scope.currency='EUR';if(mode==='horizon')result.scope.months=entered(18);const value=actionPlanQuickSummary(draft,result);assert.equal(value.cash,null);assert.equal(value.people,null);assert.equal(value.chart,false);assert.deepEqual(value.costs,[]);}
});
test('partial or inconsistent ledger cannot masquerade as shares of a complete total',()=>{
 const {draft,result}=summaryFixture();result.ledger[0].total=null;assert.equal(actionPlanQuickSummary(draft,result).chart,false);result.ledger[0].total=5000;assert.equal(actionPlanQuickSummary(draft,result).chart,false);
});
test('duration uses explicit checked endpoints and an absent result stays unknown',()=>{
 const {draft,result}=summaryFixture(),value=actionPlanQuickSummary(draft,result);assert.equal(value.days,(Date.parse(value.finish)-Date.parse(value.start))/86400000+1);assert.equal(actionPlanQuickSummary(null,null).cash,null);assert.equal(actionPlanQuickSummary(draft,null).days,null);
});

test('scenario chart uses only a complete checked series over the same monthly horizon',()=>{
 const {draft,result}=summaryFixture();result.conditionalCoverage=[0,1,2,3,4,5];const value=actionPlanQuickSummary(draft,result);assert.deepEqual(value.capacitySeries.map(point=>point.people),[0,1,2,3,4,5]);assert.equal(value.capacitySeries[0].month,result.scope.startMonth.value);
 result.conditionalCoverage[2]=null;assert.deepEqual(actionPlanQuickSummary(draft,result).capacitySeries,[]);result.conditionalCoverage=[1,2];assert.deepEqual(actionPlanQuickSummary(draft,result).capacitySeries,[]);
});
