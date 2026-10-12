/** Local verifier and real SDK with fake transport; no real credentials or live claims. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {stage} from './verification-diagnostics.mjs';
import {verifyLocalClaims} from './verification-claim.mjs';
import {claimStore} from './claim-store.mjs';
import {assertPaidClaim} from './claim.mjs';
import {compileVerification} from './verification-bundle.mjs';
const env={SUPABASE_URL:'https://'+claimStore.project+'.supabase.co',SUPABASE_SECRET_KEY:'offline-only-not-a-credential'};
const client=fetch=>createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch}});
const duplicate=(status=409,code='23505')=>new Response(JSON.stringify({code,message:'UNTRUSTED_ERROR_CONTENT',details:'UNTRUSTED_ERROR_CONTENT'}),{status,headers:{'content-type':'application/json'}});
test('only acknowledged insert plus HTTP 409/SQLSTATE 23505 establishes verification',async()=>{
 let writes=0;const receipt=await verifyLocalClaims(client(async(_url,init)=>{writes++;const row=JSON.parse(init.body);assert.equal(row.run_id,claimStore.verificationRun);assert.equal(row.claim_kind,'provider_free');assert.equal(row.deployment_id,null);assert.equal(row.reservation_id,null);assert.equal(row.reserved_microusd,0);return writes===1?new Response(null,{status:201}):duplicate();}),env);
 assert.equal(writes,2);assert.equal(receipt.duplicatesRefused,1);assert.equal(receipt.duplicateSqlstate,'23505');assert.equal(receipt.execution,'local');assert.throws(()=>assertPaidClaim(receipt));assert.equal(JSON.stringify(receipt).includes('UNTRUSTED'),false);
});
test('network/permission/other-conflict/rate-limit/ambiguous responses never count as duplicates or leak content',async()=>{
 for(const make of [()=>{throw Error('UNTRUSTED_ERROR_CONTENT');},()=>duplicate(401,'28000'),()=>duplicate(403,'42501'),()=>duplicate(409,'23514'),()=>duplicate(503,'23505'),()=>duplicate(429,'23505'),()=>duplicate(409,'23505-extra'),()=>new Response(null,{status:201})]){
  let writes=0;await assert.rejects(verifyLocalClaims(client(async()=>{writes++;return writes===1?new Response(null,{status:201}):make();}),env),error=>error.message==='Verification not established; retain records');assert.equal(writes,2);
 }
 let writes=0;await assert.rejects(verifyLocalClaims(client(async()=>{writes++;return duplicate();}),env),/not established/);assert.equal(writes,2,'Consumed verification is not reset or accepted');
});
test('wrong target and any Vercel execution identity refuse before database I/O',async()=>{
 let writes=0;const c=client(async()=>{writes++;return new Response(null,{status:201});});
 for(const patch of [{SUPABASE_URL:'https://wrong.supabase.co'},{SUPABASE_SECRET_KEY:''},{VERCEL:'1'},{VERCEL_ENV:'preview'},{VERCEL_DEPLOYMENT_ID:'dpl_fake'}])await assert.rejects(verifyLocalClaims(c,{...env,...patch}));assert.equal(writes,0);
 assert.throws(()=>execFileSync(process.execPath,['tests/diagnostics/conversation-preview/verify-claim.mjs','--verify-provider-free'],{stdio:'pipe'}),error=>error.status===1);
});
test('separate compiled entry uses existing server client locally, exports no paid entry and contains no paid/OpenAI dependencies',async()=>{
 const output=mkdtempSync(join(tmpdir(),'offline-local-claim-')),file=await compileVerification(process.cwd(),output),source=readFileSync(file,'utf8');
 assert.doesNotMatch(source,/45dc0c92-13b7-41c8-985e-9da7acb628f0|d9f663b2-0556-4d76-9e20-aaa550041cec|__conversationPreviewControl|api\.openai\.com|home-solution-conversation\/route/);
 const entry=createRequire(import.meta.url)(file);assert.deepEqual(Object.keys(entry).sort(),['preflightLocalClaim','verifyLocalClaim']);
 const keys=['SUPABASE_URL','SUPABASE_SECRET_KEY','VERCEL','VERCEL_ENV','VERCEL_DEPLOYMENT_ID'],saved=Object.fromEntries(keys.map(k=>[k,process.env[k]])),fetch=globalThis.fetch;
 try{
  for(const k of keys)delete process.env[k];Object.assign(process.env,env);let writes=0;
  globalThis.fetch=async(url,init)=>{assert.equal(String(url),env.SUPABASE_URL+'/rest/v1/'+claimStore.table);assert.equal(init.method,'POST');writes++;return writes===1?new Response(null,{status:201}):duplicate();};
  const stages=[];const preflight=await entry.preflightLocalClaim(process.env,code=>stages.push(code));assert.equal(preflight.claims,0);assert.equal(writes,0);assert.deepEqual(stages,['CONTEXT','CLIENT','READY','PRECHECK_OK']);
  const receipt=await entry.verifyLocalClaim(process.env);assert.equal(writes,2);assert.equal(receipt.paidAdmission,false);assert.equal(receipt.execution,'local');assert.throws(()=>assertPaidClaim(receipt));
 }finally{globalThis.fetch=fetch;for(const [k,v] of Object.entries(saved))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});

test('diagnostic allowlist and response classes never include raw payloads',async()=>{
 const seen=[];stage(code=>seen.push(code),'UNTRUSTED_ERROR_CONTENT');assert.deepEqual(seen,[]);
 for(const [status,code,expected] of [[401,'28000','ACCESS'],[403,'42501','ACCESS'],[400,'23514','CONSTRAINT'],[503,'XX000','RESPONSE']]){
  const stages=[];await assert.rejects(verifyLocalClaims(client(async()=>duplicate(status,code)),env,c=>stages.push(c)));
  assert.ok(stages.includes(expected));assert.equal(JSON.stringify(stages).includes('UNTRUSTED'),false);
 }
 const stages=[];await assert.rejects(verifyLocalClaims(client(async()=>{throw Error('UNTRUSTED_ERROR_CONTENT');}),env,c=>stages.push(c)));assert.ok(stages.includes('TRANSPORT'));
});
test('CLI dry preflight initializes configured client without dispatch or insert stages; configuration failures stay fixed',()=>{
 const local={...process.env,...env};for(const key of ['VERCEL','VERCEL_ENV','VERCEL_DEPLOYMENT_ID'])delete local[key];
 const command=['tests/diagnostics/conversation-preview/verify-claim.mjs','--preflight-local-no-inserts'];
 const result=JSON.parse(execFileSync(process.execPath,command,{env:local,encoding:'utf8'}));
 assert.deepEqual(result.stages,['CONFIG','COMPILE','IMPORT','CONTEXT','CLIENT','READY','PRECHECK_OK']);assert.equal(result.receipt.claims,0);
 assert.throws(()=>execFileSync(process.execPath,command,{env:{...local,SUPABASE_SECRET_KEY:''},stdio:'pipe'}),error=>{
  assert.deepEqual(JSON.parse(error.stderr.toString()),{code:'CLAIM_VERIFICATION_STOP',stages:['CONFIG']});return true;
 });
});
