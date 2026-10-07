import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as numeric from '../lib/numeric-contract.ts';
import * as format from '../lib/display-format.ts';
import * as planning from '../lib/stored-planning.ts';
import * as listening from '../lib/employee-listening.ts';
import * as exitEnps from '../lib/exit-enps.ts';
import {buildHomePack} from '../lib/home-pack.mjs';

const require = createRequire(import.meta.url);
const invalid = [null, undefined, '', ' ', 'not numeric', NaN, Infinity, -Infinity, 'Infinity', 'NaN', '0x10', true, false, [], {}];

test('source normalization retains unknowns, legitimate zero and finite numeric source strings', () => {
  for (const value of invalid) assert.equal(numeric.nullableNumber(value), null, String(value));
  for (const [value, expected] of [[0,0],['0',0],['0.0',0],[' 10.25 ',10.25],['-2.5',-2.5],['1e2',100]]) {
    assert.equal(numeric.nullableNumber(value), expected);
  }
});

test('incomplete totals and comparisons stay unknown while true zeros remain usable', () => {
  for (const values of [[], [1,null], [undefined,0], [Infinity,0]]) assert.equal(numeric.knownSum(values), null);
  assert.equal(numeric.knownSum([0,0]), 0);
  assert.equal(numeric.knownSum([1,2]), 3);
  assert.equal(numeric.knownDifference(0,0), 0);
  assert.equal(numeric.knownDifference(5,0), 5);
  assert.equal(numeric.knownDifference(null,5), null);
  assert.equal(numeric.knownDifference(5,undefined), null);
});

test('metric displays preserve unknowns and never attach a percent/currency unit to missing values', () => {
  for (const value of [null, undefined, NaN, Infinity]) {
    for (const name of ['formatWholeCount','formatCapacity','formatFte','formatPercent','formatSignedWholeDelta','formatSignedCapacityDelta','formatSignedPercent','formatCurrencyCompact']) {
      assert.equal(format[name](value),'Unavailable',name);
    }
    assert.equal(format.formatMetric(value,1,'%'),'Unavailable');
  }
  assert.equal(format.formatPercent(0),'0.0%');
  assert.equal(format.formatWholeCount(0),'0');
  assert.equal(format.formatCurrencyCompact(0),'$0');
});

function load(file, aliases = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'), {
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
  }).outputText;
  const exports = {};
  vm.runInNewContext(code,{exports,Response,console,require:name=>{
    if (name in aliases) return aliases[name];
    if (name.startsWith('.') || name.startsWith('@/')) throw Error('Unexpected module: '+name);
    return require(name);
  }});
  return exports;
}

const summary = {
  survey_listening_current_summary:{as_of:'2026-09-30'},
  talent_acquisition_current_summary:{as_of:'2026-09-30'},
};
const detailTables = {
  'survey-sentiment':['survey_listening_engagement_trend','survey_listening_dimension_summary','survey_listening_business_unit_summary','survey_listening_exit_reason_summary'],
  'talent-acquisition':['talent_acquisition_source_summary','talent_acquisition_business_unit_summary','talent_acquisition_recruiter_summary','talent_acquisition_monthly_summary'],
};
async function getRoute(domain, tables) {
  const calls = [];
  const supabaseServer = {from:name=>{
    calls.push(name);
    const query = {select:()=>query,order:()=>query,single:()=>query,in:()=>query,then:resolve=>resolve({data:tables[name] ?? [],error:null})};
    return query;
  }};
  const route = load(`app/api/${domain}/route.ts`, {
    'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},
    '../../../lib/supabase-server':{supabaseServer},
    '../../../lib/numeric-contract':numeric,
    '../../../lib/stored-planning':planning,
    '../../../lib/exit-enps':{...exitEnps,localExitEnpsEnabled:()=>false},
  });
  const response = await route.GET();
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  return {body:await response.json(),calls};
}

// Run the actual routes with synthetic Supabase results, never a socket or key.
for (const domain of ['survey-sentiment','talent-acquisition']) {
  test(`${domain} actual API preserves missing summary/detail cells and true zero`, async () => {
    const tables = {...summary};
    for (const table of detailTables[domain]) tables[table] = [{survey_code:'ENG-2026'}];
    const {body:shape} = await getRoute(domain,tables);
    for (const [key,value] of Object.entries(shape.summary)) assert.equal(value,null,key);
    const rows = Object.values(shape).filter(Array.isArray).flat();
    assert.ok(rows.length > 0);
    for (const row of rows) for (const [key,value] of Object.entries(row)) if (key !== 'survey_code') assert.equal(value,null,key);
    const numericKeys = Object.keys(shape.summary);
    // Exercise every summary metric at the boundary, including invalid and omitted values.
    for (const input of [null,undefined,'','bad',0,'0']) {
      const currentKey = domain === 'survey-sentiment' ? 'survey_listening_current_summary' : 'talent_acquisition_current_summary';
      tables[currentKey] = {as_of:'2026-09-30',...Object.fromEntries(numericKeys.map(key=>[key,input]))};
      const {body} = await getRoute(domain,tables);
      for (const key of numericKeys) assert.equal(body.summary[key],input === 0 || input === '0' ? 0 : null,key);
    }
  });
}

