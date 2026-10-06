import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateHiring} from '../lib/ml/synthetic-workforce/hiring.mjs';
import {replaySynthetic} from '../lib/ml/synthetic-workforce/pipeline.mjs';
import {dayAdd} from '../lib/ml/synthetic-workforce/common.mjs';
import {fitHiringCohorts, predictHiringCohorts, scoreHiringCohorts} from '../lib/ml/hiring-cohort-model.mjs';
import {forecastHiring, scoreHiring} from '../lib/ml/synthetic-domain-predictions/hiring.mjs';

// Existing generator qualification seed only; do not inspect frozen assessment seeds here.
const config=JSON.parse(readFileSync(new URL('../lib/ml/synthetic-workforce/protocol.json',import.meta.url)));
const history=family=>generateHiring(config,{seed:17,family}).releases;
const ordinary=history('stationary'), stress=history('reporting-stress');
const origin='2026-06-30T23:59:59.999Z', months=['2026-07','2026-08','2026-09'];
const snapshot=(rows=ordinary,cutoff=origin)=>replaySynthetic('hiring',rows,cutoff);
const values=row=>({month:row.value.month,openings:row.value.openingCount,started:row.value.actualStartEvents.filter(e=>e.at<=dayAdd(row.effectiveAt,90)).reduce((s,e)=>s+e.count,0)});

