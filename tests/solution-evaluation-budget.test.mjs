import test from 'node:test';
import assert from 'node:assert/strict';
import {createEvaluationReservation,evaluationLimits} from './helpers/solution-evaluation-budget.mjs';
const receipt={model:'gpt-5.6-luna',standardTier:true,endpointRatesVerified:true,localTokenUpperBoundVerified:true,inputUsdPerMillion:.25,outputUsdPerMillion:1.2};
const request=turnId=>({turnId,inputTokenUpperBound:1000,maxOutputTokens:5000});
test('full pessimistic reservations cap 18 turns and 72 requests without refunds',()=>{let time=0,journal=[];const budget=createEvaluationReservation({receipt,persist:value=>{journal=value;},now:()=>time});for(let turn=0;turn<18;turn++)for(let round=0;round<4;round++){time+=11000;const item=budget.reserve(request('turn-'+turn));assert.equal(journal.length,item.id);budget.settle(item.id,{input_tokens:100,output_tokens:10});}assert.equal(journal.length,72);assert.equal(journal.reduce((sum,x)=>sum+x.reservedMicrousd,0),4032000);assert.throws(()=>budget.reserve(request('extra')),/limit/);assert.equal(evaluationLimits.hostedAcceptanceCalls,0);});
test('missing provenance, larger inputs, concurrency, rate and journal failures stop before send',()=>{
 assert.throws(()=>createEvaluationReservation({receipt:{...receipt,localTokenUpperBoundVerified:false},persist:()=>{}}),/Verified/);
 const budget=createEvaluationReservation({receipt,persist:()=>{},now:()=>0});assert.throws(()=>budget.reserve({...request('a'),inputTokenUpperBound:200001}),/token/);assert.throws(()=>budget.reserve({...request('a'),hosted:true}),/outside/);const first=budget.reserve(request('a'));assert.throws(()=>budget.reserve(request('b')),/in flight/);budget.settle(first.id);for(let n=0;n<5;n++){const item=budget.reserve(request('b'+n));budget.settle(item.id);}assert.throws(()=>budget.reserve(request('later')),/rate/);
 const broken=createEvaluationReservation({receipt,persist:()=>{throw Error('Journal unavailable');}});assert.throws(()=>broken.reserve(request('a')),/Journal/);assert.equal(broken.entries.length,0);
});
