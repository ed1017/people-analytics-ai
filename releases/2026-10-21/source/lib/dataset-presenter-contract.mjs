/** Explicit reviewed populations/history and labels; never inferred from query output. */
import {DEMO_CONTRACTS, DEMO_JOB_CODES, deepFreeze} from './dataset-demo-contracts.mjs';
import {OFFLINE_9037_DATASET_ID, reviewed9037PresenterContract} from './dataset-9037-offline-provider.mjs';

export const LEGACY_PRESENTER_CONTRACT = deepFreeze({population: 9847, externalStarts: 4327, exits: 2880,
  skillCatalogSize: 5, skillRequirementCount: 150, roleSkillRequirements: Object.fromEntries(DEMO_JOB_CODES.map(code=>[code,{'DEMO-SKILL-1':3,'DEMO-SKILL-2':3,'DEMO-SKILL-3':3}])),
  preferences: 4924, skillProfiles: 49235, requisitions: 5143, internalFills: 619, openRequisitions: 197,
  rangePolicy: 'constructed-demo-9847-ranges-v2', compensation: DEMO_CONTRACTS.compensation,
  provenance: Object.fromEntries(Object.entries(DEMO_CONTRACTS).map(([name, contract]) => [name, contract.provenance]))});

export function localPresenterContract({datasetId, provider}) {
  if (datasetId === OFFLINE_9037_DATASET_ID) return reviewed9037PresenterContract(provider);
  if (datasetId === 'workforce-demo-9847-2026-09-30-local-final-v1') return LEGACY_PRESENTER_CONTRACT;
  throw Error('Unsupported local presenter dataset');
}
