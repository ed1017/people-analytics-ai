export {development9037Options} from './dataset-9037-development-options.mjs';
/** Explicit loopback development binding. Never selected by a request or production env. */
import {constants} from 'node:fs';
import {open} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {create9037OfflineProvider,OFFLINE_9037_INTEGRITY_DIGEST} from './dataset-9037-offline-provider.mjs';
import {create9037CompanyAnalytics} from './dataset-9037-company-analytics.mjs';
import {DatasetRouter} from './dataset-router.mjs';
import {createLocalDatasetIntegration} from './dataset-local-integration.mjs';
import {exact} from './dataset-demo-contracts.mjs';
const must=(v,m)=>{if(!v)throw Error(m);};
const hash=b=>createHash('sha256').update(b).digest('hex');
const canonical=p=>typeof p==='string'&&path.isAbsolute(p)&&path.normalize(p)===p;
async function bounded(file,limit){
 must(canonical(file),'Absolute canonical local artifact path required');
 const handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
 try {const stat=await handle.stat();must(stat.isFile()&&stat.size>0&&stat.size<=limit,'Bounded regular artifact required');
  const buffer=Buffer.alloc(limit+1);let length=0;
  while(length<buffer.length){const {bytesRead}=await handle.read(buffer,length,buffer.length-length,null);if(!bytesRead)break;length+=bytesRead;}
  must(length===stat.size&&length<=limit,'Artifact changed or exceeded limit');return buffer.subarray(0,length);
 }finally{await handle.close();}
}
export function isLoopback9037Request(request){
 if(!request)return false;
 try{return ['127.0.0.1','localhost','[::1]'].includes(new URL(request.url).hostname);}catch{return false;}
}
export async function load9037DevelopmentBinding(options){
 const bytes=await bounded(options.file,16384);must(hash(bytes)===options.pin,'Local configuration pin mismatch');
 const config=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 must(exact(config,['componentDirectory','capturePath','captureDigest','jointPath'])&&canonical(config.componentDirectory)&&/^[a-f0-9]{64}$/.test(config.captureDigest),'Explicit local artifact configuration required');
 const component=async name=>bounded(path.join(config.componentDirectory,name),2*1024*1024);
 const provider=create9037OfflineProvider({expectedIntegrityDigest:OFFLINE_9037_INTEGRITY_DIGEST,
  integrityBytes:await component('integrity-manifest.json'),contractBytes:await component('component-contracts.json'),componentBytes:await component('components.json')});
 const analytics=await create9037CompanyAnalytics({provider,aggregateBytes:await bounded(config.capturePath,16*1024*1024),expectedAggregateDigest:config.captureDigest,jointBytes:await bounded(config.jointPath,2*1024*1024)});
 const selected=Object.freeze({datasetId:provider.datasetId,digest:provider.digest,generation:1});
 const router=new DatasetRouter({[provider.datasetId]:provider},{read:async()=>selected,compareAndSwap:async()=>false});
 const integration=createLocalDatasetIntegration({router,candidateDatasetId:provider.datasetId,candidateProvider:provider,analytics});
 return Object.freeze({router,handle:request=>{
  if(!isLoopback9037Request(request))return Promise.resolve(Response.json({error:'Local candidate requires loopback.'},{status:503}));
  return integration.handle(request);
 }});
}
