// Browser-local coordination only. Domain calculation and report validation are injected.
// @ts-expect-error Native Node tests share TypeScript source.
import {validateJson} from './local-decisions.ts';

export type HomeMixTrigger='initial'|'constraint-change'|'explanation'|'compare'|'attach'|'passive';
export type HomeMixIdentity={goalId:string;bindingKey:string;inputKey:string;bundleId:string;revision:number;preparationId:string};
export type HomeMixRequest<Source>={identity:HomeMixIdentity;source:Source};
export type HomeMixAdapter<Source,Report>={
 version:string;
 search:(request:Readonly<HomeMixRequest<Source>>,signal:AbortSignal)=>Promise<unknown>;
 read:(raw:unknown,request:Readonly<HomeMixRequest<Source>>,signal:AbortSignal)=>Report|null|Promise<Report|null>;
};
export type HomeMixState<Report>=
 | {status:'idle';key:null}
 | {status:'queued'|'running';key:string}
 | {status:'ready';key:string;report:Readonly<Report>}
 | {status:'failed';key:string;reason:'invalid-input'|'search-unavailable'|'invalid-report'};
export type HomeMixOutcome<Report>=HomeMixState<Report>|{status:'ignored'|'stale';key:string|null};
export type HomeMixRun<Source>={trigger:HomeMixTrigger;request:HomeMixRequest<Source>;isCurrent:()=>boolean};
type Scheduler={schedule:(callback:()=>void,delayMs:number)=>unknown;cancel:(handle:unknown)=>void};
type Options={debounceMs?:number;maxCached?:number;scheduler?:Scheduler};
const idle={status:'idle' as const,key:null};
const encoder=new TextEncoder();
function canonical(value:unknown):unknown{
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical((value as Record<string,unknown>)[key])]));
 return value;
}
function immutable<T>(value:T):Readonly<T>{
 if(value&&typeof value==='object'){Object.values(value).forEach(immutable);Object.freeze(value);}
 return value;
}
function boundedJson(value:unknown,limit:number){return validateJson(value)&&encoder.encode(JSON.stringify(value)).length<=limit;}
/** Complete canonical content key, not a shortened hash. Never display or persist this internal key. */
export function homeMixRequestKey<Source>(version:string,request:HomeMixRequest<Source>):string{
 if(!version.trim()||version.length>100||!boundedJson(request,256*1024))throw Error('Invalid bounded Home mix source.');
 const id=request.identity;
 if(!id||!['goalId','bindingKey','inputKey','bundleId','preparationId'].every(key=>typeof id[key as keyof HomeMixIdentity]==='string'&&String(id[key as keyof HomeMixIdentity]).trim())||!Number.isSafeInteger(id.revision)||id.revision<1)throw Error('Missing exact Home mix identity.');
 return JSON.stringify(canonical({version,request}));
}
export function createHomeMixOrchestration<Source,Report>(adapter:HomeMixAdapter<Source,Report>,options:Options={}){
 const debounceMs=options.debounceMs??250,maxCached=options.maxCached??12;
 if(!Number.isInteger(debounceMs)||debounceMs<0||debounceMs>2000||!Number.isInteger(maxCached)||maxCached<1||maxCached>24)throw Error('Unsupported Home mix coordination bounds.');
 const clock:Scheduler=options.scheduler??{schedule:(fn,delay)=>setTimeout(fn,delay),cancel:handle=>clearTimeout(handle as ReturnType<typeof setTimeout>)};
 type Settled=Extract<HomeMixState<Report>,{status:'ready'|'failed'}>;
 type Flight={key:string;abort:AbortController;timer:unknown;promise:Promise<HomeMixOutcome<Report>>;settle:(value:HomeMixOutcome<Report>)=>void;current:()=>boolean};
 let state:HomeMixState<Report>=idle,flight:Flight|null=null,disposed=false;
 const listeners=new Set<()=>void>(),cache=new Map<string,Settled>();
 const publish=(next:HomeMixState<Report>)=>{state=immutable(next);for(const listener of listeners)listener();};
 const stillCurrent=(item:Flight)=>{try{return !disposed&&flight===item&&!item.abort.signal.aborted&&item.current();}catch{return false;}};
 const cancel=()=>{const old=flight;flight=null;if(old){clock.cancel(old.timer);old.abort.abort();old.settle({status:'stale',key:old.key});}};
 const remember=(next:Settled)=>{cache.delete(next.key);cache.set(next.key,next);while(cache.size>maxCached)cache.delete(cache.keys().next().value!);};
 function finish(item:Flight,next:Settled){
  if(!stillCurrent(item)){if(flight===item){cancel();publish(idle);}return;}
  const frozen=immutable(next);remember(frozen);flight=null;publish(frozen);item.settle(frozen);
 }
 async function execute(item:Flight,request:HomeMixRequest<Source>){
  if(!stillCurrent(item)){if(flight===item){cancel();publish(idle);}return;}
  publish({status:'running',key:item.key});
  try{
   const raw=await adapter.search(request,item.abort.signal);
   if(!stillCurrent(item)){if(flight===item){cancel();publish(idle);}return;}
   const report=await adapter.read(raw,request,item.abort.signal);
   if(report===null||!boundedJson(report,2*1024*1024)){finish(item,{status:'failed',key:item.key,reason:'invalid-report'});return;}
   finish(item,{status:'ready',key:item.key,report:immutable(structuredClone(report))});
  }catch{finish(item,{status:'failed',key:item.key,reason:'search-unavailable'});}
 }
 return {
  subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
  getSnapshot:()=>state,
  getServerSnapshot:():HomeMixState<Report>=>idle,
  run(args:HomeMixRun<Source>):Promise<HomeMixOutcome<Report>>{
   if(disposed)return Promise.resolve({status:'stale',key:null});
   let key:string;
   try{key=homeMixRequestKey(adapter.version,args.request);}catch{cancel();publish({status:'failed',key:'invalid-input',reason:'invalid-input'});return Promise.resolve(state);}
   let current=false;try{current=args.isCurrent();}catch{/* An unavailable context cannot start work. */}
   if(!current){cancel();publish(idle);return Promise.resolve({status:'stale',key});}
   if(!['initial','constraint-change'].includes(args.trigger)){
    if(state.key!==null&&state.key!==key){cancel();publish(idle);}
    const known=cache.get(key);if(!flight&&known&&state!==known)publish(known);
    return Promise.resolve({status:'ignored',key});
   }
   if(flight?.key===key){flight.current=args.isCurrent;return flight.promise;}
   cancel();
   const cached=cache.get(key);
   if(cached){remember(cached);publish(cached);return Promise.resolve(cached);}
   const request=immutable(structuredClone(args.request));
   let settle!:(value:HomeMixOutcome<Report>)=>void;
   const promise=new Promise<HomeMixOutcome<Report>>(resolve=>{settle=resolve;});
   const item:Flight={key,abort:new AbortController(),timer:null,promise,settle,current:args.isCurrent};
   flight=item;publish({status:'queued',key});
   item.timer=clock.schedule(()=>{void execute(item,request);},args.trigger==='initial'?0:debounceMs);
   return promise;
  },
  invalidate(){cancel();publish(idle);},
  dispose(){cancel();disposed=true;cache.clear();publish(idle);listeners.clear();},
 };
}
