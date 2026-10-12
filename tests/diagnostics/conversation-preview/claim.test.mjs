/** Real installed Supabase SDK, synthetic credentials and intercepted transport only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {application,applicationTree,branch,question,binding,limits,model} from './config.mjs';
import {hash,createControl} from './guard.mjs';
import {claimPaidRun,assertPaidClaim} from './claim.mjs';
import {claimStore} from './claim-store.mjs';
import {verifyLocalClaims} from './verification-claim.mjs';
function armed(){
 const now=Date.now(),sha='a'.repeat(40),manifest={version:1,kind:'conversation-deadline-one-shot',application,applicationTree,branch,questionSha256:hash(question),binding,limits,model,overlayCommit:sha,reviewerGo:true,parentRelease:true,reviewReceiptSha256:'b'.repeat(64),createdAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+60000).toISOString()};
 const env={SUPABASE_URL:'https://'+claimStore.project+'.supabase.co',SUPABASE_SECRET_KEY:'offline-only-not-a-credential',VERCEL:'1',VERCEL_ENV:'preview',VERCEL_PROJECT_ID:binding.projectId,VERCEL_GIT_COMMIT_REF:branch,VERCEL_GIT_COMMIT_SHA:sha,CONVERSATION_PREVIEW_RUN_ID:binding.runId,CONVERSATION_PREVIEW_MANIFEST_SHA256:'c'.repeat(64),VERCEL_DEPLOYMENT_ID:'dpl_offline',NEXT_PUBLIC_HOME_SOLUTION_CONVERSATION:'true',NEXT_PUBLIC_GOAL_PROGRESS:'true'};
 return {manifest,env};
}
function client(fetch){return createClient('https://'+claimStore.project+'.supabase.co','offline-only-not-a-credential',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch}});}
const duplicate=()=>new Response(JSON.stringify({code:'23505',message:'offline duplicate'}),{status:409,headers:{'content-type':'application/json'}});
function store(){const rows=new Map(),calls=[];return {rows,calls,fetch:async(url,init)=>{
 assert.equal(String(url),'https://'+claimStore.project+'.supabase.co/rest/v1/'+claimStore.table);assert.equal(init.method,'POST');
 const headers=new Headers(init.headers);assert.equal(headers.get('content-profile'),'public');assert.equal(headers.get('prefer')?.includes('return=representation')??false,false);assert.equal(headers.get('prefer')?.includes('resolution=')??false,false);
 const row=JSON.parse(init.body);calls.push(row);if(rows.has(row.run_id))return duplicate();rows.set(row.run_id,row);return new Response(null,{status:201});
 }};}
test('one acknowledged paid INSERT admits; a fresh client/process equivalent cannot reclaim the durable row',async()=>{
 const db=store(),{manifest,env}=armed(),admission=await claimPaidRun(client(db.fetch),manifest,env);assertPaidClaim(admission);
 assert.equal(db.rows.get(binding.runId).reserved_microusd,23430000);assert.equal(db.rows.get(binding.runId).manifest_sha256,env.CONVERSATION_PREVIEW_MANIFEST_SHA256);
 await assert.rejects(claimPaidRun(client(db.fetch),manifest,env),/claim_unavailable_or_consumed/);assert.equal(db.rows.size,1);assert.equal(db.calls.length,2);
 assert.throws(()=>assertPaidClaim({...admission}));assert.throws(()=>assertPaidClaim({kind:'paid',runId:binding.runId}));
});
test('parallel independent clients have exactly one admitted winner',async()=>{
 const db=store(),{manifest,env}=armed(),attempts=await Promise.allSettled([claimPaidRun(client(db.fetch),manifest,env),claimPaidRun(client(db.fetch),manifest,{...env,VERCEL_DEPLOYMENT_ID:'dpl_other'})]);
 assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);assert.equal(db.rows.size,1);assert.equal(db.calls.length,2);
});
test('verification record neither consumes paid allocation nor creates paid admission',async()=>{
 const db=store(),{manifest,env}=armed(),local={SUPABASE_URL:env.SUPABASE_URL,SUPABASE_SECRET_KEY:env.SUPABASE_SECRET_KEY},receipt=await verifyLocalClaims(client(db.fetch),local);
 assert.equal(db.rows.has(binding.runId),false);assert.equal(db.rows.get(claimStore.verificationRun).reservation_id,null);assert.equal(db.rows.get(claimStore.verificationRun).reserved_microusd,0);assert.throws(()=>assertPaidClaim(receipt));
 await assert.rejects(verifyLocalClaims(client(db.fetch),local));
 const control=createControl(()=>{},()=>assertPaidClaim(receipt));let providerCalls=0;
 await assert.rejects(control.dispatch({}, {},()=>{providerCalls++;}));assert.equal(providerCalls,0);assert.equal(control.wires,0);
 // This is solely an offline SDK fixture: the separately keyed paid row can still be inserted.
 assertPaidClaim(await claimPaidRun(client(db.fetch),manifest,env));assert.equal(db.rows.size,2);
});
test('network, permission, rate-limit, server, wrong success and ambiguous outcomes never retry or admit',async()=>{
 for(const status of [401,403,409,429,500,503,520,200,204]){
  const {manifest,env}=armed();let writes=0;
  await assert.rejects(claimPaidRun(client(async()=>{writes++;return new Response(null,{status});}),manifest,env));assert.equal(writes,1,String(status));
 }
 const db=store(),{manifest,env}=armed();let writes=0;
 await assert.rejects(claimPaidRun(client(async(url,init)=>{writes++;await db.fetch(url,init);throw Error('offline acknowledged response lost');}),manifest,env));assert.equal(writes,1);assert.equal(db.rows.has(binding.runId),true);
 await assert.rejects(claimPaidRun(client(db.fetch),manifest,env));assert.equal(db.rows.size,1);
});
test('wrong project/target/release/expired manifest refuses before database I/O; expiry after insert burns claim',async()=>{
 const {manifest,env}=armed(),db=store();
 for(const patch of [{SUPABASE_URL:'https://other.supabase.co'},{SUPABASE_URL:env.SUPABASE_URL+'/evil'},{SUPABASE_SECRET_KEY:''},{VERCEL_ENV:'production'},{VERCEL_PROJECT_ID:'prj_other'}])await assert.rejects(claimPaidRun(client(db.fetch),manifest,{...env,...patch}));
 for(const patch of [{parentRelease:false},{reviewerGo:false},{expiresAt:new Date(Date.now()-1).toISOString()},{binding:{...binding,runId:claimStore.verificationRun}}])await assert.rejects(claimPaidRun(client(db.fetch),{...manifest,...patch},env));
 assert.equal(db.calls.length,0);
 await assert.rejects(claimPaidRun(client(async(url,init)=>{const r=await db.fetch(url,init);manifest.expiresAt=new Date(Date.now()-1).toISOString();return r;}),manifest,env));assert.equal(db.rows.has(binding.runId),true);
});
test('aborted claim fails closed even when a transport returns an apparent success afterwards',async()=>{
 const {manifest,env}=armed();let writes=0;
 await assert.rejects(claimPaidRun(client(async(_url,init)=>{writes++;init.signal.dispatchEvent(new Event('abort'));await new Promise(resolve=>setImmediate(resolve));return new Response(null,{status:201});}),manifest,env));assert.equal(writes,1);
});
