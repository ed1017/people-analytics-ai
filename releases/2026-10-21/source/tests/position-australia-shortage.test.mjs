import test from 'node:test';import assert from 'node:assert/strict';
import source from '../lib/data/jsa-osl-selected-2026.json' with {type:'json'};
import {australiaShortageReferences as refs} from '../lib/position-australia-shortage.ts';
test('exact three source coordinates and independent conditional roles',()=>{const r=refs();assert.deepEqual(r.map(x=>[x.occupationCode,x.facts.sourceExcelRow,x.facts.ratingCode]),[['221212',144,'NS'],['224713',177,'NS'],['2713',137,'S']]);assert.deepEqual(r.flatMap(x=>x.roles),['Treasury Specialist','Management Consultant','Privacy Counsel']);for(const x of r){assert.equal(x.countryCode,'AU');assert.equal(x.facts.taxonomy,'ANZSCO 2022');assert.match(x.mappingLimit,/separate confirmation/);assert.equal(x.sourceSha256.length,64);}});
test('group driver never becomes confidence, and no shortage is not numerical hiring ease',()=>{const [t,m,p]=refs();assert.equal(t.facts.confidence,'Clear');assert.equal(m.facts.shortageDriver,null);assert.equal(p.facts.confidence,null);assert.equal(p.facts.shortageDriver,'Suitability gap');assert.equal(p.facts.classificationLevel,'unit-group');assert.notEqual(p.sourceSha256,t.sourceSha256);for(const r of refs()){for(const k of ['applicants','timeToFill','pay','probability','score'])assert.equal(r.facts[k],undefined);assert.match(r.mappingLimit,/does not mean easy hiring/);}});
test('source snapshots do not share mutable raw records',()=>{const r=refs();r[0].facts.raw.C='S';assert.equal(refs()[0].facts.raw.C,'NS');});
test('unknown and blank source classifications fail closed; R/M keep exact geography labels',()=>{const row=source.records[0],saved={...row.raw};try{for(const bad of ['', 'UNKNOWN']){row.raw.C=bad;assert.throws(refs,/Invalid shortage/);}for(const [c,l] of [['R','Regional shortage'],['M','Metropolitan shortage']]){row.raw.C=c;assert.equal(refs()[0].facts.ratingLabel,l);}row.raw.C='NS';row.raw.D='';assert.throws(refs,/confidence/);}finally{Object.assign(row.raw,saved);}});

test('required attribution and bounded extraction provenance remain precise',()=>{
 assert.ok(source.attribution.startsWith('\u00a9 Commonwealth of Australia'));
 assert.match(source.provenance,/Parent Linux extraction worker/);
 assert.match(source.provenance,/local adapter author did not read original workbook bytes/);
 assert.equal(source.methodologyUrl,'https://www.jobsandskills.gov.au/sites/default/files/2026-10/2026_osl_methodology.pdf');
 assert.match(source.methodologyEvidence,/Official catalogue/);
});

test('period is the verified assessment year, not an inferred publication date',()=>{assert.equal(refs()[0].period,'2026 assessment');assert.equal(source.capturedAt,'2026-11-01');});

test('canonical payload excludes unused classification fields and separates licence from policy',()=>{
 for(const r of refs()){
  assert.deepEqual(Object.keys(r.facts.raw).sort(),['A','B','C','D']);
  assert.equal(r.licenceUrl,'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(r.facts.rightsPolicyUrl,'https://www.jobsandskills.gov.au/copyright-and-disclaimer');
 }
 for(const r of source.records){assert.equal(r.raw.E,'1');assert.equal(r.raw.F,'2');}
});
