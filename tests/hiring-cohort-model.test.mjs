import test from 'node:test';
import assert from 'node:assert/strict';
import {hiringCohortFixture} from './fixtures/hiring-cohort-generator.mjs';
import {hiringTrainingCohorts,fitHiringCohorts,predictHiringCohorts,scoreHiringCohorts} from '../lib/ml/hiring-cohort-model.mjs';
import {hiringBenchmarkFold,benchmarkHiringCohorts} from './manual/benchmark-hiring-cohorts.mjs';
const setup=()=>hiringCohortFixture('gradual-improvement',17,'2024-01-01T00:00:00.000Z');
test('reproducible aggregate generator keeps all outcomes; 90-day maturity and 92-day availability apply',()=>{
 const a=setup();assert.deepEqual(a,setup());const rows=hiringTrainingCohorts(a.input,a.coverage);
 assert.equal(rows.length,34);assert.equal(rows.at(-1).month,'2023-10');
 assert.equal(rows[0].openings,60);assert.ok(rows[0].started<60);
 a.input.cutoff=a.coverage.statusCoverageThrough=a.coverage.observedAt=a.input.manifest.completion.through=a.input.manifest.completion.observedAt='2023-12-31T00:00:00.000Z';
 assert.equal(hiringTrainingCohorts(a.input,a.coverage).at(-1).month,'2023-09');
});
test('future labels cannot alter historical fit or predictions',()=>{
 const {input,coverage}=setup(),before=fitHiringCohorts(hiringTrainingCohorts(input,coverage));
 for(const r of input.records)if(r.observedAt>input.cutoff)r.value.count=9999;
 const after=fitHiringCohorts(hiringTrainingCohorts(input,coverage));assert.deepEqual(after,before);
 assert.deepEqual(predictHiringCohorts(after,['2024-01']),predictHiringCohorts(before,['2024-01']));
});
test('missing followup, late completion and company data cannot become synthetic training',()=>{
 for(const edit of [x=>x.coverage.cohortCoverage='completed-fills-only',x=>x.input.manifest.completion=null,
  x=>x.coverage.statusCoverageThrough='2023-01-01T00:00:00.000Z',x=>x.input.manifest.dataClass='company-extract']){
  const x=setup();edit(x);assert.throws(()=>hiringTrainingCohorts(x.input,x.coverage));}
});
test('staggered openings and partly observed monthly buckets cannot bias a cohort denominator',()=>{
 const a=setup();a.input.records[0].observedAt='2024-01-02T00:00:00.000Z';
 assert.throws(()=>hiringTrainingCohorts(a.input,a.coverage),/Partially observed/);
 const b=setup(),row=b.input.records[0];
 row.effectiveAt=row.value.openedAt=row.value.features[0].availableAt='2021-01-02T00:00:00.000Z';
 assert.throws(()=>hiringTrainingCohorts(b.input,b.coverage),/synchronized/);
});
test('constant cohorts recover their fraction and zero trend; no smoothing-induced infinities',()=>{
 const rows=Array.from({length:30},(_,i)=>({month:new Date(Date.UTC(2020,i,1)).toISOString().slice(0,7),openings:100,started:40}));
 const model=fitHiringCohorts(rows),p=predictHiringCohorts(model,['2023-01'])[0];
 assert.ok(Math.abs(p['logistic-trend']-.4)<1e-7);assert.ok(Math.abs(model.slopePerYear)<1e-7);
 for(const started of [0,100]){const m=fitHiringCohorts(rows.map(r=>({...r,started}))),v=predictHiringCohorts(m,['2023-01'])[0]['logistic-trend'];assert.ok(v>0&&v<1);}
});
test('metrics agree with exact expanded Bernoulli arithmetic without expanding inputs',()=>{
 const r=scoreHiringCohorts([{month:'2025-01',openings:4,started:1}],
  [{month:'2025-01','pooled-fraction':.5,'recent-3-fraction':.5,'logistic-trend':.5}])['logistic-trend'];
 assert.equal(r.brier,.25);assert.equal(r.logLoss,Math.log(2));assert.equal(r.weightedMaePercentagePoints,25);assert.equal(r.biasPercentagePoints,25);
});
test('fit rejects small, duplicate, unordered and invalid cohorts; scoring must align',()=>{
 const x=setup(),rows=hiringTrainingCohorts(x.input,x.coverage);
 assert.throws(()=>fitHiringCohorts(rows.slice(0,23)));assert.throws(()=>fitHiringCohorts([...rows].reverse()));
 assert.throws(()=>fitHiringCohorts([rows[0],...rows]));assert.throws(()=>fitHiringCohorts(rows.map(r=>({...r,started:r.openings+1}))));
 const m=fitHiringCohorts(rows);assert.throws(()=>predictHiringCohorts(m,[rows[0].month]));
 assert.throws(()=>scoreHiringCohorts([rows[0]],predictHiringCohorts(m,['2025-01'])));
});
test('assessment reversal leaves development and assessment predictions unchanged, changes only assessed outcomes',()=>{
 const a=hiringBenchmarkFold('gradual-improvement',17,'2025-01-01'),b=hiringBenchmarkFold('assessment-reversal',17,'2025-01-01');
 assert.deepEqual(a.model,b.model);assert.deepEqual(a.predictions,b.predictions);assert.notDeepEqual(a.actual,b.actual);
 assert.ok(a.model.trainingEnd<'2025-01');assert.equal(a.actual.length,3);
});
test('full benchmark reports every fixed seed/scenario without promoting model or adding intervals',async()=>{
 const r=await benchmarkHiringCohorts();assert.equal(r.cases.length,9);assert.equal(r.operationallyQualified,false);
 assert.equal(r.causalEffect,null);assert.equal(r.uncertainty.interval,null);
 for(const c of r.cases){assert.equal(c.development.length,3);assert.equal(c.developmentMetrics['logistic-trend'].cohorts,9);
  assert.equal(c.assessment.metrics['logistic-trend'].cohorts,3);assert.equal(c.assessment.model.converged,true);}
});
