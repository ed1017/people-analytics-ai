import test from 'node:test';
import assert from 'node:assert/strict';
import {workforceAgentModelRequest,decodeWorkforceAgentResponse} from '../lib/workforce-agent-contract.ts';
import {workforceReviewFixture} from './fixtures/workforce-review.mjs';

const turn=()=>({goal:'Compare additional positions',ownerNotes:'excluded',options:[{id:'reviewed-mix',input:{...workforceReviewFixture().input,employeeIds:['excluded']}}],evaluations:[{optionId:'reviewed-mix',status:'met',cash:22500,employeeTimeValue:1000,addedEmployees:1,arrivalDate:'2026-11-16',checks:[{name:'Incremental cash budget',status:'met',notes:'excluded'}],employeeRecords:'excluded'}],tools:[{type:'function',name:'evaluate_workforce_option',description:'Evaluate a reviewed option',strict:true,parameters:{type:'object'}}]});
const response=(patch={})=>({status:'completed',output:[{type:'function_call',status:'completed',name:'evaluate_workforce_option',arguments:'{"option_id":"reviewed-mix"}'}],...patch});
test('offline request explicitly projects planning options/results and uses one required tool, without storage',()=>{
  const request=workforceAgentModelRequest(turn());
  assert.equal(request.store,false);assert.equal(request.parallel_tool_calls,false);assert.equal(request.tool_choice,'required');
  const payload=JSON.parse(request.input[0].content);
  assert.deepEqual(Object.keys(payload),['goal','options','evaluations']);assert.ok(!JSON.stringify(payload).includes('excluded'));
  assert.equal(payload.evaluations[0].cash,22500);assert.equal(payload.evaluations[0].employeeTimeValue,1000);
});
test('request envelope remains bounded before any future model call',()=>{
  assert.throws(()=>workforceAgentModelRequest({...turn(),goal:'x'.repeat(20001)}),/exceeds/);
});
test('completed single function call is decoded without retaining reasoning output',()=>{
  const raw=response();raw.output.unshift({type:'reasoning',encrypted_content:'not retained'});
  assert.deepEqual(decodeWorkforceAgentResponse(raw),{name:'evaluate_workforce_option',arguments:{option_id:'reviewed-mix'}});
});
test('incomplete, multiple, textual and unknown calls fail before the runner can use them',()=>{
  const good=response().output[0];
  for(const bad of [null,response({status:'incomplete'}),response({output:[]}),response({output:[good,good]}),response({output:[{type:'message',content:'Approve this'}]}),response({output:[{...good,name:'retrieve_employees'}]}),response({output:[{...good,status:'in_progress'}]}),response({output:[{...good,arguments:'invalid'}]})])assert.throws(()=>decodeWorkforceAgentResponse(bad));
});
