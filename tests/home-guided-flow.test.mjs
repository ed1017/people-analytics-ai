import test from 'node:test';
import assert from 'node:assert/strict';
import {HomeGuidedFlow} from '../lib/home-guided-flow.ts';
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done});return {promise,resolve};};

test('a pending or completed Next cannot send twice',async()=>{
 const flow=new HomeGuidedFlow(),wait=deferred();let calls=0;
 const first=flow.run(0,async()=>{calls++;await wait.promise;});
 assert.equal(await flow.run(0,async()=>{calls++;}),false);
 wait.resolve();assert.equal(await first,true);
 assert.equal(await flow.run(0,async()=>{calls++;}),true);
 assert.equal(calls,1);
});
test('failure and failed receipt stay on the current step and allow retry',async()=>{
 const flow=new HomeGuidedFlow();let calls=0;
 await assert.rejects(flow.run(3,async()=>{calls++;throw Error('network');}),/network/);
 assert.equal(flow.done(3),false);
 await assert.rejects(flow.run(3,async()=>{calls++;},()=>{throw Error('no saved plan');}),/no saved plan/);
 assert.equal(flow.done(3),false);
 assert.equal(await flow.run(3,async()=>{calls++;}),true);assert.equal(calls,3);
});
test('Back or Cancel invalidates a late completion without blocking a new attempt',async()=>{
 const flow=new HomeGuidedFlow(),wait=deferred();
 const old=flow.run(0,()=>wait.promise);flow.cancel();
 assert.equal(await flow.run(0,async()=>{}),true);wait.resolve();
 assert.equal(await old,false);assert.equal(flow.done(0),true);
});
test('completed replay can reselect through a real idempotent handler and still verifies ownership',async()=>{
 const flow=new HomeGuidedFlow();let calls=0,owned=true;
 const select=async()=>{calls++;},verify=()=>{if(!owned)throw Error('removed');};
 await flow.run(2,select,verify,true);await flow.run(2,select,verify,true);assert.equal(calls,2);
 owned=false;await assert.rejects(flow.run(2,select,verify,true),/removed/);
});
