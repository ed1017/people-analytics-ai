import test from 'node:test';
import assert from 'node:assert/strict';
import {businessAnalystCareerReferences} from '../lib/position-uk-business-analyst-career.ts';
import {careerProfileReferences} from '../lib/position-career-profile-skills.ts';
import source from '../lib/data/ncs-business-analyst-career-profile-20261101.json' with {type:'json'};
import aiSource from '../lib/data/ncs-ai-engineer-career-profile-20261101.json' with {type:'json'};

test('GB Business Operations receives only broader qualitative process-analysis guidance',()=>{
 const [r]=businessAnalystCareerReferences(); assert.equal(r.id,'ncs-career-profile:business-analyst:GB'); assert.equal(r.countryCode,'GB'); assert.deepEqual(r.roles,['Business Operations Specialist']); assert.ok(r.occupationCode.length<=20); assert.equal(r.occupation,'Business analyst'); assert.equal(r.facts.profileScope,'England careers guidance'); assert.match(r.mappingDuties,/Not routine coordination or reporting alone/); assert.match(r.mappingLimit,/do not imply external-evidence consent/);
});
test('source order, unknown update and immutable snapshots are retained without scores',()=>{
 const [r]=businessAnalystCareerReferences(); assert.deepEqual(r.facts.skills,source.skills); assert.deepEqual(r.facts.tasks,source.tasks); assert.equal(r.facts.skills.length,9); assert.equal(r.facts.tasks.length,6); assert.equal(r.facts.sourceUpdatedAt,null); assert.equal(r.facts.ordering,'source order, not ranking'); assert.equal(r.sourceSha256,'6f21a2b50b0f4eadd679d99017fef232874d823d6cadfe3d88837a3e4dc9420d'); assert.match(r.licence,/Open Government Licence v3/); for(const key of ['importance','level','pay','demand','score']) assert.equal(r.facts[key],undefined); r.facts.skills[0]='changed'; assert.equal(businessAnalystCareerReferences()[0].facts.skills[0],source.skills[0]);
});
test('existing AI engineer reference stays separate and unchanged',()=>{
 const before=careerProfileReferences(); businessAnalystCareerReferences(); assert.deepEqual(careerProfileReferences(),before); assert.equal(before.length,1); assert.equal(before[0].id,'ncs-career-profile:ai-engineer:GB'); assert.deepEqual(before[0].facts.skills,aiSource.skills); assert.deepEqual(before[0].facts.tasks,aiSource.tasks); assert.equal(before[0].sourceSha256,'1f055d65412e10ea6cdc1e0f9135a0436a8101546b2f36e6aaeb5eafa841e701');
});
