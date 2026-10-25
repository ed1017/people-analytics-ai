import test from 'node:test';import a from 'node:assert/strict';
import {buildHomePack} from '../lib/home-pack.mjs';
import {emptySolutionState,readSolutionState} from '../lib/home-solution-conversation.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {editHiringBudget,hasHiringScenarioInputs} from '../lib/home-hiring-budget.ts';
import {canReviewConditionalHiringPlan,canReviewCostedHiringPlan} from '../lib/home-hiring-plan.ts';
const template=(budget='$2M')=>`Help me estimate the FTE needed and compare options. I can leave unknown details blank.\nDescription:\nFTE needed: 12\nBudget (optional): ${budget}\nRole: AI-ENG, BI-ANA, BI-DEV\nBusiness unit: Client Operations (BU-CLIENTOPS)\nLevel: level 2 (L2)\nLocation:\nNeeded by:`;
const request=(text=template())=>({version:1,requestId:'intake-test',goal:{id:'',statement:''},scope:'All workforce',filters:{country:'all',org:'all',level:'all'},timeZone:'UTC',evidence:buildHomePack({},'All workforce',text),goalContext:null,selectedId:null,catalog:null,state:emptySolutionState(),message:{id:'initial-template',text}});
const runtime={natural:{datasetToken:'test:1'},complete:()=>{throw Error('No provider call allowed');},loadProjection:()=>{throw Error('No source call needed');}};
test('multi-role clarification retains explicit funding through allocation and state reload, without inventing a plan',async()=>{
 for(const [input,amount] of [['$2M',2000000],['USD 40k',40000],['0',0]]){
 const r=request(template(input)),reply=await converseSolutions(r,runtime,new AbortController().signal);
 a.equal(reply.usage.modelRounds,0);a.equal(reply.state.hiringBudget.inputs.budget,amount);
 const retained=reply.state.hiringBudget;a.equal(hasHiringScenarioInputs(retained),false);a.equal(retained.origins.budget.turnId,r.message.id);a.equal(retained.inputs.currency,null);a.equal(retained.inputs.hires,null);a.equal(retained.inputs.annualBasePay,null);
 a.equal(canReviewConditionalHiringPlan(retained),false);a.equal(canReviewCostedHiringPlan(retained),false);
 const follow={...r,requestId:'allocation-test',state:readSolutionState(JSON.parse(JSON.stringify(reply.state))),message:{id:'allocation',text:'4 AI Engineers, 4 Business Intelligence Analysts and 4 Business Intelligence Developers.'}};
 const next=editHiringBudget(follow,'test:1',[]);a.equal(next.inputs.budget,amount);a.deepEqual(next.origins.budget,retained.origins.budget);
 a.throws(()=>editHiringBudget(follow,'test:1',[{field:'budget',value:amount+1,basis:{kind:'user-supplied',turnId:r.message.id,quote:r.message.text,explanation:'Cannot reauthorize prior text'}}]),/explicitly|current user turn/);
 a.equal(r.state.hiringBudget,undefined);
 }
});
test('blank, ambiguous and contradictory funding does not seed a ceiling',async()=>{
 for(const value of ['', 'unknown','estimate $2M','2000000000','$2.001']){const reply=await converseSolutions(request(template(value)),runtime,new AbortController().signal);a.equal(reply.state.hiringBudget,undefined);}
});
test('an existing hiring review is not silently repurposed by a new role template',async()=>{
 const r=request();const prior=editHiringBudget({...r,message:{id:'older',text:'Budget is 1000'}},'test:1',[{field:'budget',value:1000,basis:{kind:'user-supplied',turnId:'older',quote:'Budget is 1000',explanation:'Earlier explicit input'}}]);
 r.state.hiringBudget=prior;const reply=await converseSolutions(r,runtime,new AbortController().signal);a.deepEqual(reply.state.hiringBudget,prior);
});

test('retention never adopts a new template ceiling into prior planning context',async()=>{
 for(const change of [r=>r.state.turns.push({id:'older',role:'user',text:'An earlier staffing objective.'}),r=>r.goal={id:'goal-a',statement:'Earlier objective'},r=>r.goalContext={note:'Existing context'}]){
  const r=request();change(r);const reply=await converseSolutions(r,runtime,new AbortController().signal);a.equal(reply.state.hiringBudget,undefined);
 }
});

test('concise allocation choices keep scope and funding, and follow-ups do not repeat intake',async()=>{
 const {staffingStarterIntake}=await import('../lib/home-staffing-intake.ts');
 const r=request(),reply=await converseSolutions(r,runtime,new AbortController().signal);
 a.equal(reply.state.questions.length,1);a.equal(reply.answer.split('\n\n').length,2);
 a.match(reply.answer,/Reply with FTE per role, or ask to compare allocations/);
 a.doesNotMatch(reply.answer,/I have kept|I have not assigned|equal split/);
 for(const text of ['4 AI Engineers, 4 BI Analysts, 4 BI Developers.','Compare alternative allocations across these roles.']){
  const follow={...r,state:readSolutionState(JSON.parse(JSON.stringify(reply.state))),message:{id:'follow',text}};
  a.equal(staffingStarterIntake(follow),null);
  a.equal(follow.state.turns[0].text,r.message.text);
  a.equal(editHiringBudget(follow,'test:1',[]).inputs.budget,2000000);
 }
});
