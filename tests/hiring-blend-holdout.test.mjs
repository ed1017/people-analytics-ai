import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {blendPredictions,evaluateBlend,passesGate} from './manual/evaluate-hiring-blend.mjs';
import {hiringCohortFixture} from './fixtures/hiring-cohort-generator.mjs';
test('blend preserves inputs, has fixed weights and rejects invalid probabilities',()=>{
 const rows=[{month:'2025-01','logistic-trend':0.8,'recent-3-fraction':0.2}];
 assert.equal(blendPredictions(rows)[0]['equal-blend'],0.5);
 assert.equal(rows[0]['equal-blend'],undefined);
 assert.throws(()=>blendPredictions([{'logistic-trend':NaN,'recent-3-fraction':0.2}]));
});
test('robustness gate requires both probability errors to improve in every family',()=>{
 const methods={'equal-blend':{brier:.2,logLoss:.5,balancedAccuracy:.5},'recent-3-fraction':{brier:.3,logLoss:.6,balancedAccuracy:.5}};
 assert.equal(passesGate([{methods}]),true);
 assert.equal(passesGate([]),false);
 for(const override of [{brier:.3},{logLoss:.7},{balancedAccuracy:.4},{balancedAccuracy:null}]){
  assert.equal(passesGate([{methods},{methods:{...methods,'equal-blend':{...methods['equal-blend'],...override}}}]),false);
 }
});
test('all training snapshots precede scoring and every fresh history is retained',async()=>{
 const calls=[];
 const report=await evaluateBlend((family,seed,cutoff)=>{calls.push(cutoff);return hiringCohortFixture(family,seed,cutoff);});
 assert.equal(report.cases.length,90);
 assert.ok(calls.slice(0,90).every(x=>x===report.protocol.origin));
 assert.ok(calls.slice(90).every(x=>x===report.protocol.scoreThrough));
 assert.equal(calls.length,180);
 assert.equal(report.families.reduce((n,f)=>n+f.methods['equal-blend'].openings,0),23400);
 const prior=JSON.parse(await readFile(new URL('../docs/explore-hiring-classifier-protocol.json',import.meta.url),'utf8'));
 assert.ok(report.cases.every(c=>!prior.seeds.includes(c.seed)));
 assert.deepEqual(report,JSON.parse(await readFile(new URL('../docs/evidence/hiring-blend-holdout-v1.json',import.meta.url),'utf8')));
});
test('unobservable reversal has identical fitted models and predictions to improving history',async()=>{
 const report=await evaluateBlend();
 for(const improving of report.cases.filter(c=>c.family==='gradual-improvement')){
  const reversal=report.cases.find(c=>c.family==='assessment-reversal'&&c.seed===improving.seed);
  assert.deepEqual(improving.model,reversal.model);
  assert.deepEqual(improving.predictions,reversal.predictions);
  assert.notDeepEqual(improving.actual,reversal.actual);
 }
});
