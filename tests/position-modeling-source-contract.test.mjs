import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';import ts from 'typescript';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import * as format from '../lib/display-format.ts';import {buildHomePack} from '../lib/home-pack.mjs';
const require=createRequire(import.meta.url),contracts=fs.existsSync('lib/legacy-source-contracts.ts')?await import('../lib/legacy-source-contracts.ts'):{};
function load(file,aliases={}){const exports={},code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:name=>aliases[name]??require(name)});return exports;}
async function positions(){
 const dimensions={org_unit_id:1,org_code:'A',org_name:'A',org_type:'business_unit',job_level_id:1,level_code:'L1',level_name:'L1',level_rank:1};
 const tables={position_modeling_current_summary:[{...dimensions,current_positions:10475,filled_positions:10000,vacant_positions:475,planned_positions:0,frozen_positions:0,closed_positions:0}],position_modeling_scenario_summary:[{...dimensions,workforce_scenario_id:1,scenario_name:'Baseline',scenario_type:'baseline',planning_month:'2027-12-01',planned_positions:10439,planned_fte:9000,planned_hires:0,planned_exits:0,planned_labor_cost_usd:1000}]};
 const reads=[];const supabaseServer={from:table=>{reads.push(table);const q={select:()=>q,eq:()=>q,then:resolve=>resolve({data:tables[table],error:null})};return q;}};
 const route=load('app/api/position-modeling/route.ts',{'next/server':{NextResponse:Response},'@/lib/dataset-runtime':{withDatasetRequest:(_request,run)=>run()},'../../../lib/supabase-server':{supabaseServer},'../../../lib/legacy-source-contracts':contracts});
 const response=await route.GET(new Request('http://offline.invalid'));assert.equal(response.status,200);return {data:await response.json(),reads};
}
test('position API preserves source totals and compatibility fields without fabricating an inventory date',async()=>{
 const {data,reads}=await positions();assert.deepEqual(reads,['position_modeling_current_summary','position_modeling_scenario_summary']);assert.equal(data.current.current_positions,10475);assert.equal(data.scenarios[0].totals.planned_positions,10439);assert.equal(data.scenarios[0].totals.net_position_change,-36);assert.equal(data.as_of,null);assert.equal(data.source_contract.measure,'planned_headcount');assert.equal(data.source_contract.aggregation,'sum_of_rounded_org_level_groups');assert.equal(data.source_contract.planScope,'all_plans');
});
test('position cards and tables keep distinct stocks visible without actionable subtraction or independent-position explanation',async()=>{
 const {data}=await positions(),scenario=data.scenarios[0];const {PositionModelingSummary}=load('components/workforce-planning/position-modeling-summary.tsx',{'@/lib/display-format':format,'@/lib/legacy-source-contracts':contracts});
 const render=value=>renderToStaticMarkup(React.createElement(PositionModelingSummary,{positionModelingData:value,activePositionScenario:scenario,topPositionBusinessUnits:scenario.by_business_unit,positionLevels:scenario.by_level}));
 const html=render(data);assert.match(html,/10,475/);assert.match(html,/10,439/);assert.match(html,/Planned headcount/);assert.match(html,/grouped rounding/i);assert.match(html,/Inventory effective date unavailable/);assert.doesNotMatch(html,/Net Position Change|Position Change by|Planned positions vs current|Positions represent authorized roles|>Change<|-36/);
 const demo=render({...data,as_of:'2026-09-30',source_contract:undefined,data_meta:{dataClass:'constructed-synthetic',sourceLabel:'Constructed inventory',planningCaveat:'Flat draft omits current vacancies.'}});assert.match(demo,/2026-09-30/);assert.match(demo,/Flat draft omits current vacancies/);assert.doesNotMatch(demo,/grouped rounding|all plans/i);
});
test('P2 exposes status inventory only, with unknown date and no future gap or authorization claim',async()=>{
 const {data}=await positions();data.current.net_position_change=-36;
 const p2=buildHomePack({'position-modeling':{status:'loaded',data}},'Company-wide').sources.find(s=>s.id==='P2');assert.equal(p2.date,null);assert.equal(p2.facts.current_positions,10475);assert.equal(p2.facts.net_position_change,undefined);assert.equal(p2.facts.scenarios,undefined);assert.doesNotMatch(JSON.stringify(p2),/10439|-36|Authorized positions/);assert.match(JSON.stringify(p2),/Position records/);assert.match(JSON.stringify(p2),/hiring need/);
});

test('Planning chat excludes compatibility differences and avoids treating status inventory as authorization',()=>{
 const route=fs.readFileSync('app/api/chat/route.ts','utf8');
 const prompt=route.slice(route.indexOf('    const positionPrompt ='),route.indexOf('    const financePrompt ='));
 assert.doesNotMatch(prompt,/net_position_change|Position change|authorized positions|Positions are authorized/);
 assert.match(prompt,/Current position records \(filled \+ vacant\)/);assert.match(prompt,/Planned headcount at end of horizon/);
 assert.match(prompt,/does not establish hiring need or an approved change/);
 const tool=fs.readFileSync('lib/people-analytics-tools.ts','utf8');assert.doesNotMatch(tool,/Positions are authorized roles/);
});
