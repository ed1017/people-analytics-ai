/** Separate local bundle: existing server client only; no POST, paid runner or OpenAI imports. */
import {withDatasetRequest} from '../../../lib/dataset-runtime';
import {verifyLocalClaims,verifyLocalTarget} from './verification-claim.mjs';
import {stage} from './verification-diagnostics.mjs';
type Reporter=(code:string)=>void;
export async function verifyLocalClaim(env:NodeJS.ProcessEnv,report?:Reporter){
 return withClient(env,report,client=>verifyLocalClaims(client,env,report));
}
/** Resolves the actual configured client in context; no insert builder or query execution. */
export async function preflightLocalClaim(env:NodeJS.ProcessEnv,report?:Reporter){
 return withClient(env,report,async client=>{
  if(typeof client.schema('public').from!=='function')throw Error('Client unavailable');
  stage(report,'PRECHECK_OK');
  return {kind:'preflight',paidAdmission:false,providerCalls:0,claims:0};
 });
}
async function withClient<T>(env:NodeJS.ProcessEnv,report:Reporter|undefined,run:(client:typeof import('../../../lib/supabase-server').supabaseServer)=>Promise<T>){
 verifyLocalTarget(env);
 let receipt:T|undefined;
 stage(report,'CONTEXT');
 const response=await withDatasetRequest(new Request('http://local.invalid/claim-verification',{headers:{'x-workforce-dataset':'legacy-v1:0'}}),async()=>{
  stage(report,'CLIENT');
  const {supabaseServer}=await import('../../../lib/supabase-server');
  stage(report,'READY');
  receipt=await run(supabaseServer);return Response.json({verified:true});
 });
 if(!response.ok||!receipt)throw Error('Verification context unavailable');return receipt;
}
