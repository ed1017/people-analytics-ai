/** Explicit provider-free verification. No OpenAI control or paid manifest can be armed here. */
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {compileRoute} from './bundle.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
try{
 if(process.argv.length!==3||process.argv[2]!=='--verify-provider-free')throw Error('Explicit mode required');
 const output=mkdtempSync(join(tmpdir(),'conversation-claim-verification-'));
 const entry=createRequire(import.meta.url)(await compileRoute(root,output));
 // Exactly two explicit contenders for the separate verification UUID, never a retry.
 const attempts=await Promise.allSettled([entry.claimProviderFreePreview(process.env),entry.claimProviderFreePreview(process.env)]);
 const successes=attempts.filter(r=>r.status==='fulfilled');
 if(successes.length!==1||attempts.filter(r=>r.status==='rejected').length!==1)throw Error('Unexpected admission result');
 let rejected=false;try{entry.assertPaidClaim(successes[0].value);}catch{rejected=true;}
 if(!rejected)throw Error('Verification must never admit paid execution');
 console.log(JSON.stringify({kind:'provider_free',claims:1,duplicatesRefused:1,paidAdmission:false,providerCalls:0,verificationRecordRetained:true}));
}catch{console.error('CLAIM_VERIFICATION_STOP: no paid dispatch; retain all records and investigate without reset.');process.exitCode=1;}
