/** Durable admission only. Importing this module never reads credentials or dispatches. */
import {binding,limits} from './config.mjs';
import {validateManifest,fail} from './guard.mjs';
import {claimStore,verifyStoreTarget} from './claim-store.mjs';
const admissions=new WeakSet();
export function assertPaidClaim(admission){if(!admissions.has(admission))fail('durable_paid_claim_required');}
function verifyStore(env){
 verifyStoreTarget(env);
 if(env.VERCEL!=='1'||env.VERCEL_ENV!=='preview'||env.VERCEL_PROJECT_ID!==binding.projectId||!/^dpl_[A-Za-z0-9]{1,100}$/.test(env.VERCEL_DEPLOYMENT_ID??''))fail('claim_preview');
}
async function insertClaim(client,row){
 // Plain INSERT, never upsert or conflict-ignore; no row readback or automatic retry.
 const signal=AbortSignal.timeout(claimStore.timeoutMs);
 try{
  const operation=client.schema('public').from(claimStore.table).insert(row).retry(false).abortSignal(signal);
  const result=await Promise.race([operation,new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('Claim deadline')),{once:true}))]);
  signal.throwIfAborted();
  if(result?.error!==null||result.status!==201||result.data!==null)fail('claim_not_acknowledged');
 }catch{fail('claim_unavailable_or_consumed');}
}
export async function claimPaidRun(client,manifest,env){
 validateManifest(manifest,env);verifyStore(env);
 await insertClaim(client,{run_id:binding.runId,claim_kind:'paid',reservation_id:binding.reservationId,manifest_sha256:env.CONVERSATION_PREVIEW_MANIFEST_SHA256,overlay_commit:manifest.overlayCommit,deployment_id:env.VERCEL_DEPLOYMENT_ID,project_id:binding.projectId,ledger_receipt_sha256:binding.ledgerReceiptSha256,reserved_microusd:limits.reservedMicrousd});
 // Expiry after an acknowledged claim burns the claim; it never unlocks another build.
 validateManifest(manifest,env);
 const admission=Object.freeze({kind:'paid',runId:binding.runId,reservationId:binding.reservationId});
 admissions.add(admission);return admission;
}
