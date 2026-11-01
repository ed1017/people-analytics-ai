import test from 'node:test';
import assert from 'node:assert/strict';
import {canadaDutyGuidanceReferences} from '../lib/position-canada-duty-guidance.ts';
import source from '../lib/data/statcan-noc-duty-guidance-v2021.json' with {type:'json'};
import {generateCompanyPositionInventoryV2} from '../lib/company-position-model-v2.ts';

test('eight exact Canadian mappings cover ten vacancies and exclude five held roles',()=>{
  const refs=canadaDutyGuidanceReferences(),inventory=generateCompanyPositionInventoryV2();
  assert.equal(refs.length,8);assert.equal(new Set(refs.map(r=>r.id)).size,8);
  const canada=inventory.positions.filter(p=>p.status==='vacant'&&p.countryCode==='CA');
  assert.equal(canada.length,15);
  assert.equal(canada.filter(p=>refs.some(r=>r.countryCode===p.countryCode&&r.roles.includes(p.role))).length,10);
  for(const mapping of source.mappings){
    assert.equal(canada.filter(p=>p.role===mapping.role).length,mapping.vacancyCount);
    assert.equal(refs.filter(r=>r.roles.includes(mapping.role)).length,1);
  }
  for(const role of source.heldRoles)assert.equal(refs.some(r=>r.roles.includes(role)),false);
  assert.ok(refs.every(r=>r.countryCode==='CA'));
});

test('canonical facts preserve every duty and entry qualifier in source order',()=>{
  for(const r of canadaDutyGuidanceReferences()){
    const o=source.occupations[r.occupationCode];
    assert.equal(r.facts.dutyPreamble,o.dutyPreamble.text.trim());
    assert.equal(r.facts.dutyPreamble,'This group performs some or all of the following duties:');
    assert.deepEqual(r.facts.dutyGroups.flatMap(g=>g.items),o.duties.filter(d=>!d.isHeading).map(d=>d.text.trim()));
    assert.deepEqual(r.facts.entryGuidance,o.entryGuidance.map(d=>d.text.trim()));
    assert.deepEqual(r.facts.exclusions,o.exclusions.map(d=>d.text.trim()));
    assert.equal(r.facts.ordering,'source order, not ranking');
    assert.ok(r.facts.entryGuidance.some(s=>/required|may|usually/.test(s)));
  }
});

test('database subgroup labels are explicit source headings, never counted as duties',()=>{
  const ref=canadaDutyGuidanceReferences().find(r=>r.roles.includes('Data Engineer'));
  assert.deepEqual(ref.facts.dutyGroups.map(g=>[g.label,g.items.length]),[['Database analysts',6],['Data administrators',6]]);
  const o=source.occupations['21223'];
  assert.deepEqual(o.duties.filter(r=>r.isHeading).map(r=>r.csvRecord),[6078,6085]);
  assert.match(ref.mappingDuties,/substantively includes database architecture/);
  assert.match(ref.mappingLimit,/Generic pipeline operations without/);
  for(const other of canadaDutyGuidanceReferences().filter(r=>r.occupationCode!=='21223')){
    assert.equal(other.facts.dutyGroups.length,1);assert.equal(other.facts.dutyGroups[0].label,null);
  }
});

test('Cloud title provenance is All examples6142 and licensing is not generalized',()=>{
  const o=source.occupations['21231'],ref=canadaDutyGuidanceReferences().find(r=>r.occupationCode==='21231');
  assert.equal(o.mappingTitleEvidence.elementType,'All examples');
  assert.equal(o.mappingTitleEvidence.csvRecord,6142);
  assert.equal(o.mappingTitleEvidence.text,'cloud architect ');
  assert.match(ref.mappingLimit,/not every cloud role/);
  assert.ok(ref.facts.entryGuidance.some(s=>s.includes('to practise as a Professional Engineer (P.Eng.)')));
});

test('edition, licensing and unknown observation remain distinct from numerical market measures',()=>{
  for(const r of canadaDutyGuidanceReferences()){
    assert.equal(r.sourceSha256,'50c3e31a90b0150cc5b8efd29ec020c2fd9ea5fc5b0a171ed65d3cd9a0abf32f');
    assert.equal(r.facts.releaseDate,'2021-09-28');assert.equal(r.facts.capturedAt,'2026-11-01');
    assert.equal(r.facts.observationDate,null);assert.equal(r.facts.taxonomy,'NOC 2021 Version 1.0');
    assert.equal(r.licence,'Statistics Canada Open Licence');
    assert.match(r.attribution,/Adapted from Statistics Canada/);assert.match(r.attribution,/does not constitute an endorsement/);
    for(const key of ['score','importance','level','demand','pay','sample','timeToFill'])assert.equal(r.facts[key],undefined);
    assert.match(r.mappingLimit,/Actual duties require confirmation/);
  }
});

test('returned facts are independent copies and cannot mutate later canonical reads',()=>{
  const first=canadaDutyGuidanceReferences(),before=structuredClone(first);
  first[0].facts.dutyGroups[0].items[0]='invented';first[0].roles.push('Strategy Analyst');
  assert.deepEqual(canadaDutyGuidanceReferences(),before);
});
