import test from 'node:test';
import assert from 'node:assert/strict';
import {monthAdd,monthEnd,dayAdd,release} from '../lib/ml/synthetic-workforce/common.mjs';
import {replaySynthetic} from '../lib/ml/synthetic-workforce/pipeline.mjs';
import {forecastTurnover,scoreTurnover} from '../lib/ml/synthetic-domain-predictions/turnover.mjs';
function fixture() {
  return Array.from({length:30},(_,i)=>{
    const month=monthAdd('2024-01',i),end=monthEnd(month),n=i===10?0:20+i;
    return release(`turnover:${month}`,1,end,dayAdd(end,3),{month,startHeadcount:1000,starts:50,voluntaryExits:n,otherExits:1,endHeadcount:1049-n,countStatus:'recorded',exposure:{status:'complete',personDays:30000,days:30,meanHeadcount:1000,unit:'person-days',definitionVersion:'test'}});
  });
}
const cutoff='2026-06-30T23:59:59.999Z',months=['2026-07','2026-08','2026-09'];
test('count forecast respects unreleased June gap and keeps confirmed zero',()=>{
  const result=forecastTurnover(replaySynthetic('turnover',fixture(),cutoff),months);
  assert.equal(result.status,'predicted'); assert.equal(result.audit.trainingEnd,'2026-05'); assert.equal(result.audit.forecastGapMonths,2);
  assert.deepEqual(result.audit.recordedZeroMonths,['2024-11']); assert.equal(result.interval,null);assert.equal(result.rate,null);
});
test('future changed releases never alter origin prediction',()=>{
  const rows=fixture(),before=forecastTurnover(replaySynthetic('turnover',rows,cutoff),months);
  rows.at(-1).value.voluntaryExits+=100;rows.at(-1).value.otherExits+=0;rows.at(-1).value.endHeadcount-=100;
  assert.deepEqual(forecastTurnover(replaySynthetic('turnover',rows,cutoff),months),before);
});
test('missing or masked recent month blocks instead of compressing calendar',()=>{
  const snapshot=replaySynthetic('turnover',fixture(),cutoff);snapshot.records.splice(-2,1);
  assert.equal(forecastTurnover(snapshot,months).status,'blocked');
});
test('late or foreign provenance snapshots reject; invalid source never becomes a forecast',()=>{
  const snapshot=replaySynthetic('turnover',fixture(),cutoff);
  const bad=structuredClone(snapshot);bad.observationBasis='source-evidenced';assert.throws(()=>forecastTurnover(bad,months));
  snapshot.records.at(-1).simulatedAvailableAt='2026-07-01T00:00:00.000Z';assert.throws(()=>forecastTurnover(snapshot,months));
});
test('future target labels missing produces abstention',()=>{
  const snapshot=replaySynthetic('turnover',fixture(),cutoff),predictions=forecastTurnover(snapshot,months).predictions;
  assert.equal(scoreTurnover(snapshot,predictions).status,'blocked');
});
