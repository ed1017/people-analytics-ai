import test from 'node:test';
import assert from 'node:assert/strict';
import {homeNextDetails} from '../lib/home-next-details.ts';
const state={constraints:[],questions:[],currentCalculationKinds:[]};
test('only current optional questions appear, with duplicate/sensitive requests excluded',()=>{
 const questions=['What is the budget?','When do you need the capacity?','Please provide employee records?','What is the budget?'];
 assert.deepEqual(homeNextDetails(state,questions,'- What is the budget?\n- Is the FTE additional or total?',true),['Whether the FTE requirement is additional capacity or the total needed.','When the capacity needs to be ready.','The available budget and currency for this scenario.']);
 assert.deepEqual(homeNextDetails(state,questions,'',false),[]);
 assert.deepEqual(homeNextDetails(state,[],'Read the evidence source.',true),[]);
});
test('populated structured fields including zero and false are not requested again',()=>{
 const populated={...state,currentCalculationKinds:['required-staffing'],requiredStaffing:{inputs:{budget:0,role:'Analyst',months:6,trainablePeople:0,redeployablePeople:0,internalRelease:false}}};
 assert.deepEqual(homeNextDetails(populated,['What is the budget?','Which role?','What cost horizon?','What internal capacity is available?','Where is the location?'],'',true),['The work location or country.']);
 assert.deepEqual(homeNextDetails({...state,constraints:[{field:'budget_usd',action:'set',number:100000,text:null}]},['What is the budget?'],'',true),[]);
 assert.deepEqual(homeNextDetails({...state,constraints:[{field:'budget_usd',action:'remove',number:null,text:null}]},['What is the budget?'],'',true),['The available budget and currency for this scenario.']);
});
test('previous topic calculations do not hide current questions',()=>{
 assert.deepEqual(homeNextDetails({...state,hiringBudget:{inputs:{budget:325000}}},['What is the budget?'],'',true),['The available budget and currency for this scenario.']);
});

test('timing and budget questions about additional capacity do not invent a population question',()=>{
 const capturedQuestions=['Are these Accounting (FIN-ACC), FP&A (FIN-FPNA), Treasury (FIN-TREAS), or a mix?','When do you need the additional capacity in place?'];
 assert.deepEqual(homeNextDetails(state,capturedQuestions,'',true),['When the capacity needs to be ready.']);
 for(const question of ['When should the additional FTE be ready?','What is the budget for additional capacity?','Which location needs the total FTE?','Is the budget for additional capacity approved?','What is the total budget for additional capacity?','Are these additional FTE costs confirmed?']){
  assert.ok(!homeNextDetails(state,[question],'',true).some(h=>h.startsWith('Whether')));
 }
});

test('explicit population clarification remains available and structured answers suppress it',()=>{
 for(const question of ['Is the FTE additional or total?','Are these additional FTE?','Is this total capacity?','Please clarify whether total or additional FTE are needed.']){
  assert.deepEqual(homeNextDetails(state,[question],'',true),['Whether the FTE requirement is additional capacity or the total needed.']);
  assert.deepEqual(homeNextDetails({...state,constraints:[{field:'population',action:'set',number:null,text:'additional'}]},[question],'',true),[]);
 }
 assert.deepEqual(homeNextDetails(state,['When do you need capacity, and is it additional or total?'],'',true),['Whether the FTE requirement is additional capacity or the total needed.','When the capacity needs to be ready.']);
});

test('unmapped and sensitive questions never render raw generated requests',()=>{assert.deepEqual(homeNextDetails(state,['What is each employee salary?','Please provide home addresses?','Can you share Social Security numbers?'],'',true),[]);assert.deepEqual(homeNextDetails(state,['Which role and employee names?'],'',true),['The role or type of work to cover.']);});
