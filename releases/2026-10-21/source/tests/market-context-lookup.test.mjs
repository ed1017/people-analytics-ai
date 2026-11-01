import test from 'node:test';
import assert from 'node:assert/strict';
import {readMarketContext,marketContextLookupTool} from '../lib/market-context-lookup.ts';
import {positionMarketCatalogReferences} from '../lib/position-market-context.ts';
import {createAnalyticsToolDispatch} from '../lib/analytics-tool-dispatch.mjs';
import {createPublicOtherRoutesTestAdapter} from '../lib/public-other-routes.server.mjs';
import {createPublicChatConversation} from '../lib/public-chat-conversation.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
const args=(patch={})=>({country:'US',role:'Machine Learning Engineer',occupationCode:null,kind:'all',...patch});
test('canonical lookup returns dated broader outlook and categorical software without adoption',()=>{
 const r=readMarketContext(args());assert.equal(r.status,'available');assert.equal(r.references.length,3);assert.equal(r.references.filter(x=>x.kind==='occupation-skills').length,1);
 const o=r.references.find(x=>x.kind==='occupation-outlook');assert.equal(o.facts.annualOpenings,24800);assert.equal(o.occupationCode,'15-2051');assert.match(o.mappingLimit,/broader|shared/i);assert.equal(o.period,'2025-2035');assert.match(o.sourceSha256,/^[a-f0-9]{64}$/);assert.match(r.mappingStatus,/not confirmed/);
 assert.match(r.action,/no assumptions changed/);assert.ok(JSON.stringify(r).length<48000);
});
test('scope missing, unknown country and unreviewed role never fall back',()=>{
 assert.equal(readMarketContext(args({country:null})).status,'needs-clarification');assert.equal(readMarketContext(args({role:null})).status,'needs-clarification');
 for(const patch of [{country:'Canada'},{role:'AI wizard'}])assert.equal(readMarketContext(args(patch)).status,'unavailable');
});
test('Japan has its own skill levels without substituting US occupational outlook',()=>{assert.equal(readMarketContext(args({country:'Japan',kind:'occupational-skill-levels'})).status,'available');assert.equal(readMarketContext(args({country:'Japan',kind:'occupation-outlook'})).status,'unavailable');});

