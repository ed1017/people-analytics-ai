import {PublicPlannerAdmissionError} from '../lib/public-planner-round.server.mjs';
import {emptyGoalProgress,HEADCOUNT_DEFINITION} from '../lib/goal-progress.ts';
import {illustrativeServiceReview} from '../lib/swp-demand.ts';
// Existing approved serving checkout must be cwd. Only projected public responses reach orchestration.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicHomeRoute,createPublicHomeRouteTestAdapter,PUBLIC_HOME_ROUTE_ENABLED} from '../lib/public-home-route.server.mjs';
import {loadPublic9037Binding} from '../lib/public-9037.server.mjs';
import {createPublicHomeGrounding} from '../lib/public-home-grounding.server.mjs';
import {createPublicSavedEvidence} from '../lib/public-saved-evidence.server.mjs';
import {loadPublicProjectionSource} from '../lib/public-projection-source.server.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {buildHomePack} from '../lib/home-pack.mjs';
const hostname='people-analytics-test-ed-56dc.vercel.app',filters={country:'all',org:'all',level:'all'},url='https://'+hostname+'/api/home-solution-conversation';
const binding=await loadPublic9037Binding({hostname,production:false});
const results={};for(const key of ['dashboard','attrition']){const r=await binding.handle(new Request('https://'+hostname+'/api/'+key+(key==='dashboard'?'?'+new URLSearchParams(filters):''),{headers:{'x-workforce-dataset':P.token}}));assert.equal(r.status,200);results[key]={status:'loaded',data:await r.json()};}
const scope=results.dashboard.data.workforce_filter_scope.label,pack=buildHomePack(results,scope),projection=await loadPublicProjectionSource({hostname,production:false}),inputs=await projection.projection(filters);
const empty=()=>({version:1,verifiedMetrics:[],turns:[],constraints:[],working:[],analyses:[],rejected:[],questions:[],focusCandidateId:null});
const request=(text='Explain the current company evidence.')=>({version:1,requestId:'request1',goal:{id:'goal1',statement:'Improve coordination'},scope,filters,timeZone:'UTC',evidence:structuredClone(pack),goalContext:null,selectedId:null,catalog:null,state:empty(),message:{id:'message1',text}});
const http=(raw,method='POST',suffix='')=>new Request(url+suffix,{method,headers:{'x-workforce-dataset':P.token,'x-workforce-request-id':raw?.request?.requestId??raw?.requestId??'projection-read',...(method==='POST'?{'content-type':'application/json'}:{})},...(method==='POST'?{body:JSON.stringify(raw)}:{})});
const final=(ids=[])=>({verifiedMetrics:[],answer:ids.length?{findings:'These are proposed alternatives.',decisionRationale:'Different coordination activities can be reviewed.',caveats:['Inputs remain assumptions.']}:{discussionOnly:'The company evidence is synthetic and should be reviewed.'},candidateIds:ids,analysisIds:[],questions:[],constraintUpdates:[],rejected:[],focusCandidateId:ids[0]??null});
const output=(calls=[],value=final())=>({status:'completed',output:calls.map((c,i)=>({type:'function_call',call_id:'call'+i,id:'fc'+i,name:c.name,arguments:JSON.stringify(c.args),status:'completed'})),output_text:JSON.stringify(value)});
function ports(complete,extra={}){return {enabled:true,hostname,loadBinding:()=>binding,verifyHome:(r,s)=>createPublicHomeGrounding({enabled:true,hostname}).verify(r,s),verifySaved:(r,s)=>createPublicSavedEvidence({enabled:true,hostname}).verify(r,s),loadProjection:()=>projection,completionFactory:context=>({complete:async(spec,meta)=>{assert.equal(meta.contextId,context.currentContext());assert.equal(spec.store,false);assert.equal(spec.parallel_tool_calls,false);return complete(spec,meta);}}),...extra};}
function candidate(id,turnId,name,domain,step){return {goal:{statement:'Improve coordination',turnId},id,base:null,name,objective:'Improve coordination',approach:step,rationale:'Proposed approach for review.',tradeoffs:['Time and effects are unverified.'],nextStep:'Review the proposed activity.',successMeasure:'Agree a measurement before proceeding.',activities:[{id:'c1',mode:'new',source:null,name,domain,step,ownerRole:'Proposed team lead',evidenceIds:[],dependsOn:[],audienceOf:null,limitation:'Invented planning activity; no effect established.'}],quantities:[]};}
function envelope(r){return {request:r,current:{version:1,source:inputs.datasetVersion,goal:structuredClone(r.goal),filters:r.filters,scope:r.scope,evidence:r.evidence,planningInputs:{scope:r.scope,constraints:r.state.constraints}},previous:[]};}
test('default disabled; actual public GET and deterministic turnover require no completion',async()=>{
 assert.equal(PUBLIC_HOME_ROUTE_ENABLED,false);assert.equal((await createPublicHomeRoute({hostname}).handle(http(request()))).status,503);
 const route=createPublicHomeRoute({enabled:true,hostname,completionFactory:()=>{throw Error('No paid path');}});
 const read=await route.handle(http(null,'GET','?'+new URLSearchParams(filters)));assert.equal(read.status,200);assert.equal((await read.json()).inputs.opening,9037);
 const r=await route.handle(http(request('monthly turnover')));assert.equal(r.status,200);const body=await r.json();assert.equal(body.usage.modelRounds,0);assert.match(body.answer,/synthetic/);
});
test('existing model/tool orchestration sends only admitted seam and preserves request scope/goal',async()=>{
 let calls=0;const route=createPublicHomeRouteTestAdapter(ports((spec,meta)=>{calls++;assert.equal(meta.round,1);assert.equal(meta.datasetToken,P.token);assert.ok(spec.tools.some(t=>t.name==='evaluate_candidate'));assert.ok(spec.tools.some(t=>t.name==='revise_parameters'));assert.ok(spec.tools.some(t=>t.name==='project_headcount'));assert.match(spec.instructions,/staffing/i);return output();}));
 const r=await route.handle(http(request()));assert.equal(r.status,200);assert.equal(calls,1);assert.equal((await r.json()).state.turns.length,2);
});
test('generate distinct plans then revise and combine under verified saved evidence',async()=>{
 const first=request('Propose two coordination plans for review.');const a=candidate('a','message1','Review handoffs','execution','Map handoff ownership.'),b=candidate('b','message1','Practice briefing','learning','Practice a concise briefing.');
 let phase=0;const generated=await createPublicHomeRouteTestAdapter(ports(()=>++phase===1?output([{name:'evaluate_candidate',args:{candidate:a,constraintUpdates:[]}},{name:'evaluate_candidate',args:{candidate:b,constraintUpdates:[]}}],final(['a','b'])):output([],final(['a','b'])))).handle(http(first));
 assert.equal(generated.status,200);const one=await generated.json();assert.equal(one.state.working.length,2);assert.deepEqual(one.candidateIds,['a','b']);
 const next={...first,requestId:'request2',state:one.state,message:{id:'message2',text:'Combine both approaches and refine the coordination plan.'}};
 const combined=candidate('combined','message2','Combined coordination','execution','Review the combined sequence.');combined.activities=[{...a.activities[0],mode:'retain',source:{kind:'working',id:'a',revision:1,activityId:'c1'}},{...b.activities[0],id:'c2',mode:'retain',source:{kind:'working',id:'b',revision:1,activityId:'c1'}}];
 const route=createPublicHomeRouteTestAdapter(ports(()=>output([{name:'evaluate_candidate',args:{candidate:combined,constraintUpdates:[]}}],final(['combined']))));
 const missing=await route.handle(http(next));assert.equal(missing.status,503);
 const result=await route.handle(http(envelope(next)));assert.equal(result.status,200);const two=await result.json();assert.equal(two.candidateIds[0],'combined');assert.equal(two.state.working.at(-1).candidate.activities.length,2);
 const revise={...next,requestId:'request3',state:two.state,message:{id:'message3',text:'Set the shared coordination hours to 2.'}};
 const edit={id:'revised',source:{kind:'working',id:'combined',revision:1},quantities:[{field:'coordination_hours',target:null,unit:'hours/total',kind:'literal',number:2,text:null,source:null,factor:null,turnId:'message3',interpretation:'User supplied shared coordination hours.'}]};
 let revisionRound=0;const revised=await createPublicHomeRouteTestAdapter(ports(()=>{if(++revisionRound>1){return output([],final(['revised']));}return output([{name:'revise_parameters',args:{edit,constraintUpdates:[]}}],final(['revised']));})).handle(http(envelope(revise)));
 assert.equal(revised.status,200);const three=await revised.json();assert.equal(three.candidateIds[0],'revised');assert.equal(three.state.working.at(-1).candidate.activities.length,2);assert.deepEqual(three.state.working.at(-1).blocking,[]);assert.ok(three.state.working.at(-1).draft);

});
test('wrong token, stale source, malformed query and cancelled/idle reads fail before completion',async()=>{
 let calls=0;const route=createPublicHomeRouteTestAdapter(ports(()=>{calls++;return output();}));
 const wrong=http(request());wrong.headers.set('x-workforce-dataset','legacy-v1:0');assert.equal((await route.handle(wrong)).status,409);
 assert.equal((await route.handle(http(null,'GET','?country=all'))).status,503);
 let stale=false;const changed={router:{bootstrapToken:()=>P.token,current:()=>({...binding.router.current(),...(stale?{digest:'f'.repeat(64)}:{})})}};
 const staleRoute=createPublicHomeRouteTestAdapter(ports(()=>{stale=true;return output();},{loadBinding:()=>changed}));assert.equal((await staleRoute.handle(http(request()))).status,503);
 const stalled=createPublicHomeRouteTestAdapter(ports(()=>output(),{loadBinding:()=>new Promise(()=>{}),timeoutMs:20}));assert.equal((await stalled.handle(http(request()))).status,503);assert.equal(calls,0);
});

