import {SUCCESSION_PUBLIC_FIELDS,validateSuccessionPublicSummary} from './succession-public-contract.mjs';
import {DEMO_CONTRACTS,DEMO_SUCCESSION_LABEL} from './dataset-demo-contracts.mjs';
import {readDemoDisplayContext} from './dataset-display-context.mjs';
import type {SuccessionCoverageResponse} from './types';

/** Keep the frozen 13-field validator intact; only the bound demo adds provenance. */
export function validateSuccessionContext(input: unknown, token: string): SuccessionCoverageResponse {
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Succession summary unavailable.');
 const data=input as Record<string,unknown>;
 if(/^legacy-v1:[0-9]{1,12}$/.test(token)){
  const legacy=validateSuccessionPublicSummary(data);
  if(!('value' in legacy))throw Error('Succession summary unavailable.');
  return legacy.value as SuccessionCoverageResponse;
 }
 const meta=data.data_meta as Record<string,unknown>|undefined;
 const context=readDemoDisplayContext(meta);
 if(!context||context.datasetToken!==token||meta?.releaseId!==DEMO_CONTRACTS.succession.releaseId||
  meta?.sourceLabel!==DEMO_SUCCESSION_LABEL||meta?.successionSemantics!=='illustrative-plan-flags'||
  Object.keys(data).length!==SUCCESSION_PUBLIC_FIELDS.length+1||!SUCCESSION_PUBLIC_FIELDS.every(k=>Object.hasOwn(data,k)))throw Error('Succession dataset unavailable.');
 const payload=Object.fromEntries(SUCCESSION_PUBLIC_FIELDS.map(k=>[k,data[k]]));
 const validation=validateSuccessionPublicSummary(payload);
 if(!('value' in validation)||payload.as_of_date!==context.cutoff)throw Error('Succession summary unavailable.');
 return {...validation.value,data_meta:{...context,sourceLabel:DEMO_SUCCESSION_LABEL,successionSemantics:'illustrative-plan-flags'}} as SuccessionCoverageResponse;
}
