import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {buildCompensationResponse, COMPENSATION_COLUMNS} from '../lib/compensation.ts';

const row=(overrides={})=>({org_code:'A',org_name:'Unit A',org_type:'business_unit',headcount:'100',fte:'80',labor_cost_usd:'8000000',...overrides});
const second=row({org_code:'B',org_name:'Unit B',headcount:50,fte:20,labor_cost_usd:4000000});

test('uses weighted company cost per FTE, source USD, and verified fixed snapshot without inventing refresh or cost period',()=>{
  const result=buildCompensationResponse([row(),second]);
  assert.deepEqual(result.current,{headcount:150,fte:100,labor_cost_usd:12000000,cost_per_fte_usd:120000});
  assert.equal(result.by_business_unit[0].share_of_reported_cost_pct,66.67);
  assert.equal(result.by_business_unit[1].cost_per_fte_usd,200000);
  assert.equal(result.snapshot_date,'2026-09-30');
  assert.equal(result.source_refreshed_at,null);
  assert.equal(result.cost_period,null);
  assert.equal(result.employee_cost_coverage,null);
  assert.equal(result.currency,'USD');
});

test('missing and invalid aggregate values cannot silently reduce company totals or create pay comparisons',()=>{
  for(const value of [null,undefined,'','  ','unknown',NaN,Infinity,-1,true,{},'0xff']){
    const result=buildCompensationResponse([row({labor_cost_usd:value}),second]);
    assert.equal(result.current.labor_cost_usd,null,String(value));
    assert.equal(result.current.cost_per_fte_usd,null);
    assert.equal(result.current.headcount,150);
    assert.ok(result.by_business_unit.every(unit=>unit.share_of_reported_cost_pct===null));
    assert.equal(result.by_business_unit.find(unit=>unit.org_code==='A').labor_cost_usd,null);
  }
});

test('empty sources are unavailable; real zero cost survives; zero or incomplete FTE has no ratio',()=>{
  assert.deepEqual(buildCompensationResponse([]).current,{headcount:null,fte:null,labor_cost_usd:null,cost_per_fte_usd:null});
  const zero=buildCompensationResponse([row({labor_cost_usd:0})]);
  assert.equal(zero.current.labor_cost_usd,0);
  assert.equal(zero.current.cost_per_fte_usd,0);
  assert.equal(zero.by_business_unit[0].share_of_reported_cost_pct,null);
  for(const fte of [0,null,'bad']) assert.equal(buildCompensationResponse([row({fte})]).current.cost_per_fte_usd,null);
  assert.equal(buildCompensationResponse([row({fte:null}),second]).current.fte,null);
  assert.equal(buildCompensationResponse([row({headcount:1.5})]).current.headcount,null);
});

test('duplicate units and mixed organization levels cannot be counted as independent company cohorts',()=>{
  assert.throws(()=>buildCompensationResponse([row(),row()]));
  assert.throws(()=>buildCompensationResponse([row({org_type:'company'})]));
  assert.throws(()=>buildCompensationResponse([row({org_code:''})]));
});

test('allowlisted response drops any incidental private fields and never exposes scenario or salary inputs',()=>{
  const serialized=JSON.stringify(buildCompensationResponse([row({employee_id:'PRIVATE',base_salary:90000,scenario_name:'Growth'})]));
  assert.doesNotMatch(serialized,/PRIVATE|employee_id|base_salary|scenario_name/);
  assert.equal(COMPENSATION_COLUMNS,'org_code, org_name, org_type, headcount, fte, labor_cost_usd');
});

// Execute the actual route with only its server client replaced; no sockets or credentials.
const source=fs.readFileSync(new URL('../app/api/compensation/route.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function routeWith(result){
  const calls=[];
  const exports={};
  const supabaseServer={from:name=>{calls.push(name);return {select:async(...args)=>{calls.push(args);if(result instanceof Error)throw result;return result}}}};
  vm.runInNewContext(code,{exports,Response,require:name=>{
    if(name==='../../../lib/supabase-server')return {supabaseServer};
    if(name==='../../../lib/compensation')return {buildCompensationResponse,COMPENSATION_COLUMNS};
    throw Error('Unexpected module: '+name);
  }});
  return {response:await exports.GET(),calls};
}
test('actual GET reads the existing aggregate only, checks complete row count and sends no-store',async()=>{
  const {response,calls}=await routeWith({data:[row(),second],count:2,error:null});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((await response.json()).current.labor_cost_usd,12000000);
  assert.equal(calls[0],'finance_current_summary');
  assert.equal(calls[1][0],COMPENSATION_COLUMNS);
  assert.equal(calls[1][1].count,'exact');
});
test('actual GET sanitizes source failures and rejects capped or uncounted responses',async()=>{
  for(const result of [{data:null,error:{message:'PRIVATE'},count:null},{data:[row()],error:null,count:2},{data:[row()],error:null,count:null},{data:[row(),row()],error:null,count:2},new Error('PRIVATE')]){
    const {response}=await routeWith(result);
    assert.equal(response.status,503);
    assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual(await response.json(),{error:'Compensation cost context is unavailable. Try again.'});
  }
  const {response}=await routeWith({data:[],error:null,count:0});
  assert.equal(response.status,200);
  assert.equal((await response.json()).current.labor_cost_usd,null);
});
