import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {generateWorkforceCase,replaySynthetic} from '../lib/ml/synthetic-workforce/pipeline.mjs';
import {digest} from '../lib/ml/synthetic-workforce/common.mjs';
import {currentReference,forecastWindow} from '../lib/ml/synthetic-history-length/models.mjs';
import {protocol,domains,targetsFor,selectWindow,prepareDecision,evaluateDecision,summarize} from '../lib/ml/synthetic-window-policy/evaluation.mjs';
const config=JSON.parse(readFileSync(new URL('../lib/ml/synthetic-workforce/protocol.json',import.meta.url)));
const result=generateWorkforceCase(config,{seed:17,family:'stationary'}),cutoff=protocol.decisionOrigins.at(-1);
const score=mae=>({status:'scored',reasons:[],methods:{'linear-trend':{mae,rmse:mae}}});
const fake=()=>({domain:'turnover',cutoff,forecasts:protocol.windows.map(window=>({window,forecast:{status:'predicted',reasons:[],predictions:[{window}]}})),
  validation:protocol.validationOrigins.slice(0,4).map(origin=>({origin,labelsAsOf:cutoff,rows:protocol.windows.map(window=>({window,scoring:score(5)}))}))});
test('ties prefer current and candidates share the latest exact three complete folds',()=>{
  const input=fake();input.validation[0].rows.find(row=>row.window===60).scoring=score(0);
  assert.equal(selectWindow(input).selectedWindow,'current');assert.deepEqual(selectWindow(input).sharedValidationOrigins,input.validation.slice(1).map(row=>row.origin));
  for(const fold of input.validation)fold.rows.find(row=>row.window===24).scoring=score(2);
  input.validation.at(-1).rows.find(row=>row.window===24).scoring={status:'blocked'};
  const chosen=selectWindow(input);assert.equal(chosen.selectedWindow,'current');assert.equal(chosen.candidates.find(row=>row.window===24).reason,'candidate-unavailable-on-shared-folds');
});
test('selection uses mean prior MAE; near ties retain current; fewer folds fall back',()=>{
  const input=fake();for(const fold of input.validation)fold.rows.find(row=>row.window===36).scoring=score(1);
  assert.equal(selectWindow(input).selectedWindow,36);
  for(const fold of input.validation)fold.rows.find(row=>row.window===36).scoring=score(5-1e-11);
  assert.equal(selectWindow(input).selectedWindow,'current');input.validation=input.validation.slice(0,2);
  assert.equal(selectWindow(input).status,'current-fallback');
  input.validation[0].labelsAsOf='2027-02-28T23:59:59.999Z';assert.throws(()=>selectWindow(input));
});
test('current abstention cannot be bypassed by a shorter successful candidate',()=>{
  const input=fake();input.forecasts[0].forecast={status:'blocked',reasons:['missing-current-support']};
  const chosen=selectWindow(input);assert.equal(chosen.status,'blocked');assert.deepEqual(chosen.selectedForecast,input.forecasts[0].forecast);
});
test('chained near ties prefer the first candidate within tolerance of the global minimum',()=>{
  const input=fake();for(const fold of input.validation){fold.rows.find(row=>row.window===12).scoring=score(5-.5e-10);fold.rows.find(row=>row.window===24).scoring=score(5-1.2e-10);}
  assert.equal(selectWindow(input).selectedWindow,12);
});
test('removing all future releases and metadata cannot change any decision or validation audit',()=>{
  const prefix=structuredClone(result);
  delete prefix.seed;delete prefix.family;delete prefix.boundaryReconciliation;
  for(const domain of domains){delete prefix.domains[domain].truth;prefix.domains[domain].releases=prefix.domains[domain].releases.filter(row=>row.simulatedAvailableAt<=cutoff);}
  for(const domain of domains)assert.deepEqual(prepareDecision(result,domain,cutoff),prepareDecision(prefix,domain,cutoff));
});
test('post-cutoff outcome mutations do not affect turnover selection',()=>{
  const changed=structuredClone(result);for(const row of changed.domains.turnover.releases)if(row.simulatedAvailableAt>cutoff&&row.status==='complete'){
    row.value.voluntaryExits+=row.value.otherExits;row.value.otherExits=0;
  }
  assert.deepEqual(prepareDecision(result,'turnover',cutoff),prepareDecision(changed,'turnover',cutoff));
});
test('historical inputs replay at their own cutoff and hiring waits for complete quarter follow-up',()=>{
  for(const domain of domains){const prepared=prepareDecision(result,domain,cutoff);
    for(const fold of prepared.validation)assert.equal(fold.inputSha256,digest(replaySynthetic(domain,result.domains[domain].releases,fold.origin)));
    assert(prepared.decision.sharedValidationOrigins.every(origin=>origin<cutoff));
  }
  const hiring=prepareDecision(result,'hiring',cutoff);
  assert.equal(hiring.validation.at(-1).origin,'2026-03-31T23:59:59.999Z');
  assert.equal(hiring.validation.at(-1).rows[0].scoring.status,'blocked');
  assert(!hiring.decision.sharedValidationOrigins.includes('2026-03-31T23:59:59.999Z'));
});
test('native partial releases preserve abstention; later survey instrument break prevents scoring',()=>{
  const stress=generateWorkforceCase(config,{seed:17,family:'reporting-stress'});
  for(const domain of ['turnover','satisfaction']){
    const snapshot=replaySynthetic(domain,stress.domains[domain].releases,protocol.missingnessGuardOrigin);
    const forecasts=protocol.windows.map(window=>({window,forecast:window==='current'?currentReference(snapshot,['2025-12']):forecastWindow(snapshot,['2025-12'],window)}));
    assert.equal(selectWindow({domain,cutoff:protocol.missingnessGuardOrigin,forecasts,validation:[]}).status,'blocked');
  }
  const broken=generateWorkforceCase(config,{seed:17,family:'survey-break'}),prepared=prepareDecision(broken,'satisfaction',cutoff);
  assert.equal(prepared.currentForecast.status,'predicted');assert.equal(evaluateDecision(broken,prepared).policyScore.status,'blocked');
});
test('summaries use paired scores and retain current on any worsened stratum',()=>{
  const row=(family,current,policy)=>({domain:'turnover',family,seed:17,origin:cutoff,currentForecast:{status:'predicted',reasons:[]},
    currentScore:score(current),policyScore:score(policy),decision:{selectedWindow:24,selectedForecast:{status:'predicted'},status:'selected',reasonCodes:[],candidates:[]}});
  const rows=[row('stationary',10,1),row('regime-reversal',1,2),row('survey-break',2,0)];rows[2].policyScore={status:'blocked',reasons:['incomparable']};
  const summary=summarize(rows).overall[0];assert.equal(summary.pairedCases,2);assert.equal(summary.currentMae,5.5);assert.equal(summary.policyMae,1.5);
  assert.equal(summary.recommendation,'retain-current');assert.equal(summary.worsenedStrata.length,1);
  assert.equal(summarize([rows[0],rows[2]]).overall[0].recommendation,'retain-current');
  assert.deepEqual(targetsFor(cutoff,'satisfaction'),['2026-09']);
});
