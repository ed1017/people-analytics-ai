import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateHiringCandidateAcceptance as gate,freezeHiringAcceptanceContract} from '../lib/ml/hiring-acceptance.ts';
import {syntheticAcceptanceFixture} from './fixtures/hiring-acceptance.mjs';
import {syntheticHiringManifest as manifest,syntheticHiringHistory} from './fixtures/hiring-evaluation.mjs';
const run=fixture=>gate(fixture.manifest,fixture.rows,fixture.artifact);
const selected=fixture=>fixture.artifact.trials.find(trial=>trial.penalty===1);
const shift=(fold,amount)=>fold.predictions.forEach(prediction=>prediction.days+=amount);

test('existing contract freezes thresholds and calendar protocol without observing labels',()=>{
 const c=freezeHiringAcceptanceContract(manifest);
 assert.deepEqual(c.thresholds,{minimumRelativeMaeImprovement:.1,minimumAbsoluteMaeImprovementDays:2,requiredImprovingDevelopmentFolds:2,maximumDevelopmentMaeWorsening:.05,maximumHoldoutP90Worsening:.05});
 assert.deepEqual(c.candidate.penalties,[.1,1,10]);assert.ok(Object.isFrozen(c.protocol.holdout));assert.ok(Object.isFrozen(c.thresholds));
 assert.deepEqual(c,freezeHiringAcceptanceContract(Object.fromEntries(Object.entries(manifest).reverse())));
});
test('synthetic passing gate reuses both baselines and keeps training/deployment false',()=>{
 const f=syntheticAcceptanceFixture(),result=run(f),r=result.report;
 assert.equal(r.status,'passed-synthetic-method-validation');assert.equal(r.syntheticAcceptanceGatesPassed,true);
 assert.equal(r.modelTrained,false);assert.equal(r.deploymentValidated,false);assert.equal(r.decision,'continue-method-review');
 assert.equal(r.candidate.selectedPenalty,1);assert.equal(r.candidate.improvingDevelopmentFolds,2);
 assert.deepEqual(r.baseline,f.evaluation.report);assert.deepEqual(result.localAudit,f.evaluation.localAudit);
 assert.ok(r.candidate.folds.every(fold=>fold.candidate.maeDays===1&&fold.candidate.meanSignedErrorDays===1));
 assert.ok(!JSON.stringify(r).includes(f.rows[0].requisitionId));assert.ok(Object.isFrozen(r.candidate.folds[0].checks));
});
test('failing either baseline, development consistency or holdout performance retains baseline',()=>{
 const cases=[{errors:{.1:8,1:3,10:12},expected:['developmentNonRegression']},
  {errors:{.1:8,1:5,10:12},expected:['developmentImprovement','developmentNonRegression']},
  {holdoutError:4,expected:['holdoutImprovement']}];
 for(const {expected,...options} of cases){const r=run(syntheticAcceptanceFixture(options)).report;assert.equal(r.syntheticAcceptanceGatesPassed,false);assert.equal(r.decision,'retain-baselines');for(const reason of expected)assert.ok(r.failedGates.includes(reason),reason)}
});
test('exact two-day improvement passes; just below two days fails',()=>{
 assert.equal(run(syntheticAcceptanceFixture({holdoutError:3})).report.candidate.gates.holdoutImprovement,true);
 assert.equal(run(syntheticAcceptanceFixture({holdoutError:3.0001})).report.candidate.gates.holdoutImprovement,false);
});
test('ten-percent improvement uses unrounded errors; 9.999 percent cannot pass',()=>{
 const rows=syntheticHiringHistory().map(row=>{const opened=Date.parse(row.openedDate),days=row.openedDate<'2025-07-01'?5:30;return {...row,closedDate:new Date(opened+5*86400000).toISOString().slice(0,10),startDate:new Date(opened+days*86400000).toISOString().slice(0,10),labelFirstObservedAt:new Date(opened+(days+1)*86400000).toISOString()}});
 for(const [error,pass] of [[22.5,true],[22.5001,false]]){const r=run(syntheticAcceptanceFixture({rows,errors:{.1:35,1:error,10:40}})).report;assert.equal(r.candidate.folds[0].baselines.rolling.maeDays,25);assert.equal(r.candidate.folds[0].checks.rolling.maeImproves,pass)}
});
test('development five-percent regression and holdout p90 boundaries are inclusive',()=>{
 for(const [amount,pass] of [[.05,true],[.0501,false]]){
  const f=syntheticAcceptanceFixture();shift(selected(f).folds[1],amount);
  assert.equal(run(f).report.candidate.gates.developmentNonRegression,pass);
 }
 for(const [tail,pass] of [[6.3,true],[6.3001,false]]){
  const f=syntheticAcceptanceFixture({holdoutError:(_fold,index)=>index<5?tail:0});const r=run(f).report;
  assert.equal(r.candidate.gates.holdoutImprovement,true);assert.equal(r.candidate.gates.holdoutTailNonRegression,pass);
 }
});
test('good holdout cannot replace two improving development folds',()=>{
 const f=syntheticAcceptanceFixture();shift(selected(f).folds[0],2);const r=run(f).report;
 assert.equal(r.candidate.gates.holdoutImprovement,true);assert.equal(r.candidate.improvingDevelopmentFolds,1);assert.ok(r.failedGates.includes('developmentImprovement'));
});
test('insufficient data and provenance cannot pass even with fabricated excellent predictions',()=>{
 for(const patch of [{cohortCoverage:'completed-fills-only'},{openingScopeVerified:false},{statusHistoryVerified:false},{openingCoverageStart:'2025-01-01'}]){
  const f=syntheticAcceptanceFixture(),r=gate({...manifest,...patch},f.rows,f.artifact).report;
  assert.equal(r.status,'blocked');assert.equal(r.candidate,null);assert.ok(r.failedGates.length);assert.equal(r.modelTrained,false);
 }
 for(const rows of [[],syntheticHiringHistory().slice(0,20),syntheticHiringHistory().map(row=>({...row,labelFirstObservedAt:null}))])assert.equal(gate(manifest,rows,null).report.status,'blocked');
});
test('dataset/contract mismatch and unapproved provenance or predictors reject before scoring candidate',()=>{
 const patches=[{datasetFingerprint:'0'.repeat(64)},{contractFingerprint:'0'.repeat(64)},{provenance:'real'},
 {purpose:'forecast'},{family:'random-forest'},{predictors:['accepted-offers']},{predictors:['opening-year']},
 {featureAvailability:'current-snapshot'},{preprocessing:'whole-extract'},{transform:'holdout-clipped'},
 {selectionScope:'holdout'},{holdoutUse:'reused-for-tuning'},{sourceDefinitionSha256:''},{candidateCodeSha256:null},{evaluatorGitSha:'unknown'}];
 for(const patch of patches){const f=syntheticAcceptanceFixture();assert.throws(()=>gate(f.manifest,f.rows,{...f.artifact,...patch}))}
 const f=syntheticAcceptanceFixture();f.rows[0].timeToFillDays=4;assert.throws(()=>run(f),/different observations/);
 assert.throws(()=>gate({...manifest,provenance:'real'},f.rows,f.artifact),/synthetic/);
});
test('same-fold score rows and unavailable labels cannot enter training or preprocessing',()=>{
 for(const field of ['trainingIds','preprocessingIds']){
  const f=syntheticAcceptanceFixture(),fold=selected(f).folds[0];fold[field][0]=fold.predictions[0].id;
  assert.throws(()=>run(f),/membership/);
 }
 for(const field of ['trainingIds','preprocessingIds']){const f=syntheticAcceptanceFixture();selected(f).folds[0][field].pop();assert.throws(()=>run(f),/membership/)}
 const late=syntheticAcceptanceFixture(),unavailable=late.evaluation.localAudit.folds[0].unavailableTrainingIds[0];assert.ok(unavailable);selected(late).folds[0].trainingIds[0]=unavailable;assert.throws(()=>run(late),/membership/);
 const f=syntheticAcceptanceFixture();selected(f).folds[0].trainBefore='2026-01-01';assert.throws(()=>run(f),/temporal/);
});
test('missing, duplicate, extra, nonfinite, negative and mismatched predictions all reject',()=>{
 const mutations=[p=>p.pop(),p=>p.push({...p[0]}),p=>p[0].id='wrong-id',p=>p[1].id=p[0].id,
 p=>p[0].days=NaN,p=>p[0].days=Infinity,p=>p[0].days=-1,p=>p[0].days=Number.MAX_VALUE,p=>p[0].days='1',p=>p[0].employeeId='not-allowed'];
 for(const mutate of mutations){const f=syntheticAcceptanceFixture();mutate(f.artifact.holdout.fold.predictions);assert.throws(()=>run(f))}
});
test('only three reviewed penalties and three exact development windows may be compared',()=>{
 const mutations=[a=>a.trials.pop(),a=>a.trials[0].penalty=2,a=>a.trials[0].penalty=1,
 a=>a.trials[0].folds.pop(),a=>a.trials[0].folds[0].name='holdout',a=>a.trials[0].folds[0].name='development-2',a=>a.candidateMetrics={mae:0}];
 for(const mutate of mutations){const f=syntheticAcceptanceFixture();mutate(f.artifact);assert.throws(()=>run(f))}
});
test('selection is development-only; a better holdout cannot select another penalty',()=>{
 const f=syntheticAcceptanceFixture();f.artifact.holdout.penalty=.1;assert.throws(()=>run(f),/development-selected/);
 const poor=run(syntheticAcceptanceFixture({holdoutError:30})).report;assert.equal(poor.candidate.selectedPenalty,1);assert.equal(poor.syntheticAcceptanceGatesPassed,false);
 assert.throws(()=>run(syntheticAcceptanceFixture({errors:{.1:1,1:1,10:12}})),/tie policy/);
});
test('zero baseline error cannot be claimed as two days of improvement',()=>{
 const rows=syntheticHiringHistory().map(row=>{const opened=Date.parse(row.openedDate);return {...row,startDate:new Date(opened+20*86400000).toISOString().slice(0,10),labelFirstObservedAt:new Date(opened+21*86400000).toISOString()}});
 const r=run(syntheticAcceptanceFixture({rows,errors:{.1:1,1:0,10:2},holdoutError:0})).report;
 assert.equal(r.candidate.gates.holdoutImprovement,false);assert.equal(r.candidate.gates.holdoutTailNonRegression,true);assert.equal(r.syntheticAcceptanceGatesPassed,false);
});
test('shuffling artifact/input rows is deterministic and inputs are not mutated',()=>{
 const f=syntheticAcceptanceFixture(),before=structuredClone(f),first=run(f);assert.deepEqual(f,before);
 f.rows.reverse();f.artifact.trials.reverse();for(const trial of f.artifact.trials){trial.folds.reverse();for(const fold of trial.folds){fold.trainingIds.reverse();fold.preprocessingIds.reverse();fold.predictions.reverse()}}
 f.artifact.holdout.fold.predictions.reverse();assert.deepEqual(run(f),first);
});
