import test from 'node:test';
import assert from 'node:assert/strict';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {canonicalHomeEvidence,evidenceFingerprint,readEvidenceFingerprint,preparationEvidenceMode,planContextDiagnostic,planContextDiagnosticText} from '../lib/home-evidence-identity.ts';
import {createHomeBundlePreparation,readBundlePreparation} from '../lib/home-bundle-preparation.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
const packet={workforceScope:'All countries',sources:[{id:'W1',status:'loaded',date:'2026-09-30',facts:{headcount:100,rows:[{snapshot_date:'2026-08-31',headcount:90},{snapshot_date:'2026-09-30',headcount:100}]}},{id:'T1',status:'loaded',date:'2026-09-30',facts:{current_workforce:100,rows:[{skill_name:'Zeta synthetic skill',employees_in_roles_requiring_skill:20,requirement_met_pct:50},{skill_name:'Alpha synthetic skill',employees_in_roles_requiring_skill:10,requirement_met_pct:60}]}}]};
const bind=(value=packet,planning={},goal='Build AI skills')=>actionBinding('goal-a',goal,canonicalHomeEvidence(value),planning);
test('categorical row permutations preserve canonical identity but actual model packet stays unchanged',async()=>{
 const before=structuredClone(packet),changed=structuredClone(packet);changed.sources[1].facts.rows.reverse();
 assert.equal((await bind()).evidenceDigest,(await bind(changed)).evidenceDigest);assert.deepEqual(packet,before);
 const old=await evidenceFingerprint(packet,'canonical'),now=await evidenceFingerprint(changed,'canonical');
 assert.notEqual(old.ordered,now.ordered);assert.equal(old.canonical,now.canonical);
 const result=planContextDiagnostic(await bind(),await bind(changed),old,now);assert.equal(result.evidence,'unchanged');assert.equal(result.detail,'detail_order_only');
});
test('availability, changed content, goal and planning inputs remain distinct stale causes',async()=>{
 const original=await bind(),fingerprint=await evidenceFingerprint(packet,'canonical');
 for(const kind of ['availability','value','date','scope','selection','duplicate','chronological']){
  const changed=structuredClone(packet);if(kind==='availability')changed.sources[1].status='timeout';if(kind==='value')changed.sources[1].facts.rows[0].requirement_met_pct=51;if(kind==='date')changed.sources[1].date='2026-10-01';if(kind==='scope')changed.workforceScope='US';if(kind==='selection')changed.sources[1].selection='Different source selection';if(kind==='duplicate')changed.sources[1].facts.rows.push(changed.sources[1].facts.rows[0]);if(kind==='chronological')changed.sources[0].facts.rows.reverse();
  const next=await bind(changed),diagnostic=planContextDiagnostic(original,next,fingerprint,await evidenceFingerprint(changed,'canonical'));
  assert.notEqual(original.evidenceDigest,next.evidenceDigest,kind);assert.equal(diagnostic.evidence,'changed');assert.equal(diagnostic.detail,kind==='availability'?'availability_changed':'content_changed');assert.equal(diagnostic.planning,'unchanged');
 }
 assert.equal(planContextDiagnostic(original,await bind(packet,{budget:20000}),fingerprint,fingerprint).planning,'changed');
 assert.equal(planContextDiagnostic(original,await bind(packet,{},'Improve manager support'),fingerprint,fingerprint).goal,'changed');
});
test('source order, arbitrary timestamps and object key order do not change a binding',async()=>{
 const changed=structuredClone(packet);changed.sources.reverse();changed.fetchedAt='2099-01-01T00:00:00Z';changed.sources[0].loadedAt='different';
 assert.deepEqual(await bind(changed),await bind());
});
test('time series, selected quotes, scenarios and Development options keep meaningful order',async()=>{
 for(const id of ['W1','R1','S1','P1','I3','D1']){
  const row=name=>({snapshot_date:name==='A'?'2026-08-31':'2026-09-30',month:name==='A'?'2026-08-01':'2026-09-01',survey_name:name,scenario_name:name,provider:name,headcount:100,applications:10,respondents:10,planned_headcount:100,currency:'USD',basis:id==='D1'?'cohort':'per cohort package per session',capacity:id==='D1'?10:'10',sessions:id==='D1'?1:'1',hoursPerSession:'2',feePerUnitPerSession:'100'});
  const first={sources:[{id,status:'loaded',facts:{headcount:100,rows:[row('A'),row('B')]}}]},second=structuredClone(first);second.sources[0].facts.rows.reverse();
  assert.notEqual((await bind(first)).evidenceDigest,(await bind(second)).evidenceDigest,id);
 }
});
test('legacy preparations retain their old comparison mode and unavailable diagnostic baseline',async()=>{
 const binding=await actionBinding('goal-a','Build AI skills',packet,{}),legacy={version:1,binding,proposal:bundleProposalFixture(binding.goal),preparedAt:'2026-10-05T00:00:00Z',usage:{model:'fixture',inputTokens:null,cachedInputTokens:null,outputTokens:null,reasoningTokens:null,totalTokens:null,latencyMs:null}};
 assert.ok(readBundlePreparation(legacy,binding,packet));assert.equal(preparationEvidenceMode(legacy),'ordered');
 const diagnostic=planContextDiagnostic(binding,binding,undefined,await evidenceFingerprint(packet,'ordered'));assert.equal(diagnostic.detail,'baseline_unavailable');assert.equal(diagnostic.evidence,'unchanged');
 const changed=structuredClone(packet);changed.sources[1].facts.rows.reverse();assert.notEqual((await actionBinding('goal-a',binding.goal,changed,{})).evidenceDigest,binding.evidenceDigest);
});
test('new preparation persists only bounded hashes and rejects tampered diagnostic records',async()=>{
 const binding=await bind(),worker=createHomeBundlePreparation();let saved;
 const result=await worker.run({mode:'new-pin',binding,packet,stored:null,isCurrent:()=>true,prepare:async()=>({proposal:bundleProposalFixture(binding.goal)}),commit:patch=>saved=patch.value});
 assert.equal(result.status,'ready');assert.equal(preparationEvidenceMode(saved),'canonical');assert.ok(readEvidenceFingerprint(saved.evidenceFingerprint,binding));assert.ok(Buffer.byteLength(JSON.stringify(saved.evidenceFingerprint))<400);
 assert.ok(!JSON.stringify(saved.evidenceFingerprint).includes('synthetic skill'));
 for(const mutate of [value=>value.extra='payload',value=>value.ordered='not a digest',value=>value.canonical='a'.repeat(64)]){const bad=structuredClone(saved);mutate(bad.evidenceFingerprint);assert.equal(readBundlePreparation(bad,binding,packet),null);}
});
test('display diagnostics contain fixed classifications, never values or digest strings',async()=>{
 const binding=await bind(),fingerprint=await evidenceFingerprint(packet,'canonical'),diagnostic=planContextDiagnostic(binding,{...binding,planningDigest:'b'.repeat(64)},fingerprint,fingerprint,true),text=planContextDiagnosticText(diagnostic);
 assert.match(text,/Planning: changed/);assert.match(text,/reviewed local attachment transition/);assert.ok(!text.includes(binding.evidenceDigest));assert.ok(!text.includes('Build AI skills'));assert.ok(!text.includes('100'));assert.ok(!text.includes('Zeta'));
});

test('normalized labor-market series remain compatible with actionBinding normalization',async()=>{
 const current=structuredClone(packet);current.sources.push({id:'I2',status:'loaded',facts:{rows:[{series_id:'LNS14000000',value:4,observationDate:'2026-09-30'},{series_id:'CES0000000001',value:100,observationDate:'2026-09-30'}]}});
 const binding=await bind(current),fingerprint=await evidenceFingerprint(current,'canonical');assert.equal(binding.evidenceDigest,fingerprint.canonical);
 const worker=createHomeBundlePreparation(),result=await worker.run({mode:'new-pin',binding,packet:current,stored:null,isCurrent:()=>true,prepare:async()=>({proposal:bundleProposalFixture(binding.goal)}),commit:()=>{}});assert.equal(result.status,'ready');
});
