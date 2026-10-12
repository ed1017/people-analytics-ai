/** Local, provider-free verification only. No paid configuration or admission imports. */
import {stage} from './verification-diagnostics.mjs';
import {claimStore,verifyStoreTarget} from './claim-store.mjs';
export function verifyLocalTarget(env){
 verifyStoreTarget(env);
 if(env.VERCEL||env.VERCEL_ENV||env.VERCEL_DEPLOYMENT_ID)throw Error('Local verification required');
}
async function contender(client,report){
 stage(report,'INSERT_BUILD');
 let waiting=false;
 const signal=AbortSignal.timeout(claimStore.timeoutMs);
 try{
  const operation=client.schema('public').from(claimStore.table).insert({run_id:claimStore.verificationRun,claim_kind:'provider_free',reservation_id:null,manifest_sha256:null,overlay_commit:null,deployment_id:null,project_id:claimStore.projectId,ledger_receipt_sha256:null,reserved_microusd:0}).retry(false).abortSignal(signal);
  waiting=true;stage(report,'INSERT_WAIT');
  const result=await Promise.race([operation,new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('Verification deadline')),{once:true}))]);
  signal.throwIfAborted();
  if(result?.status===201&&result.error===null&&result.data===null){stage(report,'INSERTED');return 'inserted';}
  if(result?.status===409&&result.error?.code==='23505'&&result.data===null){stage(report,'DUPLICATE');return 'duplicate';}
  stage(report,result?.status===0?'TRANSPORT':[401,403].includes(result?.status)?'ACCESS':['23514','23502','23503'].includes(result?.error?.code)?'CONSTRAINT':'RESPONSE');
 }catch{stage(report,waiting?'TRANSPORT':'INSERT_BUILD');throw Error('Verification transport or database failure');}
 throw Error('Verification response not recognized');
}
export async function verifyLocalClaims(client,env,report){
 verifyLocalTarget(env);
 // Both finish before reporting. A rejected contender is never counted as a duplicate.
 const results=await Promise.allSettled([contender(client,report),contender(client,report)]);
 stage(report,'VERIFY');
 if(results.some(r=>r.status!=='fulfilled')||results.filter(r=>r.value==='inserted').length!==1||results.filter(r=>r.value==='duplicate').length!==1)throw Error('Verification not established; retain records');
 stage(report,'VERIFIED');
 return Object.freeze({kind:'provider_free',execution:'local',claims:1,duplicatesRefused:1,duplicateSqlstate:'23505',paidAdmission:false,providerCalls:0,verificationRecordRetained:true});
}
