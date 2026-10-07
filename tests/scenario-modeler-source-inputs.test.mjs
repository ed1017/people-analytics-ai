import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as numeric from '../lib/numeric-contract.ts';
import * as planning from '../lib/stored-planning.ts';
import * as engine from '../lib/scenario-engine.ts';
import {dataApiErrorResponse} from '../lib/data-api-error.ts';

const source=ts.transpileModule(fs.readFileSync(new URL('../app/api/scenario-modeler/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const defaultKeys=['annual_growth_pct','salary_inflation_pct','annual_attrition_pct','fill_rate_pct','productivity_hiring_reduction_pct'];
const baselineKeys=['planned_headcount','planned_fte','planned_labor_cost_usd'];
const invalid=[null,undefined,'',' ','invalid',NaN,Infinity,false,[],{}];
function fixture(){return {
  scenario_modeler_defaults:Object.fromEntries(defaultKeys.map((key,i)=>['baseline_'+key,[5,3,10,80,0][i]])),
  workforce_scenario_summary:['2026-10-01','2026-11-01'].map(planning_month=>({planning_month,planned_headcount:100,planned_fte:90,planned_labor_cost_usd:1000})),
  dashboard_overview_current:{snapshot_date:'2026-09-30',headcount:100},
  workforce_scenario_by_org:[],workforce_scenario_by_job_family:[],
};}
async function request(tables,{method='POST',assumptions,errorTable}={}){
  let runs=0;const exports={},logs=[];
  const supabaseServer={from:table=>{
    const query={select:()=>query,single:()=>query,eq:()=>query,order:()=>query,then:resolve=>resolve({data:tables[table],error:table===errorTable?{code:'PGRST303',message:'PRIVATE_JWT https://private.invalid/sql'}:null})};return query;
  }};
  const aliases={
    'next/server':{NextResponse:Response},'../../../lib/supabase-server':{supabaseServer},
    '../../../lib/numeric-contract':numeric,'../../../lib/stored-planning':planning,
    '../../../lib/data-api-error':{dataApiErrorResponse},
    '../../../lib/scenario-engine':{...engine,runScenarioModel:input=>{runs++;return engine.runScenarioModel(input)}},
  };
  vm.runInNewContext(source,{exports,require:name=>{assert.ok(name in aliases,name);return aliases[name]}});
  const original=console.error;console.error=(...args)=>logs.push(args);
  try{const response=await exports[method]({json:async()=>({assumptions})});return {response,body:await response.json(),runs,logs};}finally{console.error=original}
}
async function unavailable(tables,options){
  const result=await request(tables,options);
  assert.equal(result.response.status,503);assert.equal(result.response.headers.get('cache-control'),'no-store');
  assert.equal(result.body.code,'scenario_inputs_unavailable');assert.match(result.body.error,/required source inputs are missing, invalid, or incomplete/);
  assert.equal(result.runs,0);assert.equal(result.body.summary,undefined);assert.equal(result.body.points,undefined);return result;
}

for(const key of defaultKeys)test('required source default '+key+' never becomes zero when missing or invalid',async()=>{
  for(const value of invalid){const tables=fixture();tables.scenario_modeler_defaults['baseline_'+key]=value;await unavailable(tables);}
});
for(const key of baselineKeys)test('required baseline '+key+' rejects missing, invalid and negative values',async()=>{
  for(const value of [...invalid,-1]){const tables=fixture();tables.workforce_scenario_summary[1][key]=value;await unavailable(tables);}
});
test('required current headcount and absent required datasets fail closed for GET and POST',async()=>{
  for(const method of ['GET','POST']){
    for(const value of [...invalid,-1]){const tables=fixture();tables.dashboard_overview_current.headcount=value;await unavailable(tables,{method});}
    for(const key of ['scenario_modeler_defaults','dashboard_overview_current']){const tables=fixture();tables[key]=null;await unavailable(tables,{method});}
    const tables=fixture();tables.workforce_scenario_summary=[];await unavailable(tables,{method});
  }
});
test('invalid, duplicate and missing-middle baseline months cannot run the sequential calculator',async()=>{
  for(const months of [['2026-10-01','2026-12-01'],['2026-10-01','2026-10-01'],['2026-10-01','2026-13-01']]){
    const tables=fixture();tables.workforce_scenario_summary.forEach((point,i)=>point.planning_month=months[i]);await unavailable(tables);
  }
});
test('all legitimate source zeros and numeric zero strings run without fabricated values',async()=>{
  for(const zero of [0,'0']){
    const tables=fixture();for(const key of defaultKeys)tables.scenario_modeler_defaults['baseline_'+key]=zero;
    for(const point of tables.workforce_scenario_summary)for(const key of baselineKeys)point[key]=zero;
    tables.dashboard_overview_current.headcount=zero;
    const {response,body,runs}=await request(tables);assert.equal(response.status,200);assert.equal(runs,1);
    for(const value of Object.values(body.summary))assert.equal(value,0);
    for(const value of Object.values(body.defaults))assert.equal(value,0);
  }
});
test('optional requested values fall back to validated defaults while explicit zero remains zero',async()=>{
  for(const value of [undefined,null,'','invalid']){
    const {response,body}=await request(fixture(),{assumptions:{annual_growth_pct:value}});
    assert.equal(response.status,200);assert.equal(body.assumptions.annual_growth_pct,5);
  }
  const {body}=await request(fixture(),{assumptions:{annual_growth_pct:0}});assert.equal(body.assumptions.annual_growth_pct,0);
});
test('empty optional segment datasets are allowed but provided unknown numeric cells are not invented',async()=>{
  assert.equal((await request(fixture())).response.status,200);
  for(const key of ['workforce_scenario_by_org','workforce_scenario_by_job_family']){
    const tables=fixture();tables[key]=[{planning_month:'2026-11-01',org_code:'DEMO',org_name:'Demo',family_code:'DEMO',family_name:'Demo',planned_headcount:null,planned_labor_cost_usd:0}];await unavailable(tables);
  }
});
test('upstream errors use safe responses and never run or expose raw JWT details',async()=>{
  for(const method of ['GET','POST']){
    const {response,body,runs,logs}=await request(fixture(),{method,errorTable:'scenario_modeler_defaults'});
    assert.equal(response.status,500);assert.equal(runs,0);assert.match(body.error,/Scenario modeling source data is temporarily unavailable/);
    assert.doesNotMatch(JSON.stringify({body,logs}),/PRIVATE_JWT|private.invalid/);
  }
});
