import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_9037 as P} from '../releases/2026-10-21/source/lib/public-9037-contract.mjs';
import {PUBLIC_AI_ROUTES,PUBLIC_AI_CAPABILITIES_PATH,publicAiRequestAllowed,readPublicAiCapabilityReceipt} from '../releases/2026-10-21/source/lib/public-ai-capabilities.mjs';
import {createPublicAiDispatcher} from '../releases/2026-10-21/source/lib/public-ai-dispatch.server.mjs';
const options={hostname:'people-analytics-test-ed-56dc.vercel.app',production:false};
const request=(path,method='POST',extra={})=>new Request('https://'+options.hostname+path,{method,headers:{'x-workforce-dataset':P.token,'x-workforce-request-id':'request_1',...extra}});
test('explicit disabled gate denies every paid path but permits exact token-bound configurationCheck GET',()=>{
 for(const path of PUBLIC_AI_ROUTES)assert.equal(publicAiRequestAllowed(options,request(path),false),false);
 assert.equal(publicAiRequestAllowed(options,request(PUBLIC_AI_CAPABILITIES_PATH,'GET')),true);
});
test('enabled ingress checks host, token, request identity, method, encoding and exact GET filters',()=>{
 for(const path of PUBLIC_AI_ROUTES)assert.equal(publicAiRequestAllowed(options,request(path),true),true);
 for(const r of [
  request('/api/chat?extra=1'),request('/api/chat','PUT'),request('/api/%63hat'),
  request('/api/chat','POST',{'x-workforce-dataset':'legacy-v1:0'}),
  request('/api/chat','POST',{'x-workforce-request-id':''}),
  new Request('https://www.ed-ai.app/api/chat',{method:'POST',headers:{'x-workforce-dataset':P.token,'x-workforce-request-id':'request_1'}}),
  request('/api/home-solution-conversation?country=all&org=all','GET'),
  request('/api/home-solution-conversation?country=all&org=all&level=all&country=US','GET'),
  request(PUBLIC_AI_CAPABILITIES_PATH+'?secret=x','GET'),
 ])assert.equal(publicAiRequestAllowed(options,r,true),false,r.url);
 assert.equal(publicAiRequestAllowed(options,request('/api/home-solution-conversation?country=all&org=all&level=all','GET'),true),true);
});
test('disabled dispatcher does not invoke supplied configurationCheck or handlers; unrelated deterministic path returns null',async()=>{
 let calls=0;
 const handlers=Object.fromEntries(PUBLIC_AI_ROUTES.map(p=>[p,()=>{calls++;throw Error('must not run');}]));
 const dispatch=createPublicAiDispatcher({options,enabled:false,handlers,configurationCheck:()=>{calls++;return true;},now:()=>1000});
 assert.equal(await dispatch(request('/api/dashboard','GET')),null);
 assert.equal((await dispatch(request('/api/chat'))).status,503);
 const response=await dispatch(request(PUBLIC_AI_CAPABILITIES_PATH,'GET')),body=await response.json();
 assert.deepEqual(body,{version:2,datasetToken:P.token,status:'unavailable',expiresAt:new Date(31000).toISOString(),routes:[]});
 assert.equal(response.headers.get('x-workforce-dataset'),P.token);assert.equal(calls,0);
});
test('configurationCheck requires all five fixed handlers and explicit successful read-only state',async()=>{
 const handlers=Object.fromEntries(PUBLIC_AI_ROUTES.map(p=>[p,()=>Response.json({ok:true})]));
 for(const setup of [{handlers:{},configurationCheck:()=>true},{handlers,configurationCheck:()=>false},{handlers,configurationCheck:()=>{throw Error('private error');}}]){
  const response=await createPublicAiDispatcher({options,enabled:true,now:()=>1000,...setup})(request(PUBLIC_AI_CAPABILITIES_PATH,'GET'));
  assert.equal((await response.json()).status,'unavailable');
 }
 const response=await createPublicAiDispatcher({options,enabled:true,handlers,configurationCheck:()=>true,now:()=>1000})(request(PUBLIC_AI_CAPABILITIES_PATH,'GET'));
 assert.equal(readPublicAiCapabilityReceipt(await response.json(),1000)?.status,'configured');
});
test('handler failures never fall through and responses retain public no-store identity',async()=>{
 let calls=0;
 const handlers=Object.fromEntries(PUBLIC_AI_ROUTES.map(p=>[p,()=>{calls++;return Response.json({route:p});}]));
 const dispatch=createPublicAiDispatcher({options,enabled:true,handlers,configurationCheck:()=>true});
 const r=await dispatch(request('/api/chat'));assert.equal(r.status,200);assert.equal((await r.json()).route,'/api/chat');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(calls,1);
 handlers['/api/chat']=()=>{throw Error('sensitive provider failure');};
 assert.equal((await dispatch(request('/api/chat'))).status,200);
 const failing=createPublicAiDispatcher({options,enabled:true,handlers,configurationCheck:()=>true});
 const failed=await failing(request('/api/chat'));assert.equal(failed.status,503);assert.equal((await failed.text()).includes('sensitive'),false);
});
test('receipt parser rejects stale, overlong, partial, duplicate, mixed and extended capabilities',()=>{
 const good={version:2,datasetToken:P.token,status:'configured',expiresAt:new Date(31000).toISOString(),routes:[...PUBLIC_AI_ROUTES]};
 assert.equal(readPublicAiCapabilityReceipt(good,1000)?.status,'configured');
 assert.equal(readPublicAiCapabilityReceipt({...good,version:1,status:'ready'},1000),null);
 for(const bad of [{...good,expiresAt:new Date(1000).toISOString()},{...good,expiresAt:new Date(36001).toISOString()},{...good,routes:good.routes.slice(1)},{...good,routes:Array(5).fill('/api/chat')},{...good,datasetToken:'legacy-v1:0'},{...good,extra:true},{...good,status:'unavailable'}])assert.equal(readPublicAiCapabilityReceipt(bad,1000),null);
});
test('pre-cancelled configurationCheck never starts a read or creates an unhandled rejection',async()=>{
 let calls=0;const unhandled=[];const listen=e=>unhandled.push(e);process.on('unhandledRejection',listen);
 try{
  const controller=new AbortController();controller.abort();
  const r=new Request(request(PUBLIC_AI_CAPABILITIES_PATH,'GET'),{signal:controller.signal});
  const handlers=Object.fromEntries(PUBLIC_AI_ROUTES.map(p=>[p,()=>Response.json({ok:true})]));
  const response=await createPublicAiDispatcher({options,enabled:true,handlers,configurationCheck:()=>{calls++;throw Error('Must not run');}})(r);
  assert.equal((await response.json()).status,'unavailable');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls,0);assert.deepEqual(unhandled,[]);
 }finally{process.off('unhandledRejection',listen);}
});
test('validated production aliases canonicalize in-process with body and request identity intact',async()=>{
 let received;
 const handlers=Object.fromEntries(PUBLIC_AI_ROUTES.map(p=>[p,async r=>{received={url:r.url,id:r.headers.get('x-workforce-request-id'),body:await r.text()};return Response.json({ok:true});}]));
 const dispatch=createPublicAiDispatcher({options:{...options,production:true},enabled:true,handlers,configurationCheck:()=>true});
 const r=new Request('https://www.ed-ai.app/api/chat',{method:'POST',headers:{'x-workforce-dataset':P.token,'x-workforce-request-id':'logical_1'},body:'{"question":"test"}'});
 assert.equal((await dispatch(r)).status,200);
 assert.deepEqual(received,{url:'https://'+options.hostname+'/api/chat',id:'logical_1',body:'{"question":"test"}'});
});

