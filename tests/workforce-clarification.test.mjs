import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorkforcePlanInput} from '../lib/workforce-increment.ts';
import {validateClarificationInput,clarificationRequest,validateClarificationResult} from '../lib/workforce-clarification.ts';
const catalog={business_units:[{org_code:'TECH',org_name:'Technology',employee_id:'excluded'}],job_profiles:[{job_profile_code:'ENG',job_profile_name:'Engineer',owner_notes:'excluded'}],combinations:[{org_code:'TECH',job_profile_code:'ENG',salary:90000}]};
const request={goal:'Plan additional positions',statement:'Add 3 Engineer roles in Technology. Build 1, move 1 and buy 1. Backfills 0. Annual loaded hire cost USD 120,000.',inputs:emptyWorkforcePlanInput()};
const response=changes=>({summary:'Review the proposed assumptions.',questions:['What is the planning month?'],changes});
test('model envelope contains only supported planning data and projected synthetic catalog',()=>{
 const spec=clarificationRequest(request,catalog),payload=JSON.parse(spec.input[0].content);
 assert.deepEqual(Object.keys(payload),['goal','statement','inputs','catalog']);
 assert.equal(spec.store,false);assert.equal(spec.tool_choice,'none');assert.equal(spec.text.format.strict,true);
 assert.ok(!JSON.stringify(payload).includes('excluded'));assert.ok(!JSON.stringify(payload).includes('salary'));
});
test('extra employee, conversation, owner, approval and credential fields are rejected',()=>{
 for(const field of ['employeeIds','ownerNotes','approval','conversation','apiKey'])assert.throws(()=>validateClarificationInput({...request,[field]:'excluded'}));
 assert.throws(()=>validateClarificationInput({...request,inputs:{...request.inputs,employeeId:'excluded'}}));
});
test('partial inputs remain unknown and numeric/calendar bounds apply before source reads',()=>{
 assert.deepEqual(validateClarificationInput(request).inputs,emptyWorkforcePlanInput());
 for(const patch of [{months:'25'},{roles:'1.5'},{arrivalDate:'2026-02-30'},{budget:'NaN'},{intent:'unknown'}])assert.throws(()=>validateClarificationInput({...request,inputs:{...request.inputs,...patch}}));
});
test('grounded catalog, counts and cost proposals remain a draft without mutating saved inputs',()=>{
 const changes=[{field:'roles',value:'3',evidence:'3 Engineer roles'},{field:'businessUnit',value:'TECH',evidence:'Technology'},{field:'jobProfile',value:'ENG',evidence:'Engineer'},{field:'annualHireCost',value:'120000',evidence:'Annual loaded hire cost USD 120,000'}];
 const before=JSON.stringify(request),r=validateClarificationResult(response(changes),request,catalog);
 assert.equal(r.draft.roles,'3');assert.equal(r.draft.annualHireCost,'120000');assert.equal(r.draft.trainingCash,'');assert.equal(JSON.stringify(request),before);
});
test('invented zero, ungrounded values, invalid catalog and repeated fields are rejected',()=>{
 for(const change of [{field:'trainingCash',value:'0',evidence:'Add 3 Engineer roles'},{field:'roles',value:'7',evidence:'3 Engineer roles'},{field:'businessUnit',value:'OTHER',evidence:'Technology'},{field:'budget',value:'1000',evidence:'not in statement'}])assert.throws(()=>validateClarificationResult(response([change]),request,catalog));
 const c={field:'roles',value:'3',evidence:'3 Engineer roles'};assert.throws(()=>validateClarificationResult(response([c,c]),request,catalog));
 assert.throws(()=>validateClarificationResult({...response([]),employeeIds:[]},request,catalog));
});
test('saved assumptions survive a question-only response and incompatible pair is rejected',()=>{
 const saved={...request,inputs:{...request.inputs,roles:'4'}};assert.equal(validateClarificationResult(response([]),saved,catalog).draft.roles,'4');
 const mixed={...catalog,business_units:[...catalog.business_units,{org_code:'OPS',org_name:'Operations'}]};
 assert.throws(()=>clarificationRequest({...request,inputs:{...request.inputs,businessUnit:'OPS',jobProfile:'ENG'}},mixed));
});
test('an explicitly stated arrival mode does not require its evidence quote to repeat the date',()=>{
 const r=validateClarificationResult(response([{field:'arrivalMode',value:'explicit',evidence:'explicit hire arrival'}]),{...request,statement:'Use explicit hire arrival 2026-11-16.'},catalog);
 assert.equal(r.draft.arrivalMode,'explicit');assert.equal(r.draft.arrivalDate,'');
});
