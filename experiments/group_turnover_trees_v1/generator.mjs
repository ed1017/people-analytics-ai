import assert from 'node:assert/strict';
import protocol from './generator-protocol.json' with {type:'json'};
import source from '../../lib/ml/synthetic-workforce/protocol.json' with {type:'json'};
import {generateHiring} from '../../lib/ml/synthetic-workforce/hiring.mjs';
import {generateTurnover} from '../../lib/ml/synthetic-workforce/turnover.mjs';
import {partitionTurnoverGroups} from '../../lib/ml/synthetic-workforce/groups.mjs';
import {rng,binomial} from '../../lib/ml/synthetic-workforce/common.mjs';
import {validateReleases,replaySynthetic} from '../../lib/ml/synthetic-workforce/pipeline.mjs';

const fields=['startHeadcount','starts','voluntaryExits','otherExits','endHeadcount'];
function reconcile(company,groups) {
  let prior=8400;
  for(const month of company.truth) {
    const rows=groups.truth.filter(row=>row.month===month.month);
    assert.equal(rows.length,4);assert.equal(month.startHeadcount,prior);
    for(const field of fields)assert.equal(rows.reduce((sum,row)=>sum+row[field],0),month[field]);
    let personDays=0;
    for(const [i,day]of month.daily.entries()) {
      assert.equal(day.startHeadcount,prior);
      assert.equal(day.endHeadcount,day.startHeadcount+day.starts-day.voluntaryExits-day.otherExits);
      assert.ok(fields.every(field=>Number.isSafeInteger(day[field])&&day[field]>=0));
      for(const field of fields)assert.equal(rows.reduce((sum,row)=>sum+row.daily[i][field],0),day[field]);
      prior=day.endHeadcount;personDays+=prior;
    }
    assert.equal(month.endHeadcount,prior);assert.equal(month.exposure.personDays,personDays);
    assert.equal(rows.reduce((sum,row)=>sum+row.exposure.personDays,0),personDays);
    assert.equal(month.exposure.meanHeadcount,personDays/month.daily.length);
  }
  validateReleases('turnover',company.releases);validateReleases('turnover',groups.releases);
}

/** Observable signal precedes independently drawn assignments and constructed outcomes. */
export function generateSignalHistory(seed,split) {
  if(!['training','test'].includes(split))throw Error('Unknown signal history split');
  const window=protocol[split];
  if(!Number.isSafeInteger(seed)||seed<window.firstSeed||seed>window.lastSeed)throw Error('Seed outside frozen signal split');
  const config={...structuredClone(source),months:window.months,seeds:Array.from({length:window.lastSeed-window.firstSeed+1},(_,i)=>window.firstSeed+i)};
  const signal=rng(seed,protocol.signal.stream)()<protocol.signal.probabilityOne?1:0;
  const uniform=rng(seed,protocol.assignment.stream)();
  const assignments=Object.fromEntries(Object.entries(protocol.assignment.probabilitiesBySignal).map(([scenario,probabilities])=>[scenario,uniform<probabilities[signal]?'shock':'no-shock']));
  const year=window.origin.slice(0,4);
  const signalRelease={name:protocol.signal.name,value:signal,effectiveAt:`${year}-05-31T23:59:59.999Z`,simulatedAvailableAt:`${year}-06-03T23:59:59.999Z`,sourceObservedAt:null,dataClass:'constructed-synthetic'};
  const hiring=generateHiring(config,{seed,family:protocol.family});
  const company=generateTurnover(config,{seed,family:protocol.family,startEvents:hiring.startEvents});
  const shock=structuredClone(company),random=rng(seed,protocol.shock.stream);
  let stock=null;
  for(const month of shock.truth) {
    if(month.month<window.targets[0])continue;
    if(stock===null)stock=month.startHeadcount;
    month.startHeadcount=stock;
    let voluntary=0,personDays=0;
    const probability=1-(1-protocol.shock.monthlyExtraProbability)**(1/month.daily.length);
    for(const day of month.daily) {
      day.startHeadcount=stock;
      const remaining=stock+day.starts-day.voluntaryExits-day.otherExits;
      assert.ok(Number.isSafeInteger(remaining)&&remaining>=0,'Scheduled flows infeasible in shock branch');
      const extra=binomial(random,remaining,probability);
      day.voluntaryExits+=extra;stock=remaining-extra;day.endHeadcount=stock;
      voluntary+=day.voluntaryExits;personDays+=stock;
    }
    month.voluntaryExits=voluntary;month.endHeadcount=stock;
    month.exposure.personDays=personDays;month.exposure.meanHeadcount=personDays/month.daily.length;
  }
  for(const row of shock.releases)if(row.value.month>=window.targets[0]) {
    assert.equal(row.status,'complete');assert.equal(row.revision,1,'No target-month correction permitted');
    const value=structuredClone(shock.truth.find(month=>month.month===row.value.month));delete value.daily;row.value=value;
  }
  const groups=partitionTurnoverGroups(company,{seed,family:protocol.family});
  const shockGroups=partitionTurnoverGroups(shock,{seed,family:protocol.family});
  reconcile(company,groups);reconcile(shock,shockGroups);
  for(const [left,right]of [[company,shock],[groups,shockGroups]]) {
    assert.deepEqual(left.truth.filter(row=>row.month<window.targets[0]),right.truth.filter(row=>row.month<window.targets[0]));
    assert.deepEqual(left.releases.filter(row=>row.value.month<window.targets[0]),right.releases.filter(row=>row.value.month<window.targets[0]));
    assert.deepEqual(replaySynthetic('turnover',left.releases,window.origin),replaySynthetic('turnover',right.releases,window.origin));
  }
  assert.deepEqual(company.coverage,shock.coverage);
  return {seed,split,signalRelease,assignments,
    branches:{'no-shock':{company,groups},shock:{company:shock,groups:shockGroups}}};
}
