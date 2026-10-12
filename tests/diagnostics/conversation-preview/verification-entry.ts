/** Separate local bundle: existing server client only; no POST, paid runner or OpenAI imports. */
import {withDatasetRequest} from '../../../lib/dataset-runtime';
import {verifyLocalClaims,verifyLocalTarget} from './verification-claim.mjs';
export async function verifyLocalClaim(env:NodeJS.ProcessEnv){
 verifyLocalTarget(env);
 let receipt:Awaited<ReturnType<typeof verifyLocalClaims>>|undefined;
 const response=await withDatasetRequest(new Request('http://local.invalid/claim-verification',{headers:{'x-workforce-dataset':'legacy-v1:0'}}),async()=>{
  const {supabaseServer}=await import('../../../lib/supabase-server');
  receipt=await verifyLocalClaims(supabaseServer,env);return Response.json({verified:true});
 });
 if(!response.ok||!receipt)throw Error('Verification context unavailable');return receipt;
}