test('stored planning API keeps raw monthly flows distinct from the headcount curve and normalizes assumptions', async () => {
  const {body,calls} = await getRoute('workforce-planning',{
    workforce_scenarios:[{workforce_scenario_id:'synthetic-scenario',scenario_name:'Baseline',scenario_type:'baseline',description:null}],
    workforce_scenario_summary:[
      {scenario_name:'Baseline',planning_month:'2027-01-01',planned_headcount:'100',planned_fte:'90',planned_hires:0,planned_exits:'0',planned_labor_cost_usd:null},
      {scenario_name:'Baseline',planning_month:'2027-02-01',planned_headcount:110,planned_fte:'',planned_hires:'0',planned_exits:null,planned_labor_cost_usd:'invalid'},
    ],
    scenario_assumptions:[{workforce_scenario_id:'synthetic-scenario',assumption_name:'known-zero',assumption_value:'0'},{workforce_scenario_id:'synthetic-scenario',assumption_name:'unknown',assumption_value:'invalid'}],
  });
  assert.deepEqual(calls,['workforce_scenario_summary','workforce_scenarios','scenario_assumptions']);
  assert.equal(body.provenance.status,'stored_modeled_plan');
  assert.match(body.provenance.grain,/scenario and planning month/);
  assert.equal(body.provenance.source_refreshed_at,null);
  assert.match(body.provenance.reconciliation,/no reconciliation is asserted/);
  const scenario = body.scenarios[0];
  assert.equal(scenario.points[0].planned_hires,0);
  assert.equal(scenario.points[0].planned_exits,0);
  assert.equal(scenario.points[1].planned_hires,0); // Never invent ten hires from the headcount delta.
  assert.equal(scenario.points[1].planned_exits,null);
  assert.equal(scenario.points[1].planned_fte,null);
  assert.equal(scenario.points[1].planned_labor_cost_usd,null);
  assert.deepEqual(scenario.assumptions.map(row=>row.assumption_value),[0,null]);
  assert.deepEqual(planning.summarizeStoredPlanning(scenario.points),{headcount_change:10,hires:0,exits:null,months:2});
  assert.deepEqual(planning.summarizeStoredPlanning([]),{headcount_change:null,hires:null,exits:null,months:0});
});

const aliases = {
  '@/lib/display-format':format,
  '@/lib/numeric-contract':numeric,
  '@/components/synthetic-domain-demo':{SyntheticDomainDemo:()=>null},
  // Render cards and tables; chart layout needs a browser and is outside this contract test.
  recharts:new Proxy({}, {get:()=>()=>null}),
};
function render(file,name,props) {
  return renderToStaticMarkup(React.createElement(load(file,aliases)[name],props));
}
const surveyData = {as_of:'2026-09-30',summary:{engagement_favorable_pct:null,engagement_participation_pct:0,engagement_respondents:0,engagement_eligible_population:20,manager_favorable_pct:null,onboarding_90_favorable_pct:null,open_text_comments:null},engagement_trend:[{favorable_pct:50},{favorable_pct:null}],engagement_dimensions:[{survey_code:'ENG-2026',question_code:'one',dimension:'Synthetic missing score',avg_score:null,favorable_pct:null},{survey_code:'ENG-2026',question_code:'two',dimension:'Synthetic zero score',avg_score:0,favorable_pct:0}],pulse_dimensions:[],manager_dimensions:[],onboarding_dimensions:[],business_units:[]};

