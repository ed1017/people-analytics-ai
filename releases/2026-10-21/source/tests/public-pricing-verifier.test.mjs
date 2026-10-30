import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PUBLIC_PRICING_SOURCES as sources,PUBLIC_PRICING_MAX_BYTES,parsePublicPlannerPricing,verifyPublicPlannerPricing} from '../lib/public-pricing-verifier.server.mjs';
const documents=Object.fromEntries(sources.map(s=>[s.id,JSON.parse(fs.readFileSync(new URL(`./fixtures/public-pricing/${s.id}.md.json`,import.meta.url),'utf8'))]));
const response=(url,body,init={})=>{const r=new Response(body,{status:200,headers:{'content-type':'text/markdown; charset=utf-8'},...init});Object.defineProperty(r,'url',{value:url});return r;};
const fakeFetch=async url=>response(url,documents[sources.find(s=>s.url===url).id]);
const now=()=>Date.parse('2026-10-27T00:00:00.000Z');

test('captured official terms verify all short/long price columns and cache/context contract',()=>{
 const result=parsePublicPlannerPricing(documents);
 assert.equal(result.digest,'ea1e9ef799beccc24cfe6b1a2e5720d1bcbef4579a16486768ea27385482a1b3');
 assert.equal(result.terms.models['gpt-6.1-sol'].inputMicroUsdPerMillion,4000000);
 assert.equal(result.terms.models['gpt-6.1-sol'].outputMicroUsdPerMillion,15000000);
 assert.equal(result.terms.models['gpt-5.6-luna'].inputMicroUsdPerMillion,400000);
 assert.equal(result.terms.models['gpt-5.6-luna'].outputMicroUsdPerMillion,1800000);
 assert.equal(result.terms.maximumInputTokens,922000);
 assert.equal(result.terms.longContextAboveInputTokens,272000);
 assert.equal(result.terms.cacheBreakpoints,0);
 assert.equal(result.terms.cacheWriteCharge,false);
 assert.ok(Object.isFrozen(result.terms.models['gpt-6.1-sol'].standardPricing));
 assert.equal(result.sources.length,4);
});
test('line-ending normalization does not alter verified semantic digest',()=>{
 const crlf=Object.fromEntries(Object.entries(documents).map(([key,value])=>[key,value.replace(/\r?\n/g,'\r\n')]));
 assert.deepEqual(parsePublicPlannerPricing(crlf),parsePublicPlannerPricing(documents));
});
test('changed/missing/ambiguous prices, tiers, units, models and cache rule fail closed',()=>{
 const cases=[
  ['pricing',s=>s.replace('| gpt-6.1-sol | $2.00 |','| gpt-6.1-sol | $2.01 |')],
  ['pricing',s=>s.replace('$4.00 | $15.00 | $0.20','$4.00 | $16.00 | $0.20')],
  ['pricing',s=>s.replace('### Standard pricing data','### Unknown pricing data')],
  ['pricing',s=>s.replace('Prices per 1M tokens.','Prices per 1K tokens.')],
  ['pricing',s=>s.replace('Short context: ≤272K','Short context: ≤128K')],
  ['pricing',s=>s.replace('| gpt-6.1-sol | $2.00 |', '| gpt-6.1-sol | $2.00 | $10.00 | $0.10 | $2.50 | $5.00 | $4.00 | $15.00 | $0.20 | $5.00 | $10.00 |\n| gpt-6.1-sol | $2.00 |')],
  ['sol',s=>s.replace('1,050,000 context window','2,000,000 context window')],
  ['luna',s=>s.replace('Maximum input tokens: 922,000','Maximum input tokens: 128,000')],
  ['luna',s=>s.replace('Model ID: `gpt-5.6-luna`','Model ID: `other`')],
  ['cache',s=>s.replace('does not use prompt caching or create cache writes','creates cache writes')],
  ['cache',s=>s+'\nAdditional no-breakpoint surcharge applies.\n'],
 ];
 for(const [key,change] of cases)assert.throws(()=>parsePublicPlannerPricing({...documents,[key]:change(documents[key])}),/pricing_/);
 assert.throws(()=>parsePublicPlannerPricing({...documents,other:'extra'}),/pricing_terms_unverified/);
 assert.throws(()=>parsePublicPlannerPricing({...documents,sol:''}),/pricing_terms_unverified/);
});
test('each approved table price cell is binding, including both cache-write tiers',()=>{
 for(const model of ['gpt-6.1-sol','gpt-5.6-luna']){
  const line=documents.pricing.split('\n').find(l=>l.startsWith(`| ${model} |`));
  const cells=line.split('|');
  for(let i=2;i<=11;i++){
   const changed=[...cells];changed[i]=' $999.00 ';
   assert.throws(()=>parsePublicPlannerPricing({...documents,pricing:documents.pricing.replace(line,changed.join('|'))}),/pricing_terms_unverified/);
  }
 }
});
test('fetch only uses fixed official URLs without redirects, credentials or cache',async()=>{
 const calls=[];
 const result=await verifyPublicPlannerPricing({now,fetchImpl:async(url,init)=>{calls.push(url);assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');assert.equal(init.cache,'no-store');assert.equal(init.method,'GET');assert.ok(init.signal instanceof AbortSignal);assert.deepEqual(Object.keys(init.headers),['Accept']);return fakeFetch(url);}});
 assert.deepEqual(calls,sources.map(s=>s.url));assert.equal(result.verified,true);assert.equal(result.verifiedAt,'2026-10-27T00:00:00.000Z');
});
test('response error, changed URL, HTML, redirect, source rejection and oversize fail closed',async()=>{
 const cases=[
  url=>response(url,'error',{status:503}),
  ()=>response('https://example.com/','text'),
  url=>response(url,'<html>error</html>',{headers:{'content-type':'text/html'}}),
  url=>{const r=response(url,'text');Object.defineProperty(r,'redirected',{value:true});return r;},
  url=>response(url,'text',{headers:{'content-type':'text/plain','content-length':String(PUBLIC_PRICING_MAX_BYTES+1)}}),
  url=>response(url,'x'.repeat(PUBLIC_PRICING_MAX_BYTES+1)),
  ()=>{throw Error('network');},
 ];
 for(const action of cases)await assert.rejects(verifyPublicPlannerPricing({now,fetchImpl:async url=>action(url)}),/pricing_source_/);
});
test('timeout bounds a transport that ignores the abort signal',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const pending=verifyPublicPlannerPricing({now,fetchImpl:()=>new Promise(()=>{})});
 const assertion=assert.rejects(pending,/pricing_source_timeout/);
 t.mock.timers.tick(15000);await assertion;
});


test('reviewed API wording retains rates; removed qualifiers and subscription edits still fail closed',()=>{
 const verified=parsePublicPlannerPricing(documents);
 assert.equal(verified.digest,'ea1e9ef799beccc24cfe6b1a2e5720d1bcbef4579a16486768ea27385482a1b3');
 assert.throws(()=>parsePublicPlannerPricing({...documents,sol:documents.sol.replace('- API prompts with more than 272K','- Prompts with more than 272K')}),/pricing_terms_unverified/);
 assert.throws(()=>parsePublicPlannerPricing({...documents,sol:documents.sol.replace('Usage drawn from your subscription has no long-context surcharge.','API requests have no long-context surcharge.')}),/pricing_document_changed/);
});
