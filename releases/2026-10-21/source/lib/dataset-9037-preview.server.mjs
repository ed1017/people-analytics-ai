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
 'integrity-manifest.json':'7040ae990b861bf98d8ec079d418e89a7f161112068c5dd5f440caa4eae69d67',
 'component-contracts.json':'507773759a2d7f8e32315cd395c07899e01970e02fc363ba89c5c1d581628b07',
 'components.json':'ed11db49b3090bebe5ac08ab48accdcbf4e754fedfdbe962937128aafd1767b3',
 'joint-dashboard.json':'45bb295e801d710873aac762c76e7bd272726fcf157a25a249a2558cb6d6b00e',
 'captured-62-queries.json':'cebd938e4380bd2cc97142ec3a5f9c8e4f30c61d2ee37cacf18185a8f7c5d6d7'};
 const component=async name=>{must(Object.hasOwn(pins,name),'Unallowlisted artifact');const bytes=await bounded(path.join(directory,name),3*1024*1024);must(hash(bytes)===pins[name],'Preview artifact pin mismatch');return bytes;};
 const provider=create9037OfflineProvider({expectedIntegrityDigest:OFFLINE_9037_INTEGRITY_DIGEST,
  integrityBytes:await component('integrity-manifest.json'),contractBytes:await component('component-contracts.json'),componentBytes:await component('components.json')});
 const analytics=await create9037CompanyAnalytics({provider,aggregateBytes:await component('captured-62-queries.json'),expectedAggregateDigest:pins['captured-62-queries.json'],jointBytes:await component('joint-dashboard.json')});
 const selected=Object.freeze({datasetId:provider.datasetId,digest:provider.digest,generation:1});
 const router=new DatasetRouter({[provider.datasetId]:provider},{read:async()=>selected,compareAndSwap:async()=>false});
 const integration=createLocalDatasetIntegration({router,candidateDatasetId:provider.datasetId,candidateProvider:provider,analytics});
 return Object.freeze({router,turnoverHistory:filters=>analytics.turnoverHistory(filters),handle:request=>{
  if(!preview9037RequestAllowed(options,request))return Promise.resolve(Response.json({error:'Preview request unavailable.'},{status:503}));
  return integration.handle(request);
 }});
}
