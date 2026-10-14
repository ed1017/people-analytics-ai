// Explicit private inputs only. Copies and failed-case evidence stay outside Git
// and are retained without cleanup. Run with dataset-review-offline.mjs preloaded.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createPreparedJointCandidateLoader, JOINT_DASHBOARD_ARTIFACT_FILENAME } from '../../lib/dataset-artifact-loader.server.mjs';
import { CANDIDATE_ARTIFACT_FILENAME } from '../../lib/dataset-publication-proposal.mjs';
import { MAX_JOINT_DASHBOARD_BYTES } from '../../lib/dataset-joint-dashboard.mjs';
import { DatasetRouter } from '../../lib/dataset-router.mjs';
import { createLocalDatasetIntegration } from '../../lib/dataset-local-integration.mjs';
import { datasetRouter as productionRouter } from '../../lib/dataset-runtime.ts';

assert.ok(process.env.DATASET_JOINT_REVIEW_ROOT, 'Explicit private joint review directory required');
const inputs = JSON.parse(await fs.readFile(path.join(process.env.DATASET_JOINT_REVIEW_ROOT, 'inputs.private.json')));
const artifact = await fs.readFile(inputs.artifactPath), joint = await fs.readFile(inputs.jointPath);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(artifact), inputs.expectedArtifactDigest);
assert.equal(hash(joint), inputs.expectedJointDigest);
const evidenceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dataset-joint-loader-tests-'));
async function fixture({ artifactBytes = artifact, jointBytes = joint, omit = null } = {}) {
  const directory = await fs.mkdtemp(path.join(evidenceDirectory, 'case-'));
  if (omit !== CANDIDATE_ARTIFACT_FILENAME) await fs.writeFile(path.join(directory, CANDIDATE_ARTIFACT_FILENAME), artifactBytes, { mode: 0o600 });
  if (omit !== JOINT_DASHBOARD_ARTIFACT_FILENAME) await fs.writeFile(path.join(directory, JOINT_DASHBOARD_ARTIFACT_FILENAME), jointBytes, { mode: 0o600 });
  return { directory, expectedArtifactBytes: artifact.length, expectedArtifactDigest: inputs.expectedArtifactDigest,
    expectedDatasetDigest: inputs.expectedDatasetDigest, expectedJointBytes: joint.length, expectedJointDigest: inputs.expectedJointDigest };
}
const rejects = loader => assert.rejects(loader.load(), error => {
  assert.equal(error.message, 'Prepared joint candidate unavailable');
  assert.equal(error.cause, undefined); return true;
});
const config = await fixture(), prepared = await createPreparedJointCandidateLoader(config).load();

test('one pinned load returns the reconciled joint candidate without publication or activation', async () => {
  assert.equal(prepared.candidate.artifact.digest, inputs.expectedArtifactDigest);
  assert.equal(prepared.candidate.artifact.jointDigest, inputs.expectedJointDigest);
  assert.equal(prepared.candidate.artifact.jointBytes, joint.length);
  assert.equal(prepared.candidate.provider.certificate, 'LOCAL-ONLY-SEALED:' + inputs.expectedDatasetDigest);
  assert.ok(Object.isFrozen(prepared)); assert.ok(Object.isFrozen(prepared.readiness));
  assert.ok(Object.values(prepared.readiness).every(value => value === false));
  assert.equal(prepared.publication, undefined);
  const company = prepared.candidate.analytics.dashboardResponse({ country: 'all', org: 'all', level: 'all' });
  assert.equal(company.overview.headcount, 9847); assert.equal(company.trend.length, 33);
});

test('filesystem-loaded pair serves scoped API and Home evidence with the same sidecar identity', async () => {
  const id = prepared.candidate.provider.datasetId, token = id + ':2';
  const router = new DatasetRouter({ [id]: prepared.candidate.provider }, {
    read: async () => ({ datasetId: id, digest: inputs.expectedDatasetDigest, generation: 2 }),
  });
  const integration = createLocalDatasetIntegration({ router, candidateDatasetId: id, analytics: prepared.candidate.analytics });
  const query = '?country=US&org=BU-TECH&level=L6';
  const request = () => new Request('https://fixture.invalid/api/dashboard' + query, { headers: { 'x-workforce-dataset': token } });
  const response = await integration.handle(request()); assert.equal(response.status, 200);
  const body = await response.json(); assert.equal(body.overview.headcount, 14);
  assert.equal(body.data_meta.dashboardAggregateDigest, inputs.expectedJointDigest);
  assert.equal(body.performance_rating, null);
  await router.request(request(), async () => {
    const home = await integration.homeGrounding(query, 'voluntary turnover');
    assert.equal(home.pack.datasetContext.dashboardAggregate.artifactDigest, inputs.expectedJointDigest);
    return Response.json({});
  });
});

