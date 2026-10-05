import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {digest} from '../../lib/ml/synthetic-workforce/common.mjs';
import {signalProtocol,fitSignalModels,summarizeSignalRows} from '../../lib/ml/observable-turnover-signals/model.mjs';
import {buildGroupTurnoverConsumer} from '../../lib/ml/group-turnover-consumer.mjs';
const root=new URL('../../',import.meta.url),dir=new URL('docs/evidence/synthetic-observable-signals-v1/',root);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const trainingReport=JSON.parse(await readFile(new URL('training-report.json',dir)));
const report=JSON.parse(await readFile(new URL('report.json',dir)));
const freeze=JSON.parse(await readFile(new URL('training-freeze.json',dir)));
const training=JSON.parse(gunzipSync(await readFile(new URL('training.json.gz',dir))));
const {rows}=JSON.parse(gunzipSync(await readFile(new URL('scores.json.gz',dir))));

test('observable evidence pins preregistration, committed fit, implementation and both prior negative reports',async()=>{
 assert.deepEqual(report.protocol,signalProtocol);assert.equal(report.protocolSha256,digest(signalProtocol));
 assert.equal(report.protocolFrozenCommit,'5794c64b0b7857df0d1d0b26529ae54513f831b7');
 assert.deepEqual(report.trainingFreeze,freeze);
 const committed=execFileSync('git',['show',`${freeze.commit}:docs/evidence/synthetic-observable-signals-v1/training-report.json`],{cwd:root});
 assert.equal(sha(committed),freeze.trainingReportSha256);assert.equal(sha(await readFile(new URL('training-report.json',dir))),freeze.trainingReportSha256);
 execFileSync('git',['merge-base','--is-ancestor',report.protocolFrozenCommit,freeze.commit],{cwd:root});
 for(const r of [report,trainingReport]){
  assert.equal(r.implementationSha256,digest(r.implementationFiles));
  for(const [path,expected]of Object.entries(r.implementationFiles))assert.equal(sha(await readFile(new URL(path,root))),expected,path);
  for(const [path,expected]of Object.entries(r.priorReports))assert.equal(sha(await readFile(new URL(path,root))),expected,path);
  for(const [path,expected]of Object.entries(r.artifacts)){const bytes=await readFile(new URL(path,dir));assert.equal(bytes.length,expected.bytes);assert.equal(sha(bytes),expected.sha256);}
 }
 const consumer=await buildGroupTurnoverConsumer();assert.equal(consumer.status,'current');assert.equal(report.priorConsumerIdentity,consumer.identity);
 assert.equal(sha(await readFile(new URL('training.json.gz',dir))),report.trainingArtifactSha256);
});

test('observable training and test retain all frozen seeds with earlier labels and exact refitted coefficients',()=>{
 assert.deepEqual(trainingReport.fingerprints.map(r=>r.seed),Array.from({length:100},(_,i)=>4001+i));
 assert.deepEqual(report.fingerprints.map(r=>r.seed),Array.from({length:100},(_,i)=>5001+i));
 assert.equal(training.rows.length,800);assert.equal(rows.length,1200);
 for(const row of training.rows){assert(row.origin<row.labelsAsOf);assert(row.labelsAsOf<signalProtocol.test.origin);if(row.actual!==null)assert(row.labelAvailableAt<=row.labelsAsOf);}
 assert.deepEqual(fitSignalModels(training.rows),training.fits);assert.deepEqual(trainingReport.fits,training.fits);
 for(const summary of report.summaries)assert.deepEqual(summarizeSignalRows(rows.filter(r=>r.scenario===summary.scenario&&r.forecast.groupId===summary.groupId),summary.scenario,summary.groupId),summary);
});

test('observable held-out controls, suppression, forecast timing and unqualified outputs remain explicit',()=>{
 assert.deepEqual(report.controls,{prefixEqualityHistories:100,lateSignalExactFallbacks:1200});
 for(const row of rows){
  assert.equal(row.forecast.cutoff,signalProtocol.test.origin);assert.equal(row.forecast.trainingEnd,'2026-05');assert.deepEqual(row.forecast.targets,signalProtocol.test.targets);
  assert.equal(row.delayedSignalControl.prediction,row.forecast.predictions['intercept-only']);assert.equal(row.delayedSignalControl.signalUnavailable,true);
  assert.equal(row.forecast.publishedInterval,null);assert.equal(row.forecast.causalEffect,null);assert.equal(row.forecast.operationallyQualified,false);assert.equal(row.reservedQuarterScore,null);
  if(['group-c','group-d'].includes(row.forecast.groupId)){assert.equal(row.actual,null);assert(Object.values(row.forecast.predictions).every(p=>p===null));}
 }
 assert.equal(report.publishedInterval,null);assert.equal(report.causalEffect,null);assert.equal(report.reservedQuarterScore,null);assert.equal(report.operationallyQualified,false);assert.equal(report.realWorldPerformanceValidated,false);
});

test('observable informative and reversed scenarios share inputs and fitted predictions without sharing labels',()=>{
 for(let seed=5001;seed<=5100;seed++)for(const groupId of ['group-a','group-b','group-c','group-d']){
  const get=scenario=>rows.find(r=>r.seed===seed&&r.scenario===scenario&&r.forecast.groupId===groupId);
  assert.deepEqual(get('informative').forecast,get('reversed').forecast);
  assert.equal(get('informative').forecast.inputFingerprint,get('no-signal').forecast.inputFingerprint);
 }
});
