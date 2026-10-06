import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateWorkforceCase} from '../lib/ml/synthetic-workforce/pipeline.mjs';
import {protocol,observeCase,fitCorrections,predictCorrection,finiteSampleRadius,calibrate,evaluateRow,missingnessGuard} from '../lib/ml/synthetic-training-expansion/evaluation.mjs';
const base=JSON.parse(readFileSync(new URL('../lib/ml/synthetic-workforce/protocol.json',import.meta.url)));
const row=(role,domain='turnover',labels=[12,14,16],baseline=[10,10,10])=>({role,domain,origin:protocol.trainingOrigin,labelsAsOf:protocol.trainingLabelsAsOf,months:protocol.trainingTargets,
  predictionStatus:'predicted',scoringStatus:'scored',predictionReasons:[],scoringReasons:[],labels,baseline});
test('correction averages histories equally rather than expanding aggregate counts',()=>{
  const fit=fitCorrections([row('training'),row('training','turnover',[20],[10])]);
  assert.equal(fit.turnover.correction,7);assert.equal(fit.turnover.usableHistories,2);assert.equal(fit.hiring.correction,null);
  assert.deepEqual(predictCorrection({domain:'turnover',values:[2,4]},fit.turnover.correction),[9,11]);
});
test('fitting and calibration reject test role or post-origin label provenance',()=>{
  assert.throws(()=>fitCorrections([row('test')]));assert.throws(()=>fitCorrections([{...row('training'),labelsAsOf:protocol.testLabelsAsOf}]));
  assert.throws(()=>calibrate([row('test')],{}));
});
test('known target supports bound correction while intervals remain diagnostics',()=>{
  assert.deepEqual(predictCorrection({domain:'turnover',values:[1]},-3),[0]);
  assert.deepEqual(predictCorrection({domain:'hiring',values:[.8]},1),[.999999]);
  assert.deepEqual(predictCorrection({domain:'satisfaction',values:[1]},-3),[0]);
});
test('finite sample order statistic uses ceiling and requires twenty histories',()=>{
  assert.equal(finiteSampleRadius(Array.from({length:20},(_,i)=>i)),18);
  assert.equal(finiteSampleRadius(Array(19).fill(0)),null);assert.throws(()=>finiteSampleRadius([NaN]));
});
test('calibration uses one maximum error per history and common held-out sets',()=>{
  const fits={'bias-small':{turnover:{correction:1}},'bias-expanded':{turnover:{correction:2}}};
  const calibration=calibrate(Array.from({length:20},()=>row('calibration')),fits);
  assert.equal(calibration.turnover['unchanged-baseline'].radius,6);assert.equal(calibration.turnover['bias-small'].radius,5);
  const score=evaluateRow(row('test'),fits,calibration);
  assert.equal(score.variants['bias-expanded'].diagnosticBand.jointCovered,true);
  assert.equal(score.variants['bias-expanded'].diagnosticBand.coverageGuarantee,false);assert.equal(score.publishedInterval,null);
  const blocked=evaluateRow({...row('test'),predictionStatus:'blocked',scoringStatus:'blocked',labels:null},fits,calibration);
  assert.equal(blocked.variants['bias-expanded'].metrics,null);
});
test('native partial histories abstain and cannot be rescued by more training data',()=>{
  const result=generateWorkforceCase(base,{seed:17,family:'reporting-stress'}),guards=missingnessGuard(result);
  for(const domain of ['turnover','satisfaction'])assert.equal(guards.find(row=>row.domain===domain).status,'blocked');
});
test('source replay excludes late revisions and future labels from baseline predictions',()=>{
  const result=generateWorkforceCase(base,{seed:17,family:'stationary'});
  const args={role:'training',origin:protocol.trainingOrigin,targets:protocol.trainingTargets,labelsAsOf:protocol.trainingLabelsAsOf};
  const first=observeCase(result,args);
  // Mutate valid post-origin turnover labels while preserving stock-flow arithmetic.
  for(const release of result.domains.turnover.releases)if(release.effectiveAt.startsWith('2025-07')){release.value.voluntaryExits+=3;release.value.otherExits-=3;}
  const second=observeCase(result,args);
  assert.deepEqual(first.map(row=>row.baseline),second.map(row=>row.baseline));
  assert.deepEqual(first.map(row=>row.inputSha256),second.map(row=>row.inputSha256));
  assert.notDeepEqual(first[0].labels,second[0].labels);
});
