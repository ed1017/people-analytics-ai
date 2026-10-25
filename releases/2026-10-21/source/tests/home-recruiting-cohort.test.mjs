import test from 'node:test';
import assert from 'node:assert/strict';
import {buildHomePack,normalizeHomePack} from '../lib/home-pack.mjs';
import {queryAggregate} from '../lib/home-aggregate-registry.mjs';
import {public9037Metadata} from '../lib/public-9037-projection.mjs';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
const rates=['application_to_interview_pct','interview_to_offer_pct','offer_to_hire_pct','application_to_hire_pct','offer_acceptance_pct'];
const data=()=>({as_of:P.cutoff,data_meta:public9037Metadata('a'.repeat(64)),summary:{applications:10,hires:10,median_time_to_fill_days:33,...Object.fromEntries(rates.map(k=>[k,100]))},monthly:[{month:'2026-09-01',applications:10,hires:10}],business_units:[{org_code:'A',org_name:'Alpha',applications:10,hires:10,application_to_hire_pct:100}],sources:[{source_code:'S',source_name:'Source',applications:10,hires:10,application_to_hire_pct:100}]});
const pack=d=>buildHomePack({'talent-acquisition':{status:'loaded',data:d}},'All countries; All business units; All levels');
test('successful-only public recruiting rates are unavailable while counts and timing retain cohort meaning',()=>{
 const d=data(),before=JSON.stringify(d),p=pack(d),r=p.sources.find(s=>s.id==='R1');
 for(const k of rates)assert.equal(r.facts[k],null,k);
 assert.equal(r.facts.applications,10);assert.equal(r.facts.hires,10);assert.equal(r.facts.median_time_to_fill_days,33);assert.equal(r.facts.rows[0].hires,10);
 assert.match(r.limitation,/unsuccessful applications are absent/);assert.match(r.limitation,/do not derive/);
 assert.deepEqual(normalizeHomePack(p),p);assert.equal(JSON.stringify(d),before);
 const injected=structuredClone(p);injected.sources.find(s=>s.id==='R1').facts.application_to_hire_pct=100;
 assert.equal(normalizeHomePack(injected).sources.find(s=>s.id==='R1').facts.application_to_hire_pct,null);
});
test('other recruiting datasets retain supplied conversion and malformed public provenance fails closed',()=>{
 const d=data();delete d.data_meta;
 assert.equal(pack(d).sources.find(s=>s.id==='R1').facts.application_to_hire_pct,100);
 const bad=data();bad.data_meta.bundleDigest='invalid';assert.equal(pack(bad).sources.find(s=>s.id==='R1').status,'invalid');
});
for(const registryId of ['recruiting.business_units','recruiting.sources'])test(registryId+' rejects successful-only conversion ranking but retains recorded counts',()=>{
 const d=data(),before=JSON.stringify(d),query=metric=>({registryId,metric,order:'descending',limit:1});
 assert.throws(()=>queryAggregate(query('application_to_hire_pct'),d),/Funnel conversion unavailable/);
 const counts=queryAggregate(query('hires'),d);assert.equal(counts.rows[0].value,10);assert.match(counts.limitations.join(' '),/do not derive/);
 assert.equal(JSON.stringify(d),before);
 delete d.data_meta;assert.equal(queryAggregate(query('application_to_hire_pct'),d).rows[0].value,100);
});