test('natural fixed-role staffing uses existing checked tool without borrowing company capacity',async()=>{
 const r=request('Compare ways to fill 3 analyst roles over 6 months.');
 let rounds=0;const route=createPublicHomeRouteTestAdapter(ports(spec=>{
  rounds++;assert.ok(spec.tools.some(t=>t.name==='compare_required_staffing'));if(rounds>1)return output();
  const basis={kind:'user-supplied',turnId:r.message.id,quote:r.message.text,explanation:'Explicit current user premise.'};
  return output([{name:'compare_required_staffing',args:{changes:[{field:'requiredRoles',value:3,basis},{field:'role',value:'Analyst roles',basis},{field:'months',value:6,basis}]}}]);
 }));
 const response=await route.handle(http(r));assert.equal(response.status,200);const body=await response.json();assert.equal(body.state.requiredStaffing.inputs.requiredRoles,3);assert.equal(body.state.requiredStaffing.datasetToken,P.token);assert.ok(rounds<=2);
 assert.deepEqual(body.state.currentCalculationKinds,['required-staffing']);
 for(const text of ['Can you show me monthly turnover?','Show the headcount trend please.','is sentiment correlated with turnover']){
  const next={...r,requestId:'topic-switch',state:body.state,message:{id:'topic-message',text}};
  const switched=await createPublicHomeRouteTestAdapter(ports(()=>{throw Error('No provider needed for metric switch');})).handle(http(envelope(next)));
  assert.equal(switched.status,200);const metric=await switched.json();
  assert.equal(metric.usage.modelRounds,0);assert.deepEqual(metric.state.currentCalculationKinds,[]);
  assert.deepEqual(metric.state.requiredStaffing,body.state.requiredStaffing);
  assert.deepEqual(body.state.currentCalculationKinds,['required-staffing'],'original scenario is immutable');
 }

});
test('unknown mode and changed replay goal/selection refuse before provider',async()=>{
 let calls=0;const route=createPublicHomeRouteTestAdapter(ports(()=>{calls++;return output();}));
 const mode=http(request());mode.headers.set('x-workforce-conversation','unknown');assert.equal((await route.handle(mode)).status,503);
 const raw=envelope(request());raw.current.goal.statement='Other goal';assert.equal((await route.handle(http(raw))).status,503);
 const selected=envelope(request());selected.request.selectedId='nonexistent';assert.equal((await route.handle(http(selected))).status,503);assert.equal(calls,0);
});

