// Explicitly armed, one-deployment Preview BUILD only. No runtime handler is emitted.
import {readFileSync,mkdirSync,writeFileSync,openSync,closeSync,fsyncSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {compileRoute} from './route.mjs';
import {runDiagnostic,apiBase} from './run.mjs';
import {verifySource,readAuthorization,validateAuthorization,validateNodeRuntime,readAggregateVerification} from './guards.mjs';
import {encodeReceipt} from '../tests/helpers/swp-preview-receipt-log.mjs';
import {safeFailure,recordReceipt} from './diagnostics.mjs';
import {createPrivateReview} from './private-review.mjs';
import {sanitize} from './sanitize.mjs';
export {sanitize} from './sanitize.mjs';
export function durableRecorder(directory,runId,knownSecret='',emit=console.log) {
  return (stage,value)=>{
    if(!/^[a-z0-9-]{1,80}$/.test(stage))throw Error('receipt_stage_invalid');
    const receipt=sanitize({stage,...value},knownSecret);
    if(stage.startsWith('replay-')&&receipt.sanitization.redacted)throw Error('replay_payload_requires_redaction');
    const text=JSON.stringify(receipt)+'\n';
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
      boundary.verifyTransport(input,init);
      const response=await dispatch(input,{...init,redirect:'error'});
      return boundary.observeResponse(response);
    }});
}
export function claimRunDirectory(directory){mkdirSync(directory,{mode:0o700});}
async function build() {
  if(process.argv.length!==2)throw Error('no_run_overrides');
  const root=fileURLToPath(new URL('../',import.meta.url)),source=verifySource(root);
  // Absent file means unarmed. The file configures a run; permission lives in the coordinator ledger.
  const {authorization,authorizationSha256}=readAuthorization(root,process.env);
  validateAuthorization(authorization,process.env,source);
  readAggregateVerification(root,authorization,source);
  validateNodeRuntime(process.versions.node);
  for(const [name,version] of [['openai','7.23.0'],['undici','7.30.0'],['next','16.3.6']])
    if(JSON.parse(readFileSync(join(root,'node_modules',name,'package.json'))).version!==version)throw Error('dependencies_changed');
  const directory=join(tmpdir(),'home-action-acceptance-'+authorization.runId);
  claimRunDirectory(directory); // Exclusive on this filesystem; NOT a cross-deployment reservation.
  const compiled=join(directory,'compiled');mkdirSync(compiled,{mode:0o700});
  const code=await compileRoute(root,compiled);
  validateAuthorization(authorization,process.env,source);
  readAggregateVerification(root,authorization,source);
  if(authorization.phase==='model-assessment'&&!process.env.OPENAI_API_KEY)throw Error('preview_key_unavailable');
  const record=durableRecorder(directory,authorization.runId,process.env.OPENAI_API_KEY);
  const privateReview=createPrivateReview({config:authorization.privateReview,knownSecret:process.env.OPENAI_API_KEY,record,
    binding:{runId:authorization.runId,phase:authorization.phase,sourceRootSha256:source.sourceRootSha256,
      reviewedCodeCommit:authorization.reviewedCodeCommit,appCommit:source.baseSource,sourceCommit:process.env.VERCEL_GIT_COMMIT_SHA,
      deploymentId:process.env.VERCEL_DEPLOYMENT_ID,authorizationSha256}});
  recordReceipt(record,'claimed',{authorizationSha256,phase:authorization.phase,sourceRootSha256:source.sourceRootSha256,
    reviewedCodeCommit:authorization.reviewedCodeCommit,aggregateVerificationReceiptSha256:authorization.aggregateVerificationReceiptSha256,
    projectId:process.env.VERCEL_PROJECT_ID,
    sourceCommit:process.env.VERCEL_GIT_COMMIT_SHA,deploymentId:process.env.VERCEL_DEPLOYMENT_ID,
    environment:'preview',coordinatorDispatchPolicy:'one-pinned-create-no-ambiguous-retry',crossBuildExactlyOnce:false});
  const {default:OpenAI}=await import('openai');
  const {openAIProxyTransport}=await import('../lib/openai-proxy-transport.ts');
  const transport=openAIProxyTransport();let boundary;
  const client=authorization.phase==='model-assessment'?createBuildClient({OpenAI,apiKey:process.env.OPENAI_API_KEY,transport,getBoundary:()=>boundary}):null;
  const report=await runDiagnostic({code,client,record,privateReview,runId:authorization.runId,requireWireProof:true,bindBoundary:value=>{boundary=value;},
    phase:authorization.phase,approvedAggregateSha256:authorization.approvedAggregateSha256,aggregateDispatch:globalThis.fetch,
    expiresAt:Date.parse(authorization.expiresAt),
    signal:AbortSignal.timeout(Math.max(0,Date.parse(authorization.expiresAt)-Date.now()))});
  if(!report.executionComplete){process.exitCode=1;return;}
  if(authorization.phase==='aggregate-verification')recordReceipt(record,'aggregate-verified',{
    phase:authorization.phase,sourceRootSha256:source.sourceRootSha256,reviewedCodeCommit:authorization.reviewedCodeCommit,
    verifiedAt:new Date().toISOString(),aggregateVerificationPassed:report.aggregateVerificationPassed,
    generationAttempts:report.generationAttempts,wireAttempts:report.wireAttempts,aggregateReadAttempts:report.aggregate.attempts,
    aggregateSha256:report.aggregate.aggregateSha256,privateReview:report.privateReview,privateCanaryNonceSha256:report.privateCanaryNonceSha256});
  const output=join(root,'.home-action-acceptance-output');mkdirSync(output,{mode:0o700});
  writeFileSync(join(output,'index.html'),'<!doctype html><html><head><title></title></head><body></body></html>\n',{flag:'wx',mode:0o600});
}
if(process.argv[1]===fileURLToPath(import.meta.url))await build().catch(error=>{
  // Never print SDK errors, headers, authorization contents or ambient environment.
  console.error('HOME_ACTION_DIAGNOSTIC_STOP '+JSON.stringify(safeFailure(error)));
  process.exitCode=1;
});
