// @ts-expect-error Native Node tests share this TypeScript source.
import {compensationRelease, validateRelease, type ReleaseRow} from './compensation-release.ts';
import {DEMO_CONTRACTS, DEMO_JOB_CODES, DEMO_COMPENSATION_FIELDS, exact, validateDemoPayload} from './dataset-demo-contracts.mjs';
import {PUBLIC_9037} from './public-9037-contract.mjs';

// Client response validation for the already-bound protected preview. This does
// not register a provider, activate a dataset, or confer publication approval.
const preview9037 = {
  datasetId: 'workforce-demo-9037-2026-09-30-v3-1-offline-candidate',
  bundleDigest: '5f7c0952361565579df7354d863441698d776fa2ef2ab1f9c70f8b0c14079ab7',
  releaseId: 'compensation-9037-2026-09-30-offline-v1',
  rangePolicy: 'constructed-9037-inherited-range-policy-v1',
};
/** Select a reviewed release validator from the bound dataset, never from a
 * release ID alone. Legacy contents and their validator remain unchanged. */
export function validateCompensationContext(data: unknown, token: string): ReleaseRow[] {
  if(token===PUBLIC_9037.token){
    const publicData=data as {release_id?:string;rows?:ReleaseRow[];data_meta?:Record<string,unknown>};
    const m=publicData?.data_meta;
    if(publicData.release_id!==PUBLIC_9037.compensationRelease||!Array.isArray(publicData.rows)||publicData.rows.some(r=>r.release_id!==PUBLIC_9037.compensationRelease)||m?.datasetId!==PUBLIC_9037.datasetId||m.datasetToken!==token||m.publicationApproved!==true||m.contract!==PUBLIC_9037.contract||m.publicationReceiptId!==PUBLIC_9037.approval||typeof m.bundleDigest!=='string'||!/^[a-f0-9]{64}$/.test(m.bundleDigest))throw Error('Unreviewed public compensation release');
    // Reuse numerical/withholding validation on an internal copy only. Public
    // identity is checked above; private receipts are never sent to the client.
    const checked=validateCompensationContext({...publicData,release_id:preview9037.releaseId,rows:publicData.rows.map(r=>({...r,release_id:preview9037.releaseId})),data_meta:{...m,datasetId:preview9037.datasetId,datasetToken:preview9037.datasetId+':1',bundleDigest:preview9037.bundleDigest,publicationApproved:false,contract:'local-app-parity-v1'}},preview9037.datasetId+':1');
    return checked.map(r=>({...r,release_id:PUBLIC_9037.compensationRelease}));
  }
  const value=data as {release_id?:string;snapshot_date?:string;scope?:{country:unknown;org:unknown;level:unknown};rows?:unknown;data_meta?:{datasetToken?:string;datasetId?:string;bundleDigest?:string;cutoff?:string;contract?:string;dataClass?:string;publicationApproved?:boolean}};
  if(!value?.scope || value.scope.country!==null || value.scope.org!==null || value.scope.level!==null || value.snapshot_date!=='2026-09-30')throw Error('Wrong release scope');
  if(token==='legacy-v1:0') {
    if(value.release_id!==compensationRelease.releaseId)throw Error('Wrong legacy release');
    return validateRelease(value.rows);
  }
  const boundPreview = token.startsWith('workforce-demo-skills-20261023-local-v1:')
    ? {...preview9037,datasetId:'workforce-demo-skills-20261023-local-v1',bundleDigest:'353528c6f453e7ee06ac54726f2b296973f4b45eb88d150c193a993dce8f3c2a'}
    : preview9037;
  if (token.startsWith(boundPreview.datasetId + ':')) {
    const meta=value.data_meta;
    if (!new RegExp(`^${boundPreview.datasetId}:[1-9][0-9]{0,11}$`).test(token) ||
      meta?.datasetToken!==token || meta.datasetId!==boundPreview.datasetId ||
      meta.bundleDigest!==boundPreview.bundleDigest || meta.cutoff!==value.snapshot_date ||
      meta.contract!=='local-app-parity-v1' || meta.dataClass!=='constructed-synthetic' ||
      meta.publicationApproved!==false || value.release_id!==preview9037.releaseId ||
      !exact(value.scope,['country','org','level'])) throw Error('Unreviewed compensation dataset');
    if (!Array.isArray(value.rows) || value.rows.length!==DEMO_JOB_CODES.length) throw Error('Incomplete 9037 compensation release');
    const seen=new Set<string>();
    const result=value.rows.map((row: ReleaseRow) => {
      if (!exact(row,DEMO_COMPENSATION_FIELDS) || row.release_id!==preview9037.releaseId ||
        row.snapshot_date!==value.snapshot_date || !DEMO_JOB_CODES.includes(row.job_profile_code) || seen.has(row.job_profile_code) ||
        typeof row.job_profile_name!=='string' || !row.job_profile_name.trim() || row.job_profile_name.length>200 ||
        row.base_pay_provenance!=='constructed-workforce-9037-v3-1' || row.range_provenance!=='synthetic_assumed_range' ||
        row.range_policy_version!==preview9037.rangePolicy) throw Error('Wrong 9037 compensation lineage');
      seen.add(row.job_profile_code);
      if (['AI-ARCH','COMMS-GEN'].includes(row.job_profile_code)) {
        if (row.status!=='withheld' || row.coverage!=='withheld' || row.mean_compa_pct!==null) throw Error('Protected compensation job');
      } else if (row.status!=='published' || row.coverage!=='complete' || typeof row.mean_compa_pct!=='number' ||
        !Number.isFinite(row.mean_compa_pct) || row.mean_compa_pct<=0 ||
        row.mean_compa_pct!==Number(row.mean_compa_pct.toFixed(6))) throw Error('Invalid 9037 compensation metric');
      return {...row};
    });
    return result.sort((a,b)=>a.job_profile_code.localeCompare(b.job_profile_code));
  }
  if(!/^workforce-demo-9847-2026-09-30-local-final-v1:[0-9]+$/.test(token) || value.data_meta?.datasetToken!==token || value.data_meta.dataClass!=='constructed-synthetic' || value.data_meta.publicationApproved!==false || value.release_id!==DEMO_CONTRACTS.compensation.releaseId)throw Error('Unreviewed compensation dataset');
  return validateDemoPayload('compensation',value.rows,DEMO_CONTRACTS.compensation,{org:'all'}).data as ReleaseRow[];
}
