import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCompanyBinding} from '../lib/public-fixture/company-binding.mjs';
import {createCompanyDashboard} from '../lib/public-fixture/company-dashboard.server.mjs';
import {readCompanyDashboard,companyHeadcountAnswer} from '../lib/public-fixture/company-dashboard.mjs';
import {createCompanyHomeHandler} from '../tools/company-home/handler.mjs';
const read=n=>fs.readFileSync(new URL(`./fixtures/company-import/${n}`,import.meta.url),'utf8').replaceAll('\r\n','\n');
const binding=createCompanyBinding({configText:read('lantern-config.json'),rowsText:read('lantern-rows.json'),expected:JSON.parse(read('lantern-binding-pins.json'))});
const dashboard=createCompanyDashboard(binding),parse=value=>readCompanyDashboard(value,dashboard.token,binding.identity);
test('partial dashboard has only supported metrics and matches exact company snapshot',()=>{
 const d=parse(dashboard.value);assert.deepEqual(d.overview,{snapshot_date:'2026-09-30',headcount:9,fte:7.75});assert.equal(d.trend[0].headcount,7);assert.equal('labor_cost_usd' in d.overview,false);assert.equal('voluntary_turnover_ytd_pct' in d.overview,false);
 d.overview.headcount=99;assert.equal(dashboard.value.overview.headcount,9);
});
test('unknown metrics missing values mismatched identity dates scope and stale tokens reject',()=>{
 for(const edit of [d=>d.overview.labor_cost_usd=0,d=>d.overview.headcount=null,d=>d.trend[1].headcount=8,d=>d.trend.reverse(),d=>d.companyKey='another',d=>d.asOf='2026-08-31',d=>d.scope='team',d=>d.capabilities.push('cost'),d=>d.datasetToken='legacy-v1:0']){const d=structuredClone(dashboard.value);edit(d);assert.throws(()=>parse(d));}
 assert.throws(()=>readCompanyDashboard(dashboard.value,'invented-company-'+'0'.repeat(64)+':1',binding.identity));
});
test('known zero passes without implying missing fields are zero',()=>{
 const d=structuredClone(dashboard.value);for(const p of [d.overview,...d.trend]){p.headcount=0;p.fte=0;}
 assert.equal(parse(d).overview.headcount,0);assert.equal(companyHeadcountAnswer(d,'What is our FTE?').supported,true);
});
test('deterministic supported questions explain dates and never answer unsupported scopes',()=>{
 for(const q of ['How has our headcount changed?','How did our workforce change?','Show recorded headcount history','What is our FTE?']){const r=companyHeadcountAnswer(dashboard.value,q);assert.equal(r.supported,true);assert.match(r.text,/2026-09-30/);assert.match(r.text,/\+2 people/);}
 for(const q of ['What was turnover last year?','Headcount in the US','How has our headcount changed in 2025?','Why did headcount change?','What are our costs?','Forecast workforce next year'])assert.equal(companyHeadcountAnswer(dashboard.value,q).supported,false);
});
test('actual Request handler denies external domains writes scopes and full dashboard fallback',async()=>{
 const handle=createCompanyHomeHandler(dashboard),req=(path,options={})=>new Request('http://127.0.0.1:3098'+path,{headers:{'x-workforce-dataset':dashboard.token},...options});
 const r=handle(req('/api/company-dashboard'));assert.equal(r.status,200);assert.deepEqual(await r.json(),dashboard.value);
 assert.equal(handle(req('/api/company-dashboard',{headers:{'x-workforce-dataset':'old'}})).status,409);
 assert.equal(handle(req('/api/company-dashboard?org=OPS')).status,400);
 assert.equal(handle(req('/api/dashboard')).status,503);
 assert.equal(handle(req('/api/chat',{method:'POST'})).status,405);
 assert.equal(handle(req('/api/company-dashboard'),{VERCEL:'1'}).status,403);
 assert.equal(handle(new Request('https://example.invalid/api/company-dashboard')).status,403);
 assert.equal(handle(req('/?page=compensation')).status,404);
 assert.equal(handle(req('/')),null);
 assert.deepEqual((await handle(req('/api/public-ai-capabilities')).json()).routes,[]);
});