test('hiring, natural business demand, explicit demand and progress retain distinct tool contracts',async()=>{
 for(const mode of ['hiring','business','demand','progress']){
  const r=request('Review the entered assumptions only; do not recommend a plan.');let round=0;
  const context={conversationMode:'business-swp-demand-v1',classification:'unverified-business-inputs',intakeId:'swp-demand-test',datasetToken:P.token,boundGoal:r.goal,revision:1};
  if(mode==='demand')r.goalContext={scenarioReview:context};
  if(mode==='progress')r.goalProgress={version:1,goalId:r.goal.id,datasetToken:P.token,origin:'authored',ledger:null,unavailableReason:null};
  const spec=illustrativeServiceReview(context,'2026-09-30').spec;spec.objective=r.message.text;spec.objectiveTurnId=r.message.id;
  const route=createPublicHomeRouteTestAdapter(ports(provider=>{
   round++;if(round>1)return output();
   const names=provider.tools.map(t=>t.name);
   if(mode==='hiring'){assert.ok(names.includes('review_hiring_budget'));return output([{name:'review_hiring_budget',args:{changes:[]}}]);}
   if(mode==='progress'){assert.ok(names.includes('read_goal_progress'));return output([{name:'read_goal_progress',args:{}}]);}
   assert.ok(names.includes('review_scoped_service_demand'));if(mode==='demand')assert.ok(!names.includes('review_hiring_budget'));
   return output([{name:'review_scoped_service_demand',args:{spec}}]);
  },{progressEnabled:mode==='progress'}));
  const req=http(r);if(mode==='demand')req.headers.set('x-workforce-conversation','business-swp-demand-v1');
  const response=await route.handle(req);assert.equal(response.status,200,mode);const result=await response.json();assert.equal(result.usage.toolCalls,1,mode);
  if(mode==='hiring')assert.equal(result.state.hiringBudget.datasetToken,P.token);
  if(mode==='business')assert.equal(result.state.businessPlanning.context.datasetToken,P.token);
  if(mode==='demand')assert.equal(result.demandReview.datasetToken,P.token);
 }
});
test('unknown raw packet fields and conflicting request identity are rejected',async()=>{
 let calls=0;const route=createPublicHomeRouteTestAdapter(ports(()=>{calls++;return output();}));
 const r=request();r.evidence.extra='tampered';assert.equal((await route.handle(http(r))).status,503);
 const other=http(request());other.headers.set('x-workforce-request-id','different');assert.equal((await route.handle(other)).status,503);assert.equal(calls,0);
});

