import test from 'node:test';import a from 'node:assert/strict';
import {readStaffingTemplate} from '../lib/staffing-template.ts';
import {staffingStarterIntake} from '../lib/home-staffing-intake.ts';
import {confirmsBudgetAmount} from '../lib/hiring-budget-authority.ts';
const template=(budget='$2M',fte='12',roles='AI-ENG, BI-ANA, BI-DEV')=>`Help me estimate the FTE needed and compare options. I can leave unknown details blank.\nDescription:\nFTE needed: ${fte}\nBudget (optional): ${budget}\nRole: ${roles}\nBusiness unit: Client Operations (BU-CLIENTOPS)\nLevel: level 2 (L2)\nLocation:\nNeeded by:`;
test('multiline optional budget is explicit only when populated with an exact amount',()=>{
 for(const [value,amount]of [['$2M',2000000],['USD 40k',40000],['0',0]])a.equal(confirmsBudgetAmount(template(value),amount),true);
 for(const value of ['', 'unknown','estimate $2M','not $2M','up to possibly $2M'])a.equal(confirmsBudgetAmount(template(value),2000000),false);
 a.equal(confirmsBudgetAmount(template(''),0),false);
 for(const text of [template()+'\nBudget (optional): 0','Do not approve this budget\n'+template(),template().replace('Location:','Unexpected field:')])a.equal(readStaffingTemplate(text),null);
});
test('role lists request allocation without multiplying total FTE or dropping supplied fields',()=>{
 for(const [fte,roles]of [['12','AI-ENG, BI-ANA, BI-DEV'],['7.5','DATA-ENG, QA-ENG']]){
  const request={state:{},message:{text:template('$2M',fte,roles)}},before=structuredClone(request);
  const response=staffingStarterIntake(request);a.ok(response);a.match(response.answer,new RegExp(`total ${fte} FTE`));
  for(const role of roles.split(', '))a.ok(response.answer.includes(role));
  a.equal(response.questions.length,1);a.deepEqual(request,before);a.doesNotMatch(response.answer,/each needs|equal split|ready in|within budget/i);
 }
});
test('explicit allocation, single role and unsupported free text remain on ordinary interpretation path',()=>{
 for(const roles of ['AI-ENG','AI-ENG: 4, BI-ANA: 8','Analyst, Engineer']){
  const request={goal:{statement:''},state:{turns:[],constraints:[],working:[],analyses:[]},message:{text:template('$2M','12',roles)}};
  a.equal(staffingStarterIntake(request),null);
 }
});

test('free-text description is interpreted normally and cannot silently approve a contradictory budget',()=>{
 for(const description of ['The $2M budget is hypothetical; do not adopt it.','Allocate 4 FTE to AI-ENG and 8 to BI-ANA.','Compare alternative allocations across the roles.']){
  const text=template().replace('Description:',`Description: ${description}`);
  a.equal(confirmsBudgetAmount(text,2000000),false);
  a.equal(staffingStarterIntake({goal:{statement:''},state:{turns:[],constraints:[],working:[],analyses:[]},message:{text}}),null);
 }
});

test('funding authority cannot ignore narrative tucked into another field',()=>{
 for(const label of ['Location:','Needed by:','Business unit:','Level:','Role:','FTE needed:']){
  const lines=template().split('\n').map(line=>line.startsWith(label)?label+' Not approved; do not adopt this budget':line);
  a.equal(confirmsBudgetAmount(lines.join('\n'),2000000),false,label);
 }
});

test('a BU display label must exactly match its existing demo catalogue entry',()=>{
 a.equal(confirmsBudgetAmount(template().replace('Client Operations (BU-CLIENTOPS)','Pending approval (BU-CLIENTOPS)'),2000000),false);
 a.equal(confirmsBudgetAmount(template().replace('Client Operations (BU-CLIENTOPS)','BU-CLIENTOPS'),2000000),true);
});
