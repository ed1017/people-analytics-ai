import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {buildHomePack} from '../lib/home-pack.mjs';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {createSwpDemo} from '../lib/swp-demo.ts';
import {createPlanAlternatives,packPlanAlternatives} from '../lib/home-plan-alternatives.ts';
import {emptySolutionState,evaluateSolutionCandidate} from '../lib/home-solution-conversation.ts';
import {createPublicHomeGroundingTestAdapter} from '../lib/public-home-grounding.server.mjs';
import {createPublicSavedEvidence,createPublicSavedEvidenceTestAdapter,readPublicSavedEvidenceRecipe} from '../lib/public-saved-evidence.server.mjs';
import {loadPublic9037Binding} from '../lib/public-9037.server.mjs';
import {loadPublicProjectionSource} from '../lib/public-projection-source.server.mjs';
import {calculateHeadcountProjection} from '../lib/home-solution-projection.ts';
const filters={country:'all',org:'all',level:'all'},scope='All countries; All business units; All levels',digest='a'.repeat(64),hostname='people-analytics-test-ed-56dc.vercel.app';
const version=d=>({datasetId:P.datasetId,datasetToken:P.token,publicDigest:d,cutoff:P.cutoff,provenance:'approved-public-projection-v1',contract:P.contract,publicationReceiptId:P.approval});
function documents(){return {data_meta:public9037Metadata(digest),overview:{headcount:12,snapshot_date:P.cutoff},trend:[{snapshot_date:P.cutoff,headcount:12,fte:10}],workforce_filter_scope:{version:3,status:'verified_public_aggregate',requested:filters,effective:filters,label:scope,basis:'Invented aggregate fixture',datasetToken:P.token,contract:P.contract,cutoff:P.cutoff,metricContract:'voluntary-ytd-nine-month-average-stock-v2',stockStatus:'positive'}};}
async function requestFor(pack,source){
 const draft=await createSwpDemo('guided-saved-goal','2026-10-20T12:00:00.000Z');
 draft.binding=await actionBinding('guided-saved-goal',draft.binding.goal,pack,null);
 const goal={id:'guided-saved-goal',statement:draft.binding.goal};
 const catalog=packPlanAlternatives(createPlanAlternatives({goalId:goal.id,goal:goal.statement},[{id:'plan-one',draft}]));
 const recipe={version:1,source,goal,filters,scope,evidence:pack,planningInputs:null};
 const request={version:1,requestId:'verify-saved',goal,scope,filters,timeZone:'UTC',evidence:pack,goalContext:null,selectedId:'plan-one',catalog,state:emptySolutionState(),message:{id:'new-message',text:'Compare this saved plan'}};
 return structuredClone({kind:'solution',request,current:recipe,previous:[]});
}
async function setup(){
 const data=documents(),pack=buildHomePack({dashboard:{status:'loaded',data}},scope),raw=await requestFor(pack,version(digest));
 const binding={router:{current:()=>({datasetId:P.datasetId,token:P.token,digest,generation:P.generation}),bootstrapToken:async()=>P.token},handle:async()=>Response.json(data,{headers:{'x-workforce-dataset':P.token}})};
 const grounding=createPublicHomeGroundingTestAdapter({enabled:true,hostname,loadPublicBinding:async()=>binding});
 const checker=createPublicSavedEvidenceTestAdapter({enabled:true,verifyHome:(r,s)=>grounding.verify(r,s),loadProjection:()=>{throw Error('No analysis requested');}});
 return {data,raw,checker};
}
test('disabled factory reads nothing; verified saved evidence preserves serialized plan identities/hashes',async()=>{
 const f=await setup(),before=JSON.stringify(f.raw);
 await assert.rejects(createPublicSavedEvidence({hostname}).verify(f.raw));
 const checked=await f.checker.verify(f.raw);assert.equal(checked.selectedId,'plan-one');assert.equal(checked.verifiedBindingKeys.length,1);assert.equal(checked.publicDigest,digest);assert.equal(JSON.stringify(f.raw),before);
 const reloaded=JSON.parse(before);assert.deepEqual(await f.checker.verify(reloaded),checked);
});
for(const [name,mutate] of [
 ['goal statement',r=>r.request.goal.statement='Different goal'],['goal identity',r=>r.current.goal.id='other'],['selection',r=>r.request.selectedId='missing-plan'],['scope',r=>r.current.filters.country='US'],['stale source',r=>r.current.source.publicDigest='b'.repeat(64)],['changed evidence',r=>{r.current.evidence.sources.find(s=>s.id==='W1').facts.headcount=13;}],['changed planning inputs',r=>r.current.planningInputs={budget:20}],['missing public recipe',r=>r.current=null],['private recipe',r=>{r.current.source={datasetId:'candidate',datasetToken:'candidate:1',bundleDigest:digest,cutoff:P.cutoff};}],['missing source receipt',r=>delete r.current.source.publicationReceiptId],['recipe extension',r=>r.current.hidden='not allowed'],['unbounded recipes',r=>r.previous=Array(17).fill(r.current)],['plan arithmetic',r=>r.request.catalog.plans[0].result.inputKey='tampered']
])test('saved verification rejects '+name,async()=>{const f=await setup();mutate(f.raw);await assert.rejects(f.checker.verify(f.raw));});
test('matching retained evidence recipe permits earlier evidence; no recipe is guessed',async()=>{
 const f=await setup(),old=structuredClone(f.raw.current);
 // A changed packet note changes its hash but is valid normalized evidence; the saved packet remains exact.
 f.raw.current.evidence=structuredClone(old.evidence);f.raw.current.evidence.workforceScope=scope;
 f.raw.current.planningInputs={explicitUserScenario:1};f.raw.request.evidence=f.raw.current.evidence;
 await assert.rejects(f.checker.verify(f.raw),/matching current public evidence/);
 f.raw.previous=[old];const result=await f.checker.verify(f.raw);assert.equal(result.verifiedBindingKeys.length,2);
});
test('plan conversation uses existing exact catalog, selected and comparison contracts',async()=>{
 const f=await setup();f.raw.kind='plan';f.raw.request={version:1,requestId:'plan-replay',context:{goalId:f.raw.current.goal.id,goal:f.raw.current.goal.statement},selectedId:'plan-one',comparisonIds:[],text:'Revise this plan',catalog:f.raw.request.catalog};
 assert.equal((await f.checker.verify(f.raw)).selectedId,'plan-one');
 f.raw.request.comparisonIds=['missing'];await assert.rejects(f.checker.verify(f.raw));
});
test('bounded total verification cancels stalled dependencies and oversized recipe inputs',async()=>{
 const f=await setup(),controller=new AbortController();controller.abort();await assert.rejects(f.checker.verify(f.raw,controller.signal));
 let signal;const checker=createPublicSavedEvidenceTestAdapter({enabled:true,timeoutMs:15,verifyHome:(_,s)=>{signal=s;return new Promise(()=>{});}});
 await assert.rejects(checker.verify(f.raw),/aborted/);assert.equal(signal.aborted,true);
 assert.throws(()=>readPublicSavedEvidenceRecipe({...f.raw.current,planningInputs:{text:'x'.repeat(170000)}}));
});
test('actual public9037 saved-plan continuity and projection currentness',{skip:!fs.existsSync(new URL('../.private-9037',import.meta.url))},async()=>{
 const binding=await loadPublic9037Binding({hostname,production:false}),response=await binding.handle(new Request('https://'+hostname+'/api/dashboard?'+new URLSearchParams(filters))),data=await response.json();
 const pack=buildHomePack({dashboard:{status:'loaded',data}},scope),raw=await requestFor(pack,version(binding.router.current().digest));
 const source=await loadPublicProjectionSource({hostname,production:false}),inputs=await source.projection(filters);
 const spec={id:'saved-public-flow',base:null,method:'monthly_flow',months:1,changes:[['monthly_hires',20],['monthly_exits',10]].map(([field,value])=>({field,kind:'literal',value,basis:'illustrative',turnId:null,interpretation:'Explicit test assumption.'}))};
 raw.request.state.analyses=[await calculateHeadcountProjection(spec,inputs,[],[])];
 const checked=await createPublicSavedEvidence({enabled:true,hostname}).verify(raw);assert.equal(checked.verifiedProjectionIds[0].id,spec.id);assert.equal(inputs.opening,9037);
 const bad=structuredClone(raw);bad.request.state.analyses[0].inputDigest='b'.repeat(64);await assert.rejects(createPublicSavedEvidence({enabled:true,hostname}).verify(bad),/projection inputs changed/i);
});
test('exploration follow-ups verify each candidate recipe without adopting a goal',async()=>{
 const f=await setup();f.raw.request.goal={id:'',statement:''};f.raw.request.catalog=null;f.raw.request.selectedId=null;f.raw.current.goal={id:'',statement:''};
 const make=(id,statement)=>({id,base:null,goal:{statement,turnId:f.raw.request.message.id},name:statement,objective:statement,approach:'Review a proposed activity.',rationale:'Illustrative alternative.',tradeoffs:['Effort unknown.'],nextStep:'Review.',successMeasure:'Agree a measure.',activities:[{id:'c1',mode:'new',source:null,name:'Review',domain:'execution',step:'Discuss the proposed activity.',ownerRole:'Proposed lead',evidenceIds:[],dependsOn:[],audienceOf:null,limitation:'Illustrative assumption.'}],quantities:[]});
 const a=await evaluateSolutionCandidate(f.raw.request,make('a','Improve coordination'),[]);
 const b=await evaluateSolutionCandidate(f.raw.request,make('b','Improve briefings'),[]);
 f.raw.request.state.working=[a,b];
 f.raw.previous=[a,b].map(item=>({...structuredClone(f.raw.current),goal:{id:'exploration',statement:item.binding.goal},planningInputs:{scope:f.raw.request.scope,constraints:item.constraints}}));
 const before=JSON.stringify(f.raw),checked=await f.checker.verify(f.raw);
 assert.deepEqual(checked.goal,{id:'',statement:''});assert.equal(checked.verifiedBindingKeys.length,2);assert.equal(JSON.stringify(f.raw),before);
 const missing=structuredClone(f.raw);missing.previous.pop();await assert.rejects(f.checker.verify(missing));
 const adopted=structuredClone(f.raw);adopted.request.goal={id:'named-goal',statement:a.binding.goal};await assert.rejects(f.checker.verify(adopted));
 const other=structuredClone(f.raw);other.previous[0].goal.statement='Unrelated goal';await assert.rejects(f.checker.verify(other));
});
