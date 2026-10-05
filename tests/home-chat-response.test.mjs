import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectHomeChatResponse} from '../lib/home-chat-response.ts';
import {homeResponseStyle} from '../lib/home-chat-reply.ts';
const pack={sources:[{id:'W1',status:'loaded',facts:{headcount:10}}]};
const finding={id:'f1',text:'The snapshot contains ten employees; scope is limited. [W1]',evidence:['W1:summary'],prompt:'What can this limited snapshot tell us?'};
const reply={answer:'Review the supplied snapshot.\n- '+finding.text,finding_followups:[finding],next_step:'none',problem:null,problem_evidence:[],options:[],question:null};
const response={status:'completed',output:[],output_text:JSON.stringify(reply),usage:{input_tokens:1000,output_tokens:900,total_tokens:1900,output_tokens_details:{reasoning_tokens:300}}};
test('completed response retains exact answer and validated pairs with safe actual usage',()=>{
 const result=inspectHomeChatResponse(response,false,pack,4000);
 assert.equal(result.ok,true);assert.equal(result.body.answer,reply.answer);assert.deepEqual(result.body.findingFollowups,[finding]);
 assert.deepEqual(result.body.homeReplyDiagnostic.usage,{input_tokens:1000,output_tokens:900,total_tokens:1900,reasoning_tokens:300});
 assert.equal(result.body.homeReplyDiagnostic.reason,'ready');assert.equal(result.body.homeReplyDiagnostic.outputTokenLimit,4000);
});
for(const [name,patch,reason] of [
 ['truncated JSON after budget exhaustion',{status:'incomplete',output_text:'{"answer":"unfinished',incomplete_details:{reason:'max_output_tokens'}},'token_limit'],
 ['apparently valid partial output',{status:'incomplete',incomplete_details:{reason:'max_output_tokens'}},'token_limit'],
 ['other incomplete output',{status:'incomplete',incomplete_details:{reason:'content_filter'}},'incomplete_output'],
 ['failed response',{status:'failed',error:{message:'SECRET_PAYLOAD'}},'response_not_completed'],
 ['unknown status',{status:'SECRET_PAYLOAD'},'response_not_completed'],
 ['refusal',{output:[{type:'message',content:[{type:'refusal',refusal:'SECRET_PAYLOAD'}]}]},'refusal'],
 ['empty completed output',{output_text:' '},'empty_output'],
 ['malformed completed JSON',{output_text:'SECRET_PAYLOAD { malformed'},'invalid_json'],
 ['invalid completed envelope',{output_text:'{"answer":null,"secret":"SECRET_PAYLOAD"}'},'invalid_reply'],
 ['oversized completed output',{output_text:'x'.repeat(48001)},'output_too_large'],
])test('safe classification: '+name,()=>{
 const result=inspectHomeChatResponse({...response,...patch},false,pack,4000);
 assert.equal(result.ok,false);assert.equal(result.body.homeReplyDiagnostic.reason,reason);assert.match(result.body.error,/No retry ran automatically/);
 assert.equal(result.body.answer,undefined);assert.equal(result.body.findingFollowups,undefined);assert.ok(!JSON.stringify(result).includes('SECRET_PAYLOAD'));
});
test('diagnostic strings and nested usage cannot carry model prose, exceptions or credentials',()=>{
 const result=inspectHomeChatResponse({status:'incomplete',incomplete_details:{reason:'SECRET_PAYLOAD'},output_text:'SECRET_PAYLOAD',usage:{input_tokens:'SECRET_PAYLOAD',output_tokens:-1,total_tokens:Infinity,output_tokens_details:{reasoning_tokens:'SECRET_PAYLOAD',secret:'SECRET_PAYLOAD'},secret:'SECRET_PAYLOAD'}},false,pack,4000);
 assert.equal(result.body.homeReplyDiagnostic.incompleteReason,'other');assert.ok(!JSON.stringify(result).includes('SECRET_PAYLOAD'));
 assert.deepEqual(result.body.homeReplyDiagnostic.usage,{input_tokens:null,output_tokens:null,total_tokens:null,reasoning_tokens:null});
});
test('four bounded finding pairs and escaped JSON survive complete decoding without clipping',()=>{
 const findings=Array.from({length:4},(_,i)=>({...finding,id:`f${i+1}`,text:`Finding ${i+1}: "${'recorded context '.repeat(13)}" remains uncertain. [W1]`,prompt:`For finding ${i+1}, ${'review source scope and uncertainty '.repeat(5).trim()}?`}));
 assert.ok(findings.every(item=>item.text.length<=280&&item.prompt.length<=240));
 const complete={...reply,answer:findings.map(item=>'- '+item.text).join('\n'),finding_followups:findings};
 const result=inspectHomeChatResponse({...response,output_text:JSON.stringify(complete)},false,pack,4000);
 assert.equal(result.ok,true);assert.deepEqual(result.body.findingFollowups,findings);assert.equal(result.body.answer,complete.answer);
});
test('bounded output headroom preserves concise user-facing word targets',()=>{
 assert.equal(homeResponseStyle('Review recorded findings').maxOutputTokens,4000);
 assert.equal(homeResponseStyle('Explain in detail').maxOutputTokens,6000);
 assert.match(homeResponseStyle('Review findings').instructions,/Target80-120words/);
 assert.match(homeResponseStyle('Explain in detail').instructions,/Target250-300words/);
});
