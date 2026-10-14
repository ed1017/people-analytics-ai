import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createAggregateArtifactProvider} from '../../lib/dataset-aggregate-artifact.mjs';
import {createFilteredAggregateArtifactProvider} from '../../lib/dataset-joint-dashboard.mjs';
import {validateAggregateRows} from '../../lib/dataset-aggregate-validation.mjs';
import {DatasetRouter} from '../../lib/dataset-router.mjs';
import {createLocalDatasetIntegration} from '../../lib/dataset-local-integration.mjs';
import {readDashboardScopeReceipt,isVerifiedDashboardScope} from '../../lib/dashboard-scope.ts';
import {homeTurnoverFocus} from '../../lib/home-turnover-focus.ts';
import {formatPercent} from '../../lib/display-format.ts';
import {homeEvidenceBindingValue} from '../../lib/home-pack.mjs';

assert.ok(process.env.DATASET_JOINT_REVIEW_ROOT,'Explicit private review directory required');
const root=process.env.DATASET_JOINT_REVIEW_ROOT,config=JSON.parse(fs.readFileSync(path.join(root,'inputs.private.json')));
const bytes=fs.readFileSync(config.artifactPath),jointBytes=fs.readFileSync(config.jointPath),referenceBytes=fs.readFileSync(config.referencePath);
const hash=v=>createHash('sha256').update(v).digest('hex');
assert.equal(hash(referenceBytes),config.expectedReferenceDigest);
const references=JSON.parse(referenceBytes),base=JSON.parse(bytes),joint=JSON.parse(jointBytes);
const scopeFields=['country','org','level'];
const scopeKey=filters=>JSON.stringify(scopeFields.map(field=>filters[field]));
const declaredScopes=['all',...joint.dimensions.country].flatMap(country=>
 ['all',...joint.dimensions.org].flatMap(org=>['all',...joint.dimensions.level].map(level=>({country,org,level}))));
const expectedScopeKeys=new Set(declaredScopes.map(scopeKey));
assert.deepEqual(scopeFields.map(field=>joint.dimensions[field].length),[10,8,12]);
assert.equal(declaredScopes.length,1287);assert.equal(expectedScopeKeys.size,1287);
const expectedDates=Array.from({length:33},(_,i)=>new Date(Date.UTC(2024,i+1,0)).toISOString().slice(0,10));
assert.deepEqual(joint.dates,expectedDates);assert.equal(expectedScopeKeys.size*expectedDates.length,42471);
function assertCompleteReferenceCoverage(rows){
 assert.equal(rows.length,1287,'Complete scope reference count');
 const seen=new Set();let observations=0;
 for(const row of rows){
  assert.deepEqual(Object.keys(row.filters).sort(),[...scopeFields].sort(),'Exact scope fields');
  const key=scopeKey(row.filters);
  assert.ok(expectedScopeKeys.has(key),'Declared scope tuple');
  assert.ok(!seen.has(key),'Duplicate scope reference');seen.add(key);
  assert.deepEqual(row.trend.map(point=>point.snapshot_date),expectedDates,'Complete unique monthly calendar');
  observations+=row.trend.length;
 }
 assert.deepEqual(seen,expectedScopeKeys,'Complete scope tuple inventory');
 assert.equal(observations,42471,'Complete monthly observation count');
}
const referenceRows=Object.values(references);
assertCompleteReferenceCoverage(referenceRows);
const load=overrides=>createFilteredAggregateArtifactProvider({bytes,jointBytes,expectedArtifactDigest:config.expectedArtifactDigest,expectedDatasetDigest:config.expectedDatasetDigest,expectedJointDigest:config.expectedJointDigest,...overrides});
const loadBase=value=>{const changed=Buffer.from(JSON.stringify(value));return createAggregateArtifactProvider({bytes:changed,expectedArtifactDigest:hash(changed),expectedDatasetDigest:config.expectedDatasetDigest});};
const mutateJoint=edit=>{const value=structuredClone(joint);edit(value);const changed=Buffer.from(JSON.stringify(value));return load({jointBytes:changed,expectedJointDigest:hash(changed)});};
const candidate=await load(),id=candidate.provider.datasetId,token=id+':2';
const router=new DatasetRouter({[id]:candidate.provider},{read:async()=>({datasetId:id,digest:config.expectedDatasetDigest,generation:2})});
const integration=createLocalDatasetIntegration({router,candidateDatasetId:id,analytics:candidate.analytics});
const request=filters=>new Request('http://fixture.invalid/api/dashboard?'+new URLSearchParams(filters),{headers:{'x-workforce-dataset':token}});
const call=async filters=>{const r=await integration.handle(request(filters));assert.equal(r.status,200);return r.json();};

