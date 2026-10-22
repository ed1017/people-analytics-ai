import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publicPlannerPriceCandidate,PUBLIC_PLANNER_PRICE_GROUP} from '../lib/public-planner-price-candidate.mjs';
import {plannerWorstChargeMicroUsd,publicPlannerReadiness} from '../lib/public-planner-round.server.mjs';
test('official-source full-context candidate amounts conservatively cover every route output bound',()=>{
 const amounts={};
 for(const route of ['home-solution','chat','plan','intake','capability']){
  const p=publicPlannerPriceCandidate(route),worst=plannerWorstChargeMicroUsd(p);
  assert.equal(p.contextTokens,1050000);assert.ok(p.reserveMicroUsd>=worst);
  amounts[route]=worst;
 }
 assert.deepEqual(amounts,{'home-solution':4686000,chat:481800,plan:465168,intake:467940,capability:464376});
 // Existing reservations mean even four max-Sol rounds leave less than one dollar.
 assert.equal(20000000-34-4*4800000,799966);
});
test('multi-price readiness requires the reviewed global version and maximum, not a caller discount',async()=>{
 const p=publicPlannerPriceCandidate('plan'),now=()=>Date.parse(p.verifiedAt)+60*60*1000;
 const row={id:'public-9037-ai-initial-v1',enabled:true,cap_micro_usd:30000000,reserved_micro_usd:34,policy_id:PUBLIC_PLANNER_PRICE_GROUP,per_call_micro_usd:4800000,pricing_valid_until:p.validUntil};
 const options={enabled:true,policy:p,now,readLedgerStatus:async()=>row,ledgerPolicyId:PUBLIC_PLANNER_PRICE_GROUP,ledgerPerCallMicroUsd:4800000};
 assert.equal(await publicPlannerReadiness(options),true);
 assert.equal(await publicPlannerReadiness({...options,ledgerPerCallMicroUsd:500000}),false);
 assert.equal(await publicPlannerReadiness({...options,ledgerPolicyId:'other'}),false);
});
test('offline SQL proposal preserves signature, atomic serialization and immutable accounting controls',async()=>{
 const sql=await readFile(new URL('../integration-evidence/public-ai-multiprice.PROPOSED.sql',import.meta.url),'utf8');
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.reserve_public_ai/);
 assert.match(sql,/SECURITY INVOKER SET search_path=pg_catalog/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/WHEN 'planner-sol-20261020-v1' THEN 4800000/);
 assert.match(sql,/WHEN 'planner-luna-20261020-v1' THEN 500000/);
 assert.match(sql,/p_reserve_micro_usd IS DISTINCT FROM charge/);
 assert.match(sql,/b\.reserved_micro_usd\+charge>b\.cap_micro_usd/);
 assert.match(sql,/WHERE request_id=p_request_id/);
 assert.match(sql,/reserved_micro_usd=reserved_micro_usd\+charge/);
 assert.match(sql,/before_acl IS DISTINCT FROM/);assert.match(sql,/before_trigger IS DISTINCT FROM/);
 // Source regression only. This does NOT execute SQL or certify live privileges.
 const statements=sql.split('\n').filter(line=>!line.trim().startsWith('--')).join('\n');
 assert.doesNotMatch(statements,/\b(?:GRANT|REVOKE|TRUNCATE|DELETE|DROP|SECURITY DEFINER)\b/);
 assert.doesNotMatch(statements,/SET\s+(?:enabled|cap_micro_usd|policy_id|pricing_valid_until)\s*=/);
});
test('offline exact-price ledger model serializes mixed prices, denies replays/discounts and preserves prior usage',async()=>{
 let reserved=34;const ids=new Set();
 const admit=async(id,policy,amount)=>{
  const charge=policy==='planner-sol-20261020-v1'?4800000:policy==='planner-luna-20261020-v1'?500000:null;
  if(!charge||amount!==charge||ids.has(id)||reserved+charge>20000000)return false;
  ids.add(id);reserved+=charge;return true;
 };
 const requests=Array.from({length:20},(_,i)=>({id:'round'+i,policy:i%2?'planner-sol-20261020-v1':'planner-luna-20261020-v1',amount:i%2?4800000:500000}));
 const grants=await Promise.all(requests.map(r=>admit(r.id,r.policy,r.amount)));
 assert.equal(grants.filter(Boolean).length,13);assert.equal(reserved,19400034);
 assert.equal(await admit('discount','planner-sol-20261020-v1',500000),false);
 // All previously granted IDs remain denied even with spare capacity.
 assert.ok((await Promise.all(requests.filter((_,i)=>grants[i]).map(r=>admit(r.id,r.policy,r.amount)))).every(x=>!x));
 assert.equal(reserved,19400034);
});
