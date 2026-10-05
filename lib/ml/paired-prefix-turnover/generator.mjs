import assert from 'node:assert/strict';
import protocol from './protocol.json' with {type:'json'};
import source from '../synthetic-workforce/protocol.json' with {type:'json'};
import {generateHiring} from '../synthetic-workforce/hiring.mjs';
import {generateTurnover} from '../synthetic-workforce/turnover.mjs';
import {partitionTurnoverGroups} from '../synthetic-workforce/groups.mjs';
import {rng,binomial} from '../synthetic-workforce/common.mjs';
import {validateReleases,replaySynthetic} from '../synthetic-workforce/pipeline.mjs';

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

/** Paired constructed continuations. Assignment and truth never enter release values. */
export function generatePairedPrefix(seed) {
  if(!Number.isSafeInteger(seed)||seed<protocol.seeds.first||seed>protocol.seeds.last)throw Error('Seed outside frozen paired-prefix range');
  const config={...structuredClone(source),months:protocol.months,seeds:Array.from({length:protocol.seeds.last-protocol.seeds.first+1},(_,i)=>protocol.seeds.first+i)};
  const branch=rng(seed,protocol.assignment.stream)()<protocol.assignment.probabilityShock?'shock':'no-shock';
  const hiring=generateHiring(config,{seed,family:protocol.baseFamily});
  const company=generateTurnover(config,{seed,family:protocol.baseFamily,startEvents:hiring.startEvents});
  const shock=structuredClone(company),random=rng(seed,protocol.shock.stream);
  let stock=null;
  for(const month of shock.truth) {
    if(month.month<protocol.targets[0])continue;
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
  for(const row of shock.releases)if(row.value.month>=protocol.targets[0]) {
    assert.equal(row.status,'complete');assert.equal(row.revision,1,'No target-month correction permitted');
    const value=structuredClone(shock.truth.find(month=>month.month===row.value.month));delete value.daily;row.value=value;
  }
  const groups=partitionTurnoverGroups(company,{seed,family:protocol.baseFamily});
  const shockGroups=partitionTurnoverGroups(shock,{seed,family:protocol.baseFamily});
  reconcile(company,groups);reconcile(shock,shockGroups);
  for(const [left,right]of [[company,shock],[groups,shockGroups]]) {
    assert.deepEqual(left.truth.filter(row=>row.month<protocol.targets[0]),right.truth.filter(row=>row.month<protocol.targets[0]));
    assert.deepEqual(left.releases.filter(row=>row.value.month<protocol.targets[0]),right.releases.filter(row=>row.value.month<protocol.targets[0]));
    assert.deepEqual(replaySynthetic('turnover',left.releases,protocol.origin),replaySynthetic('turnover',right.releases,protocol.origin));
  }
  assert.deepEqual(company.coverage,shock.coverage);
  return {seed,config,assignment:{branch,probabilityShock:protocol.assignment.probabilityShock,assignedAt:protocol.assignment.assignedAt},
    branches:{'no-shock':{company,groups},shock:{company:shock,groups:shockGroups}}};
}