test('all 1287 API scopes and 42471 months match independent interval SQL references',async()=>{
 const actualScopes=new Set();let actualMonths=0;
 for(const expected of referenceRows){
  const actual=await call(expected.filters);
  assert.deepEqual(actual.overview,expected.overview);
  assert.deepEqual(actual.trend,expected.trend);
  assert.deepEqual(actual.turnover_evidence,expected.turnover_evidence);
  const receipt=readDashboardScopeReceipt(actual.workforce_filter_scope);
  assert.equal(receipt.status,'verified_aggregate');assert.equal(isVerifiedDashboardScope(receipt),true);
  assert.deepEqual(receipt.effective,expected.filters);assert.equal(receipt.artifactDigest,config.expectedJointDigest);
  const key=scopeKey(receipt.effective);assert.ok(!actualScopes.has(key),'Duplicate served scope');actualScopes.add(key);actualMonths+=actual.trend.length;
  assert.equal(actual.data_meta.dashboardAggregateDigest,config.expectedJointDigest);
  if(expected.filters.country!=='all'||expected.filters.level!=='all')assert.equal(actual.performance_rating,null);
 }
 assert.deepEqual(actualScopes,expectedScopeKeys);assert.equal(actualScopes.size,1287);assert.equal(actualMonths,42471);
});

test('reference coverage rejects missing, duplicate and undeclared scopes and months',()=>{
 assert.throws(()=>assertCompleteReferenceCoverage(referenceRows.slice(1)),/Complete scope reference count/);
 assert.throws(()=>assertCompleteReferenceCoverage([...referenceRows.slice(0,-1),referenceRows[0]]),/Duplicate scope reference/);
 const unknown={...referenceRows[0],filters:{...referenceRows[0].filters,country:'UNKNOWN'}};
 assert.throws(()=>assertCompleteReferenceCoverage([unknown,...referenceRows.slice(1)]),/Declared scope tuple/);
 for(const trend of [referenceRows[0].trend.slice(1),[...referenceRows[0].trend.slice(0,-1),referenceRows[0].trend[0]]]){
  assert.throws(()=>assertCompleteReferenceCoverage([{...referenceRows[0],trend},...referenceRows.slice(1)]),/Complete unique monthly calendar/);
 }
});

test('all 155 empty scopes retain verified zero stock and unavailable rates stay null',async()=>{
 const empty=Object.values(references).filter(r=>r.overview.headcount===0);assert.equal(empty.length,155);
 let missing=0,available=0;
 for(const e of empty){
  const r=await call(e.filters);assert.equal(r.workforce_filter_scope.stockStatus,'known-empty');
  assert.equal(r.overview.headcount,0);assert.equal(r.overview.fte,0);assert.equal(r.overview.labor_cost_usd,0);
  assert.equal(r.overview.open_positions,e.overview.open_positions);assert.equal(r.trend.length,33);assert.equal(r.trend.at(-1).headcount,0);
  if(e.turnover_evidence.status==='unavailable-zero-denominator'){missing++;assert.equal(r.overview.voluntary_turnover_ytd_pct,null);assert.equal(formatPercent(r.overview.voluntary_turnover_ytd_pct),'Unavailable');}
  else{available++;assert.equal(r.overview.voluntary_turnover_ytd_pct,e.overview.voluntary_turnover_ytd_pct);}
  await router.request(request(e.filters),async()=>{await assert.rejects(integration.conversationProjectionInputs(e.filters,new AbortController().signal),/verified empty cohort/);return Response.json({});});
 }
 assert.equal(missing+available,155);assert.ok(missing>0&&available>0);
});

test('declared nine-month denominator resolves all three rates without clamping',async()=>{
 for(const [country,org,rate]of [['DE','BU-CORP',180],['JP','BU-MGSVC',150],['US','BU-DIGITAL',300]]){
  const r=await call({country,org,level:'L11'});assert.equal(r.overview.voluntary_turnover_ytd_pct,rate);
  assert.equal(r.turnover_evidence.calendar_months,9);assert.equal(r.turnover_evidence.voluntary_exits,1);
 }
 const company=await call({country:'all',org:'all',level:'all'});assert.deepEqual(company.overview,base.aggregates.dashboard[0].payload.overview);
 assert.equal(company.overview.voluntary_turnover_ytd_pct,6.3);
});

test('Home preserves known empty stock, null rates and rates above 100%',async()=>{
 for(const [filters,rate]of [[{country:'all',org:'all',level:'L12'},null],[{country:'DE',org:'BU-CORP',level:'L11'},180]]){
  const query='?'+new URLSearchParams(filters);
  let result;await router.request(request(filters),async()=>{result=await integration.homeGrounding(query,'voluntary turnover');return Response.json({});});
  const w=result.pack.sources.find(r=>r.id==='W1');assert.equal(w.status,'loaded');
  assert.equal(w.facts.voluntary_turnover_ytd_pct,rate);assert.deepEqual(result.pack.datasetContext.filters,filters);
  assert.equal(result.pack.datasetContext.dashboardAggregate.artifactDigest,config.expectedJointDigest);
  assert.equal(homeEvidenceBindingValue(result.pack).datasetContext.dashboardAggregate.artifactDigest,config.expectedJointDigest);
  const focus=homeTurnoverFocus('voluntary turnover',result.pack,query);
  assert.ok(focus);if(rate!==null)assert.match(JSON.stringify(focus),/180/);
 }
});

