import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateHiring} from '../../lib/ml/synthetic-workforce/hiring.mjs';
import {DAY,digest} from '../../lib/ml/synthetic-workforce/common.mjs';

const config = JSON.parse(readFileSync(new URL('../../lib/ml/synthetic-workforce/protocol.json',import.meta.url)));
const run = (family='stationary',seed=17) => generateHiring(config,{seed,family});
test('hiring generator is reproducible across every frozen family and seed', () => {
  for (const family of config.families) for (const seed of config.seeds) {
    assert.equal(digest(run(family,seed)),digest(run(family,seed)));
  }
  assert.notEqual(digest(run('stationary',17)),digest(run('stationary',29)));
  assert.throws(()=>run('chosen-after-evaluation'));
});
test('hiring truth starts reconcile aggregate workforce entries, without person identifiers', () => {
  for (const family of config.families) {
    const output=run(family), expected=new Map();
    for(const row of output.truth) if(row.actualStartAt && row.count) expected.set(row.actualStartAt,(expected.get(row.actualStartAt)??0)+row.count);
    assert.deepEqual(output.startEvents,[...expected].sort(([a],[b])=>a.localeCompare(b)).map(([at,count])=>({at,count})));
    assert.equal(output.truth.length,72*7);
    assert.ok(!JSON.stringify(output).includes('employeeId'));
    assert.ok(!JSON.stringify(output).includes('requisitionId'));
  }
});
test('hiring releases account for every opening with mutually exclusive dispositions', () => {
  for(const family of config.families) for(const row of run(family).releases) {
    assert.equal(row.sourceObservedAt,null);
    assert.ok(row.simulatedAvailableAt>=row.effectiveAt);
    if(row.status!=='complete') {
      assert.equal(row.value.openingCount,null);assert.equal(row.value.dispositions,null);
      assert.equal(row.value.actualStartEvents,null);continue;
    }
    const v=row.value;
    assert.ok(Object.values(v.dispositions).every(n=>Number.isSafeInteger(n)&&n>=0));
    assert.equal(Object.values(v.dispositions).reduce((a,b)=>a+b,0),v.openingCount);
    assert.equal(v.actualStartEvents.reduce((sum,event)=>sum+event.count,0),v.dispositions.started);
    assert.equal(v.rightCensoredCount,v.dispositions.open+v.dispositions.accepted);
    assert.equal(v.horizonMature,v.followupDays>=90);
    for(const event of v.actualStartEvents) assert.ok(event.at<=row.simulatedAvailableAt);
    for(const event of v.plannedStartEvents) assert.ok(event.acceptedAt<=row.simulatedAvailableAt);
  }
});
test('hiring age maturity is distinct from complete horizon labels under reporting lags', () => {
  for(const family of ['stationary','reporting-stress']) {
    const output=run(family), bound=family==='reporting-stress'?39:3;
    for(const row of output.releases.filter(row=>row.value.followupDays===90)) {
      assert.equal(row.value.horizonMature,true);
      assert.equal(row.value.horizonLabelsComplete,false);
      assert.equal(Date.parse(row.value.knownOutcomeThrough),Date.parse(row.simulatedAvailableAt)-bound*DAY);
    }
    for(const row of output.releases.filter(row=>row.value.followupDays===90+bound)) {
      assert.equal(row.value.horizonLabelsComplete,true);
      assert.equal(Date.parse(row.value.knownOutcomeThrough),Date.parse(row.effectiveAt)+90*DAY);
      for(const event of row.value.actualStartEvents) assert.ok(event.at<=row.simulatedAvailableAt);
    }
    for(const row of output.releases.filter(row=>row.status!=='complete')) {
      assert.equal(row.value.horizonLabelsComplete,false);assert.equal(row.value.knownOutcomeThrough,null);
    }
  }
});
test('hiring fixed reversal moves standard starts beyond 90 days without changing earlier release outcomes', () => {
  const output=run('regime-reversal');
  const fraction=month=>{
    const rows=output.truth.filter(row=>row.month===month);
    return rows.filter(row=>row.actualStartAt&&Date.parse(row.actualStartAt)-Date.parse(row.openedAt)<=90*DAY).reduce((sum,row)=>sum+row.count,0)/rows.reduce((sum,row)=>sum+row.count,0);
  };
  assert.ok(fraction('2026-07')<fraction('2026-06'));
  const cohort=output.truth.find(row=>row.month==='2026-07'&&row.bucket==='standard-start');
  assert.equal((Date.parse(cohort.actualStartAt)-Date.parse(cohort.openedAt))/DAY,110);
  const initial=output.releases.find(row=>row.recordKey===cohort.recordKey);
  assert.deepEqual(initial.value.actualStartEvents,[]);
  const before=JSON.stringify(initial);
  output.truth.push({...cohort,actualStartAt:'2030-01-01T00:00:00.000Z'});
  assert.equal(JSON.stringify(initial),before);
});
test('hiring opening releases contain no future outcomes and chains remain contiguous', () => {
  const output=run('reporting-stress'), last=new Map();
  for(const row of output.releases) {
    const prior=last.get(row.recordKey);
    assert.equal(row.revision,(prior?.revision??0)+1);
    assert.equal(row.supersedes,prior?.revision??null);
    if(prior) assert.ok(row.simulatedAvailableAt>=prior.simulatedAvailableAt);
    else if(row.status==='complete') {
      assert.equal(row.value.dispositions.open,row.value.openingCount);
      assert.equal(row.value.dispositions.started,0);
      assert.deepEqual(row.value.actualStartEvents,[]);
      assert.deepEqual(row.value.plannedStartEvents,[]);
    }
    last.set(row.recordKey,row);
  }
  const finalStarts=[...last.values()].reduce((sum,row)=>sum+row.value.dispositions.started,0);
  assert.equal(finalStarts,output.startEvents.reduce((sum,event)=>sum+event.count,0));
});
test('hiring stress separates missing, partial, true zero, late reporting and correction', () => {
  const output=run('reporting-stress');
  for(const status of ['complete','partial','missing']) assert.ok(output.releases.some(row=>row.status===status));
  assert.ok(output.releases.some(row=>row.status==='complete'&&row.value.openingCount===0));
  assert.ok(output.releases.some(row=>row.value.correction));
  assert.ok(output.releases.some(row=>row.value.actualStartEvents?.some(event=>Date.parse(row.simulatedAvailableAt)-Date.parse(event.at)>20*DAY)));
  for(const row of output.releases.filter(row=>row.value.correction)) assert.ok(row.revision>1);
});
test('hiring 90-day maturity does not erase late, cancelled, no-show or unresolved cohorts', () => {
  const output=run();
  const horizon=output.releases.filter(row=>row.value.followupDays===90&&row.value.openingCount>0);
  assert.equal(horizon.length,69);
  for(const row of horizon) {
    assert.ok(row.value.dispositions.accepted>0);
    assert.ok(row.value.dispositions.cancelled>0);
    assert.ok(row.value.dispositions.noShow>0);
    assert.ok(row.value.rightCensoredCount>0);
  }
  for(const row of output.truth.filter(row=>row.bucket==='late-start')) assert.ok(Date.parse(row.actualStartAt)-Date.parse(row.openedAt)>90*DAY);
  assert.ok(output.truth.some(row=>row.plannedStartAt!==null&&row.actualStartAt===null));
  assert.ok(output.coverage.every(row=>row.cohortCoverage==='all-openings'&&row.sourceObservedAt===null));
});
