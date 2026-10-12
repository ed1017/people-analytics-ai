import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {buildFinanceCurrent} from '../lib/finance-current.ts';
import {buildHomePack,normalizeHomePack,HOME_SOURCE_BYTES} from '../lib/home-pack.mjs';
import {actionEvidenceCatalog} from '../lib/home-action-proposal.ts';
import {homeAnswerScopeViolation} from '../lib/home-answer-scope.ts';
import {verifySolutionEvidence} from '../lib/home-solution-grounding.mjs';
import {solutionRequest} from './fixtures/home-solution-conversation.mjs';

const row=(name,index,extra={})=>({org_code:'BU-'+index,org_name:name,org_type:'business_unit',headcount:10,fte:8,labor_cost_usd:800000,cost_per_fte_usd:100000,vacant_positions:2,estimated_vacancy_cost_exposure_usd:150000,...extra});
const rows=()=>['Consulting','Operations','Corporate','Engineering Services','Engineering','Data & AI'].map((name,index)=>row(name,index));
const data=()=>({as_of:'2026-09-30',...buildFinanceCurrent(rows())});
const packet=(goal='Review C: What is Engineering labor cost and cost per FTE?',value=data())=>buildHomePack({finance:{status:'loaded',data:value}},'Company-wide',goal);
const finance=pack=>pack.sources.find(source=>source.id==='F1');

