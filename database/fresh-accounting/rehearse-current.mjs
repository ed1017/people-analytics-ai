// Destructive fixture work is restricted to this dedicated, empty LOCAL database.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const psql=process.argv[2];
if(!psql || !path.isAbsolute(psql)) throw Error('Pass the absolute path to a trusted local psql binary');
const args=['-X','-q','-A','-t','-w','-h','127.0.0.1','-p','55439','-U','postgres','-d','pa_bootstrap_fixture','-v','ON_ERROR_STOP=1'];
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/^PG/i.test(k)));
const sql=q=>execFileSync(psql,args,{input:q,encoding:'utf8',env,stdio:['pipe','pipe','pipe']}).trim();
const concurrent=q=>new Promise((resolve,reject)=>{const p=spawn(psql,args,{env});let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('error',reject);p.on('exit',c=>c?reject(Error(err)):resolve(out.trim()));p.stdin.end(q);});
const tests=[];const test=(name,fn)=>{fn();tests.push(name);console.log('PASS '+name);};
const dir=path.dirname(fileURLToPath(import.meta.url));
const bootstrap=fs.readFileSync(path.join(dir,'bootstrap-current.sql'),'utf8');
assert.equal(sql("SELECT current_database()='pa_bootstrap_fixture' AND inet_server_addr()='127.0.0.1'::inet AND NOT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema'));"),'t');
// Roles exist only in this disposable cluster; bootstrap itself never creates roles.
sql('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
test('bootstrap transaction rolls back completely',()=>{sql(bootstrap.replace(/COMMIT;\s*$/,'ROLLBACK;'));assert.equal(sql("SELECT to_regnamespace('public_ai_budget') IS NULL;"),'t');});
test('exact bootstrap installs with no records or allowance',()=>{sql(bootstrap);assert.equal(sql('SELECT count(*) FROM public_ai_budget.rollout;'),'0');});
test('all columns match the current-release schema receipt',()=>{
 const expected=JSON.parse(fs.readFileSync(path.join(dir,'../../releases/2026-10-21/reproduction/accounting-schema.json'),'utf8')).columns;
 const actual=JSON.parse(sql("SELECT jsonb_agg(to_jsonb(c) ORDER BY table_name,ordinal_position) FROM (SELECT table_name,column_name,data_type,is_nullable,column_default,ordinal_position FROM information_schema.columns WHERE table_schema='public_ai_budget') c;"));
 assert.deepEqual(actual.map(({ordinal_position,...c})=>c),expected);
});
test('repeat bootstrap refuses existing schema without changing it',()=>assert.throws(()=>sql(bootstrap)));
const reserve=id=>`SET ROLE service_role;SELECT public.reserve_public_ai('${id}',repeat('a',64),'planner-sol-20261020-v1',4800000);RESET ROLE;`;
test('uninitialized database refuses admission',()=>assert.equal(JSON.parse(sql(reserve('invented_no_seed'))).granted,false));
test('all six tables have RLS and API roles cannot read',()=>{assert.equal(sql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public_ai_budget' AND c.relkind='r' AND c.relrowsecurity;"),'6');for(const role of ['anon','authenticated'])assert.throws(()=>sql(`SET ROLE ${role};SELECT * FROM public_ai_budget.reservation;`));});
// Freeze ONLY this disposable fixture's clock after the exact artifact has installed.
// This allows replay after the historical certification expires; it is not renewal.
sql("CREATE FUNCTION public.fixture_now() RETURNS timestamptz LANGUAGE sql IMMUTABLE AS $$SELECT '2026-10-22T17:00:00Z'::timestamptz$$;");
for(const signature of ['public.reserve_public_ai(text,text,text,bigint)','public.settle_public_ai_call(text,text,text,jsonb)']){
 const body=sql(`SELECT pg_get_functiondef('${signature}'::regprocedure);`);
 sql(body.replaceAll('clock_timestamp()','public.fixture_now()'));
}
sql('ALTER TABLE public_ai_budget.reservation ALTER COLUMN created_at SET DEFAULT public.fixture_now();');
sql("INSERT INTO public_ai_budget.rollout(id,cap_micro_usd) VALUES('public-9037-ai-initial-v1',50000000);");
test('disabled fresh rollout refuses admission',()=>assert.equal(JSON.parse(sql(reserve('invented_disabled'))).granted,false));
sql("UPDATE public_ai_budget.rollout SET enabled=true,policy_id='planner-20261020-multiprice-v1',per_call_micro_usd=4800000,pricing_valid_until='2026-10-23T15:00:00Z';");
test('empty SUM regression admits first call without invented seed hold',()=>assert.equal(JSON.parse(sql(reserve('invented_receipt01'))).granted,true));
test('policy and expiry mismatch refuse admission without new rows',()=>{
 for(const q of [reserve('invented_bad_policy').replace('planner-sol-20261020-v1','unreviewed'),reserve('invented_bad_amount').replace('4800000','1')])assert.equal(JSON.parse(sql(q)).granted,false);
 for(const expiry of ['2026-10-22T17:00:30Z','2026-10-23T15:00:01Z']){
  const result=sql(`BEGIN;UPDATE public_ai_budget.rollout SET pricing_valid_until='${expiry}';${reserve('invented_bad_expiry')}ROLLBACK;`);
  assert.equal(JSON.parse(result).granted,false);
 }
 assert.equal(sql('SELECT count(*) FROM public_ai_budget.reservation;'),'1');
});
const state=()=>sql("SELECT reserved_micro_usd,(SELECT count(*) FROM public_ai_budget.reservation),reserved_micro_usd-coalesce((SELECT sum(reserved_micro_usd-charged_micro_usd) FROM public_ai_budget.settlement_group),0)+coalesce((SELECT sum(amount_micro_usd) FROM public_ai_budget.settlement_debit),0),(SELECT count(*) FROM public_ai_budget.provider_usage_receipt) FROM public_ai_budget.rollout;");
const receipt={version:1,response_id:'resp_invented01',provider_request_id:'req_invented01',model:'gpt-6.1-sol',service_tier:'default',status:'completed',input_tokens:1000,output_tokens:100,total_tokens:1100,cached_tokens:0,cache_write_tokens:0,reasoning_tokens:10,input_text_tokens:1000,output_text_tokens:100};
const settle=(id,r=receipt)=>`SET ROLE service_role;SELECT public.settle_public_ai_call('${id}',repeat('a',64),'planner-sol-20261020-v1','${JSON.stringify(r)}'::jsonb);RESET ROLE;`;
test('unknown or invalid usage retains full hold',()=>{for(const r of [{...receipt,extra:0},{...receipt,input_tokens:null},{...receipt,input_tokens:'1000'},{...receipt,input_tokens:1.5},{...receipt,cache_write_tokens:1},{...receipt,service_tier:'priority'},{...receipt,total_tokens:1101},{...receipt,input_text_tokens:999},{...receipt,model:'other'},{...receipt,reasoning_tokens:101}]){assert.throws(()=>sql(settle('invented_receipt01',r)));assert.equal(state(),'4800000|1|4800000|0');}});
test('verified receipt preserves gross and settles conservative cost',()=>{assert.equal(JSON.parse(sql(settle('invented_receipt01'))).charged_micro_usd,6050);assert.equal(state(),'4800000|1|6050|1');});
test('identical replay no-op and conflicting replay rejected',()=>{assert.equal(JSON.parse(sql(settle('invented_receipt01'))).replayed,true);assert.throws(()=>sql(settle('invented_receipt01',{...receipt,provider_request_id:null})));assert.equal(state(),'4800000|1|6050|1');});
test('least privilege denies raw receipts cap reset and operator settlement',()=>{for(const role of ['anon','authenticated','service_role']){for(const q of ['SELECT * FROM public_ai_budget.provider_usage_receipt','DELETE FROM public_ai_budget.reservation','TRUNCATE public_ai_budget.reservation',"UPDATE public_ai_budget.rollout SET cap_micro_usd=50000001","SELECT public_ai_budget.append_settlement_debit('x','y',repeat('f',64),'{}',1)"])assert.throws(()=>sql(`SET ROLE ${role};${q};`));}assert.throws(()=>sql('SET ROLE service_role;UPDATE public_ai_budget.rollout SET reserved_micro_usd=0;'));for(const role of ['anon','authenticated'])assert.throws(()=>sql(`SET ROLE ${role};SELECT public.settle_public_ai_call('x','x','x','{}');`));});
test('receipt and settlement histories reject owner mutation',()=>{for(const table of ['provider_usage_receipt','settlement_group','settlement_member','settlement_debit'])for(const op of ['DELETE FROM','TRUNCATE'])assert.throws(()=>sql(`${op} public_ai_budget.${table};`));});
sql(reserve('invented_receipt02'));
test('duplicate provider response rolls back and preserves hold',()=>{const before=state();assert.throws(()=>sql(settle('invented_receipt02')));assert.equal(state(),before);});
test('settlement rollback preserves all accounting',()=>{const before=state();sql('BEGIN;'+settle('invented_receipt02',{...receipt,response_id:'resp_rollback'})+'ROLLBACK;');assert.equal(state(),before);});
test('old unmatched hold cannot automatically settle',()=>{sql("INSERT INTO public_ai_budget.reservation VALUES('invented_old_hold',repeat('a',64),'planner-sol-20261020-v1',4800000,public.fixture_now()-interval '1 hour');UPDATE public_ai_budget.rollout SET reserved_micro_usd=reserved_micro_usd+4800000;");const before=state();assert.throws(()=>sql(settle('invented_old_hold',{...receipt,response_id:'resp_old'})));assert.equal(state(),before);});
test('second model uses its own pinned rate',()=>{
 const before=state();const r={...receipt,model:'gpt-5.6-luna',response_id:'resp_luna'};
 const q=settle('invented_luna_01',r).replace('planner-sol-20261020-v1','planner-luna-20261020-v1');
 const result=sql("BEGIN;INSERT INTO public_ai_budget.reservation VALUES('invented_luna_01',repeat('a',64),'planner-luna-20261020-v1',500000,public.fixture_now());UPDATE public_ai_budget.rollout SET reserved_micro_usd=reserved_micro_usd+500000;"+q+'ROLLBACK;');
 assert.equal(JSON.parse(result).charged_micro_usd,638);assert.equal(state(),before);
});
test('bounded4k policy admits its exact maximum and settles verified usage',()=>{const before=state();const r={...receipt,response_id:'resp_bounded4k',input_tokens:1050000,input_text_tokens:1050000,output_tokens:4000,output_text_tokens:4000,total_tokens:1054000};const admission=reserve('invented_bounded4k').replace('planner-sol-20261020-v1','planner-sol-4k-20261022-v1').replace('4800000','4686000');const settlement=settle('invented_bounded4k',r).replace('planner-sol-20261020-v1','planner-sol-4k-20261022-v1');const values=sql('BEGIN;'+admission+settlement+'ROLLBACK;').split('\n').map(JSON.parse);assert.equal(values[0].granted,true);assert.equal(values[1].charged_micro_usd,4686000);assert.equal(state(),before);});
test('bounded4k receipt rejects output above enforced ceiling',()=>{const before=state();const r={...receipt,response_id:'resp_bad4k',output_tokens:4001,output_text_tokens:4001,total_tokens:5001};const admission=reserve('invented_bad4k').replace('planner-sol-20261020-v1','planner-sol-4k-20261022-v1').replace('4800000','4686000');assert.throws(()=>sql('BEGIN;'+admission+settle('invented_bad4k',r).replace('planner-sol-20261020-v1','planner-sol-4k-20261022-v1')+'ROLLBACK;'));assert.equal(state(),before);});
const results=await Promise.all([concurrent(settle('invented_receipt02',{...receipt,response_id:'resp_concurrent'})),concurrent(settle('invented_receipt02',{...receipt,response_id:'resp_concurrent'}))]);
test('concurrent receipt settles exactly once',()=>assert.equal(results.map(JSON.parse).filter(r=>r.replayed).length,1));
const race=await Promise.all(Array.from({length:12},(_,i)=>i+1).map(n=>concurrent(reserve('invented_race00'+n))));
test('concurrent admission preserves cap including uncertain hold',()=>{assert.equal(race.map(JSON.parse).filter(r=>r.granted).length,9);assert.ok(BigInt(state().split('|')[2])<=50000000n);});
test('append-only correction debit halts admission at overrun',()=>{sql("SELECT public_ai_budget.append_settlement_debit('invented_debit','call-invented_receipt01',repeat('d',64),'{\"invented\":true}',50000000);");assert.equal(JSON.parse(sql(reserve('invented_after_debit'))).granted,false);assert.equal(sql("SELECT count(*) FROM public_ai_budget.reservation WHERE request_id='invented_old_hold';"),'1');});
console.log(JSON.stringify({bootstrapSha256:createHash('sha256').update(bootstrap).digest('hex'),postgres:sql('SELECT version();'),tests:tests.length,clock:'fixture-only 2026-10-22T17:00:00Z',liveConnections:0,providerCalls:0},null,2));
