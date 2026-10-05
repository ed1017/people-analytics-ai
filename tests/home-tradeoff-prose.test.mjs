import test from 'node:test';import assert from 'node:assert/strict';
import {inspectBundleResponse} from '../lib/home-bundle-response.ts';
import {readHomeBundleProposal} from '../lib/home-solution-bundles.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
const goal='Reduce turnover',pack={sources:[{id:'W1',status:'loaded',facts:{headcount:600}}]};
test('fresh clipped tradeoffs reject without retry while legacy text is preserved',async()=>{
 const raw=bundleProposalFixture(goal);raw.bundles[0].limitation='This intervention requires reviewed assumptions and';let calls=0;
 const result=await inspectBundleResponse(async()=>{calls++;return {status:'completed',output_text:JSON.stringify(raw)}},goal,pack);assert.equal(result.diagnostic,'incomplete_output');assert.equal(calls,1);assert.equal(readHomeBundleProposal(raw,goal,pack).bundles[0].limitation,raw.bundles[0].limitation);
 raw.bundles[0].limitation='x'.repeat(240);assert.equal((await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(raw)}),goal,pack)).diagnostic,'incomplete_output');
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
