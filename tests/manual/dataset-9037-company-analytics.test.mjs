// Real captured inputs required. No private captures/configuration belong in Git.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {create9037OfflineProvider, OFFLINE_9037_DATASET_ID as id, OFFLINE_9037_INTEGRITY_DIGEST as digest} from '../../lib/dataset-9037-offline-provider.mjs';
import {create9037CompanyAnalytics} from '../../lib/dataset-9037-company-analytics.mjs';
import {createLocalDatasetIntegration} from '../../lib/dataset-local-integration.mjs';
import {LOCAL_COMPANY_GET_ROUTES} from '../../lib/dataset-local-api.mjs';
import {DatasetRouter} from '../../lib/dataset-router.mjs';

const root=process.env.DATASET_9037_REVIEW_ROOT;
assert.ok(root&&process.env.DATASET_9037_ANALYTICS_FILE&&process.env.DATASET_9037_ANALYTICS_SHA256,'Explicit reviewed component root, captured query map and separate pin required');
const input={expectedIntegrityDigest:digest,integrityBytes:fs.readFileSync(path.join(root,'integrity-manifest.json')),contractBytes:fs.readFileSync(path.join(root,'component-contracts.json')),componentBytes:fs.readFileSync(path.join(root,'components.json'))};
const provider=create9037OfflineProvider(input);
const aggregateBytes=fs.readFileSync(process.env.DATASET_9037_ANALYTICS_FILE),expectedAggregateDigest=process.env.DATASET_9037_ANALYTICS_SHA256;
const analytics=await create9037CompanyAnalytics({aggregateBytes,expectedAggregateDigest,provider});
const router=new DatasetRouter({[id]:provider},{read:async()=>({datasetId:id,digest,generation:1})});
const integration=createLocalDatasetIntegration({router,candidateDatasetId:id,candidateProvider:provider,analytics});
const request=(route,method='GET')=>new Request('http://local.invalid'+route,{method,headers:{'x-workforce-dataset':id+':1'}});

test('all 19 reviewed company GET presenters succeed with captured rows',async()=>{
  for(const route of LOCAL_COMPANY_GET_ROUTES){
    const response=await integration.handle(request(route));assert.equal(response.status,200,route);
    assert.equal(response.headers.get('x-workforce-dataset'),id+':1');
    const body=await response.json();
    if(route==='/api/skills')assert.equal(body.summary.current_workforce,9037);
    if(route==='/api/compensation-ranges')assert.equal(body.constructedPolicy.version,'constructed-9037-inherited-range-policy-v1');
    assert.doesNotMatch(JSON.stringify(body),/constructed-demo-9847|9,847-person/,route);
  }
});

test('analytics is immutable, provider-specific and limited to reviewed operations',async()=>{
  assert.throws(()=>createLocalDatasetIntegration({router,candidateDatasetId:id,candidateProvider:provider,analytics:{...analytics}}),/registry/);
  assert.throws(()=>createLocalDatasetIntegration({router,candidateDatasetId:id,candidateProvider:create9037OfflineProvider(input),analytics}),/registry/);
  assert.equal((await integration.handle(request('/api/workforce','POST'))).status,503);
  assert.equal((await integration.handle(request('/api/scenario-modeler'))).status,200);
  await assert.rejects(()=>analytics.read('dashboard',['US',null,null]),/Uncaptured/);
  await assert.rejects(()=>analytics.read('unknown'),/Uncaptured/);
  const before=await analytics.read('workforce_current_summary');assert.ok(Object.isFrozen(before[0]));
});

test('bad pins, incomplete captures and rehashed stale populations fail before binding',async()=>{
  await assert.rejects(()=>create9037CompanyAnalytics({aggregateBytes,expectedAggregateDigest:'0'.repeat(64),provider}),/digest/);
  const changed=edit=>{const rows=JSON.parse(aggregateBytes);edit(rows);const bytes=Buffer.from(JSON.stringify(rows));return {aggregateBytes:bytes,expectedAggregateDigest:createHash('sha256').update(bytes).digest('hex'),provider};};
  await assert.rejects(()=>create9037CompanyAnalytics(changed(rows=>delete rows.dashboard)),/62-query/);
  await assert.rejects(()=>create9037CompanyAnalytics(changed(rows=>{rows.workforce_current_summary[0].headcount=9847;})),/headcount bound/);
  await assert.rejects(()=>create9037CompanyAnalytics(changed(rows=>{rows.succession_counts[0].positions_with_ready_now=150;})),/preflight/);
});