test('bounded body stream cancellation and missing header never reach completion',async()=>{
 let reads=0,cancelled=false;const route=createPublicHomeRouteTestAdapter(ports(()=>{throw Error('No provider');},{timeoutMs:20}));
 const stream=new ReadableStream({pull(){reads++;return new Promise(()=>{});},cancel(){cancelled=true;}});
 const r=new Request(url,{method:'POST',headers:{'content-type':'application/json','x-workforce-dataset':P.token,'x-workforce-request-id':'idle'},body:stream,duplex:'half'});
 assert.equal((await route.handle(r)).status,503);assert.ok(reads>0);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(cancelled,true);
 const missing=http(request());missing.headers.delete('x-workforce-request-id');assert.equal((await createPublicHomeRouteTestAdapter(ports(()=>{throw Error('No provider');})).handle(missing)).status,503);
});

test('blank-goal exploration generates and revises with per-binding replay without adopting a goal',async()=>{
 const first=request('Propose an exploratory plan to improve coordination.');first.goal={id:'',statement:''};
 const proposed=candidate('exploratory','message1','Explore handoffs','execution','Map a proposed handoff.');
 const initial=await createPublicHomeRouteTestAdapter(ports(spec=>{
  const context=JSON.parse(spec.input[0].content.split('\n').slice(1).join('\n'));assert.deepEqual(context.goal,{id:'',statement:''});
  return output([{name:'evaluate_candidate',args:{candidate:proposed,constraintUpdates:[]}}],final(['exploratory']));
 })).handle(http(first));assert.equal(initial.status,200);const one=await initial.json();
 const item=one.state.working[0];assert.equal(item.binding.goalId,'exploration');assert.equal(item.binding.goal,'Improve coordination');
 const follow={...first,requestId:'explore-followup',state:one.state,message:{id:'explore-edit',text:'Set shared coordination effort to 2 hours.'}};
 const replay=envelope(follow);replay.current.planningInputs=null;
 replay.previous=one.state.working.map(item=>({...structuredClone(replay.current),goal:{id:item.binding.goalId,statement:item.binding.goal},planningInputs:{scope:follow.scope,constraints:item.constraints}}));
 const before=JSON.stringify(replay);let calls=0;
 const route=createPublicHomeRouteTestAdapter(ports(spec=>{
  calls++;const context=JSON.parse(spec.input[0].content.split('\n').slice(1).join('\n'));assert.deepEqual(context.goal,{id:'',statement:''});assert.equal(context.selectedPlan,null);
  if(calls>1)return output([],final(['explore-revised']));
  return output([{name:'revise_parameters',args:{edit:{id:'explore-revised',source:{kind:'working',id:'exploratory',revision:1},quantities:[{field:'coordination_hours',target:null,unit:'hours/total',kind:'literal',number:2,text:null,source:null,factor:null,turnId:'explore-edit',interpretation:'Explicit user effort assumption.'}]},constraintUpdates:[]}}],final(['explore-revised']));
 }));
 const missing=await route.handle(http({...replay,previous:[]}));assert.equal(missing.status,503);assert.equal(calls,0);
 const response=await route.handle(http(replay));assert.equal(response.status,200);const two=await response.json();assert.equal(two.candidateIds[0],'explore-revised');assert.ok(two.state.working.every(item=>item.binding.goalId==='exploration'));assert.deepEqual(two.state.working.at(-1).blocking,[]);assert.equal(JSON.stringify(replay),before);assert.deepEqual(follow.goal,{id:'',statement:''});
});
test('progress entry proposes explicit user-reported measurement and observation without writing ledger',async()=>{
 const r=request('Please prepare a headcount progress entry: all countries, units and levels, 12 people on 2026-09-30, complete coverage; use it as baseline and target 15 people by 2026-12-31, with 30-day freshness.');
 const ledger=emptyGoalProgress(r.goal.id),before=JSON.stringify(ledger);
 r.goalProgress={version:1,goalId:r.goal.id,datasetToken:P.token,origin:'authored',ledger,unavailableReason:null};
 const spec={metric:'headcount',definition:HEADCOUNT_DEFINITION,unit:'people',scope:filters,measurement:{direction:'increase',targetValue:15,targetDate:'2026-12-31',maxAgeDays:30,baselineId:null},observation:{value:12,date:'2026-09-30',complete:true,supersedes:null,useAsBaseline:true},basis:[{turnId:r.message.id,quote:r.message.text}]};
 let rounds=0;const route=createPublicHomeRouteTestAdapter(ports(provider=>{
  assert.ok(provider.tools.some(t=>t.name==='propose_goal_progress'));
  if(++rounds>1){const f=final();f.answer={discussionOnly:'This is an unverified user-reported draft for your review. It has not been saved.'};return output([],f);}
  return output([{name:'propose_goal_progress',args:{spec}}]);
 },{progressEnabled:true}));
 const response=await route.handle(http(r));assert.equal(response.status,200);const result=await response.json();assert.equal(result.progressProposal.datasetToken,P.token);assert.equal(result.progressProposal.goalId,r.goal.id);assert.equal(result.progressProposal.spec.observation.value,12);assert.deepEqual(result.progressProposal.blocking,[]);assert.equal(JSON.stringify(ledger),before);assert.deepEqual(ledger.events,[]);assert.equal(result.usage.toolCalls,1);assert.match(result.answer,/not been saved/);
});
test('calendar-year production route computes actual annual evidence without constructing provider',async()=>{
 const r=request('What was turnover in 2025?');r.evidence=buildHomePack(results,scope,r.message.text);
 const route=createPublicHomeRoute({enabled:true,hostname,completionFactory:()=>{throw Error('Annual answer must not construct paid path');}});
 const response=await route.handle(http(r));assert.equal(response.status,200);const body=await response.json();assert.equal(body.usage.modelRounds,0);assert.match(body.answer,/15.35%/);assert.match(body.answer,/1,342 recorded total exits/);assert.match(body.answer,/8,743.67 average month-end headcount/);
});
test('natural Home question prompts preserve exact request through existing admitted orchestration',async()=>{
 for(const text of ['What are our recorded workforce costs?']){
  let calls=0;const r=request(text);r.goal={id:'',statement:''};r.evidence=buildHomePack(results,scope,text);
  const route=createPublicHomeRouteTestAdapter(ports(spec=>{calls++;assert.ok(JSON.stringify(spec.input).includes(text));return output();}));
  const response=await route.handle(http(r));assert.equal(response.status,200);const body=await response.json();assert.equal(calls,1);assert.equal(body.state.turns[0].text,text);assert.equal(body.state.turns.at(-1).role,'assistant');
 }
});

