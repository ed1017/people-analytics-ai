import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {canadaDutyExpansionReferences as refs} from '../lib/position-canada-duty-expansion.ts';
import {canadaDutyGuidanceReferences as prior} from '../lib/position-canada-duty-guidance.ts';
import source from '../lib/data/statcan-noc-duty-expansion-v2021.json' with {type:'json'};
import {generateCompanyPositionInventoryV2} from '../lib/company-position-model-v2.ts';

test('original eight Canadian reference objects remain byte-identical',()=>{
 const before=JSON.stringify(prior());refs();assert.equal(JSON.stringify(prior()),before);
 assert.equal(createHash('sha256').update(before).digest('hex'),'0d6b4c70f21d320e5cab871cd61a229eb305af3504031592fadf4a6dd707a4eb');
});
test('four independently reviewed source fits cover four CA vacancies, not held Sales Operations',()=>{
 const got=refs();assert.equal(got.length,4);
 assert.deepEqual(got.map(r=>[r.roles[0],r.occupationCode]),[['Business Operations Specialist','11201'],['Strategy Analyst','11201'],['AI Architect','21231'],['Sales Account Executive','64101']]);
 const inventory=generateCompanyPositionInventoryV2().positions.filter(p=>p.status==='vacant'&&p.countryCode==='CA');
 for(const r of got){assert.equal(inventory.filter(p=>r.roles.includes(p.role)).length,1);assert.equal(r.countryCode,'CA');assert.match(r.mappingDuties,/Confirm actual planned duties/);assert.match(r.mappingLimit,/Modeled duties and external-source consent are separate/);}
 assert.ok(!got.some(r=>r.roles.includes('Sales Operations Specialist')));
 assert.equal(new Set([...prior(),...got].map(r=>r.id)).size,12);
});
test('reused facts preserve canonical source profiles while roles and conditions remain explicit',()=>{
 for(const r of refs().filter(r=>r.occupationCode!=='64101')){
  const old=prior().find(p=>p.occupationCode===r.occupationCode);assert.deepEqual(r.facts,old.facts);assert.notEqual(r.id,old.id);assert.notEqual(r.version,old.version);assert.notEqual(r.mappingDuties,old.mappingDuties);
 }
 const ai=refs().find(r=>r.roles[0]==='AI Architect');assert.match(ai.mappingDuties,/Not AI research, network-only architecture/);assert.doesNotMatch(ai.mappingDuties,/Cloud Architect/);
 assert.match(refs().find(r=>r.roles[0]==='Strategy Analyst').mappingDuties,/not investment analysis or transaction execution/);
});
test('new64101 exact raw records retain qualifiers, source coordinates and rights',()=>{
 assert.equal(createHash('sha256').update(readFileSync(new URL('../lib/data/statcan-noc-duty-expansion-v2021.json',import.meta.url))).digest('hex'),'4165f8022a51a085bae407dfdd55d171dc06624a9ced925e186a1c1c096e3760');
 const r=refs().find(r=>r.occupationCode==='64101'),records=source.occupation.records;
 assert.equal(records.find(r=>r.csvRecord===21239).text,'business services sales representative ');
 assert.deepEqual(records.filter(r=>r.elementType==='Main duties').map(r=>r.csvRecord),Array.from({length:11},(_,i)=>21364+i));
 assert.equal(r.facts.dutyPreamble,'This group performs some or all of the following duties:');
 assert.deepEqual(r.facts.dutyGroups[0].items,records.filter(r=>r.elementType==='Main duties').slice(1).map(r=>r.text.trim()));
 assert.deepEqual(r.facts.entryGuidance,records.filter(r=>r.elementType==='Employment requirements').map(r=>r.text.trim()));
 assert.equal(r.facts.entryGuidance.length,6);assert.ok(r.facts.entryGuidance.some(x=>x.startsWith('Voluntary certification')));
 assert.match(r.mappingDuties,/Non-technical business-service/);assert.equal(r.sourceSha256,'50c3e31a90b0150cc5b8efd29ec020c2fd9ea5fc5b0a171ed65d3cd9a0abf32f');
 assert.equal(r.licence,'Statistics Canada Open Licence');assert.match(r.attribution,/does not constitute an endorsement/);
});
test('qualitative scope and dates remain honest; returned objects cannot mutate canonical facts',()=>{
 const original=refs(),before=structuredClone(original);
 for(const r of original){assert.equal(r.facts.observationDate,null);assert.equal(r.facts.releaseDate,'2021-09-28');for(const key of ['demand','pay','score','applicants','proficiency'])assert.equal(r.facts[key],undefined);}
 original[0].facts.dutyGroups[0].items[0]='changed';original[3].facts.entryGuidance[0]='changed';assert.deepEqual(refs(),before);
});
