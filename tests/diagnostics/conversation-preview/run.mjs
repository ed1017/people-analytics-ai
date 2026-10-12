/** Explicit one-shot manual Preview build; imports/prepare mode never dispatch. */
import {readFileSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {unarmedManifest,validateManifest,sourceManifest,createControl,hash} from './guard.mjs';
import {binding,application,limits,question} from './config.mjs';
import {encodeReceipt} from '../../helpers/swp-preview-receipt-log.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),[mode,file]=process.argv.slice(2);
const clean=value=>JSON.stringify(value).replace(/(?:sk-[A-Za-z0-9_-]{8,}|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]+|Bearer\s+\S+)/gi,'[REDACTED]');
try{
 if(mode==='--prepare'&&!file)console.log(JSON.stringify(unarmedManifest(root),null,2));
 else if(mode==='--execute-reserved'&&file&&process.argv.length===4){
  const bytes=readFileSync(resolve(file));if(bytes.length>250000||hash(bytes)!==process.env.CONVERSATION_PREVIEW_MANIFEST_SHA256)throw Error('Unbound manifest');
  const manifest=JSON.parse(bytes);validateManifest(manifest,process.env);
  if(hash(sourceManifest(root))!==hash(manifest.files))throw Error('Source changed');
  if(process.versions.node.split('.')[0]!=='24'||!process.env.OPENAI_API_KEY)throw Error('Runtime unavailable');
  for(const [name,version] of [['openai','7.23.0'],['undici','7.30.0'],['next','16.3.6']])if(JSON.parse(readFileSync(join(root,'node_modules',name,'package.json'))).version!==version)throw Error('Dependency changed');
  // Atomic mkdir refuses duplicates/restarts within this build filesystem.
  // Across fresh builds the mandatory parent/operator one-build limit owns admission.
  const output=join(tmpdir(),'conversation-preview-'+binding.runId);mkdirSync(output,{mode:0o700});
  const record=(stage,data)=>{const value={stage,...data},serialized=clean(value);if(Buffer.byteLength(serialized)>900000)throw Error('Receipt bounds');const fd=openSync(join(output,stage+'.json'),'wx',0o600);try{writeFileSync(fd,serialized+'\n');fsyncSync(fd);}finally{closeSync(fd);}for(const line of encodeReceipt(binding.runId+'_'+stage,JSON.parse(serialized)))console.log(line);};
  record('claimed',{application,overlayCommit:manifest.overlayCommit,...binding,deploymentId:process.env.VERCEL_DEPLOYMENT_ID,manifestSha256:hash(bytes),reservedMicrousd:limits.reservedMicrousd});
  const control=createControl(record,()=>{if(hash(bytes)!==process.env.CONVERSATION_PREVIEW_MANIFEST_SHA256)throw Error('Manifest changed');validateManifest(manifest,process.env);});globalThis.__conversationPreviewControl=control;
  try{
   const {compileRoute}=await import('./bundle.mjs');
   const modulePath=await compileRoute(root,join(output,'compiled')),{prepareRequest,POST}=createRequire(import.meta.url)(modulePath);
   const body=await prepareRequest();if(body.message?.text!==question||body.requestId!==binding.runId)throw Error('Request identity');
   record('prepared',{requestSha256:hash(body),evidenceSha256:hash(body.evidence),scope:body.scope,timeZone:body.timeZone,sourceCount:body.evidence.sources.length});
   const response=await POST(new Request('http://local.invalid/api/home-solution-conversation',{method:'POST',headers:{'content-type':'application/json','x-workforce-dataset':'legacy-v1:0'},body:JSON.stringify(body)}));
   const reply=await response.json();control.stop();
   if(response.status!==200||!control.calls||reply.usage?.modelRounds!==control.calls||reply.usage?.toolCalls>limits.localOperations)throw Error('Route incomplete');
   // Restricted, chunked test receipt for independent answer/UI review. No raw source packet,
   // provider reasoning, credentials or pre-dispatch prompts are copied to runtime logs.
   record('completed',{application,runId:binding.runId,reservationId:binding.reservationId,attempts:control.calls,wireAttempts:control.wires,reply,semanticReview:'pending',browserAcceptance:false,fullAcceptance:false,retainedMicrousd:limits.reservedMicrousd});
   const blank=join(root,'.conversation-preview-empty');mkdirSync(blank,{mode:0o700});writeFileSync(join(blank,'index.html'),'<!doctype html><html><head><title></title></head><body></body></html>',{flag:'wx',mode:0o600});
  }catch{control.stop();record('stopped',{attempts:control.calls,wireAttempts:control.wires,code:'test_incomplete',retainedMicrousd:limits.reservedMicrousd,fullAcceptance:false});process.exitCode=1;}
  finally{delete globalThis.__conversationPreviewControl;}
 }else throw Error('Use --prepare or --execute-reserved MANIFEST');
}catch{console.error('CONVERSATION_PREVIEW_STOP: execution gates failed; no automatic retry. Retain the reservation.');process.exitCode=1;}
