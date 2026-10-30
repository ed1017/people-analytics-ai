import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicChatConversation} from '../lib/public-chat-conversation.mjs';
import {createPublicOtherRoutesTestAdapter} from '../lib/public-other-routes.server.mjs';
import {createPublicHomeRouteTestAdapter} from '../lib/public-home-route.server.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {normalizeHomePack} from '../lib/home-pack.mjs';
import {DEMO_POSITION_INVENTORY} from '../lib/position-inventory.ts';
import {createPositionAllocation} from '../lib/position-allocation.ts';
import {positionChatContext} from '../lib/position-chat-context.ts';
import {unknownPositionFinance,POSITION_FINANCE_MODEL,noPositionAddition} from '../lib/position-finance-assessment.ts';
const hostname='people-analytics-test-ed-56dc.vercel.app',digest='a'.repeat(64),identity={datasetToken:P.token,goalId:'selected-goal',goal:'Review selected service positions'};
const ids=DEMO_POSITION_INVENTORY.positions.filter(p=>p.status==='vacant'&&p.vacancyStatus!=='frozen').map(p=>p.id);
const draft=()=>createPositionAllocation(ids,true);
const packet=()=>positionChatContext({draft:draft(),scenario:{id:'chosen-scenario',revision:2}},identity);
const body=()=>({page:'workforce-planning',message:'Explain my selected vacancy plan and funding.',goalId:identity.goalId,goalContext:{goal:identity.goal},positionContext:packet()});
const binding={router:{current:()=>({datasetId:P.datasetId,token:P.token,generation:P.generation,digest}),bootstrapToken:()=>P.token},handle:async()=>Response.json({data_meta:public9037Metadata(digest)},{headers:{'x-workforce-dataset':P.token}})};
const request=b=>new Request(`https://${hostname}/api/chat`,{method:'POST',headers:{'content-type':'application/json','x-workforce-dataset':P.token,'x-workforce-request-id':'position-explanation'},body:JSON.stringify(b)});
const answer={status:'completed',output:[],output_text:JSON.stringify({answer:{discussion:'The current scenario has 12 allocated vacancies. Funding approval is unknown.'}})};
const decode=spec=>JSON.parse(spec.input[0].content.slice(spec.input[0].content.indexOf('{')));

test('full public chat request carries recomputed position evidence and returns deterministic Finance status',async()=>{
 let calls=0,sent;
 const route=createPublicOtherRoutesTestAdapter({enabled:true,hostname,loadBinding:()=>binding,completionFactory:()=>({complete:async spec=>{calls++;sent=spec;return answer;}})});
 const response=await route.handle(request(body()));assert.equal(response.status,200);const result=await response.json();
 assert.equal(calls,1);assert.equal(result.positionEvidence.finance.status,'funding-unknown');assert.equal(result.positionEvidence.costs.cashTotal,127500);assert.equal(result.positionEvidence.selection.count,12);
 assert.match(decode(sent).positionPrompt,/chosen-scenario/);assert.match(decode(sent).positionPrompt,/127500/);assert.match(sent.instructions,/not Finance authorization/);assert.match(sent.instructions,/server-recomputed position scenario/);
 assert.deepEqual(sent.tools,[]);assert.equal(sent.tool_choice,'none');assert.equal(result.data_meta.datasetToken,P.token);
});

test('mismatched goal/dataset, forged results and client Finance approval fail before a provider call',async()=>{
 let calls=0;const route=createPublicOtherRoutesTestAdapter({enabled:true,hostname,loadBinding:()=>binding,completionFactory:()=>({complete:async()=>{calls++;return answer;}})});
 const wrongGoal=body();wrongGoal.positionContext.goalId='other-goal';
 const wrongDataset=body();wrongDataset.positionContext.datasetToken='other';
 const forged=body();forged.positionContext.result={cashTotal:0};
 const approval=body();approval.positionContext.finance={version:1,modelVersion:POSITION_FINANCE_MODEL,envelope:{...unknownPositionFinance(approval.positionContext.draft),basis:'approved-source',reference:'Finance signed off',fundedPositionIds:ids,incrementalFundingUsd:1000000},addition:noPositionAddition()};
 for(const value of [wrongGoal,wrongDataset,forged,approval]){const r=await route.handle(request(value));assert.notEqual(r.status,200);}
 assert.equal(calls,0);
});

