/** Validate a proposed successor without publishing or relabeling its predecessor.
 * A valid proposal is deliberately NOT an approved production provider.
 */
import { createHash } from 'node:crypto';
import { DATASET_COMPONENTS } from './dataset-composition.mjs';
import { deepFreeze, exact } from './dataset-demo-contracts.mjs';
import { AGGREGATE_ARTIFACT_FORMAT, MAX_AGGREGATE_ARTIFACT_BYTES } from './dataset-aggregate-artifact.mjs';

export const PUBLICATION_PROPOSAL_FORMAT = 'demo9847-publication-proposal-v1';
export const MAX_PUBLICATION_PROPOSAL_BYTES = 128 * 1024;
export const CANDIDATE_ARTIFACT_FILENAME = 'candidate-aggregate-artifact.json';
export const PUBLICATION_PROPOSAL_FILENAME = 'publication-proposal.json';
export const FROZEN_PREDECESSOR_DIGESTS = Object.freeze({
  ratings: '191ff33a4dd66c0e6484627441928a77fbb3ef883b428261964d768a65e9535c',
  compensation: '945a8fc1dd06a1b22eb2ab8247acd5e42798d7bdda677660437edf10b461a766',
});
const hash = value => createHash('sha256').update(value).digest('hex');
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const identifier = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,95}$/.test(value);
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 1024;
const verifiedProposals = new WeakSet();

export function parsePublicationProposal({ bytes, expectedManifestDigest }) {
  if (!(bytes instanceof Uint8Array) || !bytes.byteLength || bytes.byteLength > MAX_PUBLICATION_PROPOSAL_BYTES ||
      !isHash(expectedManifestDigest)) throw Error('Bounded publication proposal and reviewed pin required');
  const owned = Buffer.from(bytes);
  if (hash(owned) !== expectedManifestDigest) throw Error('Publication proposal digest mismatch');
  const proposal = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(owned));
  if (!exact(proposal, ['format', 'state', 'datasetId', 'predecessor', 'artifact', 'implementation',
    'cutoff', 'semantics', 'scope', 'components', 'preservedFrozenReleases', 'publicationApproved', 'activationEnabled']) ||
      proposal.format !== PUBLICATION_PROPOSAL_FORMAT || proposal.state !== 'prepared-unpublished' ||
      !identifier(proposal.datasetId) || proposal.datasetId === 'legacy-v1' ||
      proposal.publicationApproved !== false || proposal.activationEnabled !== false ||
      proposal.cutoff !== '2026-09-30' ||
      !exact(proposal.predecessor, ['datasetId', 'bundleDigest']) ||
      proposal.predecessor.datasetId !== 'workforce-demo-9847-2026-09-30-local-final-v1' ||
      proposal.datasetId === proposal.predecessor.datasetId || !isHash(proposal.predecessor.bundleDigest) ||
      !exact(proposal.artifact, ['format', 'fileName', 'sha256', 'bytes', 'queryContractDigest']) ||
      proposal.artifact.format !== AGGREGATE_ARTIFACT_FORMAT ||
      proposal.artifact.fileName !== CANDIDATE_ARTIFACT_FILENAME || !isHash(proposal.artifact.sha256) ||
      !isHash(proposal.artifact.queryContractDigest) || !Number.isSafeInteger(proposal.artifact.bytes) ||
      proposal.artifact.bytes < 1 || proposal.artifact.bytes > MAX_AGGREGATE_ARTIFACT_BYTES ||
      !exact(proposal.implementation, ['baseCommit', 'sourceDigest']) ||
      !/^[a-f0-9]{40}$/.test(proposal.implementation.baseCommit ?? '') || !isHash(proposal.implementation.sourceDigest) ||
      !exact(proposal.semantics, ['dataClass', 'activePopulation', 'sourceObservedAt', 'independentForecastValidation']) ||
      proposal.semantics.dataClass !== 'constructed-synthetic' || proposal.semantics.activePopulation !== 9847 ||
      proposal.semantics.sourceObservedAt !== null || proposal.semantics.independentForecastValidation !== false ||
      !exact(proposal.scope, ['dashboard', 'unsupportedDashboardFilters', 'fullApplicationReady']) ||
      proposal.scope.dashboard !== 'company-only' || proposal.scope.fullApplicationReady !== false ||
      JSON.stringify(proposal.scope.unsupportedDashboardFilters) !== JSON.stringify(['country', 'org', 'level']) ||
      !exact(proposal.components, DATASET_COMPONENTS) ||
      !exact(proposal.preservedFrozenReleases, ['ratings', 'compensation']) ||
      Object.entries(FROZEN_PREDECESSOR_DIGESTS).some(([name, digest]) => proposal.preservedFrozenReleases[name] !== digest))
    throw Error('Unsupported publication proposal');
  const sourceIds = new Set(), proposedIds = new Set();
  for (const name of DATASET_COMPONENTS) {
    const c = proposal.components[name];
    if (!exact(c, ['sourceReleaseId', 'sourceContentDigest', 'proposedReleaseId', 'scopeContract', 'provenance']) ||
        !identifier(c.sourceReleaseId) || !isHash(c.sourceContentDigest) || !identifier(c.proposedReleaseId) ||
        !text(c.scopeContract) || !text(c.provenance) || proposedIds.has(c.proposedReleaseId))
      throw Error('Invalid proposed component');
    sourceIds.add(c.sourceReleaseId); proposedIds.add(c.proposedReleaseId);
  }
  if ([...proposedIds].some(id => sourceIds.has(id))) throw Error('Proposed releases must preserve source identities');
  deepFreeze(proposal);
  verifiedProposals.add(proposal);
  return proposal;
}

