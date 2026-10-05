import test from 'node:test';
import assert from 'node:assert/strict';
import {hiringCohortFixture} from './fixtures/hiring-cohort-generator.mjs';
import {hiringSelectionFixture} from './fixtures/hiring-selection-generator.mjs';
import {hiringSelectionProtocol as p,selectHiringMethod,prepareSelectedHiringForecast,scoreSelectedHiringForecast} from '../lib/ml/hiring-model-selection.mjs';
import {validationFolds,selectionCase,supportStressCases,benchmarkHiringSelection} from './manual/benchmark-hiring-selection.mjs';
const snapshot=()=>hiringSelectionFixture('gradual-improvement',17,p.origin);
const folds=()=>validationFolds('gradual-improvement',17);
test('test extension preserves all previously inspected records exactly and reproduces its suffix',()=>{
 const a=snapshot(),old=hiringCohortFixture('gradual-improvement',17,p.origin);
 assert.deepEqual(a.input.records.slice(0,old.input.records.length),old.input.records);
 assert.deepEqual(a,snapshot());assert.equal(a.input.records.at(-1).effectiveAt.slice(0,7),'2025-09');
});
test('strict improvement in both validation windows selects logistic; ties and mixed wins fall back',()=>{
 const f=folds();for(const fold of f){fold.actual.forEach(r=>r.started=r.openings);
  fold.predictions.forEach(r=>{r['recent-3-fraction']=.5;r['logistic-trend']=.9;});}
 assert.equal(selectHiringMethod(f).method,'logistic-trend');
 f[0].predictions.forEach(r=>r['logistic-trend']=.5);
 assert.equal(selectHiringMethod(f).method,'recent-3-fraction');
 f[0].predictions.forEach(r=>r['logistic-trend']=.1);
 assert.equal(selectHiringMethod(f).method,'recent-3-fraction');
});
test('missing and undersized past validation fall back without releasing its metrics',()=>{
 assert.equal(selectHiringMethod([]).reason,'insufficient-validation');
 const f=folds();f[0].actual.pop();assert.equal(selectHiringMethod(f).reason,'incomplete-validation-cohorts');
 const small=folds();small[0].actual[0].openings=29;small[0].actual[0].started=10;
 const result=selectHiringMethod(small);assert.equal(result.method,'recent-3-fraction');assert.deepEqual(result.validation,[]);
 assert.equal(prepareSelectedHiringForecast(snapshot(),[]).selection.method,'recent-3-fraction');
});
test('late scoring windows and train/validation overlap are rejected, not used for selection',()=>{
 const late=folds();late[1].scoreThrough='2025-07-02T00:00:00.000Z';assert.throws(()=>selectHiringMethod(late),/precede/);
 const overlapping=folds();overlapping[0].model={...overlapping[0].model,trainingEnd:'2024-07'};
 assert.throws(()=>selectHiringMethod(overlapping),/earlier training/);
 const early=folds();early[0].scoreThrough='2024-08-01T00:00:00.000Z';assert.throws(()=>selectHiringMethod(early));
});
test('future/test payload mutations cannot alter selection, training or predictions',()=>{
 const a=snapshot(),f=folds(),before=prepareSelectedHiringForecast(a,f);
 for(const r of a.input.records)if(r.observedAt>p.origin)r.value.count=9999;
 assert.deepEqual(prepareSelectedHiringForecast(a,f),before);
 const c=selectionCase('gradual-improvement',17),key=JSON.stringify(c.prepared),actual=structuredClone(c.actual);
 actual.forEach(r=>r.started=0);assert.notDeepEqual(scoreSelectedHiringForecast(c.prepared,actual),c.assessment);
 assert.equal(JSON.stringify(c.prepared),key);assert.ok(Object.isFrozen(c.prepared.selection));
});
test('stored metric summaries cannot steer selection',()=>{
 const f=folds(),before=selectHiringMethod(f);
 f.forEach(v=>v.metrics={'logistic-trend':{brier:-100},'recent-3-fraction':{brier:100}});
 assert.deepEqual(selectHiringMethod(f),before);
});
test('sparse, short, small, censored, partly released, stale and rare-outcome cohorts abstain',()=>{
 const cases=supportStressCases();assert.equal(cases.length,7);
 for(const c of cases){assert.equal(c.result.status,'abstained',c.name);assert.equal(c.result.predictions,null);
  assert.equal(c.result.selected,null);assert.equal(c.result.model,null);assert.equal(c.result.interval,null);}
});
test('30-opening training boundary passes while 29 abstains; small test slices suppress metrics',()=>{
 const s=snapshot(),first=s.input.records.filter(r=>r.effectiveAt.startsWith('2021-01'));
 first.forEach(r=>r.value.count=10);assert.equal(prepareSelectedHiringForecast(s,folds()).status,'experimental-synthetic-only');
 first[0].value.count=9;assert.equal(prepareSelectedHiringForecast(s,folds()).status,'abstained');
 const c=selectionCase('gradual-improvement',17),actual=structuredClone(c.actual);
 actual[0]={...actual[0],openings:29,started:10};
 assert.equal(scoreSelectedHiringForecast(c.prepared,actual).status,'suppressed');
 assert.equal(scoreSelectedHiringForecast(c.prepared,actual).metrics,null);
});
test('all fixed cases report selection regret and retain synthetic-only qualification',async()=>{
 const r=await benchmarkHiringSelection();assert.equal(r.cases.length,9);assert.equal(r.operationallyQualified,false);
 assert.equal(r.interval,null);assert.equal(r.causalEffect,null);
 for(const c of r.cases){assert.equal(c.prepared.model.trainingEnd,'2025-03');
  assert.equal(c.prepared.model.trainingCohorts,51);assert.equal(c.actual.length,3);
  assert.deepEqual(c.actual.map(x=>x.month),p.testMonths);
  assert.equal(c.assessment.metrics.selected.brier,c.assessment.metrics[c.prepared.selection.method==='logistic-trend'?'logistic':'recent'].brier);}
 assert.ok(r.summary.some(s=>s.losesToLogisticSeeds.length>0));
});
