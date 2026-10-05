import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generateHiring} from '../../lib/ml/synthetic-workforce/hiring.mjs';
import {generateTurnover} from '../../lib/ml/synthetic-workforce/turnover.mjs';
const config=JSON.parse(await readFile(new URL('../../lib/ml/synthetic-workforce/protocol.json',import.meta.url),'utf8'));
const make=(family='stationary',seed=17)=>generateTurnover(config,{seed,family,startEvents:generateHiring(config,{seed,family}).startEvents});
test('all frozen cases exactly reconcile every daily stock and monthly flow to hiring starts',()=>{
 for(const family of config.families)for(const seed of config.seeds){
  const hiring=generateHiring(config,{seed,family}),result=generateTurnover(config,{seed,family,startEvents:hiring.startEvents});
  let previous=config.initialHeadcount;
  for(const row of result.truth){
   assert.equal(row.startHeadcount,previous);assert.equal(row.endHeadcount,row.startHeadcount+row.starts-row.voluntaryExits-row.otherExits);
   assert.equal(row.starts,hiring.startEvents.filter(e=>e.at.startsWith(row.month)).reduce((s,e)=>s+e.count,0));
   let dailyPrevious=row.startHeadcount;
   for(const day of row.daily){assert.equal(day.startHeadcount,dailyPrevious);assert.equal(day.endHeadcount,day.startHeadcount+day.starts-day.voluntaryExits-day.otherExits);assert(day.endHeadcount>=0);dailyPrevious=day.endHeadcount;}
   assert.equal(row.exposure.personDays,row.daily.reduce((s,d)=>s+d.endHeadcount,0));assert.equal(row.exposure.meanHeadcount,row.exposure.personDays/row.daily.length);previous=row.endHeadcount;
  }
 }
});
test('new experiment is deterministic and its streams change with seed',()=>{assert.deepEqual(make(),make());assert.notDeepEqual(make().truth,make('stationary',29).truth);});
test('confirmed zero, missing and partial never collapse into each other',()=>{
 const ordinary=make();assert.equal(ordinary.truth[7].voluntaryExits,0);assert.equal(ordinary.releases.find(r=>r.recordKey==='turnover:2021-08').value.voluntaryExits,0);
 const stress=make('reporting-stress');for(const status of ['missing','partial']){const r=stress.releases.find(r=>r.status===status);assert(r);assert.equal(r.value.voluntaryExits,null);assert.equal(r.value.exposure.personDays,null);}
});
test('release revisions change classification without overwriting earlier count vintages or stocks',()=>{
 const result=make(),rows=result.releases.filter(r=>r.recordKey==='turnover:2022-11');assert.equal(rows.length,2);assert.equal(rows[1].supersedes,1);assert(rows[0].simulatedAvailableAt<rows[1].simulatedAvailableAt);
 assert.equal(rows[1].value.voluntaryExits-rows[0].value.voluntaryExits,2);assert.equal(rows[0].value.otherExits-rows[1].value.otherExits,2);assert.equal(rows[1].value.endHeadcount,rows[0].value.endHeadcount);
 for(const r of result.releases){assert.equal(r.sourceObservedAt,null);assert(r.simulatedAvailableAt>=r.effectiveAt);}
});
