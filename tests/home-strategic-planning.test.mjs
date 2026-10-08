import test from 'node:test';
import assert from 'node:assert/strict';
import {strategicPlanningStarters,strategicPlanningContext,strategicPlanningInstructions} from '../lib/home-strategic-planning.ts';
import {homeTurnPurpose} from '../lib/home-conversation.ts';
import {homeStarterGoal} from '../lib/home-starter-goals.ts';
import {homeForecastIntent} from '../lib/home-forecast-intent.ts';
import {planningPrompts,challengePrompts} from './fixtures/home-starter-prompts.mjs';
const user=content=>({role:'user',content}),assistant=content=>({role:'assistant',content});
test('all five approved business-change openers clarify without goal, forecast or pin shortcuts',()=>{
 assert.deepEqual(strategicPlanningStarters.map(item=>item.prompt),planningPrompts);
 for(const prompt of planningPrompts){
  assert.equal(homeTurnPurpose(prompt),'answer');assert.equal(homeTurnPurpose(prompt+'\n\nFocused issue: Previous goal',[user('Reduce turnover')]),'answer');
  assert.equal(homeStarterGoal(prompt),null);assert.equal(homeForecastIntent(prompt),null);
  const instructions=strategicPlanningInstructions(prompt);
  for(const pattern of [/keep unsupported measured\/source values unknown/,/Role headcounts do not establish available delivery capacity/,/employee snapshots/,/Do not force three plans/,/Never claim that a plan was calculated, saved or executed/])assert.match(instructions,pattern);
 }
});
test('each opener supports provisional planning with reviewable assumptions, not invented project evidence or a full questionnaire',()=>{
 const texts=planningPrompts.map(prompt=>strategicPlanningInstructions(prompt));
 for(const word of ['bid’s scope','likelihood','estimated effort','Three bids are not three confirmed projects'])assert.ok(texts[0].includes(word));
 for(const word of ['product scope','design, engineering','six-month period','not proof that delivery or recruiting is feasible'])assert.ok(texts[1].includes(word));
 for(const word of ['service levels','coverage hours','existing commitments','on-call coverage'])assert.ok(texts[2].includes(word));
 for(const word of ['pipeline and timing','skills and proficiency','training, hiring and delivery costs','guarantee training effects'])assert.ok(texts[3].includes(word));
 for(const word of ['release dates','remaining commitments','upcoming work','not confirmed employee availability'])assert.ok(texts[4].includes(word));
 for(const text of texts){assert.match(text,/propose clearly labelled assumptions separately for the user to review and correct/);assert.match(text,/editable through the conversation/);assert.match(text,/Ask only essential business ambiguity/);assert.match(text,/do not backfill unknown source fields or imply the user confirmed it/);}
});
test('operating-assumption replies stay conversational, including short answers to a relevant clarification',()=>{
 const cases=[
  [0,'What locations will the AI projects cover?','Boston and Chicago.'],
  [1,'What skills does the product require?','We need designers and engineers for the project.'],
  [2,'Which days need managed-services coverage?','Saturday and Sunday.'],
  [2,'What service levels should we assume?','We need 90% of incidents resolved within an hour.'],
  [3,'How much training effort is available?','Eight hours per week.'],
  [4,'When are the project teams expected to become available?','Next April.'],
 ];
 for(const [index,question,reply] of cases){const history=[user(planningPrompts[index]),assistant(question)];assert.equal(strategicPlanningContext(reply,history)?.id,strategicPlanningStarters[index].id,reply);assert.equal(homeTurnPurpose(reply,history),'answer',reply);assert.equal(strategicPlanningContext('Why?',[...history,user(reply),assistant('We can use that as a proposed assumption.')])?.id,strategicPlanningStarters[index].id);}
 const history=[user(planningPrompts[1]),assistant('What scope and delivery effort should we assume for the product?')];
 for(const message of ['Budget is $20000','Use 160 productive hours per month.','What hiring assumptions do we need for the product project?','How many staff do we need?']){assert.equal(strategicPlanningContext(message,history)?.id,'digital-product');assert.equal(homeTurnPurpose(message,history),'answer');}
});
test('topic changes clear planning guidance while intentional later goal, plan, calculation, review and save paths retain their original routing',()=>{
 const history=[user(planningPrompts[1]),assistant('What scope and delivery effort should we assume for the product?')];
 for(const message of [...challengePrompts,'Why was turnover high in April?','What is the weather?','We have a question about employee benefits.','We need to improve workplace safety.','No, forget that.','Cancel the product plan.','New topic: projects.']){
  assert.equal(strategicPlanningInstructions(message,history),'',message);
  assert.equal(strategicPlanningInstructions('Why?',[...history,user(message)]),'',message);
 }
 assert.equal(strategicPlanningContext(planningPrompts[4],history)?.id,'project-redeployment');
 const goalHistory=[user(planningPrompts[0]),user('I want to build AI implementation capacity.'),assistant('What budget should we use?')];
 assert.equal(homeTurnPurpose('Budget is $20000',goalHistory),'goal');
 assert.equal(homeTurnPurpose('Budget is $20000',goalHistory.slice(1)),'goal');
 for(const [message,purpose] of [['I want to reduce turnover','goal'],['Develop a full action plan','plan'],['Find another issue','discovery'],['Calculate the plan','answer'],['Review these project assumptions','answer'],['Save this plan','answer']])assert.equal(homeTurnPurpose(message,history),purpose,message);
 assert.equal(strategicPlanningInstructions('What is the baseline?',[assistant(planningPrompts[1])]),'');
});
