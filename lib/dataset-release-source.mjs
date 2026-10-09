/** Inactive read-only port. Transport is injected; no credentials, environment
 * lookup, source-table reads, fallback, DDL or dynamic relation identifiers.
 * A production driver must preserve these bound parameters and read-only role.
 */
import {DATASET_COMPONENTS} from './dataset-composition.mjs';
export const SEAL_READ = 'SELECT dataset_id,dataset_sha256,canonical_manifest,manifest,state,publication_approved FROM demo9847_release.dataset_seal WHERE singleton = $1';
export const COMPONENT_READ = 'SELECT component,release_id,content_sha256,canonical_payload,payload,cutoff,provenance,scope_contract,publication_approved FROM demo9847_release.component_releases WHERE component = $1';
export function createDatasetReleaseSource(query) {
  if (typeof query !== 'function') throw Error('Bound read transport required');
  async function one(sql, params) {
    const result = await query(sql, params);
    if (result?.error || !Array.isArray(result?.rows) || result.rows.length !== 1) throw Error('Sealed release unavailable');
    return structuredClone(result.rows[0]);
  }
  return Object.freeze({
    readSeal: () => one(SEAL_READ, [true]),
    readComponent: name => {
      if (!DATASET_COMPONENTS.includes(name)) throw Error('Unknown dataset component');
      return one(COMPONENT_READ, [name]);
    },
  });
}
