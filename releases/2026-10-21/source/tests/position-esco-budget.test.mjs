import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import source from '../lib/data/esco-budget-skills-v120.json' with {type:'json'};
import {escoBudgetReferences} from '../lib/position-esco-budget.ts';

test('reviewed original and all23 source relations retain exact identity and order',()=>{
 const row=source.records[0],ref=escoBudgetReferences()[0];
 assert.equal(source.records.length,1);
 assert.equal(row.sha256,'bb2ebba4f43b163be7ca89ffb45a916a4d4c0074392e3dea39047d2172d18513');
 // Independently computed from the retained original response, before adapter creation.
 assert.equal(createHash('sha256').update(JSON.stringify(row.relations)).digest('hex'),'804fe3dcf6eee9d8e6e496a767521d5475efced2a5386e312fd3167d723940d2');
 assert.equal(ref.sourceSha256,row.sha256);assert.equal(ref.facts.items.length,23);
 assert.equal(ref.facts.essentialCount,11);assert.equal(ref.facts.optionalCount,12);
 for(let i=0;i<23;i++){const raw=row.relations[i],item=ref.facts.items[i];assert.equal(item.uri,raw.uri);assert.equal(item.labelEn,raw.labelEn);assert.equal(item.sourceOrder,raw.sourceOrder);assert.equal(item.relation,raw.sourceRelation==='hasEssentialSkill'?'essential':'optional');assert.equal(item.skillType,raw.skillType===null?null:raw.skillType.endsWith('/knowledge')?'knowledge':'skill');}
});
test('only French FP&A receives a conditional narrower budget reference',()=>{
 const refs=escoBudgetReferences();assert.equal(refs.length,1);const r=refs[0];
 assert.deepEqual(r.roles,['Financial Planning and Analysis Analyst']);assert.equal(r.countryCode,'FR');assert.equal(r.occupationCode,'2411.1.4');
 assert.equal(r.id,'esco-skills:2411.1.4:Financial Planning and Analysis Analyst:FR');
 assert.match(r.mappingDuties,/budget preparation and review, expenditure monitoring and financial-performance reporting/);
 assert.match(r.mappingDuties,/Exclude roles primarily performing investment or valuation analysis, accounting or audit/);
 assert.match(r.mappingLimit,/narrower budgeting reference/);assert.match(r.mappingLimit,/not confirmed duties or FP&A requirements/);
 assert.equal(r.facts.sourceGeography,'European occupational classification');assert.equal(r.facts.countryApplicability,'FR');
});
test('taxonomy retains optional relations and no invented quantitative claims',()=>{
 const r=escoBudgetReferences()[0];assert.equal(r.facts.ordering,'source relation order, not ranking');
 for(const item of r.facts.items)for(const key of ['importance','level','score','demand','pay'])assert.equal(item[key],undefined);
 const optional=r.facts.items.filter(x=>x.relation==='optional');assert.equal(optional.length,12);
 assert.ok(optional.some(x=>/portfolio|public finance/.test(x.labelEn)));
 assert.match(r.mappingLimit,/not country-specific measured hiring demand/);assert.match(r.mappingLimit,/does not change cost, timing, pay or readiness/);
});
test('version, reuse attribution and returned snapshots remain stable',()=>{
 const r=escoBudgetReferences()[0];assert.equal(r.facts.datasetVersion,'v1.2.0');assert.match(r.facts.versionNote,/self links omit version/);
 assert.equal(r.licenceUrl,'https://creativecommons.org/licenses/by/4.0/');assert.match(r.attribution,/European Commission/);assert.match(r.attribution,/selected and reformatted/);assert.match(r.attribution,/No endorsement/);
 assert.equal(r.facts.copyrightNoticeUrl,'https://esco.ec.europa.eu/en/copyright-notice-esco-skills-competences');
 r.facts.items[0].labelEn='tampered';assert.notEqual(escoBudgetReferences()[0].facts.items[0].labelEn,'tampered');
});
