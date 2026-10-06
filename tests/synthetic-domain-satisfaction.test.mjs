import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastSatisfaction, scoreSatisfaction} from '../lib/ml/synthetic-domain-predictions/satisfaction.mjs';
import {replaySynthetic} from '../lib/ml/synthetic-workforce/pipeline.mjs';
import {release, monthEnd, dayAdd} from '../lib/ml/synthetic-workforce/common.mjs';

const ORIGIN = '2026-06-30T23:59:59.999Z';
const FINAL = '2027-07-01T00:00:00.000Z';
const MONTHS = ['2024-06','2024-09','2024-12','2025-03','2025-06','2025-09','2025-12','2026-03'];
const identity = {instrumentVersion:'instrument-v1',itemSetVersion:'items-v1',scoringVersion:'scoring-v1',eligibilityVersion:'eligibility-v1',populationVersion:'population-v1',sourceKind:'employee-wave',responseUnit:'mean-respondent-favorable-answer-share'};
function wave(month, scorePct = 60) {
  const closeAt = monthEnd(month);
  return release(`satisfaction:${month}`,1,closeAt,dayAdd(closeAt,10),{
    waveId:`wave-${month}`,...identity,launchAt:`${month}-01T00:00:00.000Z`,closeAt,comparability:'within-instrument-only',
    eligible:200, submitted:100, nonrespondents:100, invalidRespondents:0,respondents:100,
    validAnswerCount:500,invalidAnswerCount:0,missingAnswerCount:0,scoredAnswerCount:500,favorableAnswerCount:scorePct*5,
    shareSum:scorePct,scorePct,participationPct:50,
  },'complete');
}
const history = scores => MONTHS.map((month,i) => wave(month, scores?.[i] ?? 60));
const replay = (rows, cutoff=ORIGIN) => replaySynthetic('satisfaction',rows,cutoff);
const predict = rows => forecastSatisfaction(replay(rows),['2026-09']);
function masked(row,status='suppressed') {
  row.status=status;
  for(const field of ['eligible','submitted','nonrespondents','invalidRespondents','respondents','validAnswerCount','invalidAnswerCount','missingAnswerCount','scoredAnswerCount','favorableAnswerCount','shareSum','scorePct','participationPct']) row.value[field]=null;
  return row;
}

test('quarterly baseline/trend forecasts respect calendar horizon and preserve identity',()=>{
  const result=predict(history([10,20,30,40,50,60,70,80]));
  assert.equal(result.status,'predicted');
  assert.deepEqual(result.predictions,[{month:'2026-09','last-wave':80,'recent-mean-3':70,'linear-trend-8':100,identity}]);
  assert.equal(result.audit.support.length,8);
  assert.equal(result.interval,null);
  assert.equal(result.operationallyQualified,false);
});

test('literal zero is forecast and scored as zero, not missing',()=>{
  const rows=history(Array(8).fill(0));
  const result=predict(rows);
  assert.equal(result.status,'predicted');
  assert.equal(result.predictions[0]['recent-mean-3'],0);
  const scoring=scoreSatisfaction(replay([...rows,wave('2026-09',0)],FINAL),result.predictions);
  assert.equal(scoring.status,'scored');
  assert.deepEqual(scoring.methods['last-wave'],{n:1,mae:0,rmse:0});
});

test('OLS extrapolation clamps high and low values without changing baseline predictions',()=>{
  assert.equal(predict(history([20,30,40,50,60,70,80,90])).predictions[0]['linear-trend-8'],100);
  assert.equal(predict(history([90,80,70,60,50,40,30,20])).predictions[0]['linear-trend-8'],0);
});

test('eight selected records cannot conceal a missing calendar quarter',()=>{
  const rows=[wave('2024-03'),...history().filter(row=>!row.effectiveAt.startsWith('2025-06'))];
  assert.deepEqual(predict(rows).reasons,['nonconsecutive-quarterly-history']);
});

test('latest and interior masked records block rather than dropping unavailable waves',()=>{
  for(const index of [3,7]) for(const status of ['partial','missing','suppressed']) {
    const rows=history();masked(rows[index],status);
    assert.equal(predict(rows).status,'blocked');
  }
  assert.deepEqual(predict(history().slice(1)).reasons,['insufficient-quarterly-history']);
});

test('each survey identity dimension must match across support',()=>{
  for(const key of Object.keys(identity)) {
    const rows=history(); rows[3].value[key]='changed';
    assert.equal(predict(rows).status,'blocked',key);
  }
});

test('future instrument break blocks scoring without changing prior conditional prediction',()=>{
  const rows=history(), future=wave('2026-09',77);
  const before=predict(rows);
  future.value.instrumentVersion='instrument-v2';
  future.value.comparability='blocked-instrument-break';
  assert.deepEqual(predict([...rows,future]),before);
  const scoring=scoreSatisfaction(replay([...rows,future],FINAL),before.predictions);
  assert.deepEqual(scoring.reasons,['future-wave-identity-mismatch']);
  assert.deepEqual(scoring.methods,{});
});

test('future labels and late revisions never enter as-of forecasts',()=>{
  const rows=history();
  const revised={...wave('2026-03',99),revision:2,supersedes:1,simulatedAvailableAt:'2026-07-01T00:00:00.000Z'};
  assert.deepEqual(predict([...rows,revised,wave('2026-09',10)]),predict(rows));
  const leaked=replay(rows);leaked.records[7].simulatedAvailableAt='2026-07-01T00:00:00.000Z';
  assert.throws(()=>forecastSatisfaction(leaked,['2026-09']));
  const wrongBoundary={...replay(rows),truth:[]};
  assert.throws(()=>forecastSatisfaction(wrongBoundary,['2026-09']));
});

test('published correction becomes usable only after its release',()=>{
  const rows=history(); masked(rows[7],'partial');
  const correction={...wave('2026-03',70),revision:2,supersedes:1,simulatedAvailableAt:'2026-07-01T00:00:00.000Z'};
  assert.equal(predict([...rows,correction]).status,'blocked');
  const after=forecastSatisfaction(replay([...rows,correction],'2026-07-02T00:00:00.000Z'),['2026-09']);
  assert.equal(after.status,'predicted');assert.equal(after.predictions[0]['last-wave'],70);
  assert.equal(after.audit.support.at(-1).revision,2);
});

test('unknown or withheld final labels block all metrics',()=>{
  const rows=history(), predictions=predict(rows).predictions;
  for(const status of ['partial','missing','suppressed']) {
    assert.equal(scoreSatisfaction(replay([...rows,masked(wave('2026-09'),status)],FINAL),predictions).status,'blocked');
  }
  assert.equal(scoreSatisfaction(replay(rows,FINAL),predictions).status,'blocked');
});

test('equal wave weights produce exact percentage-point errors',()=>{
  const rows=history();
  const result=forecastSatisfaction(replay(rows),['2026-09','2026-12']);
  const scored=scoreSatisfaction(replay([...rows,wave('2026-09',50),wave('2026-12',80)],FINAL),result.predictions);
  assert.deepEqual(scored.methods['last-wave'],{n:2,mae:15,rmse:Math.sqrt(250)});
});

test('monthly interpolation, past targets and duplicate targets are rejected',()=>{
  for(const months of [['2026-07'],['2026-06'],['2026-09','2026-09'],[]]) {
    assert.equal(forecastSatisfaction(replay(history()),months).status,'blocked');
  }
});
