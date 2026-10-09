/** Server/control-plane adapter. No driver, credentials, grants or schema creation.
 * The injected query(sql, parameters) must use a trusted direct PostgreSQL driver.
 * Normal app instances construct this read-only. Only an approved control-plane
 * caller may explicitly enable selection. It is not wired into the v1 runtime.
 */
const readSQL = `SELECT s.dataset_id, s.generation, s.digest
FROM workforce_dataset_control.selection s
JOIN workforce_dataset_control.bindings b USING (dataset_id, digest)
WHERE s.slot = 'workforce' AND
 ((s.dataset_id = 'legacy-v1' AND s.generation = 0 AND s.digest = 'uncertified-live-v1')
  OR (b.approved AND b.complete AND b.preservation_certificate IS NOT NULL))`;
const casSQL = `WITH changed AS (
 UPDATE workforce_dataset_control.selection s
 SET dataset_id=$4, generation=$5::bigint, digest=$6
 WHERE s.slot='workforce' AND s.dataset_id=$1 AND s.generation=$2::bigint AND s.digest=$3
   AND $5::bigint=$2::bigint+1
   AND EXISTS (SELECT 1 FROM workforce_dataset_control.bindings b
     WHERE b.dataset_id=$4 AND b.digest=$6 AND b.approved AND b.complete
       AND b.preservation_certificate=$7)
 RETURNING s.dataset_id,s.generation,s.digest
), receipt AS (
 INSERT INTO workforce_dataset_control.selection_history
 (generation,previous_dataset,previous_digest,dataset_id,digest,approval_reference,implementation_commit,configuration_fingerprint,preservation_certificate)
 SELECT generation,$1,$3,dataset_id,digest,$8,$9,$10,$7 FROM changed
 RETURNING dataset_id,generation,digest
) SELECT * FROM receipt`;
function identity(value) {
  return value && /^[a-z0-9][a-z0-9-]{0,95}$/.test(value.datasetId) &&
    Number.isSafeInteger(value.generation) && value.generation >= 0 && value.generation <= 999999999999 &&
    (value.digest === 'uncertified-live-v1' && value.datasetId === 'legacy-v1' && value.generation === 0 || /^[a-f0-9]{64}$/.test(value.digest));
}
export class PostgresDatasetSelector {
  #query;
  #writable;
  constructor(query, { allowSelection = false } = {}) {
    if (typeof query !== 'function') throw Error('Trusted PostgreSQL query adapter required');
    this.#query=query;this.#writable=allowSelection;
  }
  async read() {
    const {rows}=await this.#query(readSQL,[]);
    if (!Array.isArray(rows) || rows.length !== 1) throw Error('Dataset selector unavailable');
    const selected={datasetId:rows[0].dataset_id,generation:Number(rows[0].generation),digest:rows[0].digest};
    if (!identity(selected)) throw Error('Invalid stored dataset identity');
    return Object.freeze(selected);
  }
  async compareAndSwap(expected,next,approval) {
    if (!this.#writable) throw Error('Dataset selector is read-only');
    if (!identity(expected) || !identity(next) || next.generation!==expected.generation+1 ||
        approval?.bundleDigest!==next.digest || !/^[a-f0-9]{40}$/.test(approval?.implementationCommit??'') ||
        !['reference','configurationFingerprint','preservationCertificate'].every(k=>typeof approval?.[k]==='string'&&approval[k].length>0&&approval[k].length<=256))
      throw Error('Invalid reviewed selection');
    const {rows}=await this.#query(casSQL,[expected.datasetId,expected.generation,expected.digest,next.datasetId,next.generation,next.digest,
      approval.preservationCertificate,approval.reference,approval.implementationCommit,approval.configurationFingerprint]);
    if (!Array.isArray(rows) || rows.length>1) throw Error('Invalid selector receipt');
    if (!rows.length) return false;
    if (rows[0].dataset_id!==next.datasetId || Number(rows[0].generation)!==next.generation || rows[0].digest!==next.digest)
      throw Error('Selector receipt mismatch');
    return true;
  }
}
