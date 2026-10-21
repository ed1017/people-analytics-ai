import test from 'node:test';import assert from 'node:assert/strict';
import {buildHomePack,normalizeHomePack} from '../releases/2026-10-21/source/lib/home-pack.mjs';
import {homeSurveyGroups} from '../releases/2026-10-21/source/lib/home-survey-groups.mjs';
import {actionEvidenceCatalog} from '../releases/2026-10-21/source/lib/home-action-proposal.ts';
import {homeAnswerScopeViolation} from '../releases/2026-10-21/source/lib/home-answer-scope.ts';
import {createPublicHomeGroundingTestAdapter} from '../releases/2026-10-21/source/lib/public-home-grounding.server.mjs';
import {public9037Metadata} from '../releases/2026-10-21/source/lib/public-9037-projection.mjs';
import {PUBLIC_9037 as P} from '../releases/2026-10-21/source/lib/public-9037-contract.mjs';
const digest='a'.repeat(64),hostname='people-analytics-test-ed-56dc.vercel.app',scope='All countries; All business units; All levels',filters={country:'all',org:'all',level:'all'};
function data(){return {as_of:P.cutoff,data_meta:public9037Metadata(digest),summary:{engagement_respondents:80,engagement_favorable_pct:40.4},business_units:Array.from({length:8},(_,i)=>({org_code:'BU-'+i,org_name:'Group '+i,respondents:10,avg_score:3,favorable_pct:50-i})),engagement_trend:[{close_date:P.cutoff,launch_date:P.cutoff,respondents:80,favorable_pct:40.4}]};}
const pack=(d,q='')=>buildHomePack({'survey-sentiment':{status:'loaded',data:d}},scope,q);
const comparison=p=>p.sources.find(s=>s.id==='S1').facts.businessUnitComparison;
for(const q of ['which group has the lowest sentiment?','Which business unit has the highest engagement favorability?','Compare sentiment across business units','Which demographic group is least happy?','Which team had lowest sentiment last year?'])test(q+' retains complete BU evidence without inventing other scope',()=>{const d=data(),p=pack(d,q),c=comparison(p);assert.equal(c.rows.length,8);assert.equal(c.asOf,P.cutoff);assert.equal(c.respondents,80);assert.match(c.scope,/Not teams or demographics/);assert.match(c.metric,/not text sentiment or eNPS/);assert.equal(c.rows.reduce((a,b)=>a.favorable_pct<b.favorable_pct?a:b).org_code,'BU-7');assert.equal(c.rows.reduce((a,b)=>a.favorable_pct>b.favorable_pct?a:b).org_code,'BU-0');assert.equal(p.sources.find(s=>s.id==='S1').facts.engagement_favorable_pct,40.4);assert.deepEqual(normalizeHomePack(p),p);});
for(const [name,change]of [['missing row',d=>d.business_units.pop()],['suppressed row',d=>d.business_units[0].suppressed=true],['duplicate',d=>d.business_units[1].org_code='BU-0'],['null score',d=>d.business_units[0].favorable_pct=null],['bad date',d=>d.as_of='2026-02-30'],['bad count',d=>d.business_units[0].respondents=0],['bad percent',d=>d.business_units[0].favorable_pct=101]])test(name+' excludes comparison rather than ranking a sample',()=>{const d=data();change(d);assert.equal(homeSurveyGroups(d),null);assert.equal(comparison(pack(d)),null);});
test('unknown suppression flags are not manufactured',()=>{const c=homeSurveyGroups(data());assert.ok(c.rows.every(r=>!Object.hasOwn(r,'suppressed')));});
test('all eligible BU citations carry comparison date and permit only supplied group scope',()=>{
 const p=pack(data()),catalog=actionEvidenceCatalog(p).filter(c=>c.id.startsWith('S1:businessUnit:'));
 assert.equal(catalog.length,8);assert.ok(catalog.every(c=>c.date===P.cutoff&&c.scope.includes('Not teams or demographics')));
 assert.equal(homeAnswerScopeViolation('Group 7 has 43% favorable among 10 respondents [S1:businessUnit:7].',p),false);
 assert.equal(homeAnswerScopeViolation('Group 7 has 43% favorable and Group 0 has 50% favorable [S1:businessUnit:7, S1:businessUnit:0].',p),false);
 assert.equal(homeAnswerScopeViolation('Group 7 has 43% favorable among 10 respondents [S1:businessUnit:99].',p),true);
 assert.equal(homeAnswerScopeViolation('Canada has 43% favorable among 10 respondents [S1].',p),true);
 assert.equal(homeAnswerScopeViolation('Group 7 has 43% favorable among 10 respondents [S1:businessUnit:1].',p),true);
 assert.equal(homeAnswerScopeViolation('Group 7 has 43% favorable among 10 respondents [S1:summary].',p),true);
 assert.equal(homeAnswerScopeViolation('Group 7 has 12% turnover [S1].',p),true);
 assert.equal(homeAnswerScopeViolation('Group 7 has 43% favorable in the pulse survey [S1].',p),true);
 const missing=data();missing.business_units.pop();const unavailable=pack(missing);assert.equal(actionEvidenceCatalog(unavailable).some(c=>c.id.startsWith('S1:businessUnit:')),false);
});
test('fresh public grounding validates complete group fields and rejects changed rows/date',async()=>{const d=data(),p=pack(d),binding={router:{bootstrapToken:()=>P.token,current:()=>({datasetId:P.datasetId,token:P.token,digest,generation:2})},handle:async()=>Response.json(d,{headers:{'x-workforce-dataset':P.token}})},verify=createPublicHomeGroundingTestAdapter({enabled:true,hostname,loadPublicBinding:()=>binding}).verify;
 const request={datasetToken:P.token,filters,scope,evidence:p};await verify(request);
 for(const mutate of [c=>c.rows[7].favorable_pct=99,c=>c.rows.pop(),c=>c.asOf='2026-06-30',c=>c.rows[0].respondents=11]){const bad=structuredClone(request);mutate(comparison(bad.evidence));await assert.rejects(verify(bad));}
});
import fs from 'node:fs';import vm from 'node:vm';import{createRequire}from'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
test('legacy Home reader preserves source suppression before comparison validation',async()=>{
 const d=data();d.business_units[0].suppressed=true;
 const db={survey_listening_current_summary:{as_of:P.cutoff,engagement_respondents:80},survey_listening_engagement_trend:[],survey_listening_dimension_summary:[],survey_listening_business_unit_summary:d.business_units,survey_listening_exit_reason_summary:[]};
 const query=table=>{const q={data:db[table],error:null,select:()=>q,single:()=>q,order:()=>q};return q;};
 const modules={'./dataset-runtime':{withDatasetRequest:(_r,run)=>run()},'next/server':{NextResponse:{json:v=>Response.json(v)}},'./data-api-error':{dataApiErrorResponse:(_k,e)=>{throw e;}},'./supabase-server':{supabaseServer:{from:query}},'./numeric-contract':{nullableNumber:v=>v??null},'./exit-enps':{localExitEnpsEnabled:()=>false,surveyDimensionsForRetrieval:v=>v}};
 const code=ts.transpileModule(fs.readFileSync(new URL('../releases/2026-10-21/source/lib/survey-sentiment-reader.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(code,{exports,require:id=>{assert.ok(modules[id],id);return modules[id];},Response});
 const result=await(await exports.readHomeSurveyEvidence(new Request('http://localhost/api/survey-sentiment'))).json();assert.equal(result.business_units.length,8);assert.equal(result.business_units[0].suppressed,true);assert.equal(homeSurveyGroups(result),null);
});
test('oversized complete comparison is omitted whole while company summary remains',()=>{const d=data();d.summary.engagement_respondents=400;d.business_units=Array.from({length:40},(_,i)=>({org_code:'BU-'+i,org_name:'x'.repeat(160),respondents:10,avg_score:3,favorable_pct:40}));const s=pack(d).sources.find(s=>s.id==='S1');assert.equal(s.status,'loaded');assert.equal(s.facts.businessUnitComparison,null);assert.equal(s.facts.engagement_respondents,400);});

