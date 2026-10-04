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
test('echoed saved assumptions are validated but do not create reviewable changes',()=>{
 const saved={...request,inputs:{...request.inputs,roles:'4'}};
 const r=validateClarificationResult(response([{field:'roles',value:'4',evidence:'4'}]),saved,catalog);
 assert.deepEqual(r.changes,[]);assert.equal(r.draft.roles,'4');
});

test('reported sparse natural-month intake retains explicit zeros and missing assumptions without calculating',()=>{
 const input={goal:'Review synthetic additional positions',statement:'SYNTHETIC DISPOSABLE TEST, review only. Plan 2 additional AI Engineer positions in Data & AI, starting January 2027 over 12 months, with coverage required by December 2027. Compare 0 Build, 0 Move and 2 external hires; assume 0 backfills. Hiring arrival dates, costs and budget are unknown. Propose inputs and ask about missing assumptions. Do not save inputs, run calculations or approve actions.',inputs:emptyWorkforcePlanInput()};
 const source={business_units:[{org_code:'DATA_AI',org_name:'Data & AI'}],job_profiles:[{job_profile_code:'AI_ENGINEER',job_profile_name:'AI Engineer'}],combinations:[{org_code:'DATA_AI',job_profile_code:'AI_ENGINEER'}]};
 const changes=[['businessUnit','DATA_AI','Data & AI'],['jobProfile','AI_ENGINEER','AI Engineer'],['intent','additional','additional'],['roles','2','2 additional'],['planningMonth','2027-01','January 2027'],['months','12','12 months'],['deadlineMonth','2027-12','December 2027'],['build','0','0 Build'],['move','0','0 Move'],['buy','2','2 external hires'],['backfills','0','0 backfills']].map(([field,value,evidence])=>({field,value,evidence}));
 const before=structuredClone(input),result=validateClarificationResult(response(changes),input,source);
 assert.equal(result.draft.planningMonth,'2027-01');assert.equal(result.draft.deadlineMonth,'2027-12');
 for(const key of ['build','move','backfills'])assert.equal(result.draft[key],'0');
 for(const key of ['arrivalMode','arrivalDate','recruitingStart','annualHireCost','hireFee','budget','maxAddedEmployees','trainingCash'])assert.equal(result.draft[key],'');
 assert.deepEqual(input,before);assert.ok(!Object.hasOwn(result,'proposed'));assert.match(clarificationRequest(input,source).instructions,/Omit unknown fields/);
});
test('natural-month normalization never infers a year, quarter, day or ambiguous date',()=>{
 for(const [evidence,field,value] of [['January','planningMonth','2027-01'],['Q1 2027','planningMonth','2027-01'],['01/02/2027','planningMonth','2027-01'],['January 2027 or February 2027','planningMonth','2027-01'],['January 2027','arrivalDate','2027-01-01'],['January 2027','planningMonth','2027-02']]){
  assert.throws(()=>validateClarificationResult(response([{field,value,evidence}]),{...request,statement:evidence},catalog),/grounded/);
 }
 assert.equal(validateClarificationResult(response([{field:'planningMonth',value:'2027-01',evidence:'2027-01'}]),{...request,statement:'Start 2027-01'},catalog).draft.planningMonth,'2027-01');
});
test('only fixed non-sensitive diagnostic stages can appear in clarification errors',async()=>{
 const {clarificationFailureMessage}=await import('../lib/workforce-clarification.ts');
 for(const diagnostic of ['model-unavailable','invalid-model-json','invalid-model-proposal-5-planningMonth-value-not-supported'])assert.ok(clarificationFailureMessage({diagnostic}).includes(`Diagnostic: ${diagnostic}`));
 for(const diagnostic of ['secret-value','invalid-model-proposal-5-apiKey-value-not-supported','model-unavailable secret'])assert.ok(!clarificationFailureMessage({diagnostic,error:'private payload'}).includes('Diagnostic:'));
 assert.ok(!clarificationFailureMessage({error:'private payload'}).includes('private payload'));
});

