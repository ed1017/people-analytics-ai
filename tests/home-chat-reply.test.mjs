import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeHomeModelReply, buildHomeReplyFormat, homeGoalChoiceInstructions,homeResponseStyle} from '../lib/home-chat-reply.ts';
const homeReplyFormat=buildHomeReplyFormat();
test('goal options follow explicit structured state, never prose matching',()=>{
  assert.equal(decodeHomeModelReply(JSON.stringify({answer:'Retention or capability building?',next_step:'none'}),false).nextStep,'none');
  assert.equal(decodeHomeModelReply(JSON.stringify({answer:'Which business goal should guide us?',next_step:'choose_goal'}),false).nextStep,'choose_goal');
  assert.equal(decodeHomeModelReply(JSON.stringify({answer:'Which goal?',next_step:'choose_goal'}),true).nextStep,'none');
});
test('invalid or incomplete model replies cannot activate controls or leak JSON',()=>{
  for(const value of ['not JSON','null','{}','{"answer":"","next_step":"choose_goal"}','{"answer":"Text","next_step":"allocate"}'])assert.throws(()=>decodeHomeModelReply(value,false));
  assert.equal(homeReplyFormat.strict,true);assert.equal(homeReplyFormat.schema.additionalProperties,false);
});
test('goal request stays open without a fixed pair or invented priority',()=>{
  assert.match(homeGoalChoiceInstructions,/one open question/);
  assert.match(homeGoalChoiceInstructions,/any goal in their own words/);
  assert.doesNotMatch(homeGoalChoiceInstructions,/Retention|Capability building/);
});

test('Home detail mode follows current request, not an older full-plan question in session context',()=>{
 assert.equal(homeResponseStyle('Find a problem worth investigating').expanded,false);
 assert.equal(homeResponseStyle('What next?\n\nSession problem context (user statements): previousQuestion: Develop a full action plan').expanded,false);
 assert.equal(homeResponseStyle('Develop a full action plan continuing our current conversation.').expanded,true);
 assert.equal(homeResponseStyle('Explain in detail').expanded,true);
 assert.ok(homeResponseStyle('Develop a full action plan').maxOutputTokens>=2400);
 assert.match(homeResponseStyle('Develop a full action plan').instructions,/Target250-300words/);
 assert.match(homeResponseStyle('Develop a full action plan').instructions,/never cut off an unfinished answer/);
 assert.equal(homeResponseStyle('What next?').maxOutputTokens,1400);
});

test('distinct Home issues get explicit headings without changing alternative option semantics',()=>{for(const message of ['What issues should we investigate?','Develop a full action plan']){const text=homeResponseStyle(message).instructions;assert.match(text,/Issue A/);assert.match(text,/Issue B/);assert.match(text,/Preserve the individual bullet details/);assert.match(text,/Do not invent, split or infer extra issues/);assert.match(text,/same issue remain Option 1, Option 2/);}});
