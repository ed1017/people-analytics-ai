import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {homeConversationErrorMessage} from '../lib/home-evidence-recovery.mjs';
const correlationId='12345678-abcd-4abc-8abc-123456789abc';
const messages={
 home_answer_unavailable:'The AI response could not be verified. This is an app processing failure, not a problem with your question. No completed answer was saved.',
 home_request_unverified:'This request or its current evidence could not be checked. Refresh Home, review the selected scope, and try again.',
 home_request_interrupted:'This answer took too long or was cancelled. No completed answer was saved. You can review your question and send it again.',
 planner_admission_unavailable:'AI could not start this answer because spending approval is unavailable. Ask the app owner to check the remaining budget or budget service before retrying.',
};
test('each known public failure retains its message and displays a validated reference as text',()=>{
 for(const [code,error]of Object.entries(messages)){
  const input={code,error,correlationId},before=structuredClone(input),message=homeConversationErrorMessage(input);
  assert.equal(message,error+' Reference: '+correlationId+'.');assert.deepEqual(input,before);
  const html=renderToStaticMarkup(React.createElement('p',{role:'alert'},message));
  assert.match(html,/role="alert"/);assert.ok(html.includes(correlationId));assert.doesNotMatch(html,/<a |<script|onclick/);
 }
 const error='AI could not finish this answer because spending approval for the next step is unavailable. Ask the app owner to check the budget before retrying.';
 assert.equal(homeConversationErrorMessage({code:'planner_admission_unavailable',error,correlationId}),error+' Reference: '+correlationId+'.');
});
test('missing, malformed and oversized references never enter the public error text',()=>{
 for(const id of [undefined,null,42,{},'',correlationId+'x','x'.repeat(20000),'<img src=x onerror=alert(1)>','12345678-abcd-1abc-8abc-123456789abc'])for(const [code,error]of Object.entries(messages))assert.equal(homeConversationErrorMessage({code,error,correlationId:id}),error);
});
test('known codes never forward arbitrary provider bodies or markup; unknown codes gain no new reference',()=>{
 const error='<script>SECRET_PROVIDER_BODY</script>';
 for(const code of Object.keys(messages)){
  const message=homeConversationErrorMessage({code,error,correlationId,providerBody:'PRIVATE'});
  assert.equal(message,messages[code]+' Reference: '+correlationId+'.');assert.doesNotMatch(message,/SECRET|PRIVATE|script/);
 }
 assert.equal(homeConversationErrorMessage({code:'unknown',error:'Existing error',correlationId}),'Existing error');
 assert.equal(homeConversationErrorMessage(null),'The conversation response is unavailable.');
});
test('existing evidence failure keeps its draft-preservation guidance and reference validation',()=>{
 const message=homeConversationErrorMessage({code:'evidence_deadline',error:'SECRET',correlationId});
 assert.match(message,/Your latest request was not answered/);assert.match(message,/Your draft and earlier work are kept/);assert.ok(message.endsWith('Reference: '+correlationId+'.'));assert.doesNotMatch(message,/SECRET/);
 assert.doesNotMatch(homeConversationErrorMessage({code:'evidence_deadline',correlationId:'bad'}),/Reference:/);
});