test('Review C: requested Engineering survives truncation with exact identity and all company totals',()=>{
 const f=finance(packet());
 assert.equal(f.facts.rows[0].org_name,'Engineering');assert.equal(f.facts.rows[0].org_code,'BU-4');
 assert.equal(f.facts.rows[0].labor_cost_usd,800000);assert.equal(f.facts.rows[0].cost_per_fte_usd,100000);
 assert.equal(f.facts.labor_cost_usd,4800000);assert.equal(f.facts.headcount,60);
 assert.equal(f.coverage.rowsAvailable,6);assert.equal(f.coverage.rowsIncluded,3);assert.equal(f.coverage.detailTruncated,true);
 assert.match(f.coverage.selection,/Named business-unit matches in the latest turn first/);assert.match(f.scope,/Company-wide.*country\/level filters not applied/);
 assert.equal(finance(packet('Inspect BU-5')).facts.rows[0].org_name,'Data & AI');
 assert.deepEqual(normalizeHomePack(packet()),packet());
 assert.equal(finance(packet('Corporate Consulting Operations\n\nCURRENT USER TURN:\nNow Engineering')).facts.rows[0].org_name,'Engineering');
 assert.equal(finance(packet('Engineering Services')).facts.rows[0].org_name,'Engineering Services');
});
test('unknowns, zeros, source period and identity survive the allowlist without private fields',()=>{
 const d=data();Object.assign(d.by_business_unit.find(row=>row.org_name==='Engineering'),{labor_cost_usd:null,cost_per_fte_usd:null,vacant_positions:0,base_salary:50000,employee_id:'PRIVATE'});
 const f=finance(packet(undefined,d)),r=f.facts.rows[0];
 assert.equal(r.labor_cost_usd,null);assert.equal(r.cost_per_fte_usd,null);assert.equal(r.vacant_positions,0);
 assert.equal(f.date,'2026-09-30');assert.equal(f.facts.currency,'USD');assert.equal(f.facts.cost_period,null);assert.equal(f.facts.source_refreshed_at,null);
 assert.equal(f.facts.source,'finance_current_summary');assert.doesNotMatch(JSON.stringify(f),/PRIVATE|base_salary|employee_id/);
 assert.ok(Buffer.byteLength(JSON.stringify(f.facts))<=HOME_SOURCE_BYTES);
 assert.equal(finance(packet('',{current:{},by_business_unit:[]})).status,'unavailable');
});
test('byte trimming keeps the requested row first and never clips organizational identity into a different name',()=>{
 const d=data();d.by_business_unit=d.by_business_unit.map((r,index)=>({...r,org_name:index===5?'Engineering':'Long unit '+('界'.repeat(150)),org_code:'BU-'+index}));
 const f=finance(packet('Engineering',d));assert.equal(f.facts.rows[0].org_name,'Engineering');
 assert.ok(f.coverage.rowsIncluded<3);assert.equal(f.coverage.rowsAvailable,6);assert.equal(f.coverage.detailTruncated,true);
 assert.ok(Buffer.byteLength(JSON.stringify(f.facts))<=HOME_SOURCE_BYTES);
 d.by_business_unit[5].org_name='E'.repeat(161);
 const invalid=finance(packet('E'.repeat(161),d));assert.equal(invalid.facts.rows.some(r=>r.org_name==='E'.repeat(160)),false);
});
test('complete nullable aggregates do not invent zero, rates, salary or enterprise-average exposure',()=>{
 const d=buildFinanceCurrent([row('Engineering',1,{labor_cost_usd:null,cost_per_fte_usd:null,estimated_vacancy_cost_exposure_usd:null}),row('Operations',2)]);
 assert.equal(d.current.labor_cost_usd,null);assert.equal(d.current.cost_per_fte_usd,null);assert.equal(d.current.estimated_vacancy_cost_exposure_usd,null);
 assert.equal(d.by_business_unit[1].share_of_enterprise_labor_cost_pct,null);assert.equal(d.cost_period,null);
 for(const value of [null,undefined,'',NaN,-1])assert.equal(buildFinanceCurrent([row('Engineering',1,{vacant_positions:value})]).current.vacant_positions,null);
 assert.equal(buildFinanceCurrent([row('Engineering',1,{vacant_positions:0})]).current.vacant_positions,0);
 assert.equal(data().current.estimated_vacancy_cost_exposure_usd,900000);assert.notEqual(data().current.cost_per_fte_usd*data().current.vacant_positions,900000);
 assert.throws(()=>buildFinanceCurrent([row('Engineering',1),row('Duplicate',1)]),/scope/);
 assert.throws(()=>buildFinanceCurrent([row('Company',1,{org_type:'company'})]),/scope/);
});
test('field references distinguish total cost from cost/FTE; unsupported countries and wrong rows fail',()=>{
 const p=packet(),catalog=actionEvidenceCatalog(p);
 assert.equal(catalog.find(r=>r.id==='F1:row:0:labor_cost_usd').location,'facts.rows[0].labor_cost_usd');
 assert.equal(catalog.find(r=>r.id==='F1:row:0:cost_per_fte_usd').location,'facts.rows[0].cost_per_fte_usd');
 assert.equal(homeAnswerScopeViolation('Engineering labor cost is 800000 USD [F1:row:0:labor_cost_usd].',p),false);
 for(const answer of ['Engineering labor cost is 4800000 USD [F1:summary:labor_cost_usd].','Engineering labor cost is 800000 USD [F1:row:1:labor_cost_usd].','US labor cost is 800000 USD [F1:row:0:labor_cost_usd].','Engineering salary is 100000 USD [F1:row:0:base_salary].','Engineering labor cost is 800000 USD [F1:row:0:missing, F1:row:0:labor_cost_usd].'])assert.equal(homeAnswerScopeViolation(answer,p),true,answer);
 assert.equal(homeAnswerScopeViolation('US costs are unavailable; company-wide labor cost is 4800000 USD [F1:summary:labor_cost_usd].',p),false);
 const d=data();d.by_business_unit.find(row=>row.org_name==='Engineering').labor_cost_usd=null;assert.equal(actionEvidenceCatalog(packet(undefined,d)).some(r=>r.id==='F1:row:0:labor_cost_usd'),false);
});
test('fresh validation accepts non-first selected BU but rejects value, date, identity and row substitution',async()=>{
 const original=data(),body=solutionRequest('Review C: Engineering labor cost');body.evidence=packet();
 const verify=value=>verifySolutionEvidence(body,{datasetToken:'legacy-v1:0',read:async key=>{assert.equal(key,'finance');return {status:'loaded',data:value};}},new AbortController().signal);
 assert.equal((await verify(original)).sources.find(s=>s.id==='F1').basis,'database-backed-aggregate');
 for(const change of [d=>d.by_business_unit.find(row=>row.org_name==='Engineering').labor_cost_usd++,d=>d.by_business_unit.find(row=>row.org_name==='Engineering').org_code='BU-OTHER',d=>d.by_business_unit.find(row=>row.org_name==='Engineering').org_name='Other Engineering',d=>d.as_of='2026-08-31',d=>d.by_business_unit.pop()]){const d=structuredClone(original);change(d);await assert.rejects(verify(d));}
});
test('actual Finance route uses existing aggregate queries and preserves null source fields',async()=>{
 const source=fs.readFileSync(new URL('../app/api/finance/route.ts',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,exports={},calls=[];
 const supabaseServer={from:name=>({select:columns=>{calls.push({name,columns});return name==='finance_current_summary'?Promise.resolve({data:[row('Engineering',1,{labor_cost_usd:null,cost_per_fte_usd:null})]}):{eq:async()=>({data:[]})};}})};
 vm.runInNewContext(code,{exports,console,Response,require:name=>{
  if(name==='../../../lib/supabase-server')return {supabaseServer};
  if(name==='../../../lib/finance-current')return {buildFinanceCurrent};
  if(name==='@/lib/dataset-runtime')return {withDatasetRequest:(_request,handler)=>handler()};
  if(name==='next/server')return {NextResponse:Response};throw Error('Unexpected module '+name);
 }});
 const response=await exports.GET(new Request('http://offline/api/finance?country=US'));
 assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const value=await response.json();
 assert.equal(value.current.labor_cost_usd,null);assert.equal(value.by_business_unit[0].org_code,'BU-1');assert.equal(value.currency,'USD');assert.equal(value.cost_period,null);
 assert.deepEqual(calls.map(c=>c.name),['finance_current_summary','workforce_scenario_summary']);assert.doesNotMatch(calls[0].columns,/employee|salary/);
});

test('overlapping BU names resolve the longest actual mention and retain wrong-BU rejection',()=>{
 const p=packet('Engineering Services and Engineering');
 const f=finance(p),services=f.facts.rows.findIndex(r=>r.org_name==='Engineering Services'),engineering=f.facts.rows.findIndex(r=>r.org_name==='Engineering');
 assert.equal(homeAnswerScopeViolation(`Engineering Services labor cost is 800000 USD [F1:row:${services}:labor_cost_usd].`,p),false);
 assert.equal(homeAnswerScopeViolation(`Engineering Services labor cost is 800000 USD [F1:row:${engineering}:labor_cost_usd].`,p),true);
 assert.equal(homeAnswerScopeViolation(`Engineering labor cost is 800000 USD [F1:row:${services}:labor_cost_usd].`,p),true);
 assert.equal(homeAnswerScopeViolation(`Engineering Services and Engineering labor costs are 800000 USD each [F1:row:${services}:labor_cost_usd].`,p),true);
});