test('mixed date notations, contradictory years and negated short quotes cannot choose a month',()=>{
 for(const [statement,evidence,value] of [
  ['Start January 2027 or 2028.','January 2027','2027-01'],
  ['Start January 2027, or February 2027.','January 2027','2027-01'],
  ['Start January 2027 or 2028.','January 2027 or 2028','2027-01'],
  ['Start January 2027 or 2027-02.','January 2027 or 2027-02','2027-01'],
  ['Start 2027-01 or February 2027.','2027-01 or February 2027','2027-01'],
  ['Not January 2027.','January 2027','2027-01'],
  ['Start January 2027 or February 2027.','January 2027','2027-01'],
  ['January 2027 is unknown.','January 2027','2027-01'],
  ['Start 2027-010.','2027-010','2027-01'],
  ['Start January 20270.','January 20270','2027-01'],
  ['Start January 2027 / 02/01/2027.','January 2027 / 02/01/2027','2027-01'],
 ])assert.throws(()=>validateClarificationResult(response([{field:'planningMonth',value,evidence}]),{...request,statement},catalog),/grounded/);
 const statement='Start January 2027 (2027-01); coverage by December 2027.';
 const result=validateClarificationResult(response([{field:'planningMonth',value:'2027-01',evidence:'January 2027 (2027-01)'},{field:'deadlineMonth',value:'2027-12',evidence:'December 2027'}]),{...request,statement},catalog);
 assert.equal(result.draft.planningMonth,'2027-01');assert.equal(result.draft.deadlineMonth,'2027-12');
});

test('prompt and strict schema distinguish planning start, recruiting launch and employee arrival',()=>{
 const spec=clarificationRequest(request,catalog),variants=spec.text.format.schema.properties.changes.items.anyOf;
 const property=field=>variants.find(item=>item.properties.field.enum[0]===field).properties;
 assert.match(spec.instructions,/does not support recruitingStart, arrivalDate or arrivalMode/);
 assert.match(spec.instructions,/omit recruitingStart from changes and ask/);
 assert.match(spec.instructions,/Missing optional timing is a valid partial proposal/);
 assert.match(property('planningMonth').value.description,/Not the recruiting launch/);
 assert.match(property('recruitingStart').value.description,/explicit recruiting-launch statement/);
 assert.match(property('recruitingStart').evidence.description,/never quote a generic planning start/);
 assert.match(property('arrivalDate').value.description,/distinct from recruiting launch/);
 assert.equal(property('recruitingStart').value.pattern,'^\\d{4}-\\d{2}-\\d{2}$');
 assert.deepEqual(Object.keys(property('recruitingStart')),['field','value','evidence']);
 assert.equal(spec.store,false);assert.equal(spec.tool_choice,'none');assert.equal(spec.text.format.strict,true);
});
test('generic January planning start cannot ground a recruiting date; omission with a question stays valid',()=>{
 const statement='Plan 2 additional Engineer roles in Technology, starting January 2027 over 12 months, with coverage required by December 2027. Compare 0 Build, 0 Move and 2 external hires; assume 0 backfills. Hiring arrival dates, costs and budget are unknown.';
 const input={...request,statement},before=structuredClone(input);
 // These are deliberately fabricated test proposals, not the deployed model output.
 for(const value of ['2027-01-01','2027-01-15',''])assert.throws(()=>validateClarificationResult(response([{field:'recruitingStart',value,evidence:'starting January 2027'}]),input,catalog),error=>error.message==='Proposed input is not grounded in the supplied planning statement.'&&error.cause?.field==='recruitingStart'&&error.cause?.reason==='value-not-supported');
 const proposed={summary:'Review the known planning horizon; recruitment timing is unspecified.',questions:['When should recruitment launch (YYYY-MM-DD), or should it remain unknown?'],changes:[{field:'planningMonth',value:'2027-01',evidence:'January 2027'},{field:'months',value:'12',evidence:'12 months'},{field:'deadlineMonth',value:'2027-12',evidence:'December 2027'}]};
 const result=validateClarificationResult(proposed,input,catalog);assert.equal(result.draft.planningMonth,'2027-01');assert.equal(result.draft.months,'12');assert.equal(result.draft.recruitingStart,'');assert.equal(result.draft.arrivalDate,'');assert.equal(result.draft.arrivalMode,'');assert.match(result.questions[0],/recruitment launch/);assert.deepEqual(input,before);
});
test('explicit ISO recruiting launch is accepted without inventing arrival; omitted saved timing remains intact',()=>{
 const input={...request,statement:'Plan starting January 2027. Recruiting launches on 2026-11-15. Hire arrival remains unknown.'};
 const result=validateClarificationResult(response([{field:'recruitingStart',value:'2026-11-15',evidence:'Recruiting launches on 2026-11-15'}]),input,catalog);
 assert.equal(result.draft.recruitingStart,'2026-11-15');assert.equal(result.draft.arrivalDate,'');assert.equal(result.draft.arrivalMode,'');
 const saved={...input,inputs:{...input.inputs,recruitingStart:'2026-11-15'}};assert.equal(validateClarificationResult(response([]),saved,catalog).draft.recruitingStart,'2026-11-15');
 assert.throws(()=>validateClarificationResult(response([{field:'recruitingStart',value:'2027-01-01',evidence:'Recruiting launches in January 2027'}]),{...request,statement:'Recruiting launches in January 2027.'},catalog),/grounded/);
});

