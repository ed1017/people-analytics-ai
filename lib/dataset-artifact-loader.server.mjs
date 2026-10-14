/** Inactive Node/server loader. Trusted configuration only, never request data.
 * Reads two fixed local files once; no environment, network, SQL or selection.
 * Errors remain cached in this instance: recovery needs an explicit new loader.
 */
import { constants } from 'node:fs';
import { open, realpath } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createAggregateArtifactProvider, MAX_AGGREGATE_ARTIFACT_BYTES } from './dataset-aggregate-artifact.mjs';
import { createFilteredAggregateArtifactProvider, MAX_JOINT_DASHBOARD_BYTES } from './dataset-joint-dashboard.mjs';
import { parsePublicationProposal, bindPublicationProposal, CANDIDATE_ARTIFACT_FILENAME,
  PUBLICATION_PROPOSAL_FILENAME, MAX_PUBLICATION_PROPOSAL_BYTES } from './dataset-publication-proposal.mjs';

const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const digest = value => createHash('sha256').update(value).digest('hex');
export const JOINT_DASHBOARD_ARTIFACT_FILENAME = 'joint-dashboard-artifact.json';

async function pinnedFile(directory, name, expectedDigest, maximum, expectedBytes) {
  // Reject configured directory aliases and final-component symlinks. O_NONBLOCK
  // permits rejecting non-regular files without blocking on an accidental FIFO.
  if (await realpath(directory) !== directory) throw Error('Canonical artifact directory required');
  const handle = await open(join(directory, name), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.size < 1n || before.size > BigInt(maximum) ||
        (expectedBytes !== undefined && before.size !== BigInt(expectedBytes)))
      throw Error('Artifact file size or type mismatch');
    // Allocate only after fstat, with one extra byte to detect concurrent growth.
    const length = Number(before.size), buffer = Buffer.alloc(length + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    const after = await handle.stat({ bigint: true });
    if (offset !== length || before.size !== after.size || before.mtimeNs !== after.mtimeNs ||
        before.ctimeNs !== after.ctimeNs || before.ino !== after.ino || before.dev !== after.dev)
      throw Error('Artifact changed during load');
    const bytes = buffer.subarray(0, length);
    if (digest(bytes) !== expectedDigest) throw Error('Artifact file digest mismatch');
    return bytes;
  } finally {
    await handle.close();
  }
}

export function createPreparedCandidateLoader(configuration) {
  if (!configuration || Object.keys(configuration).sort().join(',') !==
      'directory,expectedArtifactDigest,expectedBaseCommit,expectedDatasetDigest,expectedImplementationDigest,expectedManifestDigest' ||
      typeof configuration.directory !== 'string' || !isAbsolute(configuration.directory) ||
      resolve(configuration.directory) !== configuration.directory ||
      !['expectedArtifactDigest', 'expectedDatasetDigest', 'expectedImplementationDigest', 'expectedManifestDigest']
        .every(key => isHash(configuration[key])) || !/^[a-f0-9]{40}$/.test(configuration.expectedBaseCommit ?? '') ||
      typeof constants.O_NOFOLLOW !== 'number' || typeof constants.O_NONBLOCK !== 'number')
    throw Error('Explicit trusted server artifact configuration required');
  const config = Object.freeze({ ...configuration });
  let loaded;
  return Object.freeze({
    load() {
      loaded ??= (async () => {
        try {
          const proposalBytes = await pinnedFile(config.directory, PUBLICATION_PROPOSAL_FILENAME,
            config.expectedManifestDigest, MAX_PUBLICATION_PROPOSAL_BYTES);
          const proposal = parsePublicationProposal({ bytes: proposalBytes, expectedManifestDigest: config.expectedManifestDigest });
          if (proposal.artifact.sha256 !== config.expectedArtifactDigest ||
              proposal.predecessor.bundleDigest !== config.expectedDatasetDigest ||
              proposal.implementation.baseCommit !== config.expectedBaseCommit ||
              proposal.implementation.sourceDigest !== config.expectedImplementationDigest)
            throw Error('Proposal configuration mismatch');
          const bytes = await pinnedFile(config.directory, CANDIDATE_ARTIFACT_FILENAME,
            config.expectedArtifactDigest, MAX_AGGREGATE_ARTIFACT_BYTES, proposal.artifact.bytes);
          const candidate = await createAggregateArtifactProvider({ bytes,
            expectedArtifactDigest: config.expectedArtifactDigest, expectedDatasetDigest: config.expectedDatasetDigest });
          const publication = bindPublicationProposal({ proposal, candidate, ...config });
          return Object.freeze({ candidate, publication });
        } catch {
          // Do not disclose private paths, raw bytes or platform errors to a caller.
          throw Error('Prepared candidate unavailable');
        }
      })();
      return loaded;
    },
  });
}

/** Load the unchanged company artifact and its separately pinned joint sidecar
 * as one local-review instance. The old company-only publication proposal does
 * not authorize this pair and is deliberately not accepted as configuration.
 * No production identity, registration, selection or epoch is created here.
 */
export function createPreparedJointCandidateLoader(configuration) {
  if (!configuration || Object.keys(configuration).sort().join(',') !==
      'directory,expectedArtifactBytes,expectedArtifactDigest,expectedDatasetDigest,expectedJointBytes,expectedJointDigest' ||
      typeof configuration.directory !== 'string' || !isAbsolute(configuration.directory) ||
      resolve(configuration.directory) !== configuration.directory ||
      !['expectedArtifactDigest', 'expectedDatasetDigest', 'expectedJointDigest'].every(key => isHash(configuration[key])) ||
      !Number.isSafeInteger(configuration.expectedArtifactBytes) || configuration.expectedArtifactBytes < 1 ||
      configuration.expectedArtifactBytes > MAX_AGGREGATE_ARTIFACT_BYTES ||
      !Number.isSafeInteger(configuration.expectedJointBytes) || configuration.expectedJointBytes < 1 ||
      configuration.expectedJointBytes > MAX_JOINT_DASHBOARD_BYTES ||
      typeof constants.O_NOFOLLOW !== 'number' || typeof constants.O_NONBLOCK !== 'number')
    throw Error('Explicit trusted joint artifact configuration required');
  const config = Object.freeze({ ...configuration });
  let loaded;
  return Object.freeze({
    load() {
      loaded ??= (async () => {
        try {
          const bytes = await pinnedFile(config.directory, CANDIDATE_ARTIFACT_FILENAME,
            config.expectedArtifactDigest, MAX_AGGREGATE_ARTIFACT_BYTES, config.expectedArtifactBytes);
          const jointBytes = await pinnedFile(config.directory, JOINT_DASHBOARD_ARTIFACT_FILENAME,
            config.expectedJointDigest, MAX_JOINT_DASHBOARD_BYTES, config.expectedJointBytes);
          const candidate = await createFilteredAggregateArtifactProvider({ bytes, jointBytes,
            expectedArtifactDigest: config.expectedArtifactDigest,
            expectedDatasetDigest: config.expectedDatasetDigest, expectedJointDigest: config.expectedJointDigest });
          return Object.freeze({ candidate, readiness: Object.freeze({ publicationApproved: false,
            activationEnabled: false, fullApplicationReady: false, hostedPreservationVerified: false,
            independentForecastValidation: false }) });
        } catch {
          // Both files must pass; never expose a partial/company-only fallback.
          throw Error('Prepared joint candidate unavailable');
        }
      })();
      return loaded;
    },
  });
}
