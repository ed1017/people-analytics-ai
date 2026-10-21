import {PUBLIC_9037} from './public-9037-contract.mjs';
const keys=['datasetId','datasetToken','publicDigest','cutoff','provenance','contract','publicationReceiptId'];
export function isPublicProjectionVersion(value){
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',')&&value.datasetId===PUBLIC_9037.datasetId&&value.datasetToken===PUBLIC_9037.token&&value.cutoff===PUBLIC_9037.cutoff&&value.provenance==='approved-public-projection-v1'&&value.contract===PUBLIC_9037.contract&&value.publicationReceiptId===PUBLIC_9037.approval&&typeof value.publicDigest==='string'&&/^[a-f0-9]{64}$/.test(value.publicDigest);
}
