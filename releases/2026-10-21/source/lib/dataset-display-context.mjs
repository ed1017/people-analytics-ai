/** Allowlisted provenance for constructed aggregates; caller labels are never trusted. */
export const DEMO_DATASET_ID='workforce-demo-9847-2026-09-30-local-final-v1';
const fields=['datasetToken','datasetId','bundleDigest','cutoff','dataClass','publicationApproved','contract'];
export function readDemoDisplayContext(input){
 if(!input||typeof input!=='object'||input.datasetId!==DEMO_DATASET_ID||typeof input.datasetToken!=='string'||
  !new RegExp('^'+DEMO_DATASET_ID+':[0-9]{1,12}$').test(input.datasetToken)||
  typeof input.bundleDigest!=='string'||!/^[a-f0-9]{64}$/.test(input.bundleDigest)||input.cutoff!=='2026-09-30'||
  input.dataClass!=='constructed-synthetic'||input.publicationApproved!==false||input.contract!=='local-app-parity-v1')return null;
 return Object.fromEntries(fields.map(k=>[k,input[k]]));
}
export const DOMAIN_DEMO_LABELS=Object.freeze({
 R1:{label:'Constructed recruiting history',population:'Constructed applications, accepted offers and requisitions',limitation:'Accepted-offer dates count hires; start dates drive headcount. Internal fills are movements. October–December is unmodeled; no candidate stock forecast or screening stage is released.'},
 T2:{label:'Constructed learning pathways',population:'Constructed skill requirements and course catalog',limitation:'Constructed demo catalog availability and duration; not assessed readiness, completion or learning gains.'},
 T5:{label:'Illustrative succession demo',population:'Constructed filled critical positions',limitation:'Illustrative demo plan flags; not assessed or predicted readiness. Never derive suppressed complements or individual recommendations.'},
 P2:{label:'Constructed position inventory',population:'Constructed authorized positions, not employees',limitation:'Current inventory only. The flat draft omits current vacancies; any difference is not an approved closure or headcount reduction.'},
});
