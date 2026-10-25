import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './fixtures/component-module.mjs';
import * as findings from '../lib/key-findings.ts';
import * as display from '../lib/display-format.ts';
import * as catalog from '../lib/catalog-display.ts';
import * as period from '../lib/evidence-period-label.ts';
import * as extension from '../lib/synthetic-ta/extension.ts';
import {PUBLIC_9037} from '../lib/public-9037-contract.mjs';
import {loadPublic9037Binding} from '../lib/public-9037.server.mjs';
import {homeRecruitingKpi} from '../lib/home-kpi-source.ts';
const {TalentAcquisitionPage}=componentModule('pages/talent-acquisition-page.tsx',{
 '@/lib/public-9037-contract.mjs':{PUBLIC_9037},'@/lib/evidence-period-label':period,
 '@/components/key-findings':componentModule('key-findings.tsx'),'@/lib/key-findings':findings,
 '@/lib/display-format':display,'@/lib/catalog-display':catalog,'@/lib/synthetic-ta/extension':extension,
 '@/components/evidence-table-region':componentModule('evidence-table-region.tsx'),
 '@/components/calibrated-ta-panels':{CalibratedTaPanels:()=>null},
 recharts:new Proxy({},{get:()=>()=>null}),
});
const binding=await loadPublic9037Binding({hostname:'www.ed-ai.app'});
const response=await binding.handle(new Request('https://www.ed-ai.app/api/talent-acquisition'));
assert.equal(response.status,200);const data=await response.json();
const render=d=>renderToStaticMarkup(React.createElement(TalentAcquisitionPage,{data:d,loading:false,error:null}));

test('successful-only records remain inspectable without implying funnel conversion',()=>{
 const s=data.summary,before=JSON.stringify(data),html=render(data);
 assert.equal(s.applications,4782);assert.equal(s.hires,4782);
 assert.equal(s.application_to_hire_pct,100*s.hires/s.applications);
 assert.equal(s.internal_hires+s.external_hires,s.hires);
 assert.match(html,/Recorded hired cohort/);assert.match(html,/Funnel conversion unavailable/);assert.doesNotMatch(html,/100\.0%/);
 assert.match(html,/4,782 accepted offers \/ 4,782 recorded applications/);
 assert.match(html,/complete applicant population is unavailable/);
 assert.doesNotMatch(html,/Source Effectiveness|100\.0% application/);
 assert.equal(JSON.stringify(data),before);
});

test('mean and median remain independent fields when their values differ',()=>{
 const varied={...data,summary:{...data.summary,avg_time_to_fill_days:41.2,median_time_to_fill_days:29}};
 const html=render(varied),k=homeRecruitingKpi({status:'loaded',data:varied},true,PUBLIC_9037.token,data.as_of);
 assert.match(html,/Median Time to Fill[\s\S]*?29 days/);assert.match(html,/Average \(mean\): 41\.2 days/);
 assert.equal(k.timeToFillDays,41.2);assert.equal(k.timeToFillCohort,'filled-requisitions-opening-to-closure');assert.match(html,/Opening to closure for filled requisitions with both dates/);
 assert.match(html,/including internal and external fills/);assert.match(html,/median is the middle duration/);
});

test('missing timing or conversion never borrows another statistic or implies zero',()=>{
 const missing={...data,summary:{...data.summary,applications:0,hires:0,application_to_hire_pct:null,avg_time_to_fill_days:null,median_time_to_fill_days:29}};
 const html=render(missing),k=homeRecruitingKpi({status:'loaded',data:missing},true,PUBLIC_9037.token,data.as_of);
 assert.match(html,/Funnel conversion unavailable/);assert.match(html,/Average \(mean\): Unavailable/);assert.equal(k.timeToFillDays,null);
 const zero=render({...missing,summary:{...missing.summary,avg_time_to_fill_days:0,median_time_to_fill_days:null}});
 assert.match(zero,/Average \(mean\): 0\.0 days/);assert.match(zero,/Median Time to Fill[\s\S]*?Unavailable/);
});

test('successful-only construction is not asserted for another dataset',()=>{
 const other={...data,data_meta:{...data.data_meta,datasetToken:'other:1'}};
 const html=render(other);assert.doesNotMatch(html,/Successful-hire records|complete applicant population is unavailable/);
 assert.match(html,/4,782 hires \/ 4,782 recorded applications/);
 assert.doesNotMatch(html,/Opening to closure for filled requisitions/);
});
