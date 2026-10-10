import test from 'node:test';
import assert from 'node:assert/strict';
import {createFreshSkillReadRequest,readFreshSkillGaps,readFreshSkillHeadcount} from '../lib/home-fresh-skill-reads.ts';
import {freshSkillClient} from './fixtures/fresh-skill-client.mjs';

const token='legacy-v1:0',signal=()=>new AbortController().signal,drain=()=>new Promise(resolve=>setImmediate(resolve));
const binding=(client,overrides={})=>({authorization:client,datasetToken:token,schema:'public',scope:'company-wide|all|all|all',signal:signal(),...overrides});

test('Skills and Learning share one fresh aggregate and headcount, with independent result objects',async()=>{
 const {client,state}=freshSkillClient(),request=createFreshSkillReadRequest(true),key=binding(client);
 const [skills,learning,a,b]=await Promise.all([
  request.run(key,()=>readFreshSkillGaps(client,token,'skills')),
  request.run(key,()=>readFreshSkillGaps(client,token,'learning-development')),
  request.run(key,()=>readFreshSkillHeadcount(client,token)),
  request.run(key,()=>readFreshSkillHeadcount(client,token)),
 ]);
 assert.equal(state.calls.length,2);assert.deepEqual(skills,learning);assert.deepEqual(a,b);
 assert.ok(state.calls.every(call=>call.signal===key.signal));
 skills.data[0].requirement_met_pct=999;a.data.headcount=999;
 assert.equal(learning.data[0].requirement_met_pct,60);assert.equal(b.data.headcount,17);
 assert.equal((await request.run(key,()=>readFreshSkillHeadcount(client,token))).data.headcount,17);
 assert.equal(state.calls.length,2);request.close();
 assert.throws(()=>request.run(key,()=>readFreshSkillHeadcount(client,token)),/closed/);
});

test('no cross-request reuse, including concurrent requests, and standalone Learning retains its projection',async()=>{
 const {client,state}=freshSkillClient(),key=binding(client),first=createFreshSkillReadRequest(true),second=createFreshSkillReadRequest(true);
 await Promise.all([first.run(key,()=>readFreshSkillHeadcount(client,token)),second.run(key,()=>readFreshSkillHeadcount(client,token))]);
 assert.equal(state.calls.length,2);first.close();second.close();state.headcount=19;
 const next=createFreshSkillReadRequest(false);
 assert.equal((await next.run(key,()=>readFreshSkillHeadcount(client,token))).data.headcount,19);
 await next.run(key,()=>readFreshSkillGaps(client,token,'learning-development'));next.close();
 assert.doesNotMatch(state.calls.at(-1).columns,/avg_required_proficiency/);
 await readFreshSkillHeadcount(client,token);await readFreshSkillHeadcount(client,token);
 assert.equal(state.calls.length,6);assert.equal(state.calls.at(-1).signal,undefined);
});

test('scope, dataset, authorization identity and cancellation identity never share a result',async()=>{
 const {client,state}=freshSkillClient(),other=freshSkillClient(),request=createFreshSkillReadRequest(true),key=binding(client);
 const variants=[key,{...key,scope:'company-wide|US|all|all'},{...key,datasetToken:'legacy-v1:1'},{...key,signal:signal()},{...key,authorization:other.client}];
 for(const entry of variants){
  await request.run(entry,()=>readFreshSkillHeadcount(entry.authorization,entry.datasetToken));
  await request.run(entry,()=>readFreshSkillHeadcount(entry.authorization,entry.datasetToken));
 }
 assert.equal(state.calls.length,4);assert.equal(other.state.calls.length,1);
 // The actual query client/token also form part of the key, independently of the surrounding binding.
 await request.run(key,()=>readFreshSkillHeadcount(other.client,token));
 await request.run(key,()=>readFreshSkillHeadcount(client,'legacy-v1:2'));
 assert.equal(other.state.calls.length,1);assert.equal(state.calls.length,5);request.close();
});

test('cancellation rejects both subscribers, prevents cached success and consumes late transport rejection',async()=>{
 const {client,state}=freshSkillClient(),controller=new AbortController(),request=createFreshSkillReadRequest(true),key=binding(client,{signal:controller.signal}),pending=Promise.withResolvers();
 state.pending=pending.promise;
 const a=request.run(key,()=>readFreshSkillHeadcount(client,token)),b=request.run(key,()=>readFreshSkillHeadcount(client,token));
 const checks=[assert.rejects(a,/stop/),assert.rejects(b,/stop/)];await drain();assert.equal(state.calls.length,1);
 controller.abort(Error('stop'));await Promise.all(checks);
 assert.throws(()=>request.run(key,()=>readFreshSkillHeadcount(client,token)),/stop/);
 pending.reject(Error('late transport failure'));await drain();request.close();
 const second=createFreshSkillReadRequest(true),done=new AbortController(),doneKey=binding(client,{signal:done.signal});state.pending=null;
 await second.run(doneKey,()=>readFreshSkillHeadcount(client,token));done.abort(Error('after completion'));
 assert.throws(()=>second.run(doneKey,()=>readFreshSkillHeadcount(client,token)),/after completion/);second.close();
});

test('failed reads are shared without implicit retries and a later request starts fresh',async()=>{
 for(const reject of [false,true]){
  const {client,state}=freshSkillClient(),request=createFreshSkillReadRequest(true),key=binding(client);
  if(reject)state.rejection=Error('synthetic failure');else state.error={message:'synthetic failure',code:'TEST'};
  const read=()=>request.run(key,()=>readFreshSkillHeadcount(client,token));
  if(reject){await Promise.all([assert.rejects(read(),/synthetic failure/),assert.rejects(read(),/synthetic failure/)]);await assert.rejects(read(),/synthetic failure/);}
  else{const [a,b]=await Promise.all([read(),read()]);assert.deepEqual(a.error,b.error);assert.equal((await read()).data,null);}
  assert.equal(state.calls.length,1);request.close();state.error=null;state.rejection=null;
  const next=createFreshSkillReadRequest(true);assert.equal((await next.run(key,()=>readFreshSkillHeadcount(client,token))).data.headcount,17);assert.equal(state.calls.length,2);next.close();
 }
});

test('closing a request while a transport completes cannot return retained evidence',async()=>{
 const {client,state}=freshSkillClient(),request=createFreshSkillReadRequest(true),key=binding(client),pending=Promise.withResolvers();state.pending=pending.promise;
 const read=request.run(key,()=>readFreshSkillHeadcount(client,token)),check=assert.rejects(read,/closed/);await drain();request.close();pending.resolve();await check;
});