export function bindPublicationProposal({ proposal, candidate, expectedArtifactDigest,
  expectedDatasetDigest, expectedBaseCommit, expectedImplementationDigest }) {
  if (!verifiedProposals.has(proposal) || !isHash(expectedArtifactDigest) || !isHash(expectedDatasetDigest) ||
      !isHash(expectedImplementationDigest) || !/^[a-f0-9]{40}$/.test(expectedBaseCommit ?? '') ||
      proposal.artifact.sha256 !== expectedArtifactDigest || proposal.predecessor.bundleDigest !== expectedDatasetDigest ||
      proposal.implementation.baseCommit !== expectedBaseCommit ||
      proposal.implementation.sourceDigest !== expectedImplementationDigest ||
      candidate?.provider?.datasetId !== proposal.predecessor.datasetId ||
      candidate.provider.digest !== expectedDatasetDigest ||
      candidate.provider.certificate !== 'LOCAL-ONLY-SEALED:' + expectedDatasetDigest ||
      candidate.artifact?.digest !== expectedArtifactDigest || candidate.artifact.bytes !== proposal.artifact.bytes ||
      candidate.artifact.queryContractDigest !== proposal.artifact.queryContractDigest ||
      candidate.artifact.publicationApproved !== false || candidate.artifact.independentForecastValidation !== false ||
      candidate.artifact.dashboardScope !== 'company-only' || candidate.artifact.hostedPreservationVerified !== false)
    throw Error('Publication proposal does not match loaded candidate');
  for (const name of DATASET_COMPONENTS) {
    const proposed = proposal.components[name], source = candidate.provider.components?.[name];
    if (!source || source.releaseId !== proposed.sourceReleaseId || source.contentDigest !== proposed.sourceContentDigest ||
        source.sourceDatasetId !== proposal.predecessor.datasetId || source.sourceBundleDigest !== expectedDatasetDigest ||
        source.cutoff !== proposal.cutoff || source.scopeContract !== proposed.scopeContract || source.provenance !== proposed.provenance)
      throw Error('Publication component mismatch: ' + name);
  }
  return Object.freeze({ proposal, manifestValidated: true, publicationApproved: false,
    activationEnabled: false, fullApplicationReady: false });
}
