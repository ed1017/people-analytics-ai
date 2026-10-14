import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { DATASET_COMPONENTS } from '../lib/dataset-composition.mjs';
import { AGGREGATE_ARTIFACT_FORMAT } from '../lib/dataset-aggregate-artifact.mjs';
import { PUBLICATION_PROPOSAL_FORMAT, FROZEN_PREDECESSOR_DIGESTS, MAX_PUBLICATION_PROPOSAL_BYTES,
  parsePublicationProposal, bindPublicationProposal } from '../lib/dataset-publication-proposal.mjs';
import { createPreparedCandidateLoader } from '../lib/dataset-artifact-loader.server.mjs';

// Invented manifest-contract fixtures only. No workforce rows or source files.
const hash = b => createHash('sha256').update(b).digest('hex');
const sourceId = 'workforce-demo-9847-2026-09-30-local-final-v1';
const h = n => String(n).repeat(64);
function fixture() {
  const value = {
    format: PUBLICATION_PROPOSAL_FORMAT, state: 'prepared-unpublished', datasetId: 'invented-proposed-v2',
    predecessor: { datasetId: sourceId, bundleDigest: h(1) },
    artifact: { format: AGGREGATE_ARTIFACT_FORMAT, fileName: 'candidate-aggregate-artifact.json',
      sha256: h(2), bytes: 123, queryContractDigest: h(3) },
    implementation: { baseCommit: '4'.repeat(40), sourceDigest: h(5) }, cutoff: '2026-09-30',
    semantics: { dataClass: 'constructed-synthetic', activePopulation: 9847, sourceObservedAt: null, independentForecastValidation: false },
    scope: { dashboard: 'company-only', unsupportedDashboardFilters: ['country', 'org', 'level'], fullApplicationReady: false },
    components: Object.fromEntries(DATASET_COMPONENTS.map(name => [name, { sourceReleaseId: name + '-source-fixture',
      sourceContentDigest: h(6), proposedReleaseId: name + '-proposed-fixture', scopeContract: 'invented component denominator', provenance: 'invented fixture' }])),
    preservedFrozenReleases: { ...FROZEN_PREDECESSOR_DIGESTS }, publicationApproved: false, activationEnabled: false,
  };
  const candidate = { provider: { datasetId: sourceId, digest: h(1), certificate: 'LOCAL-ONLY-SEALED:' + h(1),
    components: Object.fromEntries(DATASET_COMPONENTS.map(name => [name, { releaseId: name + '-source-fixture',
      contentDigest: h(6), sourceDatasetId: sourceId, sourceBundleDigest: h(1), cutoff: '2026-09-30',
      scopeContract: 'invented component denominator', provenance: 'invented fixture' }])) },
    artifact: { digest: h(2), bytes: 123, queryContractDigest: h(3), publicationApproved: false,
      independentForecastValidation: false, dashboardScope: 'company-only', hostedPreservationVerified: false } };
  const pins = { expectedArtifactDigest: h(2), expectedDatasetDigest: h(1),
    expectedBaseCommit: '4'.repeat(40), expectedImplementationDigest: h(5) };
  return { value, candidate, pins };
}
function parse(value) {
  const bytes = Buffer.from(JSON.stringify(value));
  return parsePublicationProposal({ bytes, expectedManifestDigest: hash(bytes) });
}

test('a valid proposal is frozen and never constitutes publication or activation approval', () => {
  const { value, candidate, pins } = fixture();
  const proposal = parse(value), bound = bindPublicationProposal({ proposal, candidate, ...pins });
  assert.equal(bound.manifestValidated, true);
  for (const key of ['publicationApproved', 'activationEnabled', 'fullApplicationReady']) assert.equal(bound[key], false);
  assert.ok(Object.isFrozen(proposal.components.ratings));
  assert.throws(() => { proposal.publicationApproved = true; }, TypeError);
  assert.equal(candidate.provider.datasetId, sourceId);
});

