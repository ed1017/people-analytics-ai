/** Server-only private preview binding. No live client or persisted selection. */
import {constants} from 'node:fs';
import {open} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {create9037OfflineProvider,OFFLINE_9037_INTEGRITY_DIGEST} from './dataset-9037-offline-provider.mjs';
import {create9037CompanyAnalytics} from './dataset-9037-company-analytics.mjs';
import {DatasetRouter} from './dataset-router.mjs';
import {createLocalDatasetIntegration} from './dataset-local-integration.mjs';
import {preview9037RequestAllowed} from './dataset-9037-preview-options.mjs';
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
export async function load9037PreviewBinding(options){
 const directory=path.join(process.cwd(),'.private-9037');
 const pins={
 'integrity-manifest.json':'353528c6f453e7ee06ac54726f2b296973f4b45eb88d150c193a993dce8f3c2a',
 'component-contracts.json':'ba29514659f15c49aee237fb362ab37bc8c6760f6a692999c397933620bea460',
 'components.json':'3bd40d5c0a896991caacbd5352fa03d8b82a3efde3bf9b5183b29905acd1f8a5',
 'joint-dashboard.json':'e792ecbe35892281931e9841ac13069f3b2ad5cca059c377c5c284a5c34c8c1c',
 'captured-62-queries.json':'1eff2d99b0ef7219640ec7c00af17d4c3b161b29c146c5347a191cd094844d72'};
 const component=async name=>{must(Object.hasOwn(pins,name),'Unallowlisted artifact');const bytes=await bounded(path.join(directory,name),3*1024*1024);must(hash(bytes)===pins[name],'Preview artifact pin mismatch');return bytes;};
 const provider=create9037OfflineProvider({expectedIntegrityDigest:OFFLINE_9037_INTEGRITY_DIGEST,
  integrityBytes:await component('integrity-manifest.json'),contractBytes:await component('component-contracts.json'),componentBytes:await component('components.json')});
 const analytics=await create9037CompanyAnalytics({provider,aggregateBytes:await component('captured-62-queries.json'),expectedAggregateDigest:pins['captured-62-queries.json'],jointBytes:await component('joint-dashboard.json')});
 const selected=Object.freeze({datasetId:provider.datasetId,digest:provider.digest,generation:1});
 const router=new DatasetRouter({[provider.datasetId]:provider},{read:async()=>selected,compareAndSwap:async()=>false});
 const integration=createLocalDatasetIntegration({router,candidateDatasetId:provider.datasetId,candidateProvider:provider,analytics});
 return Object.freeze({router,handle:request=>{
  if(!preview9037RequestAllowed(options,request))return Promise.resolve(Response.json({error:'Preview request unavailable.'},{status:503}));
  return integration.handle(request);
 }});
}
