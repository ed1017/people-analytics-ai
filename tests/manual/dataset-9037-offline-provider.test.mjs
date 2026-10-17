// Explicit private input only; no candidate payloads or paths are committed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {create9037OfflineProvider, reviewed9037PresenterContract, OFFLINE_9037_DATASET_ID as id, OFFLINE_9037_INTEGRITY_DIGEST as digest} from '../../lib/dataset-9037-offline-provider.mjs';
import {validateAggregateRow} from '../../lib/dataset-aggregate-validation.mjs';
import {localPresenterContract} from '../../lib/dataset-presenter-contract.mjs';
import {createLocalApiPresenter} from '../../lib/dataset-local-api.mjs';
import {DatasetReleaseDispatcher} from '../../lib/dataset-composition.mjs';
import {createSealedDemoProvider} from '../../lib/dataset-sealed-demo.mjs';
import {createLocalDatasetIntegration} from '../../lib/dataset-local-integration.mjs';
import {DatasetRouter} from '../../lib/dataset-router.mjs';

assert.ok(process.env.DATASET_9037_REVIEW_ROOT, 'Explicit reviewed private package directory required');
const root = process.env.DATASET_9037_REVIEW_ROOT;
const input = {expectedIntegrityDigest: digest,
  integrityBytes: fs.readFileSync(path.join(root, 'integrity-manifest.json')),
  contractBytes: fs.readFileSync(path.join(root, 'component-contracts.json')),
  componentBytes: fs.readFileSync(path.join(root, 'components.json'))};
const provider = create9037OfflineProvider(input);
const selected = {datasetId: id, digest, generation: 1};
const router = new DatasetRouter({[id]: provider}, {read: async () => selected});
const integration = createLocalDatasetIntegration({router, candidateDatasetId: id, candidateProvider: provider});
const request = (url, token = `${id}:1`, method = 'GET') => new Request('https://fixture.invalid' + url, {method, headers: token ? {'x-workforce-dataset': token} : {}});

test('all eight reviewed components bind and retain their own denominators', async () => {
  const response = await router.request(request('/api/workforce'), async () => Response.json(await integration.bundle()));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.bundleDigest, digest);
  assert.equal(body.publicationApproved, false);
  assert.equal(Object.keys(body.components).length, 8);
  assert.equal(body.components.workforce.data[0].headcount, 9037);
  assert.deepEqual(body.components.career.data.map(r => r.eligible), [7259, 7343]);
  assert.equal(body.components.succession.data.positions_with_ready_now, 147);
});

test('sealed component endpoint handlers succeed without analytics, network or AI', async () => {
  for (const route of ['/api/workforce','/api/dashboard','/api/compensation-job-release','/api/career-growth-mobility','/api/skills','/api/survey-sentiment','/api/workforce-planning','/api/succession-coverage']) {
    const response = await integration.handle(request(route));
    assert.equal(response.status, 200, route);
    assert.equal(response.headers.get('x-workforce-dataset'), `${id}:1`);
    const body = await response.json();
    assert.equal(body.contract, 'local-sealed-review-v1');
    assert.equal(body.publicationApproved, false);
    assert.equal(body.datasetId, id);
  }
});

test('invalid scopes, methods, stale tokens and unsupported analytics fail closed', async () => {
  for (const route of ['/api/workforce?country=US','/api/dashboard?org=BU-TECH','/api/succession-coverage?org=all','/api/workforce?unexpected=1'])
    assert.equal((await integration.handle(request(route))).status, 400);
  assert.equal((await integration.handle(request('/api/workforce', `${id}:1`, 'POST'))).status, 400);
  assert.equal((await integration.handle(request('/api/workforce', null))).status, 409);
  assert.equal((await integration.handle(request('/api/workforce', `${id}:2`))).status, 409);
  assert.equal((await integration.handle(request('/api/attrition'))).status, 503);
  assert.throws(() => createLocalDatasetIntegration({router, candidateDatasetId:id, candidateProvider:provider, analytics:{}}), /registry/);
});

test('caller data mutation, tampered bytes and arbitrary pins cannot alter a binding', async () => {
  for (const field of ['integrityBytes','contractBytes','componentBytes']) {
    const altered = Buffer.from(input[field]);altered[altered.length - 1] ^= 1;
    assert.throws(() => create9037OfflineProvider({...input, [field]:altered}), /digest/);
  }
  assert.throws(() => create9037OfflineProvider({...input, expectedIntegrityDigest:'0'.repeat(64)}), /pin/);
  const owned = {...input, componentBytes:Buffer.from(input.componentBytes)};
  const stable = create9037OfflineProvider(owned);owned.componentBytes.fill(0);
  const isolatedRouter = new DatasetRouter({[id]: stable}, {read:async () => selected});
  const isolated = createLocalDatasetIntegration({router:isolatedRouter,candidateDatasetId:id,candidateProvider:stable});
  assert.equal((await isolated.handle(request('/api/workforce'))).status,200);
});

