import {homeDefinitions,readHomeSource} from './home-pack.mjs';
// @ts-expect-error Native Node tests share TypeScript source.
import {SourceRequests,type SourceResult} from './source-request-cache.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {surveyRequests} from './survey-source-client.ts';

const remoteKeys=[...new Set(homeDefinitions.map(def=>def[1]))].filter(key=>!['catalogue','development'].includes(key));
export function sameHomeSourceResults(left:Record<string,unknown>,right:Record<string,unknown>){
 return Object.keys(left).length===Object.keys(right).length&&Object.keys(right).every(key=>left[key]===right[key]);
}

/** Per-source freshness prevents a failed bundle from masking another page's recovery. */
export class HomeSourceRequests {
 private sources=new Map<string,SourceRequests>();
 private load:(url:string)=>Promise<SourceResult>;
 private survey:SourceRequests;
 private now:()=>number;
 constructor(load=(url:string)=>readHomeSource(url,undefined),survey=surveyRequests,now=()=>Date.now()){
  this.load=load;this.survey=survey;this.now=now;
 }
 private source(key:string,query:string){
  if(key==='survey-sentiment')return this.survey;
  const url='/api/'+key+(key==='dashboard'?query:'');
  let source=this.sources.get(url);
  if(!source){source=new SourceRequests(()=>this.load(url),this.now);this.sources.set(url,source);}
  return source;
 }
 peek(query:string):Record<string,SourceResult>|null{
  const results:Record<string,SourceResult>={};
  for(const key of remoteKeys){const result=this.source(key,query).peek();if(!result)return null;results[key]=result;}
  return results;
 }
 async read(query:string,signal?:AbortSignal):Promise<Record<string,SourceResult>>{
  return Object.fromEntries(await Promise.all(remoteKeys.map(async key=>[key,await this.source(key,query).read(signal)])));
 }
 invalidate(query:string){for(const key of remoteKeys)this.source(key,query).invalidate();}
}
