import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreparedJointCandidateLoader } from '../lib/dataset-artifact-loader.server.mjs';
import { MAX_AGGREGATE_ARTIFACT_BYTES } from '../lib/dataset-aggregate-artifact.mjs';
import { MAX_JOINT_DASHBOARD_BYTES } from '../lib/dataset-joint-dashboard.mjs';

// Invented configuration only; no private artifact, directory or pin is stored.
const configuration = () => ({ directory: '/tmp/invented-joint-review',
  expectedArtifactBytes: 100, expectedArtifactDigest: '1'.repeat(64),
  expectedDatasetDigest: '2'.repeat(64), expectedJointBytes: 50, expectedJointDigest: '3'.repeat(64) });

test('joint loader requires an explicit complete configuration and exposes only load', () => {
  const loader = createPreparedJointCandidateLoader(configuration());
  assert.deepEqual(Object.keys(loader), ['load']);
  assert.ok(Object.isFrozen(loader));
  for (const key of Object.keys(configuration())) {
    const missing = configuration(); delete missing[key];
    assert.throws(() => createPreparedJointCandidateLoader(missing), /trusted joint artifact configuration/);
  }
});

test('relative paths, filename overrides, publication shortcuts and injected transports are rejected', () => {
  for (const change of [{ directory: './relative' }, { directory: '/tmp/../private' },
    { jointFileName: '../other.json' }, { publicationApproved: true }, { activate: true },
    { expectedManifestDigest: '4'.repeat(64) }, { query: () => {} }, { fetch: () => {} }])
    assert.throws(() => createPreparedJointCandidateLoader({ ...configuration(), ...change }), /trusted joint artifact configuration/);
  for (const value of [null, undefined, {}, []])
    assert.throws(() => createPreparedJointCandidateLoader(value), /trusted joint artifact configuration/);
});

test('every pin and byte count is required, typed and bounded before filesystem access', () => {
  for (const key of ['expectedArtifactDigest', 'expectedDatasetDigest', 'expectedJointDigest'])
    for (const value of ['', 'a'.repeat(63), 'A'.repeat(64), null, 1])
      assert.throws(() => createPreparedJointCandidateLoader({ ...configuration(), [key]: value }), /trusted joint artifact configuration/);
  for (const [key, limit] of [['expectedArtifactBytes', MAX_AGGREGATE_ARTIFACT_BYTES], ['expectedJointBytes', MAX_JOINT_DASHBOARD_BYTES]])
    for (const value of [0, -1, 1.5, '100', null, NaN, Infinity, limit + 1])
      assert.throws(() => createPreparedJointCandidateLoader({ ...configuration(), [key]: value }), /trusted joint artifact configuration/);
});
