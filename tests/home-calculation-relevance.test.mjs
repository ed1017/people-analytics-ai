import test from 'node:test';import assert from 'node:assert/strict';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {emptySolutionState,readSolutionState} from '../lib/home-solution-conversation.ts';
import {solutionRequest,fixtureRuntime,final} from './fixtures/home-solution-conversation.mjs';
import {fixedChanges,liveStaffingMessage} from './fixtures/required-staffing.mjs';
const run=async(request,steps)=>{const runtime=fixtureRuntime(steps);runtime.natural={datasetToken:'legacy-v1:0'};return converseSolutions(request,runtime,new AbortController().signal);};
test('only calculations checked in the accepted turn are current; unrelated answers retain inputs as earlier work',async()=>{
 const request=solutionRequest('Review ten engineers.'),basis={kind:'user-supplied',turnId:request.message.id,quote:request.message.text,explanation:'Explicit fixture values.'};
 const reply=await run(request,[{name:'review_hiring_budget',args:{changes:[{field:'hires',value:10,basis},{field:'budget',value:1000000,basis}]}},final('Review the missing assumptions.')]);
 assert.deepEqual(reply.state.currentCalculationKinds,['hiring']);const original=structuredClone(reply.state.hiringBudget);
 const next=await run(solutionRequest('What is the Finance cost period?',false,reply.state,2),[final('The period is unknown.')]);assert.deepEqual(next.state.currentCalculationKinds,[]);assert.deepEqual(next.state.hiringBudget,original);
 assert.deepEqual(readSolutionState(JSON.parse(JSON.stringify(next.state))).hiringBudget,original);
});
test('legacy state has no falsely current calculators and invalid presentation markers are rejected',()=>{
 const legacy=emptySolutionState();delete legacy.currentCalculationKinds;assert.deepEqual(readSolutionState(legacy).currentCalculationKinds,[]);
 for(const currentCalculationKinds of [['invented'],['hiring','hiring'],['hiring'],true])assert.throws(()=>readSolutionState({...emptySolutionState(),currentCalculationKinds}),/calculation/i);
});

test('staffing calculations are current only for their accepted turn, including deterministic standalone completion',async()=>{
 const request=solutionRequest('Compare staffing routes.');
 const reply=await run(request,[{name:'compare_required_staffing',args:{changes:fixedChanges(request)}},final('Review the staffing comparison.')]);
 assert.deepEqual(reply.state.currentCalculationKinds,['required-staffing']);
 for(const currentCalculationKinds of [[['hiring']],[{kind:'hiring'}],[null],[42]])assert.throws(()=>readSolutionState({...structuredClone(reply.state),currentCalculationKinds}),/calculation/i);
 const next=await run(solutionRequest('What is the Finance cost period?',false,reply.state,2),[final('The period is unknown.')]);
 assert.deepEqual(next.state.currentCalculationKinds,[]);assert.deepEqual(next.state.requiredStaffing,reply.state.requiredStaffing);
 const runtime=fixtureRuntime([]);runtime.natural={datasetToken:'legacy-v1:0'};runtime.staffingScenarioOnly=true;
 const standalone=await converseSolutions(solutionRequest(liveStaffingMessage),runtime,new AbortController().signal);
 assert.deepEqual(standalone.state.currentCalculationKinds,['required-staffing']);assert.deepEqual(standalone.usage,{modelRounds:0,toolCalls:0});
});
