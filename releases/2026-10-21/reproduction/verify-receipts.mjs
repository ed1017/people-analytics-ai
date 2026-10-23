import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {LOCAL_COMPANY_GET_ROUTES} from '../source/lib/dataset-company-routes.mjs';
import {PUBLIC_9037} from '../source/lib/public-9037-contract.mjs';
import {projectPublic9037,public9037Metadata,public9037Fields} from '../source/lib/public-9037-projection.mjs';

export const OBSERVED_PUBLIC_DIGEST='53f5270a08bf3a9c04de43cf22b6b4a48cd092f9fca0b39e113602bbb686bbd9';
const placeholder='public-projection-digest-placeholder';
const convention='hire_date is accepted offer; start_date drives headcount inflow. Internal hires are movements, not external starts.';
const fail=()=>{throw Error('Public receipt contract mismatch.');};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const sourceOrderedBundleDigest=documents=>hash({version:PUBLIC_9037.contract,fields:public9037Fields,documents});
function metadata(route,digest){
 return public9037Metadata(digest,route==='/api/talent-acquisition'?{hireDateConvention:convention}:{});
}
function dashboardScope(){
 return {version:3,status:'verified_public_aggregate',requested:{country:'all',org:'all',level:'all'},effective:{country:'all',org:'all',level:'all'},label:'All countries; All business units; All levels',basis:'Pinned complete synthetic joint cube; exact calendar, group flows and sealed company totals reconciled. Not an RPC or real-world attestation.',metricContract:'voluntary-ytd-nine-month-average-stock-v2',stockStatus:'positive',datasetToken:PUBLIC_9037.token,contract:PUBLIC_9037.contract,cutoff:PUBLIC_9037.cutoff};
}
/** Verify observed public receipts; this does not issue approval or alter local identity. */
export function verifyPublicDocument(route,body,digest=OBSERVED_PUBLIC_DIGEST){
 if(!LOCAL_COMPANY_GET_ROUTES.includes(route)||!/^[a-f0-9]{64}$/.test(digest))fail();
 const hasReceipt=route!=='/api/headcount-trend';
 if(hasReceipt&&!isDeepStrictEqual(body?.data_meta,metadata(route,digest)))fail();
 function check(value,depth=0){
  if(depth>30)fail();
  if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){
   if(['__proto__','constructor','prototype'].includes(key))fail();
   if(key==='data_meta'){if(depth!==0||!hasReceipt)fail();continue;}
   check(child,depth+1);
  }
 }
 check(body);
 const input=structuredClone(body);
 if(route==='/api/dashboard'){
  if(!isDeepStrictEqual(input.workforce_filter_scope,dashboardScope()))fail();
  // These three fields are appended by the public projector after its leaf walk.
  for(const key of ['datasetToken','contract','cutoff'])delete input.workforce_filter_scope[key];
 }
 const projected=projectPublic9037(route,input,digest);
 if(route==='/api/dashboard')Object.assign(projected.workforce_filter_scope,{datasetToken:PUBLIC_9037.token,contract:PUBLIC_9037.contract,cutoff:PUBLIC_9037.cutoff});
 // Projector drops denied keys: reject rather than silently accept those extras.
 if(!isDeepStrictEqual(projected,body))fail();
 const document=structuredClone(body);
 if(hasReceipt)document.data_meta=metadata(route,placeholder);
 return {document,evidence:{route,bodySha256:hash(body),metadataPaths:hasReceipt?['$.data_meta']:[],metadataKeys:hasReceipt?Object.keys(body.data_meta):[]}};
}
export function verifyPublicBundle(bodies,digest=OBSERVED_PUBLIC_DIGEST){
 if(!Array.isArray(bodies)||bodies.length!==LOCAL_COMPANY_GET_ROUTES.length)fail();
 const checked=bodies.map((body,i)=>verifyPublicDocument(LOCAL_COMPANY_GET_ROUTES[i],body,digest));
 // This insertion order and JSON.stringify exactly match public-9037.server.mjs.
 const reconstructedDigest=sourceOrderedBundleDigest(checked.map(x=>x.document));
 if(reconstructedDigest!==digest)throw Error('Public placeholder bundle digest mismatch.');
 return {contract:PUBLIC_9037.contract,observedDigest:digest,reconstructedDigest,routes:checked.map(x=>x.evidence),meaning:'Observed captured receipt compatibility only; no new approval or local runtime identity.'};
}
