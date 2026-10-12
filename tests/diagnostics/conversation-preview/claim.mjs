/** Durable admission only. Importing this module never reads credentials or dispatches. */
import {binding,limits} from './config.mjs';
import {validateManifest,fail} from './guard.mjs';
export const claimStore=Object.freeze({project:'noykvmztefmmhyuwuppv',table:'conversation_preview_claims',verificationRun:'6f98085e-f9be-40bf-a8a7-d46a2e538120',timeoutMs:10000});
const admissions=new WeakSet();
export function assertPaidClaim(admission){if(!admissions.has(admission))fail('durable_paid_claim_required');}
function verifyStore(env){
 let url;try{url=new URL(env.SUPABASE_URL);}catch{fail('claim_store');}
 if(url.protocol!=='https:'||url.hostname!==claimStore.project+'.supabase.co'||url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!env.SUPABASE_SECRET_KEY)fail('claim_store');
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
export async function claimVerificationRun(client,env){
 verifyStore(env);
 await insertClaim(client,{run_id:claimStore.verificationRun,claim_kind:'provider_free',reservation_id:null,manifest_sha256:null,overlay_commit:null,deployment_id:env.VERCEL_DEPLOYMENT_ID,project_id:binding.projectId,ledger_receipt_sha256:null,reserved_microusd:0});
 // Deliberately not entered in admissions. This receipt can never authorize model use.
 return Object.freeze({kind:'provider_free',runId:claimStore.verificationRun});
}
