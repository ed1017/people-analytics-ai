/** Manual protected Preview BUILD only; no package hook, route or automatic launch. */
import {readFileSync,mkdirSync,writeFileSync,openSync,closeSync,fsyncSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {sourceManifest,unarmedManifest,sha256,validateManifest,runAcceptance,safeFailure,apiBase} from '../helpers/swp-preview-acceptance.mjs';
import {encodeReceipt} from '../helpers/swp-preview-receipt-log.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),[mode,argument]=process.argv.slice(2);
if(mode==='--prepare'&&!argument){console.log(JSON.stringify(unarmedManifest(root),null,2));}
else if(mode==='--execute-reserved-batch'&&argument&&process.argv.length===4){try{
 const bytes=readFileSync(resolve(argument));if(bytes.length>200000||sha256(bytes)!==process.env.SOLUTION_ACCEPTANCE_MANIFEST_SHA256)throw Error('Unbound manifest.');const manifest=JSON.parse(bytes);validateManifest(manifest,process.env);
 if(JSON.stringify(sourceManifest(root))!==JSON.stringify(manifest.files))throw Error('Source changed.');if(process.versions.node.split('.')[0]!=='24'||!process.env.OPENAI_API_KEY)throw Error('Runtime unavailable.');
 if(JSON.parse(readFileSync(join(root,'node_modules/openai/package.json'))).version!=='7.23.0'||JSON.parse(readFileSync(join(root,'node_modules/undici/package.json'))).version!=='7.30.0')throw Error('Dependencies changed.');
 const output=join(tmpdir(),'swp-preview-acceptance-'+manifest.runId),claim=()=>mkdirSync(output,{mode:0o700}),record=(stage,value)=>{const text=JSON.stringify({stage,...value})+'\n',fd=openSync(join(output,stage+'.json'),'wx',0o600);try{writeFileSync(fd,text);fsyncSync(fd);}finally{closeSync(fd);}for(const line of encodeReceipt(manifest.runId+'_'+stage,JSON.parse(text)))console.log(line);};
 const {default:OpenAI}=await import('openai');
 // Restrict this one SDK transport to the two reviewed provider endpoints. Never alter global networking.
 const {openAIProxyTransport}=await import('../../lib/openai-proxy-transport.ts'),transport=openAIProxyTransport(),baseFetch=transport.fetch??globalThis.fetch;
 const guardedFetch=async(input,init)=>{const url=new URL(typeof input==='string'||input instanceof URL?input:input.url),method=init?.method??(typeof input==='object'&&'method' in input?input.method:'GET');if(url.origin!=='https://api.openai.com'||!['/v1/responses','/v1/responses/input_tokens'].includes(url.pathname)||url.search||method!=='POST')throw Error('Transport destination is outside the reviewed scope.');return baseFetch(input,{...init,redirect:'error'});};
 const client=new OpenAI({...transport,baseURL:apiBase,fetch:guardedFetch,apiKey:process.env.OPENAI_API_KEY,maxRetries:0,logLevel:'off'});
 const report=await runAcceptance({manifest,env:process.env,client,claim,record});if(report.executionComplete){const path=join(root,'.swp-preview-acceptance-empty');mkdirSync(path,{mode:0o700});writeFileSync(join(path,'index.html'),'<!doctype html><html><head><title></title></head><body></body></html>\n',{flag:'wx',mode:0o600});}process.exitCode=report.executionComplete?0:1;
}catch(e){console.log('SWP_ACCEPTANCE_STOP '+JSON.stringify(safeFailure(e)));process.exitCode=1;}}
else{console.error('Use --prepare or --execute-reserved-batch MANIFEST.');process.exitCode=1;}
