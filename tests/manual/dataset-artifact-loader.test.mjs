// Manual private-artifact integration: set DATASET_REVIEW_CONFIG to the local
// reviewed configuration. No fixture payload or private path belongs in Git.
// Temporary evidence is retained; this script performs no cleanup/deletion.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createPreparedCandidateLoader } from '../../lib/dataset-artifact-loader.server.mjs';
import { MAX_AGGREGATE_ARTIFACT_BYTES } from '../../lib/dataset-aggregate-artifact.mjs';
import { MAX_PUBLICATION_PROPOSAL_BYTES } from '../../lib/dataset-publication-proposal.mjs';
import { DatasetRouter } from '../../lib/dataset-router.mjs';
import { createDatasetRequestBoundary } from '../../lib/dataset-request-boundary.mjs';
import { createLocalDatasetIntegration } from '../../lib/dataset-local-integration.mjs';

assert.ok(process.env.DATASET_REVIEW_CONFIG, 'This manual test requires an explicit local reviewed artifact configuration');
const originalConfig = JSON.parse(await fs.readFile(process.env.DATASET_REVIEW_CONFIG, 'utf8'));
const artifactBytes = await fs.readFile(path.join(originalConfig.directory, 'candidate-aggregate-artifact.json'));
const manifestBytes = await fs.readFile(path.join(originalConfig.directory, 'publication-proposal.json'));
const hash = b => createHash('sha256').update(b).digest('hex');
assert.equal(hash(artifactBytes), originalConfig.expectedArtifactDigest);
assert.equal(hash(manifestBytes), originalConfig.expectedManifestDigest);
const retainedEvidenceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dataset-loader-tests-'));
async function fixture({ artifact = artifactBytes, manifest = manifestBytes, omitArtifact = false } = {}) {
  const directory = await fs.mkdtemp(path.join(retainedEvidenceDirectory, 'case-'));
  await fs.writeFile(path.join(directory, 'publication-proposal.json'), manifest);
  if (!omitArtifact) await fs.writeFile(path.join(directory, 'candidate-aggregate-artifact.json'), artifact);
  return { ...originalConfig, directory };
}
async function changedManifest(edit) {
  const manifest = JSON.parse(manifestBytes); edit(manifest);
  const bytes = Buffer.from(JSON.stringify(manifest));
  const config = await fixture({ manifest: bytes });
  config.expectedManifestDigest = hash(bytes);
  return config;
}
const unavailable = config => assert.rejects(createPreparedCandidateLoader(config).load(), error => {
  assert.equal(error.message, 'Prepared candidate unavailable');
  assert.equal(error.cause, undefined); return true;
});
const prepared = await createPreparedCandidateLoader(originalConfig).load();

test('trusted server load binds exact artifact, eight components and unpublished successor proposal', () => {
  assert.equal(prepared.candidate.artifact.digest, originalConfig.expectedArtifactDigest);
  assert.equal(prepared.candidate.provider.digest, originalConfig.expectedDatasetDigest);
  assert.equal(Object.keys(prepared.candidate.provider.components).length, 8);
  assert.equal(prepared.publication.manifestValidated, true);
  for (const key of ['publicationApproved', 'activationEnabled', 'fullApplicationReady'])
    assert.equal(prepared.publication[key], false);
  assert.notEqual(prepared.publication.proposal.datasetId, prepared.candidate.provider.datasetId);
});

test('concurrent loads share one immutable result and do not re-read a changed disk file', async () => {
  const config = await fixture(), loader = createPreparedCandidateLoader(config);
  const one = loader.load(), two = loader.load(); assert.equal(one, two);
  const result = await one;
  await fs.writeFile(path.join(config.directory, 'candidate-aggregate-artifact.json'), '{}');
  assert.equal(await loader.load(), result);
  assert.equal((await result.candidate.analytics.read('workforce_current_summary'))[0].headcount, 9847);
  await unavailable(config); // A new instance must reject the changed bytes.
});

