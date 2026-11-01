import test from 'node:test';
import assert from 'node:assert/strict';
import {pricingPolicyForRoute,APPROVED_PRICING_DIGEST} from '../lib/public-pricing-policy.server.mjs';
import {publicPlannerPriceCandidate} from '../lib/public-planner-price-candidate.mjs';
const now=Date.parse('2026-10-27T01:00:00Z');
const fixture=()=>({version:'verification-1',status:'current',verificationDigest:APPROVED_PRICING_DIGEST,verifiedAt:'2026-10-27T00:00:00Z',validUntil:'2026-10-28T00:00:00Z',terms:{contextTokens:1050000,safetyBasisPoints:11000,policies:['home-solution','chat'].map(route=>{const p=publicPlannerPriceCandidate(route);return{id:p.id,model:p.model,inputMicroPerMillion:p.inputMicroUsdPerMillion,outputMicroPerMillion:p.outputMicroUsdPerMillion,reserveMicroUsd:p.reserveMicroUsd,maxOutputTokens:p.maxOutputTokens};})}});
test('renewal changes only dates; all five routes retain exact prices and limits',()=>{
 for(const route of ['home-solution','chat','plan','intake','capability']){
  const record=fixture(),actual=pricingPolicyForRoute(record,route,now);
  assert.deepEqual(actual,{...publicPlannerPriceCandidate(route),verifiedAt:record.verifiedAt,validUntil:record.validUntil});
 }
});
test('missing, expired, future, changed or incomplete verified policy fails closed',()=>{
 const mutate=[r=>{r.status='unavailable';},r=>{r.verificationDigest='a'.repeat(64);},r=>{r.validUntil='2026-10-27T01:01:00Z';},r=>{r.verifiedAt='2026-10-27T02:00:00Z';},r=>{r.validUntil='2026-10-29T00:00:00Z';},r=>{r.terms.policies[0].inputMicroPerMillion=1;},r=>{r.terms.policies[0].reserveMicroUsd=1;},r=>{r.terms.policies=[];},r=>{r.terms.policies.push(r.terms.policies[0]);}];
 for(const change of mutate){const r=fixture();change(r);assert.throws(()=>pricingPolicyForRoute(r,'home-solution',now));}
 assert.throws(()=>pricingPolicyForRoute(null,'home-solution',now));
});
test('new verification is used on next request without changing the previous snapshot',()=>{
 const old=fixture(),next=fixture();next.version='verification-2';next.verifiedAt='2026-10-27T06:00:00Z';next.validUntil='2026-10-28T06:00:00Z';
 const first=pricingPolicyForRoute(old,'chat',now);
 const second=pricingPolicyForRoute(next,'chat',now+6*3600000);
 assert.equal(first.validUntil,old.validUntil);assert.equal(second.validUntil,next.validUntil);
});

test('explicit non-expiring verification remains valid without weakening terms or revocation',()=>{
 const r={...fixture(),validUntil:null};
 for(const route of ['home-solution','chat','plan','intake','capability'])assert.equal(pricingPolicyForRoute(r,route,Date.parse('2040-01-01')).validUntil,null);
 for(const patch of [{validUntil:undefined},{validUntil:''},{validUntil:'infinity'},{status:'unavailable'},{verifiedAt:'2041-01-01'},{terms:{}}])assert.throws(()=>pricingPolicyForRoute({...r,...patch},'chat',Date.parse('2040-01-01')));
 const missing={...r};delete missing.validUntil;assert.throws(()=>pricingPolicyForRoute(missing,'chat',now));
});