test('concurrent loads share one promise, own configuration and keep an immutable snapshot', async () => {
  const settings = await fixture(), loader = createPreparedJointCandidateLoader(settings);
  settings.expectedJointDigest = '0'.repeat(64);
  const one = loader.load(), two = loader.load(); assert.equal(one, two);
  const a = await one; assert.equal(a, await two);
  await fs.writeFile(path.join(settings.directory, JOINT_DASHBOARD_ARTIFACT_FILENAME), '{}');
  assert.equal(await loader.load(), a);
  const result = a.candidate.analytics.dashboardResponse({ country: 'US', org: 'BU-TECH', level: 'L6' });
  assert.equal(result.overview.headcount, 14);
  assert.throws(() => { result.overview.headcount = 10000; }, TypeError);
  await rejects(createPreparedJointCandidateLoader({ ...settings, expectedJointDigest: inputs.expectedJointDigest }));
});

test('failure is cached; repairing disk requires an explicitly new loader', async () => {
  const corrupted = Buffer.from(joint); corrupted[100] ^= 1;
  const settings = await fixture({ jointBytes: corrupted }), loader = createPreparedJointCandidateLoader(settings);
  const failed = loader.load(); await rejects(loader);
  await fs.writeFile(path.join(settings.directory, JOINT_DASHBOARD_ARTIFACT_FILENAME), joint);
  assert.equal(loader.load(), failed); await rejects(loader);
  assert.equal((await createPreparedJointCandidateLoader(settings).load()).candidate.artifact.jointDigest, inputs.expectedJointDigest);
});

test('missing either file or an incorrect file length cannot fall back to company or legacy data', async () => {
  for (const name of [CANDIDATE_ARTIFACT_FILENAME, JOINT_DASHBOARD_ARTIFACT_FILENAME])
    await rejects(createPreparedJointCandidateLoader(await fixture({ omit: name })));
  for (const key of ['expectedArtifactBytes', 'expectedJointBytes'])
    await rejects(createPreparedJointCandidateLoader({ ...config, [key]: config[key] + 1 }));
  for (const key of ['expectedArtifactDigest', 'expectedJointDigest', 'expectedDatasetDigest'])
    await rejects(createPreparedJointCandidateLoader({ ...config, [key]: '0'.repeat(64) }));
});

test('a matching new sidecar pin cannot hide a parent mismatch or broken monthly accounting', async () => {
  for (const change of [value => { value.parentArtifactDigest = '0'.repeat(64); }, value => { value.flows[0][2]++; }]) {
    const value = JSON.parse(joint); change(value); const changed = Buffer.from(JSON.stringify(value));
    const settings = await fixture({ jointBytes: changed });
    await rejects(createPreparedJointCandidateLoader({ ...settings, expectedJointBytes: changed.length, expectedJointDigest: hash(changed) }));
  }
});

test('symlinks, directory aliases and non-regular files are rejected without blocking', { timeout: 5000 }, async () => {
  for (const name of [CANDIDATE_ARTIFACT_FILENAME, JOINT_DASHBOARD_ARTIFACT_FILENAME]) {
    const linked = await fixture({ omit: name });
    await fs.symlink(path.join(config.directory, name), path.join(linked.directory, name));
    await rejects(createPreparedJointCandidateLoader(linked));
    const nonregular = await fixture({ omit: name }); await fs.mkdir(path.join(nonregular.directory, name));
    await rejects(createPreparedJointCandidateLoader(nonregular));
  }
  const alias = path.join(evidenceDirectory, 'alias'); await fs.symlink(config.directory, alias);
  await rejects(createPreparedJointCandidateLoader({ ...config, directory: alias }));
  const fifo = await fixture({ omit: JOINT_DASHBOARD_ARTIFACT_FILENAME });
  execFileSync('mkfifo', [path.join(fifo.directory, JOINT_DASHBOARD_ARTIFACT_FILENAME)]);
  await rejects(createPreparedJointCandidateLoader(fifo));
});

test('oversized sidecar is refused and never substitutes a company-only provider', async () => {
  const settings = await fixture({ omit: JOINT_DASHBOARD_ARTIFACT_FILENAME });
  const handle = await fs.open(path.join(settings.directory, JOINT_DASHBOARD_ARTIFACT_FILENAME), 'wx', 0o600);
  try { await handle.truncate(MAX_JOINT_DASHBOARD_BYTES + 1); } finally { await handle.close(); }
  await rejects(createPreparedJointCandidateLoader(settings));
});

test('production keeps legacy default and disabled selection; original inputs and network remain untouched', async () => {
  assert.equal(await productionRouter.bootstrapToken(), 'legacy-v1:0');
  const runtime = await fs.readFile(new URL('../../lib/dataset-runtime.ts', import.meta.url), 'utf8');
  assert.match(runtime, /compareAndSwap: async \(\) => false/);
  assert.doesNotMatch(runtime, /artifact-loader|joint-dashboard|createPreparedJointCandidateLoader/);
  assert.equal(hash(await fs.readFile(inputs.artifactPath)), inputs.expectedArtifactDigest);
  assert.equal(hash(await fs.readFile(inputs.jointPath)), inputs.expectedJointDigest);
  assert.equal(globalThis.__offlineNetworkAttempts, 0);
});
