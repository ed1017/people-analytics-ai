import * as catalogDisplay from '../lib/catalog-display.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as rangeContext from '../lib/compensation-range-context.ts';
import * as releaseContext from '../lib/compensation-release-context.ts';
import * as datasetClient from '../lib/dataset-client.mjs';
import {AssumptionsDisclosure} from './fixtures/assumptions-disclosure.mjs';

// Invented minimal catalog, exercising the policy identifier asserted by the
// captured 9037 company-presenter contract. No private payload is used.
const catalog = {
  jobs: [{job_profile_code:'test-job',job_profile_name:'Test job'}],
  levels: [{level_code:'L1',level_rank:1}],
  combinations: [{org_code:'TEST',job_profile_code:'test-job',level_code:'L1'}],
  constructedPolicy: {version:'constructed-9037-inherited-range-policy-v1',bands:[
    {job:'test-job',level:'L1',minimum:80000,midpoint:100000,maximum:120000,effectiveFrom:'2010-01-01'},
  ]},
};
const source=fs.readFileSync(new URL('../components/compensation-job-ranges.tsx',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={},require=createRequire(import.meta.url);
vm.runInNewContext(js,{exports,require:name=>name==='@/lib/catalog-display'?catalogDisplay:name==='@/components/assumptions-disclosure'?{AssumptionsDisclosure}:name==='@/lib/dataset-client.mjs'?datasetClient:name==='@/lib/compensation-range-context'?rangeContext:name==='@/lib/compensation-release-context'?releaseContext:require(name)});
const render=value=>renderToStaticMarkup(React.createElement(exports.JobRangeTable,{catalog:value,scope:rangeContext.defaultRangeScope,releaseRows:null}));

test('9037 inherited policy renders stored bands without publishing compa-ratios',()=>{
  const html=render(catalog);
  assert.match(html,/Test job/);
  assert.match(html,/\$100,000/);
  assert.match(html,/Unavailable/);
  assert.doesNotMatch(html,/<circle/);
  const bands=rangeContext.rangesForScope(catalog,rangeContext.defaultRangeScope);
  assert.equal(bands[0].version,catalog.constructedPolicy.version);
  assert.equal(bands[0].midpoint,100000);
  assert.equal(rangeContext.rangesForScope(catalog,{...rangeContext.defaultRangeScope,org:'OTHER'}).length,0);
});

test('unknown policies and missing, duplicate or invalid bands stay unavailable inside the table',()=>{
  const policy=catalog.constructedPolicy;
  for(const constructedPolicy of [
    {...policy,version:'unreviewed-policy'},
    {...policy,bands:[]},
    {...policy,bands:[...policy.bands,...policy.bands]},
    {...policy,bands:[{...policy.bands[0],minimum:-1}]},
  ]) {
    const invalid={...catalog,constructedPolicy};
    assert.throws(()=>rangeContext.rangesForScope(invalid,rangeContext.defaultRangeScope));
    const html=render(invalid);
    assert.match(html,/Job range catalog unavailable/);
    assert.doesNotMatch(html,/\$100,000|<circle/);
  }
});

test('catalog labels omit the prefix without changing join keys or stored band amounts',()=>{
 const original=structuredClone(catalog);original.jobs[0].job_profile_name='Demo AI-ARCH';original.levels[0].level_code='Demo level 1';original.combinations[0].level_code='Demo level 1';original.constructedPolicy.bands[0].level='Demo level 1';const before=JSON.stringify(original);
 const html=render(original);assert.match(html,/>AI Architect<\/th>/);assert.match(html,/>level 1<\/p>/);assert.match(html,/\$100,000/);assert.doesNotMatch(html,/Demo AI-ARCH|Demo level 1/);assert.equal(JSON.stringify(original),before);
 const bands=rangeContext.rangesForScope(original,rangeContext.defaultRangeScope);assert.equal(bands[0].job,'test-job');assert.equal(bands[0].level,'Demo level 1');assert.equal(bands[0].midpoint,100000);
});
