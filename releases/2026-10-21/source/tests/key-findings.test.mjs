import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as findings from '../lib/key-findings.ts';
import {adjustedStaffingSummary} from '../lib/staffing-choice-summary.ts';

test('scope and date change with selected snapshot; zero is not unavailable', () => {
 const d={snapshot_date:'2026-09-30',headcount:0,fte:0,open_positions:0,voluntary_turnover_ytd_pct:null};
 const a=findings.snapshotFindings(d,'Canada / Finance / Level 8');
 assert.match(a.scope,/Canada \/ Finance \/ Level 8/); assert.match(a.items.join(' '),/0 people/);assert.doesNotMatch(a.items.join(' '),/turnover/);
 const b=findings.snapshotFindings({...d,snapshot_date:'2026-08-31',headcount:12,voluntary_turnover_ytd_pct:0},'US / Sales / Level 7');
 assert.match(b.scope,/2026-08-31/);assert.match(b.items.join(' '),/12 people/);assert.match(b.items.join(' '),/0% year to date/);
});
test('null/nonfinite recruiting metrics do not turn into zero or a forecast',()=>{
 const a=findings.recruitingFindings({as_of:'2026-09-30',summary:{median_time_to_fill_days:null,open_requisitions:NaN,open_reqs_over_60_days:Infinity}});
 assert.match(a.items[0],/No verified values/);
 const b=findings.recruitingFindings({as_of:'2026-09-30',summary:{median_time_to_fill_days:33,open_requisitions:0,open_reqs_over_60_days:0}});
 assert.match(b.items[0],/median.*33 days.*not a promise/);assert.match(b.items[1],/^0 requisitions/);
});
test('succession suppression wins even if a populated value is accidentally supplied',()=>{
 const r=findings.successionFindings({as_of_date:null,plan_coverage_suppressed:true,recorded_plan_coverage_pct:17,ready_now_suppressed:true,positions_with_ready_now:3,data_meta:{successionSemantics:'illustrative-plan-flags'}});
 assert.doesNotMatch(r.items.join(' '),/17|3 positions/);assert.match(r.items.join(' '),/suppressed/);assert.match(r.items.join(' '),/not assessments/);
});
test('survey and finance preserve distinct metric and cost-period meanings',()=>{
 const survey=findings.surveyFindings({as_of:'2026-09-30',summary:{engagement_favorable_pct:40,engagement_respondents:100,engagement_participation_pct:null}});
 assert.match(survey.items[0],/40% among 100 respondents/);assert.match(survey.items.at(-1),/not comment sentiment/);
 const finance=findings.financeFindings({as_of:'2026-09-30',current:{labor_cost_usd:1000,vacant_positions:null,fte:5}});
 assert.match(finance.items[0],/does not establish an annual/);assert.doesNotMatch(finance.items.join(' '),/0 positions/);
});
test('all page integrations gate stale results while loading/error',()=>{
 for(const name of ['workforce','attrition','talent-acquisition','survey-sentiment','learning-development','career-mobility']) {
  const source=fs.readFileSync(new URL(`../components/pages/${name}-page.tsx`,import.meta.url),'utf8');
  assert.match(source,/const data = !loading && !error \? sourceData : null/);assert.match(source,/<KeyFindings findings=\{data \?/);
 }
 for(const name of ['succession-planning','career-growth-mobility'])assert.match(fs.readFileSync(new URL(`../components/pages/${name}-page.tsx`,import.meta.url),'utf8'),/<KeyFindings findings=\{!loading && !error && data \?/);
});
test('adjusted staffing sentence tracks actual mix and shortfall without claiming optimization',()=>{
 const option={mix:{build:2,move:1,buy:3},cash:200000,shortfallHours:30,status:'met'};
 assert.match(adjustedStaffingSummary(option),/^Develop 2, redeploy 1, and hire 3.*30 workload hours remain/);
 assert.match(adjustedStaffingSummary({...option,mix:{build:0,move:0,buy:6},shortfallHours:0}),/^Develop 0, redeploy 0, and hire 6.*No workload shortfall/);
 assert.match(adjustedStaffingSummary({...option,shortfallHours:null}),/coverage remains unknown/);
 assert.match(adjustedStaffingSummary({...option,status:'unmet'}),/limits are unmet or unverified/);
});

test('public recruiting context tolerates intentionally omitted recruiter records',()=>{
 const source=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
 assert.match(source,/talentAcquisitionData\.recruiters\?\.slice/);
 assert.doesNotMatch(source,/talentAcquisitionData\.recruiters\.slice/);
});
