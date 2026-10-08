// @ts-expect-error Native Node tests share this TypeScript source.
import {compensationRelease, validateRelease, type ReleaseRow} from './compensation-release.ts';
import {DEMO_CONTRACTS, validateDemoPayload} from './dataset-demo-contracts.mjs';
/** Select a reviewed release validator from the bound dataset, never from a
 * release ID alone. Legacy contents and their validator remain unchanged. */
export function validateCompensationContext(data: unknown, token: string): ReleaseRow[] {
  const value=data as {release_id?:string;snapshot_date?:string;scope?:{country:unknown;org:unknown;level:unknown};rows?:unknown;data_meta?:{datasetToken?:string;dataClass?:string;publicationApproved?:boolean}};
  if(!value?.scope || value.scope.country!==null || value.scope.org!==null || value.scope.level!==null || value.snapshot_date!=='2026-09-30')throw Error('Wrong release scope');
  if(token==='legacy-v1:0') {
    if(value.release_id!==compensationRelease.releaseId)throw Error('Wrong legacy release');
    return validateRelease(value.rows);
  }
  if(!/^workforce-demo-9847-2026-09-30-local-final-v1:[0-9]+$/.test(token) || value.data_meta?.datasetToken!==token || value.data_meta.dataClass!=='constructed-synthetic' || value.data_meta.publicationApproved!==false || value.release_id!==DEMO_CONTRACTS.compensation.releaseId)throw Error('Unreviewed compensation dataset');
  return validateDemoPayload('compensation',value.rows,DEMO_CONTRACTS.compensation,{org:'all'}).data as ReleaseRow[];
}