test('unspecified staffing starter collects premises without constructing provider or claiming a plan',async()=>{
 const r=request('How can we close a staffing gap?');r.goal={id:'',statement:''};r.evidence=buildHomePack(results,scope,r.message.text);
 const before=JSON.stringify(r);
 const route=createPublicHomeRoute({enabled:true,hostname,completionFactory:()=>{throw Error('No paid intake');}});
 const response=await route.handle(http(r));assert.equal(response.status,200);const body=await response.json();
 assert.deepEqual(body.usage,{modelRounds:0,toolCalls:0});assert.deepEqual(body.charts,[]);assert.deepEqual(body.candidateIds,[]);
 assert.equal(body.state.questions.length,2);assert.match(body.answer,/how many additional people/);assert.match(body.answer,/By when/);assert.match(body.answer,/not calculated/);
 assert.equal(body.state.turns[0].text,r.message.text);assert.equal(JSON.stringify(r),before);
 const follow={...r,requestId:'follow',state:body.state,message:{id:'follow',text:'We need 3 analysts over 6 months.'}};
 let calls=0;const next=createPublicHomeRouteTestAdapter(ports(()=>{calls++;return output();}));
 await next.handle(http(follow));assert.ok(calls>0,'specified follow-up retains model/tool route');
});


test('headcount starter uses identical verified rows for answer and chart without provider',async()=>{
 const r=request('How has our headcount changed?');r.goal={id:'',statement:''};r.evidence=buildHomePack(results,scope,r.message.text);
 const route=createPublicHomeRoute({enabled:true,hostname,completionFactory:()=>{throw Error('No paid headcount path');}});
 const response=await route.handle(http(r));assert.equal(response.status,200);const body=await response.json();assert.equal(body.usage.modelRounds,0);assert.equal(body.charts.length,1);
 assert.deepEqual(body.charts[0].points,[{date:'2026-07-31',value:8882},{date:'2026-08-31',value:8973},{date:'2026-09-30',value:9037}]);
 for(const p of body.charts[0].points){assert.ok(body.answer.includes(p.date));assert.ok(body.answer.includes(p.value.toLocaleString('en-US')));}
 assert.ok(body.answer.includes(body.charts[0].scope));assert.match(body.answer,/increased by 155 people/);assert.match(body.answer,/\[W1\]/);
});

