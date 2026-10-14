import test from 'node:test';import assert from 'node:assert/strict';
import {dashboardRequestedFilters,scopedDashboardResponse,readDashboardScopeReceipt} from '../lib/dashboard-scope.ts';
import {buildHomePack,homeDefinitions} from '../lib/home-pack.mjs';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {historicalSource} from './helpers/historical-source.mjs';
import {actionBinding,actionBindingKey} from '../lib/home-action-drafts.ts';
import {readBundlePreparation} from '../lib/home-bundle-preparation.ts';
import {readBundleWorkspace,attachedBundleState,attachBundlePatch} from '../lib/home-bundle-records.ts';
import {bundleInputKey} from '../lib/home-bundle-reconciliation.ts';
import {restoredBundleDraft,restoredBundleResult} from '../lib/home-pinned-goals.ts';

const meaningChanges=[
 {id:'P2',field:'population',value:'Position records by status; current total is filled + vacant, not employee counts'},
 {id:'P2',field:'limitation',value:'Current position inventory only; it does not establish hiring need or an approved change. Scenario outcomes require explicit Planning selection.'},
 {id:'F1',field:'scope',value:'Company-wide; business-unit rows; country/level filters not applied'},
 {id:'F1',field:'limitation',value:'Not salary or market pay. Cost period and refresh unknown; no annualization. BU rows are not teams or country breakdowns. Vacancy exposure sums source BU estimates, not enterprise cost/FTE × vacancies.'},
 {id:'F1',field:'selection',value:'Named business-unit matches in the latest turn first, then source order; up to 3 rows, not a ranking. Company totals unchanged; country filters unsupported.'},
];
function applyMeaning(packet,{id,field,value}){
 const source=packet.sources.find(source=>source.id===id);
 if(field==='selection')source.coverage.selection=value;else source[field]=value;
}
// Model the versioned normalizer definitions in this isolated test process. Raw
// packet labels cannot override the real normalizer, so mutating raw labels alone
// would not exercise the binding contract. Restore definitions even on failure.
async function versionedBinding(packet){
 const saved=homeDefinitions.map(def=>[...def]);
 try{
  for(const id of ['P2','F1']){
   const def=homeDefinitions.find(def=>def[0]===id),source=packet.sources.find(source=>source.id===id);
   for(const [index,field] of [[4,'scope'],[5,'population'],[6,'limitation']])def[index]=source[field];
  }
  return await actionBinding('saved-scope','Reduce turnover',packet,{});
 }finally{homeDefinitions.forEach((def,index)=>def.splice(0,def.length,...saved[index]));}
}

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

