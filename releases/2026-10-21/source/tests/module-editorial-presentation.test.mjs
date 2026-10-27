import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentModule} from './fixtures/component-module.mjs';
import * as findings from '../lib/key-findings.ts';
import * as display from '../lib/display-format.ts';
import * as catalog from '../lib/catalog-display.ts';
import * as scope from '../lib/talent-evidence-scope.ts';
import * as period from '../lib/evidence-period-label.ts';
import * as vacancy from '../lib/finance-vacancy-basis.ts';
import {DOMAIN_DEMO_LABELS} from '../lib/dataset-display-context.mjs';
const noop=()=>null;
const aliases={
 '@/components/key-findings':componentModule('key-findings.tsx'),
 '@/lib/key-findings':findings,'@/lib/display-format':display,'@/lib/catalog-display':catalog,
 '@/lib/talent-evidence-scope':scope,'@/lib/evidence-period-label':period,'@/lib/finance-vacancy-basis':vacancy,
 '@/components/evidence-scope-notice':componentModule('evidence-scope-notice.tsx',{'@/lib/talent-evidence-scope':scope}),
 '@/components/skills-evidence-handoff-panel':{SkillsEvidenceHandoffPanel:noop},
 '@/components/planning-guide':{PlanningGuide:noop},
};
const Skills=componentModule('pages/skills-page.tsx',aliases).SkillsPage;
const Finance=componentModule('pages/finance-page.tsx',aliases).FinancePage;
const Succession=componentModule('pages/succession-planning-page.tsx',aliases).SuccessionPlanningPage;
// Invented presentation fixtures, independent of deployment input artifacts.
// These exercise visible values and states; binding/provenance tests cover source validation separately.
const skill={skill_code:'TEST-SKILL',skill_name:'Test financial analysis',skill_category:'Finance',employees_in_roles_requiring_skill:10,employees_with_observed_proficiency:8,employees_meeting_requirement:4,employees_below_or_missing_requirement:6,requirement_met_pct:40,avg_required_proficiency:3,avg_observed_proficiency:2};
const businessUnit={org_code:'TEST-BU',org_name:'Test business unit',headcount:10,fte:9.5,labor_cost_usd:950000,cost_per_fte_usd:100000,vacant_positions:2,estimated_vacancy_cost_exposure_usd:200000,share_of_enterprise_labor_cost_pct:100};
const data={
 skills:{as_of:'2026-09-30',summary:{current_workforce:10,active_skills:1,skills_below_60_pct:1,weighted_requirement_met_pct:40,onet_mapped_job_profiles:1,total_job_profiles:1,average_profile_coverage_pct:80},largest_gaps:[skill],highest_demand:[skill]},
 finance:{as_of:'2026-09-30',current:{headcount:10,fte:9.5,labor_cost_usd:950000,cost_per_fte_usd:100000,vacant_positions:2,estimated_vacancy_cost_exposure_usd:200000},by_business_unit:[businessUnit],scenarios:[{scenario_name:'Test baseline',planned_labor_cost_usd:950000,planned_headcount:10,labor_cost_delta_vs_baseline_usd:0,headcount_delta_vs_baseline:0}]},
};
data.succession={as_of_date:'2026-09-30',small_cell_threshold:10,critical_job_profiles:12,filled_critical_positions:2162,positions_with_recorded_plan:1097,positions_without_recorded_plan:1065,recorded_plan_coverage_pct:50.7,plan_coverage_suppressed:false,positions_with_ready_now:147,positions_without_ready_now:950,ready_now_plan_pct:13.4,ready_now_suppressed:false,suppression_reason:null,data_meta:{successionSemantics:'illustrative-plan-flags'}};
const render=(C,p)=>renderToStaticMarkup(React.createElement(C,p));
const visible=html=>html.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g,'').replace(/<[^>]+>/g,' ');
const selectedContext={country:'All countries',businessUnit:'All business units',level:'All levels'};
const skillsProps={skillsData:data.skills,skillsLoading:false,skillsError:null,maxSkillDemand:100,selectedContext,activeHandoff:null,onCarryToPlanning:noop,onClearHandoff:noop,onOpenPlanning:noop};
const financeProps={financeData:data.finance,financeLoading:false,financeError:null,financeBusinessUnits:data.finance.by_business_unit,financeScenarios:data.finance.scenarios,maxFinanceLaborCost:950000};
test('skill and finance methodology is optional while measures remain populated and sources unchanged',()=>{
 for(const [C,props,definition] of [[Skills,skillsProps,/Apparent proficiency gaps compare/],[Finance,financeProps,/Vacancy exposure sums business-unit estimates/]]){
  const before=JSON.stringify(props),html=render(C,props);
  assert.match(html,definition);assert.doesNotMatch(visible(html),definition);
  assert.doesNotMatch(html,/<details[^>]*\bopen/);assert.equal(JSON.stringify(props),before);
 }
 assert.match(render(Skills,skillsProps),/Largest Apparent Proficiency Gaps/);
 assert.match(render(Finance,financeProps),/Total Labor Cost/);
 assert.match(render(Skills,skillsProps),/Test financial analysis/);
 assert.match(render(Finance,financeProps),/Test business unit/);
 assert.match(render(Finance,financeProps),/\$950,000/);
});
test('succession zero, suppression and unavailable states retain their distinctions without internal QA prose',()=>{
 const props={data:data.succession,loading:false,error:null,selectedContext};
 const normal=render(Succession,props);assert.doesNotMatch(visible(normal),/not assessed readiness|valid zero state|No fallback|paired partitions/);
 const suppressed=render(Succession,{...props,data:{...data.succession,plan_coverage_suppressed:true,positions_with_recorded_plan:null,positions_without_recorded_plan:null,recorded_plan_coverage_pct:null}});
 assert.match(suppressed,/Suppressed/);assert.match(suppressed,/Small-cell protection applied/);assert.doesNotMatch(visible(suppressed),/related totals/);
 const empty=render(Succession,{...props,data:{...data.succession,filled_critical_positions:0}});assert.match(empty,/No filled critical positions are recorded/);
 const failure=render(Succession,{...props,data:null,error:'Source failed'});assert.match(failure,/Succession summary unavailable/);assert.match(failure,/Reload to try again/);
});
test('loading and errors never expose stale metrics or their definitions',()=>{
 const loading=render(Skills,{...skillsProps,skillsLoading:true});assert.doesNotMatch(loading,/Largest Apparent Proficiency Gaps|Apparent proficiency gaps compare/);
 const failure=render(Finance,{...financeProps,financeError:'Source failed'});assert.doesNotMatch(failure,/Vacancy exposure sums|Total Labor Cost/);assert.match(failure,/Source failed/);
});

test('public succession metadata describes the evidence without internal suppression instructions',()=>{assert.doesNotMatch(DOMAIN_DEMO_LABELS.T5.limitation,/Never derive|individual recommendations/);assert.match(DOMAIN_DEMO_LABELS.T5.limitation,/Readiness requires assessment/);assert.match(DOMAIN_DEMO_LABELS.T5.limitation,/protected counts remain unavailable/);});

test('fixture finance zero and missing amounts remain distinct in the actual rendered metric',()=>{
 const metric=value=>render(Finance,{...financeProps,financeData:{...data.finance,current:{...data.finance.current,labor_cost_usd:value}}}).match(/Total Labor Cost<\/p><p[^>]*>([^<]*)<\/p>/)?.[1];
 assert.equal(metric(0),'$0');assert.equal(metric(null),'Unavailable');
});
