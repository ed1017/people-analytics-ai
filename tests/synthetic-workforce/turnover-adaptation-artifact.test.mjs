import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {digest} from '../../lib/ml/synthetic-workforce/common.mjs';
import {adaptationProtocol,summarizeAdaptation} from '../../lib/ml/turnover-adaptation/evaluation.mjs';
import {loadGroupTurnoverConsumer} from '../../lib/ml/group-turnover-consumer.mjs';
const root=new URL('../../',import.meta.url),dir=new URL('docs/evidence/synthetic-turnover-adaptation-v1/',root);
const report=JSON.parse(await readFile(new URL('report.json',dir))),compressed=await readFile(new URL(report.validationArtifact.path,dir));
const rows=JSON.parse(gunzipSync(compressed)).rows;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('adaptation evidence pins its frozen protocol, implementation and complete fresh seed set',async()=>{
 assert.equal(report.protocolFrozenCommit,'02f5dd9f0b76644d99e25b74672f18461c97293b');assert.deepEqual(report.protocol,adaptationProtocol);
 assert.equal(report.protocolSha256,digest(adaptationProtocol));assert.equal(report.implementationSha256,digest(report.implementationFiles));
 for(const [path,hash]of Object.entries(report.implementationFiles))assert.equal(sha(await readFile(new URL(path,root))),hash,path);
 assert.equal(sha(compressed),report.validationArtifact.sha256);assert.equal(report.dataset.histories,500);assert.equal(rows.length,2000);
 for(const family of adaptationProtocol.families)assert.deepEqual(report.dataset.cases.filter(r=>r.family===family).map(r=>r.seed),Array.from({length:100},(_,i)=>2001+i));
 const prior=await loadGroupTurnoverConsumer();assert.equal(prior.status,'current');assert.equal(prior.identity,report.priorConsumerIdentity);
});
test('adaptation summaries retain failed groups, explicit support and unscored reserved quarter',()=>{
 for(const summary of report.summaries)assert.deepEqual(summary,summarizeAdaptation(rows.filter(r=>r.family===summary.family&&r.groupId===summary.groupId),summary));
 assert.equal(report.summaries.length,20);assert.equal(report.reservedQuarterScore,null);assert.equal(report.publishedInterval,null);assert.equal(report.operationallyQualified,false);
 for(const row of rows){
  assert.deepEqual(row.targets,['2026-07','2026-08','2026-09']);assert.equal(row.reservedScore,null);assert.equal(row.publishedInterval,null);
  assert.deepEqual(row.methods.map(m=>m.method),adaptationProtocol.methods);
  for(const fold of row.calibration.folds)assert(fold.targets.every(month=>month<='2026-03'));
  for(const method of row.methods){assert.equal(method.publishedInterval,null);assert.equal(method.operationallyQualified,false);if(method.status!=='candidate')assert.equal(method.interval,null);}
 }
 for(const group of report.summaries.filter(r=>['group-c','group-d'].includes(r.groupId)))for(const method of group.methods){
  assert.equal(method.intended,100);assert.equal(method.issued,0);assert.equal(method.conditionalCoverage,null);assert.equal(method.meanWidth,null);assert.equal(method.meanIntervalScore,null);
 }
});
