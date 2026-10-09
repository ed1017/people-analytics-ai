export type SourceResult = {status:'loaded'|'unavailable'|'timeout';data:unknown};
const unavailable:SourceResult={status:'unavailable',data:null};
export const SOURCE_SUCCESS_TTL_MS=300000;
export const SOURCE_FAILURE_RETRY_MS=30000;
export const SOURCE_FAILURE_MAX_RETRY_MS=120000;

/** Demand-driven reads only: expiry permits a later read; it never schedules one. */
export class SourceRequests {
 private epoch=0;
 private datasetToken:string|null=null;
 private pending:Promise<SourceResult>|null=null;
 private cached:{result:SourceResult;expires:number}|null=null;
 private failures=0;
 private load:()=>Promise<SourceResult>;
 private now:()=>number;
 constructor(load:()=>Promise<SourceResult>,now=()=>Date.now()){this.load=load;this.now=now;}
 invalidate(){this.cached=null;this.failures=0;}
 /** Dataset changes must also retire pending work; ordinary refresh still shares it. */
 invalidateDataset(){this.epoch++;this.pending=null;this.invalidate();}
 /** Shared caches may be observed by old and remounted consumers together. */
 useDataset(token:string){if(this.datasetToken===token)return;this.datasetToken=token;this.invalidateDataset();}
 peek():SourceResult|null{return !this.pending&&this.cached&&this.cached.expires>this.now()?this.cached.result:null;}
 read(signal?:AbortSignal):Promise<SourceResult>{
  if(signal?.aborted)return Promise.resolve(unavailable);
  const epoch=this.epoch;
  if(!this.pending&&!this.peek()){
   const pending=Promise.resolve().then(this.load).catch(()=>unavailable).then(result=>{
    if(epoch!==this.epoch)return unavailable;
    const safe:SourceResult=result.status==='loaded'?result:{status:result.status,data:null};
    this.failures=safe.status==='loaded'?0:Math.min(this.failures+1,3);
    const ttl=safe.status==='loaded'?SOURCE_SUCCESS_TTL_MS:Math.min(SOURCE_FAILURE_RETRY_MS*2**(this.failures-1),SOURCE_FAILURE_MAX_RETRY_MS);
    this.cached={result:safe,expires:this.now()+ttl};
    return safe;
   }).finally(()=>{if(this.pending===pending)this.pending=null;});
   this.pending=pending;
  }
  const result=(this.pending??Promise.resolve(this.cached!.result)).then(value=>epoch===this.epoch?value:unavailable);
  if(!signal)return result;
  // A page leaving cancels its subscription, not another page's bounded request.
  return new Promise(resolve=>{
   const abort=()=>{signal.removeEventListener('abort',abort);resolve(unavailable)};
   signal.addEventListener('abort',abort,{once:true});
   void result.then(value=>{signal.removeEventListener('abort',abort);resolve(signal.aborted?unavailable:value)});
  });
 }
}
