/** Shared store identity only: no paid allocation, admission capability, client or I/O. */
export const claimStore=Object.freeze({project:'noykvmztefmmhyuwuppv',table:'conversation_preview_claims',verificationRun:'6f98085e-f9be-40bf-a8a7-d46a2e538120',projectId:'prj_qXEE4BF4KrbTbzFvDg8dc3MJQjDF',timeoutMs:10000});
export function verifyStoreTarget(env){
 let url;try{url=new URL(env.SUPABASE_URL);}catch{throw Error('Claim store unavailable');}
 if(url.protocol!=='https:'||url.hostname!==claimStore.project+'.supabase.co'||url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash||!env.SUPABASE_SECRET_KEY)throw Error('Claim store unavailable');
}
