/** Synthetic contract/calculation regressions; not live-model semantic acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readSwpPlaybook,swpPlaybookSources} from '../lib/swp-reasoning-playbook.ts';
import {solutionTools,solutionFinalSchema} from '../lib/home-solution-conversation-schema.ts';
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {editStaffingInputs,calculateServiceStaffing} from '../lib/home-service-staffing.ts';
import {demandReferenceId} from '../lib/swp-demand-reference.ts';
import {solutionRequest,fixtureRuntime,final,evaluate,candidate} from './fixtures/home-solution-conversation.mjs';
import {messages,naturalSteps,supplied,quantityChange} from './fixtures/natural-business-planning.mjs';
import {productQuestion,recommendationSteps,actionPlans} from './fixtures/action-plan-recommendations.mjs';
import {offlineBusinessRoute} from './helpers/offline-business-route.mjs';
import {responseForStep} from './fixtures/natural-business-planning.mjs';
const token='legacy-v1:0',signal=()=>new AbortController().signal;
const read=sections=>({name:'read_workforce_planning_playbook',args:{sections}});
async function run(body,steps){const runtime=fixtureRuntime(steps);runtime.natural={datasetToken:token};const reply=await converseSolutions(body,runtime,signal());assert.equal(runtime.reads,0);return reply;}
async function staffed(){let reply;for(const [index,text] of Object.values(messages).slice(0,3).entries()){const body=solutionRequest(text,false,reply?.state,index+1);reply=await run(body,naturalSteps(body));}return reply;}
test('offline reference helper preserves attribution; reference and batch tools are unavailable to Home',()=>{
 const result=readSwpPlaybook(['demand','supply']);assert.deepEqual(result.sections.map(s=>s.id),['demand','supply']);
 assert.equal(result.observedWorkforceEvidence,false);assert.equal(result.measuredBenefits,false);assert.equal(result.kind,'planning-method-guidance');
 assert.deepEqual(result.sources.map(s=>s.id).sort(),['cipd','opm','skillsForHealth']);
 assert.ok(result.sources.every(s=>s.url.startsWith('https://')));assert.ok(JSON.stringify(result).length<5000);
 for(const bad of [[],['demand','demand'],['demand','supply','options'],['__proto__'],['https://untrusted.invalid']])assert.throws(()=>readSwpPlaybook(bad));
 assert.ok(swpPlaybookSources.skillsForHealth.url.includes('/six-step-methodology/'));
 assert.equal(solutionFinalSchema.properties.candidateIds.maxItems,4);assert.equal(solutionFinalSchema.properties.questions.maxItems,2);
 assert.ok(!solutionTools.some(t=>['evaluate_action_plans','read_workforce_planning_playbook'].includes(t.name)));
});
test('hiring freeze keeps added-employee paths outside the entered limit without assuming internal readiness',async()=>{
 const first=await staffed(),body=solutionRequest('External hiring is frozen: maximum added employees is 0, including backfills. Keep all other premises.',false,first.state,4);
 const reply=await run(body,[{name:'compare_service_staffing',args:{reviewRef:demandReferenceId(body.requestId,0),changes:[{field:'maxAddedEmployees',value:0,basis:supplied(body)}]}},final('Hiring paths breach the entered limit. Internal paths still require release and readiness review.')]);
 const s=reply.state.businessPlanning;
 assert.ok(s.staffing.result.options.some(o=>o.addedEmployees>0));
 assert.ok(s.staffing.result.options.filter(o=>o.addedEmployees>0).every(o=>o.status==='not-met'));
 assert.equal(s.staffing.result.operationalFeasibilityVerified,false);assert.equal(s.staffing.inputs.values.maxAddedEmployees.basis.turnId,body.message.id);
 assert.deepEqual(s.review,first.state.businessPlanning.review);assert.equal(body.catalog,null);
});
test('fixed budget and additional workload retain an unmet gap rather than manufacture affordability',async()=>{
 const first=await staffed(),body=solutionRequest('Use 3 contracts, keep their effort unchanged, and a fixed budget of 10000 USD for the same horizon.',false,first.state,4);
 const reply=await run(body,[{name:'revise_scoped_service_demand',args:{edit:{reviewRef:demandReferenceId(body.requestId,0),changes:[quantityChange(body,'contracts',3),quantityChange(body,'budgetUsd',10000)]}}},final('The entered budget does not cover any checked staffing mix. Reconsider scope or timing; funding is not implied.')]);
 const s=reply.state.businessPlanning;
 assert.equal(s.review.result.workloadHours,5400);assert.equal(s.review.result.capacityHours,1200);assert.equal(s.review.result.additionalRoles,4);
 assert.ok(s.staffing.result.options.length>0);assert.ok(s.staffing.result.options.every(o=>o.status==='not-met'));
 assert.equal(s.staffing.result.accepted,false);assert.deepEqual(s.staffing.inputs,first.state.businessPlanning.staffing.inputs);
});
test('enough headcount with the wrong skills yields a qualitative skill plan without fabricated capacity',async()=>{
 const body=solutionRequest('We have enough employees, but nobody has the engineering skills for this work. Help us develop capability without assuming readiness.'),c=candidate('skill-development');
 c.goal={statement:'Develop engineering capability for the work',turnId:body.message.id};
 c.name='Build capability with coaching';c.activities[0].name='Coached engineering pilot';c.activities[0].step='Review the required skills, then run a coached pilot before assigning independent delivery.';
 const reply=await run(body,[evaluate(c),{...final('Start with a coached pilot and a readiness checkpoint. Employee count alone does not establish available engineering capacity.',[c.id]),questions:['Which engineering tasks must people deliver independently?']}]);
 const item=reply.state.working[0];assert.equal(item.result.calculationStatus,'awaiting-scope');assert.equal(item.result.uniqueParticipants,null);assert.equal(item.result.cashEstimate.cash,null);
 assert.equal(reply.state.businessPlanning,undefined);assert.deepEqual(reply.state.verifiedMetrics,[]);assert.equal(body.catalog,null);
});
test('delayed unproven automation does not change previously checked workload capacity or cash',async()=>{
 const first=await staffed(),before=JSON.stringify(first.state.businessPlanning),body=solutionRequest('Automation may become available in March 2027. Until tested, keep our existing capacity and costs unchanged; propose a gated pilot.',false,first.state,4),c=candidate('automation-pilot');
 c.goal={statement:'Review an automation pilot for service delivery',turnId:body.message.id};c.name='Test automation before release';
 c.activities[0].domain='execution';c.activities[0].step='Pilot automation after implementation review, then assess quality before assuming any delivery capacity.';
 const reply=await run(body,[evaluate(c),final('Review the pilot first. No automation capacity or savings are included in the current calculation.',[c.id])]);
 assert.equal(JSON.stringify(reply.state.businessPlanning),before);assert.equal(reply.state.working.at(-1).result.cashEstimate.cash,null);
 const s=first.state.businessPlanning;
 assert.throws(()=>editStaffingInputs(s.review,s.staffing.inputs,[{field:'automationCapacity',value:1,basis:supplied(body)}],body.message,[body.message]),/Unsupported staffing assumption/);
});
test('an answer can change the recommended path while preserving source identity and the original objective',async()=>{
 const opener=solutionRequest(productQuestion),first=await run(opener,recommendationSteps('product',opener));
 const body=solutionRequest('The protected team cannot be released. Revise the partner path: a product owner can own acceptance.',false,first.state,2),base=first.state.working[1],c=structuredClone(base.candidate);
 c.base={kind:'working',id:base.id,revision:base.revision};c.activities=c.activities.map((a,index)=>({...a,mode:index?'retain':'adapt',source:{kind:'working',id:base.id,revision:base.revision,activityId:a.id},...(index?{}:{ownerRole:'Product owner'})}));
 const reply=await run(body,[evaluate(c),{...final('I now recommend the bounded partner path, conditional on vendor capacity and integration review. The protected team is unavailable.',[c.id]),questions:['Can the workstream be separated without unplanned oversight?']}]);
 assert.equal(reply.state.focusCandidateId,base.id);assert.equal(reply.state.working.at(-1).revision,2);assert.deepEqual(reply.state.working.at(-1).candidate.goal,base.candidate.goal);
 assert.equal(reply.state.working.at(-1).candidate.goal.turnId,opener.message.id);assert.deepEqual(reply.state.working.slice(0,3),first.state.working);
 assert.equal(reply.state.working.at(-1).result.cashEstimate.cash,null);assert.equal(body.catalog,null);
});
test('overlapping internal capacity and incomplete shared costs cannot be summed into a feasible cheap mix',async()=>{
 const first=await staffed(),body=solutionRequest('The internal pools overlap with baseline capacity and each other. Costs may overlap too; withdraw the separate and complete assumptions.',false,first.state,4);
 const reply=await run(body,[{name:'compare_service_staffing',args:{reviewRef:demandReferenceId(body.requestId,0),changes:['internalPoolsDistinct','costsCompleteAndDistinct'].map(field=>({field,value:false,basis:supplied(body)}))}},final('Internal additions are excluded from the comparison and full costs remain unknown.')]);
 const s=reply.state.businessPlanning,r=s.staffing.result;
 assert.equal(r.enumerated,1);assert.equal(r.options.length,1);assert.deepEqual(r.options[0].mix,{build:0,move:0,buy:2});
 assert.equal(r.options[0].cash,null);assert.equal(r.options[0].listedCash,117000);assert.equal(r.options[0].status,'unknown');
 assert.equal(s.review.result.capacityHours,1200);assert.deepEqual(calculateServiceStaffing(s.review,s.staffing.inputs),r);
});
test('unavailable playbook calls cannot bypass the round ceiling; factual answers need no tool',async()=>{
 const body=solutionRequest(productQuestion);
 await assert.rejects(run(body,[read(['demand']),read(['supply']),read(['options']),read(['delivery'])]),/bounded calculation limit/);
 const ordinary=await run(solutionRequest('What does FTE mean?'),[final('FTE means full-time equivalent.')]);
 assert.equal(ordinary.usage.modelRounds,1);assert.equal(ordinary.usage.toolCalls,0);assert.deepEqual(ordinary.state.working,[]);
});
test('actual route rejects the unavailable playbook and checks individual proposals within the unchanged call bound',async()=>{
 const isolated=await offlineBusinessRoute(),body=solutionRequest(productQuestion),plans=actionPlans('product',body).slice(0,2);
 isolated.sandbox.__replies.push(...[read(['demand','supply']),...plans.map(plan=>evaluate(plan)),final('Review these conditional proposals.',plans.map(plan=>plan.id))].map(responseForStep));
 const response=await isolated.post(new Request('http://offline.invalid/api/home-solution-conversation',{method:'POST',body:JSON.stringify(body)}));
 const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.candidateIds.length,2);
 assert.equal(result.usage.modelRounds,4);assert.equal(result.usage.toolCalls,3);assert.equal(isolated.sandbox.__replies.length,0);
 for(const request of isolated.sandbox.__requests){
  assert.equal(request.model,'gpt-6.1-sol');assert.equal(request.service_tier,'default');assert.equal(request.reasoning.effort,'medium');assert.equal(request.max_output_tokens,5000);
  assert.ok(!request.tools.some(t=>['read_workforce_planning_playbook','evaluate_action_plans'].includes(t.name)));
 }
 for(const options of isolated.sandbox.__requestOptions){assert.equal(options.maxRetries,0);assert.equal(options.timeout,60000);}
 assert.equal(isolated.sandbox.__requests.at(-1).tool_choice,'none');
 const denied=JSON.parse(isolated.sandbox.__requests[1].input.find(item=>item.type==='function_call_output').output);
 assert.deepEqual(denied,{ok:false,error:'Unsupported or oversized tool request.',instruction:'Explain the boundary, ask a focused question, or revise typed inputs. Do not claim this calculation succeeded.'});
 assert.ok(result.state.working.every(item=>item.result.cashEstimate.cash===null&&item.result.uniqueParticipants===null));
 assert.deepEqual(result.state.verifiedMetrics,[]);assert.equal(body.catalog,null);
});
