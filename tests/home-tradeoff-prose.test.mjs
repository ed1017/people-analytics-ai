import test from 'node:test';import assert from 'node:assert/strict';
import {inspectBundleResponse} from '../lib/home-bundle-response.ts';
import {readHomeBundleProposal} from '../lib/home-solution-bundles.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {completeComponentLimitation} from './fixtures/home-complete-limitation.mjs';
const goal='Reduce turnover',pack={sources:[{id:'W1',status:'loaded',facts:{headcount:600}}]};
test('fresh clipped tradeoffs reject without retry while legacy text is preserved',async()=>{
 const raw=bundleProposalFixture(goal);raw.bundles[0].limitation='This intervention requires reviewed assumptions and';let calls=0;
 const result=await inspectBundleResponse(async()=>{calls++;return {status:'completed',output_text:JSON.stringify(raw)}},goal,pack);assert.equal(result.diagnostic,'incomplete_output');assert.equal(calls,1);assert.equal(readHomeBundleProposal(raw,goal,pack).bundles[0].limitation,raw.bundles[0].limitation);

});
test('complete maximum-length prose survives response validation byte for byte',async()=>{
 const raw=bundleProposalFixture(goal);raw.bundles[0].limitation='Costs and availability require review. '+ 'Unverified assumptions remain conditional. '.repeat(4);raw.bundles[0].limitation=raw.bundles[0].limitation.trim();
 const original=JSON.stringify(raw);const result=await inspectBundleResponse(async()=>({status:'completed',output_text:original}),goal,pack);assert.ok(result.proposal);assert.equal(JSON.stringify(result.proposal),original);
 raw.bundles[0].limitation='x'.repeat(239)+'.';assert.ok((await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(raw)}),goal,pack)).proposal);
});
test('normal abbreviations, codes and complete brief bullets are not incomplete endings',async()=>{
 for(const text of ['Budget: N/A','Applies to cohort A','Review what this programme is for','Clarify what the budget applies to','Capacity: TBD','Needs Finance and HR','Review availability in the U.S.','Escalate to Legal (U.S.)','Compare an either-or','Source: OR','Dependencies: None','Costs remain unknown.']){
  const raw=bundleProposalFixture(goal);raw.bundles[0].limitation=text;raw.bundles[0].coordination=text;raw.bundles[0].components[0].limitation=text;
  const result=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(raw)}),goal,pack);assert.ok(result.proposal,text);assert.equal(result.proposal.bundles[0].limitation,text);
 }
});
test('complete maximum-bound quoted and parenthesized sentences are preserved',async()=>{
 const raw=bundleProposalFixture(goal);raw.bundles[0].limitation='x'.repeat(236)+'.”)';assert.equal(raw.bundles[0].limitation.length,239);raw.bundles[0].limitation='x'+raw.bundles[0].limitation;
 assert.ok((await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(raw)}),goal,pack)).proposal);
});

test('a complete 200-character component limitation does not require terminal punctuation',async()=>{
 assert.equal(completeComponentLimitation.length,200);
 for(const text of [completeComponentLimitation,completeComponentLimitation.replace('proposed ','')]){
  const raw=bundleProposalFixture(goal);raw.bundles[0].components[0].limitation=text;
  const original=JSON.stringify(raw);let calls=0;
  const result=await inspectBundleResponse(async()=>{calls++;return {status:'completed',output_text:original}},goal,pack);
  assert.ok(result.proposal,text);assert.equal(JSON.stringify(result.proposal),original);assert.equal(calls,1);
 }
});

test('visible truncation still rejects below and at the component bound without retries',async()=>{
 for(const ending of ['and','or','but','because','including',',',':',';','—','–','-','...','…']){
  for(const atBound of [false,true]){
   const raw=bundleProposalFixture(goal);
   const text=atBound?'Review '+ 'x'.repeat(200-8-ending.length)+' '+ending:'This pilot requires review '+ending;
   if(atBound)assert.equal(text.length,200);
   raw.bundles[0].components[0].limitation=text;let calls=0;
   const result=await inspectBundleResponse(async()=>{calls++;return {status:'completed',output_text:JSON.stringify(raw)}},goal,pack);
   assert.equal(result.proposal,null);assert.equal(result.diagnostic,'incomplete_output');assert.equal(result.responseDiagnostic.reason,'incomplete_text');assert.equal(result.responseDiagnostic.textField,'component_limitation');assert.equal(calls,1);
  }
 }
});
test('completed status does not admit over-bound or structurally truncated component text',async()=>{
 const raw=bundleProposalFixture(goal);raw.bundles[0].components[0].limitation=completeComponentLimitation+'.';
 for(const output_text of [JSON.stringify(raw),JSON.stringify(raw).slice(0,-3)]){
  const result=await inspectBundleResponse(async()=>({status:'completed',output_text}),goal,pack);assert.equal(result.proposal,null);assert.equal(result.responseDiagnostic.reason,'invalid_output');
 }
});
