import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {partitionTurnoverGroups} from '../../lib/ml/synthetic-workforce/groups.mjs';
import {generateTurnover} from '../../lib/ml/synthetic-workforce/turnover.mjs';
import {release,digest} from '../../lib/ml/synthetic-workforce/common.mjs';
import {validateReleases,replaySynthetic} from '../../lib/ml/synthetic-workforce/pipeline.mjs';
const config=JSON.parse(readFileSync(new URL('../../lib/ml/synthetic-workforce/protocol.json',import.meta.url)));
const make=(family='stationary',seed=17)=>{
  const company=generateTurnover(config,{seed,family,startEvents:[{at:'2021-01-10T00:00:00.000Z',count:100}]});
  return {company,groups:partitionTurnoverGroups(company,{seed,family})};
};
const fields=['startHeadcount','starts','voluntaryExits','otherExits','endHeadcount'];
test('groups reconcile every day, month and person-day to company without negative stocks',()=>{
  const {company,groups}=make();
  for(const month of company.truth){
    const rows=groups.truth.filter(row=>row.month===month.month);
    for(const field of fields)assert.equal(rows.reduce((sum,row)=>sum+row[field],0),month[field]);
    assert.equal(rows.reduce((sum,row)=>sum+row.exposure.personDays,0),month.exposure.personDays);
    for(const [i,day]of month.daily.entries())for(const field of fields)assert.equal(rows.reduce((sum,row)=>sum+row.daily[i][field],0),day[field]);
    for(const row of rows){
      assert.ok(row.daily.every(day=>fields.every(field=>Number.isSafeInteger(day[field])&&day[field]>=0)));
      assert.equal(row.exposure.personDays,row.daily.reduce((sum,day)=>sum+day.endHeadcount,0));
      assert.equal(row.exposure.meanHeadcount,row.exposure.personDays/row.daily.length);
    }
  }
});
test('groups deterministic seed streams and initial stock guard',()=>{
  const {company,groups}=make();
  assert.equal(digest(groups),digest(partitionTurnoverGroups(company,{seed:17,family:'stationary'})));
  assert.notEqual(digest(groups),digest(partitionTurnoverGroups(company,{seed:29,family:'stationary'})));
  const invalid=structuredClone(company);invalid.truth[0].startHeadcount=8399;
  assert.throws(()=>partitionTurnoverGroups(invalid,{seed:17,family:'stationary'}),/8400/);
});
test('group withholding removes all numeric data and preserves company unknown state',()=>{
  const {company,groups}=make('reporting-stress');
  validateReleases('turnover',groups.releases);
  for(const row of groups.releases){
    const source=company.releases.find(item=>item.value.month===row.value.month&&item.revision===row.revision);
    assert.equal(row.simulatedAvailableAt,source.simulatedAvailableAt);assert.equal(row.effectiveAt,source.effectiveAt);
    assert.equal(row.supersedes,source.supersedes);
    if(source.status!=='complete')assert.equal(row.status,source.status);
    if(row.status!=='complete'){
      for(const field of fields)assert.equal(row.value[field],null);
      assert.equal(row.value.exposure.personDays,null);assert.equal(row.value.exposure.meanHeadcount,null);assert.equal(row.value.exposure.days,null);
      assert.equal(JSON.stringify(row.value).match(/:\d/g),null);
    }else{
      assert.ok(Math.min(row.value.startHeadcount,row.value.endHeadcount)>=50);
      assert.ok(row.value.voluntaryExits===0||row.value.voluntaryExits>=5);
    }
  }
  for(const source of company.releases.filter(row=>row.status==='complete')){
    const same=groups.releases.filter(row=>row.value.month===source.value.month&&row.revision===source.revision);
    assert.notEqual(same.filter(row=>row.status==='suppressed').length,1);
  }
  assert.ok(groups.truth.some(row=>row.groupId==='group-c'&&row.startHeadcount>=50&&row.endHeadcount>=50&&row.voluntaryExits>0&&row.voluntaryExits<5));
  replaySynthetic('turnover',groups.releases,config.finalScoringCutoff);
});
test('group zero count stays visible when sufficiently large; complementary suppression hides another group',()=>{
  const at='2021-01-31T00:00:00.000Z';
  const value={month:'2021-01',startHeadcount:8400,starts:0,voluntaryExits:0,otherExits:0,endHeadcount:8400,countStatus:'recorded',exposure:{status:'complete',personDays:8400,days:1,meanHeadcount:8400,unit:'person-days',definitionVersion:'fixture'}};
  const company={truth:[{...value,daily:[{at,...Object.fromEntries(fields.map(field=>[field,value[field]]))}]}],releases:[release('turnover:2021-01',1,at,at,value)]};
  const output=partitionTurnoverGroups(company,{seed:17,family:'stationary'});
  assert.deepEqual(output.releases.map(row=>[row.value.groupId,row.status]),[['group-a','complete'],['group-b','complete'],['group-c','suppressed'],['group-d','suppressed']]);
  assert.equal(output.releases[0].value.voluntaryExits,0);
  assert.equal(output.truth[2].startHeadcount,159);
});
test('group classification corrections retain clocks, exposure and stocks',()=>{
  const {company,groups}=make('reporting-stress');
  for(const source of company.releases.filter(row=>row.status==='complete')){
    const truth=groups.truth.filter(row=>row.month===source.value.month);
    const biggest=[...truth].sort((a,b)=>b.endHeadcount-a.endHeadcount||a.groupId.localeCompare(b.groupId))[0];
    const delta=truth.reduce((sum,row)=>sum+row.voluntaryExits,0)-source.value.voluntaryExits;
    const row=groups.releases.find(row=>row.value.groupId===biggest.groupId&&row.value.month===source.value.month&&row.revision===source.revision);
    if(row.status==='complete'){
      assert.equal(row.value.voluntaryExits,biggest.voluntaryExits-Math.min(delta,biggest.voluntaryExits));
      assert.equal(row.value.otherExits,biggest.otherExits+Math.min(delta,biggest.voluntaryExits));
      assert.equal(row.value.endHeadcount,biggest.endHeadcount);assert.deepEqual(row.value.exposure,biggest.exposure);
    }
  }
});
