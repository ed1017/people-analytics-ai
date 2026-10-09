import {createHash} from 'node:crypto';
import {buildHomePack,normalizeHomePack} from '../lib/home-pack.mjs';
export const aggregateContract=Object.freeze({
 endpoint:'https://ed-workforce-ai.vercel.app/api/attrition',method:'GET',datasetToken:'legacy-v1:0',
 asOf:'2026-09-30',scope:'Company-wide; unfiltered',sourceId:'A1',readAttempts:2,concurrency:1,
 totalDeadlineMs:8000,responseBytes:65536,maximumMonths:36,
 summaryFields:Object.freeze('total_exits voluntary_exits involuntary_exits regrettable_exits retirements total_turnover_ytd_pct voluntary_turnover_ytd_pct annualized_voluntary_turnover_pct regrettable_share_of_voluntary_pct'.split(' ')),
 monthlyFields:Object.freeze('total_exits voluntary_exits involuntary_exits regrettable_exits monthly_turnover_pct monthly_voluntary_turnover_pct'.split(' ')),
});
export const aggregateHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=()=>{throw Error('aggregate_unavailable_or_changed');};
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const numeric=(value,key)=>{
 if(value===null||value===undefined)return null;
 if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e9||
   (key.endsWith('_pct')?value>100:!Number.isSafeInteger(value)))fail();
 return value;
};
export function projectAggregate(raw){
 if(!object(raw)||raw.as_of!==aggregateContract.asOf||!object(raw.summary)||raw.summary.suppressed===true||
   raw.suppressed===true||raw.data_meta!==undefined||raw.summary.as_of!==undefined&&raw.summary.as_of!==raw.as_of)fail();
 const summary=Object.fromEntries(aggregateContract.summaryFields.map(key=>[key,numeric(raw.summary[key],key)]));
 if(['total_exits','voluntary_exits','involuntary_exits'].some(key=>summary[key]===null))fail();
 if(!Array.isArray(raw.trend)||raw.trend.length>aggregateContract.maximumMonths)fail();
 const seen=new Set(),trend=raw.trend.map(row=>{
  if(!object(row)||typeof row.month!=='string'||!/^20\d\d-(0[1-9]|1[0-2])-01$/.test(row.month)||
    row.month>aggregateContract.asOf||seen.has(row.month)||row.suppressed===true)fail();
  seen.add(row.month);
  return {month:row.month,...Object.fromEntries(aggregateContract.monthlyFields.map(key=>[key,numeric(row[key],key)]))};
 }).sort((a,b)=>a.month.localeCompare(b.month));
 // Do not retain group/reason labels, raw rows, arbitrary keys or extra metadata.
 return {as_of:raw.as_of,summary,trend};
}
export function evidenceFor(aggregate){
 const projected=projectAggregate(aggregate);
 const pack=buildHomePack({attrition:{status:'loaded',data:projected}},aggregateContract.scope,'I want to reduce turnover');
 return normalizeHomePack({...pack,sources:pack.sources.map(source=>source.id==='A1'?source:{id:source.id,status:'unavailable',facts:null})});
}
async function boundedJson(response,signal){
 if(!response.ok||response.headers.get('x-workforce-dataset')!==aggregateContract.datasetToken||
   Number(response.headers.get('content-length'))>aggregateContract.responseBytes||!response.body)fail();
 const reader=response.body.getReader();let size=0;const chunks=[];
 const cancel=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
 try{
  for(;;){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;if(size>aggregateContract.responseBytes){cancel();fail();}chunks.push(value);
  }
  signal.throwIfAborted();return JSON.parse(Buffer.concat(chunks).toString('utf8'));
 }finally{signal.removeEventListener('abort',cancel);reader.releaseLock();}
}
export function createAggregateReader({dispatch,signal:outer,approvedAggregateSha256=null,now=Date.now}){
 if(typeof dispatch!=='function')throw Error('aggregate_transport_required');
 let attempts=0,completed=0,busy=false,failed=false,first=null,firstHash=null,timer=null,rejectStop,startedAt=null;
 const observations=[];
 const controller=new AbortController(),stopped=new Promise((_,reject)=>{rejectStop=reject;});
 // The promise can be stopped between reads; prevent a late unhandled rejection.
 stopped.catch(()=>{});
 const stop=()=>{failed=true;controller.abort();rejectStop(Error('aggregate_unavailable_or_changed'));};
 outer.addEventListener('abort',stop,{once:true});if(outer.aborted)stop();
 const read=async()=>{
  if(failed||busy||attempts>=aggregateContract.readAttempts){stop();fail();}
  if(startedAt===null){startedAt=now();timer=setTimeout(stop,aggregateContract.totalDeadlineMs);}
  if(now()-startedAt>=aggregateContract.totalDeadlineMs){stop();fail();}
  busy=true;attempts++;
  try{
   const aggregate=await Promise.race([(async()=>{
    controller.signal.throwIfAborted();
    const response=await dispatch(aggregateContract.endpoint,{method:'GET',headers:{accept:'application/json','x-workforce-dataset':aggregateContract.datasetToken},
     cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
    controller.signal.throwIfAborted();const projected=projectAggregate(await boundedJson(response,controller.signal));
    controller.signal.throwIfAborted();return projected;
   })(),stopped]);
   const digest=aggregateHash(aggregate);
   if(firstHash!==null&&digest!==firstHash||approvedAggregateSha256!==null&&digest!==approvedAggregateSha256){stop();fail();}
   if(first===null){first=aggregate;firstHash=digest;}completed++;
   observations.push({attempt:attempts,retrievedAt:new Date(now()).toISOString(),aggregateSha256:digest});
   return structuredClone(aggregate);
  }catch{stop();fail();}finally{busy=false;}
 };
 return {
  initial:()=>{if(attempts!==0){stop();fail();}return read();},
  async GET(request){
   const url=new URL(request.url);
   if(attempts!==1||completed!==1||request.method!=='GET'||url.pathname!=='/api/attrition'||url.search||
     request.headers.get('x-workforce-dataset')!==aggregateContract.datasetToken){stop();fail();}
   const cancel=()=>stop();request.signal.addEventListener('abort',cancel,{once:true});
   try{if(request.signal.aborted)stop();const aggregate=await read();
    return Response.json(aggregate,{headers:{'x-workforce-dataset':aggregateContract.datasetToken,'Cache-Control':'no-store'}});
   }finally{request.signal.removeEventListener('abort',cancel);}
  },
  verified(){if(failed||completed!==2||busy){stop();fail();}clearTimeout(timer);return this.provenance();},
  provenance:()=>({endpoint:aggregateContract.endpoint,datasetToken:aggregateContract.datasetToken,asOf:aggregateContract.asOf,scope:aggregateContract.scope,
   attempts,completed,observations:structuredClone(observations),aggregateSha256:firstHash,aggregate:first?structuredClone(first):null,sourceIntegrityCertified:false}),
  close(){clearTimeout(timer);outer.removeEventListener('abort',stop);controller.abort();},
 };
}
