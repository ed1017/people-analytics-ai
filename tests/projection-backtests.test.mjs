import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildProjectionBacktests,backtestReleasedDomain,backtestStock,summarizeBacktest,POOLS} from '../lib/ml/projection-backtests.mjs';
import {generateWorkforceCase,replaySynthetic} from '../lib/ml/synthetic-workforce/pipeline.mjs';
import {monthAdd,monthEnd} from '../lib/ml/synthetic-workforce/common.mjs';
import {forecastTurnover} from '../lib/ml/synthetic-domain-predictions/turnover.mjs';
import {resolveProjectionBacktest,projectionBacktestPrompt} from '../lib/projection-backtest.ts';
import {homeForecastAnswer} from '../lib/home-forecast.ts';
import {taExtensionPrompt} from '../lib/synthetic-ta/extension.ts';
import {syntheticDomainDemoPrompt} from '../lib/synthetic-domain-demo.ts';
const read=path=>JSON.parse(fs.readFileSync(path));
const artifact=read('lib/data/projection-backtest-ranking-v1.json'),simulated=read('lib/data/synthetic-domain-demo-v1.json'),stock=read('lib/data/synthetic-ta-calibrated-v2.json');
const protocol=read('lib/ml/synthetic-workforce/protocol.json'),generated=generateWorkforceCase({...protocol,seeds:[simulated.seed]},{seed:simulated.seed,family:simulated.family});
const close=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('reproducible rankings match independent chronological replay, in own metric units',async()=>{
 assert.deepEqual(await buildProjectionBacktests(),artifact);
 const expected={turnover:[41,123,['seasonal-naive-12','recent-mean-3','linear-trend-12'],[9.699186991869919,11.853658536585368,15.825411715655623]],satisfaction:[7,7,['last-wave','linear-trend-8','recent-mean-3'],[.16697088045554917,.257067522621339,.269313320760775]],hiring:[30,90,['recentMean','carryForward','dampedChange'],[40.2,41.34444444444444,52.022222222222226]]};
 for(const [domain,[origins,pairs,order,maes]] of Object.entries(expected)){const d=artifact.domains[domain];assert.equal(d.eligibleOrigins,origins);assert.equal(d.scoredTargets,pairs);assert.deepEqual(d.ranked.map(r=>r.method),order);d.ranked.forEach((r,i)=>{assert.equal(r.n,pairs);close(r.mae,maes[i])});}
 assert.match(artifact.domains.satisfaction.unit,/percentage points/);
 assert.equal(artifact.domains.satisfaction.cases[0].origin,'2024-09-30T23:59:59.999Z');
 assert(artifact.domains.satisfaction.excluded.some(e=>e.reasons.includes('incomplete-or-invalid-quarterly-wave')));
});

test('every method uses common future targets and labels released by current cutoff',()=>{
 for(const d of Object.values(artifact.domains))for(const c of d.cases){
  assert(c.trainingEnd<=c.origin);assert(c.latestTrainingAvailableAt<=c.origin);
  assert(c.labelsAvailableAt.every(at=>at<=d.cutoff&&at>c.origin));
  const targets=d.domain==='satisfaction'?[monthAdd(c.origin.slice(0,7),3)]:[1,2,3].map(h=>monthAdd(c.origin.slice(0,7),h));assert.deepEqual(c.targets,targets);
  for(const method of d.pool)assert.equal(c.scores[method].n,targets.length);
 }
});

test('future current-cutoff releases and future stock cannot affect scores or ranking',()=>{
 for(const domain of ['turnover','satisfaction']){
  const d=artifact.domains[domain],releases=generated.domains[domain].releases;
  const options={cutoff:d.cutoff,startMonth:protocol.startMonth,source:d.source};
  const poisoned=releases.filter(r=>r.effectiveAt<=d.cutoff&&r.simulatedAvailableAt<=d.cutoff).concat({effectiveAt:'2099-01-31T23:59:59.999Z',simulatedAvailableAt:'2099-02-01T00:00:00.000Z',value:{poison:Infinity}});
  assert.deepEqual(backtestReleasedDomain(domain,poisoned,options),d);
 }
 const later={...stock,history:[...stock.history,{month:'2026-10',complete:true,active:99999999}]};
 assert.deepEqual(backtestStock(later).ranked,artifact.domains.hiring.ranked);
});

