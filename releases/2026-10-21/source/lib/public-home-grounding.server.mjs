import {createHash} from 'node:crypto';
import {buildHomePack,normalizeHomePack,homeDefinitions} from './home-pack.mjs';
import {PUBLIC_9037 as P} from './public-9037-contract.mjs';
import {public9037Metadata,public9037Fields} from './public-9037-projection.mjs';
import {readDashboardScopeReceipt} from './dashboard-scope.ts';
import {boundedJson} from './public-qa-stream.server.mjs';
import {awaitPublicQaBinding} from './public-qa-application.server.mjs';
import {bindPublicHomeReceipt,publicHomeSourceReceipts} from './public-home-receipt.mjs';
import {loadPublic9037Binding} from './public-9037.server.mjs';

export const PUBLIC_HOME_GROUNDING_ENABLED=false;
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const same=(a,b)=>canonical(a)===canonical(b);
const summary=f=>Object.fromEntries(Object.entries(f??{}).filter(([k])=>!['rows','monthly'].includes(k)));
const contains=(pool,rows)=>{const left=pool.map(canonical);return (rows??[]).every(row=>{const i=left.indexOf(canonical(row));if(i<0)return false;left.splice(i,1);return true;});};
const must=v=>{if(!v)throw Error('Public Home evidence unavailable or changed.');};
const definitions=new Map(homeDefinitions.map(d=>[d[0],d]));
/** Separate, disabled public contract. Does not rewrite the existing Home pack,
 * legacy verifier or saved-plan hashes. Production uses the reviewed public loader. */
export function createPublicHomeGrounding(options={}){
 // Never accept a caller-supplied handle or loader on the production factory.
 const {enabled=PUBLIC_HOME_GROUNDING_ENABLED,hostname,timeoutMs=30000}=options;
 return createPublicHomeGroundingTestAdapter({enabled,hostname,timeoutMs,loadPublicBinding:()=>loadPublic9037Binding({hostname,production:false})});
}
/** Explicit test seam, not an authenticated runtime entrypoint. Never wire caller
 * options to this factory. Structural resemblance cannot authenticate a port. */
export function createPublicHomeGroundingTestAdapter({enabled=PUBLIC_HOME_GROUNDING_ENABLED,loadPublicBinding,hostname,timeoutMs=30000}={}){
 return Object.freeze({async verify(request,incoming=new AbortController().signal){
  must(enabled===true);
  must(typeof loadPublicBinding==='function'&&/^people-analytics-[a-z0-9]+-ed-56dc\.vercel\.app$/.test(hostname)&&Number.isInteger(timeoutMs)&&timeoutMs>=1&&timeoutMs<=30000);
  const controller=new AbortController(),signal=AbortSignal.any([incoming,controller.signal]),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{signal.throwIfAborted();return await awaitPublicQaBinding((async()=>{
   signal.throwIfAborted();
   must(request?.datasetToken===P.token&&request.evidence?.datasetContext===undefined&&typeof request.scope==='string'&&request.scope.length<=160);
   const filters=request.filters;must(filters&&Object.keys(filters).sort().join(',')==='country,level,org'&&Object.values(filters).every(v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,40}$/.test(v)));
   const pack=normalizeHomePack(request.evidence);
   must(same(request.evidence,pack));
   must(!pack.datasetContext&&!pack.sources.some(s=>s.id==='I2'&&s.status==='loaded'));
   const ids=pack.sources.filter(s=>s.status==='loaded'&&!['I3','D1'].includes(s.id)).map(s=>s.id);
   must(ids.length>0);
   const binding=await loadPublicBinding();signal.throwIfAborted();
   const current=async()=>{
    must(typeof binding?.router?.current==='function'&&typeof binding.handle==='function');
    const identity=await binding.router.current();
    must(identity?.datasetId===P.datasetId&&identity.token===P.token&&identity.generation===2&&/^[a-f0-9]{64}$/.test(identity.digest)&&await binding.router.bootstrapToken()===P.token);
    return identity.digest;
   };
   const digest=await current(),keys=[...new Set(ids.map(id=>definitions.get(id)[1]))],results={};let next=0;
   const worker=async()=>{
    while(next<keys.length){
     signal.throwIfAborted();const key=keys[next++],path='/api/'+key;
     must(Object.hasOwn(public9037Fields,path));
     const target=path+(key==='dashboard'?'?'+new URLSearchParams({country:filters.country,org:filters.org,level:filters.level}):'');
     const r=await binding.handle(new Request('https://'+hostname+target,{headers:{'x-workforce-dataset':P.token},signal}));
     signal.throwIfAborted();must(r.ok&&r.headers.get('x-workforce-dataset')===P.token);
     const data=await boundedJson(r.body,8*1024*1024,signal),meta=data?.data_meta;
     must(meta&&meta.bundleDigest===digest&&same(meta,public9037Metadata(digest,meta)));
     must(await current()===digest);
     results[key]={status:'loaded',data};
    }
   };
   await Promise.all(Array.from({length:Math.min(2,keys.length)},worker));signal.throwIfAborted();
   if(ids.includes('W1')){
    const receipt=readDashboardScopeReceipt(results.dashboard?.data?.workforce_filter_scope);
    must(receipt?.status==='verified_public_aggregate'&&receipt.stockStatus==='positive'&&receipt.datasetToken===P.token&&receipt.contract===P.contract&&receipt.cutoff===P.cutoff&&same(receipt.requested,filters)&&same(receipt.effective,filters));
   }
   const pools=new Map(),fresh=buildHomePack(results,request.scope,'',{},(id,rows,monthly)=>pools.set(id,{rows,monthly}));
   if(ids.includes('W1'))must(fresh.workforceScope===pack.workforceScope&&request.scope===pack.workforceScope);
   for(const id of ids){
    const supplied=pack.sources.find(s=>s.id===id),actual=fresh.sources.find(s=>s.id===id),pool=pools.get(id);
    must(actual?.status==='loaded'&&pool&&['scope','date','population','limitation','sourceContext'].every(k=>same(supplied[k],actual[k]))&&same(summary(supplied.facts),summary(actual.facts))&&supplied.coverage.rowsAvailable===actual.coverage.rowsAvailable&&contains(pool.rows,supplied.facts.rows)&&contains(pool.monthly,supplied.facts.monthly));
   }
   must(await current()===digest);signal.throwIfAborted();
   // Keep normalized packet byte/order identity, just as the legacy verifier does.
   return bindPublicHomeReceipt({contract:'public-home-supplied-evidence-v1',provenance:'synthetic-public-projection',datasetToken:P.token,bundleDigest:digest,packetSha256:createHash('sha256').update(JSON.stringify(pack)).digest('hex'),
    verifiedSourceIds:ids,unverifiedSessionSourceIds:pack.sources.filter(s=>['I3','D1'].includes(s.id)&&s.status==='loaded').map(s=>s.id),
    databaseIntegrityCertified:false,independentForecastValidation:false,retrievedAt:new Date().toISOString(),sources:publicHomeSourceReceipts(pack)},pack,request);
  })(),signal);}catch{throw Error('Public Home evidence unavailable or changed.');}
  finally{clearTimeout(timer);controller.abort();}
 }});
}
