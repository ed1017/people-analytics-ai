import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createFixtureHandler} from './fixture-handler.mjs';
import {commandArgs} from './run-next.mjs';
const bytes=fs.readFileSync(new URL('./fixtures.json',import.meta.url));
const capture=JSON.parse(bytes),handle=createFixtureHandler(capture);
const request=(path,options)=>new Request('http://127.0.0.1:3097'+path,options);
test('launcher permits ports but never an external binding override',()=>{
 assert.deepEqual(commandArgs('start',['--port','3097']),['start','--hostname','127.0.0.1','--port','3097']);
 for(const args of [['--hostname','0.0.0.0'],['-H','0.0.0.0'],['--port','0'],['--port','65536'],['--port','3097','--hostname','0.0.0.0']])assert.throws(()=>commandArgs('start',args));
 assert.throws(()=>commandArgs('build',['--port','3097']));assert.throws(()=>commandArgs('start',[],{VERCEL:'1'}));
});
test('public fixture pin and full receipt bundle verify',()=>{
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),fs.readFileSync(new URL('./fixtures.sha256',import.meta.url),'utf8').trim());
 assert.equal(capture.documents.length,19);
});
test('all 19 recorded routes replay exact data and receipt bodies',async()=>{
 for(const doc of capture.documents){const response=handle(request(doc.route));assert.equal(response.status,200);assert.deepEqual(await response.json(),doc.body);assert.equal(response.headers.get('cache-control'),'no-store');}
});
test('explicit company scope works; narrowed, unknown and repeated scope fail',()=>{
 assert.equal(handle(request('/api/dashboard?country=all&org=all&level=all')).status,200);
 for(const query of ['country=US','country=all&country=all','unknown=all'])assert.equal(handle(request('/api/dashboard?'+query)).status,400);
 assert.equal(handle(request('/api/compensation-job-release?country=all&release=compensation-9037-public-v2')).status,200);
 assert.equal(handle(request('/api/compensation-job-release?release=other')).status,400);
});
test('no AI, POST calculations, wrong token or unrelated source fallback',async()=>{
 for(const route of ['/api/chat','/api/home-solution-conversation','/api/position-actions'])assert.equal(handle(request(route,{method:'POST',body:'{}'})).status,405);
 assert.equal(handle(request('/api/bls')).status,503);
 assert.equal(handle(request('/api/headcount',{headers:{'x-workforce-dataset':'other:2'}})).status,409);
 const config=await handle(request('/api/public-ai-capabilities')).json();assert.equal(config.status,'unavailable');assert.deepEqual(config.routes,[]);
});
test('host, deployment, protocol and path checks fail closed',()=>{
 assert.equal(handle(new Request('https://www.ed-ai.app/api/headcount')).status,403);
 assert.equal(handle(request('/api/headcount'),{VERCEL:'1'}).status,403);
 assert.equal(handle(request('/api/headcount',{headers:{host:'outside.example:3097'}})).status,403);
 assert.equal(handle(request('/api/headcount',{headers:{'x-forwarded-host':'127.0.0.1:1234'}})).status,403);
 assert.equal(handle(request('/api/headcount',{headers:{'x-forwarded-proto':'https'}})).status,403);
 assert.equal(handle(request('/api/%68eadcount')).status,400);
 assert.equal(handle(request('/api/%FF')).status,400);
 assert.equal(handle(request('/.private-9037/components.json')).status,404);
 assert.equal(handle(request('/')),null);
});
test('changed data, receipts, token or coverage cannot masquerade as captured evidence',()=>{
 for(const mutate of [c=>c.documents[0].body.headcount=1,c=>c.documents[0].body.data_meta.bundleDigest='0'.repeat(64),c=>c.documents[0].token='other:2',c=>c.documents.pop(),c=>c.documents.reverse()]){
  const changed=structuredClone(capture);mutate(changed);assert.throws(()=>createFixtureHandler(changed));
 }
});