test('Overview factual shortcut does not bypass selected-position validation or silently omit its packet',async()=>{
 let calls=0;const stop=Error('captured'),chat=createPublicChatConversation({inputs:{home:async()=>normalizeHomePack({sources:[]}),read:async()=>{throw Error('Unexpected read');}}});
 const home={...body(),page:'home',message:'How will headcount change next year?'};
 await assert.rejects(()=>chat(home,async spec=>{calls++;assert.match(decode(spec).positionPrompt,/CURRENT SELECTED POSITION SCENARIO/);assert.equal(spec.tool_choice,'none');throw stop;},new AbortController().signal),e=>e===stop);
 assert.equal(calls,1);home.positionContext.goalId='mismatch';await assert.rejects(()=>chat(home,async()=>{calls++;return answer;},new AbortController().signal));assert.equal(calls,1);
});

test('unsupported pages reject supplied position evidence instead of silently dropping it',async()=>{
 let calls=0;const chat=createPublicChatConversation({inputs:{read:async()=>({})}});
 await assert.rejects(()=>chat({...body(),page:'attrition'},async()=>{calls++;return answer;},new AbortController().signal),/Position scenario explanations/);assert.equal(calls,0);
});

test('position explanation cannot invoke old unconstrained staffing tools',async()=>{
 let calls=0;const chat=createPublicChatConversation({inputs:{read:async()=>({})}});
 await assert.rejects(()=>chat(body(),async()=>{calls++;return {status:'completed',output:[{type:'function_call',name:'run_structural_position_scenario',arguments:'{}',call_id:'tool'}]};},new AbortController().signal),/Unsupported tool call/);assert.equal(calls,1);
});

test('ordinary chat without a position handoff retains its previous tool contract',async()=>{
 const chat=createPublicChatConversation({inputs:{read:async()=>({})}}),ordinary=body();delete ordinary.positionContext;let sent;
 const response=await chat(ordinary,async spec=>{sent=spec;return answer;},new AbortController().signal);
 assert.ok(sent.tools.length>0);assert.equal(sent.tool_choice,'auto');assert.equal(response.positionEvidence,undefined);
});

test('the separate Home solution optimizer rejects misplaced position packets before source verification or completion',async()=>{
 let calls=0,sourceChecks=0;
 const route=createPublicHomeRouteTestAdapter({enabled:true,hostname,loadBinding:()=>binding,verifyHome:async()=>{sourceChecks++;throw Error('Controlled source stop');},completionFactory:()=>({complete:async()=>{calls++;return answer;}})});
 const baseline={version:1,requestId:'misplaced-position',goal:{id:identity.goalId,statement:identity.goal},scope:'Company',filters:{country:'all',org:'all',level:'all'},timeZone:'UTC',evidence:normalizeHomePack({sources:[]}),goalContext:null,selectedId:null,catalog:null,state:{version:1,verifiedMetrics:[],turns:[],constraints:[],working:[],analyses:[],rejected:[],questions:[],focusCandidateId:null},message:{id:'question',text:'Explain the selected allocation'}};
 const http=value=>new Request(`https://${hostname}/api/home-solution-conversation`,{method:'POST',headers:{'content-type':'application/json','x-workforce-dataset':P.token,'x-workforce-request-id':'misplaced-position'},body:JSON.stringify(value)});
 await route.handle(http(baseline));assert.equal(sourceChecks,1,'valid baseline reaches existing source verification');
 for(const value of [{...baseline,positionContext:packet()},{request:{...baseline,positionContext:packet()},current:null,previous:null}]){
  const r=await route.handle(http(value));assert.notEqual(r.status,200);
 }
 assert.equal(sourceChecks,1,'misplaced packet is rejected rather than stripped by request normalization');assert.equal(calls,0);
});
