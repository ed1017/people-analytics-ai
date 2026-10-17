// Explicit private input only; no candidate payloads or paths are committed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {create9037OfflineProvider, OFFLINE_9037_DATASET_ID as id, OFFLINE_9037_INTEGRITY_DIGEST as digest} from '../../lib/dataset-9037-offline-provider.mjs';
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
