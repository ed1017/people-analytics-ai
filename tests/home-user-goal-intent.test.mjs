import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveHomeUserGoal,homeGoalForPin,homeUserGoalForPin,resolveHomePlanningIntent} from '../lib/home-planning-intent.ts';
import {homeBundleTask} from '../lib/home-bundle-task.ts';
import {decodeHomeModelReply} from '../lib/home-chat-reply.ts';
import {aiSkillsGoalPrompt} from './fixtures/home-ai-skills-goal.mjs';

const explicit=['Build AI skills without adding headcount','Help me build AI skills',"I'd like to build AI skills",'I’d like to build AI skills','I would like to build AI skills','We need stronger AI skills','Goal: AI skills without extra headcount',aiSkillsGoalPrompt];
const review=['Can we build AI skills?','Can we build AI skills','We need training or hiring','We need not build AI skills',"I'd like to discuss AI skills",'Build','Help me build a plan','Build AI skills or hire specialists','Build '+ 'specific skills '.repeat(25)];
const none=['What does the evidence say about building AI skills?','How can we improve AI skills?','We need advice about AI skills','We need to know whether AI training helps','Help me understand AI skills','Help me choose between training and hiring'];
const pack={sources:[{id:'W1',status:'loaded',facts:{headcount:100}}]};
const shapes={valid:{problem:'Review workforce support',problem_evidence:['W1.headcount'],options:[{operation:'review_capacity',evidence:['W1.headcount']}]},invalid:{problem:'Build skills in 90 days',problem_evidence:['W1.headcount'],options:[{},{}]},empty:{problem:null,problem_evidence:[],options:[]}};
for(const [shape,fields] of Object.entries(shapes))test(`${shape} AI candidates never determine the user-only result`,()=>{
 const reply=decodeHomeModelReply(JSON.stringify({answer:'Build a model-selected objective.',next_step:'none',question:null,...fields}),false,pack);
 assert.equal(Boolean(reply.candidateProposal),shape==='valid');
 for(const [status,texts] of [['explicit_outcome',explicit],['needs_review',review],['no_goal',none]])for(const text of texts){
  const result=resolveHomeUserGoal([text]);assert.equal(result.status,status,text);
  assert.equal(homeGoalForPin([text]),homeUserGoalForPin([text]));
  if(status==='explicit_outcome'){assert.equal(result.goal,text.replace(/^Goal: /,''));assert.equal(text.slice(result.source.start,result.source.end),result.source.text);}
  else assert.equal(homeUserGoalForPin([text]),null);
 }
});
test('goal inside a conversation survives later context and preserves its exact source span',()=>{
 const statements=['What does the evidence show?','Build AI skills','Use USD20,000 as a cap.'];
 const result=resolveHomeUserGoal(statements);assert.equal(result.goal,'Build AI skills');assert.equal(result.source.statement,1);assert.equal(result.contextStart,0);
 assert.deepEqual(statements.slice(result.contextStart),statements);
});
test('sentence and newline contexts preserve the outcome and literal day units',()=>{
 for(const text of ['Build AI skills within 90 days. What evidence is available?','Build AI skills within 90 days\nUse USD20,000 as a cap.','What evidence is available? Build AI skills within 90 days.']){
  const result=resolveHomeUserGoal([text]);assert.equal(result.status,'explicit_outcome');assert.match(result.goal,/^Build AI skills within 90 days\.?$/);assert.equal(text.slice(result.source.start,result.source.end),result.source.text);assert.equal(resolveHomePlanningIntent([text]).months,null);
 }
 const long='Build AI skills. '+ 'Use existing capacity and review assumptions. '.repeat(8);
 assert.equal(resolveHomeUserGoal([long]).goal,'Build AI skills.');
});
test('withdrawals remain withdrawn through questions but a repeated explicit goal can be restated',()=>{
 for(const withdrawal of ['Actually, do not make that my goal','Cancel that goal','Forget my goal','Withdraw the goal',"Don't pin that",'I no longer want that goal',"I don't want this goal"]){
  const statements=['Build AI skills',withdrawal,'What evidence is available?'];
  assert.equal(resolveHomeUserGoal(statements).reason,'withdrawn',withdrawal);assert.equal(homeUserGoalForPin(statements),null);
  assert.equal(homeUserGoalForPin([...statements,'Build AI skills']),'Build AI skills');
 }
 assert.equal(resolveHomeUserGoal(['Build AI skills',"I don't want to hire"]).status,'needs_review');
});
test('revision replaces the active intent and excludes earlier goal context',()=>{
 const result=resolveHomeUserGoal(['Build AI skills','Use a USD20000 budget','Instead, improve manager support','Use a USD5000 budget']);
 assert.equal(result.goal,'Instead, improve manager support');assert.equal(result.contextStart,2);
 assert.equal(resolveHomeUserGoal(['Build AI skills. Improve retention.']).status,'needs_review');
 assert.equal(resolveHomeUserGoal(['Build AI skills. Instead, improve retention.']).goal,'Instead, improve retention.');
 assert.equal(resolveHomeUserGoal(['Build AI skills','We need training or hiring']).status,'needs_review');
});
test('skills improvements request delivery but analytical questions and withdrawn intent do not',()=>{
 for(const goal of explicit)assert.equal(homeBundleTask({goal,notes:[]}), 'delivery',goal);
 for(const goal of [...none,...review,'Investigate whether we should improve AI skills'])assert.equal(homeBundleTask({goal,notes:[]}), 'diagnostic',goal);
 assert.equal(homeBundleTask({goal:'Build AI skills',notes:[{text:'Cancel that goal'}]}),'diagnostic');
 assert.equal(homeBundleTask({goal:'Investigate AI skills',notes:[{text:aiSkillsGoalPrompt}]}),'delivery');
});