test('configuration mutation after construction cannot change the trusted directory or pins', async () => {
  const config = await fixture(), loader = createPreparedCandidateLoader(config);
  config.directory = path.join(retainedEvidenceDirectory, 'absent'); config.expectedArtifactDigest = '0'.repeat(64);
  assert.equal((await loader.load()).candidate.artifact.digest, originalConfig.expectedArtifactDigest);
});

test('a wrong artifact fails closed and the failed instance never automatically retries', async () => {
  const bad = Buffer.from(artifactBytes); bad[100] ^= 1;
  const config = await fixture({ artifact: bad }), loader = createPreparedCandidateLoader(config);
  const attempt = loader.load(); await assert.rejects(attempt, /Prepared candidate unavailable/);
  await fs.writeFile(path.join(config.directory, 'candidate-aggregate-artifact.json'), artifactBytes);
  assert.equal(loader.load(), attempt); await assert.rejects(loader.load(), /Prepared candidate unavailable/);
  assert.equal((await createPreparedCandidateLoader(config).load()).candidate.artifact.digest, originalConfig.expectedArtifactDigest);
});

test('wrong manifest bytes and artifact-size claims cannot load the candidate', async () => {
  const bad = Buffer.from(manifestBytes); bad[100] ^= 1;
  await unavailable(await fixture({ manifest: bad }));
  await unavailable(await changedManifest(v => { v.artifact.bytes++; }));
});

test('matching outer manifest hashes cannot hide component, query or code-revision mismatch', async () => {
  for (const change of [v => { v.components.ratings.sourceContentDigest = '0'.repeat(64); },
    v => { v.components.survey.scopeContract = 'all 9847'; },
    v => { v.artifact.queryContractDigest = '0'.repeat(64); },
    v => { v.implementation.sourceDigest = '0'.repeat(64); },
    v => { v.implementation.baseCommit = '0'.repeat(40); }])
    await unavailable(await changedManifest(change));
});

test('manifest approval and scope overclaims fail even with a newly matching manifest pin', async () => {
  for (const change of [v => { v.publicationApproved = true; }, v => { v.activationEnabled = true; },
    v => { v.scope.fullApplicationReady = true; }, v => { v.scope.dashboard = 'all-filters'; }])
    await unavailable(await changedManifest(change));
});

test('missing artifact or manifest produces a generic error without paths or raw content', async () => {
  await unavailable(await fixture({ omitArtifact: true }));
  const config = { ...originalConfig, directory: await fs.mkdtemp(path.join(retainedEvidenceDirectory, 'empty-')) };
  await unavailable(config);
});

test('oversized files are refused before parsing the candidate', async () => {
  await unavailable(await fixture({ artifact: Buffer.alloc(MAX_AGGREGATE_ARTIFACT_BYTES + 1) }));
  await unavailable(await fixture({ manifest: Buffer.alloc(MAX_PUBLICATION_PROPOSAL_BYTES + 1) }));
});

test('non-regular artifact files, file symlinks and aliased directories are refused', async () => {
  const nonregular = await fixture({ omitArtifact: true });
  await fs.mkdir(path.join(nonregular.directory, 'candidate-aggregate-artifact.json'));
  await unavailable(nonregular);
  const linked = await fixture({ omitArtifact: true });
  await fs.symlink(path.join(originalConfig.directory, 'candidate-aggregate-artifact.json'),
    path.join(linked.directory, 'candidate-aggregate-artifact.json'));
  await unavailable(linked);
  const alias = path.join(retainedEvidenceDirectory, 'directory-alias');
  await fs.symlink(originalConfig.directory, alias);
  await unavailable({ ...originalConfig, directory: alias });
});

let originalCalls = 0, guardAvailable = true, writes = 0;
const originalClient = { label: 'invented-retained-client' };
const legacy = { datasetId: 'legacy-v1', generation: 0, digest: 'uncertified-live-v1' };
let selected = legacy;
const retainedRouter = new DatasetRouter({ 'legacy-v1': { digest: legacy.digest, client: originalClient } }, {
  read: async () => selected, compareAndSwap: async () => { writes++; return false; },
});
const retainedBoundary = createDatasetRequestBoundary({ router: retainedRouter,
  retained: { 'legacy-v1': { assertAvailable: async () => guardAvailable } },
});
const originalHandler = () => {
  assert.equal(retainedRouter.client(), originalClient); originalCalls++;
  return Response.json({ label: 'invented-retained-result' });
};

