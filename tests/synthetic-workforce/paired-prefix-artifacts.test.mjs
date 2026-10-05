import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {digest} from '../../lib/ml/synthetic-workforce/common.mjs';
import {pairedPrefixProtocol,summarizePairedPrefix} from '../../lib/ml/paired-prefix-turnover/evaluation.mjs';
import {buildGroupTurnoverConsumer} from '../../lib/ml/group-turnover-consumer.mjs';
const root=new URL('../../',import.meta.url),dir=new URL('docs/evidence/synthetic-paired-prefix-v1/',root);
const report=JSON.parse(await readFile(new URL('report.json',dir),'utf8'));
const {pairs}=JSON.parse(gunzipSync(await readFile(new URL('pairs.json.gz',dir))));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('paired evidence binds the frozen protocol, exact source files and artifact bytes',async()=>{
 assert.deepEqual(report.protocol,pairedPrefixProtocol);assert.equal(report.protocolSha256,digest(pairedPrefixProtocol));
 assert.equal(report.protocolFrozenCommit,'56413d688c38b913a36bae16f510aa51a14d6b7f');
 assert.equal(report.implementationSha256,digest(report.implementationFiles));
 for(const [path,expected]of Object.entries(report.implementationFiles))assert.equal(sha(await readFile(new URL(path,root))),expected,path);
 assert.deepEqual((await readdir(dir)).sort(),['example-releases.json.gz','pairs.json.gz','report.json']);
 for(const [path,expected]of Object.entries(report.artifacts)){const bytes=await readFile(new URL(path,dir));assert.equal(bytes.length,expected.bytes);assert.equal(sha(bytes),expected.sha256,path);}
 const old=await readFile(new URL('docs/evidence/synthetic-turnover-adaptation-v1/report.json',root));
 assert.equal(sha(old),pairedPrefixProtocol.priorNegativeReportSha256);
 const consumer=await buildGroupTurnoverConsumer();assert.equal(consumer.status,'current');assert.equal(consumer.identity,report.priorConsumerIdentity);
});

test('all frozen paired units and assignments are retained without outcome selection',()=>{
 assert.deepEqual(pairs.map(p=>p.seed),Array.from({length:100},(_,i)=>3001+i));
 assert.deepEqual(report.dataset.fingerprints.map(p=>p.seed),pairs.map(p=>p.seed));
 assert.equal(report.dataset.pairedHistories,100);assert.equal(report.dataset.potentialContinuations,200);assert.equal(report.dataset.groupPairs,400);
 assert.equal(report.dataset.monthsPerContinuation,69);assert.equal(report.dataset.lastWorkforceMonth,'2026-09');
 assert.equal(report.assignments.shock,pairs.filter(p=>p.assignment.branch==='shock').length);
 assert.equal(report.assignments.noShock,pairs.filter(p=>p.assignment.branch==='no-shock').length);
 assert.equal(report.assignments.shock+report.assignments.noShock,100);
 for(const p of pairs){
  assert.deepEqual(p.invariants,{identicalObservedPrefixes:true,identicalGroupForecasts:4,identicalCalibrations:4,identicalCandidateRanges:4});
  assert.deepEqual(p.rows.map(r=>r.groupId),['group-a','group-b','group-c','group-d']);
  for(const row of p.rows){assert.equal(row.assignedBranch,p.assignment.branch);assert.equal(row.prefixSha256,p.prefixSha256);assert.equal(row.forecast.cutoff,pairedPrefixProtocol.origin);assert.deepEqual(row.forecast.targets,pairedPrefixProtocol.targets);}
 }
});

test('stored summaries recompute from paired losses and retain suppressed unavailability',()=>{
 const rows=pairs.flatMap(p=>p.rows);
 for(const summary of report.summaries)assert.deepEqual(summarizePairedPrefix(rows.filter(r=>r.groupId===summary.groupId),summary.groupId),summary);
 for(const row of rows){
  assert.equal(row.publishedInterval,null);assert.equal(row.causalEffect,null);assert.equal(row.reservedScore,null);assert.equal(row.operationallyQualified,false);
  if(['group-c','group-d'].includes(row.groupId)){
   assert.equal(row.forecast.expectedTotal,null);assert.equal(row.candidateInterval,null);
   for(const outcome of Object.values(row.potentialOutcomes)){assert.equal(outcome.actualTotal,null);assert.equal(outcome.covered,null);assert.equal(outcome.error,null);}
  }
 }
 for(const field of ['publishedInterval','causalEffect','rateForecast','individualRisk','reservedQuarterScore'])assert.equal(report[field],null);
 assert.equal(report.operationallyQualified,false);assert.equal(report.realWorldPerformanceValidated,false);
});

test('predetermined example is an audit artifact with no reserved-quarter workforce rows',async()=>{
 const example=JSON.parse(gunzipSync(await readFile(new URL('example-releases.json.gz',dir))));
 assert.equal(example.seed,pairedPrefixProtocol.exampleSeed);assert.equal(example.kind,'paired-prefix-audit-release-histories-not-direct-model-input');
 assert.deepEqual(Object.keys(example.branches).sort(),['no-shock','shock']);
 for(const releases of Object.values(example.branches))for(const release of releases)assert(release.effectiveAt<'2026-10-01',release.effectiveAt);
});
