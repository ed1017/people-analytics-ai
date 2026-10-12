import * as sourceContracts from '../lib/legacy-source-contracts.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as releaseContract from '../lib/compensation-release.ts';
import * as ranges from '../lib/compensation-range-context.ts';
import * as format from '../lib/display-format.ts';
import * as numeric from '../lib/numeric-contract.ts';
import * as demo from '../lib/synthetic-domain-demo.ts';
import * as ranking from '../lib/projection-backtest.ts';
import {homeForecastAnswer} from '../lib/home-forecast.ts';
const require=createRequire(import.meta.url);
const artifact=JSON.parse(fs.readFileSync('lib/data/synthetic-domain-demo-v1.json'));
function load(file,aliases={},globals={}) {
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(code,{exports,require:name=>aliases[name]??require(name),...globals});return exports;
}
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
const disclosure=load('components/assumptions-disclosure.tsx');
const manifest=releaseContract.compensationRelease;
const rows=manifest.jobCodes.map((job,i)=>({release_id:manifest.releaseId,snapshot_date:manifest.snapshotDate,job_profile_code:job,job_profile_name:job,status:i<2?'withheld':'published',mean_compa_pct:i<2?null:101,coverage:i<2?'withheld':'partial',base_pay_provenance:manifest.basePayProvenance,range_provenance:manifest.rangeProvenance,range_policy_version:manifest.rangePolicyVersion}));
async function releaseRoute(query,enabled) {
 let reads=0;
 const routeModule=load('app/api/compensation-job-release/route.ts',{
  '@/lib/dataset-runtime':{withDatasetRequest:(_request,fn)=>fn()},
  '../../../lib/compensation-release':releaseContract,
  '../../../lib/supabase-server':{supabaseServer:{from:()=>{reads++;return {select:()=>({eq:async()=>({data:rows,count:rows.length,error:null})})};}}},
 },{Response,URL,process:{env:{COMPENSATION_JOB_RELEASE_ENABLED:String(enabled)}}});
 const response=await routeModule.GET(new Request('http://offline/api/compensation-job-release?'+query));
 return {status:response.status,body:await response.json(),reads};
}
function compensationMarkup(release,scope=ranges.defaultRangeScope) {
 const catalog={jobs:manifest.jobCodes.slice(0,3).map(job=>({job_profile_code:job,job_profile_name:job})),levels:[{level_code:'L1',level_rank:1}],combinations:[]};
 let state=0;
 const {CompensationJobRanges}=load('components/compensation-job-ranges.tsx',{
  react:{...React,useEffect:()=>{},useState:()=>[[catalog,false,0,release][state++],()=>{}]},
  '@/components/assumptions-disclosure':disclosure,
  '@/lib/dataset-client.mjs':{datasetFetch:()=>{throw Error('Network forbidden');},datasetSession:{}},
  '@/lib/compensation-range-context':ranges,
  '@/lib/compensation-release-context':{},
 });
 return render(CompensationJobRanges,{scope});
}
test('enabled release renders partial company USD coverage and withheld jobs without disclosing counts',async()=>{
 const result=await releaseRoute('',true);assert.equal(result.status,200);assert.equal(result.reads,1);
 const html=compensationMarkup(result.body.rows);
 assert.match(html,/Company-wide USD-pay subset · Partial job coverage/);
 assert.match(html,/Current: Withheld/);assert.match(html,/Current: 101.0%/);assert.match(html,/Partial USD inputs/);
 assert.doesNotMatch(html,/Compa-ratio release unavailable|matched_count|excluded_count/);
});
test('disabled release renders unavailable without a pay point or mocked aggregate read',async()=>{
 const result=await releaseRoute('',false);assert.equal(result.status,503);assert.equal(result.reads,0);
 const html=compensationMarkup(null);assert.match(html,/Compa-ratio release unavailable/);assert.doesNotMatch(html,/<circle|Current: 101/);
});
test('unsupported filters never substitute retained company release values',async()=>{
 for(const key of ['country','org','level']){
  const result=await releaseRoute(`${key}=unsupported`,true);assert.equal(result.status,422);assert.equal(result.reads,0);
  const html=compensationMarkup(rows,{...ranges.defaultRangeScope,[key]:'unsupported'});
  assert.match(html,/not released for these filters/);assert.doesNotMatch(html,/<circle|Current: 101|Company-wide USD-pay subset/);
 }
});
test('shell disclosure states the gate rather than denying an enabled release',()=>{
 const shell=fs.readFileSync('app/page.tsx','utf8');assert.match(shell,/Compa-ratios require an enabled company-wide release/);assert.doesNotMatch(shell,/Pay coverage and compa-ratios remain unavailable/);
});
test('rendered attrition default is an annual planning assumption, distinct from observed YTD',()=>{
 const {ScenarioModelingPanel}=load('components/workforce-planning/scenario-modeling-panel.tsx',{'@/components/evidence-table-region':load('components/evidence-table-region.tsx'),'@/lib/display-format':format,'@/lib/legacy-source-contracts':sourceContracts,'@/lib/numeric-contract':numeric});
 const assumptions={annual_growth_pct:0,salary_inflation_pct:0,annual_attrition_pct:11.3,fill_rate_pct:100,productivity_hiring_reduction_pct:0};
 const html=render(ScenarioModelingPanel,{visible:true,planningScenarios:[],scenarioDefaults:assumptions,customAssumptions:assumptions,buScenarioOptions:[],savedScenarios:[],comparisonScenarioIds:[]});
 assert.match(html,/Annual Attrition Assumption/);assert.match(html,/Planning default 11.3%/);assert.match(html,/Default provenance unavailable · Not observed voluntary turnover YTD/);
 assert.match(html,/value="11.3"/);
});
test('shared satisfaction projection keeps independent simulation label outside collapsed details and retains values',()=>{
 const {SyntheticDomainPrediction}=load('components/synthetic-domain-prediction.tsx',{'@/components/evidence-table-region':load('components/evidence-table-region.tsx'),'@/lib/projection-backtest':ranking,'@/components/synthetic-domain-chart':{SyntheticDomainChart:()=>null},'@/lib/synthetic-domain-demo':demo});
 const html=render(SyntheticDomainPrediction,{domain:'satisfaction',data:artifact});
 assert.match(html,/Independent simulated population · Not a projection of recorded engagement/);assert.match(html,/64.5%/);
 assert(html.indexOf('Independent simulated')<html.indexOf('<table'));assert.doesNotMatch(html,/<details/);
 const answer=homeForecastAnswer('Forecast satisfaction');assert.match(answer,/separate from recorded workforce data/);assert.match(answer,/\[Employee Listening\]\(app:survey-sentiment\)/);assert.doesNotMatch(answer,/Survey Sentiment/);
});

