import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {generateWorkforceCase,replaySynthetic} from '../lib/ml/synthetic-workforce/pipeline.mjs';
import {protocol,domains,currentReference,forecastWindow,summarize} from '../lib/ml/synthetic-history-length/models.mjs';
const config=JSON.parse(readFileSync(new URL('../lib/ml/synthetic-workforce/protocol.json',import.meta.url)));
const result=generateWorkforceCase(config,{seed:17,family:'stationary'}),stress=generateWorkforceCase(config,{seed:17,family:'reporting-stress'});
const input=(domain,source=result,origin=protocol.origin)=>replaySynthetic(domain,source.domains[domain].releases,origin);
const targets=domain=>domain==='satisfaction'?['2026-09']:protocol.targets;
test('matching settings preserve original predictions exactly',()=>{
  for(const [domain,window]of [['turnover',12],['hiring',36],['satisfaction',24]])assert.deepEqual(forecastWindow(input(domain),targets(domain),window).predictions,currentReference(input(domain),targets(domain)).predictions);
});
test('older windows retain fixed recent and seasonal controls',()=>{
  for(const domain of domains){const predictions=protocol.lookbackMonths.map(n=>forecastWindow(input(domain),targets(domain),n)).filter(row=>row.status==='predicted');
    const controls=domain==='turnover'?['recent-mean-3','seasonal-naive-12']:domain==='hiring'?['recent-3-fraction']:['last-wave','recent-mean-3'];
    for(const method of controls)for(const row of predictions)assert.deepEqual(row.predictions.map(p=>p[method]),predictions[0].predictions.map(p=>p[method]));
  }
});
test('unsupported histories abstain without dropping zero cohorts or missing old waves',()=>{
  for(const n of [12,24])assert.deepEqual(forecastWindow(input('hiring'),protocol.targets,n).reasons,['insufficient-positive-cohorts']);
  assert.equal(forecastWindow(input('satisfaction'),['2026-09'],12).status,'blocked');
  assert.equal(forecastWindow(input('satisfaction'),['2026-09'],60).status,'blocked');
  assert.equal(forecastWindow(input('satisfaction'),['2026-09'],36).status,'predicted');
});
test('prewindow values and future revisions cannot alter fitted count predictions',()=>{
  const before=input('turnover'),modified=structuredClone(before);
  const old=modified.records[0].value;old.voluntaryExits+=2;old.otherExits-=2;
  for(const n of protocol.lookbackMonths)assert.deepEqual(forecastWindow(before,protocol.targets,n).predictions,forecastWindow(modified,protocol.targets,n).predictions);
  const source=structuredClone(result);for(const row of source.domains.turnover.releases)if(row.effectiveAt.startsWith('2026-07')){row.value.voluntaryExits+=2;row.value.otherExits-=2;}
  for(const n of protocol.lookbackMonths)assert.deepEqual(forecastWindow(before,protocol.targets,n).predictions,forecastWindow(input('turnover',source),protocol.targets,n).predictions);
});
test('native missingness blocks every available window and never shifts anchors',()=>{
  for(const domain of ['turnover','satisfaction'])for(const n of protocol.lookbackMonths){const forecast=forecastWindow(input(domain,stress,protocol.missingnessGuardOrigin),['2025-12'],n);
    assert.equal(forecast.status,'blocked');assert.equal(forecast.audit.trainingEnd,'2025-09');}
});
test('calendar gaps and overdue incomplete hiring labels remain unavailable',()=>{
  const counts=input('turnover');counts.records.splice(-2,1);assert.equal(forecastWindow(counts,protocol.targets,12).status,'blocked');
  const hiring=input('hiring');hiring.records.find(row=>row.value.month==='2026-02').value.horizonLabelsComplete=false;
  for(const n of [36,60])assert.equal(forecastWindow(hiring,protocol.targets,n).status,'blocked');
});
test('paired comparisons exclude nonshared scored cases and preserve abstention denominators',()=>{
  const row=(seed,window,status,error)=>({family:'stationary',domain:'turnover',seed,window,forecast:{status:status==='scored'?'predicted':'blocked',reasons:status==='scored'?[]:['missing']},
    scoring:{status,reasons:status==='scored'?[]:['forecast-abstained'],methods:Object.fromEntries(protocol.turnover.methods.map(method=>[method,{mae:error,rmse:error}]))}});
  const summary=summarize([row(1,'current','scored',4),row(2,'current','scored',1),row(1,60,'scored',3),row(2,60,'blocked',null)])[0];
  const pair=summary.pairedComparisons.find(r=>r.from==='current'&&r.to===60&&r.method==='linear-trend');assert.equal(pair.pairedCases,1);assert.equal(pair.toMinusFromMae,-1);
  assert.equal(summary.windows.find(r=>r.window===60).blocked.length,1);
});
