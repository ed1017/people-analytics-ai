import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import source from '../lib/data/esco-people-analytics-skills-v120.json' with {type:'json'};
import {peopleAnalyticsEscoReferences} from '../lib/position-people-analytics-esco.ts';

test('all 67 relations preserve original labels, order, type and pinned source identity',()=>{
 const row=source.records[0], r=peopleAnalyticsEscoReferences()[0];
 assert.equal(row.sha256,'15f89371dd4011480b0d1f56e2362cc6e15a5f764bb4a14e0b8c452ebd31f8cb');
 assert.equal(row.bytes,55498);
 assert.equal(createHash('sha256').update(JSON.stringify(row.relations)).digest('hex'),'f5f58c0715bc7cf6071b85ddf3c69b842edac8cfd11cf2d9ad9d2aa826be2149');
 assert.equal(r.facts.essentialCount,36);assert.equal(r.facts.optionalCount,31);
 assert.deepEqual(r.facts.items,row.relations.map(x=>({uri:x.uri,labelEn:x.labelEn,relation:x.sourceRelation==='hasEssentialSkill'?'essential':'optional',skillType:x.skillType===null?null:x.skillType.endsWith('/knowledge')?'knowledge':'skill',sourceOrder:x.sourceOrder})));
});
test('only German People Analytics maps to broader Data analyst without predictive requirement',()=>{
 const refs=peopleAnalyticsEscoReferences();assert.equal(refs.length,1);const r=refs[0];
 assert.deepEqual(r.roles,['People Analytics Analyst']);assert.equal(r.countryCode,'DE');assert.equal(r.occupationCode,'2511.3');
 assert.equal(r.facts.occupationUri,'http://data.europa.eu/esco/occupation/d3edb8f8-3a06-47a0-8fb9-9b212c006aa2');
 assert.match(r.mappingDuties,/workforce data validation, statistical analysis and interpretation/);
 assert.match(r.mappingDuties,/Acknowledge the broader Data analyst taxonomy/);
 assert.match(r.mappingDuties,/Predictive modeling is not required/);
 assert.match(r.mappingDuties,/Exclude routine personnel administration or dashboard production without substantive analysis/);
 assert.match(r.mappingLimit,/not confirmed vacancy requirements/);
});
test('source taxonomy keeps geography, licensing and non-quantitative semantics',()=>{
 const r=peopleAnalyticsEscoReferences()[0];assert.equal(r.facts.sourceGeography,'European occupational classification');assert.equal(r.facts.countryApplicability,'DE');
 assert.equal(r.facts.ordering,'source relation order, not ranking');
 assert.equal(r.licenceUrl,'https://creativecommons.org/licenses/by/4.0/');assert.match(r.attribution,/European Commission/);assert.match(r.attribution,/No endorsement/);
 assert.match(r.mappingLimit,/not country-specific measured hiring demand/);
 assert.match(r.mappingLimit,/Attachment does not change cost, timing, pay or readiness/);
 for(const x of r.facts.items)for(const key of ['score','level','importance','demand','pay'])assert.equal(x[key],undefined);
});
test('returned facts are fresh snapshots and version pins the exact source',()=>{
 const r=peopleAnalyticsEscoReferences()[0];assert.equal(r.version,'esco-people-analytics-skills-v120-v1:15f89371dd4011480b0d1f56e2362cc6e15a5f764bb4a14e0b8c452ebd31f8cb:conditional-duties-v1');
 r.facts.items[0].labelEn='changed';assert.notEqual(peopleAnalyticsEscoReferences()[0].facts.items[0].labelEn,'changed');
});
