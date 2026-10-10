import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {readSolutionState} from '../lib/home-solution-conversation.ts';
import {currentHiringBudget,editHiringBudget,editHiringBudgetLocally,hiringBudgetView,readHiringBudgetReview,hiringBudgetTool} from '../lib/home-hiring-budget.ts';
import {businessPlanningModelTools} from '../lib/home-model-tool-schemas.ts';
import {solutionRequest,fixtureRuntime,final} from './fixtures/home-solution-conversation.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
const token='fixture:0';
const supplied=r=>({kind:'user-supplied',turnId:r.message.id,quote:r.message.text,explanation:'Interpreted from the current user request; editable.'});
const proposed={kind:'model-proposed',turnId:null,quote:null,explanation:'Explicit fictional scenario assumption for this offline test.'};
const change=(r,field,value)=>({field,value,basis:supplied(r)});
async function ask(request,changes){const runtime=fixtureRuntime([{name:'review_hiring_budget',args:{changes}},final('Review the period allowance and confirm salary and timing before committing.')]);runtime.natural={datasetToken:token};const reply=await converseSolutions(request,runtime,new AbortController().signal);return {reply,runtime};}
test('ordinary hiring question runs the actual service tool without workload, source reads or saved plans',async()=>{
 const request=solutionRequest('We need 10 engineers, but Finance capped the budget at $1 million. What are our options?');
 const {reply,runtime}=await ask(request,[change(request,'hires',10),change(request,'budget',1000000),change(request,'role','Engineers')]);
 const view=hiringBudgetView(reply.state.hiringBudget);assert.equal(view.budgetPerHire,100000);assert.equal(view.salary.status,'unavailable');assert.equal(view.periodCost,null);assert.equal(view.input.months,null);assert.equal(view.input.currency,null);assert.equal(reply.state.businessPlanning,undefined);assert.deepEqual(reply.candidateIds,[]);assert.deepEqual(reply.analysisIds,[]);assert.equal(runtime.reads,0);assert.deepEqual(readSolutionState(reply.state),reply.state);
 const output=runtime.contexts[1].find(i=>i.type==='function_call_output');assert.equal(JSON.parse(output.output).hiringBudget.budgetPerHire,100000);assert.equal(JSON.parse(output.output).saved,false);
});
test('follow-up patches preserve omitted values, provenance and explicit withdrawal',async()=>{
 const first=solutionRequest('Assume ten hires and a million dollar budget.'),s=editHiringBudget(first,token,[change(first,'hires',10),change(first,'budget',1000000),{field:'annualBasePay',value:90000,basis:proposed}]);
 const request=solutionRequest('Make that eight hires. The salary is unknown.',false,{...first.state,hiringBudget:s},2),next=editHiringBudget(request,token,[change(request,'hires',8),change(request,'annualBasePay',null)]);
 assert.equal(next.inputs.hires,8);assert.equal(next.inputs.budget,1000000);assert.deepEqual(next.origins.budget,s.origins.budget);assert.equal(next.inputs.annualBasePay,null);assert.equal(hiringBudgetView(next).annualBasePerHire,null);
 assert.throws(()=>editHiringBudget(request,token,[{field:'budget',value:900000,basis:proposed}]),/user correction/);
 assert.throws(()=>editHiringBudget(request,token,[{field:'budget',value:900000,basis:{...supplied(request),quote:'invented quote'}}]),/exact user quote/);
});
test('local override is retained as a user scenario and reaches the next model context',async()=>{
 const r=solutionRequest('Compare ten hires.'),s=editHiringBudget(r,token,[change(r,'hires',10)]);
 const edited=editHiringBudgetLocally(s,{...s.inputs,annualBasePay:100000,payBasis:'per_fte',ftePerHire:.5});
 assert.equal(edited.origins.annualBasePay.kind,'user-entry');assert.equal(hiringBudgetView(edited).annualBasePerHire,50000);
 const next=solutionRequest('Explain this estimate.',false,{...r.state,hiringBudget:edited},2),{runtime,reply}=await ask(next,[]);
 const context=JSON.parse(runtime.contexts[0][0].content.split('\n').slice(1).join('\n'));assert.equal(context.hiringBudget.annualBasePerHire,50000);assert.equal(context.hiringBudget.rateSource,'scenario-override');assert.deepEqual(reply.state.hiringBudget.origins,edited.origins);
});
test('unapproved cohort data, forged provenance, duplicate edits and stale context fail closed',()=>{
 const r=solutionRequest('Ten hires.'),s=editHiringBudget(r,token,[change(r,'hires',10)]);
 assert.throws(()=>readHiringBudgetReview({...s,cohort:{meanAnnualBase:1}}));
 assert.throws(()=>readHiringBudgetReview({...s,inputs:{...s.inputs,annualBasePay:10}}),/provenance/);
 assert.throws(()=>editHiringBudget(r,token,[change(r,'hires',10),change(r,'hires',20)]));
 assert.throws(()=>editHiringBudget(r,token,[{field:'annualBasePay',value:1,basis:{...proposed,kind:'company-source'}}]));
 const request={...r,state:{...r.state,hiringBudget:s}};assert.throws(()=>currentHiringBudget(request,'other:0'),/another dataset/);assert.throws(()=>currentHiringBudget({...request,scope:'Different'},token),/scope/);
});
test('currency edits never relabel old money without explicit review',()=>{
 const r=solutionRequest('Budget 1000000 USD, ten hires.'),s=editHiringBudget(r,token,[change(r,'hires',10),change(r,'budget',1000000),change(r,'currency','USD')]),next=solutionRequest('Use EUR.',false,{...r.state,hiringBudget:s},2);
 assert.throws(()=>editHiringBudget(next,token,[change(next,'currency','EUR')]),/not converted or relabelled/);
 assert.throws(()=>editHiringBudgetLocally(s,{...s.inputs,currency:'EUR'}),/not converted or relabelled/);
 const safe=editHiringBudget(next,token,[change(next,'currency','EUR'),change(next,'budget',null)]);assert.equal(safe.inputs.budget,null);assert.equal(hiringBudgetView(safe).budgetPerHire,null);
});
test('outbound tool schema retains strict contract and branch cannot automatically deploy',()=>{
 const tool=businessPlanningModelTools.find(t=>t.name===hiringBudgetTool.name);assert.ok(tool);assert.equal(tool.strict,true);assert.ok(tool.parameters.$defs.basis);assert.equal(JSON.stringify(tool).includes('employee_id'),false);
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));assert.equal(config.git.deploymentEnabled['codex/grounded-hiring-budget-20261010'],false);
});
test('actual POST offers the hiring calculator and returns code arithmetic through offline provider transport',async()=>{
 const isolated=await offlineBusinessRoute();isolated.sandbox.console={info(){},error(){}};
 const request=solutionRequest('We need 10 engineers with a budget of 1000000.');
 isolated.sandbox.__replies.push(responseForStep({name:'review_hiring_budget',args:{changes:[change(request,'hires',10),change(request,'budget',1000000)]}}),responseForStep(final('The allowance still needs a salary and time basis.')));
 const response=await isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(request)}));
 assert.equal(response.status,200);const reply=await response.json();assert.equal(hiringBudgetView(reply.state.hiringBudget).budgetPerHire,100000);assert.equal(hiringBudgetView(reply.state.hiringBudget).periodCost,null);
 assert.equal(isolated.sandbox.__requests.length,2);assert.ok(isolated.sandbox.__requests[0].tools.some(t=>t.name==='review_hiring_budget'));assert.match(isolated.sandbox.__requests[0].instructions,/No approved comparable salary source is connected/);
});
