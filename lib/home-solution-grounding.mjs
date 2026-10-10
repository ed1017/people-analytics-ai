import {buildHomePack,homeDefinitions,normalizeHomePack} from './home-pack.mjs';
import {LEGACY_DATASET_TOKEN} from './dataset-identity.mjs';
import {readDashboardScopeReceipt} from './dashboard-scope.ts';
import {groundingFailureDetails,groundingReadDetails} from './home-solution-diagnostics.ts';
import {sourceAuthenticationCode,correlationReceipt} from './data-source-failure.mjs';
import {solutionEvidenceCode,solutionEvidenceMessage} from './home-evidence-recovery.mjs';

export class SolutionEvidenceError extends Error {
 constructor(diagnostic={}){const safe=groundingFailureDetails(diagnostic);super(solutionEvidenceMessage(solutionEvidenceCode(safe)));this.diagnostic=safe;}
}
export class AggregateEvidenceReadError extends Error {
 /** @param {string} readFailure @param {number|null} httpStatus @param {object} receipt */
 constructor(readFailure,httpStatus=null,receipt={}){super('Aggregate evidence read failed');this.diagnostic=groundingFailureDetails({...receipt,readFailure,httpStatus});}
 /** Existing server reader responses only; never parse or forward an error body. */
 static fromResponse(response){
  const code=sourceAuthenticationCode(response.headers.get('x-data-upstream-code'));
  const auth=response.status===503&&response.headers.get('x-data-error-code')==='source_auth_unavailable'&&code!==null;
  return new AggregateEvidenceReadError(auth?'source_authentication':'http_error',response.status,{upstreamCode:auth?code:null,sourceCorrelationId:correlationReceipt(response.headers.get('x-correlation-id'))});
 }
}
// Four reader slots; each existing reader retains its own bounded upstream fan-out.
// Keep the 30s total deadline and all fresh verification unchanged. This is not a latency SLA.
export const solutionGroundingLimits=Object.freeze({readers:4,timeoutMs:30000});
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
export async function verifySolutionEvidence(request,ports,signal){
 if(signal.aborted)throw new SolutionEvidenceError({trigger:'cancelled'});
 const controller=new AbortController(),startedAt=Date.now(),active=new Map(),durations=new Map(),starts=new Map();let rejectStop,terminal,readersStarted=0,readersCompleted=0,maxConcurrentReaders=0;
 /** @type {Promise<never>} */
 const interrupted=new Promise((_,reject)=>{rejectStop=reject;});
 const stop=(trigger,reader=null,error=null)=>{
  if(terminal)return terminal;
  const at=Date.now(),readFailure=error instanceof AggregateEvidenceReadError?error.diagnostic:null;
  terminal=new SolutionEvidenceError({trigger,reader,elapsedMs:at-startedAt,readerElapsedMs:active.has(reader)?at-active.get(reader):durations.get(reader)??null,readersStarted,readersCompleted,
   activeReaders:[...active].map(([reader,start])=>({reader,elapsedMs:at-start})),readFailure:readFailure?.readFailure??(trigger==='reader_failed'?'exception':null),httpStatus:readFailure?.httpStatus,
   upstreamCode:readFailure?.upstreamCode,sourceCorrelationId:readFailure?.sourceCorrelationId});
  controller.abort();rejectStop(terminal);return terminal;
 };
 const timer=setTimeout(()=>stop('deadline'),solutionGroundingLimits.timeoutMs),cancel=()=>stop('cancelled');
 signal.addEventListener('abort',cancel,{once:true});
 const lifecycle={fail:stop,start:key=>{readersStarted++;const at=Date.now();active.set(key,at);starts.set(key,at);maxConcurrentReaders=Math.max(maxConcurrentReaders,active.size);},complete:key=>{readersCompleted++;durations.set(key,Date.now()-active.get(key));active.delete(key);}};
 try{
  // Race the whole grounding operation, including readers that ignore cancellation.
  return await Promise.race([verifyCurrentEvidence(request,ports,controller.signal,lifecycle),interrupted]);
 }catch{throw stop('verification_failed');}
 finally{
  clearTimeout(timer);signal.removeEventListener('abort',cancel);
  // Snapshot once. Late uncancellable reads cannot alter the reported outcome.
  const at=Date.now();
  try{ports.onDiagnostic?.(groundingReadDetails({elapsedMs:at-startedAt,readersStarted,readersCompleted,maxConcurrentReaders,
   readers:[...starts].map(([reader,start])=>({reader,startedAfterMs:start-startedAt,elapsedMs:durations.get(reader)??at-start,completed:durations.has(reader)}))}));}catch{/* Observability cannot change verification. */}
 }
}
async function verifyCurrentEvidence(request,{datasetToken,read,now=()=>new Date()},signal,{fail,start,complete}){
 signal.throwIfAborted();
 const pack=normalizeHomePack(request.evidence);
 // A candidate version needs its existing certified provider/rebuild path, never legacy readers.
 if(datasetToken!==LEGACY_DATASET_TOKEN||pack.datasetContext)throw fail('dataset_mismatch');
 const definitions=new Map(homeDefinitions.map(def=>[def[0],def]));
 const sourceKeys=[...new Set(pack.sources.filter(source=>source.status==='loaded'&&!['I3','D1'].includes(source.id)).map(source=>definitions.get(source.id)[1]))];
 const entries=new Array(sourceKeys.length);let next=0;
 const worker=async()=>{
  while(next<sourceKeys.length){
   signal.throwIfAborted();const index=next++,key=sourceKeys[index];start(key);
   try{
    const result=await read(key,request.filters,signal);signal.throwIfAborted();
    if(result?.status!=='loaded')throw new AggregateEvidenceReadError('unavailable_result');
    entries[index]=[key,result];complete(key);
   }catch(error){throw fail('reader_failed',key,error);}
  }
 };
 await Promise.all(Array.from({length:Math.min(solutionGroundingLimits.readers,sourceKeys.length)},worker));
 const results=Object.fromEntries(entries);
 signal.throwIfAborted();
 if(pack.sources.some(source=>source.id==='W1'&&source.status==='loaded')){
  const receipt=readDashboardScopeReceipt(results.dashboard?.data?.workforce_filter_scope);
  if(receipt?.status!=='verified_rpc'||!['country','org','level'].every(key=>receipt.effective[key]===request.filters[key]))throw fail('scope_mismatch','dashboard');
 }
 const pools=new Map(),fresh=buildHomePack(results,request.scope,'',{},(id,rows,monthly)=>pools.set(id,{rows,monthly}));
 if(pack.sources.some(source=>source.id==='W1'&&source.status==='loaded')&&(fresh.workforceScope!==pack.workforceScope||request.scope.slice(0,160)!==pack.workforceScope))throw fail('scope_mismatch','dashboard');
 for(const supplied of pack.sources){
  // Session quotes/calculations retain their existing explicit fictional/unverified labels.
  if(supplied.status!=='loaded'||['I3','D1'].includes(supplied.id))continue;
  const actual=fresh.sources.find(source=>source.id===supplied.id),pool=pools.get(supplied.id);
  if(!actual||actual.status!=='loaded'||!pool||
   !['scope','date','population','limitation','sourceContext'].every(key=>same(supplied[key],actual[key]))||
   !same(withoutRows(supplied.facts),withoutRows(actual.facts))||
   supplied.coverage.rowsAvailable!==actual.coverage.rowsAvailable||
   !containsRows(pool.rows,supplied.facts.rows)||!containsRows(pool.monthly,supplied.facts.monthly))throw fail('facts_changed',definitions.get(supplied.id)[1]);
 }
 const packetSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(pack))))).map(byte=>byte.toString(16).padStart(2,'0')).join('');
 signal.throwIfAborted();
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
