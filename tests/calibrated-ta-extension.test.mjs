import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {taExtension,resolveTaExtension,calibratedExtensionForSource,taExtensionPrompt} from '../lib/synthetic-ta/extension.ts';
import targets from '../lib/synthetic-ta/calibration-targets-v2.json' with {type:'json'};
import * as extension from '../lib/synthetic-ta/extension.ts';
import * as numeric from '../lib/numeric-contract.ts';
import {homeForecastAnswer,homeForecastChartDomain} from '../lib/home-forecast.ts';
import {homeStarterForecast,homeStarterGoal} from '../lib/home-starter-goals.ts';
import {homeGoalStarters} from '../lib/contextual-prompts.ts';
import {buildHomePack} from '../lib/home-pack.mjs';
import {forecast} from '../lib/synthetic-ta/v1.ts';

test('canonical release preserves null vs zero and no future periods enter baselines',()=>{
 assert.equal(resolveTaExtension(taExtension),taExtension);
 assert.equal(resolveTaExtension({...taExtension,active:475}),null);
 assert.deepEqual(forecast(taExtension.history),taExtension.forecasts);
 assert(taExtension.history.every(r=>r.month<='2026-09'));
 assert(taExtension.forecasts.every(r=>r.month>'2026-09'&&['carryForward','recentMean','dampedChange'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)));
 const rows=[7,8,9].map(m=>({month:`2026-0${m}`,active:0,complete:true}));
 assert(forecast(rows).every(r=>r.carryForward===0));
 assert.deepEqual(forecast(rows.map((r,i)=>i===2?{...r,active:null}:r)),[]);
 assert.deepEqual(forecast([...rows,{month:'2026-10',active:999999,complete:true}]),[]);
});
test('source drift never silently replaces existing summary or monthly values',async()=>{
 const code=ts.transpileModule(fs.readFileSync('app/api/talent-acquisition/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const drift of [false,true]){
  const summary={...targets.summary,applications:targets.summary.applications+(drift?1:0)};
  const supabaseServer={from:name=>{const query={select:()=>query,single:()=>query,order:()=>query,then:resolve=>resolve({data:name==='talent_acquisition_current_summary'?summary:name==='talent_acquisition_monthly_summary'?targets.monthly:[],error:null})};return query}};
  const exports={},aliases={'../../../lib/synthetic-ta/extension':extension,'../../../lib/supabase-server':{supabaseServer},'../../../lib/numeric-contract':numeric,'../../../lib/data-api-error':{},'next/server':{NextResponse:Response}};
  vm.runInNewContext(code,{exports,require:name=>{assert(name in aliases,name);return aliases[name]}});
  const body=await (await exports.GET()).json();
  assert.equal(body.summary.applications,summary.applications);assert.equal(body.summary.hires,5080);assert.equal(body.summary.open_requisitions,475);
  assert.deepEqual(body.monthly,targets.monthly.map(({month,applications,interviewed_applications,offers,hires})=>({month,applications,interviewed_applications,offers,hires})));
  assert.equal(Boolean(resolveTaExtension(body.modeled_extension)),!drift);
 }
 assert.equal(calibratedExtensionForSource('2026-10-31',targets.summary,targets.monthly),null);
 assert.equal(calibratedExtensionForSource(targets.cutoff,targets.summary,targets.monthly.slice(1)),null);
});
test('Home R1, direct answer, starter and TA AI share version and fail closed on missing/stale evidence',()=>{
 const result={status:'loaded',data:{as_of:targets.cutoff,summary:targets.summary,monthly:targets.monthly,modeled_extension:taExtension}};
 const pack=buildHomePack({'talent-acquisition':result},'All countries');
 const r1=pack.sources.find(r=>r.id==='R1');assert.equal(r1.status,'loaded');assert.equal(r1.facts.modeled_ta_version,taExtension.version);
 const starter=homeStarterGoal(homeGoalStarters.at(-1));
 assert.match(homeStarterForecast(starter,pack,'').summary,/474.*475/);
 for(const available of [false,true]){
  const answer=homeForecastAnswer('Forecast active requisitions',undefined,available);
  assert.equal(answer.includes('| Method |'),available);
  assert.equal(homeForecastChartDomain('Forecast active requisitions',answer),available?'hiring':null);
  const comparison=homeForecastAnswer('Compare prediction methods',undefined,available);
  assert.equal(comparison.includes(taExtension.version),available);
 }
 const stale=buildHomePack({'talent-acquisition':{...result,data:{...result.data,modeled_extension:null}}},'All countries');
 assert.equal(homeStarterForecast(starter,stale,''),null);
 const staleR1=stale.sources.find(r=>r.id==='R1');assert.equal(staleR1.facts.modeled_ta_status,'unavailable');assert.doesNotMatch(staleR1.facts.modeled_ta_metric,/474|475|2026-09-30/);
 assert.match(taExtensionPrompt(taExtension),/Screening=50% assumption/);assert.match(taExtensionPrompt(null),/unavailable or stale/);
 assert.doesNotMatch(taExtensionPrompt(taExtension),/opening-cohort start percentage/);
});