test('optional lower round ceiling rejects increases before provider and never dispatches a third round',async()=>{
 let calls=0;const route=createPublicHomeRouteTestAdapter(ports(()=>{calls++;return output([{name:'review_hiring_budget',args:{changes:[]}}]);}));
 for(const value of ['0','1','3','4','5','02','2.0']){const req=http(request());req.headers.set('x-workforce-max-rounds',value);assert.equal((await route.handle(req)).status,400);}
 assert.equal(calls,0);
 const req=http(request());req.headers.set('x-workforce-max-rounds','2');const response=await route.handle(req);assert.equal(response.status,503);const result=await response.json();assert.equal(calls,2);assert.deepEqual(result.boundedRequest,{maxModelRounds:2,completedRounds:2,stage:'answer-validation-or-calculation'});
});
test('lower ceiling preserves a complete answer and exact state without changing the ordinary route',async()=>{
 let calls=0;const route=createPublicHomeRouteTestAdapter(ports(()=>{calls++;return output();}));const req=http(request());req.headers.set('x-workforce-max-rounds','2');const response=await route.handle(req);assert.equal(response.status,200);assert.equal(calls,1);assert.equal((await response.json()).usage.modelRounds,1);
});


test('HR level-11 fresh questions pass evidence validation; admission failure is actionable, not evidence rejection',async()=>{
 for(const text of ['we need 12 more people in HR at level 11. How should we approach','How should we add twelve people to HR at level L11?','which HR group has the lowest sentiment?','What are our recorded workforce costs?']){
  const r=request(text);r.goal={id:'',statement:''};const original=structuredClone(r);let reached=0;
  const route=createPublicHomeRouteTestAdapter(ports(()=>{reached++;throw new PublicPlannerAdmissionError();}));
  const response=await route.handle(http(envelope(r))),body=await response.json();
  assert.equal(reached,1);assert.equal(response.status,429);assert.equal(body.code,'planner_admission_unavailable');assert.match(body.error,/spending approval/);assert.doesNotMatch(body.error,/evidence could not|Earlier work|preserved|secret/);assert.deepEqual(r,original);
 }
});

