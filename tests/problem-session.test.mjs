import test from 'node:test';
import assert from 'node:assert/strict';
import { getProblemChatHistory, rememberProblemQuestion, withProblemContext, boundSessionTranscript, ProblemRequestGate, validateFocusedIssue } from '../lib/problem-session.ts';
import { getPlanningGuide, planningGuideSteps } from '../lib/planning-guide.ts';
test('page change preserves bounded conversation but labels earlier answers as historical', () => {
  const prior={key:'Home evidence',messages:[{role:'user',content:'Improve feedback by Q3'},{role:'assistant',content:'Old scoped evidence'}]};
  const history=getProblemChatHistory(prior,'Skills evidence');
  assert.equal(history[0].content,'Improve feedback by Q3');
  assert.match(history[1].content,/not verified current-page evidence/);
  assert.equal(prior.messages[1].content,'Old scoped evidence');
  assert.equal(getProblemChatHistory({key:'Skills evidence',messages:history},'Planning evidence')[1].content,history[1].content);
});
test('session goal survives page changes, latest corrections remain explicit, and reset is empty', () => {
  let problem=rememberProblemQuestion(null,'Home','Investigate feedback');
  problem=rememberProblemQuestion(problem,'Skills','Use Q3 instead');
  const request=withProblemContext('What evidence is available here?',problem);
  assert.match(request,/Investigate feedback/);assert.match(request,/Use Q3 instead/);assert.match(request,/user statements, not source evidence/);
  assert.equal(withProblemContext('New problem',null),'New problem');
  assert.deepEqual(getProblemChatHistory({key:'',messages:[]},'Home'),[]);
});
test('session memory is bounded without mutating prior transcript',()=>{
  const all=Array.from({length:60},(_,i)=>({role:'user',content:'q'+i}));
  assert.equal(boundSessionTranscript(all).length,40);assert.equal(all.length,60);
  assert.equal(getProblemChatHistory({key:'old',messages:all},'new').length,8);
});
test('Planning help preserves five core destinations and supports only relevant additions',()=>{
  assert.deepEqual(planningGuideSteps.map(s=>s.page),['planning-overview','scenario-modeling','position-workforce-design','workforce-response','execution-feasibility']);
  for(const page of [...planningGuideSteps.map(s=>s.page),'finance','development-planning','workforce-planning'])assert.ok(getPlanningGuide(page)?.first);
  assert.equal(getPlanningGuide('home'),undefined);assert.equal(getPlanningGuide('compensation'),undefined);
  assert.match(getPlanningGuide('development-planning').first,/unknown costs stay unknown/);
});


test('focused issue is explicit bounded goal context, not an evidence filter',()=>{
  const old=rememberProblemQuestion(null,'home','Old unrelated issue');
  const request=withProblemContext('Compare available options',old,'Improve manager feedback by Q3');
  assert.match(request,/Focused issue/);assert.match(request,/Improve manager feedback by Q3/);
  assert.doesNotMatch(request,/Old unrelated issue/);assert.match(request,/not evidence or a data filter/);
  assert.equal(withProblemContext('General exploration',null,''),'General exploration');
  assert.ok(validateFocusedIssue('   '));assert.ok(validateFocusedIssue('x'.repeat(241)));assert.equal(validateFocusedIssue(' A goal '),null);
});
test('edit clear reset or a newer request invalidates and aborts old asynchronous work',()=>{
  const gate=new ProblemRequestGate();const old=gate.begin();assert.equal(old.current(),true);
  gate.invalidate();assert.equal(old.current(),false);assert.equal(old.signal.aborted,true);
  const next=gate.begin();const latest=gate.begin();assert.equal(next.current(),false);assert.equal(latest.current(),true);
  gate.invalidate();assert.equal(latest.current(),false);
});
