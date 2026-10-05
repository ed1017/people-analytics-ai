import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {exitDemoPresentation} from './manual/generate-exit-demo-presentation.mjs';
const artifact=JSON.parse(await fs.readFile(new URL('../lib/data/aggregate-exit-demo-v1.json',import.meta.url),'utf8'));
const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/aggregate-exit-history.json',import.meta.url),'utf8'));

test('checked-in presentation reproduces the reviewed offline calculation and identities',async()=>{
 assert.deepEqual(artifact,await exitDemoPresentation());
 assert.equal(artifact.identities.fixtureSha256,'64acf5cbb0cddbaa0614e20ee3895cd026ebe3ec9c91fed622820b53b44d63cd');
 assert.equal(artifact.identities.datasetFingerprint,'7887ad425425356be28dc143c2776069309ced0cf05a602a842ee8216b75c280');
});
test('recorded subtotal and excluded history refer to different calendar periods',()=>{
 const ytd=fixture.months.filter(row=>row.month>='2026-01'&&row.month<='2026-09');
 assert.equal(ytd.length,9);
 assert.equal(artifact.recordedSubtotal.value,ytd.reduce((n,row)=>n+row.voluntaryExits,0));
 assert.equal(artifact.recordedSubtotal.start,'2026-01');assert.equal(artifact.recordedSubtotal.end,'2026-09');
 assert.deepEqual(artifact.history.excluded,[{month:'2024-01',reason:'unverified-join-zero'}]);
 assert.equal(artifact.recordedSubtotal.completenessVerified,false);
 assert.equal(artifact.conditional.yearEndTotal,artifact.recordedSubtotal.value+artifact.conditional.remainingTotal);
 assert.equal(artifact.conditional.remainingTotal,artifact.conditional.points.reduce((n,p)=>n+p.expectedExits,0));
});
test('presentation does not promote qualification or invent exposure, intervals and model accuracy',()=>{
 assert.equal(artifact.status,'conditional-retrospective-synthetic-demo');assert.equal(artifact.operationallyQualified,false);
 assert.ok(Object.values(artifact.qualification).every(value=>value===false));
 assert.equal(artifact.rate,null);assert.equal(artifact.uncertainty.interval,null);assert.equal(artifact.uncertainty.status,'unavailable');
 assert.equal(artifact.provenance.temporalAvailability,'retrospective-final-data');assert.equal(artifact.provenance.completeness,'unverified');
 assert.equal(artifact.evaluation.assessmentCustody,'not-untouched');assert.equal(artifact.evaluation.distinctDevelopmentMonths,5);
 assert.equal(artifact.selectedMethod,'recent-mean-3');
 assert.doesNotMatch(JSON.stringify(artifact),/employee_id|manager_employee_id|base_salary|monthEndHeadcount|"months":\[/);
});
