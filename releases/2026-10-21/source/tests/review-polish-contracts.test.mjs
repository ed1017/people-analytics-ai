import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHomePack} from '../lib/home-pack.mjs';
import {public9037RequestAllowed} from '../lib/public-9037-options.mjs';
import {mainNavigation} from '../lib/workspace-navigation.ts';
import {getAppPageMetadata} from '../lib/app-navigation.ts';
test('repeated workforce normalization does not stack scope prefixes or change selected scope',()=>{
 const raw={workforceScope:'Selected workforce snapshot: Selected workforce snapshot: US; BU-TECH; L8',sources:[]};
 let p=normalizeHomePack(raw);for(let i=0;i<5;i++)p=normalizeHomePack(p);
 assert.equal(p.sources.find(s=>s.id==='W1').scope,'Selected workforce snapshot: US; BU-TECH; L8');
 assert.equal(p.workforceScope,raw.workforceScope);
});
test('About is a public read-only document, not a broader API or route permission',()=>{
 const options={hostname:'people-analytics-test-ed-56dc.vercel.app',production:true};
 for(const method of ['GET','HEAD'])assert.equal(public9037RequestAllowed(options,new Request('https://www.ed-ai.app/about',{method})),true);
 for(const [url,method] of [['https://www.ed-ai.app/about','POST'],['https://www.ed-ai.app/about/private','GET'],['https://www.ed-ai.app/api/about','GET'],['https://other.example/about','GET']])assert.equal(public9037RequestAllowed(options,new Request(url,{method})),false);
});
test('main destination labels agree with their page headings',()=>{
 for(const item of mainNavigation)assert.equal(item.label,getAppPageMetadata(item.page).label);
});

test('absent, null and empty scopes remain explicitly unavailable',()=>{
 for(const value of [undefined,null,''])assert.equal(normalizeHomePack({workforceScope:value,sources:[]}).sources.find(s=>s.id==='W1').scope,'Selected workforce snapshot: scope unavailable');
});
