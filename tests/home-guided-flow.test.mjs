import test from 'node:test';
import assert from 'node:assert/strict';
import {HomeGuidedFlow,guidedReceiptStep,conversationalReceiptStep} from '../lib/home-guided-flow.ts';
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done});return {promise,resolve};};
test('conversational guide follows replies and atomic selection, never a separate pin or fixed plan',()=>{
 const reviewed={type:'proposal-reviewed',goalId:'guided-test',planId:'voluntary-trial'},chosen={type:'proposal-chosen',goalId:'guided-test',planId:'any-proposal',number:7};
 for(const step of [1,2,4])assert.equal(conversationalReceiptStep(step,reviewed,'guided-test','original'),step+1);
 for(const step of [3,5])assert.equal(conversationalReceiptStep(step,chosen,'guided-test','original'),step+1);
 for(const event of [{...reviewed,type:'answered'},{...reviewed,planId:undefined},{...reviewed,goalId:'other'}])assert.equal(conversationalReceiptStep(1,event,'guided-test',null),null);
 for(const event of [{...chosen,type:'pinned'},{...chosen,number:0},{...chosen,planId:'original'},{...chosen,goalId:'other'}])assert.equal(conversationalReceiptStep(5,event,'guided-test','original'),null);
});

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

test('only successful receipts for the expected real control advance the guide',()=>{
 assert.equal(guidedReceiptStep(1,{type:'answered',goalId:'demo'},'demo',null,null),2);
 const receipt=(type,planId,number)=>({goalId:'demo',type,planId,number});
 assert.equal(guidedReceiptStep(2,receipt('pinned'),'demo',null,null),3);
 assert.equal(guidedReceiptStep(3,receipt('selected','A',1),'demo',null,null),4);
 assert.equal(guidedReceiptStep(3,receipt('selected','B',2),'demo',null,null),4);
 assert.equal(guidedReceiptStep(3,receipt('selected','C',3),'demo',null,null),4);
 for(const number of [0,-1,NaN,1.5])assert.equal(guidedReceiptStep(3,receipt('selected','B',number),'demo',null,null),null);
 assert.equal(guidedReceiptStep(3,receipt('selected',undefined,2),'demo',null,null),null);
 assert.equal(guidedReceiptStep(4,receipt('attached','B',2),'demo','A',null),null);
 assert.equal(guidedReceiptStep(4,receipt('attached','A',1),'demo','A',null),5);
 assert.equal(guidedReceiptStep(5,{...receipt('edited','alternative-4',4),sourcePlanId:'B'},'demo','B',null),6);
 for(const sourcePlanId of ['A',undefined])assert.equal(guidedReceiptStep(5,{...receipt('edited','alternative-4',4),sourcePlanId},'demo','B',null),null);
 assert.equal(guidedReceiptStep(6,receipt('selected','alternative-4',4),'demo','A','alternative-4'),7);
 assert.equal(guidedReceiptStep(7,receipt('attached','alternative-4',4),'demo','A','alternative-4'),8);
 assert.equal(guidedReceiptStep(7,{...receipt('attached','staffing-5',5),sourcePlanId:'alternative-4'},'demo','A','alternative-4'),8);
 assert.equal(guidedReceiptStep(7,receipt('attached','A',1),'demo','A','alternative-4'),null);
 assert.equal(guidedReceiptStep(2,{...receipt('pinned'),goalId:'real'},'demo',null,null),null);
 assert.equal(guidedReceiptStep(8,receipt('attached','alternative-4',4),'demo','A','alternative-4'),null);
});