test('hiring adapter uses 36 calendar months and reproduces unchanged aggregate models',()=>{
  const input=snapshot(), before=structuredClone(input), result=forecastHiring(input,months);
  assert.equal(result.status,'predicted'); assert.equal(result.interval,null); assert.equal(result.operationallyQualified,false);
  assert.equal(result.audit.trainingStart,'2023-04'); assert.equal(result.audit.trainingEnd,'2026-03');
  assert.equal(result.audit.selectedRevisions.length,36);
  assert.deepEqual(result.audit.zeroOpeningMonths,['2023-11','2025-11']);
  assert.equal(result.audit.positiveCohorts,34);
  const rows=input.records.filter(r=>r.value.month>='2023-04'&&r.value.month<='2026-03').map(values).filter(r=>r.openings);
  assert.deepEqual(result.predictions,predictHiringCohorts(fitHiringCohorts(rows),months));
  assert.deepEqual(input,before);
});
test('two clocks exclude a 90-day mature cohort until bounded reporting completes',()=>{
  const early=forecastHiring(snapshot(stress,'2026-03-31T23:59:59.999Z'),['2026-04']);
  assert.equal(early.status,'predicted'); assert.equal(early.audit.trainingEnd,'2025-11');
  assert(early.audit.excludedImmatureMonths.includes('2026-01'));
  const at=snapshot(stress,'2026-05-10T00:00:00.000Z');
  const january=at.records.find(r=>r.value.month==='2026-01');
  assert.equal(january.value.horizonLabelsComplete,true);
  assert.equal(forecastHiring(at,['2026-06']).audit.trainingEnd,'2026-01');
});
test('missing intermediate or latest due cohorts abstain rather than backtracking',()=>{
  for(const month of ['2024-05','2026-03']) {
    const input=snapshot(); input.records=input.records.filter(r=>r.value.month!==month);
    const result=forecastHiring(input,months);
    assert.equal(result.status,'blocked'); assert.deepEqual(result.reasons,['missing-calendar-cohort']);
  }
});
test('known overdue incomplete follow-up blocks and does not become a failed start',()=>{
  const input=snapshot(), row=input.records.find(r=>r.value.month==='2026-03');
  row.value.horizonLabelsComplete=false;
  const result=forecastHiring(input,months);
  assert.equal(result.status,'blocked'); assert.deepEqual(result.reasons,['incomplete-horizon-labels']);
});
test('future outcomes and corrections do not enter a pre-origin snapshot',()=>{
  const changed=structuredClone(ordinary);
  for(const row of changed) if(row.effectiveAt>origin && row.status==='complete') {
    row.value.openingCount+=11; row.value.dispositions.cancelled+=11;
  }
  assert.deepEqual(forecastHiring(snapshot(changed),months),forecastHiring(snapshot(),months));
  const input=snapshot(), future=structuredClone(replaySynthetic('hiring',ordinary,config.finalScoringCutoff).records.find(r=>r.value.month==='2026-03'));
  input.records=input.records.map(r=>r.value.month==='2026-03'?future:r);
  assert.throws(()=>forecastHiring(input,months));
});
test('boundary rejects truth, scenario metadata, unobserved revisions and invalid event times',()=>{
  const base=snapshot();
  for(const extra of [{truth:[]},{family:'stationary'},{seed:17},{coverage:[]}]) assert.throws(()=>forecastHiring({...base,...extra},months));
  const duplicate=structuredClone(base); duplicate.records.push(structuredClone(base.records.at(-1)));
  assert.throws(()=>forecastHiring(duplicate,months));
  const bad=structuredClone(base), row=bad.records.find(r=>r.value.actualStartEvents?.length);
  row.value.actualStartEvents[0].at=dayAdd(row.effectiveAt,-1);
  assert.throws(()=>forecastHiring(bad,months));
  assert.throws(()=>forecastHiring(base,['2026-06']));
});
test('final scoring retains competing outcomes and ignores starts after 90 days',()=>{
  const input=snapshot(ordinary,config.finalScoringCutoff), predictions=forecastHiring(snapshot(),months).predictions;
  const actual=input.records.filter(r=>months.includes(r.value.month)).map(values);
  const selected=input.records.filter(r=>months.includes(r.value.month));
  assert(selected.every(r=>r.value.dispositions.cancelled>0&&r.value.dispositions.noShow>0&&r.value.rightCensoredCount>0));
  assert(selected.every((r,i)=>actual[i].started<r.value.dispositions.started));
  const result=scoreHiring(input,predictions);
  assert.equal(result.status,'scored'); assert.deepEqual(result.metrics,scoreHiringCohorts(actual,predictions));
  assert.equal(result.audit.scoredOpenings,actual.reduce((s,r)=>s+r.openings,0));
  assert.equal(result.interval,null);
});
test('scoring abstains before horizon completeness even if some outcomes have arrived',()=>{
  const predictions=forecastHiring(snapshot(),months).predictions;
  const result=scoreHiring(snapshot(ordinary,'2026-09-30T23:59:59.999Z'),predictions);
  assert.equal(result.status,'blocked'); assert.deepEqual(result.reasons,['incomplete-target-horizon-labels']);
});
test('zero target cohorts remain in audit and contribute no likelihood',()=>{
  const input=snapshot(ordinary,config.finalScoringCutoff);
  const predictions=['2025-10','2025-11','2025-12'].map(month=>({month,'pooled-fraction':.7,'recent-3-fraction':.72,'logistic-trend':.71}));
  const result=scoreHiring(input,predictions);
  assert.equal(result.status,'scored'); assert.deepEqual(result.audit.zeroOpeningMonths,['2025-11']);
  assert.equal(result.audit.scoredCohorts,2);
  assert.equal(scoreHiring(input,[predictions[1]]).reasons[0],'zero-target-exposure');
});
test('calendar zeros do not count toward minimum positive training support',()=>{
  const input=snapshot();
  for(const row of input.records.filter(r=>r.value.month>='2023-04'&&r.value.month<='2026-03').slice(0,13)) {
    row.value.openingCount=0;
    row.value.dispositions={open:0,accepted:0,started:0,cancelled:0,noShow:0};
    row.value.actualStartEvents=[]; row.value.plannedStartEvents=[]; row.value.rightCensoredCount=0;
  }
  const result=forecastHiring(input,months);
  assert.equal(result.status,'blocked'); assert.deepEqual(result.reasons,['insufficient-positive-cohorts']);
  assert(result.audit.positiveCohorts<24); assert.equal(result.audit.selectedRevisions.length,36);
});
test('selected revised aggregate labels are used without averaging vintages',()=>{
  const before=snapshot(stress,'2026-06-30T23:59:59.999Z'), target=before.records.find(r=>r.value.month==='2024-01');
  const full=stress.filter(r=>r.recordKey===target.recordKey&&r.simulatedAvailableAt<=origin);
  assert.equal(target.revision,Math.max(...full.map(r=>r.revision)));
  const result=forecastHiring(before,months);
  assert.equal(result.audit.selectedRevisions.find(r=>r.month==='2024-01').revision,target.revision);
  assert.equal(result.audit.model.trainingOpenings,result.audit.trainingOpenings);
});
