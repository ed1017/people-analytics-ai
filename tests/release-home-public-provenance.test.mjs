import test from 'node:test';
import assert from 'node:assert/strict';
import {readPublicDisplayContext,readConstructedDisplayContext,DEMO_DATASET_ID} from '../releases/2026-10-21/source/lib/dataset-display-context.mjs';
import {public9037Metadata} from '../releases/2026-10-21/source/lib/public-9037-projection.mjs';
import {PUBLIC_9037 as P} from '../releases/2026-10-21/source/lib/public-9037-contract.mjs';
import {buildHomePack,normalizeHomePack} from '../releases/2026-10-21/source/lib/home-pack.mjs';
import {createPublicHomeGroundingTestAdapter} from '../releases/2026-10-21/source/lib/public-home-grounding.server.mjs';
const digest='a'.repeat(64),scope='All countries; All business units; All levels';
const meta=()=>public9037Metadata(digest);
const succession={as_of_date:P.cutoff,small_cell_threshold:10,critical_job_profiles:5,filled_critical_positions:100,positions_with_recorded_plan:60,positions_without_recorded_plan:40,recorded_plan_coverage_pct:60,plan_coverage_suppressed:false,positions_with_ready_now:20,positions_without_ready_now:40,ready_now_plan_pct:33.3,ready_now_suppressed:false,suppression_reason:null};
function results(){return {
 'talent-acquisition':{status:'loaded',data:{as_of:P.cutoff,data_meta:meta(),summary:{hires:12},monthly:[{month:P.cutoff,hires:12}]}},
 'learning-development':{status:'loaded',data:{as_of:P.cutoff,data_meta:meta(),summary:{current_gap_skills:3},skill_pathways:[]}},
 'succession-coverage':{status:'loaded',data:{...succession,data_meta:meta()}},
 'position-modeling':{status:'loaded',data:{as_of:P.cutoff,data_meta:meta(),current:{current_positions:120,filled_positions:100,vacant_positions:20}}},
};}
test('public identity is explicit and caller labels are never retained',()=>{
 const m={...meta(),sourceLabel:'invented observed employee outcomes',unexpected:'secret'};
 const c=readPublicDisplayContext(m);assert.ok(c);assert.equal(c.publicationApproved,true);assert.equal(c.sourceLabel,undefined);assert.equal(c.unexpected,undefined);
});
for(const [field,value]of Object.entries({datasetId:DEMO_DATASET_ID,datasetToken:P.token+':3',contract:'local-app-parity-v1',publicationReceiptId:'other',cutoff:'2026-09-29',dataClass:'observed',publicationApproved:false,bundleDigest:'bad'}))test('public context rejects changed '+field,()=>assert.equal(readPublicDisplayContext({...meta(),[field]:value}),null));
test('legacy identity remains separately constrained',()=>{
 const m={...meta(),datasetId:DEMO_DATASET_ID,datasetToken:DEMO_DATASET_ID+':1',contract:'local-app-parity-v1',publicationApproved:false};
 assert.ok(readConstructedDisplayContext(m));assert.equal(readPublicDisplayContext(m),null);
 assert.equal(readConstructedDisplayContext({...m,publicationApproved:true}),null);
});
test('four public domains load, normalize stably, and retain their limitations',()=>{
 const p=buildHomePack(results(),scope);assert.deepEqual(normalizeHomePack(p),p);
 for(const id of ['R1','T2','T5','P2']){const s=p.sources.find(s=>s.id===id);assert.equal(s.status,'loaded',id);assert.equal(s.sourceContext.datasetId,P.datasetId);assert.equal(s.sourceContext.bundleDigest,digest);}
 assert.match(p.sources.find(s=>s.id==='R1').limitation,/Accepted-offer/);
 assert.match(p.sources.find(s=>s.id==='T5').limitation,/Readiness requires assessment; protected counts remain unavailable/);
 const bad=results();bad['learning-development'].data.as_of='2026-09-29';assert.equal(buildHomePack(bad,scope).sources.find(s=>s.id==='T2').status,'invalid');
 const suppressed=results();suppressed['succession-coverage'].data.ready_now_suppressed=true;assert.equal(buildHomePack(suppressed,scope).sources.find(s=>s.id==='T5').status,'invalid');
});
test('fresh server grounding binds all four public sources and rejects a changed display digest or facts',async()=>{
 const all=results(),p=buildHomePack(all,scope),hostname='people-analytics-test-ed-56dc.vercel.app';
 const binding={router:{bootstrapToken:()=>P.token,current:()=>({datasetId:P.datasetId,token:P.token,digest,generation:P.generation})},handle:async request=>Response.json(all[new URL(request.url).pathname.slice(5)].data,{headers:{'x-workforce-dataset':P.token}})};
 const verify=createPublicHomeGroundingTestAdapter({enabled:true,hostname,loadPublicBinding:()=>binding}).verify,request={datasetToken:P.token,filters:{country:'all',org:'all',level:'all'},scope,evidence:p};
 const receipt=await verify(request);assert.deepEqual(receipt.verifiedSourceIds,['R1','T2','T5','P2']);
 for(const mutate of [s=>s.sourceContext.bundleDigest='b'.repeat(64),s=>s.facts.hires=999,s=>s.sourceContext.publicationReceiptId='other']){const bad=structuredClone(request);mutate(bad.evidence.sources.find(s=>s.id==='R1'));await assert.rejects(verify(bad));}
});
