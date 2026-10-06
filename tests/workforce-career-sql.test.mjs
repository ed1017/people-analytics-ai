// Real PostgreSQL semantics in local PGlite; generated test keys only, never remote data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const modulePath=process.env.PGLITE_MODULE;
const PGlite=modulePath?(await import(modulePath)).PGlite:null;
const preparation=await fs.readFile(new URL('../database/workforce_career_demo_history.proposed.sql',import.meta.url),'utf8');
const rollback=await fs.readFile(new URL('../database/workforce_career_demo_history.rollback.proposed.sql',import.meta.url),'utf8');
const commit=sql=>sql.replace(/rollback;\s*$/,'commit;');
test('private SQL is deterministic, reversible, source-preserving and never claims outcome completeness',{skip:!PGlite && 'Set PGLITE_MODULE to run local PostgreSQL verification'},async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table locations(location_id text primary key,country_code text);insert into locations values('loc','US');
 create table org_units(org_unit_id text primary key,org_code text);insert into org_units select n::text,v from unnest(array['BU-CLIENTOPS','BU-CONS','BU-CORP','BU-DATAAI','BU-DIGITAL','BU-MGSVC','BU-SALES','BU-TECH']) with ordinality as x(v,n);
 create table job_levels(job_level_id text primary key,level_code text);insert into job_levels values('l1','IC1'),('l2','IC2');
 create table employee_snapshots(employee_id text,snapshot_date date,job_level_id text,location_id text,org_unit_id text,primary key(employee_id,snapshot_date));
 insert into employee_snapshots select 'fixture-'||i,d,case when d=date '2026-09-30' and i%5=0 then 'l2' else 'l1' end,'loc',(1+i%8)::text from generate_series(1,10000)i cross join unnest(array[date '2024-01-31',date '2025-12-31',date '2026-09-30'])d;
 create table employee_movements(movement_id text primary key,employee_id text,movement_date date,movement_type text,from_job_level_id text,to_job_level_id text);
 create index on employee_movements(employee_id,movement_date);
 insert into employee_movements select 'promotion-'||i,'fixture-'||i,date '2026-03-15','promotion','l1','l2' from generate_series(1,10000)i where i%5=0;
 insert into employee_movements select 'entry-'||i,'fixture-'||i,date '2023-12-01','promotion','l0','l1' from generate_series(1,10000)i where i%10=0;
 insert into employee_movements values('october','fixture-1',date '2026-10-01','promotion','l1','l2');`);
 const scalar=async sql=>(await db.query(sql)).rows[0];
 const sourceBefore=await scalar(`select (select count(*) from employee_snapshots) snapshots,(select count(*) from employee_movements) movements`);
 await db.exec(preparation);assert.equal((await scalar(`select to_regnamespace('career_demo_preparation_v1') n`)).n,null,'default dry-run rolls back schema');
 await db.exec(commit(preparation));
 assert.deepEqual(await scalar(`select count(*)::int n,count(*) filter(where eligible is null)::int missing,count(*) filter(where duration_provenance='recorded_movement_entry')::int reused,count(*) filter(where duration_provenance='generated_within_observed_snapshot_bounds_v1')::int generated from career_demo_preparation_v1.career_history`),{n:10000,missing:0,reused:1000,generated:1000});
 const digest=()=>scalar(`select md5(string_agg(row_to_json(t)::text,',' order by employee_id)) hash from career_demo_preparation_v1.career_history t`);
 const first=await digest();
 assert.equal((await scalar(`select recorded_promotion_events::int n from career_demo_preparation_v1.career_history where employee_id='fixture-1'`)).n,0,'October event excluded');
 assert.deepEqual(await scalar(`select count(*)::int n,count(*) filter(where active or promotion_rate_pct is not null or median_prior_level_months is not null)::int exposed from career_demo_preparation_v1.aggregate_candidates`),{n:9,exposed:0});
 assert.equal((await scalar(`select count(*)::int n from career_demo_preparation_v1.career_history where eligible and promotion_date is not null and prior_level_started_on>promotion_date`)).n,0);
 for(const role of ['anon','authenticated','service_role'])assert.equal((await scalar(`select has_schema_privilege('${role}','career_demo_preparation_v1','USAGE') p`)).p,false);
 assert.deepEqual(await scalar(`select (select count(*) from employee_snapshots) snapshots,(select count(*) from employee_movements) movements`),sourceBefore);
 await db.exec(commit(rollback));assert.equal((await scalar(`select to_regnamespace('career_demo_preparation_v1') n`)).n,null);
 await db.exec(commit(preparation));assert.deepEqual(await digest(),first,'same source and seeds reproduce history');await db.exec(commit(rollback));
 await db.exec(`delete from employee_snapshots where employee_id='fixture-1' and snapshot_date=date '2025-12-31'`);
 await db.exec(commit(preparation));assert.equal((await scalar(`select eligible from career_demo_preparation_v1.career_history where employee_id='fixture-1'`)).eligible,null);
 assert.equal((await scalar(`select count(*)::int n from career_demo_preparation_v1.aggregate_candidates where private_candidate_counts is not null`)).n,0,'one incomplete BU withholds every aggregate candidate');
 }finally{await db.close()}
});