test('validation and invalid-answer failures do not masquerade as admission or claim earlier work',async()=>{
 const invalid=request();invalid.requestId='bad id';const response=await createPublicHomeRouteTestAdapter(ports(()=>{throw Error('must not call');})).handle(http(invalid));const body=await response.json();assert.equal(body.code,'home_request_unverified');assert.doesNotMatch(body.error,/Earlier work|preserved/);
 const failed=await createPublicHomeRouteTestAdapter(ports(()=>{throw Error('sensitive provider detail');})).handle(http(envelope(request())));const error=await failed.json();assert.equal(error.code,'home_answer_unavailable');assert.doesNotMatch(error.error,/sensitive|Earlier work|preserved/);
});

test('ordinary correlation question reads complete public BU partitions with no provider',async()=>{
 for(const text of ['is sentiment correlated with turnover','Is engagement related to attrition?']){
 const r=request(text);r.goal={id:'',statement:''};r.evidence=buildHomePack(results,scope,text);
 const route=createPublicHomeRoute({enabled:true,hostname,completionFactory:()=>{throw Error('Correlation must not call provider');}});
 const response=await route.handle(http(r));assert.equal(response.status,200);const body=await response.json();assert.match(body.answer,/r = /);assert.match(body.answer,/eight business units/);assert.deepEqual(body.state.currentCalculationKinds,[]);assert.match(body.answer,/different measurement windows/);assert.equal(body.usage.modelRounds,0);assert.deepEqual(body.charts,[]);assert.equal(body.state.turns.at(-1).text,body.answer);
 }
});
