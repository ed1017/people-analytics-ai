import {PUBLIC_9037} from './public-9037-contract.mjs';
const keys=['datasetId','datasetToken','publicDigest','cutoff','provenance','contract','publicationReceiptId'];
export function isPublicProjectionVersion(value){
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',')&&value.datasetId===PUBLIC_9037.datasetId&&value.datasetToken===PUBLIC_9037.token&&value.cutoff===PUBLIC_9037.cutoff&&value.provenance==='approved-public-projection-v1'&&value.contract===PUBLIC_9037.contract&&value.publicationReceiptId===PUBLIC_9037.approval&&typeof value.publicDigest==='string'&&/^[a-f0-9]{64}$/.test(value.publicDigest);
}

/** Read-only historical validation; never grants current-source eligibility. */
export function isStoredPublicProjectionVersion(value){
 if(isPublicProjectionVersion(value))return true;
 if(value?.datasetId==='workforce-demo-9037-public-aggregates-v2'&&value?.datasetToken==='workforce-demo-9037-public-aggregates-v2:3'&&value?.publicationReceiptId==='edwin-coordinated-synthetic-realism-2026-10-23')return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',')&&value.cutoff==='2026-09-30'&&value.provenance==='approved-public-projection-v1'&&value.contract==='public-synthetic-aggregates-and-calculations-v1'&&typeof value.publicDigest==='string'&&/^[a-f0-9]{64}$/.test(value.publicDigest);
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',')&&value.datasetId==='workforce-demo-9037-public-aggregates-v1'&&value.datasetToken==='workforce-demo-9037-public-aggregates-v1:2'&&value.cutoff==='2026-09-30'&&value.provenance==='approved-public-projection-v1'&&value.contract==='public-synthetic-aggregates-and-calculations-v1'&&value.publicationReceiptId==='edwin-public-synthetic-and-popup-2026-10-19'&&typeof value.publicDigest==='string'&&/^[a-f0-9]{64}$/.test(value.publicDigest);
}
