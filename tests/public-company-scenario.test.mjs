import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createCompanyScenarioCalculator,COMPANY_SCENARIO_BOUNDS} from '../lib/public-fixture/company-scenario.mjs';
import {canonicalJson,sha256} from '../lib/public-fixture/read-provider.mjs';
const dir=new URL('./fixtures/public-company-scenario/',import.meta.url);
const text=await readFile(new URL('manifest.json',dir),'utf8'),pin=(await readFile(new URL('manifest.sha256',dir),'utf8')).trim(),calc=createCompanyScenarioCalculator(text,pin);
test('pinned closed public input subsets are immutable and output excludes segments/private receipts',()=>{
 assert.deepEqual(calc.read().bounds,COMPANY_SCENARIO_BOUNDS);assert.throws(()=>{calc.read().defaults.fill_rate_pct=0;},TypeError);
 const result=calc.calculate({assumptions:{}});assert.equal(Object.hasOwn(result,'segment_breakdown'),false);assert.equal(Object.hasOwn(result,'data_meta'),false);assert.equal(result.accounting.scope.type,'company');
 assert.equal(result.summary.starting_headcount,9037);assert.equal(result.points.length,12);assert.throws(()=>{result.points[0].modeled_headcount=1;},TypeError);
});
test('three recorded public POST company sections exactly match offline, without fetch',async()=>{
 const raw=await readFile(new URL('parity.json',dir),'utf8'),digest=(await readFile(new URL('parity.sha256',dir),'utf8')).trim();assert.equal(sha256(raw),digest);
 const before=globalThis.fetch;globalThis.fetch=()=>{throw Error('Network forbidden');};
 try{for(const row of JSON.parse(raw).examples)assert.deepEqual(calc.calculate(row.input),row.expected);}finally{globalThis.fetch=before;}
});
test('manifest rejects digest, extra fields, mixed stock, duplicate documents, gaps, nonflat flow and invalid FTE',()=>{
 assert.throws(()=>createCompanyScenarioCalculator(text,'0'.repeat(64)));
 const oversized=' '.repeat(65537);assert.throws(()=>createCompanyScenarioCalculator(oversized,sha256(oversized)));
 for(const edit of [
  m=>{m.data_meta={token:'forged'};},
  m=>{m.documents[0].body.headcount++;},
  m=>{m.documents[2].body.points[1].planning_month='2027-01-01';},
  m=>{m.documents[2].body.points[0].planned_hires=1;},
  m=>{m.documents[2].body.points[0].planned_fte=100000000;},
  m=>{m.documents[2].body.points[0].planned_labor_cost_usd=null;},
  m=>{m.documents[2].body.independent_forecast_validation=true;},
  m=>{m.documents[2].body.unmodeled_gap=[];},
  m=>{m.documents[1].body.defaults.fill_rate_pct=90;},
  m=>{m.documents[1].body.bounds.annual_growth_pct.max=100;},
  m=>{m.documents[1].target='/api/scenario-modeler?business_unit=all';},
  m=>{m.documents[1]=structuredClone(m.documents[0]);},
 ]){
  const m=JSON.parse(text);edit(m);for(const d of m.documents)d.sha256=sha256(canonicalJson(d.body));const raw=JSON.stringify(m);assert.throws(()=>createCompanyScenarioCalculator(raw,sha256(raw)));
 }
});
test('request rejects unsupported scopes and numeric coercion; partial assumptions merge with public defaults',()=>{
 for(const body of [null,[],{}, {assumptions:null},{assumptions:[]},{business_unit:'BU01',assumptions:{}},{assumptions:{unknown:1}},{assumptions:{annual_growth_pct:'5'}},{assumptions:{annual_growth_pct:null}},{assumptions:{annual_growth_pct:21}},{assumptions:{salary_inflation_pct:-6}},{assumptions:{annual_attrition_pct:NaN}},{assumptions:{fill_rate_pct:Infinity}},{assumptions:{productivity_hiring_reduction_pct:51}}])assert.throws(()=>calc.calculate(body));
 const input={assumptions:{annual_growth_pct:2}},r=calc.calculate(input);assert.equal(r.assumptions.annual_growth_pct,2);assert.equal(r.assumptions.fill_rate_pct,100);assert.deepEqual(input,{assumptions:{annual_growth_pct:2}});
});
test('243 bounded combinations preserve unrounded monthly/total stock flow and finite output',()=>{
 let cases=0;
 for(const growth of [-10,0,20])for(const inflation of [-5,0,15])for(const attrition of [0,16.01,30])for(const fill of [0,50,100])for(const productivity of [0,25,50]){
  const r=calc.calculate({assumptions:{annual_growth_pct:growth,salary_inflation_pct:inflation,annual_attrition_pct:attrition,fill_rate_pct:fill,productivity_hiring_reduction_pct:productivity}}),a=r.accounting;
  assert.ok(Math.abs(a.starting_headcount+a.total_hires-a.total_exits-a.ending_headcount)<1e-7);
  for(const row of a.monthly)assert.ok(Math.abs(row.opening_headcount+row.hires-row.exits-row.closing_headcount)<1e-7);
  for(const row of r.points)for(const [key,value]of Object.entries(row))if(key!=='planning_month')assert.ok(Number.isFinite(value));
  assert.ok(r.summary.modeled_end_headcount>=0);cases++;
 }assert.equal(cases,243);
});
test('flat baseline retains zero stored flows while engine-implied gross flows remain separate',()=>{
 const manifest=JSON.parse(text),plan=manifest.documents.find(d=>d.target==='/api/workforce-planning').body;
 assert.ok(plan.points.every(r=>r.planned_hires===0&&r.planned_exits===0));
 const r=calc.calculate({assumptions:{}});assert.equal(r.summary.modeled_end_headcount,r.summary.starting_headcount);assert.ok(r.accounting.total_hires>0);assert.ok(r.accounting.total_exits>0);
 assert.ok(r.methodology.some(s=>s.includes('unmodeled')));assert.ok(r.methodology.some(s=>s.includes('not estimated capacity')));
});
