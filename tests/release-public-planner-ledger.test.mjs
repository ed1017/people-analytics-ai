import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicPlannerLedger,PUBLIC_PLANNER_DATABASE_URL as url} from '../releases/2026-10-21/source/lib/public-planner-ledger.server.mjs';
const signal=()=>new AbortController().signal;
const reservation={requestId:'r1',contextId:'a'.repeat(64),policyId:'planner-luna-20261020-v1',reserveMicroUsd:500000};
test('fixed ledger path preserves exact reservation values and exposes no status port',async()=>{
 const requests=[],ledger=createPublicPlannerLedger({url,secretKey:'sb_secret_test',transport:async(u,init)=>{
  requests.push({u,...init});return Response.json({granted:true,...reservation,reservationId:'one'});
 }});
 assert.equal((await ledger.admit(reservation,signal())).granted,true);
 assert.equal(Object.hasOwn(ledger,'readLedgerStatus'),false);
 assert.deepEqual(Object.keys(ledger),['readPricing','renewPricing','admit','settle']);
 assert.equal(requests.length,1);
 assert.equal(requests[0].u,url+'/rest/v1/rpc/reserve_public_ai');
 assert.deepEqual(JSON.parse(requests[0].body),{p_request_id:'r1',p_context_id:reservation.contextId,p_policy_id:reservation.policyId,p_reserve_micro_usd:500000});
 for(const r of requests){assert.equal(r.redirect,'error');assert.equal(r.cache,'no-store');assert.equal(r.headers.authorization,undefined);assert.equal(r.headers.apikey,'sb_secret_test');}
});
test('unconfigured, incorrect project and cancellation make zero requests',async()=>{
 let count=0;const transport=async()=>{count++;throw Error('must not call');};
 for(const config of [{},{url:url+'/',secretKey:'test'},{url,secretKey:''}]){
  const ledger=createPublicPlannerLedger({transport,...config});
  assert.deepEqual(await ledger.admit(reservation,signal()),{granted:false});
 }
 const ledger=createPublicPlannerLedger({transport,url,secretKey:'test'}),c=new AbortController();c.abort();
 assert.deepEqual(await ledger.admit(reservation,c.signal),{granted:false});
 assert.equal(count,0);
});
test('failed or ambiguous admission is never retried or refunded, oversized responses are denied',async()=>{
 for(const transport of [async()=>{throw Error('lost response');},async()=>new Response('',{status:503}),async()=>Response.json({huge:'x'.repeat(5000)})]){
  let calls=0;const ledger=createPublicPlannerLedger({url,secretKey:'test',transport:async(...a)=>{calls++;return transport(...a);}});
  assert.deepEqual(await ledger.admit(reservation,signal()),{granted:false});assert.equal(calls,1);
 }
});
