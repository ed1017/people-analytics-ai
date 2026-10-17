// Explicit private inputs. Tests the existing app binding, never a production server.
import test from 'node:test';
import {local9037RequestAllowed} from '../../lib/dataset-9037-request-policy.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {development9037Options,load9037DevelopmentBinding,isLoopback9037Request} from '../../lib/dataset-9037-development.server.mjs';
import {create9037OfflineProvider,OFFLINE_9037_INTEGRITY_DIGEST as digest} from '../../lib/dataset-9037-offline-provider.mjs';
import {create9037CompanyAnalytics} from '../../lib/dataset-9037-company-analytics.mjs';
const options=development9037Options({...process.env,NODE_ENV:'development'});
assert.ok(options,'Explicit private config required');
const config=JSON.parse(fs.readFileSync(options.file));
const component=name=>fs.readFileSync(path.join(config.componentDirectory,name));
const provider=create9037OfflineProvider({expectedIntegrityDigest:digest,integrityBytes:component('integrity-manifest.json'),contractBytes:component('component-contracts.json'),componentBytes:component('components.json')});
const args={provider,aggregateBytes:fs.readFileSync(config.capturePath),expectedAggregateDigest:config.captureDigest,jointBytes:fs.readFileSync(config.jointPath)};
const analytics=await create9037CompanyAnalytics(args);
const binding=await load9037DevelopmentBinding(options),token=await binding.router.bootstrapToken();
const request=(url,version=token)=>new Request(url,{headers:version?{'x-workforce-dataset':version}:{}});

test('development gate rejects hosted/production/partial configuration and wrong pins',async()=>{
 assert.equal(development9037Options({NODE_ENV:'production'}),null);
 for(const env of [{NODE_ENV:'production'},{NODE_ENV:'test'},{NODE_ENV:'development',VERCEL:'1'}])assert.throws(()=>development9037Options({...process.env,...env}),/development only/);
 assert.throws(()=>development9037Options({NODE_ENV:'development',WORKFORCE_9037_LOCAL_CONFIG:options.file}),/separate pin/);
 await assert.rejects(()=>load9037DevelopmentBinding({...options,pin:'0'.repeat(64)}),/pin mismatch/);
 const bytes=Buffer.from(args.jointBytes);bytes[100]^=1;
 await assert.rejects(()=>create9037CompanyAnalytics({...args,jointBytes:bytes}),/digest/);
});

test('loopback routing retains token guards and refuses unsupported/AI operations',async()=>{
 assert.equal(isLoopback9037Request(request('https://example.com/api/workforce')),false);
 assert.equal((await binding.handle(request('https://example.com/api/workforce'))).status,503);
 assert.equal((await binding.handle(request('http://127.0.0.1:9037/api/workforce',null))).status,409);
 assert.equal((await binding.handle(request('http://localhost:9037/api/workforce',token.replace(':1',':2')))).status,409);
 for(const url of ['/api/chat','/api/home-plan-conversation','/api/capability-agent'])assert.equal((await binding.handle(request('http://localhost:9037'+url))).status,503);
 const response=await binding.handle(request('http://localhost:9037/api/dashboard?country=US&org=BU-TECH&level=L6'));
 assert.equal(response.status,200);assert.equal(response.headers.get('x-workforce-dataset'),token);
 const value=await response.json();assert.equal(value.workforce_filter_scope.status,'verified_aggregate');assert.equal(value.performance_rating,null);
 assert.equal((await binding.handle(request('http://localhost:9037/api/dashboard?country=XX'))).status,200); // Existing API returns an explicit unsupported receipt, no company substitute.
 assert.equal((await binding.handle(request('http://localhost:9037/api/dashboard?country=US&country=CA'))).status,503);
 await assert.rejects(()=>analytics.read('dashboard',['XX',null,null]),/unknown filter/);
});

