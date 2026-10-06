import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {makeDemoRange} from '../lib/compensation-ranges.ts';
import {buildDemoConventionRelease} from '../lib/compensation-convention.ts';
import * as contract from '../lib/compensation-release.ts';
const {compensationRelease:m, companyReleaseQuery, validateRelease}=contract;
const names=Object.fromEntries(m.jobCodes.map(job=>[job,job]));
const bands=m.jobCodes.flatMap(job=>[makeDemoRange(job,'L1',1,'US'),makeDemoRange(job,'L2',8,'US')]);
const sample=()=>m.jobCodes.flatMap(job=>Array.from({length:6},(_,i)=>({employee_id:`${job}-${i}`,snapshot_date:m.snapshotDate,job_profile_code:job,level_code:i%2?'L2':'L1',country_code:'US',currency_code:'USD',base_salary:makeDemoRange(job,i%2?'L2':'L1',i%2?8:1,'US').midpoint*(i%2?1.5:.5)*.5,fte:.5,employment_status:'not-invented-active-filter'})));
const calculate=(rows=sample(),ranges=bands)=>buildDemoConventionRelease(rows,ranges,names);
test('approved convention uses original snapshot rows, annual contracted/FTE and individual ratio means',()=>{
  const result=calculate();assert.equal(result.length,50);
  assert.ok(result.every(row=>row.status==='published'&&row.mean_compa_pct===100&&row.coverage==='complete'));
  assert.deepEqual(calculate([...sample(),{...sample()[0],snapshot_date:'2025-09-30',base_salary:1}]),result);
});
test('invalid salary, FTE, USD currency and country/level/date matches never become pay or silently shrink coverage',()=>{
  for(const change of [{base_salary:null},{base_salary:0},{base_salary:NaN},{base_salary:Infinity},{fte:0},{fte:1.1},{fte:null},{currency_code:'EUR'},{country_code:null},{level_code:null}]) {
    const rows=sample();Object.assign(rows[0],change);
    const result=calculate(rows);assert.equal(result[0].status,'withheld',JSON.stringify(change));
    assert.equal(result[1].status,'withheld','single-cell companion');
  }
  assert.ok(calculate(sample(),bands.map(b=>({...b,effectiveTo:m.snapshotDate}))).every(row=>row.status==='withheld'));
  assert.ok(calculate(sample(),bands.map(b=>({...b,country:'GLOBAL'}))).every(row=>row.status==='withheld'));
  assert.ok(calculate(sample(),[...bands,...bands]).every(row=>row.status==='withheld'));
});
test('five-person minimum and small-excluded cells hide whole tuples; one primary cell gets deterministic companion',()=>{
  const rows=sample().filter(row=>!['AI-ARCH-4','AI-ARCH-5'].includes(row.employee_id));
  const result=calculate(rows);
  assert.deepEqual(result.filter(row=>row.status==='withheld').map(row=>row.job_profile_code),['AI-ARCH','AI-ENG']);
  assert.ok(result.filter(row=>row.status==='withheld').every(row=>row.mean_compa_pct===null&&row.coverage==='withheld'));
  const five=calculate(sample().filter(row=>row.employee_id!=='AI-ARCH-5'));
  assert.equal(five[0].status,'published');
});
test('hidden-job and companion pay cannot be reconstructed from a change in other published tuples',()=>{
  const rows=sample().filter(row=>!['AI-ARCH-4','AI-ARCH-5'].includes(row.employee_id));
  const before=calculate(rows);
  const changed=rows.map(row=>['AI-ARCH','AI-ENG'].includes(row.job_profile_code)?{...row,base_salary:row.base_salary*7}:row);
  assert.deepEqual(calculate(changed),before);
  assert.ok(before.every(row=>!('population_count' in row)&&!('matched_count' in row)&&!('excluded_count' in row)&&!('coverage_pct' in row)));
});
test('missing counts at least five produce partial coverage without disclosing counts or employee records',()=>{
  const rows=sample();rows.push(...rows.slice(0,5).map(row=>({...row,employee_id:'missing-'+row.employee_id,base_salary:null})));
  const result=calculate(rows);assert.equal(result[0].coverage,'partial');assert.equal(result[0].mean_compa_pct,100);
  assert.doesNotMatch(JSON.stringify(result),/employee_id|base_salary|population_count|matched_count|excluded_count|coverage_pct|ratio_sum/);
});
test('all 50 catalog rows remain; unmapped or duplicate people and missing job labels fail the release',()=>{
  assert.equal(calculate(sample().filter(row=>row.job_profile_code!=='AI-ARCH'))[0].status,'withheld');
  assert.throws(()=>calculate([...sample(),sample()[0]]),/Duplicate/);
  assert.throws(()=>calculate([{...sample()[0],job_profile_code:null}]),/Unmapped/);
  assert.throws(()=>buildDemoConventionRelease(sample(),bands,{}),/identity/);
});
test('query allowlist rejects all narrowed, duplicate, unknown, arbitrary-date and alternate-release requests',()=>{
  for(const query of ['', 'country=all&org=all&level=all',`release=${m.releaseId}`])assert.equal(companyReleaseQuery(new URLSearchParams(query)),true);
  for(const query of ['country=US','org=BU1','level=L1','country=all&country=all','country=','date=2026-09-30','job=AI-ENG','release=other','release='+m.releaseId+'&release='+m.releaseId,'country=null'])assert.equal(companyReleaseQuery(new URLSearchParams(query)),false,query);
});
test('wire validator binds snapshot/policy/job set, preserves withholding and strips incidental sensitive fields',()=>{
  const valid=calculate();assert.doesNotMatch(JSON.stringify(validateRelease(valid.map(row=>({...row,employee_id:'PRIVATE',base_salary:123,matched_count:6})))),/PRIVATE|base_salary|matched_count/);
  for(const change of [{snapshot_date:'2026-10-31'},{release_id:'other'},{range_policy_version:'other'},{mean_compa_pct:NaN},{mean_compa_pct:Infinity},{status:'withheld',mean_compa_pct:100},{coverage:'unknown'}])assert.throws(()=>validateRelease([{...valid[0],...change},...valid.slice(1)]));
  assert.throws(()=>validateRelease(valid.slice(1)));assert.throws(()=>validateRelease([valid[1],...valid.slice(1)]));
  assert.throws(()=>validateRelease([{...valid[0],status:'withheld',mean_compa_pct:null,coverage:'withheld'},...valid.slice(1)]),/companion/);
});

