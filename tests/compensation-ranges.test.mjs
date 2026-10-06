import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
import * as releaseModule from '../lib/compensation-release.ts';
import * as rangeModule from '../lib/compensation-ranges.ts';
const {makeDemoRange, rangesForScope, aggregateJobCompa, defaultRangeScope} = rangeModule;

const catalog = {jobs: [{job_profile_code:'existing-a',job_profile_name:'Existing A'},{job_profile_code:'existing-b',job_profile_name:'Existing B'}], levels:[{level_code:'L1',level_rank:1},{level_code:'L2',level_rank:2}],combinations:[{org_code:'BU1',job_profile_code:'existing-a',level_code:'L1'}]};
test('every catalog job gets all proposed levels; top BU/level filters narrow existing combinations', () => {
  const all = rangesForScope(catalog, defaultRangeScope);
  assert.equal(all.length, 4);
  assert.deepEqual(new Set(all.map(row => row.job)), new Set(catalog.jobs.map(row=>row.job_profile_code)));
  assert.equal(rangesForScope(catalog, {...defaultRangeScope, org:'BU1'}).length, 1);
  assert.equal(rangesForScope(catalog, {...defaultRangeScope, org:'BU1',level:'L2'}).length, 0);
  assert.ok(rangesForScope(catalog, {...defaultRangeScope,country:'DE'}).every(row=>row.country==='DE'&&row.currency==='USD'));
  for (const band of all) {assert.equal(band.minimum,band.midpoint*.8); assert.equal(band.maximum,band.midpoint*1.2); assert.equal(band.provenance,'synthetic_assumed_range');}
  assert.deepEqual(rangesForScope({...catalog,jobs:catalog.jobs.toReversed()},defaultRangeScope).toReversed().map(r=>r.midpoint).sort(),all.map(r=>r.midpoint).sort());
});

const bands = [makeDemoRange('A','L1',1,'US'),makeDemoRange('A','L2',8,'US')];
const people = Array.from({length:6},(_,i)=>({id:String(i),job:'A',level:bands[i%2].level,country:'US',currency:'USD',date:'2026-09-30',basis:'annual_contracted_base',annualContractedBase:bands[i%2].midpoint * (i%2 ? 1.5 : .5),fte:1,active:true}));
test('averages individual matched ratios across different midpoints, not a ratio of sums', () => {
  const result = aggregateJobCompa(people,bands)[0];
  assert.equal(result.meanPct,100);
  assert.equal(result.eligible,6); assert.equal(result.missing,0); assert.equal(result.coveragePct,100);
  assert.notEqual(100*people.reduce((sum,p)=>sum+p.annualContractedBase,0)/(3*bands[0].midpoint+3*bands[1].midpoint),result.meanPct);
  assert.equal(aggregateJobCompa(people.map(p=>({...p,fte:.5,annualContractedBase:p.annualContractedBase/2})),bands)[0].meanPct,100);
});
test('invalid, unmatched, ambiguous and expired inputs never become zero pay', () => {
  for (const change of [{annualContractedBase:null},{annualContractedBase:NaN},{annualContractedBase:0},{annualContractedBase:Infinity},{fte:0},{fte:2},{basis:'total_cost'},{currency:'EUR'},{country:'DE'},{date:'2027-09-30'},{level:'unknown'}]) {
    const bad = people.map(p=>({...p,...change}));
    assert.equal(aggregateJobCompa(bad,bands)[0].meanPct,null);
  }
  assert.equal(aggregateJobCompa(people,[...bands,...bands])[0].meanPct,null);
  assert.equal(aggregateJobCompa(people,bands.map(b=>({...b,country:'GLOBAL'})))[0].meanPct,null);
  assert.throws(()=>aggregateJobCompa([...people,people[0]],bands),/Duplicate/);
});
test('small eligible and missing cells withhold counts and metrics; larger missing coverage stays explicit', () => {
  for (const rows of [people.slice(0,4),[...people,{...people[0],id:'missing',annualContractedBase:null}]]) {
    const result=aggregateJobCompa(rows,bands)[0];
    assert.equal(result.status,'suppressed'); assert.equal(result.meanPct,null); assert.equal(result.eligible,null); assert.equal(result.missing,null);
  }
  const result=aggregateJobCompa([...people,...people.map(p=>({...p,id:'missing'+p.id,annualContractedBase:null}))],bands)[0];
  assert.equal(result.coveragePct,50); assert.equal(result.missing,6);
});

const source=fs.readFileSync(new URL('../app/api/compensation-ranges/route.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function route(resultOverrides={}) {
  const calls=[], exports={};
  const results={job_profiles:{data:catalog.jobs,count:2,error:null},position_action_structural_inventory:{data:[{...catalog.combinations[0],level_rank:1}],count:1,error:null},...resultOverrides};
  vm.runInNewContext(code,{exports,Response,require:()=>({supabaseServer:{from:name=>({select:async columns=>{calls.push([name,columns]);return results[name];}})}})});
  return {response:await exports.GET(),calls};
}
test('catalog route allowlists metadata, rejects truncated responses, sanitizes failures',async()=>{
  const {response,calls}=await route();
  assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal((await response.json()).jobs.length,2);
  assert.deepEqual(calls,[['job_profiles','job_profile_code, job_profile_name'],['position_action_structural_inventory','org_code, job_profile_code, level_code, level_rank']]);
  for(const result of [{data:catalog.jobs,count:3,error:null},{data:catalog.jobs,count:null,error:null},{data:null,error:{message:'PRIVATE'}}]) {
    const {response}=await route({job_profiles:result}); assert.equal(response.status,503); assert.doesNotMatch(await response.text(),/PRIVATE/);
  }
});

test('compact graph marks actual means, keeps a 100% reference, and hides suppressed points',()=>{
  const file=new URL('../components/compensation-job-ranges.tsx',import.meta.url);
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={}, require=createRequire(import.meta.url);
  vm.runInNewContext(js,{exports,require:name=>name==='@/lib/compensation-ranges'?rangeModule:name==='@/lib/compensation-release'?releaseModule:require(name)});
  const render=result=>renderToStaticMarkup(React.createElement(exports.JobCompaGraph,{result}));
  assert.match(render({status:'published',meanPct:105}),/105.0%/);
  assert.match(render({status:'published',meanPct:105}),/<circle/);
  assert.match(render({status:'published',meanPct:250}),/250.0%/);
  assert.doesNotMatch(render({status:'suppressed',meanPct:105}),/<circle/);
  assert.match(render(),/100%/); assert.doesNotMatch(render(),/<circle/);
});
