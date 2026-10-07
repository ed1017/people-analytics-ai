import test from 'node:test';import assert from 'node:assert/strict';
import {dashboardRequestedFilters,scopedDashboardResponse,readDashboardScopeReceipt} from '../lib/dashboard-scope.ts';
import {buildHomePack} from '../lib/home-pack.mjs';
const options={countries:[{value:'US',label:'United States'},{value:'CA',label:'Canada'}],business_units:[{value:'BU-DATAAI',label:'Data & AI'}],levels:[{value:'IC2',label:'Analyst / Specialist'}]};
const source=()=>({filter_options:options,overview:{snapshot_date:'2026-09-30',headcount:130,fte:129.8,voluntary_turnover_ytd_pct:3.2},trend:[{snapshot_date:'2026-09-30',headcount:130,fte:129.8}]});
const filters=dashboardRequestedFilters(new URLSearchParams('country=US&org=BU-DATAAI&level=IC2'));
test('dashboard receipt uses the inspected RPC contract and returned catalogue, never a client label',()=>{
 const data=scopedDashboardResponse(source(),filters);assert.equal(data.workforce_filter_scope.status,'verified_rpc');assert.deepEqual(data.workforce_filter_scope.effective,filters);assert.equal(data.workforce_filter_scope.label,'United States; Data & AI; Analyst / Specialist');assert.match(data.workforce_filter_scope.basis,/Not an independent database attestation/);
 const pack=buildHomePack({dashboard:{status:'loaded',data}},'Canada; Made-up department; Executive');assert.equal(pack.workforceScope,data.workforce_filter_scope.label);assert.equal(pack.sources[0].facts.headcount,130);assert.match(pack.sources[0].scope,/United States/);
});
test('unsupported requested scope and empty scoped observations stay unavailable, never zero',()=>{
 for(const [raw,request,status] of [[source(),{...filters,country:'ZZ'},'unsupported'],[{...source(),overview:{...source().overview,headcount:0,voluntary_turnover_ytd_pct:0},trend:[]},filters,'unavailable']]){
  const data=scopedDashboardResponse(raw,request);assert.equal(data.workforce_filter_scope.status,status);assert.equal(data.workforce_filter_scope.effective,null);assert.equal(data.overview,null);assert.deepEqual(data.trend,[]);
  const pack=buildHomePack({dashboard:{status:'loaded',data}},'United States; Data & AI; Analyst / Specialist');assert.equal(pack.sources[0].facts,null);assert.equal(pack.sources[0].status,'unavailable');assert.equal(pack.workforceScope,'Scope unavailable');
 }
});
test('mismatched or partial applied_filters cannot be ignored or become a requested-scope receipt',()=>{
 for(const applied_filters of [{country:'CA',org:filters.org,level:filters.level},{country:'US'},{country:null,org:null,level:null}]){
  const data=scopedDashboardResponse({...source(),applied_filters},filters);assert.equal(data.workforce_filter_scope.status,'mismatch');assert.equal(data.overview,null);
 }
 assert.equal(scopedDashboardResponse({...source(),applied_filters:filters},filters).workforce_filter_scope.status,'verified_rpc');
});
test('missing or contradictory scope receipts withhold filtered Home facts',()=>{
 for(const data of [source(),{...source(),workforce_filter_scope:{version:1,status:'verified_rpc',requested:filters,effective:{...filters,country:'CA'},label:'United States',basis:'invalid fixture'}}]){
  const pack=buildHomePack({dashboard:{status:'loaded',data}},'United States; All business units; All levels');assert.equal(pack.sources[0].facts,null);assert.equal(pack.workforceScope,'Scope unavailable');
 }
 assert.equal(readDashboardScopeReceipt({version:1,status:'verified_rpc',requested:filters,effective:null,label:'US',basis:'missing'}),null);
});

test('verified unchanged global and US scope retain the actual pre-fix serialized evidence and saved-plan binding',async()=>{
 const {readFile}=await import('node:fs/promises'),{createHash}=await import('node:crypto'),{actionBinding}=await import('../lib/home-action-drafts.ts');
 const fixture=JSON.parse(await readFile(new URL('./fixtures/home-scope-before-post175.json',import.meta.url),'utf8'));
 assert.equal(fixture.provenance.commit,'16018a6358261699a46a8bc3918e61b25bcc9f1e');
 for(const previous of fixture.cases){
  const data=scopedDashboardResponse(previous.data,previous.filters),pack=buildHomePack({dashboard:{status:'loaded',data}},previous.workforceScope,'Reduce turnover');
  assert.equal(pack.workforceScope,previous.workforceScope,previous.name);assert.equal(pack.sources[0].scope,previous.sourceScope,previous.name);
  assert.equal(createHash('sha256').update(JSON.stringify(pack)).digest('hex'),previous.serializedSha256,previous.name+' serialized evidence unchanged');
  assert.deepEqual(await actionBinding('saved-scope','Reduce turnover',pack,{}),previous.binding,previous.name+' saved binding unchanged');
 }
});
test('only the verified all-country alias preserves caller scope; other changed labels use effective source labels',()=>{
 const current=scopedDashboardResponse(source(),filters);
 for(const requested of ['Selected workforce snapshot: Canada; Data & AI; Analyst / Specialist','Selected workforce snapshot: United States; Other unit; Analyst / Specialist','Selected workforce snapshot: United States; Data & AI; Executive','Selected workforce snapshot: Global workforce; Data & AI; Analyst / Specialist']){
  const pack=buildHomePack({dashboard:{status:'loaded',data:current}},requested);assert.equal(pack.workforceScope,current.workforce_filter_scope.label);assert.equal(pack.sources[0].facts.headcount,130);
 }
});
