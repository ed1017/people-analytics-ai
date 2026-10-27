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
import {loadPublic9037Binding} from '../lib/public-9037.server.mjs';
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
const binding=await loadPublic9037Binding({hostname:'www.ed-ai.app'});
const data={};for(const route of ['skills','finance']){const response=await binding.handle(new Request('https://www.ed-ai.app/api/'+route));assert.equal(response.status,200,route);data[route]=await response.json();}
data.succession={as_of_date:'2026-09-30',small_cell_threshold:10,critical_job_profiles:12,filled_critical_positions:2162,positions_with_recorded_plan:1097,positions_without_recorded_plan:1065,recorded_plan_coverage_pct:50.7,plan_coverage_suppressed:false,positions_with_ready_now:147,positions_without_ready_now:950,ready_now_plan_pct:13.4,ready_now_suppressed:false,suppression_reason:null,data_meta:{successionSemantics:'illustrative-plan-flags'}};
const render=(C,p)=>renderToStaticMarkup(React.createElement(C,p));
const visible=html=>html.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g,'').replace(/<[^>]+>/g,' ');
const selectedContext={country:'All countries',businessUnit:'All business units',level:'All levels'};
const skillsProps={skillsData:data.skills,skillsLoading:false,skillsError:null,maxSkillDemand:100,selectedContext,activeHandoff:null,onCarryToPlanning:noop,onClearHandoff:noop,onOpenPlanning:noop};
const financeProps={financeData:data.finance,financeLoading:false,financeError:null,financeBusinessUnits:data.finance.by_business_unit,financeScenarios:data.finance.scenarios,maxFinanceLaborCost:1};
test('skill and finance methodology is optional while measures remain populated and sources unchanged',()=>{
 for(const [C,props,definition] of [[Skills,skillsProps,/Apparent proficiency gaps compare/],[Finance,financeProps,/Vacancy exposure sums business-unit estimates/]]){
  const before=JSON.stringify(props),html=render(C,props);
  assert.match(html,definition);assert.doesNotMatch(visible(html),definition);
  assert.doesNotMatch(html,/<details[^>]*\bopen/);assert.equal(JSON.stringify(props),before);
 }
 assert.match(render(Skills,skillsProps),/Largest Apparent Proficiency Gaps/);
 assert.match(render(Finance,financeProps),/Total Labor Cost/);
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
