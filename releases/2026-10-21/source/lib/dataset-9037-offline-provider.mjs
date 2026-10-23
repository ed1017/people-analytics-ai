/** Inactive, exact-artifact binding for the independently reviewed 9037 package.
 * No filesystem, SQL, environment selector, model or production registration.
 * LOCAL-ONLY certification does not confer publication/activation approval.
 */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {DATASET_COMPONENTS, defineDatasetProvider} from './dataset-composition.mjs';
import {deepFreeze, exact, validateDemoRequest, validateDemoBundle} from './dataset-demo-contracts.mjs';

export const OFFLINE_9037_DATASET_ID = 'workforce-demo-geography-20261023-local-v1';
export const OFFLINE_9037_INTEGRITY_DIGEST = '2f2cd9744a7e3dfd71d685ac9c8a070c152454375f96cb681f687a9f39f96be9';
const sourceBundle = 'bb61cab68e4395f8462d37e88cda9da300b71e91062998df64fe2aba9631e658';
const REVIEWED_SKILL_POPULATIONS = deepFreeze({"AI-APPLICATION":880,"DATA-ANALYSIS":6148,"SOFTWARE-DELIVERY":2659,"PLATFORM-OPERATIONS":1893,"SECURITY-RISK":3254,"SERVICE-DELIVERY":936,"PROJECT-DELIVERY":2126,"CLIENT-PARTNERSHIP":1876,"PEOPLE-ADVISORY":1219,"FINANCIAL-ANALYSIS":1604,"COMMUNICATION":4742,"EXPERIENCE-DESIGN":731});
const reviewed = new WeakSet();
const presenterContracts = new WeakMap();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const requireValue = (value, message) => {if (!value) throw Error(message);};
function readPinned(bytes, digest) {
  requireValue(bytes instanceof Uint8Array && bytes.byteLength > 0 && bytes.byteLength <= 2_000_000,
    'Bounded offline artifact bytes required');
  const owned = Buffer.from(bytes);
  requireValue(hash(owned) === digest, 'Offline artifact digest mismatch');
  return deepFreeze(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(owned)));
}
export const isReviewed9037Provider = provider => reviewed.has(provider);
export function reviewed9037PresenterContract(provider) {
  requireValue(reviewed.has(provider), 'Reviewed 9037 provider required');
  return presenterContracts.get(provider);
}

/** The pin is code-reviewed, not taken from caller-controlled artifact metadata.
 * Exact component bytes already passed independent accounting and policy review.
 * Do not generalize this constructor to new pins without a fresh review.
 */
