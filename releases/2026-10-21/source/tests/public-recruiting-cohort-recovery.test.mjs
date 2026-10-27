import test from 'node:test';
import assert from 'node:assert/strict';
import {readPublicHomeAggregate} from '../lib/public-home-aggregate.server.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
const digest='a'.repeat(64),identity={datasetId:P.datasetId,token:P.token,generation:P.generation,digest};
const data=()=>({as_of:P.cutoff,data_meta:public9037Metadata(digest),summary:{applications:10,hires:10},business_units:[{org_code:'A',org_name:'Alpha',applications:10,hires:10,application_to_hire_pct:100,avg_time_to_fill_days:33}],sources:[{source_code:'S',source_name:'Source',applications:10,hires:10,application_to_hire_pct:100}]});
async function run(registryId,metric='application_to_hire_pct',d=data(),filters={country:'all',org:'all',level:'all'}){
 return readPublicHomeAggregate({binding:{router:{current:()=>identity,bootstrapToken:()=>P.token},handle:async request=>{assert.equal(new URL(request.url).pathname,'/api/talent-acquisition');return Response.json(d,{headers:{'x-workforce-dataset':P.token}});}},hostname:'people-analytics-test-ed-56dc.vercel.app',identity,filters,args:{registryId,metric,order:'descending',limit:1,scope:'company-wide',asOf:'current'},signal:new AbortController().signal});
}
for(const id of ['recruiting.business_units','recruiting.sources'])test(id+' service explains absent full applicant denominator and gives supported next steps',async()=>{
 const r=await run(id);assert.match(r.answer,/Application-to-hire conversion is unavailable/);assert.match(r.answer,/applicant denominator is incomplete/);assert.match(r.answer,/recorded accepted offers/);assert.match(r.answer,/mean time to fill/);assert.doesNotMatch(r.answer,/100|Specify the measure/);assert.equal(r.chart,undefined);
 const counts=await run(id,'hires');assert.match(counts.answer,/10 accepted offers/);assert.match(counts.answer,/Successful-hire records only; funnel conversion unavailable/);
});
test('suggested mean time-to-fill alternative works without changing metric semantics',async()=>{
 const r=await run('recruiting.business_units','avg_time_to_fill_days');assert.match(r.answer,/33 days/);assert.match(r.answer,/average completed fill duration/);
});
test('cohort recovery does not replace source identity, scope or unrelated validation failures',async()=>{
 const d=data();d.data_meta.bundleDigest='b'.repeat(64);await assert.rejects(run('recruiting.sources','application_to_hire_pct',d));
 const scoped=await run('recruiting.sources','application_to_hire_pct',data(),{country:'US',org:'all',level:'all'});assert.match(scoped.answer,/Clear the workforce filters/);assert.doesNotMatch(scoped.answer,/full applicant denominator/);
 const suppressed=data();suppressed.summary.suppressed=true;const r=await run('recruiting.sources','application_to_hire_pct',suppressed);assert.match(r.answer,/cannot be verified/);assert.doesNotMatch(r.answer,/full applicant denominator/);
});
