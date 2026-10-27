import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {createPricingRenewalHandler,PRICING_RENEWAL_PATH,APPROVED_PRICING_DIGEST} from '../lib/public-pricing-renewal.server.mjs';
import {parsePublicPlannerPricing,PUBLIC_PRICING_SOURCES} from '../lib/public-pricing-verifier.server.mjs';
const documents=Object.fromEntries(PUBLIC_PRICING_SOURCES.map(s=>[s.id,JSON.parse(fs.readFileSync(new URL(`./fixtures/public-pricing/${s.id}.md.json`,import.meta.url),'utf8'))]));
const verifiedAt='2026-10-27T00:00:00.000Z',now=()=>Date.parse(verifiedAt),secret='test-scheduler-secret-not-a-real-key-12345';
const proof=()=>({verified:true,verifiedAt,...parsePublicPlannerPricing(documents)});
const request=(init={},url=`https://www.ed-ai.app${PRICING_RENEWAL_PATH}`)=>new Request(url,{headers:{authorization:`Bearer ${secret}`},...init});
const receipt=(p,replayed=false)=>({recorded:true,replayed,version:p.eventId,verifiedAt:p.observedAt,validUntil:new Date(Date.parse(p.observedAt)+86400000).toISOString()});
function harness(options={}){let verifies=0,renewals=[];const handle=createPricingRenewalHandler({production:true,cronSecret:secret,now,verify:async()=>{verifies++;return proof();},renew:async(p,signal)=>{assert.ok(signal instanceof AbortSignal);renewals.push(p);return receipt(p);},...options});return {handle,renewals,get verifies(){return verifies;}};}

test('only exact authenticated production GET reaches verification or renewal',async()=>{
 const cases=[request({method:'POST'}),request({method:'HEAD'}),request({headers:{}}),request({headers:{authorization:`bearer ${secret}`}}),request({headers:{authorization:`Bearer ${secret}x`}}),request({},`https://preview.vercel.app${PRICING_RENEWAL_PATH}`),request({},`https://www.ed-ai.app${PRICING_RENEWAL_PATH}?renew=true`),request({},`http://www.ed-ai.app${PRICING_RENEWAL_PATH}`),request({},`https://www.ed-ai.app:444${PRICING_RENEWAL_PATH}`),request({},'https://www.ed-ai.app/api/other')];
 for(const r of cases){const h=harness();const response=await h.handle(r);assert.ok([401,404,405].includes(response.status));assert.equal(h.verifies,0);assert.equal(h.renewals.length,0);assert.equal(response.headers.get('cache-control'),'no-store');}
 for(const options of [{production:false},{cronSecret:undefined},{cronSecret:''},{cronSecret:'short'}]){const h=harness(options);assert.notEqual((await h.handle(request())).status,200);assert.equal(h.verifies,0);}
});

test('complete unchanged official proof produces deterministic event and only a 24-hour receipt',async()=>{
 for(const host of ['www.ed-ai.app','ed-ai.app']){const h=harness();const response=await h.handle(request({},`https://${host}${PRICING_RENEWAL_PATH}`));assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,status:'renewed',validUntil:'2026-10-28T00:00:00.000Z'});assert.equal(h.verifies,1);assert.equal(h.renewals.length,1);const p=h.renewals[0];assert.deepEqual(Object.keys(p),['eventId','pricingDigest','observedAt','sources','matches']);assert.equal(p.eventId,createHash('sha256').update(`${APPROVED_PRICING_DIGEST}:${verifiedAt}`).digest('hex'));assert.equal(p.matches,true);assert.equal(p.pricingDigest,APPROVED_PRICING_DIGEST);assert.equal(p.observedAt,verifiedAt);assert.deepEqual(p.sources,proof().sources);}
});

test('only the exact configured production deployment host is added, never an arbitrary project wildcard',async()=>{
 const deploymentHostname='people-analytics-fixed123-ed-56dc.vercel.app';
 const h=harness({deploymentHostname});assert.equal((await h.handle(request({},`https://${deploymentHostname}${PRICING_RENEWAL_PATH}`))).status,200);
 for(const hostname of ['people-analytics-other123-ed-56dc.vercel.app','other-project-fixed123-ed-56dc.vercel.app','people-analytics-fixed123-ed-56dc.vercel.app.evil.test']){const denied=harness({deploymentHostname});assert.equal((await denied.handle(request({},`https://${hostname}${PRICING_RENEWAL_PATH}`))).status,404);assert.equal(denied.verifies,0);}
 for(const badConfig of ['attacker.example','*.vercel.app','https://'+deploymentHostname]){const denied=harness({deploymentHostname:badConfig});assert.equal((await denied.handle(request({},`https://${deploymentHostname}${PRICING_RENEWAL_PATH}`))).status,404);assert.equal(denied.verifies,0);}
 const preview=harness({production:false,deploymentHostname});assert.equal((await preview.handle(request({},`https://${deploymentHostname}${PRICING_RENEWAL_PATH}`))).status,404);assert.equal(preview.verifies,0);
});