test('all 1287 scopes and 42471 monthly stocks reconcile independently to pinned SQLite',async()=>{
 assert.ok(process.env.DATASET_9037_SQLITE,'Explicit retained fixture required');
 const fixture=process.env.DATASET_9037_SQLITE;
 assert.equal(createHash('sha256').update(fs.readFileSync(fixture)).digest('hex'),'13f69613e20866bfa64c77251eafb9f6ecfe7386801588a4f9d5cd3721b5aaa1');
 const db=new DatabaseSync(fixture,{readOnly:true});
 try{
  const facts=db.prepare('SELECT snapshot_date,country,bu,level,count(*) AS headcount,sum(fte_basis_points) AS fte,sum(labor_cost_cents) AS cents FROM snapshot_facts GROUP BY snapshot_date,country,bu,level').all();
  const map=new Map(),vac=new Map(),exits=new Map();
  const keys=r=>['all',r.country].flatMap(c=>['all',r.bu].flatMap(o=>['all','L'+r.level].map(l=>[c,o,l].join('|'))));
  for(const r of facts)for(const key of keys(r)){const k=r.snapshot_date+'|'+key,v=map.get(k)??[0,0,0];v[0]+=r.headcount;v[1]+=r.fte;v[2]+=r.cents;map.set(k,v);}
  for(const r of db.prepare("SELECT country,bu,level,count(*) AS n FROM positions WHERE status='vacant' GROUP BY country,bu,level").all())for(const k of keys(r))vac.set(k,(vac.get(k)??0)+r.n);
  for(const r of db.prepare("SELECT a.country,a.bu,a.level,count(*) AS n FROM separations s JOIN assignments a ON a.employee_id=s.employee_id AND a.valid_to=s.effective_date WHERE s.type='voluntary' AND s.effective_date>='2026-01-01' GROUP BY a.country,a.bu,a.level").all())for(const k of keys(r))exits.set(k,(exits.get(k)??0)+r.n);
  const joint=JSON.parse(args.jointBytes),d=joint.dimensions;let checked=0,empty=0;
  for(const country of ['all',...d.country])for(const org of ['all',...d.org])for(const level of ['all',...d.level]){
   const key=[country,org,level].join('|'),response=analytics.dashboardResponse({country,org,level});let denominator=0;
   for(let i=0;i<33;i++){
    const date=joint.dates[i],actual=response.trend[i],expected=map.get(date+'|'+key)??[0,0,0];
    assert.deepEqual(actual,{snapshot_date:date,headcount:expected[0],fte:Math.round(expected[1]/1000)/10});if(i>=24)denominator+=expected[0];checked++;if(!expected[0])empty++;
   }
   const last=map.get('2026-09-30|'+key)??[0,0,0];assert.equal(response.overview.labor_cost_usd,last[2]/100);assert.equal(response.overview.open_positions,vac.get(key)??0);
   assert.equal(response.turnover_evidence.sum_month_end_headcount,denominator);assert.equal(response.turnover_evidence.voluntary_exits,exits.get(key)??0);
   assert.equal(response.overview.voluntary_turnover_ytd_pct,denominator?Math.round(9000*(exits.get(key)??0)/denominator)/10:null);
   assert.equal(response.workforce_filter_scope.stockStatus,last[0]?'positive':'known-empty');
  }
  assert.equal(checked,42471);assert.equal(empty,5652);
 }finally{db.close();}
 assert.equal(globalThis.__offlineNetworkAttempts,0);
});

test('development proxy blocks external-service/AI routes before any route module runs',()=>{
 const env={NODE_ENV:'development',WORKFORCE_9037_LOCAL_CONFIG:options.file};
 for(const url of ['/api/bls','/%61pi/bls','/api%2fbls','/api/chat','/api/unknown'])assert.equal(local9037RequestAllowed(env,request('http://localhost:9037'+url)),false);
 assert.equal(local9037RequestAllowed(env,request('http://localhost:9037/api/dashboard')),true);
 assert.equal(local9037RequestAllowed(env,request('https://example.com/')),false);
 assert.equal(local9037RequestAllowed({...env,NODE_ENV:'production'},request('http://localhost:9037/')),false);
 assert.equal(local9037RequestAllowed({NODE_ENV:'production'},request('https://example.com/api/bls')),true);
});