test('later labels cannot alter earlier-origin forecasts; final labels are never training data',()=>{
 const origin='2023-01-31T23:59:59.999Z',releases=generated.domains.turnover.releases;
 const prefix=releases.filter(r=>r.effectiveAt<=origin&&r.simulatedAvailableAt<=origin);
 const targets=['2023-02','2023-03','2023-04'];
 assert.deepEqual(forecastTurnover(replaySynthetic('turnover',prefix,origin),targets),forecastTurnover(replaySynthetic('turnover',releases,origin),targets));
 assert.equal(prefix.at(-1).value.month,'2022-12');
 assert(prefix.every(r=>!targets.includes(r.value.month)));
});

test('ties retain equal accuracy rank, incomplete common cases and short history fail closed',()=>{
 const cases=Array.from({length:3},(_,i)=>({origin:monthEnd(`2024-0${i+1}`),targets:[`2024-0${i+2}`],scores:Object.fromEntries(POOLS.hiring.map(method=>[method,{n:1,mae:2}]))}));
 const tied=summarizeBacktest('hiring',cases,[],{},stock.cutoff);
 assert.deepEqual(tied.ranked.map(r=>r.rank),[1,1,1]);assert.deepEqual(tied.ranked.map(r=>r.method),POOLS.hiring);
 const missing=structuredClone(cases);delete missing[0].scores.dampedChange;
 const rejected=summarizeBacktest('hiring',missing,[],{},stock.cutoff);assert.equal(rejected.status,'unavailable');assert.equal(rejected.eligibleOrigins,2);assert.deepEqual(rejected.ranked,[]);
 const short=backtestStock({...stock,history:stock.history.slice(-4)});assert.equal(short.status,'unavailable');assert.deepEqual(short.ranked,[]);
 const gap=backtestStock({...stock,history:stock.history.map((r,i)=>i===20?{...r,active:null,complete:false}:r)});assert(gap.eligibleOrigins<30);
});

test('ranked prose and canonical source guard preserve forecast labels and values',()=>{
 assert.equal(resolveProjectionBacktest('turnover',{...simulated,cutoff:'changed'}),null);assert.equal(resolveProjectionBacktest('hiring',{...stock,active:475}),null);
 assert.match(projectionBacktestPrompt('satisfaction',null),/unavailable/);
 for(const [question,rows] of [['Forecast turnover',['| Same month last year | 78.0 | 64.0 | 63.0 |','| Recent mean (3) | 79.7 | 79.7 | 79.7 |','| Linear Regression | 87.2 | 88.7 | 90.2 |']],['Forecast satisfaction',['| Last quarterly wave | 64.5% |','| Linear Regression | 64.7% |','| Recent mean (3) | 64.8% |']],['Forecast active requisitions',['| Recent mean (3) | 551 | 551 | 551 |','| Last count | 474 | 474 | 474 |','| Damped change | 435 | 415 | 405 |']]]){
  const answer=homeForecastAnswer(question);assert.match(answer,/3 methods ranked by backtest/);assert.match(answer,/No broader model search or real-workforce validation/);for(let i=0;i<rows.length;i++){assert(answer.includes(rows[i]),rows[i]);if(i)assert(answer.indexOf(rows[i])>answer.indexOf(rows[i-1]));}
 }
 assert.match(taExtensionPrompt(stock),/30 common historical origins/);assert.match(syntheticDomainDemoPrompt('survey-sentiment','Explain the synthetic projections'),/7 common historical origins/);
});
