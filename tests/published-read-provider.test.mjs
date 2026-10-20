import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sha256,canonicalJson} from '../lib/public-fixture/read-provider.mjs';
import {parsePublishedSnapshot,createPublishedReadProvider} from '../lib/public-fixture/published-read-provider.mjs';
const base=new URL('./fixtures/public-headcount/',import.meta.url);
const text=readFileSync(new URL('manifest.json',base),'utf8');
const pin=readFileSync(new URL('manifest.sha256',base),'utf8').trim();
const manifest=parsePublishedSnapshot(text,pin), provider=createPublishedReadProvider(text,pin);
function changed(edit){const m=JSON.parse(text);edit(m);for(const d of m.documents)d.sha256=sha256(canonicalJson(d.body));const t=JSON.stringify(m);return ()=>parsePublishedSnapshot(t,sha256(t));}
test('exact data-field parity against separately saved projected public golden responses',()=>{
 for(const doc of manifest.documents){const expected=JSON.parse(readFileSync(new URL(doc.target.split('/').at(-1)+'.json',base),'utf8'));assert.equal(sha256(canonicalJson(expected)),doc.sha256);assert.deepEqual(provider.read(doc.target).body,expected);}
 const trend=provider.read('/api/headcount-trend').body;
 assert.equal(trend.length,33);assert.equal(trend[0].headcount,8400);assert.equal(trend.at(-1).headcount,9037);assert.equal(trend.at(-1).headcount-trend[0].headcount,637);
 assert.equal(provider.read('/api/headcount').body.headcount,9037);
 assert.equal(provider.parity,'two-unfiltered-get-data-fields-only');
});
test('public metadata and arbitrary fields are not part of the fixture schema',()=>{
 for(const edit of [m=>{m.documents[0].body.data_meta={};},m=>{m.provenance.datasetToken='anything';},m=>{m.documents[1].body[0].private='anything';},m=>{m.contract='production';},m=>{m.provenance.origin='https://elsewhere.example';},m=>{m.provenance.capturedAt='2026-02-30T00:00:00.000Z';}])assert.throws(changed(edit));
 assert.equal(Object.hasOwn(provider.read('/api/headcount').body,'data_meta'),false);
});
test('pinned manifest, content hashes, monthly coverage and cross-document reconciliation fail closed',()=>{
 assert.throws(()=>parsePublishedSnapshot(text.replace('9037','9038'),pin),/manifest digest/);
 const m=JSON.parse(text);m.documents[0].body.headcount=9038;const t=JSON.stringify(m);assert.throws(()=>parsePublishedSnapshot(t,sha256(t)),/content digest/);
 for(const edit of [m=>{m.documents[0].body.headcount=9038;},m=>{m.documents[1].body.splice(1,1);},m=>{m.documents[1].body[1].snapshot_date='2024-02-28';},m=>{m.documents[1].target=m.documents[0].target;},m=>{m.documents[1].body[0].fte='8234.6';}])assert.throws(changed(edit));
});
test('scope/method rejection and immutable reads do not imply public error-response parity',()=>{
 for(const target of ['/api/headcount?','/api/headcount?country=all','/api/headcount?country=A&country=B','/api/%68eadcount','/api/a/../headcount','/api/headcount/','https://www.ed-ai.app/api/headcount','/api/headcount#x'])assert.equal(provider.read(target).status,400);
 assert.equal(provider.read('/api/dashboard').status,404);assert.equal(provider.read('/api/headcount',{method:'POST'}).status,405);
 assert.throws(()=>{provider.read('/api/headcount').body.headcount=0;},TypeError);
});