test('Listening renders unavailable scores without a fake bar or delta; real zero is visible', () => {
  const html = render('components/pages/survey-sentiment-page.tsx','SurveySentimentPage',{data:surveyData,loading:false,error:null});
  assert.match(html,/Engagement Favorable<\/p><p[^>]*>Unavailable/);
  assert.match(html,/Participation<\/p><p[^>]*>0\.0%/);
  assert.doesNotMatch(html,/pts vs prior annual survey|NaN|width:2%|Unavailable%/);
  assert.match(html,/width:0%/);
  assert.equal((html.match(/style="width:/g)||[]).length,1);
  assert.match(html,/Each survey has its own respondents and period/);
});

test('TA cards and funnel never coerce unknown cells to zero or call a missing conversion top-of-funnel', () => {
  const data = {as_of:'2026-09-30',summary:{open_requisitions:null,open_positions:0,applications:0,interviewed_applications:null,offered_applications:null,hires:0,application_to_hire_pct:0,median_time_to_fill_days:null},monthly:[],business_units:[],sources:[],recruiters:[]};
  const html = render('components/pages/talent-acquisition-page.tsx','TalentAcquisitionPage',{data,loading:false,error:null});
  assert.match(html,/Open Requisitions<\/p><p[^>]*>Unavailable/);
  assert.match(html,/Median Time to Fill<\/p><p[^>]*>Unavailable/);
  assert.match(html,/Interviewed<\/p><p[^>]*>Unavailable/);
  assert.match(html,/Hires<\/p><p[^>]*>0<\/p>/);
  assert.equal((html.match(/Top of funnel/g)||[]).length,1);
  assert.doesNotMatch(html,/NaN|Unavailable%|Unavailable days/);
});

test('planning comparisons and stored summary disclose unknown totals and preserve modeled provenance', () => {
  const point = {planning_month:'2027-12-01',planned_headcount:null,planned_fte:null,planned_hires:0,planned_exits:null,planned_labor_cost_usd:null};
  const scenario = {scenario_name:'Baseline',scenario_type:'baseline',points:[point],assumptions:[],description:null};
  const props = {visible:true,planningLoading:false,planningScenarios:[scenario],activePlanningScenario:scenario,activePlanningStart:point,activePlanningEnd:point,baselinePlanningEnd:point,planningNetChange:null,planningHeadcountDeltaVsBaseline:null,planningTotalHires:0,planningTotalExits:null};
  const html = render('components/workforce-planning/scenario-plan-summary.tsx','ScenarioPlanSummary',props);
  assert.match(html,/0 \/.*Unavailable/);
  assert.match(html,/Source-reported monthly flows/);
  assert.match(html,/not observed actuals/);
  assert.match(html,/what-if engine flows are separate/);
  assert.doesNotMatch(html,/NaN|\$0/);
  const comparison = render('components/workforce-planning/scenario-comparison-table.tsx','ScenarioComparisonTable',props);
  assert.match(comparison,/Unavailable/);
  assert.doesNotMatch(comparison,/NaN|\$0/);
});

test('exit-survey and employee evidence preserve zero versus missing and separate populations', () => {
  const input = {as_of:'2026-09-30',summary:{exit_respondents:0,engagement_favorable_pct:null},exit_reasons:[{primary_reason:'Synthetic',exits:null,pct_of_exit_responses:0}],exit_dimensions:[{survey_code:'EXIT',favorable_pct:null,separation_respondents:0}]};
  const evidence = listening.exitSurveyEvidence(input);
  assert.equal(evidence.respondents,0);
  assert.equal(evidence.reasons[0].exits,null);
  assert.equal(evidence.reasons[0].pct_of_exit_responses,0);
  assert.match(evidence.population,/not current employees or all recorded separations/);
  assert.match(evidence.period,/not supplied/);
  const employee = listening.employeeListeningEvidence(input);
  assert.equal(employee.summary.engagement_favorable_pct,null);
  assert.equal('exit_respondents' in employee.summary,false);
});


test('Home compact evidence preserves the nullable source contract on the AI path', () => {
  const pack = buildHomePack({
    'survey-sentiment':{status:'loaded',data:{...surveyData,summary:{...surveyData.summary,exit_respondents:0},exit_reasons:[{primary_reason:'Synthetic',exits:null,pct_of_exit_responses:0}],exit_dimensions:[]}},
    'talent-acquisition':{status:'loaded',data:{as_of:'2026-09-30',summary:{hires:0,applications:null},monthly:[{month:'2026-09-01',hires:0,applications:null}]}},
    'workforce-planning':{status:'loaded',data:{scenarios:[{scenario_name:'Baseline',scenario_type:'baseline',assumptions:[],points:[{planning_month:'2027-12-01',planned_headcount:100,planned_hires:0,planned_exits:null}]}]}},
  },'Company workforce');
  const source = id => pack.sources.find(row=>row.id===id);
  assert.equal(source('S1').facts.engagement_favorable_pct,null);
  assert.equal(source('S1').facts.engagement_respondents,0);
  assert.equal(source('S2').facts.exit_respondents,0);
  assert.equal(source('S2').facts.rows[0].exits,null);
  assert.equal(source('R1').facts.applications,null);
  assert.equal(source('R1').facts.hires,0);
  assert.equal(source('R1').facts.rows[0].applications,null);
  assert.equal(source('P1').facts.rows[0].planned_exits,null);
  assert.equal(source('P1').facts.rows[0].planned_hires,0);
});