test('historical scopes and records retain provenance; each source-meaning change invalidates reuse without deleting history',async t=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/home-scope-before-post175.json',import.meta.url),'utf8'));
 assert.equal(fixture.provenance.commit,'16018a6358261699a46a8bc3918e61b25bcc9f1e');
 const historical=historicalSource(fixture.provenance.commit, `
  const {buildHomePack}=await import('./lib/home-pack.mjs');
  const {actionBinding,actionUsage,actionBindingKey}=await import('./lib/home-action-drafts.ts');
  const {createBundleDraft,bundleInputKey,reconcileBundle}=await import('./lib/home-bundle-reconciliation.ts');
  const {prepareIllustrativePilot}=await import('./lib/home-action-plan-pilot.ts');
  const {attachBundlePatch,saveBundleCalculationPatch}=await import('./lib/home-bundle-records.ts');
  const {bundleProposalFixture}=await import('./tests/fixtures/home-bundles.mjs');
  const result=[];
  for(const previous of ${JSON.stringify(fixture.cases)}){
   const packet=buildHomePack({dashboard:{status:'loaded',data:previous.data}},previous.workforceScope,'Reduce turnover');
   const binding=await actionBinding('saved-scope','Reduce turnover',packet,{}),proposal=bundleProposalFixture(binding.goal),at='2026-10-07T00:00:00Z';
   const draft=prepareIllustrativePilot(createBundleDraft(proposal.bundles[0],binding),at,{includeDeliveryEstimate:true});
   const calculated=saveBundleCalculationPatch(undefined,draft,reconcileBundle(draft)).value;
   const confirmation={confirmed:true,bindingKey:actionBindingKey(binding),inputKey:bundleInputKey(draft),acknowledgeUnknowns:true};
   const workspace=attachBundlePatch(calculated,draft,confirmation,'historical',at).value;
   const cache={version:1,binding,proposal,preparedAt:at,usage:actionUsage(null,0)};
   result.push({packet,binding,workspace,cache,confirmation});
  }
  console.log(JSON.stringify(result));
 `);
 for(const [index,previous] of fixture.cases.entries()){
  const old=historical[index],bytes=JSON.stringify(old),attachment=old.workspace.attachments[0];
  assert.equal(createHash('sha256').update(JSON.stringify(old.packet)).digest('hex'),previous.serializedSha256);
  assert.deepEqual(old.binding,previous.binding);
  assert.deepEqual(await versionedBinding(old.packet),old.binding,'original input reproduces its original binding');
  assert.deepEqual(readBundleWorkspace(old.workspace,old.binding.goalId),old.workspace);
  assert.deepEqual(readBundlePreparation(old.cache,old.binding,old.packet),old.cache);
  assert.equal(attachedBundleState(attachment,old.binding,attachment.draft),'current');
  assert.deepEqual(restoredBundleDraft(old.workspace,old.binding,'A'),attachment.draft);
  const data=scopedDashboardResponse(previous.data,previous.filters),current=buildHomePack({dashboard:{status:'loaded',data}},previous.workforceScope,'Reduce turnover');
  assert.equal(current.workforceScope,previous.workforceScope);assert.equal(current.sources[0].scope,previous.sourceScope);
  const expected=structuredClone(old.packet);meaningChanges.forEach(change=>applyMeaning(expected,change));
  assert.deepEqual(current,expected,'all workforce facts and all other fields remain exact');
  for(const change of [...meaningChanges,{id:'all',field:'five source meanings'}])await t.test(previous.name+': '+change.id+'.'+change.field,async()=>{
   const packet=structuredClone(old.packet);
   if(change.id==='all')meaningChanges.forEach(item=>applyMeaning(packet,item));else applyMeaning(packet,change);
   const binding=await versionedBinding(packet);
   assert.notEqual(binding.evidenceDigest,old.binding.evidenceDigest);
   assert.deepEqual({...binding,evidenceDigest:old.binding.evidenceDigest},old.binding);
   if(change.id==='all')assert.deepEqual(binding,await actionBinding('saved-scope','Reduce turnover',current,{}));
   assert.equal(readBundlePreparation(old.cache,binding,packet),null,'cannot reuse an old preparation');
   assert.equal(attachedBundleState(attachment,binding,attachment.draft),'context_changed');
   assert.equal(restoredBundleDraft(old.workspace,binding,'A'),null);
   const changedDraft={...structuredClone(attachment.draft),binding};
   assert.equal(restoredBundleResult(old.workspace,changedDraft),null);
   assert.throws(()=>attachBundlePatch(old.workspace,changedDraft,old.confirmation,'new','2026-10-14T00:00:00Z'),/Review this exact goal and bundle revision/);
   assert.deepEqual(readBundleWorkspace(old.workspace,old.binding.goalId),old.workspace,'historical records remain readable');
   assert.deepEqual(readBundlePreparation(old.cache,old.binding,old.packet),old.cache,'old context remains reviewable');
   assert.deepEqual(restoredBundleResult(old.workspace,attachment.draft),attachment.result);
   const reviewed={...old.confirmation,bindingKey:actionBindingKey(binding),inputKey:bundleInputKey(changedDraft)};
   assert.throws(()=>attachBundlePatch(old.workspace,changedDraft,reviewed,'new','2026-10-14T00:00:00Z'),/Explicitly replace/);
   const appended=attachBundlePatch(old.workspace,changedDraft,reviewed,'new','2026-10-14T00:00:00Z',attachment.id).value;
   assert.equal(appended.attachments.length,2);
   assert.equal(appended.attachments[1].supersedes,attachment.id);
   assert.deepEqual(appended.attachments[0],attachment,'an explicit new review preserves the old snapshot');
   assert.equal(attachedBundleState(appended.attachments[1],binding,changedDraft),'current');
   assert.equal(JSON.stringify(old),bytes,'no saved bytes rewritten');
  });
 }
});
test('only the verified all-country alias preserves caller scope; other changed labels use effective source labels',()=>{
 const current=scopedDashboardResponse(source(),filters);
 for(const requested of ['Selected workforce snapshot: Canada; Data & AI; Analyst / Specialist','Selected workforce snapshot: United States; Other unit; Analyst / Specialist','Selected workforce snapshot: United States; Data & AI; Executive','Selected workforce snapshot: Global workforce; Data & AI; Analyst / Specialist']){
  const pack=buildHomePack({dashboard:{status:'loaded',data:current}},requested);assert.equal(pack.workforceScope,current.workforce_filter_scope.label);assert.equal(pack.sources[0].facts.headcount,130);
 }
});