test('bad byte pins, malformed inputs and oversized manifests fail before binding', () => {
  const bytes = Buffer.from(JSON.stringify(fixture().value));
  assert.throws(() => parsePublicationProposal({ bytes, expectedManifestDigest: h(9) }), /digest mismatch/);
  for (const bad of [null, '', {}, Buffer.alloc(0), Buffer.alloc(MAX_PUBLICATION_PROPOSAL_BYTES + 1)])
    assert.throws(() => parsePublicationProposal({ bytes: bad, expectedManifestDigest: hash(bytes) }), /Bounded publication/);
  const invalid = Buffer.from([0xff]);
  assert.throws(() => parsePublicationProposal({ bytes: invalid, expectedManifestDigest: hash(invalid) }));
});

test('approval, activation, filter and forecast overclaims reject even with a new valid pin', () => {
  for (const change of [v => { v.publicationApproved = true; }, v => { v.activationEnabled = true; },
    v => { v.state = 'published'; }, v => { v.scope.fullApplicationReady = true; },
    v => { v.scope.dashboard = 'all-filters'; }, v => { v.scope.unsupportedDashboardFilters = []; },
    v => { v.semantics.independentForecastValidation = true; }, v => { v.semantics.sourceObservedAt = '2026-09-30'; },
    v => { v.semantics.activePopulation = 10000; }, v => { v.cutoff = '2026-10-31'; }]) {
    const { value } = fixture(); change(value); assert.throws(() => parse(value), /Unsupported publication/);
  }
});

test('source and proposed release identities cannot silently alias or reuse frozen identities', () => {
  for (const change of [v => { v.datasetId = sourceId; }, v => { v.datasetId = 'legacy-v1'; },
    v => { v.components.ratings.proposedReleaseId = v.components.ratings.sourceReleaseId; },
    v => { v.components.ratings.proposedReleaseId = v.components.compensation.proposedReleaseId; },
    v => { v.preservedFrozenReleases.ratings = h(9); }, v => { v.preservedFrozenReleases.compensation = h(9); }]) {
    const { value } = fixture(); change(value); assert.throws(() => parse(value));
  }
});

test('unreviewed manifest keys, incomplete components and manifest-selected paths are refused', () => {
  for (const change of [v => { v.extra = true; }, v => { delete v.components.survey; },
    v => { v.components.survey.extra = 'denominator override'; },
    v => { v.artifact.fileName = '../private-recovery.tar.gz'; }, v => { v.artifact.bytes = 0; }]) {
    const { value } = fixture(); change(value); assert.throws(() => parse(value));
  }
});

test('only parsed proposals bind; artifact, implementation and original dataset pins must agree', () => {
  const { value, candidate, pins } = fixture(), proposal = parse(value);
  assert.throws(() => bindPublicationProposal({ proposal: value, candidate, ...pins }), /does not match/);
  for (const key of Object.keys(pins))
    assert.throws(() => bindPublicationProposal({ proposal, candidate, ...pins,
      [key]: key === 'expectedBaseCommit' ? 'a'.repeat(40) : h(9) }), /does not match/);
  for (const key of ['bytes', 'queryContractDigest', 'digest', 'dashboardScope', 'publicationApproved']) {
    const wrong = structuredClone(candidate); wrong.artifact[key] = key === 'bytes' ? 124 : 'changed';
    assert.throws(() => bindPublicationProposal({ proposal, candidate: wrong, ...pins }), /does not match/);
  }
});

test('every component retains its own population contract and exact original digest', () => {
  const { value, candidate, pins } = fixture(), proposal = parse(value);
  for (const name of DATASET_COMPONENTS) for (const key of ['releaseId', 'contentDigest', 'sourceDatasetId',
    'sourceBundleDigest', 'cutoff', 'scopeContract', 'provenance']) {
    const wrong = structuredClone(candidate); wrong.provider.components[name][key] = 'changed';
    assert.throws(() => bindPublicationProposal({ proposal, candidate: wrong, ...pins }), /component mismatch/);
  }
});

test('server loader accepts only explicit canonical configuration and exposes no selector', () => {
  const config = { directory: '/tmp/invented-artifact-fixture', expectedManifestDigest: h(8), ...fixture().pins };
  const loader = createPreparedCandidateLoader(config);
  assert.deepEqual(Object.keys(loader), ['load']);
  for (const wrong of [null, { ...config, directory: './relative' }, { ...config, directory: '/tmp/../private' },
    { ...config, expectedManifestDigest: '' }, { ...config, activate: true }, { ...config, query: () => {} }])
    assert.throws(() => createPreparedCandidateLoader(wrong), /trusted server/);
});
