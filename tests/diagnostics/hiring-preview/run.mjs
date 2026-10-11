/** Explicit manual Preview build only. Preparation/import never dispatches a provider request. */
import {readFileSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {unarmedManifest,validateManifest,sourceManifest,runDiagnostic,hash,createGuardedFetch} from './guard.mjs';
import {encodeReceipt} from '../../helpers/swp-preview-receipt-log.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),[mode,file]=process.argv.slice(2);
try{
 if(mode==='--prepare'&&!file)console.log(JSON.stringify(unarmedManifest(root),null,2));
 else if(mode==='--execute-reserved'&&file&&process.argv.length===4){
  const bytes=readFileSync(resolve(file));if(bytes.length>250000||hash(bytes)!==process.env.HIRING_PREVIEW_MANIFEST_SHA256)throw Error('Unbound manifest.');
  const manifest=JSON.parse(bytes);validateManifest(manifest,process.env);
  if(hash(sourceManifest(root))!==hash(manifest.files))throw Error('Source changed.');
  if(process.versions.node.split('.')[0]!=='24'||!process.env.OPENAI_API_KEY)throw Error('Runtime unavailable.');
  for(const [name,version] of [['openai','7.23.0'],['undici','7.30.0']])if(JSON.parse(readFileSync(join(root,'node_modules',name,'package.json'))).version!==version)throw Error('Dependency changed.');
  const output=join(tmpdir(),'pr212-hiring-preview-'+manifest.runId);
  const claim=()=>mkdirSync(output,{mode:0o700});
  const record=(stage,data)=>{const value={stage,...data},fd=openSync(join(output,stage+'.json'),'wx',0o600);try{writeFileSync(fd,JSON.stringify(value)+'\n');fsyncSync(fd);}finally{closeSync(fd);}for(const line of encodeReceipt(manifest.runId+'_'+stage,value))console.log(line);};
  const {default:OpenAI}=await import('openai'),{toResponseInputItems}=await import('openai/lib/responses/ResponseInputItems'),{openAIProxyTransport}=await import('../../../lib/openai-proxy-transport.ts');
  const transport=openAIProxyTransport(),guardedFetch=createGuardedFetch(transport.fetch??globalThis.fetch);
  const client=new OpenAI({...transport,baseURL:'https://api.openai.com/v1',fetch:guardedFetch,apiKey:process.env.OPENAI_API_KEY,maxRetries:0,logLevel:'off'});
  const result=await runDiagnostic({manifest,env:process.env,client,claim,record,items:response=>toResponseInputItems(response.output)});
  if(result.completed){const blank=join(root,'.hiring-preview-empty');mkdirSync(blank,{mode:0o700});writeFileSync(join(blank,'index.html'),'<!doctype html><html><head><title></title></head><body></body></html>',{flag:'wx',mode:0o600});}
  process.exitCode=result.completed?0:1;
 }else throw Error('Use --prepare or --execute-reserved MANIFEST.');
}catch{console.error('HIRING_PREVIEW_STOP: execution gates failed; no automatic retry. Retain any recorded reservation.');process.exitCode=1;}