const source=fs.readFileSync(new URL('../app/api/compensation-job-release/route.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function route(query='',enabled=false,result={data:calculate(),count:50,error:null}) {
  const calls=[],exports={};
  vm.runInNewContext(code,{exports,Response,URL,process:{env:{COMPENSATION_JOB_RELEASE_ENABLED:enabled?'true':'false'}},require:name=>{
    if(name.endsWith('compensation-release'))return contract;
    if(name.endsWith('supabase-server')){calls.push('loaded server');return {supabaseServer:{from:table=>{calls.push(table);return {select:columns=>{calls.push(columns);return {eq:async(...args)=>{calls.push(args);return result;}}}}}}};}
    throw Error('Unexpected module '+name);
  }});
  return {response:await exports.GET(new Request('http://local/api/compensation-job-release?'+query)),calls};
}
test('disabled or filtered route never loads a database module; convention approval cannot enable publication',async()=>{
  for(const [query,enabled,status] of [['',false,503],['country=US',true,422],['date=2026-09-30',true,422]]) {
    const {response,calls}=await route(query,enabled);assert.equal(response.status,status);assert.equal(calls.length,0);
  }
});
test('enabled route reads only the frozen aggregate and rejects incomplete/stale releases without source details',async()=>{
  const {response,calls}=await route('',true);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((await response.json()).rows.length,50);assert.deepEqual(calls,['loaded server','compensation_job_release_v1',contract.RELEASE_COLUMNS,['release_id',m.releaseId]]);
  for(const result of [{data:calculate(),count:49,error:null},{data:null,count:null,error:{message:'PRIVATE'}},{data:calculate().map(r=>({...r,snapshot_date:'2025-01-01'})),count:50,error:null}]) {
    const {response}=await route('',true,result);assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/PRIVATE/);
  }
});