// Synthetic proposals reproduce the reported stage; they are not captured model output.
test('reported ISO planning sentence accepts exact evidence including its terminal period',()=>{
 const statement='SYNTHETIC TEST: Add 2 AI Engineer roles in Data & AI. Planning starts 2027-01 for 12 months. Build 0, Move 1, Buy 1. Other inputs unknown; no operational action.';
 const source={business_units:[{org_code:'BU-DATAAI',org_name:'Data & AI'}],job_profiles:[{job_profile_code:'AI-ENG',job_profile_name:'AI Engineer'}],combinations:[{org_code:'BU-DATAAI',job_profile_code:'AI-ENG'}]};
 const input={goal:statement,statement,inputs:{...emptyWorkforcePlanInput(),intent:'additional'}},before=structuredClone(input);
 const changes=[['businessUnit','BU-DATAAI','Data & AI'],['jobProfile','AI-ENG','AI Engineer'],['roles','2','Add 2 AI Engineer roles'],['planningMonth','2027-01','Planning starts 2027-01 for 12 months.'],['months','12','12 months'],['build','0','Build 0'],['move','1','Move 1'],['buy','1','Buy 1']].map(([field,value,evidence])=>({field,value,evidence}));
 const result=validateClarificationResult(response(changes),input,source);
 assert.equal(result.draft.planningMonth,'2027-01');assert.equal(result.draft.months,'12');assert.equal(result.changes[3].evidence,'Planning starts 2027-01 for 12 months.');
 for(const field of ['backfills','recruitingStart','arrivalDate','arrivalMode','annualHireCost','budget'])assert.equal(result.draft[field],'');
 assert.deepEqual(input,before);
});
test('month context matching tolerates exact trailing clause punctuation without changing evidence',()=>{
 for(const field of ['planningMonth','buildMonth','moveMonth','deadlineMonth'])for(const end of ['.','!','?',';',',','\n','. ']){
  const evidence='January 2027'+end,statement='Start '+evidence+' Costs unknown.';
  const result=validateClarificationResult(response([{field,value:'2027-01',evidence}]),{...request,statement},catalog);
  assert.equal(result.draft[field],'2027-01');assert.equal(result.changes[0].evidence,evidence);
 }
});
test('punctuated month evidence still rejects nonexact, negated, uncertain and unsupported values',()=>{
 for(const [statement,evidence,value] of [
  ['Start 2027-01.','2027-01!','2027-01'],
  ['Not 2027-01.','2027-01.','2027-01'],
  ['Start 2027-01, or February 2027.','2027-01,','2027-01'],
  ['Start January 2027 or 2028.','January 2027 or 2028.','2027-01'],
  ['Start 2027-01 is unknown.','2027-01 is unknown.','2027-01'],
  ['Start 2027-01.','2027-01.','2027-02'],
  ['Start January.','January.','2027-01'],
  ['Start Q1 2027.','Q1 2027.','2027-01'],
  ['Start 01/02/2027.','01/02/2027.','2027-01'],
 ])assert.throws(()=>validateClarificationResult(response([{field:'planningMonth',value,evidence}]),{...request,statement},catalog),/grounded/);
});
test('model schema patterns accept supported numeric and calendar representations',()=>{
 const variants=clarificationRequest(request,catalog).text.format.schema.properties.changes.items.anyOf;
 for(const [field,valid,invalid] of [['planningMonth','2027-01','January 2027'],['recruitingStart','2027-01-01','2027-01'],['roles','2','2.5'],['annualHireCost','120000.50','USD 120000']]){
  const pattern=new RegExp(variants.find(item=>item.properties.field.enum[0]===field).properties.value.pattern);
  assert.ok(pattern.test(valid));assert.ok(!pattern.test(invalid));
 }
});
