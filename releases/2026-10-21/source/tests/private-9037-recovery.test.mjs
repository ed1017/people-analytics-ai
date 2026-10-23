import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {load9037PreviewBinding} from '../lib/dataset-9037-preview.server.mjs';
import * as rangeContext from '../lib/compensation-range-context.ts';
import * as releaseContext from '../lib/compensation-release-context.ts';
import * as datasetClient from '../lib/dataset-client.mjs';
import * as catalogDisplay from '../lib/catalog-display.ts';
import {AssumptionsDisclosure} from './fixtures/assumptions-disclosure.mjs';
import {compensationRelease as legacyManifest} from '../lib/compensation-release.ts';

const hostname='people-analytics-kapnmdmxs-ed-56dc.vercel.app';
const binding=await load9037PreviewBinding({hostname});
const token=await binding.router.bootstrapToken();
async function read(route) {
  const response=await binding.handle(new Request(`https://${hostname}${route}`,{headers:{'x-workforce-dataset':token}}));
  assert.equal(response.status,200,route);
  return response.json();
}
const catalog=await read('/api/compensation-ranges');
const release=await read('/api/compensation-job-release');
const source=fs.readFileSync(new URL('../components/compensation-job-ranges.tsx',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={},require=createRequire(import.meta.url);
vm.runInNewContext(js,{exports,require:name=>name==='@/lib/catalog-display'?catalogDisplay:name==='@/components/assumptions-disclosure'?{AssumptionsDisclosure}:name==='@/lib/dataset-client.mjs'?datasetClient:name==='@/lib/compensation-range-context'?rangeContext:name==='@/lib/compensation-release-context'?releaseContext:require(name)});
const render=value=>renderToStaticMarkup(React.createElement(exports.JobRangeTable,{catalog:value,scope:rangeContext.defaultRangeScope,releaseRows:null}));

test('pinned private 9037 catalog renders actual stored ranges with recovered component',()=>{
  assert.equal(token,'workforce-demo-skills-20261023-local-v1:1');
  assert.equal(catalog.constructedPolicy.version,'constructed-9037-inherited-range-policy-v1');
  const ranges=rangeContext.rangesForScope(catalog,rangeContext.defaultRangeScope);
  assert.ok(ranges.length>0);
  const html=render(catalog);
  assert.doesNotMatch(html,/Job range catalog unavailable|<circle/);
  for(const job of catalog.jobs) assert.ok(html.includes(catalogDisplay.catalogDisplayLabel(job.job_profile_name)));
});
test('invalid private catalog policy remains contained at the table boundary',()=>{
  assert.match(render({...catalog,constructedPolicy:{...catalog.constructedPolicy,version:'invalid'}}),/Job range catalog unavailable/);
});
test('reviewed private 9037 release validates and renders 48 means while two jobs stay withheld',()=>{
  const rows=releaseContext.validateCompensationContext(release,token);
  assert.equal(rows.length,50);
  assert.equal(rows.filter(row=>row.status==='published').length,48);
  assert.deepEqual(rows.filter(row=>row.status==='withheld').map(row=>row.job_profile_code),['AI-ARCH','COMMS-GEN']);
  const html=renderToStaticMarkup(React.createElement(exports.JobRangeTable,{catalog,scope:rangeContext.defaultRangeScope,releaseRows:rows}));
  assert.equal((html.match(/<circle/g)||[]).length,48);
  assert.equal((html.match(/Current: Withheld<\/p>/g)||[]).length,2);
  assert.equal(release.data_meta.publicationApproved,false);
});

test('9037 validation rejects stale tokens, other datasets, scope changes and publication claims',()=>{
  for(const changedToken of [token.replace(/:1$/,':2'),'workforce-demo-9847-2026-09-30-local-final-v1:1','legacy-v1:0',token.replace(/:1$/,':0'),token+':1']) {
    assert.throws(()=>releaseContext.validateCompensationContext(release,changedToken));
  }
  for(const edit of [
    data=>{data.scope.org='BU-TECH';}, data=>{data.scope.country='US';}, data=>{data.scope.level='L1';},
    data=>{data.scope.extra=null;}, data=>{data.snapshot_date='2026-10-01';},
    data=>{data.release_id='compa-demo-9847-2026-09-30-local-v1';},
    data=>{delete data.data_meta;}, data=>{data.data_meta.datasetToken=token.replace(/:1$/,':2');},
    data=>{data.data_meta.datasetId='legacy-v1';}, data=>{data.data_meta.bundleDigest='0'.repeat(64);},
    data=>{data.data_meta.cutoff='2026-10-01';},data=>{data.data_meta.contract='other';},
    data=>{data.data_meta.publicationApproved=true;}, data=>{data.data_meta.dataClass='observed';},
  ]) {const data=structuredClone(release);edit(data);assert.throws(()=>releaseContext.validateCompensationContext(data,token));}
});

test('9037 validation retains exact rows, lineage, precision and companion suppression',()=>{
  for(const edit of [
    data=>{data.rows.pop();},data=>{data.rows[1]=data.rows[0];},
    data=>{data.rows[1].job_profile_code='UNREVIEWED';},data=>{data.rows[1].job_profile_name='';},
    data=>{data.rows[1].base_pay_provenance='constructed_workforce_demo_9847_v2';},
    data=>{data.rows[1].range_policy_version='constructed-demo-9847-ranges-v2';},
    data=>{data.rows[1].range_provenance='market';},data=>{data.rows[1].release_id='other';},
    data=>{data.rows[1].snapshot_date='2026-10-01';},data=>{data.rows[1].mean_compa_pct=Infinity;},
    data=>{data.rows[1].mean_compa_pct=0;},data=>{data.rows[1].mean_compa_pct=99.1234567;},
    data=>{data.rows[1].coverage='partial';},data=>{data.rows[1].salary_sum=100;},
    data=>{data.rows[0].mean_compa_pct=100;data.rows[0].status='published';data.rows[0].coverage='complete';},
    data=>{data.rows.find(row=>row.job_profile_code==='COMMS-GEN').mean_compa_pct=100;},
    data=>{data.rows[1].status='withheld';data.rows[1].mean_compa_pct=null;data.rows[1].coverage='withheld';},
  ]) {const data=structuredClone(release);edit(data);assert.throws(()=>releaseContext.validateCompensationContext(data,token));}
});

test('filtered tables never substitute company means',()=>{
  const rows=releaseContext.validateCompensationContext(release,token);
  const html=renderToStaticMarkup(React.createElement(exports.JobRangeTable,{catalog,scope:{...rangeContext.defaultRangeScope,country:'US'},releaseRows:rows}));
  assert.doesNotMatch(html,/<circle/);
});

test('legacy and 9847 validators retain their existing dataset boundaries',()=>{
  const legacy={release_id:legacyManifest.releaseId,snapshot_date:legacyManifest.snapshotDate,scope:{country:null,org:null,level:null},rows:legacyManifest.jobCodes.map(code=>({release_id:legacyManifest.releaseId,snapshot_date:legacyManifest.snapshotDate,job_profile_code:code,job_profile_name:code,status:'published',mean_compa_pct:100,coverage:'complete',base_pay_provenance:legacyManifest.basePayProvenance,range_provenance:legacyManifest.rangeProvenance,range_policy_version:legacyManifest.rangePolicyVersion}))};
  assert.equal(releaseContext.validateCompensationContext(legacy,'legacy-v1:0').length,50);
  const demo=structuredClone(release),demoToken='workforce-demo-9847-2026-09-30-local-final-v1:1';
  demo.release_id='compa-demo-9847-2026-09-30-local-v1';
  demo.data_meta.datasetToken=demoToken;
  for(const row of demo.rows) Object.assign(row,{release_id:demo.release_id,base_pay_provenance:'constructed_workforce_demo_9847_v2',range_policy_version:'constructed-demo-9847-ranges-v2'});
  assert.equal(releaseContext.validateCompensationContext(demo,demoToken).length,50);
  assert.throws(()=>releaseContext.validateCompensationContext(demo,token));
  assert.throws(()=>releaseContext.validateCompensationContext(release,demoToken));
});

test('protected preview retains host, method, scope and dataset-token enforcement',async()=>{
  for(const request of [
    new Request('http://'+hostname+'/api/compensation-job-release',{headers:{'x-workforce-dataset':token}}),
    new Request('https://other.invalid/api/compensation-job-release',{headers:{'x-workforce-dataset':token}}),
    new Request('https://'+hostname+'/api/compensation-job-release',{method:'POST',headers:{'x-workforce-dataset':token}}),
    new Request('https://'+hostname+'/api/compensation-job-release?org=BU-TECH',{headers:{'x-workforce-dataset':token}}),
    new Request('https://'+hostname+'/api/compensation-job-release',{headers:{'x-workforce-dataset':'legacy-v1:0'}}),
  ]) assert.notEqual((await binding.handle(request)).status,200);
});
