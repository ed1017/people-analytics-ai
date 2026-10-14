import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import ts from 'typescript';
import * as target from '../lib/staffing-target.ts';
import * as engine from '../lib/scenario-engine.ts';
const defaults={annual_growth_pct:0,salary_inflation_pct:0,annual_attrition_pct:0,fill_rate_pct:100,productivity_hiring_reduction_pct:0};
const rawDefaults={as_of:'2026-09-30',...Object.fromEntries(Object.entries(defaults).map(([key,value])=>['baseline_'+key,value]))};
const units=[{as_of:'2026-09-30',org_code:'OPS',org_name:'Operations',headcount:100,fte:80}];
const baseline=[{planning_month:'2026-10-01',planned_headcount:100,planned_fte:80,planned_labor_cost_usd:1000},{planning_month:'2026-11-01',planned_headcount:105,planned_fte:84,planned_labor_cost_usd:1050}];
const catalog={as_of:'2026-09-30',defaults,business_units:units,staffing_target_basis:target.STAFFING_TARGET_BASIS};
const result=()=>({...engine.runScenarioModel({asOf:catalog.as_of,startingHeadcount:100,baselinePoints:baseline,defaults,assumptions:defaults}),staffing_target_basis:target.STAFFING_TARGET_BASIS,scope:{type:'business_unit',org_code:'OPS',org_name:'Operations',current_headcount:100,current_fte:80,planning_horizon_start:'2026-10-01',planning_horizon_end:'2026-11-01'}});
test('strict source checks reject missing raw values before legacy zero coercion',()=>{
 target.assertStaffingCatalogSource(rawDefaults,units);target.assertStaffingBaselineSource(baseline,catalog.as_of);
 for(const missing of [null,undefined,'',false,'bad']){assert.throws(()=>target.assertStaffingCatalogSource({...rawDefaults,baseline_fill_rate_pct:missing},units));assert.throws(()=>target.assertStaffingCatalogSource(rawDefaults,[{...units[0],headcount:missing}]));assert.throws(()=>target.assertStaffingBaselineSource([{...baseline[0],planned_headcount:missing}],catalog.as_of));}
 assert.throws(()=>target.assertStaffingCatalogSource(rawDefaults,[{...units[0],as_of:'2026-08-31'}]));assert.throws(()=>target.assertStaffingCatalogSource(rawDefaults,[...units,...units]));assert.throws(()=>target.assertStaffingBaselineSource([baseline[0],baseline[0]],catalog.as_of));
 target.assertStaffingCatalogSource(rawDefaults,[{...units[0],headcount:0,fte:0}]);
});
test('supply must match source date, exact business unit, Baseline assumptions and monthly horizon',()=>{
 assert.equal(target.readStaffingSupply(result(),target.readStaffingCatalog(catalog),'OPS').points.length,2);
 for(const patch of [{staffing_target_basis:null},{as_of:'2026-08-31'},{source_scenario:'Custom'},{scope:{...result().scope,org_code:'OTHER'}},{scope:{...result().scope,current_headcount:101}},{assumptions:{...defaults,fill_rate_pct:50}},{points:[result().points[0],result().points[0]]},{points:[{...result().points[0],modeled_headcount:null}]},{scope:{...result().scope,planning_horizon_end:'2027-01-01'}}])assert.throws(()=>target.readStaffingSupply({...result(),...patch},catalog,'OPS'));
 assert.throws(()=>target.readStaffingCatalog({...catalog,staffing_target_basis:null}));assert.throws(()=>target.readStaffingCatalog({...catalog,defaults:{...defaults,fill_rate_pct:null}}));
});
test('one people target creates exactly one comparable point, never an FTE gap or seeded demand',()=>{
 const supply=target.readStaffingSupply(result(),catalog,'OPS');
 assert.equal(target.staffingTargetPoint(supply,'2026-11-01',''),null);
 const point=target.staffingTargetPoint(supply,'2026-11-01','110');assert.deepEqual(point,{month:'2026-11-01',required:110,available:105,gap:5});
 assert.equal(target.staffingTargetPoint(supply,'2026-11-01','90').gap,-15);assert.equal(target.staffingTargetPoint(supply,'2026-11-01','105').gap,0);assert.equal(target.staffingTargetPoint(supply,'2026-11-01','0').gap,-105);
 for(const input of ['-1','3.5','NaN','1e3','1000000001',' '])assert.equal(target.staffingTargetPoint(supply,'2026-11-01',input),null);
 assert.equal(target.staffingTargetPoint(supply,'2027-01-01','110'),null);assert.equal(target.staffingTargetPoint(null,'2026-11-01','110'),null);
});

const require=createRequire(import.meta.url),file=path.resolve('lib/business-unit-scenario.ts');let sources={};
const client={from(name){const query={select(){return query},order(){return query},eq(){return query},limit(){return query},single(){return Promise.resolve({data:sources[name],error:null})},then(resolve,reject){return Promise.resolve({data:sources[name],error:null}).then(resolve,reject)}};return query;}};
const compiledModule=new Module(file);compiledModule.filename=file;compiledModule.require=id=>id==='./supabase-server'?{supabaseServer:client}:id==='./scenario-engine'?engine:id==='./staffing-target'?target:require(id);
compiledModule._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
test('strict BU rerun reuses the existing engine and ordinary planner contract stays unchanged',async()=>{
 sources={scenario_modeler_defaults:rawDefaults,workforce_business_unit_summary:units,workforce_scenario_summary:{planned_headcount:500,planned_labor_cost_usd:5000},workforce_scenario_by_org:baseline};
 const legacy=await compiledModule.exports.runBusinessUnitScenario({business_unit:'OPS'}),strict=await compiledModule.exports.runBusinessUnitScenario({business_unit:'OPS'},true);
 assert.deepEqual(strict.points,legacy.points);assert.equal(legacy.staffing_target_basis,undefined);assert.equal(strict.staffing_target_basis,target.STAFFING_TARGET_BASIS);assert.equal(target.readStaffingSupply(strict,catalog,'OPS').points[1].modeled_headcount,105);
 sources.workforce_scenario_by_org=[{...baseline[0],planned_headcount:null}];await assert.rejects(compiledModule.exports.runBusinessUnitScenario({business_unit:'OPS'},true));
 sources.workforce_scenario_by_org=baseline;sources.workforce_business_unit_summary=[{...units[0],headcount:null}];await assert.rejects(compiledModule.exports.getBusinessUnitScenarioCatalog(true));assert.equal((await compiledModule.exports.getBusinessUnitScenarioCatalog()).business_units[0].headcount,0);
});
