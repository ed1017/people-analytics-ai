import {buildHomePack,homeDefinitions,normalizeHomePack} from './home-pack.mjs';
import {LEGACY_DATASET_TOKEN} from './dataset-identity.mjs';
import {readDashboardScopeReceipt} from './dashboard-scope.ts';

export class SolutionEvidenceError extends Error {
 constructor(){super('Current database evidence is unavailable or changed. Refresh Home before continuing.');}
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const withoutRows=facts=>Object.fromEntries(Object.entries(facts??{}).filter(([key])=>!['rows','monthly'].includes(key)));
const containsRows=(pool,rows)=>{
 const remaining=pool.map(row=>JSON.stringify(row));
 return (rows??[]).every(row=>{const index=remaining.indexOf(JSON.stringify(row));if(index<0)return false;remaining.splice(index,1);return true;});
};
/** Revalidate only already supplied aggregate sources through the existing readers.
 * This does not attest legacy database integrity, fill missing inputs, or verify prose.
 * The exact accepted packet is retained so review/save evidence bindings stay valid.
 */
export async function verifySolutionEvidence(request,{datasetToken,read,now=()=>new Date()},signal){
 signal.throwIfAborted();
 const pack=normalizeHomePack(request.evidence);
 // A candidate version needs its existing certified provider/rebuild path, never legacy readers.
 if(datasetToken!==LEGACY_DATASET_TOKEN||pack.datasetContext)throw new SolutionEvidenceError();
 const definitions=new Map(homeDefinitions.map(def=>[def[0],def]));
 const sourceKeys=[...new Set(pack.sources.filter(source=>source.status==='loaded'&&!['I3','D1'].includes(source.id)).map(source=>definitions.get(source.id)[1]))];
 const results=Object.fromEntries(await Promise.all(sourceKeys.map(async key=>{
  try{const result=await read(key,request.filters,signal);return [key,result];}
  catch{signal.throwIfAborted();throw new SolutionEvidenceError();}
 })));
 signal.throwIfAborted();
 if(pack.sources.some(source=>source.id==='W1'&&source.status==='loaded')){
  const receipt=readDashboardScopeReceipt(results.dashboard?.data?.workforce_filter_scope);
  if(receipt?.status!=='verified_rpc'||!['country','org','level'].every(key=>receipt.effective[key]===request.filters[key]))throw new SolutionEvidenceError();
 }
 const pools=new Map(),fresh=buildHomePack(results,request.scope,'',{},(id,rows,monthly)=>pools.set(id,{rows,monthly}));
 if(pack.sources.some(source=>source.id==='W1'&&source.status==='loaded')&&(fresh.workforceScope!==pack.workforceScope||request.scope.slice(0,160)!==pack.workforceScope))throw new SolutionEvidenceError();
 for(const supplied of pack.sources){
  // Session quotes/calculations retain their existing explicit fictional/unverified labels.
  if(supplied.status!=='loaded'||['I3','D1'].includes(supplied.id))continue;
  const actual=fresh.sources.find(source=>source.id===supplied.id),pool=pools.get(supplied.id);
  if(!actual||actual.status!=='loaded'||!pool||
   !['scope','date','population','limitation','sourceContext'].every(key=>same(supplied[key],actual[key]))||
   !same(withoutRows(supplied.facts),withoutRows(actual.facts))||
   supplied.coverage.rowsAvailable!==actual.coverage.rowsAvailable||
   !containsRows(pool.rows,supplied.facts.rows)||!containsRows(pool.monthly,supplied.facts.monthly))throw new SolutionEvidenceError();
 }
 const packetSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(pack))))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
 return {version:1,datasetToken,packetSha256,retrievedAt:now().toISOString(),verification:'Existing aggregate readers; matching supplied facts, dates, scope and sampled rows.',
  databaseIntegrityCertified:false,independentForecastValidation:false,
  sources:pack.sources.map(source=>({id:source.id,reader:['I3','D1'].includes(source.id)?null:'/api/'+definitions.get(source.id)[1],scope:source.scope,asOf:source.date,status:source.status,
   basis:source.status!=='loaded'?'unavailable':source.id==='I2'?'separate-public-market-source':source.id==='I3'||source.id==='D1'?'fictional-or-unverified-session-input':source.id==='P1'?'database-stored-scenario':'database-backed-aggregate',
   limitation:source.limitation})),
  limitations:['Legacy source/import version is not certified. Retrieval time is not the observation date. Different sources may have different dates and populations.',
   'Company-wide evidence does not establish team or role facts. Headcount, preferences and skill coverage do not establish availability or readiness.',
   'Frameworks, user statements, proposed owner roles and scenario assumptions are not observed company facts. Missing evidence remains unknown.',
   'Code checks arithmetic and references; free prose still requires review. No causal effect or projected benefit is established.']};
}
