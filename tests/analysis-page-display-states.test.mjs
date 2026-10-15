import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import * as format from '../lib/display-format.ts';
import * as scope from '../lib/talent-evidence-scope.ts';
import * as numeric from '../lib/numeric-contract.ts';
import * as legacy from '../lib/legacy-source-contracts.ts';
import * as finance from '../lib/finance-vacancy-basis.ts';
import * as extension from '../lib/synthetic-ta/extension.ts';

const require = createRequire(import.meta.url);
const omit = () => null;
// Render the real pages and formatters; isolate charts, independent data panels,
// and navigation so this suite cannot fetch data or dispatch a model request.
const aliases = {
  '@/lib/display-format': format,
  '@/lib/talent-evidence-scope': scope,
  '@/lib/numeric-contract': numeric,
  '@/lib/legacy-source-contracts': legacy,
  '@/lib/finance-vacancy-basis': finance,
  '@/lib/synthetic-ta/extension': extension,
  '@/components/evidence-table-region': {EvidenceTableRegion: ({children}) => React.createElement('div', null, children)},
  '@/components/evidence-scope-notice': {EvidenceScopeNotice: omit},
  '@/components/skills-evidence-handoff-panel': {SkillsEvidenceHandoffPanel: omit},
  '@/components/planning-guide': {PlanningGuide: omit},
  '@/components/synthetic-domain-demo': {SyntheticDomainDemo: omit},
  '@/components/synthetic-exit-count-example': {SyntheticExitCountExample: omit},
  '@/components/exit-survey-feedback': {ExitSurveyFeedback: omit},
  '@/components/calibrated-ta-panels': {CalibratedTaPanels: () => React.createElement('p', null, 'Verified calibration panel')},
  recharts: Object.fromEntries(['Bar', 'BarChart', 'CartesianGrid', 'Line', 'LineChart', 'ResponsiveContainer', 'Tooltip', 'XAxis', 'YAxis'].map(name => [name, omit])),
};
function loadPage(file, name) {
  const source = fs.readFileSync(new URL(`../components/pages/${file}-page.tsx`, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, {compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  vm.runInNewContext(js, {exports, require: name => {
    if (name.startsWith('@/') && !Object.hasOwn(aliases, name)) throw Error(`Unmocked page dependency: ${name}`);
    return aliases[name] ?? require(name);
  }});
  return exports[name];
}
const selectedContext = {country: 'All countries', businessUnit: 'All business units', level: 'All levels'};
const as_of = '2026-09-30';
const taData = {as_of, summary: {open_requisitions: 0, open_positions: 0, applications: 0, application_to_hire_pct: null, median_time_to_fill_days: null, avg_time_to_fill_days: null, open_reqs_over_60_days: 0, median_open_req_age_days: null, interviewed_applications: 0, application_to_interview_pct: null, offered_applications: 0, interview_to_offer_pct: null, hires: 0, offer_to_hire_pct: null, external_hires: 0, internal_hires: 0, offer_acceptance_pct: null}, monthly: [], business_units: [], sources: [], recruiters: []};
const cases = [
  {file: 'attrition', name: 'AttritionPage', loaded: /Voluntary Turnover YTD/, props: {exitData: null, exitLoading: false, exitError: null}, data: {as_of, summary: {voluntary_turnover_ytd_pct: 0, voluntary_exits: 0, annualized_voluntary_turnover_pct: 0, regrettable_exits: 0, regrettable_share_of_voluntary_pct: 0, total_exits: 0, total_turnover_ytd_pct: 0}, trend: [], business_units: [], reasons: [], tenure: [], levels: []}},
  {file: 'workforce', name: 'WorkforcePage', loaded: /People Managers/, data: {as_of, summary: {headcount: 1, fte: 1, people_managers: 0, avg_span_of_control: 0, avg_tenure_years: 0, full_time_headcount: 1, hybrid_headcount: 0, remote_headcount: 0}, movements: [], trend: [], business_units: [], levels: [], tenure: [], countries: []}},
  {file: 'finance', name: 'FinancePage', prefix: 'finance', loaded: /Finance headline metrics/, props: {financeBusinessUnits: [], financeScenarios: [], maxFinanceLaborCost: 0}, data: {as_of, current: {headcount: 1, fte: 1, labor_cost_usd: 0, cost_per_fte_usd: 0, vacant_positions: 0, estimated_vacancy_cost_exposure_usd: 0}}},
  {file: 'skills', name: 'SkillsPage', prefix: 'skills', loaded: /Skills Below 60%/, props: {selectedContext, maxSkillDemand: 0, activeHandoff: null, onCarryToPlanning() {}, onClearHandoff() {}, onOpenPlanning() {}}, data: {as_of, summary: {current_workforce: 1, active_skills: 0, skills_below_60_pct: 0, weighted_requirement_met_pct: null, onet_mapped_job_profiles: 0, total_job_profiles: 0, average_profile_coverage_pct: null}, largest_gaps: [], highest_demand: []}},
  {file: 'talent-acquisition', name: 'TalentAcquisitionPage', loaded: /Current-status Open Requisitions/, data: taData},
  {file: 'career-mobility', name: 'CareerMobilityPage', loaded: /Preference Record Coverage/, props: {selectedContext}, data: {as_of, summary: {active_employees: 1, employees_with_preference: 0, preference_record_coverage_pct: 0, employees_without_preference: 1, relocation_willing_pct: null, relocation_willing_employees: 0, known_relocation_records: 0, destination_profile_records: 0, career_interest_records: 0, destination_location_records: 0}, data_quality: {employees_with_multiple_preference_rows: 0, missing_desired_profile: 0, missing_desired_location: 0, missing_relocation_willingness: 0, earliest_preference_update: null, latest_preference_update: null}, career_interests: [], destination_roles: [], desired_locations: [], current_org_coverage: [], methodology: []}},
  {file: 'learning-development', name: 'LearningDevelopmentPage', loaded: /Gap Skills/, props: {selectedContext}, data: {as_of, summary: {current_workforce: 1, current_gap_skills: 0, gap_skills_with_active_pathway: 0, gap_pathway_coverage_pct: null, active_courses_on_gap_skills: 0, job_profiles_with_any_pathway: 0, active_job_profiles: 0}, skill_pathways: [], job_profile_pathways: [], methodology: []}},
  {file: 'survey-sentiment', name: 'SurveySentimentPage', loaded: /Engagement Favorable/, data: {as_of, summary: {engagement_favorable_pct: 0, engagement_participation_pct: 0, engagement_respondents: 0, engagement_eligible_population: 1, manager_favorable_pct: null, onboarding_90_favorable_pct: null, open_text_comments: 0}, engagement_trend: [], onboarding_dimensions: [], engagement_dimensions: [], business_units: [], pulse_dimensions: [], manager_dimensions: []}},
];
for (const item of cases) {
  const Page = loadPage(item.file, item.name);
  const key = field => item.prefix ? item.prefix + field[0].toUpperCase() + field.slice(1) : field;
  const render = ({data = null, loading = false, error = null} = {}) => renderToStaticMarkup(React.createElement(Page, {...item.props, [key('data')]: data, [key('loading')]: loading, [key('error')]: error}));
  test(`${item.name}: pending, failure, empty and successful data are distinct`, () => {
    for (const data of [null, item.data]) {
      const pending = render({data, loading: true, error: 'Previous request failed.'});
      assert.match(pending, /role="status"[^>]*>[\s\S]*?Loading /);
      assert.doesNotMatch(pending, /role="alert"|No [^<]*data returned|Previous request failed|As of September|calibration snapshot/);
      assert.doesNotMatch(pending, item.loaded);
      const failed = render({data, error: 'Source request failed.'});
      assert.match(failed, /role="alert"[^>]*>[\s\S]*?Source request failed\./);
      assert.doesNotMatch(failed, /No [^<]*data returned|Loading |As of September|calibration snapshot/);
      assert.doesNotMatch(failed, item.loaded);
    }
    const empty = render();
    assert.match(empty, /role="status"[^>]*>[\s\S]*?No [^<]*data returned\./);
    assert.doesNotMatch(empty, /role="alert"|Loading |As of September/);
    const loaded = render({data: item.data});
    assert.match(loaded, item.loaded);
    assert.match(loaded, />0(?:\.0|%|\s|<)/, 'genuine zero metrics remain visible');
    assert.doesNotMatch(loaded, /No [^<]*data returned|role="alert"|Loading /);
  });
}

test('Talent Acquisition distinguishes absent, mismatched and separate calibration after loading', () => {
  const Page = loadPage('talent-acquisition', 'TalentAcquisitionPage');
  const render = props => renderToStaticMarkup(React.createElement(Page, {data: taData, loading: false, error: null, ...props}));
  assert.doesNotMatch(render({data: null}), /calibration snapshot|not released for this dataset/);
  assert.match(render({}), /source data does not match the calibration snapshot/);
  const matched = {...taData, modeled_extension: extension.taExtension};
  assert.match(render({data: matched}), /Verified calibration panel/);
  assert.doesNotMatch(render({data: matched, loading: true}), /Verified calibration panel|calibration snapshot/);
  assert.doesNotMatch(render({data: matched, error: 'Request failed.'}), /Verified calibration panel|calibration snapshot/);
  const separate = {...matched, data_meta: {datasetId: 'example-v2', datasetToken: 'example-v2:1', dataClass: 'constructed-synthetic'}};
  assert.match(render({data: separate}), /not released for this dataset/);
  assert.doesNotMatch(render({data: separate}), /Verified calibration panel|calibration snapshot/);
});
