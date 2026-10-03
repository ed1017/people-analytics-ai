import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeRecruitingTiming} from '../lib/recruiting-timing.ts';
const row=(id,fill=30,start='2026-03-15')=>({requisition_id:id,requisition_status:'filled',external_internal:'external',opened_date:'2026-01-01',closed_date:'2026-03-01',time_to_fill_days:fill,start_date:start});
const run=rows=>summarizeRecruitingTiming(rows,'ENGINEER','2026-09-30','2025-10-01');
test('reports accepted-offer and paired start intervals with honest historical scope',()=>{
 const r=run([10,20,30,40,50].map((n,i)=>row(i,n)));
 assert.equal(r.opening_to_accepted_offer.median_days,30);assert.equal(r.opening_to_accepted_offer.p25_days,20);assert.equal(r.opening_to_accepted_offer.p75_days,40);
 assert.equal(r.opening_to_start.median_days,73);assert.equal(r.accepted_offer_to_start.median_days,43);
 assert.equal(r.scope.business_unit,null);assert.equal(r.scope.country,null);assert.equal(r.period_basis,'requisition closed_date');
 assert.ok(r.limitations.some(s=>s.includes('not a forecast confidence')));
});
test('cohort excludes internal, open, future and out-of-period closes',()=>{
 const rows=Array.from({length:5},(_,i)=>row(i));rows.push({...row(6),external_internal:'internal'},{...row(7),requisition_status:'open'},{...row(8),closed_date:'2026-10-01'},{...row(9),closed_date:'2025-09-30'});
 assert.equal(run(rows).eligible_rows,5);
});
test('missing or malformed durations never become zero-day hiring evidence',()=>{
 const rows=[null,'',-1,'NaN',Infinity].map((n,i)=>row(i,n));const r=run(rows);
 assert.equal(r.opening_to_accepted_offer.valid_sample_count,0);assert.equal(r.opening_to_start.median_days,null);assert.equal(r.missing_or_invalid_acceptance,5);
});
test('future or inconsistent starts do not contaminate completed arrival statistics',()=>{
 const r=run([row(1,30,'2026-10-01'),row(2,30,'2026-01-15'),row(3,30,null),row(4,500)]);
 assert.equal(r.future_starts_excluded,1);assert.equal(r.missing_or_invalid_start,2);assert.equal(r.missing_or_invalid_acceptance,1);
 assert.equal(r.opening_to_start.valid_sample_count,0);assert.equal(r.opening_to_accepted_offer.valid_sample_count,3);
});
test('duplicate requisition joins are excluded rather than overweighted',()=>{
 const r=run([row(1),row(1),row(2),row(3),row(4),row(5)]);
 assert.equal(r.distinct_requisitions,5);assert.equal(r.duplicate_requisitions_excluded,1);assert.equal(r.opening_to_start.valid_sample_count,4);assert.equal(r.opening_to_start.median_days,null);
});
test('small cohorts retain counts but have no fabricated benchmark or range',()=>{
 const r=run([row(1),row(2)]);assert.equal(r.opening_to_start.status,'insufficient comparable history');assert.equal(r.opening_to_start.p25_days,null);assert.equal(r.opening_to_start.p75_days,null);
});
test('invalid calendar dates are rejected or excluded without inventing a date',()=>{
 assert.throws(()=>summarizeRecruitingTiming([],'ENGINEER','2026-02-30','2025-10-01'));
 const r=run([{...row(1),opened_date:'2026-02-30'}]);assert.equal(r.missing_or_invalid_acceptance,1);
});
