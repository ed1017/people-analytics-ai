import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSwpDemo} from '../lib/swp-demo.ts';
import {publicSolutionEnvelope,publicHomeSourceVersion} from '../lib/public-ai-evidence-client.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {buildHomePack} from '../lib/home-pack.mjs';
import {emptySolutionState,readSolutionRequest,evaluateSolutionCandidate} from '../lib/home-solution-conversation.ts';
import {createPlanAlternatives,packPlanAlternatives} from '../lib/home-plan-alternatives.ts';
import {independentWorkforceQuestion,retainIndependentWorkforceAnswer} from '../lib/home-independent-workforce-question.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
const scope='All countries; All business units; All levels',filters={country:'all',org:'all',level:'all'},question='Which business unit has the highest turnover and what should we investigate?';
async function fixture(){
 const results={dashboard:{status:'loaded',data:{data_meta:public9037Metadata('a'.repeat(64)),overview:{headcount:12,snapshot_date:'2026-10-31'}}}};
 const draft=await createSwpDemo('guided-repro','2026-11-10T00:00:00.000Z');
 const goal={id:draft.binding.goalId,statement:draft.binding.goal};
 const catalog=packPlanAlternatives(createPlanAlternatives({goalId:goal.id,goal:goal.statement},[{id:'demo-plan',draft}]));
 const request=readSolutionRequest({version:1,requestId:'test-request',timeZone:'UTC',goal,scope,filters,evidence:buildHomePack(results,scope),goalContext:null,selectedId:'demo-plan',state:emptySolutionState(),catalog,message:{id:'turnover',text:question}});
 return {request,source:publicHomeSourceVersion(results)};
}
async function answer(request){
 const reply=await converseSolutions(request,{readDatasetQuestions:async()=>({answer:'Total YTD turnover: Managed Services. Recorded as of 2026-10-31',charts:[]}),complete:()=>assert.fail('No provider call permitted'),loadProjection:()=>assert.fail('No projection permitted')},new AbortController().signal);
 assert.equal(reply.usage.modelRounds,0);return reply;
}
test('actual saved demo can answer the suggested turnover question without rebinding or erasing its plan',async()=>{
 const {request,source}=await fixture(),before=JSON.stringify(request);
 await assert.rejects(publicSolutionEnvelope(request,source,undefined),/Exact public evidence/);
 const detached=independentWorkforceQuestion(request);assert.ok(detached);assert.equal(detached.catalog,null);assert.equal(detached.selectedId,null);assert.deepEqual(detached.goal,{id:'',statement:''});
 await publicSolutionEnvelope(detached,source,undefined);
 const state=retainIndependentWorkforceAnswer(request,await answer(detached));assert.equal(state.turns.length,2);assert.equal(JSON.stringify(request),before);assert.deepEqual({...state,turns:[]},request.state);
 const repeated={...request,state,requestId:'repeat',message:{id:'repeat-message',text:question}};
 const next=independentWorkforceQuestion(repeated);await publicSolutionEnvelope(next,source,undefined);
 assert.equal(retainIndependentWorkforceAnswer(repeated,await answer(next)).turns.length,4);
 const follow={...request,state,requestId:'follow',message:{id:'follow-message',text:'What should we investigate?'}};
 assert.ok(independentWorkforceQuestion(follow));
});
test('mixed requests, actual plan questions and active scenario discussions keep strict original provenance',async()=>{
 const {request,source}=await fixture();
 for(const text of [question+' Also change this plan.','Which business unit has highest turnover and change this plan','What would this plan cost?','Compare my saved plans']){
 const next={...request,message:{id:'other',text}};assert.equal(independentWorkforceQuestion(next),null,text);await assert.rejects(publicSolutionEnvelope(next,source,undefined),/Exact public evidence/);
 }
 assert.equal(independentWorkforceQuestion({...request,goalContext:{scenarioReview:{}}}),null);
});
test('independent question still needs verified current public evidence and preserves filters',async()=>{
 const {request}=await fixture();const detached=independentWorkforceQuestion({...request,scope:'India',filters:{...filters,country:'IN'}});assert.equal(detached.scope,'India');assert.equal(detached.filters.country,'IN');
 await assert.rejects(publicSolutionEnvelope(detached,null,undefined),/Current workforce evidence/);
});
test('unexpected proposal, progress or state mutation cannot replace saved planning state',async()=>{
 const {request}=await fixture(),detached=independentWorkforceQuestion(request),reply=await answer(detached);
 for(const patch of [{candidateIds:['new']},{analysisIds:['new']},{progressProposal:{}},{demandReview:{}},{state:{...reply.state,questions:['Change the plan?']}}])assert.throws(()=>retainIndependentWorkforceAnswer(request,{...reply,...patch}),/unexpected planning/);
 assert.throws(()=>retainIndependentWorkforceAnswer(request,{...reply,state:{...reply.state,turns:[]}}),/did not match/);
});
test('production hook isolates only transport and preserves original currentness and stored recipes',()=>{
 const source=fs.readFileSync(new URL('../components/use-home-solution-conversation.ts',import.meta.url),'utf8');
 assert.match(source,/^'use client';/);assert.match(source,/publicSolutionEnvelope\(transport,currentProps.current.publicSource,independent\?undefined:storedRecipes\(\)\)/);assert.match(source,/independent\?retainIndependentWorkforceAnswer\(request,reply\)/);assert.match(source,/!independent&&datasetSession.snapshot\(\)===PUBLIC_9037.token\?await capturePublicWorkingRecipes/);assert.match(source,/equal\(request.catalog,catalog\(true\)\)/);assert.match(source,/selectedPlanId\(catalog\(true\)\)===\(request.selectedId\?\?null\)/);
});

test('nonempty working proposals, constraints and recommendation provenance survive an independent answer',async()=>{
 const {request}=await fixture();
 const candidate={id:'working-pilot',base:null,goal:{statement:request.goal.statement,turnId:request.message.id},name:'Review readiness',objective:'Review readiness',approach:'Review a proposed activity.',rationale:'Illustrative alternative.',tradeoffs:['Effort unknown.'],nextStep:'Review.',successMeasure:'Agree a measure.',activities:[{id:'c1',mode:'new',source:null,name:'Review',domain:'execution',step:'Discuss the proposed activity.',ownerRole:'Proposed lead',evidenceIds:[],dependsOn:[],audienceOf:null,limitation:'Illustrative assumption.'}],quantities:[]};
 const item=await evaluateSolutionCandidate(request,candidate,[]);
 request.state.constraints=[{field:'budget_usd',action:'set',number:100000,text:null,unit:'USD',turnId:request.message.id}];
 request.state.working=[item];request.state.focusCandidateId=item.id;request.state.recommendationRequestId=item.requestId;
 request.state.questions=['Confirm the staffing assumptions?'];
 const before=JSON.stringify(request);
 const detached=independentWorkforceQuestion(request);assert.equal(detached.state.working.length,0);assert.equal(detached.state.focusCandidateId,null);
 const merged=retainIndependentWorkforceAnswer(request,await answer(detached));
 assert.deepEqual({...merged,turns:[],currentCalculationKinds:[]},{...request.state,turns:[],currentCalculationKinds:[]});assert.equal(JSON.stringify(request),before);
});
