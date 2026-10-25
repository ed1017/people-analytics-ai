import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';import ts from 'typescript';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import * as display from '../lib/capacity-display.ts';
const require=createRequire(import.meta.url);
test('capacity balance states direction explicitly without changing signed values',()=>{
 for(const [value,label]of [[4,'Short 4 FTE'],[-2.5,'Surplus 2.5 FTE'],[0,'Capacity matched'],[null,'Unknown'],[0.001,'Short <0.01 FTE'],[-0.001,'Surplus <0.01 FTE']])assert.equal(display.capacityBalanceLabel(value),label);
});
test('shortfall shading clips crossings and skips unknown or surplus intervals',()=>{
 const p=(requiredFte,allocatedFte)=>({requiredFte,allocatedFte});
 assert.deepEqual(display.capacityShortfallAreas([p(5,8),p(5,9)]),[]);
 assert.deepEqual(display.capacityShortfallAreas([p(5,2),p(null,3),p(5,2)]),[]);
 assert.deepEqual(display.capacityShortfallAreas([p(5,5)]),[]);
 const points=[p(6,4),p(4,6)],before=structuredClone(points),areas=display.capacityShortfallAreas(points);
 assert.deepEqual(areas,[[{x:0,y:6},{x:.5,y:5},{x:.5,y:5},{x:0,y:4}]]);assert.deepEqual(points,before);
 assert.deepEqual(display.capacityShortfallAreas(points.toReversed()),[[{x:.5,y:5},{x:1,y:6},{x:1,y:4},{x:.5,y:5}]]);
});
test('rendered capacity chart distinguishes required, available and shortfall with accessible monthly detail',()=>{
 const exports={};const code=ts.transpileModule(fs.readFileSync(new URL('../components/workforce-planning/capacity-projection.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:id=>id==='@/lib/capacity-display'?display:id.endsWith('.module.css')?{default:{}}:require(id)});
 for(const gap of [3,-3,0,null]){
  const result={points:[{month:'2026-10',requiredFte:6,allocatedFte:4,gapFte:2},{month:'2026-11',requiredFte:gap===null?null:5,allocatedFte:gap===null?null:5-gap,gapFte:gap}]},before=structuredClone(result);
  const html=renderToStaticMarkup(React.createElement(exports.CapacityProjection,{result}));
  assert.ok(html.includes(gap===null?'Shortfall not assessed':display.capacityBalanceLabel(gap)));assert.match(html,/Needed \(FTE\)|Available \(FTE\)/);assert.doesNotMatch(html,/tabindex=/);assert.match(html,/Exact values are available in Monthly detail below/);assert.doesNotMatch(html,/Positive gap =|Gap FTE/);assert.deepEqual(result,before);assert.match(html,/<details[^>]*><summary[^>]*>How to read this chart<\/summary>/);assert.match(html,/not a count of people or a hiring target/);
  assert.match(html,/Scenario capacity verdict/);assert.match(html,/By Nov 2026/);if(gap>0)assert.match(html,/To close this month/);
  if(gap===null)assert.doesNotMatch(html,/data-capacity-shortfall/);else assert.match(html,/data-capacity-shortfall/);
 }
});