test('attrition default provenance belongs to the default, with constructed and unknown fallbacks',()=>{
 const {ScenarioModelingPanel}=load('components/workforce-planning/scenario-modeling-panel.tsx',{'@/components/evidence-table-region':load('components/evidence-table-region.tsx'),'@/lib/display-format':format,'@/lib/numeric-contract':numeric,'@/lib/legacy-source-contracts':sourceContracts});
 const assumptions={annual_growth_pct:0,salary_inflation_pct:0,annual_attrition_pct:11.3,fill_rate_pct:100,productivity_hiring_reduction_pct:0};
 const markup=source=>render(ScenarioModelingPanel,{visible:true,planningScenarios:[],scenarioDefaults:assumptions,scenarioDefaultSource:source,customAssumptions:{...assumptions,annual_attrition_pct:4},buScenarioOptions:[],savedScenarios:[],comparisonScenarioIds:[]});
 const legacy=markup({provenance:sourceContracts.legacyAttritionDefaultSource});
 assert.match(legacy,/Planning default 11.3%/);assert.match(legacy,/value="4"/);
 assert.match(legacy,/Default: all separations Jan–Sep 2026, annualized ×12\/9 over average snapshot headcount/);
 for(const provenance of [undefined,{}, {...sourceContracts.legacyAttritionDefaultSource,measure:'voluntary_only'}, {...sourceContracts.legacyAttritionDefaultSource,windowEnd:'2027-09-30'}]){
  const html=markup({provenance});assert.match(html,/Default provenance unavailable/);assert.doesNotMatch(html,/Default: all separations/);
 }
 const constructed=markup({dataClass:'constructed-synthetic',provenance:sourceContracts.legacyAttritionDefaultSource});
 assert.match(constructed,/Constructed dataset planning default/);assert.doesNotMatch(constructed,/Default: all separations|Default provenance unavailable/);
});

test('movement label distinguishes the verified source window from returned months and event counts',()=>{
 const chartNames=['Bar','BarChart','CartesianGrid','Line','LineChart','ResponsiveContainer','Tooltip','XAxis','YAxis'];
 const {WorkforcePage}=load('components/pages/workforce-page.tsx',{'@/components/evidence-table-region':load('components/evidence-table-region.tsx'),'@/lib/legacy-source-contracts':sourceContracts,'@/lib/display-format':format,recharts:Object.fromEntries(chartNames.map(name=>[name,()=>null]))});
 const data={as_of:'2030-01-01',summary:{headcount:100,fte:90,people_managers:10,avg_span_of_control:9,avg_tenure_years:5,full_time_headcount:80,hybrid_headcount:10,remote_headcount:5},trend:[],business_units:[],countries:[],levels:[],tenure:[],movements:[{month:'2026-03-01',movement_type:'promotion',movements:72}]};
 const html=render(WorkforcePage,{data:{...data,movement_window:sourceContracts.legacyMovementWindow}});
 assert.match(html,/Source window: Jan–Sep 2026/);assert.match(html,/Returned months: Mar 26 – Mar 26/);assert.match(html,/Counts are events, not distinct people/);assert.match(html,/72/);
 for(const movement_window of [undefined,{...sourceContracts.legacyMovementWindow,start:'2024-01-01'}]){
  const fallback=render(WorkforcePage,{data:{...data,movement_window}});assert.doesNotMatch(fallback,/Source window: Jan–Sep 2026/);assert.match(fallback,/Returned months: Mar 26 – Mar 26/);
 }
});