test('reviewed default enables ingress but missing server ports stay unavailable',async()=>{for(const path of PUBLIC_AI_ROUTES)assert.equal(publicAiRequestAllowed(options,request(path)),true);const dispatch=createPublicAiDispatcher({options});assert.equal((await dispatch(request('/api/chat'))).status,503);assert.equal((await (await dispatch(request(PUBLIC_AI_CAPABILITIES_PATH,'GET'))).json()).status,'unavailable');});

test('configuration receipt tolerates bounded clock skew without accepting stale or extended receipts',()=>{
 const now=100000,receipt={version:2,datasetToken:P.token,status:'configured',expiresAt:new Date(now+30060).toISOString(),routes:[...PUBLIC_AI_ROUTES]};
 assert.equal(readPublicAiCapabilityReceipt(receipt,now)?.status,'configured');
 assert.equal(readPublicAiCapabilityReceipt({...receipt,expiresAt:new Date(now+35000).toISOString()},now)?.status,'configured');
 assert.equal(readPublicAiCapabilityReceipt({...receipt,expiresAt:new Date(now+35001).toISOString()},now),null);
 assert.equal(readPublicAiCapabilityReceipt({...receipt,expiresAt:new Date(now).toISOString()},now),null);
});


test('observed server-ahead clock does not hide composer and never extends client receipt lifetime',()=>{
 const now=100000,raw={version:2,datasetToken:P.token,status:'configured',expiresAt:new Date(now+31065).toISOString(),routes:[...PUBLIC_AI_ROUTES]};
 const receipt=readPublicAiCapabilityReceipt(raw,now);assert.equal(receipt.status,'configured');assert.equal(Date.parse(receipt.expiresAt),now+30000);assert.equal(Date.parse(raw.expiresAt),now+31065);
 const shorter=readPublicAiCapabilityReceipt({...raw,expiresAt:new Date(now+20000).toISOString()},now);assert.equal(Date.parse(shorter.expiresAt),now+20000);
});

test('readiness store expires at clamped local deadline despite server-ahead clock',async()=>{
 const {createPublicAiReadiness}=await import('../releases/2026-10-21/source/lib/public-ai-readiness-client.mjs');let now=100000;
 const raw={version:2,datasetToken:P.token,status:'configured',expiresAt:new Date(now+35000).toISOString(),routes:[...PUBLIC_AI_ROUTES]};
 const store=createPublicAiReadiness({enabled:true,session:{snapshot:()=>P.token,subscribe:()=>()=>{}},now:()=>now,transport:async()=>new Response(JSON.stringify(raw),{headers:{'x-workforce-dataset':P.token}})});
 try{await store.refresh();assert.equal(store.available('/api/chat'),true);assert.equal(Date.parse(store.snapshot().expiresAt),now+30000);assert.ok(Object.isFrozen(store.snapshot()));assert.ok(Object.isFrozen(store.snapshot().routes));now+=30000;assert.equal(store.available('/api/chat'),false);}finally{store.dispose();}
});
