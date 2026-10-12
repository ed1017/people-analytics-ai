/** Disposable, network-isolated PostgreSQL 17.6. Never connects to Supabase/live data. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {binding} from './config.mjs';
import {claimStore} from './claim-store.mjs';
const image='postgres:17.6@sha256:00bc86618629af00d2937fdc5a5d63db3ff8450acf52f0636ec813c7f4902929';
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
test('exact migration on offline PostgreSQL: restricted ACLs, finite allocations, irreversible claims and concurrent exclusion',async t=>{
 const name='offline-claim-'+randomUUID();
 docker('run','--detach','--rm','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_HOST_AUTH_METHOD=trust',image);
 const sql=q=>execFileSync('docker',['exec','-i',name,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1','-At'],{input:q,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 const parallel=q=>new Promise(resolve=>{const p=spawn('docker',['exec','-i',name,'psql','-X','-U','postgres','-v','ON_ERROR_STOP=1','-At'],{stdio:['pipe','pipe','pipe']});let error='';p.stderr.on('data',s=>{error+=s;});p.stdout.resume();p.on('close',code=>resolve({code,error}));p.stdin.end(q);});
 try{
  // The image's temporary initialization server accepts Unix sockets before restarting.
  // Loopback readiness waits for the final server; no port is published outside the container.
  let ready=false;for(let i=0;i<60;i++){try{docker('exec',name,'pg_isready','-h','127.0.0.1','-U','postgres');ready=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,250));}}assert.ok(ready,'Local PostgreSQL ready');
  sql('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;');
  // Model Supabase default grants to prove the reviewed migration revokes them on its new table.
  sql('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;');
  const migration=readFileSync(new URL('./database/create-claims.sql',import.meta.url),'utf8');sql(migration);
  await t.test('RLS enabled, no policies, only service INSERT; no reset/readback access',()=>{
   assert.equal(sql("SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='public.conversation_preview_claims'::regclass"),'t');
   assert.equal(sql("SELECT count(*) FROM pg_policy WHERE polrelid='public.conversation_preview_claims'::regclass"),'0');
   for(const role of ['anon','authenticated'])assert.equal(sql(`SELECT has_table_privilege('${role}','public.conversation_preview_claims','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')`),'f');
   assert.equal(sql("SELECT has_table_privilege('service_role','public.conversation_preview_claims','INSERT')"),'t');
   for(const command of ['SELECT * FROM','DELETE FROM','TRUNCATE','UPDATE']){const q=command==='UPDATE'?'UPDATE public.conversation_preview_claims SET reserved_microusd=0':command+' public.conversation_preview_claims';assert.throws(()=>sql('SET ROLE service_role; '+q),/permission denied/);}
  });
  const columns='run_id,claim_kind,reservation_id,manifest_sha256,overlay_commit,deployment_id,project_id,ledger_receipt_sha256,reserved_microusd';
  const quote=v=>v===null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
  const verification=[claimStore.verificationRun,'provider_free',null,null,null,null,binding.projectId,null,0];
  const paid=[binding.runId,'paid',binding.reservationId,'a'.repeat(64),'b'.repeat(40),'dpl_offline',binding.projectId,binding.ledgerReceiptSha256,23430000];
  const insert=values=>`INSERT INTO public.conversation_preview_claims (${columns}) VALUES (${values.map(quote).join(',')})`;
  await t.test('verification is separate; invalid cross-kind/nullable/changed allocations and public inserts refuse',()=>{
   for(const role of ['anon','authenticated'])assert.throws(()=>sql(`SET ROLE ${role}; ${insert(verification)}`),/permission denied/);
   for(const [index,value] of [[0,claimStore.verificationRun],[1,'provider_free'],[2,null],[2,randomUUID()],[3,null],[3,'bad'],[4,null],[4,'bad'],[5,null],[6,'prj_other'],[7,null],[8,23430001]]){const bad=[...paid];bad[index]=value;assert.throws(()=>sql('SET ROLE service_role; '+insert(bad)),/constraint/);}
   const fabricated=[...verification];fabricated[5]='dpl_fabricated';assert.throws(()=>sql('SET ROLE service_role; '+insert(fabricated)),/constraint/);
   sql('SET ROLE service_role; '+insert(verification));assert.equal(sql("SELECT count(*) FROM public.conversation_preview_claims WHERE claim_kind='paid'"),'0');
   assert.throws(()=>sql('SET ROLE service_role; '+insert(verification)),/duplicate key/);
  });
  await t.test('two distinct database sessions cannot both claim the same offline paid fixture',async()=>{
   const attempts=await Promise.all([parallel('SET ROLE service_role; '+insert(paid)),parallel('SET ROLE service_role; '+insert(paid))]);assert.equal(attempts.filter(r=>r.code===0).length,1);assert.match(attempts.find(r=>r.code!==0).error,/duplicate key/);
   assert.equal(sql('SELECT count(*) FROM public.conversation_preview_claims'),'2');
   assert.throws(()=>sql('SET ROLE service_role; '+insert(paid)),/duplicate key/,'A new connection cannot restart the allowance');
   assert.throws(()=>sql(migration),/already exists/,'Reapplying migration cannot reset claims');
   assert.equal(sql('SELECT count(*) FROM public.conversation_preview_claims'),'2');
  });
 }finally{docker('rm','--force',name);}
});