test('positive scoped projection inputs bind the new aggregate digest and omit company plan assumptions',async()=>{
 const filters={country:'US',org:'BU-TECH',level:'L6'};let input;
 await router.request(request(filters),async()=>{input=await integration.conversationProjectionInputs(filters,new AbortController().signal);return Response.json({});});
 assert.equal(input.opening,14);assert.deepEqual(input.relations,['dashboard-joint-v2:'+config.expectedJointDigest]);
 assert.equal(input.defaults,null);assert.deepEqual(input.baseline,[]);
});

test('unsupported and duplicate filters never become a zero cohort',async()=>{
 const response=await call({country:'NL',org:'all',level:'all'});assert.equal(response.overview,null);assert.equal(response.performance_rating,null);assert.equal(response.workforce_filter_scope.status,'unsupported');
 for(const suffix of ['country=US&country=DE','country=US&employee_id=private']){
  const response=await integration.handle(new Request('http://fixture.invalid/api/dashboard?'+suffix,{headers:{'x-workforce-dataset':token}}));assert.notEqual(response.status,200);
 }
 assert.equal(readDashboardScopeReceipt({...candidate.analytics.dashboardResponse({country:'all',org:'all',level:'all'}).workforce_filter_scope,private_note:'not allowed'}),null);
});

for(const name of Object.keys(base.aggregates))test('reject unknown row field in '+name,()=>{
 const bad=structuredClone(base);bad.aggregates[name][0].private_email='not-exportable';
 assert.throws(()=>validateAggregateRows(bad.aggregates,bad.components),/fields/);
});

test('matching new hashes do not authorize extra fields or invented 10000 population',async()=>{
 for(const edit of [v=>{v.aggregates.workforce_current_summary[0].headcount=10000;v.aggregates.workforce_current_summary[0].private_email='not-exportable';},v=>{v.aggregates.workforce_current_summary[0].headcount=10000;},v=>{v.aggregates.workforce_business_unit_summary[0].headcount++;},v=>{v.aggregates.dashboard[0].payload.overview.headcount=10000;}]){
  const bad=structuredClone(base);edit(bad);await assert.rejects(loadBase(bad),/Aggregate contract/);
 }
});

test('nested private fields, text substitution, null coercion and duplicate rows reject',()=>{
 const edits=[v=>v.aggregates.dashboard[0].payload.trend[0].private_name='not-exportable',v=>v.aggregates.dashboard[0].payload.filter_options.countries[0].private_name='not-exportable',v=>v.aggregates.planning_catalog[0].assumptions[0].private_name='not-exportable',v=>v.aggregates.talent_catalog[0].requirements[0].private_name='not-exportable',v=>v.aggregates.role_recruiting_timing[0].opening_to_start.private_name='not-exportable',v=>v.aggregates.workforce_business_unit_summary[0].org_name='Private Person',v=>v.aggregates.workforce_current_summary[0].headcount='9847',v=>v.aggregates.workforce_current_summary[0].headcount=null,v=>v.aggregates.workforce_current_summary[0].headcount=9847.1,v=>v.aggregates.workforce_business_unit_summary.push({...v.aggregates.workforce_business_unit_summary[0]})];
 for(const edit of edits){const bad=structuredClone(base);edit(bad);assert.throws(()=>validateAggregateRows(bad.aggregates,bad.components),/Aggregate contract/);}
});

test('rehashing inconsistent joint stock, events, dates, dimensions and unknown fields rejects',async()=>{
 for(const edit of [v=>{v.private_note='not-exportable';},v=>{v.dimensions.private_note='not-exportable';},v=>{v.cells[0].push('not-exportable');},v=>{v.flows[0].push('not-exportable');},v=>{v.cells[0][3][1]++;},v=>{v.cells[0][0]++;},v=>{v.cells[0][2]++;},v=>{v.flows[0][2]++;},v=>{v.flows[0][3]=-1;},v=>{v.flows.push([...v.flows[0]]);},v=>{v.dates[0]='2024-02-01';},v=>{v.dimensions.country[1]='NL';},v=>{v.metricContract='positive-months-only';},v=>{v.cells[0][3][2]=100000000;}])await assert.rejects(mutateJoint(edit),/Joint aggregate contract/);
});

test('immutable reviewed input and no activation or network',async()=>{
 assert.equal(candidate.provider.certificate,'LOCAL-ONLY-SEALED:'+config.expectedDatasetDigest);
 assert.equal(candidate.artifact.publicationApproved,false);assert.equal(candidate.artifact.independentForecastValidation,false);
 assert.equal(candidate.artifact.emptyScopeCount,155);
 const r=await candidate.analytics.read('dashboard',['US','BU-TECH','L6']);assert.throws(()=>{r[0].payload.overview.headcount=10000;},TypeError);
 assert.equal(globalThis.__offlineNetworkAttempts,0);
});
