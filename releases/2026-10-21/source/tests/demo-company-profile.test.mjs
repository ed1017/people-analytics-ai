import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {demoCompanyProfile} from '../lib/demo-company-profile.ts';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
import {loadPublic9037Binding} from '../lib/public-9037.server.mjs';

test('company profile matches the complete released country and unit populations',{skip:!existsSync(new URL('../.private-9037/integrity-manifest.json',import.meta.url))},async()=>{
 const profile=demoCompanyProfile(P.token,P.cutoff);assert.ok(profile);assert.equal(profile.name,'Ed Inc.');
 const binding=await loadPublic9037Binding({hostname:'www.ed-ai.app',production:true});
 const response=await binding.handle(new Request('https://www.ed-ai.app/api/workforce'));assert.equal(response.status,200);const data=await response.json();
 const countries=data.countries,businessUnits=data.business_units;
 assert.ok(Array.isArray(countries));assert.ok(Array.isArray(businessUnits));
 assert.deepEqual(countries.map(row=>row.country_code).sort(),[...profile.countries].sort());
 assert.equal(countries.reduce((sum,row)=>sum+row.headcount,0),profile.people);
 assert.deepEqual(businessUnits.map(row=>row.org_code).sort(),[...profile.businessUnits].sort());
 assert.ok(countries.every(row=>row.as_of===profile.asOf&&row.headcount>0));
 assert.equal(data.trend[0].snapshot_date,profile.historyStart);
 assert.equal(data.trend.length,33);
 assert.equal(profile.refreshPolicy,'published-version');
});
test('missing, prior, future or wrong-date dataset cannot acquire this profile',()=>{
 for(const token of [undefined,null,'legacy-v1:0','workforce-demo-9037-public-aggregates-v4:6','other:5'])assert.equal(demoCompanyProfile(token,P.cutoff),null);
 for(const date of [undefined,null,'2026-08-31','2027-09-30'])assert.equal(demoCompanyProfile(P.token,date),null);
});

test('Company describes its actual business units and distinguishes history from refreshing',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../components/home-company-intro.tsx',import.meta.url),'utf8');
 assert.match(source,/>Company<\/h2>/);
 for(const phrase of ['consulting','client operations','managed services','technology','digital services','data and AI','sales','corporate services'])assert.ok(source.includes(phrase));
 assert.match(source,/monthly headcount history from January 2024/);
 assert.doesNotMatch(source,/Business profile|Data and updates/);
 assert.equal((source.match(/text-sm italic leading-snug/g)||[]).length,3);
 assert.match(source,/<h2 className="font-semibold not-italic"/);
 assert.doesNotMatch(source,/mt-3|leading-relaxed/);
 assert.match(source,/fictional global business/);
 assert.match(source,/Data updates arrive as new releases/);
 assert.equal((source.match(/September 30, 2026/g)||[]).length,1);
 assert.doesNotMatch(source,/text-xs/);
 assert.match(source,/refreshing the page keeps the same snapshot/);
 assert.doesNotMatch(source,/mid-sized|updated daily|refreshed monthly/i);
});
