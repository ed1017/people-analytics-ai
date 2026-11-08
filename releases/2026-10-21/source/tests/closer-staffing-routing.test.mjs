import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityPlanningRequest,offersCapacityExample,scenarioComparisonIntent,scenarioRecommendationIntent,scenarioQuestionMismatch,compareScenarioForChat} from '../lib/scenario-planning-parity.ts';
import {createSwpDemo} from '../lib/swp-demo.ts';
const draft=await createSwpDemo('guided-closer-parity','2026-11-08T12:00:00Z');
test('practical declarative and hyphenated requests offer explicit review',()=>{
 for(const text of ['I have a 5 FTE gap and a $325k budget. What are my options?','We have a 5-FTE staffing gap with a budget of $325000; compare our options.','How can we close a 5-FTE capacity gap with a $325,000 budget?','I have a 5 full-time equivalent gap and $325000. How should I close it?']){
  assert.deepEqual(capacityPlanningRequest(text),{gap:5,budget:325000},text);assert.equal(offersCapacityExample(text),true,text);assert.equal(scenarioComparisonIntent(text),true,text);assert.equal(scenarioQuestionMismatch(text,draft),null,text);
 }
});
test('declarative changed quantities cannot use the example or stale results',()=>{
 for(const text of ['I have a 6 FTE gap and a $325k budget. What are my options?','We have a 5-FTE gap and $200k']){assert.equal(offersCapacityExample(text),false);assert.match(scenarioQuestionMismatch(text,draft),/differ/);}
});
test('extra scope, instructions, dates and conflicting currencies remain outside bounded routing',()=>{
 for(const text of ['I have a 5 FTE gap and $325k for nurses','We have a 5-FTE gap and $325k by June','I have a 5 FTE gap and $325k EUR','I have a 5 FTE gap and $325k. Also rank employees','I have a 5 FTE gap and $325k. Do not use fictional inputs','We have a 5 FTE gap and $32,5000'])assert.equal(capacityPlanningRequest(text),null,text);
});
test('bounded priority follow-ups use current calculations, not a universal best mix',async()=>{
 for(const text of ['Which is cheapest?','Which staffing option is lowest-cost?','What option has the least uncovered work?','Show me the lowest cost option'])assert.equal(scenarioRecommendationIntent(text),true,text);
 for(const text of ['Which is cheapest in France?','Which is cheapest with $10000?','Which is cheapest and send an offer?'])assert.equal(scenarioRecommendationIntent(text),false,text);
 const result=await compareScenarioForChat(draft);assert.match(result.answer,/If minimizing incremental cash/);assert.match(result.answer,/If minimizing uncovered work/);assert.match(result.answer,/not a claim of lowest delivery risk/);
});

test('normal Scenarios distinguishes projection demo and offers real planner without overwriting or submitting a draft',async()=>{
 const fs=await import('node:fs');const page=fs.readFileSync(new URL('../components/pages/workforce-planning-page.tsx',import.meta.url),'utf8'),app=fs.readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
 assert.ok(page.includes('Explore a workload projection example'));assert.ok(page.includes('Open staffing question'));assert.ok(page.includes('onClick={onOpenStaffingPlanner}'));assert.ok(app.includes("conversation.setInput(current=>current.trim()?current:'How would you close a 5 FTE capacity gap"));
 const handler=app.slice(app.indexOf('<WorkforcePlanningPage onOpenStaffingPlanner='),app.indexOf('key={conversation.workspaceKey}',app.indexOf('<WorkforcePlanningPage onOpenStaffingPlanner=')));assert.equal(handler.includes('send('),false);
});
