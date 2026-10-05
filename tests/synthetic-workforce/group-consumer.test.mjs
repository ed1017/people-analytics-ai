import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildGroupTurnoverConsumer,resolveGroupTurnoverConsumerCache,loadGroupTurnoverConsumer,groupTurnoverConsumerPath} from '../../lib/ml/group-turnover-consumer.mjs';
const root=new URL('../../',import.meta.url),read=path=>readFile(new URL(path,root));
const fresh=await buildGroupTurnoverConsumer();
const corrupt=(target,change)=>async path=>{const bytes=await read(path);return path===target?change(bytes):bytes;};
const hidden=result=>{assert.equal(result.operationallyQualified,false);assert.equal(result.realWorldPerformanceValidated,false);assert.equal(result.evidence,null);assert.equal(result.dataset,null);assert.equal(result.validation,null);assert.deepEqual(result.cases,[]);assert.equal(result.rateForecast,null);assert.equal(result.individualRisk,null);};
test('group consumer verifies pinned manifests, source code and all 63 evidence artifacts',async()=>{
 assert.equal(fresh.status,'current');assert.equal(fresh.evidence.verifiedArtifactFiles,63);assert(fresh.evidence.verifiedImplementationFiles>=10);
 assert.equal(fresh.evidence.commit,'2d9dd96329c42cac89024f7f8f64fb67f18bb502');assert.equal(fresh.cases.length,60);
 assert.equal(fresh.dataset.demoHistories,15);assert.equal(fresh.validation.histories,500);assert.equal(fresh.validation.gates.length,20);
 assert.match(fresh.validation.label,/do not establish real workforce accuracy/);assert.match(fresh.evidenceStatus,/operational forecasting remains unavailable/);
 assert.deepEqual(await loadGroupTurnoverConsumer(),fresh);assert(Object.isFrozen(fresh.cases[0].assessment));
});
test('changed report or generator manifest cannot self-assert a matching new hash',async()=>{
 for(const path of ['docs/evidence/synthetic-workforce-v1/manifest.json','docs/evidence/synthetic-group-turnover-v1/report.json']){
  const result=await buildGroupTurnoverConsumer({read:corrupt(path,bytes=>Buffer.from(bytes.toString()+' '))});
  assert.equal(result.status,'unavailable');assert.deepEqual(result.reasonCodes,['evidence-hash-mismatch']);hidden(result);
 }
 const result=await buildGroupTurnoverConsumer({read:corrupt('docs/evidence/synthetic-group-turnover-v1/report.json',bytes=>{
  const r=JSON.parse(bytes);r.operationallyQualified=true;r.demos[0].yearEnd.predictionInterval={lower:1,upper:100};r.implementationSha256='0'.repeat(64);return Buffer.from(JSON.stringify(r));
 })});assert.equal(result.status,'unavailable');hidden(result);
});
test('stale source implementation blocks output even if saved reports still match pins',async()=>{
 for(const path of ['lib/ml/group-turnover/evaluation.mjs','lib/ml/synthetic-workforce/hiring.mjs','lib/ml/synthetic-workforce/satisfaction.mjs']){
  const result=await buildGroupTurnoverConsumer({read:corrupt(path,bytes=>Buffer.from(bytes.toString()+'\n// changed implementation\n'))});
  assert.deepEqual(result.reasonCodes,['implementation-hash-mismatch']);hidden(result);
 }
});
test('tampered compressed releases, truth or validation audit fail closed',async()=>{
 for(const path of ['docs/evidence/synthetic-workforce-v1/releases/stationary-17.json.gz','docs/evidence/synthetic-group-turnover-v1/truth/stationary-17.json.gz','docs/evidence/synthetic-group-turnover-v1/validation.json.gz']){
  const result=await buildGroupTurnoverConsumer({read:corrupt(path,bytes=>{const modified=Buffer.from(bytes);modified[modified.length-1]^=1;return modified;})});
  assert.deepEqual(result.reasonCodes,['evidence-artifact-hash-mismatch']);hidden(result);
 }
});
test('missing evidence or locally changed pins cannot yield partial numeric results',async()=>{
 const absent=await buildGroupTurnoverConsumer({read:async path=>{if(path.endsWith('/validation.json.gz'))throw Error('Missing evidence');return read(path);}});
 assert.deepEqual(absent.reasonCodes,['evidence-file-unavailable']);hidden(absent);
 const changed=await buildGroupTurnoverConsumer({read:corrupt('lib/ml/group-turnover-consumer-pins.json',bytes=>{const p=JSON.parse(bytes);p.evidenceCommit='0'.repeat(40);return Buffer.from(JSON.stringify(p));})});
 assert.deepEqual(changed.reasonCodes,['consumer-pins-changed']);hidden(changed);
});
test('cache edits remain stale even when the original identity is retained',async()=>{
 for(const mutate of [r=>{r.cases[0].assessment.methods[0].expectedTotal+=1;},r=>{r.validation.histories=501;},r=>{r.cases[0].yearEnd.uncertainty.interval={lower:0,upper:100};},r=>{r.evidence.groupReportSha256='0'.repeat(64);}]){
  const stale=structuredClone(fresh);mutate(stale);assert.equal(stale.identity,fresh.identity);
  const result=resolveGroupTurnoverConsumerCache(stale,fresh);assert.equal(result.status,'stale');hidden(result);
 }
 const loaded=await loadGroupTurnoverConsumer({read:corrupt(groupTurnoverConsumerPath,bytes=>{const r=JSON.parse(bytes);r.cases=[];return Buffer.from(JSON.stringify(r));})});
 assert.equal(loaded.status,'stale');hidden(loaded);
 const missing=await loadGroupTurnoverConsumer({read:async path=>{if(path===groupTurnoverConsumerPath)throw Error('Missing cache');return read(path);}});
 assert.equal(missing.status,'unavailable');hidden(missing);
});
test('suppressed groups expose no outcomes, forecast methods, comparisons or ranges',()=>{
 const small=fresh.cases.filter(row=>['group-c','group-d'].includes(row.groupId));assert.equal(small.length,30);
 for(const row of small)for(const period of ['assessment','yearEnd']){
  const result=row[period];assert.equal(result.status,'unavailable');assert.deepEqual(result.methods,[]);assert.equal(result.actualTotal,null);assert.equal(result.uncertainty.interval,null);
  if(period==='assessment')assert.deepEqual(result.comparisons,[]);
 }
 const text=JSON.stringify(fresh);for(const forbidden of ['personDays','startHeadcount','endHeadcount','daily','actualStartEvents','plannedStartEvents','trainingFingerprint'])assert(!text.includes('"'+forbidden+'"'));
});
test('regime reversal failures remain visible with 0 of 100 coverage and no rescued range',()=>{
 const gates=fresh.validation.gates.filter(g=>g.family==='regime-reversal'&&['group-a','group-b'].includes(g.groupId));assert.equal(gates.length,2);
 for(const gate of gates){assert.equal(gate.status,'unavailable');assert.equal(gate.intendedHistories,100);assert.equal(gate.availableRanges,100);assert.equal(gate.covered,0);assert.equal(gate.empiricalCoverage,0);assert(gate.reasonCodes.length);}
 for(const row of fresh.cases.filter(row=>row.family==='regime-reversal'))assert.equal(row.assessment.uncertainty.interval,null);
});
test('only six retrospective assessment ranges survive; all year-end ranges and scores remain unavailable',()=>{
 assert.equal(fresh.validation.gates.filter(g=>g.status==='qualified-conditional-simulation').length,2);
 const qualified=fresh.cases.filter(row=>row.assessment.uncertainty.interval!==null);assert.equal(qualified.length,6);
 for(const row of qualified){const u=row.assessment.uncertainty;assert.equal(u.status,'retrospective-conditional-simulation');assert.equal(u.availableAtForecastOrigin,false);assert.equal(u.qualificationAvailableAt,'2027-07-01T00:00:00.000Z');assert.equal(u.interval.target,'three-month-total-only');assert.equal(u.interval.coverageGuarantee,false);}
 for(const row of fresh.cases){assert.equal(row.yearEnd.scoringStatus,'reserved-unscored');assert.equal(row.yearEnd.actualTotal,null);assert.equal(row.yearEnd.uncertainty.status,'unavailable');assert.equal(row.yearEnd.uncertainty.interval,null);assert.deepEqual(row.yearEnd.targets,['2026-10','2026-11','2026-12']);}
});
test('reporting-stress point forecasts stay separate from unavailable calibration ranges',()=>{
 const large=fresh.cases.filter(r=>r.family==='reporting-stress'&&['group-a','group-b'].includes(r.groupId));assert.equal(large.length,6);
 for(const row of large){assert.equal(row.assessment.status,'synthetic-count-forecast');assert.equal(row.assessment.trainingEnd,'2026-04');assert.equal(row.assessment.uncertainty.interval,null);}
 const gate=fresh.validation.gates.find(g=>g.family==='reporting-stress'&&g.groupId==='group-a');assert.equal(gate.availableRanges,0);assert.equal(gate.empiricalCoverage,null);
});
