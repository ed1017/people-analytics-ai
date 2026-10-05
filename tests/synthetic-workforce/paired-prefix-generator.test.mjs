import test from 'node:test';
import assert from 'node:assert/strict';
import {generatePairedPrefix} from '../../lib/ml/paired-prefix-turnover/generator.mjs';
import {replaySynthetic} from '../../lib/ml/synthetic-workforce/pipeline.mjs';
import {digest,rng} from '../../lib/ml/synthetic-workforce/common.mjs';
import protocol from '../../lib/ml/paired-prefix-turnover/protocol.json' with {type:'json'};
const example=generatePairedPrefix(3001);
const original=example.branches['no-shock'],shock=example.branches.shock;

test('paired-prefix preserves every pre-July truth row, vintage and as-of input',()=>{
  for(const domain of ['company','groups']) {
    assert.deepEqual(original[domain].truth.filter(row=>row.month<'2026-07'),shock[domain].truth.filter(row=>row.month<'2026-07'));
    assert.deepEqual(original[domain].releases.filter(row=>row.value.month<'2026-07'),shock[domain].releases.filter(row=>row.value.month<'2026-07'));
    for(const cutoff of ['2024-12-31T23:59:59.999Z',protocol.origin])assert.equal(digest(replaySynthetic('turnover',original[domain].releases,cutoff)),digest(replaySynthetic('turnover',shock[domain].releases,cutoff)));
  }
});
test('paired-prefix fixes ordinary flows while extra exits reconcile changed stocks and exposure',()=>{
  let previous=shock.company.truth.find(row=>row.month==='2026-06').endHeadcount;
  let totalExtra=0;
  for(const month of shock.company.truth.filter(row=>row.month>='2026-07')) {
    const base=original.company.truth.find(row=>row.month===month.month);
    assert.equal(month.startHeadcount,previous);
    let exposure=0,voluntary=0;
    for(const [i,day]of month.daily.entries()) {
      assert.equal(day.starts,base.daily[i].starts);assert.equal(day.otherExits,base.daily[i].otherExits);
      assert.ok(day.voluntaryExits>=base.daily[i].voluntaryExits);
      totalExtra+=day.voluntaryExits-base.daily[i].voluntaryExits;
      assert.equal(day.startHeadcount,previous);
      assert.equal(day.endHeadcount,previous+day.starts-day.voluntaryExits-day.otherExits);
      assert.ok(day.endHeadcount>=0);previous=day.endHeadcount;exposure+=previous;voluntary+=day.voluntaryExits;
    }
    assert.equal(month.voluntaryExits,voluntary);assert.equal(month.exposure.personDays,exposure);assert.equal(month.endHeadcount,previous);
  }
  assert.ok(totalExtra>0);
  assert.deepEqual(original.company.coverage,shock.company.coverage);
  const metadata=row=>{const copy={...row};delete copy.value;return copy;};
  assert.deepEqual(original.company.releases.map(metadata),shock.company.releases.map(metadata));
});
test('paired-prefix groups reconcile daily/monthly counts and person-days in both branches',()=>{
  const fields=['startHeadcount','starts','voluntaryExits','otherExits','endHeadcount'];
  for(const {company,groups}of Object.values(example.branches))for(const month of company.truth) {
    const members=groups.truth.filter(row=>row.month===month.month);
    for(const field of fields)assert.equal(members.reduce((sum,row)=>sum+row[field],0),month[field]);
    for(const [i,day]of month.daily.entries())for(const field of fields)assert.equal(members.reduce((sum,row)=>sum+row.daily[i][field],0),day[field]);
    assert.equal(members.reduce((sum,row)=>sum+row.exposure.personDays,0),month.exposure.personDays);
  }
});
test('paired-prefix excludes reserved workforce outcomes and assignment labels from releases',()=>{
  assert.equal(example.config.months,69);
  for(const branch of Object.values(example.branches)) {
    assert.equal(branch.company.truth.length,69);assert.equal(branch.company.truth.at(-1).month,'2026-09');
    for(const domain of ['company','groups'])for(const row of branch[domain].releases) {
      assert.ok(row.value.month<='2026-09');
      assert.ok(!JSON.stringify(row.value).match(/"(?:seed|branch|assignment|chosenBranch|shock)"/));
    }
  }
  assert.equal(example.assignment.assignedAt,protocol.assignment.assignedAt);
  assert.equal(example.assignment.branch,rng(3001,protocol.assignment.stream)()<.5?'shock':'no-shock');
});
test('paired-prefix retains small-group and complementary suppression with no numeric leakage',()=>{
  for(const branch of Object.values(example.branches)) {
    assert.ok(branch.groups.releases.some(row=>row.status==='suppressed'));
    for(const row of branch.groups.releases.filter(row=>row.status==='suppressed')) {
      for(const field of ['startHeadcount','starts','voluntaryExits','otherExits','endHeadcount'])assert.equal(row.value[field],null);
      assert.equal(row.value.exposure.personDays,null);assert.equal(row.value.exposure.meanHeadcount,null);
    }
    for(const month of branch.company.truth) {
      const rows=branch.groups.releases.filter(row=>row.value.month===month.month&&row.revision===1);
      assert.notEqual(rows.filter(row=>row.status==='suppressed').length,1);
    }
  }
});
test('paired-prefix reproduces seeds, changes independent seed histories and rejects out-of-protocol seeds',()=>{
  assert.equal(digest(example),digest(generatePairedPrefix(3001)));
  assert.notEqual(digest(example.branches['no-shock'].company.truth),digest(generatePairedPrefix(3002).branches['no-shock'].company.truth));
  for(const seed of [3000,3101,NaN,3001.5,'3001',null])assert.throws(()=>generatePairedPrefix(seed),/frozen/);
});