test('exact O*NET disaggregation and SOC do not substitute siblings',()=>{
 const bi=readMarketContext(args({role:'Business Intelligence Analyst',kind:'in-demand-software'}));assert.equal(bi.references[0].occupationCode,'15-2051.01');
 assert.equal(readMarketContext(args({role:'Business Intelligence Analyst',occupationCode:'15-2051.00',kind:'in-demand-software'})).status,'unavailable');
 assert.equal(readMarketContext(args({occupationCode:'15-2051',kind:'in-demand-software'})).status,'unavailable');
});
test('occupation lookup deduplicates shared projections rather than summing role figures',()=>{
 const r=readMarketContext(args({role:null,occupationCode:'15-2051',kind:'occupation-outlook'}));assert.equal(r.references.length,1);assert.equal(r.references[0].facts.annualOpenings,24800);assert.ok(r.references[0].roles.length>=3);assert.equal(r.references[0].mappingAcknowledgments.length,r.references[0].roles.length);
});
test('client facts, source replacement and malformed scope are rejected',()=>{
 for(const v of [{...args(),annualOpenings:2},{...args(),sourceUrl:'https://evil.test'},args({kind:'live'}),args({country:42}),args({occupationCode:'x'.repeat(21)})])assert.throws(()=>readMarketContext(v));
});
test('outputs are isolated and all supported role lookups stay within bounded output',()=>{
 const catalog=positionMarketCatalogReferences(),before=JSON.stringify(catalog);for(const role of new Set(catalog.filter(r=>r.countryCode==='US').flatMap(r=>r.roles))){const r=readMarketContext(args({role}));assert.equal(r.status,'available');assert.ok(Buffer.byteLength(JSON.stringify(r))<=48000);}
 const r=readMarketContext(args());r.references[0].title='tamper';assert.equal(JSON.stringify(positionMarketCatalogReferences()),before);
});
test('static dispatch performs no network read; legacy analytics dispatch remains intact',async()=>{
 const reads=[],dispatch=createAnalyticsToolDispatch(async(...a)=>{reads.push(a);return {legacy:true};}),signal=new AbortController().signal;
 assert.equal((await dispatch.run('read_market_context',args(),signal)).status,'available');assert.equal(reads.length,0);
 assert.deepEqual(await dispatch.run('get_workforce_overview',{},signal),{legacy:true});assert.equal(reads[0][0],'/api/overview');
 await assert.rejects(()=>dispatch.run('read_market_context',{...args(),value:1},signal));assert.equal(reads.length,1);
});
const hostname='people-analytics-test-ed-56dc.vercel.app',digest='a'.repeat(64);
const binding={router:{current:()=>({datasetId:P.datasetId,token:P.token,generation:P.generation,digest}),bootstrapToken:()=>P.token},handle:async()=>Response.json({data_meta:public9037Metadata(digest)},{headers:{'x-workforce-dataset':P.token}})};
const toolResponse={status:'completed',output:[{type:'function_call',name:'read_market_context',arguments:JSON.stringify(args()),call_id:'market'}],output_text:''};
const finalResponse={status:'completed',output:[],output_text:JSON.stringify({answer:{discussion:'US Data Scientists outlook projects 24,800 annual openings in 2025-2035. This broader occupation is not a count of available applicants.'}})};
test('actual public chat route exposes canonical lookup and sends source facts to the next mocked model round',async()=>{
 let calls=0;const route=createPublicOtherRoutesTestAdapter({enabled:true,hostname,loadBinding:()=>binding,completionFactory:()=>({complete:async spec=>{calls++;assert.deepEqual(spec.tools.map(t=>t.name),['read_market_context']);if(calls===1)return toolResponse;const output=spec.input.find(i=>i.type==='function_call_output');assert.equal(JSON.parse(output.output).references.find(r=>r.kind==='occupation-outlook').facts.annualOpenings,24800);return finalResponse;}})});
 const response=await route.handle(new Request(`https://${hostname}/api/chat`,{method:'POST',headers:{'content-type':'application/json','x-workforce-dataset':P.token,'x-workforce-request-id':'market-test'},body:JSON.stringify({page:'labor-market',message:'What is the US outlook for Machine Learning Engineer?'})}));assert.equal(response.status,200);assert.equal(calls,2);assert.match(JSON.stringify(await response.json()),/24,800/);
});
test('catalogue-only pages reject calculator calls without expanding their previous privileges',async()=>{
 const chat=createPublicChatConversation({inputs:{read:async()=>{throw Error('No network expected');}}});
 await assert.rejects(()=>chat({page:'labor-market',message:'Read US occupational outlook'},async()=>({...toolResponse,output:[{...toolResponse.output[0],name:'run_structural_position_scenario'}]}),new AbortController().signal),/Unsupported tool call/);
});
import {converseSolutions} from '../lib/home-solution-conversation-service.ts';
import {normalizeHomePack} from '../lib/home-pack.mjs';
import {solutionTools} from '../lib/home-solution-conversation-schema.ts';
test('ordinary Home solution loop reads canonical market evidence without adding plans or calculations',async()=>{
 const state={version:1,verifiedMetrics:[],turns:[],constraints:[],working:[],analyses:[],rejected:[],questions:[],focusCandidateId:null};
 const request={version:1,requestId:'market-home',goal:{id:'goal1',statement:'Understand external occupational outlook'},scope:'Company',filters:{country:'all',org:'all',level:'all'},timeZone:'UTC',evidence:normalizeHomePack({sources:[]}),goalContext:null,selectedId:null,catalog:null,state,message:{id:'message1',text:'What is the United States occupational outlook for Machine Learning Engineer?'}};
 let calls=0;assert.ok(solutionTools.some(t=>t.name===marketContextLookupTool.name));
 const final={verifiedMetrics:[],answer:{discussionOnly:'The broader US Data Scientists occupation projects 24,800 annual openings for 2025–2035.'},candidateIds:[],analysisIds:[],questions:[],constraintUpdates:[],rejected:[],focusCandidateId:null};
 const reply=await converseSolutions(request,{complete:async input=>{calls++;assert.ok(Buffer.byteLength(JSON.stringify(input))<=120000);if(calls===1)return {completed:true,items:[],calls:[{id:'market',name:'read_market_context',arguments:JSON.stringify(args())}],text:''};const output=input.find(x=>x.type==='function_call_output');assert.equal(JSON.parse(output.output).status,'available');return {completed:true,items:[],calls:[],text:JSON.stringify(final)};},loadProjection:async()=>{throw Error('No projection read expected');}},new AbortController().signal);
 assert.equal(calls,2);assert.deepEqual(reply.state.working,[]);assert.deepEqual(reply.state.analyses,[]);assert.deepEqual(request.state.working,[]);assert.deepEqual(request.state.analyses,[]);assert.equal(request.goal.id,'goal1');
});
