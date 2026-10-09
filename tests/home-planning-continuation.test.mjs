import test from 'node:test';
import assert from 'node:assert/strict';
import {strategicPlanningStarters,strategicPlanningContext,strategicPlanningInstructions,planningCalculatorInvitation} from '../lib/home-strategic-planning.ts';
import {homeTurnPurpose} from '../lib/home-conversation.ts';
const user=content=>({role:'user',content}),assistant=content=>({role:'assistant',content});
const proposal='Conditionally compare hiring for urgent specialist coverage and training for repeatable work. Costs, timing and team availability are unknown. These are proposed assumptions, not measurements.';
test('calculator invitation follows the recommendation and requires a UI-supplied popup control',()=>{
 const starter=strategicPlanningStarters[1].prompt;
 const current=strategicPlanningInstructions(starter),available=strategicPlanningInstructions(starter,[],true);
 assert.ok(!current.includes(planningCalculatorInvitation));
 assert.match(current,/do not offer it, invent a link or promise a calculator update/);
 assert.ok(available.includes(planningCalculatorInvitation));
 assert.match(available,/after the recommendation, rationale, next move and any stated assumptions/);
 assert.match(available,/not before them or after every message/);
 assert.match(available,/Opening it changes no assumption acceptance or review\/save state/);
 assert.equal(strategicPlanningInstructions('What movies should I watch?',[],true),'');
});
test('comparisons, constraints, partial agreement and corrections retain the established objective across turns',()=>{
 for(const starter of strategicPlanningStarters){
  const history=[user(starter.prompt),assistant(proposal)];
  for(const text of ['Or how about both?','How about both hiring and training?','What about both options?','Can we combine both approaches?','Can we do it cheaper?','Could we do that sooner?','What about a different team?','What about hiring a director instead?','Yes to training, but not hiring.','I like the training part, but not the costs.','Actually, 25% not 50%.',"We don't have those numbers."]){
   assert.equal(strategicPlanningContext(text,history)?.id,starter.id,text);
   assert.equal(homeTurnPurpose(text,history),'answer',text);
   const instructions=strategicPlanningInstructions(text,history);
   assert.match(instructions,/Lead with a useful grounded or clearly conditional recommendation/);
   assert.match(instructions,/Partial agreement accepts only the stated conversational premise/);
   assert.match(instructions,/Missing or unavailable sources remain unknown/);
   history.push(user(text),assistant(proposal));
  }
 }
});
test('a conversational correction does not request a new goal, and later deliberate workflows still do',()=>{
 const history=[user(strategicPlanningStarters[1].prompt),assistant(proposal)];
 for(const text of ['Make it cheaper.','We need it sooner.','Use the training option.','Correction: budget is $20000.'])assert.equal(homeTurnPurpose(text,history),'answer',text);
 for(const [text,purpose] of [['We need to build capacity in both teams.','goal'],['I need to improve delivery using both approaches.','goal'],['I want to build AI implementation capacity.','goal'],['Develop a full action plan','plan'],['Find another issue','discovery'],['Review the assumptions','answer'],['Calculate the plan','answer'],['Save this plan','answer']])assert.equal(homeTurnPurpose(text,history),purpose,text);
});
test('no objective or preceding answer means elliptical language cannot activate planning',()=>{
 for(const text of ['Both?','Cheaper?','Or how about both?','What about a different team?','What about hiring a director instead?','Use the training option.']){
  for(const history of [[],[assistant(proposal)],[user('Compare these two recipes.'),assistant(proposal)]])assert.equal(strategicPlanningInstructions(text,history),'',text);
  if(text!=='Use the training option.')assert.equal(strategicPlanningInstructions(text,[user(strategicPlanningStarters[0].prompt)]),'',text);
 }
});
test('new topics terminate planning; later comparisons cannot revive the old objective',()=>{
 const initial=[user(strategicPlanningStarters[1].prompt),assistant(proposal)];
 for(const text of ['New topic: hiring.','Let’s talk about cloud pricing.','Switch to employee benefits.','What movies should I watch?','I like this movie.','What about both recipes?','Can you explain photosynthesis?','Can you explain it in terms of photosynthesis?','How about both teams at the football match?','Can we do that for my wedding?','Why was turnover high in April?','No, forget that.']){
  assert.equal(strategicPlanningInstructions(text,initial),'',text);
  assert.equal(strategicPlanningInstructions('Or how about both?',[...initial,user(text),assistant(proposal)]),'',text);
 }
});
