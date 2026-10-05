import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {generateWorkforceCase,replaySynthetic,validateReleases,validateGeneratedCase,splitArtifacts} from '../../lib/ml/synthetic-workforce/pipeline.mjs';
import {canonical,digest} from '../../lib/ml/synthetic-workforce/common.mjs';
import {syntheticWorkforceArtifacts} from '../manual/generate-synthetic-workforce.mjs';
const config=JSON.parse(await readFile(new URL('../../lib/ml/synthetic-workforce/protocol.json',import.meta.url),'utf8'));
const fixture=generateWorkforceCase(config,{seed:17,family:'reporting-stress'});

test('cross-domain case reconciles hiring starts, every workforce stock and survey eligibility',()=>{assert.equal(validateGeneratedCase(config,fixture),true);const broken=structuredClone(fixture);broken.domains.satisfaction.truth[2].value.eligible++;assert.throws(()=>validateGeneratedCase(config,broken));});
test('as-of replay cannot see future records, future corrections, truth, case family or seed',()=>{
 for(const domain of Object.keys(fixture.domains)){
  const rows=fixture.domains[domain].releases,cutoff=config.windows.assessmentOrigin,full=replaySynthetic(domain,rows,cutoff);
  const visible=rows.filter(r=>r.simulatedAvailableAt<=cutoff&&r.effectiveAt<=cutoff);
  assert.deepEqual(full,replaySynthetic(domain,visible,cutoff));
  assert(full.records.every(r=>r.simulatedAvailableAt<=cutoff&&r.effectiveAt<=cutoff));
  assert(!('truth'in full)&&!('family'in full)&&!('seed'in full));
  const before=canonical(full);full.records[0].value={bad:true};assert.equal(canonical(replaySynthetic(domain,rows,cutoff)),before);
 }
});
test('late classification revisions retain exact earlier vintages rather than latest data',()=>{
 const ordinary=generateWorkforceCase(config,{seed:17,family:'stationary'}),rows=ordinary.domains.turnover.releases,key='turnover:2022-11';
 const versions=rows.filter(r=>r.recordKey===key);
 const first=replaySynthetic('turnover',rows,versions[0].simulatedAvailableAt).records.find(r=>r.recordKey===key);
 const later=replaySynthetic('turnover',rows,versions[1].simulatedAvailableAt).records.find(r=>r.recordKey===key);
 assert.equal(first.revision,1);assert.equal(later.revision,2);assert.equal(later.value.voluntaryExits-first.value.voluntaryExits,2);
 assert.equal(replaySynthetic('turnover',rows,config.windows.assessmentOrigin).records.at(-1).value.month,'2026-05','June counts are not yet reported at June-end origin');
});
test('calendar maturity cannot stand in for complete 90-day hiring labels',()=>{
 const rows=fixture.domains.hiring.releases;
 const pending=rows.find(r=>r.status==='complete'&&r.value.horizonMature&&!r.value.horizonLabelsComplete);
 assert(pending);const at=replaySynthetic('hiring',rows,pending.simulatedAvailableAt).records.find(r=>r.recordKey===pending.recordKey);
 assert.equal(at.value.horizonLabelsComplete,false);
 const final=replaySynthetic('hiring',rows,config.finalScoringCutoff);assert(final.records.every(r=>r.value.horizonLabelsComplete));
});
test('malformed revisions, source-observed relabeling, missing-as-zero and unreconciled counts fail closed',()=>{
 const rows=fixture.domains.turnover.releases;
 for(const change of [r=>{r[0].sourceObservedAt=r[0].simulatedAvailableAt;},r=>{r.push(structuredClone(r[0]));},r=>{r[1].revision=9;},r=>{r.find(x=>x.status==='missing').value.voluntaryExits=0;},r=>{r.find(x=>x.status==='complete').value.endHeadcount++;},r=>{r[0].simulatedAvailableAt='2020-01-01T00:00:00.000Z';}]){
  const bad=structuredClone(rows);change(bad);assert.throws(()=>validateReleases('turnover',bad));
 }
});
test('survey instrument break is preserved and no monthly waves are interpolated',()=>{
 const generated=generateWorkforceCase(config,{seed:17,family:'survey-break'});
 const replay=replaySynthetic('satisfaction',generated.domains.satisfaction.releases,config.finalScoringCutoff);
 assert.equal(replay.records.length,24);assert.equal(new Set(replay.records.map(r=>r.value.instrumentVersion)).size,2);
 assert(replay.records.filter(r=>r.value.instrumentVersion.endsWith('v2')).every(r=>r.value.comparability==='blocked-instrument-break'));
});
test('truth and release artifacts are physically separable with no latent outcomes in release metadata',()=>{
 const {truth,releases}=splitArtifacts(fixture);assert.equal(truth.kind,'synthetic-ground-truth-do-not-train-from-future');
 for(const domain of Object.values(releases.domains)){assert.deepEqual(Object.keys(domain).sort(),['definitions','releases']);assert(!('truth'in domain));}
});
test('all 15 frozen cases reproduce exact versioned compressed files and manifest',async()=>{
 const {files,manifest}=await syntheticWorkforceArtifacts();assert.equal(manifest.cases.length,15);assert.equal(files.size,31);
 assert.equal(manifest.modelEvaluation.metrics,null);assert.equal(manifest.operationallyQualified,false);
 for(const [path,bytes]of files){assert.deepEqual(await readFile(new URL('../../docs/evidence/synthetic-workforce-v1/'+path,import.meta.url)),bytes,path);if(path.endsWith('.gz')){const value=JSON.parse(gunzipSync(bytes));assert.equal(value.dataClass,'constructed-synthetic');}}
 assert.equal(manifest.configSha256,digest(config));
});

test('late hiring follow-up outside the stock window is explicit and exhaustively reconciled',()=>{
 const result=generateWorkforceCase(config,{seed:17,family:'regime-reversal'}),b=result.boundaryReconciliation;
 assert(b.postWindowStarts>0);assert.equal(b.allActualStarts,b.workforceWindowStarts+b.postWindowStarts);assert.equal(b.beforeWindowStarts,0);
 assert.equal(b.workforceWindowEnd,'2026-12');assert.equal(result.domains.turnover.truth.length,72);
 const split=splitArtifacts(result);assert.deepEqual(split.truth.boundaryReconciliation,b);assert(!('boundaryReconciliation'in split.releases));
});
