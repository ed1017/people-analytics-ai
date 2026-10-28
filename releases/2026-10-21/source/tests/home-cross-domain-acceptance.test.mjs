import test from 'node:test';import assert from 'node:assert/strict';
import {readDatasetQuestions} from '../lib/home-dataset-query.mjs';
import {readPublicHomeAggregate} from '../lib/public-home-aggregate.server.mjs';
import {standaloneAggregateQuestion} from '../lib/home-aggregate-tool.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
const digest='a'.repeat(64),identity={datasetId:P.datasetId,token:P.token,generation:P.generation,digest};
// Authored aggregate fixtures, not observations or live provider responses.
const sources=()=>({
 '/api/workforce':{as_of:P.cutoff,data_meta:public9037Metadata(digest),summary:{headcount:100,fte:90},countries:[{country_code:'CA',country_name:'Canada',headcount:60,fte:50},{country_code:'US',country_name:'United States',headcount:40,fte:40}]},
 '/api/attrition':{as_of:P.cutoff,data_meta:public9037Metadata(digest),summary:{total_exits:80},business_units:Array.from({length:8},(_,i)=>({org_code:'BU-'+i,org_name:'Group '+i,exits:10,voluntary_turnover_ytd_pct:i+1}))},
 '/api/talent-acquisition':{as_of:P.cutoff,data_meta:public9037Metadata(digest),summary:{applications:10,hires:10},business_units:[{org_code:'BU-A',org_name:'Alpha',applications:10,hires:10,application_to_hire_pct:100,avg_time_to_fill_days:33}]}
});
const part=(registryId,metric)=>({kind:'comparison',history:null,comparison:{registryId,metric,order:'descending',limit:8,scope:'company-wide',asOf:'current'}});
const workforce=part('workforce.countries','headcount'),turnover=part('attrition.business_units','voluntary_turnover_ytd_pct'),recruiting=part('recruiting.business_units','application_to_hire_pct');
function setup(change=()=>{},controller=new AbortController()){
 const data=sources(),paths=[];
 const binding={router:{current:()=>identity,bootstrapToken:()=>P.token},handle:async request=>{const path=new URL(request.url).pathname;paths.push(path);const value=structuredClone(data[path]);await change(path,value,controller);return Response.json(value,{headers:{'x-workforce-dataset':P.token}});}};
 const comparison=args=>readPublicHomeAggregate({binding,hostname:'people-analytics-test-ed-56dc.vercel.app',identity,filters:{country:'all',org:'all',level:'all'},args,signal:controller.signal,requestId:'cross-domain'});
 return {paths,run:parts=>readDatasetQuestions({parts},{comparison,signal:controller.signal})};
}
test('three-domain answer keeps every part and only legitimate charts with distinct units',async()=>{
 const h=setup(),parts=structuredClone([workforce,turnover,recruiting]),before=structuredClone(parts),r=await h.run(parts);
 assert.match(r.answer,/Part 1[\s\S]*Canada: 60 people[\s\S]*Part 2[\s\S]*Group 7: 8 percent[\s\S]*Part 3[\s\S]*applicant denominator is incomplete/);
 assert.deepEqual(h.paths,['/api/workforce','/api/attrition','/api/talent-acquisition']);assert.equal(r.charts.length,2);assert.equal(r.charts[0].unit,'people');assert.equal(r.charts[1].unit,'%');assert.equal(r.charts[1].points.length,8);
 assert.doesNotMatch(r.answer,/100 percent|100%/);assert.deepEqual(parts,before);
});
test('late recruiting provenance failure rejects earlier numerical success and makes no later read',async()=>{
 const h=setup((path,data)=>{if(path==='/api/talent-acquisition')data.data_meta.bundleDigest='b'.repeat(64);});
 let returned=false;await assert.rejects(h.run([workforce,recruiting,turnover]).then(value=>{returned=true;return value;}));
 assert.equal(returned,false);assert.deepEqual(h.paths,['/api/workforce','/api/talent-acquisition']);
});
test('cancellation during second domain cannot return accumulated charts or continue to recruiting',async()=>{
 const h=setup((path,_data,controller)=>{if(path==='/api/attrition')controller.abort();});
 await assert.rejects(h.run([workforce,turnover,recruiting]));assert.deepEqual(h.paths,['/api/workforce','/api/attrition']);
});
test('unsupported historical recruiting does not replace requested period with mean fill alternative',async()=>{
 const h=setup(),historical=part('recruiting.business_units','avg_time_to_fill_days');historical.comparison.asOf='2025-12-31';
 const r=await h.run([workforce,historical]);assert.match(r.answer,/Part 1/);assert.match(r.answer,/Part 2/);assert.match(r.answer,/requested 2025-12-31 comparison is unavailable/);assert.doesNotMatch(r.answer,/Alpha: 33/);assert.equal(r.charts.length,1);
});
test('mixed factual and planning requests cannot be mistaken for standalone aggregate completion',()=>{
 for(const q of ['Which country has most employees and create a hiring plan?','Compare turnover then recommend a retention plan','Rank recruiting time to fill and adjust our headcount plan','Which BU has highest turnover? What should we do?'])assert.equal(standaloneAggregateQuestion(q),false,q);
 for(const q of ['Which country has most employees?','Compare business units by voluntary turnover','Rank business units by average time to fill'])assert.equal(standaloneAggregateQuestion(q),true,q);
});
