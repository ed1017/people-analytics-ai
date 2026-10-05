import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {digest} from '../../lib/ml/synthetic-workforce/common.mjs';
import {groupTurnoverProtocol as protocol,validateIntervalGate,evaluateGroupCase,publishGroupCase} from '../../lib/ml/group-turnover/evaluation.mjs';
const root=new URL('../../',import.meta.url),output=new URL('docs/evidence/synthetic-group-turnover-v1/',root);
const report=JSON.parse(await readFile(new URL('report.json',output),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('group evidence pins code, protocol, validation seeds and every compressed artifact',async()=>{
 assert.equal(report.protocolSha256,digest(protocol));assert.equal(report.implementationSha256,digest(report.implementationFiles));
 for(const [path,hash]of Object.entries(report.implementationFiles))assert.equal(sha(await readFile(new URL(path,root))),hash,path);
 assert.equal(report.dataset.validationHistories,500);assert.equal(report.dataset.validationCases.length,500);assert.equal(report.dataset.demoHistories,15);
 for(const family of protocol.families){const cases=report.dataset.validationCases.filter(row=>row.family===family);assert.deepEqual(cases.map(row=>row.seed),Array.from({length:100},(_,i)=>1001+i));}
 for(const row of report.dataset.demoArtifacts)for(const artifact of Object.values(row.artifacts)){
  const bytes=await readFile(new URL(artifact.path,output));assert.equal(sha(bytes),artifact.sha256);assert.equal(digest(gunzipSync(bytes).toString()),artifact.jsonSha256);
 }
 assert.equal(sha(await readFile(new URL(report.validationArtifact.path,output))),report.validationArtifact.sha256);
});
test('tracked gates recompute from all 2000 held-out rows and cannot pool away failed groups',async()=>{
 const {rows}=JSON.parse(gunzipSync(await readFile(new URL(report.validationArtifact.path,output))).toString());
 assert.equal(rows.length,2000);assert.equal(report.gates.length,20);
 for(const gate of report.gates)assert.deepEqual(gate,validateIntervalGate(rows.filter(r=>r.family===gate.family&&r.groupId===gate.groupId),{family:gate.family,groupId:gate.groupId}));
 for(const gate of report.gates.filter(g=>g.groupId==='group-c'||g.groupId==='group-d')){assert.equal(gate.status,'unavailable');assert.equal(gate.available,0);}
 assert(report.gates.some(g=>g.available===100&&g.status==='unavailable'));
});
test('demo reports reproduce from as-of releases; reserved outputs have no labels or intervals',async()=>{
 const reconstructed=[];
 for(const item of report.dataset.demoArtifacts){
  const payload=JSON.parse(gunzipSync(await readFile(new URL(item.artifacts.releases.path,output))).toString());
  assert.equal(payload.kind,'synthetic-group-releases');assert(payload.records.every(row=>!Object.hasOwn(row.value,'daily')));
  const cases=evaluateGroupCase(payload.records,{family:item.family,seed:item.seed,includeYearEnd:true});
  reconstructed.push(...cases.map(result=>publishGroupCase(result,report.gates.find(g=>g.family===item.family&&g.groupId===result.groupId))));
 }
 assert.deepEqual(reconstructed,report.demos);
 for(const row of reconstructed){
  assert.equal(row.operationallyQualified,false);assert.equal(row.rate,null);assert.equal(row.individualRisk,null);
  assert.equal(row.yearEnd.actual,null);assert.equal(row.yearEnd.predictionInterval,null);assert.equal(row.yearEnd.scoringStatus,'reserved-unscored');
  if(row.intervalStatus==='unavailable')assert.equal(row.predictionInterval,null);
  if(row.forecast.status==='blocked')assert.deepEqual(row.forecast.methods,[]);
 }
});
