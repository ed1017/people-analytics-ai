import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const source=readFileSync(new URL('../components/workforce-planning/position-market-context.tsx',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
function harness(){let expanded=false;const mod={exports:{}},react={...React,useState:()=>[expanded,value=>expanded=typeof value==='function'?value(expanded):value]};vm.runInNewContext(code,{module:mod,exports:mod.exports,require:n=>n==='react'?react:n==='@/components/decision-store'?{}:n==='@/lib/position-finance-store'?{}:n==='@/lib/position-market-context'?{}:require(n)});return reference=>mod.exports.PositionMarketFacts({reference});}

import {usProductCareerReferences} from '../lib/position-us-product-career.ts';
const nodes=n=>!n||typeof n!=='object'?[]:Array.isArray(n)?n.flatMap(nodes):[n,...nodes(n.props?.children)];
test('federal product tasks retain optional scope without England copy or quantitative ratings',()=>{
 const ref=usProductCareerReferences()[0],render=harness(),before=JSON.stringify(ref);let tree=render(ref),html=renderToStaticMarkup(tree);
 assert.match(html,/U.S. federal early-career digital-service guidance/);assert.match(html,/Work may include/);assert.doesNotMatch(html,/England|UK-wide|progressbar/);assert.match(html,/not national occupational requirements/);assert.equal(nodes(tree).filter(n=>n.type==='li').length,3);
 nodes(tree).find(n=>n.type==='button').props.onClick();tree=render(ref);assert.deepEqual(nodes(tree).filter(n=>n.type==='li').map(n=>n.props.children),ref.facts.tasks);assert.equal(JSON.stringify(ref),before);assert.equal(ref.facts.tasks.length,5);assert.equal(ref.facts.skills.length,0);
 html=renderToStaticMarkup(tree);assert.ok(html.includes(ref.sourceUrl));assert.ok(html.includes(ref.licenceUrl));assert.match(html,/Published or updated: Unavailable/);
});
