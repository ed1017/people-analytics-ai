// Explicitly armed, one-deployment Preview BUILD only. No runtime handler is emitted.
import {readFileSync,mkdirSync,writeFileSync,openSync,closeSync,fsyncSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {compileRoute} from './route.mjs';
import {runTwoTurns,apiBase} from './run.mjs';
import {verifySource,readAuthorization,validateAuthorization,validateNodeRuntime} from './guards.mjs';
import {encodeReceipt} from '../tests/helpers/swp-preview-receipt-log.mjs';
export function sanitize(value,knownSecret='') {
  let redacted=false;
  const text=JSON.stringify(value,(_key,item)=>{
    if(typeof item!=='string')return item;
    let safe=item.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').replace(/[\x00-\x08\x0b-\x1f\x7f]/g,'')
      .replace(/(?:sk-[A-Za-z0-9_-]{8,}|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]+|Bearer\s+\S+)/gi,'[REDACTED]');
    if(knownSecret)safe=safe.split(knownSecret).join('[REDACTED]');
    redacted ||= safe!==item;return safe;
  });
  return {sanitization:{redacted,truncated:false},receipt:JSON.parse(text)};
}
export function durableRecorder(directory,runId,knownSecret='',emit=console.log) {
  return (stage,value)=>{
    if(!/^[a-z0-9-]{1,80}$/.test(stage))throw Error('receipt_stage_invalid');
    const receipt=sanitize({stage,...value},knownSecret),text=JSON.stringify(receipt)+'\n';
    // Complete local bytes are flushed before emitting reconstructable log chunks.
    const fd=openSync(join(directory,stage+'.json'),'wx',0o600);
    try{writeFileSync(fd,text);fsyncSync(fd);}finally{closeSync(fd);}
    for(const line of encodeReceipt(runId+'_'+stage,receipt))emit(line);
  };
}
export function createBuildClient({OpenAI,apiKey,transport={},dispatch=transport.fetch??globalThis.fetch,getBoundary}) {
  return new OpenAI({...transport,apiKey,adminAPIKey:null,organization:null,project:null,webhookSecret:null,
    baseURL:apiBase,maxRetries:0,logLevel:'off',
    fetch:async(input,init)=>{
      const boundary=getBoundary();if(!boundary)throw Error('transport_not_bound');
      const headers=new Headers(init?.headers);
      // Never record these headers or include mismatched values in an error.
      if(headers.get('authorization')!=='Bearer '+apiKey||headers.has('openai-organization')||headers.has('openai-project')||headers.has('api-key'))
        throw Error('wire_authentication_changed');
      boundary.verifyTransport(input,init);return dispatch(input,{...init,redirect:'error'});
    }});
}
async function build() {
  if(process.argv.length!==2)throw Error('no_run_overrides');
  const root=fileURLToPath(new URL('../',import.meta.url)),source=verifySource(root);
  // Absent file means unarmed. The file configures a run; permission lives in the coordinator ledger.
  const {authorization,authorizationSha256}=readAuthorization(root,process.env);
  validateAuthorization(authorization,process.env,source);
  validateNodeRuntime(process.versions.node);
  for(const [name,version] of [['openai','7.23.0'],['undici','7.30.0'],['next','16.3.6']])
    if(JSON.parse(readFileSync(join(root,'node_modules',name,'package.json'))).version!==version)throw Error('dependencies_changed');
  const directory=join(tmpdir(),'home-natural-acceptance-'+authorization.runId);
  mkdirSync(directory,{mode:0o700}); // Exclusive within this build; NOT a cross-deployment reservation.
  const compiled=join(directory,'compiled');mkdirSync(compiled,{mode:0o700});
  const code=await compileRoute(root,compiled);
  validateAuthorization(authorization,process.env,source);
  if(!process.env.OPENAI_API_KEY)throw Error('preview_key_unavailable');
  const record=durableRecorder(directory,authorization.runId,process.env.OPENAI_API_KEY);
  record('claimed',{authorization,authorizationSha256,source,projectId:process.env.VERCEL_PROJECT_ID,
    sourceCommit:process.env.VERCEL_GIT_COMMIT_SHA,deploymentId:process.env.VERCEL_DEPLOYMENT_ID,
    environment:'preview',coordinatorDispatchPolicy:'one-pinned-create-no-ambiguous-retry',crossBuildExactlyOnce:false});
  const {default:OpenAI}=await import('openai');
  const {openAIProxyTransport}=await import('../lib/openai-proxy-transport.ts');
  const transport=openAIProxyTransport();let boundary;
  const client=createBuildClient({OpenAI,apiKey:process.env.OPENAI_API_KEY,transport,getBoundary:()=>boundary});
  const report=await runTwoTurns({code,client,record,runId:authorization.runId,requireWireProof:true,bindBoundary:value=>{boundary=value;},
    expiresAt:Date.parse(authorization.expiresAt),
    signal:AbortSignal.timeout(Math.max(0,Date.parse(authorization.expiresAt)-Date.now()))});
  if(!report.executionComplete){process.exitCode=1;return;}
  const output=join(root,'.home-natural-acceptance-output');mkdirSync(output,{mode:0o700});
  writeFileSync(join(output,'index.html'),'<!doctype html><html><head><title></title></head><body></body></html>\n',{flag:'wx',mode:0o600});
}
if(process.argv[1]===fileURLToPath(import.meta.url))await build().catch(error=>{
  // Never print SDK errors, headers, authorization contents or ambient environment.
  console.error('HOME_NATURAL_ACCEPTANCE_STOP '+(/^[a-z_]{1,70}$/.test(error?.message??'')?error.message:'preflight_or_receipt_failure'));
  process.exitCode=1;
});