test('loading a prepared candidate never registers it or changes retained-source selection', async () => {
  assert.equal(await retainedRouter.bootstrapToken(), 'legacy-v1:0');
  const result = await retainedBoundary(new Request('https://fixture.invalid/api/workforce'), originalHandler);
  assert.equal(result.status, 200); assert.equal(result.headers.get('x-workforce-dataset'), 'legacy-v1:0');
  assert.equal((await result.json()).label, 'invented-retained-result');
  assert.equal(originalCalls, 1); assert.equal(writes, 0);
});

test('a candidate token or incorrectly stored candidate selection cannot activate this retained-only runtime', async () => {
  const id = prepared.candidate.provider.datasetId;
  const request = new Request('https://fixture.invalid/api/workforce', { headers: { 'x-workforce-dataset': id + ':1' } });
  assert.equal((await retainedBoundary(request, originalHandler)).status, 409);
  selected = { datasetId: id, digest: originalConfig.expectedDatasetDigest, generation: 1 };
  try { assert.equal((await retainedBoundary(request, originalHandler)).status, 503); }
  finally { selected = legacy; }
  assert.equal(originalCalls, 1); assert.equal(writes, 0);
});

test('retained-source guard failure blocks the original handler without selecting the candidate', async () => {
  guardAvailable = false;
  try { assert.equal((await retainedBoundary(new Request('https://fixture.invalid/api/workforce'), originalHandler)).status, 503); }
  finally { guardAvailable = true; }
  assert.equal(originalCalls, 1); assert.equal(writes, 0);
});

test('a candidate startup failure does not mutate or disable the independent legacy composition', async () => {
  await unavailable(await fixture({ artifact: Buffer.from('{}') }));
  assert.equal((await retainedBoundary(new Request('https://fixture.invalid/api/workforce'), originalHandler)).status, 200);
  assert.equal(originalCalls, 2); assert.equal(writes, 0);
});

test('unsupported dashboard filters stay unavailable in the explicit local review composition', async () => {
  const id = prepared.candidate.provider.datasetId, token = id + ':1';
  const router = new DatasetRouter({ [id]: prepared.candidate.provider }, {
    read: async () => ({ datasetId: id, digest: originalConfig.expectedDatasetDigest, generation: 1 }),
  });
  const integration = createLocalDatasetIntegration({ router, candidateDatasetId: id, analytics: prepared.candidate.analytics });
  for (const filter of ['country=US', 'org=BU-TECH', 'level=L1']) {
    const response = await integration.handle(new Request('https://fixture.invalid/api/dashboard?' + filter,
      { headers: { 'x-workforce-dataset': token } }));
    assert.ok([400, 503].includes(response.status));
    const body = await response.json(); assert.equal(body.overview, undefined);
  }
  const company = await integration.handle(new Request('https://fixture.invalid/api/headcount',
    { headers: { 'x-workforce-dataset': token } }));
  assert.equal((await company.json()).headcount, 9847);
  assert.equal(originalCalls, 2); assert.equal(writes, 0);
});

test('original artifacts and production runtime remain unchanged; no network was attempted', async () => {
  assert.equal(hash(await fs.readFile(path.join(originalConfig.directory, 'candidate-aggregate-artifact.json'))), originalConfig.expectedArtifactDigest);
  assert.equal(hash(await fs.readFile(path.join(originalConfig.directory, 'publication-proposal.json'))), originalConfig.expectedManifestDigest);
  const runtime = await fs.readFile(new URL('../../lib/dataset-runtime.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(runtime, /artifact-loader|publication-proposal|aggregate-artifact/);
  assert.match(runtime, /\{ 'legacy-v1': provider \}/);
  assert.equal(globalThis.__offlineNetworkAttempts, 0);
});