test('shape-compatible forged providers cannot enter the 9037 integration', async () => {
  const forged = {...provider};
  assert.throws(() => createLocalDatasetIntegration({router,candidateDatasetId:id,candidateProvider:forged}), /registry/);
  const forgedRouter = new DatasetRouter({[id]:forged},{read:async()=>selected});
  const guarded = createLocalDatasetIntegration({router:forgedRouter,candidateDatasetId:id,candidateProvider:provider});
  assert.equal((await guarded.handle(request('/api/workforce'))).status,503);
});

test('original 9847 constructor boundary remains unchanged', async () => {
  assert.doesNotThrow(() => createLocalDatasetIntegration({router,candidateDatasetId:'workforce-demo-9847-2026-09-30-local-final-v1'}));
  let reads=0;
  await assert.rejects(() => createSealedDemoProvider({expectedDatasetId:id,expectedDigest:digest,source:{readSeal:async()=>{reads++;},readComponent:async()=>{reads++;}}}), /Explicit local reviewed binding/);
  assert.equal(reads,0);
});

test('presenter policies preserve 9847 and bind the reviewed 9037 population/history/range policy', () => {
  const current=reviewed9037PresenterContract(provider);
  assert.equal(current.population,9037);
  assert.equal(current.externalStarts,4163);
  assert.equal(current.exits,3526);
  assert.equal(current.rangePolicy,'constructed-9037-inherited-range-policy-v1');
  const old=localPresenterContract({datasetId:'workforce-demo-9847-2026-09-30-local-final-v1'});
  assert.deepEqual([old.population,old.externalStarts,old.exits,old.rangePolicy],[9847,4327,2880,'constructed-demo-9847-ranges-v2']);
  assert.throws(()=>localPresenterContract({datasetId:id,provider:{...provider}}),/Reviewed/);
  assert.throws(()=>localPresenterContract({datasetId:'unknown'}),/Unsupported/);
});

test('skills response uses verified component population, not a query-supplied or legacy population', async () => {
  // One explicit catalog stub tests presentation only, not captured-query parity.
  const analytics={datasetId:id,bundleDigest:digest,read:async name=>{
    assert.equal(name,'skill_catalog_counts');return [{active_skills:5,total_job_profiles:50,onet_mapped_job_profiles:0}];
  }};
  const presenter=createLocalApiPresenter({router,analytics,releases:new DatasetReleaseDispatcher(router)});
  const req=request('/api/skills');
  const response=await router.request(req,()=>presenter.handle(req));
  assert.equal(response.status,200);
  assert.equal((await response.json()).summary.current_workforce,9037);
});

test('reviewed 9037 preference role pairs stay candidate-specific and reject unknown or crossed labels', () => {
  const added=['CONS-TRANS','SALES-OPS','LEGAL-COUNSEL','OPS-BUS','CLOUD-ARCH','HR-PA','CYBER-ENG','HR-HRBP'];
  for(const code of added){
    const row={code,label:'Demo '+code,employees:100};
    assert.doesNotThrow(()=>validateAggregateRow('preferences_roles',row,{provider}));
    assert.throws(()=>validateAggregateRow('preferences_roles',row),/preferences_roles/);
    assert.throws(()=>validateAggregateRow('preferences_roles',{...row,label:'Demo MKT-BRAND'},{provider}),/catalog label/);
  }
  assert.equal(Object.keys(reviewed9037PresenterContract(provider).preferenceRoles).length,15);
  for(const row of [
    {code:'UNKNOWN',label:'Demo UNKNOWN',employees:1},
    {code:'CONS-TRANS',label:'Unknown label',employees:1},
    {code:'CONS-TRANS',label:'Demo CONS-TRANS',employees:-1},
    {code:'CONS-TRANS',label:'Demo CONS-TRANS',employees:1,extra:true},
  ]) assert.throws(()=>validateAggregateRow('preferences_roles',row,{provider}),/preferences_roles/);
  const legacy={code:'DS-SCI',label:'Demo DS-SCI',employees:1};
  assert.doesNotThrow(()=>validateAggregateRow('preferences_roles',legacy));
  assert.throws(()=>validateAggregateRow('preferences_roles',legacy,{provider}),/preferences_roles/);
  assert.throws(()=>validateAggregateRow('preferences_roles',legacy,{provider:{...provider}}),/Reviewed 9037 provider/);
});
