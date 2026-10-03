import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import OpenAI from 'openai';
import {openAIProxyTransport} from '../lib/openai-proxy-transport.ts';

async function fixtureServer(t,handler) {
  const server=http.createServer(handler);
  const sockets=new Set();
  server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket))});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve))});
  return {server,url:`http://127.0.0.1:${server.address().port}`};
}
async function denyingProxy(t) {
  const fixture=await fixtureServer(t,(_,res)=>res.writeHead(403).end());
  const destinations=[];
  fixture.server.on('connect',(req,socket)=>{destinations.push(req.url);socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')});
  return {...fixture,destinations};
}
function client(t,env,baseURL) {
  // All values are explicit local fixtures; never read real credentials/env.
  const transport=openAIProxyTransport(env);
  t.after(()=>transport.fetchOptions?.dispatcher?.close());
  return new OpenAI({...transport,baseURL,apiKey:'synthetic-unit-test',maxRetries:0,timeout:1000});
}
const request={model:'fixture-only',input:'Synthetic test',store:false,max_output_tokens:16};

test('no configured proxy leaves SDK defaults untouched',()=>{
  assert.deepEqual(openAIProxyTransport({}),{});
  assert.deepEqual(openAIProxyTransport({NO_PROXY:'localhost'}),{});
  assert.deepEqual(openAIProxyTransport({http_proxy:'',HTTP_PROXY:'http://unused.invalid'}),{});
});
test('HTTPS uses configured proxy with lowercase precedence, without contacting the destination',async t=>{
  const lower=await denyingProxy(t),upper=await denyingProxy(t);
  await assert.rejects(client(t,{https_proxy:lower.url,HTTPS_PROXY:upper.url},'https://synthetic-api.invalid/v1').responses.create(request));
  assert.deepEqual(lower.destinations,['synthetic-api.invalid:443']);assert.deepEqual(upper.destinations,[]);
});
test('HTTP_PROXY supports HTTPS when no HTTPS-specific proxy is configured',async t=>{
  const proxy=await denyingProxy(t);
  await assert.rejects(client(t,{HTTP_PROXY:proxy.url},'https://synthetic-api.invalid/v1').responses.create(request));
  assert.deepEqual(proxy.destinations,['synthetic-api.invalid:443']);
});
test('proxy denial fails closed without a direct retry to the local origin',async t=>{
  let originCalls=0;
  const origin=await fixtureServer(t,(_,res)=>{originCalls++;res.writeHead(200).end('{}')});
  const proxy=await denyingProxy(t);
  await assert.rejects(client(t,{http_proxy:proxy.url},origin.url+'/v1').responses.create(request));
  assert.equal(proxy.destinations.length,1);assert.equal(originCalls,0);
});
test('configured no_proxy is honored and an API 401 remains an authentication failure',async t=>{
  let originCalls=0;
  const origin=await fixtureServer(t,(_,res)=>{originCalls++;res.writeHead(401,{'Content-Type':'application/json'}).end(JSON.stringify({error:{message:'Synthetic authentication denial',type:'invalid_request_error'}}))});
  const proxy=await denyingProxy(t);
  await assert.rejects(client(t,{http_proxy:proxy.url,no_proxy:'127.0.0.1',NO_PROXY:'unused.invalid'},origin.url+'/v1').responses.create(request),error=>error.status===401);
  assert.equal(originCalls,1);assert.deepEqual(proxy.destinations,[]);
});
test('invalid proxy fails without including configuration values in the error',()=>{
  assert.throws(()=>openAIProxyTransport({HTTPS_PROXY:'invalid fixture configuration'}),{message:'Configured OpenAI proxy transport is invalid.'});
});