test('changed, missing, incomplete, stale or future proofs never reach RPC',async()=>{
 for(const mutate of [p=>({...p,verified:false}),p=>({...p,digest:'0'.repeat(64)}),p=>({...p,terms:{}}),p=>({...p,sources:p.sources.slice(1)}),p=>({...p,sources:p.sources.map((s,i)=>i? s:{...s,sha256:'0'.repeat(64)})}),p=>({...p,verifiedAt:'2026-10-26T23:59:59.000Z'}),p=>({...p,verifiedAt:'2026-10-27T00:00:01.000Z'}),()=>null]){const h=harness({verify:async()=>mutate(proof())});assert.equal((await h.handle(request())).status,503);assert.equal(h.renewals.length,0);}
});

test('identical attestation replays one event without lengthening its expiry',async()=>{
 const records=new Map();let calls=0;const h=harness({renew:async p=>{calls++;if(records.has(p.eventId))return {...records.get(p.eventId),replayed:true};const result=receipt(p);records.set(p.eventId,result);return result;}});
 const first=await (await h.handle(request())).json(),second=await(await h.handle(request())).json();assert.equal(calls,2);assert.equal(records.size,1);assert.equal(first.status,'renewed');assert.equal(second.status,'already-recorded');assert.equal(first.validUntil,second.validUntil);
});

test('verification errors/timeouts abort safely without renewal or leaking arbitrary messages',async()=>{
 const h=harness({verify:async()=>{throw Error('SECRET_PROVIDER_OR_CREDENTIAL');}});const result=await h.handle(request());assert.equal(result.status,503);assert.doesNotMatch(await result.text(),/SECRET/);assert.equal(h.renewals.length,0);
 let signal;const slow=harness({timeoutMs:10,verify:s=>{signal=s;return new Promise(()=>{});}});assert.equal((await slow.handle(request())).status,503);assert.ok(signal.aborted);assert.equal(slow.renewals.length,0);
 const controller=new AbortController();controller.abort();const cancelled=harness();assert.equal((await cancelled.handle(request({signal:controller.signal}))).status,503);assert.equal(cancelled.verifies,0);
});

test('uncertain renewal or invalid receipt fails safely with no automatic retries',async()=>{
 for(const result of [null,{recorded:false},{...receipt({eventId:'wrong',observedAt:verifiedAt})},{...receipt({eventId:createHash('sha256').update(`${APPROVED_PRICING_DIGEST}:${verifiedAt}`).digest('hex'),observedAt:verifiedAt}),validUntil:'2026-10-29T00:00:00.000Z'}]){let calls=0;const h=harness({renew:async()=>{calls++;return result;}});const response=await h.handle(request());assert.equal(response.status,503);assert.match((await response.json()).error,/outcome unconfirmed/);assert.equal(calls,1);}
 let calls=0;const h=harness({timeoutMs:10,renew:async()=>{calls++;return new Promise(()=>{});}});assert.match((await(await h.handle(request())).json()).error,/outcome unconfirmed/);assert.equal(calls,1);
});

test('actual route keeps credentials server-side and refuses HEAD, preview and reused secrets before I/O',async()=>{
 const source=fs.readFileSync(new URL('../app/api/internal/pricing-renewal/route.ts',import.meta.url),'utf8');
 const env={VERCEL_ENV:'production',VERCEL_URL:'people-analytics-fixed123-ed-56dc.vercel.app',CRON_SECRET:secret,PRICING_RENEWAL_TOKEN:'separate-renewal-token-12345678901234567890',SUPABASE_SECRET_KEY:'server-db-secret-only',SUPABASE_URL:'https://fixed.invalid'};
 const exports={};let verified=0,renewed=0;let ledgerConfig;
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,process:{env},Response,AbortSignal,fetch:()=>{throw Error('No real network');},require:id=>({
  '@/lib/public-pricing-renewal.server.mjs':{createPricingRenewalHandler:options=>createPricingRenewalHandler({...options,now})},
  '@/lib/public-pricing-verifier.server.mjs':{verifyPublicPlannerPricing:async()=>{verified++;return proof();}},
  '@/lib/public-planner-ledger.server.mjs':{createPublicPlannerLedger:config=>{ledgerConfig=config;return {renewPricing:async p=>{renewed++;return receipt(p);}};}},
 })[id]});
 assert.equal(exports.HEAD().status,405);assert.equal(verified,0);assert.equal(renewed,0);
 assert.equal((await exports.GET(request({headers:{}}))).status,401);assert.equal(verified,0);
 env.VERCEL_ENV='preview';assert.equal((await exports.GET(request())).status,404);assert.equal(verified,0);
 env.VERCEL_ENV='production';const original=env.PRICING_RENEWAL_TOKEN;env.PRICING_RENEWAL_TOKEN=secret;assert.equal((await exports.GET(request())).status,404);assert.equal(verified,0);
 env.PRICING_RENEWAL_TOKEN=original;const response=await exports.GET(request({},`https://${env.VERCEL_URL}${PRICING_RENEWAL_PATH}`));assert.equal(response.status,200);assert.equal(verified,1);assert.equal(renewed,1);
 assert.equal(ledgerConfig.secretKey,env.SUPABASE_SECRET_KEY);assert.equal(ledgerConfig.renewalToken,original);assert.equal('cronSecret' in ledgerConfig,false);
 const body=await response.text();for(const value of [secret,original,env.SUPABASE_SECRET_KEY])assert.ok(!body.includes(value));
});
