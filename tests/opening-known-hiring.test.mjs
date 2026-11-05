import test from 'node:test';
import assert from 'node:assert/strict';
import {openingCohorts,observeOpeningCohorts} from './fixtures/opening-known-hiring.mjs';
import {fitOpeningModel,predictOpeningModel} from '../lib/ml/opening-known-hiring.mjs';
import {calibration,educationalGate,evaluateOpeningKnown} from './manual/evaluate-opening-known-hiring.mjs';
const origin='2025-10-01T00:00:00.000Z';
const train=()=>observeOpeningCohorts('stable',119001,openingCohorts('stable',['2024-01','2024-02','2024-03']),origin);
test('opening features exclude labels and are not known before opening',()=>{
 const [row]=openingCohorts('stable',['2025-11']);assert.equal(row.started,undefined);assert.equal(row.labelAvailableAt,undefined);
 const model=fitOpeningModel(train(),origin);
 assert.throws(()=>predictOpeningModel(model,row,origin),/not known/);
 assert.throws(()=>predictOpeningModel(model,{...row,featuresAvailableAt:'2025-11-02T00:00:00.000Z'}),/not known/);
 assert.deepEqual(predictOpeningModel(model,row),predictOpeningModel(model,{...row,started:999,status:'filled'}));
});
test('training rejects unreleased and immature labels and undeclared features',()=>{
 const rows=train();assert.throws(()=>fitOpeningModel([{...rows[0],labelAvailableAt:'2026-01-01T00:00:00.000Z'},...rows.slice(1)],origin));
 assert.throws(()=>fitOpeningModel([{...rows[0],labelAvailableAt:rows[0].openedAt},...rows.slice(1)],origin));
 assert.throws(()=>fitOpeningModel([{...rows[0],features:{...rows[0].features,actualStart:1}},...rows.slice(1)],origin));
 assert.throws(()=>observeOpeningCohorts('stable',119001,openingCohorts('stable',['2025-10']),origin));
});
test('fitted logistic model matches constant probabilities with no feature effects',()=>{
 const rows=openingCohorts('stable',['2024-01']).map(r=>({...r,openings:100,started:70,labelAvailableAt:'2024-04-02T00:00:00.000Z'}));
 const model=fitOpeningModel(rows,origin);assert.ok(model.beta.slice(1).every(x=>Math.abs(x)<1e-8));
 assert.ok(Math.abs(predictOpeningModel(model,openingCohorts('stable',['2025-10'])[0])['logistic-features']-.7)<1e-6);
});
test('generated outcomes account for all openings; reversal is invisible before it occurs',()=>{
 const features=openingCohorts('stable',['2024-01']);
 assert.deepEqual(observeOpeningCohorts('stable',119001,features,origin),observeOpeningCohorts('relationship-reversal',119001,features,origin));
 for(const r of train())assert.equal(r.started+r.cancelled+r.unresolved,r.openings);
});
test('calibration bins preserve counts and undefined empty bins',()=>{
 const bins=calibration([{openings:10,started:3}],[{m:.3}],'m');
 assert.equal(bins[1].openings,10);assert.equal(bins[1].meanPrediction,.3);assert.equal(bins[1].observedFraction,.3);assert.equal(bins[0].meanPrediction,null);
});
test('development creates every prediction before any scoring snapshot is requested',async()=>{
 const calls=[];const report=await evaluateOpeningKnown('development',(family,seed,rows,asOf)=>{
  assert.ok(seed>=119001&&seed<=119004);calls.push(asOf);return observeOpeningCohorts(family,seed,rows,asOf);
 });
 assert.equal(calls.length,24);assert.ok(calls.slice(0,12).every(x=>x===origin));assert.ok(calls.slice(12).every(x=>x==='2026-04-01T00:00:00.000Z'));
 assert.equal(report.cases.length,12);
});
test('teaching gate requires both ordinary scenarios and complete finite stress results',()=>{
 const metric={positives:10,negatives:10,brier:.2,logLoss:.5,balancedAccuracy:.6};
 const families=['stable','mix-shift','relationship-reversal'].map(family=>({family,methods:{'logistic-features':{...metric},'cell-rate':{...metric,brier:.198},'pooled-rate':{...metric,brier:.25}}}));
 assert.equal(educationalGate(families),true);assert.equal(educationalGate(families.slice(0,2)),false);
 for(const override of [{balancedAccuracy:.59},{brier:.24},{logLoss:NaN},{positives:0}]){
  const copy=structuredClone(families);Object.assign(copy[0].methods['logistic-features'],override);assert.equal(educationalGate(copy),false);
 }
 const copy=structuredClone(families);copy[2].methods['logistic-features'].balancedAccuracy=.2;assert.equal(educationalGate(copy),true);
 copy[2].methods['logistic-features'].brier=Infinity;assert.equal(educationalGate(copy),false);
});
