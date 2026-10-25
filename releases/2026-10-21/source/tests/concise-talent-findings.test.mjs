import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './fixtures/component-module.mjs';
import * as findings from '../lib/key-findings.ts';
import * as display from '../lib/display-format.ts';
import * as catalog from '../lib/catalog-display.ts';
import * as scope from '../lib/talent-evidence-scope.ts';
import * as numeric from '../lib/numeric-contract.ts';
import {loadPublic9037Binding} from '../lib/public-9037.server.mjs';
const aliases={
 '@/components/key-findings':componentModule('key-findings.tsx'),
 '@/lib/key-findings':findings,'@/lib/display-format':display,'@/lib/catalog-display':catalog,
 '@/lib/talent-evidence-scope':scope,'@/lib/numeric-contract':numeric,
 '@/components/evidence-table-region':componentModule('evidence-table-region.tsx'),
 '@/components/evidence-scope-notice':componentModule('evidence-scope-notice.tsx',{'@/lib/talent-evidence-scope':scope}),
 '@/components/synthetic-domain-demo':{SyntheticDomainDemo:()=>null},
 recharts:new Proxy({},{get:()=>()=>null}),
};
const pages={
 'learning-development':componentModule('pages/learning-development-page.tsx',aliases).LearningDevelopmentPage,
 'career-mobility':componentModule('pages/career-mobility-page.tsx',aliases).CareerMobilityPage,
 'survey-sentiment':componentModule('pages/survey-sentiment-page.tsx',aliases).SurveySentimentPage,
};
const binding=await loadPublic9037Binding({hostname:'www.ed-ai.app'});
const data={};for(const route of Object.keys(pages)){const r=await binding.handle(new Request('https://www.ed-ai.app/api/'+route));assert.equal(r.status,200);data[route]=await r.json();}
const render=(route,extra={})=>renderToStaticMarkup(React.createElement(pages[route],{data:data[route],loading:false,error:null,selectedContext:{country:'Canada',businessUnit:'Technology',level:'L2'},...extra}));

test('learning and mobility summaries keep actual coverage and company scope without disclaimer-only findings',()=>{
 const l=findings.learningFindings({as_of:'2026-09-30',summary:{gap_skills_with_active_pathway:0,current_gap_skills:4,fully_covered_job_profiles:0}});
 assert.match(l.scope,/Company-wide learning/);assert.equal(l.items.length,2);assert.match(l.items[0],/0 gap skills.*out of 4/);
 const m=findings.mobilityFindings({as_of:null,summary:{preference_record_coverage_pct:0,employees_without_preference:10}});
 assert.match(m.scope,/Company-wide career preferences.*update date unavailable/);assert.deepEqual(m.items,['Preference records cover 0% of active employees.','10 active employees have no recorded preference.']);
 for(const result of [findings.learningFindings({as_of:null,summary:{}}),findings.mobilityFindings({as_of:null,summary:{}}),findings.surveyFindings({as_of:null,summary:{}})])assert.deepEqual(result.items,['No verified values are available for this summary. Missing values are not zero.']);
});

test('survey summary retains respondent denominator and supplied period, zero distinct from missing',()=>{
 const r=findings.surveyFindings({as_of:'2026-09-30',data_meta:{listeningPeriod:'quarterly'},summary:{engagement_favorable_pct:0,engagement_respondents:50,engagement_participation_pct:null}});
 assert.match(r.scope,/quarterly/);assert.deepEqual(r.items,['Engagement favorability is 0% among 50 respondents.']);
});

test('actual learning/career pages retain visible filter limits and collapsed interpretation',()=>{
 for(const route of ['learning-development','career-mobility']){
  const before=JSON.stringify(data[route]),html=render(route);
  assert.match(html,/Company-wide evidence; selected filters are not applied/);
  assert.equal(JSON.stringify(data[route]),before);
  assert.doesNotMatch(html,/<details[^>]*\bopen/);
 }
 const learning=render('learning-development');assert.match(learning,/<details[^>]*>[\s\S]*Learning sources and definitions[\s\S]*not time-to-readiness/);
 const career=render('career-mobility');assert.match(career,/<details[^>]*>[\s\S]*Methodology &amp; interpretation[\s\S]*Missing records do not mean no career interest/);
 assert.match(career,/preference holders with a recorded answer/);
});

test('survey comment state stays explicit while definitions are optional',()=>{
 const d=data['survey-sentiment'];
 const zero=render('survey-sentiment',{data:{...d,summary:{...d.summary,open_text_comments:0}}});
 assert.match(zero,/0 open-text comments across all surveys/);assert.match(zero,/Theme analysis unavailable/);
 assert.match(zero,/<details[^>]*>[\s\S]*Survey definitions[\s\S]*not comment sentiment or causality/);
 const missing=render('survey-sentiment',{data:{...d,summary:{...d.summary,open_text_comments:null}}});
 assert.match(missing,/comment count unavailable/);assert.doesNotMatch(missing,/0 open-text comments/);
});

test('loading/error states still hide stale summaries and methodology',()=>{
 for(const route of Object.keys(pages))for(const extra of [{loading:true},{error:'Controlled unavailable source'}]){
  const html=render(route,extra);assert.doesNotMatch(html,/aria-label="Key findings"|Survey definitions|Learning sources and definitions|Methodology &amp; interpretation/);
 }
});
