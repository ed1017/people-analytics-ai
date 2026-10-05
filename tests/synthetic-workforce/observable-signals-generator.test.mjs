import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSignalHistory} from '../../lib/ml/observable-turnover-signals/generator.mjs';
import {replaySynthetic} from '../../lib/ml/synthetic-workforce/pipeline.mjs';
import {digest,rng} from '../../lib/ml/synthetic-workforce/common.mjs';
import protocol from '../../lib/ml/observable-turnover-signals/protocol.json' with {type:'json'};

// Training example only. No test-range seed is generated before fitted-model custody.
const example=generateSignalHistory(4001,'training');
test('signal release precedes outcomes and independently streamed assignment matches fixed scenarios',()=>{
  const value=rng(4001,protocol.signal.stream)()<.5?1:0;
  assert.deepEqual(example.signalRelease,{name:'announced-workload-pressure',value,effectiveAt:'2025-05-31T23:59:59.999Z',simulatedAvailableAt:'2025-06-03T23:59:59.999Z',sourceObservedAt:null,dataClass:'constructed-synthetic'});
  const uniform=rng(4001,protocol.assignment.stream)();
  for(const [scenario,probabilities]of Object.entries(protocol.assignment.probabilitiesBySignal))assert.equal(example.assignments[scenario],uniform<probabilities[value]?'shock':'no-shock');
  assert.equal(example.seed,4001);assert.equal(example.split,'training');
});
test('signal history branches preserve every prefix vintage and as-of snapshot',()=>{
  const base=example.branches['no-shock'],shock=example.branches.shock;
  for(const domain of ['company','groups']) {
    assert.deepEqual(base[domain].truth.filter(row=>row.month<'2025-07'),shock[domain].truth.filter(row=>row.month<'2025-07'));
    assert.deepEqual(base[domain].releases.filter(row=>row.value.month<'2025-07'),shock[domain].releases.filter(row=>row.value.month<'2025-07'));
    assert.deepEqual(replaySynthetic('turnover',base[domain].releases,protocol.training.origin),replaySynthetic('turnover',shock[domain].releases,protocol.training.origin));
  }
  assert.deepEqual(base.company.coverage,shock.company.coverage);
});
test('signal history fixed scheduled flows and added exits reconcile stock and person-days',()=>{
  const base=example.branches['no-shock'].company,shock=example.branches.shock.company;
  let previous=shock.truth.find(row=>row.month==='2025-06').endHeadcount,extra=0;
  for(const month of shock.truth.filter(row=>row.month>='2025-07')){
    const original=base.truth.find(row=>row.month===month.month);
    let personDays=0,voluntary=0;
    assert.equal(month.startHeadcount,previous);
    for(const [i,day]of month.daily.entries()){
      assert.equal(day.startHeadcount,previous);assert.equal(day.starts,original.daily[i].starts);assert.equal(day.otherExits,original.daily[i].otherExits);
      assert.ok(day.voluntaryExits>=original.daily[i].voluntaryExits);extra+=day.voluntaryExits-original.daily[i].voluntaryExits;
      assert.equal(day.endHeadcount,previous+day.starts-day.voluntaryExits-day.otherExits);assert.ok(day.endHeadcount>=0);
      previous=day.endHeadcount;personDays+=previous;voluntary+=day.voluntaryExits;
    }
    assert.equal(month.voluntaryExits,voluntary);assert.equal(month.exposure.personDays,personDays);assert.equal(month.endHeadcount,previous);
  }
  assert.ok(extra>0);
});
test('signal history group accounting, suppression and release input boundary remain unchanged',()=>{
  const fields=['startHeadcount','starts','voluntaryExits','otherExits','endHeadcount'];
  for(const {company,groups}of Object.values(example.branches)){
    assert.equal(company.truth.length,57);assert.equal(company.truth.at(-1).month,'2025-09');
    for(const month of company.truth){
      const rows=groups.truth.filter(row=>row.month===month.month);
      for(const field of fields)assert.equal(rows.reduce((sum,row)=>sum+row[field],0),month[field]);
      assert.equal(rows.reduce((sum,row)=>sum+row.exposure.personDays,0),month.exposure.personDays);
      for(const [i,day]of month.daily.entries())for(const field of fields)assert.equal(rows.reduce((sum,row)=>sum+row.daily[i][field],0),day[field]);
    }
    for(const row of groups.releases){
      assert.ok(row.value.month<='2025-09');
      assert.ok(!JSON.stringify(row.value).match(/"(?:seed|branch|assignment|signal|shock)"/));
      if(row.status!=='complete')for(const field of fields)assert.equal(row.value[field],null);
    }
    assert.ok(groups.releases.some(row=>row.status==='suppressed'));
  }
});
test('future outcome mutation cannot change separately released signal or prefix values',()=>{
  const changed=structuredClone(example),before=digest(changed.signalRelease);
  const origin=replaySynthetic('turnover',changed.branches.shock.groups.releases,protocol.training.origin);
  changed.branches.shock.company.truth.at(-1).voluntaryExits=999999;
  changed.branches.shock.groups.truth.at(-1).voluntaryExits=999999;
  assert.equal(digest(changed.signalRelease),before);
  assert.deepEqual(replaySynthetic('turnover',changed.branches.shock.groups.releases,protocol.training.origin),origin);
});
test('signal history training seed is reproducible and split ranges fail closed',()=>{
  assert.equal(digest(example),digest(generateSignalHistory(4001,'training')));
  for(const [seed,split]of [[4000,'training'],[4101,'training'],[5001,'training'],[4001,'test'],[5000,'test'],[5101,'test'],[4001,'unknown'],['4001','training'],[NaN,'training']])assert.throws(()=>generateSignalHistory(seed,split));
});