export function create9037OfflineProvider({integrityBytes, contractBytes, componentBytes, expectedIntegrityDigest}) {
  requireValue(expectedIntegrityDigest === OFFLINE_9037_INTEGRITY_DIGEST, 'Reviewed 9037 integrity pin required');
  const seal = readPinned(integrityBytes, OFFLINE_9037_INTEGRITY_DIGEST);
  requireValue(seal.datasetId === OFFLINE_9037_DATASET_ID && seal.sourceBundleDigest === sourceBundle &&
    seal.state === 'prepared-unapproved-offline' && seal.publicationApproved === false &&
    seal.activationEnabled === false && seal.fullApplicationReady === false, 'Offline-only source binding required');
  const contracts = readPinned(contractBytes, seal.files['component-contracts.json']);
  const payloads = readPinned(componentBytes, seal.files['components.json']);
  requireValue(contracts.datasetId === seal.datasetId && contracts.sourceBundleDigest === sourceBundle &&
    contracts.activePopulation === 9037 && contracts.cutoff === '2026-09-30' &&
    contracts.publicationApproved === false && contracts.activationEnabled === false &&
    exact(contracts.components, DATASET_COMPONENTS) && exact(payloads, DATASET_COMPONENTS), 'Complete 9037 components required');
  const manifest = {datasetId: seal.datasetId, bundleDigest: OFFLINE_9037_INTEGRITY_DIGEST,
    cutoff: contracts.cutoff, approved: true, complete: true,
    preservationCertificate: `LOCAL-ONLY-9037:${OFFLINE_9037_INTEGRITY_DIGEST}`, components: {}};
  const adapters = {}, company = {};
  for (const name of DATASET_COMPONENTS) {
    const c = contracts.components[name];
    const bound = {releaseId: c.releaseId, contentDigest: c.contentDigest, cutoff: contracts.cutoff,
      sourceDatasetId: seal.datasetId, sourceBundleDigest: OFFLINE_9037_INTEGRITY_DIGEST,
      provenance: c.policy, scopeContract: `9037-offline-${name}-v1`};
    manifest.components[name] = bound;
    function validate(payload, contract, args) {
      requireValue(isDeepStrictEqual(payload, payloads[name]) &&
        Object.entries(bound).every(([key, value]) => contract[key] === value), 'Mixed 9037 component');
      const data = name === 'ratings' ? payload.find(row => row.filters.org === args.org) : payload;
      requireValue(data !== undefined, 'Unsupported 9037 scope');
      return deepFreeze({data: structuredClone(data), sourceLabel: c.policy, dataClass: 'constructed-synthetic',
        publicationApproved: false, releaseId: c.releaseId, cutoff: contracts.cutoff, scopeContract: bound.scopeContract});
    }
    adapters[name] = {
      validateRequest: (request, contract) => validateDemoRequest(name, request, contract),
      read: async () => ({datasetId: seal.datasetId, bundleDigest: OFFLINE_9037_INTEGRITY_DIGEST,
        releaseId: c.releaseId, contentDigest: c.contentDigest, cutoff: contracts.cutoff,
        provenance: c.policy, scopeContract: bound.scopeContract, payload: structuredClone(payloads[name])}),
      validatePayload: validate,
    };
    company[name] = validate(payloads[name], bound, {org: 'all'});
  }
  validateDemoBundle(company, {skillPopulationByCode: REVIEWED_SKILL_POPULATIONS});
  const provider = defineDatasetProvider({manifest, client: Object.freeze({}), adapters});
  reviewed.add(provider);
  presenterContracts.set(provider, deepFreeze({population: payloads.workforce[0].headcount,
    externalStarts: 4163, exits: 3526,
    // Reconciled to the pinned capture and source fixture by the local planning review.
    skillPopulationByCode: REVIEWED_SKILL_POPULATIONS, skillCatalogSize: 12, skillRequirementCount: 155, roleSkillRequirements: {"AI-ARCH":{"AI-APPLICATION":4,"DATA-ANALYSIS":3,"SOFTWARE-DELIVERY":3},"AI-ENG":{"AI-APPLICATION":4,"DATA-ANALYSIS":3,"SOFTWARE-DELIVERY":3},"BI-ANA":{"DATA-ANALYSIS":4,"SOFTWARE-DELIVERY":2,"COMMUNICATION":3},"BI-DEV":{"DATA-ANALYSIS":4,"SOFTWARE-DELIVERY":3,"COMMUNICATION":3},"CLOUD-ARCH":{"PLATFORM-OPERATIONS":4,"SECURITY-RISK":3,"SOFTWARE-DELIVERY":3},"CLOUD-ENG":{"PLATFORM-OPERATIONS":4,"SECURITY-RISK":3,"SOFTWARE-DELIVERY":3},"COMMS-GEN":{"COMMUNICATION":4,"CLIENT-PARTNERSHIP":2,"EXPERIENCE-DESIGN":2},"CONS-MGMT":{"PROJECT-DELIVERY":4,"COMMUNICATION":3,"DATA-ANALYSIS":3},"CONS-TECH":{"PROJECT-DELIVERY":4,"COMMUNICATION":3,"DATA-ANALYSIS":3,"SOFTWARE-DELIVERY":3},"CONS-TRANS":{"PROJECT-DELIVERY":4,"COMMUNICATION":3,"DATA-ANALYSIS":3,"PEOPLE-ADVISORY":3},"CORPDEV-ANA":{"FINANCIAL-ANALYSIS":4,"DATA-ANALYSIS":3,"CLIENT-PARTNERSHIP":3},"CSM-GEN":{"CLIENT-PARTNERSHIP":4,"SERVICE-DELIVERY":3,"COMMUNICATION":3},"CYBER-ANA":{"SECURITY-RISK":4,"PLATFORM-OPERATIONS":3,"DATA-ANALYSIS":3},"CYBER-ENG":{"SECURITY-RISK":4,"PLATFORM-OPERATIONS":3,"DATA-ANALYSIS":3},"DE-ARCH":{"DATA-ANALYSIS":4,"SOFTWARE-DELIVERY":4,"PLATFORM-OPERATIONS":3},"DE-ENG":{"DATA-ANALYSIS":4,"SOFTWARE-DELIVERY":4,"PLATFORM-OPERATIONS":3},"DS-APPLIED":{"DATA-ANALYSIS":4,"AI-APPLICATION":3,"COMMUNICATION":3},"DS-SCI":{"DATA-ANALYSIS":4,"AI-APPLICATION":3,"COMMUNICATION":3},"FIN-ACC":{"FINANCIAL-ANALYSIS":4,"DATA-ANALYSIS":3,"SECURITY-RISK":2},"FIN-FPNA":{"FINANCIAL-ANALYSIS":4,"DATA-ANALYSIS":3,"SECURITY-RISK":2},"FIN-TREAS":{"FINANCIAL-ANALYSIS":4,"DATA-ANALYSIS":3,"SECURITY-RISK":2},"HR-HRBP":{"PEOPLE-ADVISORY":4,"COMMUNICATION":3,"DATA-ANALYSIS":2},"HR-HRIS":{"PEOPLE-ADVISORY":4,"COMMUNICATION":3,"DATA-ANALYSIS":2,"PLATFORM-OPERATIONS":3},"HR-PA":{"PEOPLE-ADVISORY":4,"COMMUNICATION":3,"DATA-ANALYSIS":4},"HR-TA":{"PEOPLE-ADVISORY":4,"COMMUNICATION":3,"DATA-ANALYSIS":2},"HR-TM":{"PEOPLE-ADVISORY":4,"COMMUNICATION":3,"DATA-ANALYSIS":2},"HR-TR":{"PEOPLE-ADVISORY":4,"COMMUNICATION":3,"DATA-ANALYSIS":2,"FINANCIAL-ANALYSIS":3},"INFOSEC-ANA":{"SECURITY-RISK":4,"PLATFORM-OPERATIONS":3,"COMMUNICATION":3},"INFRA-ENG":{"PLATFORM-OPERATIONS":4,"SECURITY-RISK":3,"SERVICE-DELIVERY":3},"IT-ENG":{"PLATFORM-OPERATIONS":3,"SERVICE-DELIVERY":4,"SECURITY-RISK":2},"LEGAL-COUNSEL":{"SECURITY-RISK":4,"COMMUNICATION":4,"CLIENT-PARTNERSHIP":2},"LEGAL-PRIV":{"SECURITY-RISK":4,"COMMUNICATION":4,"CLIENT-PARTNERSHIP":2},"MKT-BRAND":{"CLIENT-PARTNERSHIP":3,"COMMUNICATION":4,"DATA-ANALYSIS":3,"EXPERIENCE-DESIGN":3},"MKT-GROWTH":{"CLIENT-PARTNERSHIP":3,"COMMUNICATION":4,"DATA-ANALYSIS":3},"ML-ENG":{"AI-APPLICATION":4,"SOFTWARE-DELIVERY":4,"DATA-ANALYSIS":3},"OPS-BUS":{"SERVICE-DELIVERY":4,"PROJECT-DELIVERY":3,"DATA-ANALYSIS":2},"OPS-CLIENT":{"SERVICE-DELIVERY":4,"PROJECT-DELIVERY":3,"DATA-ANALYSIS":2},"PMO-PGM":{"PROJECT-DELIVERY":4,"COMMUNICATION":4,"FINANCIAL-ANALYSIS":2},"PMO-PM":{"PROJECT-DELIVERY":4,"COMMUNICATION":4,"FINANCIAL-ANALYSIS":2},"PROC-SOURCING":{"CLIENT-PARTNERSHIP":3,"FINANCIAL-ANALYSIS":3,"SECURITY-RISK":3},"PROD-PM":{"PROJECT-DELIVERY":4,"EXPERIENCE-DESIGN":3,"DATA-ANALYSIS":3},"QA-ENG":{"SOFTWARE-DELIVERY":4,"DATA-ANALYSIS":3,"SECURITY-RISK":2},"SALES-AE":{"CLIENT-PARTNERSHIP":4,"COMMUNICATION":4,"DATA-ANALYSIS":2},"SALES-OPS":{"CLIENT-PARTNERSHIP":4,"COMMUNICATION":4,"DATA-ANALYSIS":3},"STRAT-ANA":{"DATA-ANALYSIS":4,"FINANCIAL-ANALYSIS":3,"COMMUNICATION":4},"SWE-BACK":{"SOFTWARE-DELIVERY":4,"PROJECT-DELIVERY":2,"SECURITY-RISK":2},"SWE-FRONT":{"SOFTWARE-DELIVERY":4,"PROJECT-DELIVERY":2,"SECURITY-RISK":2},"SWE-FULL":{"SOFTWARE-DELIVERY":4,"PROJECT-DELIVERY":2,"SECURITY-RISK":2},"SWE-GEN":{"SOFTWARE-DELIVERY":4,"PROJECT-DELIVERY":2,"SECURITY-RISK":2},"UX-DES":{"EXPERIENCE-DESIGN":4,"COMMUNICATION":3,"DATA-ANALYSIS":3}},
    preferences: 4519, skillProfiles: 34746, requisitions: 4979, internalFills: 619, openRequisitions: 197,
    // Top-15 preferences_roles reproduced from the reviewed mapped CSV artifacts:
    // career_preferences.csv sha256 04dddf0fc6a24b9cdf1dfdd15cc1a094e8575098247c15aa97b1689e4a635e59
    // job_profiles.csv sha256 c35cbeab7e4aa4ea666417cbe8d3f7814d158ece36f4c9e97982541a67f4dcf2
    preferenceRoles: Object.fromEntries(['MKT-BRAND','CONS-TRANS','INFRA-ENG','SALES-OPS','ML-ENG',
      'CONS-MGMT','LEGAL-COUNSEL','OPS-BUS','HR-HRIS','CLOUD-ARCH','HR-PA','IT-ENG',
      'CYBER-ANA','CYBER-ENG','HR-HRBP'].map(code => [code, 'Demo '+code])),
    rangePolicy: payloads.compensation[0].range_policy_version,
    compensation: {releaseId: contracts.components.compensation.releaseId},
    provenance: Object.fromEntries(DATASET_COMPONENTS.map(name => [name, contracts.components[name].policy]))}));
  return provider;
}
