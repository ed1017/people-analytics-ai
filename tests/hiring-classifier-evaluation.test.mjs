import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {classifyHiringCohorts,summarizeClassifications} from '../lib/ml/hiring-classifier-evaluation.mjs';
import {hiringCohortFixture} from './fixtures/hiring-cohort-generator.mjs';
import {hiringTrainingCohorts,fitHiringCohorts,predictHiringCohorts} from '../lib/ml/hiring-cohort-model.mjs';
import {buildHiringClassifier} from './manual/generate-explore-hiring-classifier.mjs';
test('threshold equality is positive and counts preserve all openings',()=>{
 const actual=[{month:'2025-01',openings:10,started:7},{month:'2025-02',openings:20,started:8}];
 const counts=classifyHiringCohorts(actual,[{month:'2025-01',p:.5},{month:'2025-02',p:.4}],'p');
 assert.deepEqual([counts.tp,counts.fp,counts.fn,counts.tn],[7,3,8,12]);const m=summarizeClassifications([counts]);
 assert.equal(m.openings,30);assert.equal(m.positives,15);assert.equal(m.negatives,15);assert.equal(m.precision,.7);assert.equal(m.recall,7/15);assert.equal(m.accuracy,19/30);
 assert.throws(()=>classifyHiringCohorts(actual,[{month:'2025-02',p:.5},{month:'2025-01',p:.4}],'p'));
 assert.throws(()=>classifyHiringCohorts(actual,[{month:'2025-01',p:NaN},{month:'2025-02',p:.4}],'p'));
});
test('absent predicted class and absent actual class are undefined, not perfect scores',()=>{
 const c=classifyHiringCohorts([{month:'2025-01',openings:10,started:0}],[{month:'2025-01',p:.2}],'p');const m=summarizeClassifications([c]);
 assert.equal(m.precision,null);assert.equal(m.recall,null);assert.equal(m.balancedAccuracy,null);assert.equal(m.specificity,1);
});
test('future labels cannot affect the fitted model or forecasts; incomplete release cannot enter training',()=>{
 const {input,coverage}=hiringCohortFixture('assessment-reversal',90201,'2025-01-01T00:00:00.000Z');
 const fit=x=>fitHiringCohorts(hiringTrainingCohorts(x,coverage));const before=fit(input),copy=structuredClone(input);
 for(const row of copy.records)if(row.effectiveAt>input.cutoff)row.value.count+=900;
 assert.deepEqual(fit(copy),before);assert.deepEqual(predictHiringCohorts(fit(copy),['2025-01']),predictHiringCohorts(before,['2025-01']));
 assert.ok(before.trainingEnd<'2025-01');
 copy.records.find(row=>row.effectiveAt.startsWith(before.trainingEnd)).observedAt='2025-07-01T00:00:00.000Z';
 assert.throws(()=>fit(copy),/Partially observed/);
});
test('frozen chronological report is reproducible and retains every seed, family and baseline',async()=>{
 const report=await buildHiringClassifier(),saved=JSON.parse(await readFile(new URL('../docs/evidence/explore-hiring-classifier-v1.json',import.meta.url)));
 assert.deepEqual(report,saved);assert.equal(report.operationallyQualified,false);assert.equal(report.interval,null);
 assert.equal(report.families.length,3);
 for(const f of report.families){assert.equal(f.cases.length,20);assert.equal(f.testCohorts,60);for(const method of report.protocol.methods){const m=f.methods[method];assert.equal(m.tp+m.fp+m.fn+m.tn,m.openings);assert.equal(m.positives+m.negatives,m.openings);assert.equal(m.openings,f.cases.flatMap(c=>c.actual).reduce((n,r)=>n+r.openings,0));}for(const c of f.cases){assert.deepEqual(c.actual.map(r=>r.month),report.protocol.testMonths);assert.ok(c.model.trainingEnd<report.protocol.testMonths[0]);}}
});
