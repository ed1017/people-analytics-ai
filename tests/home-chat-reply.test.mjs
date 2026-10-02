import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeHomeModelReply, homeReplyFormat, homeGoalReplies} from '../lib/home-chat-reply.ts';
test('goal options follow explicit structured state, never prose matching',()=>{
  assert.equal(decodeHomeModelReply(JSON.stringify({answer:'Retention or capability building?',next_step:'none'}),false).nextStep,'none');
  assert.equal(decodeHomeModelReply(JSON.stringify({answer:'Which business goal should guide us?',next_step:'choose_goal'}),false).nextStep,'choose_goal');
  assert.equal(decodeHomeModelReply(JSON.stringify({answer:'Which goal?',next_step:'choose_goal'}),true).nextStep,'none');
});
test('invalid or incomplete model replies cannot activate controls or leak JSON',()=>{
  for(const value of ['not JSON','null','{}','{"answer":"","next_step":"choose_goal"}','{"answer":"Text","next_step":"allocate"}'])assert.throws(()=>decodeHomeModelReply(value,false));
  assert.equal(homeReplyFormat.strict,true);assert.equal(homeReplyFormat.schema.additionalProperties,false);
});
test('quick replies state only an explicit goal, without invented numbers or pinning',()=>{
  assert.match(homeGoalReplies.Retention,/My goal is retention/);
  assert.match(homeGoalReplies['Capability building'],/My goal is capability building/);
  for(const message of Object.values(homeGoalReplies)){assert.match(message,/missing scope and assumptions/);assert.doesNotMatch(message,/\d|pinned|approved/);}
});
