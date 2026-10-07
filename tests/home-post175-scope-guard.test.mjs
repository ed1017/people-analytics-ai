import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeHomePack} from '../lib/home-pack.mjs';
import {homeAnswerScopeViolation} from '../lib/home-answer-scope.ts';
import {inspectBundleResponse} from '../lib/home-bundle-response.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
const goal='Reduce turnover in the United States by 2 percentage points over 12 months';
const pack=normalizeHomePack({workforceScope:'United States; All business units; All levels',sources:[{id:'W1',status:'loaded',facts:{headcount:5000}},{id:'A1',status:'loaded',facts:{total_exits:100}},{id:'P1',status:'loaded',facts:{rows:[{scenario_name:'Baseline',planned_headcount:15000,planning_month:'2026-10-01'}]}}]});
for(const text of [
 'The United States scenario has 15,000 employees. [P1, A1]',
 '## United States\n- Planned headcount is 15,000. [P1]\n- Recorded exits were 100. [A1]',
 'United States\n- Recorded exits were 100. [A1]',
 '**United States:**\n- Turnover was 8%. [A1:summary]',
 'The United States global scenario has 15,000 employees. [P1]',
 'Global context: United States exits were 100 [A1].',
 'U.S. Turnover was 8%. [A1]',
 'The global scenario is a U.S.-only projection of 15,000 employees. [P1]',
 'The global company recorded 100 exits, all in the United States. [A1]',
 'United States turnover was 8% against the global baseline. [A1]',
 'United States exits were 100 [A1]. The global figure is not country-specific.',
 '**United States turnover was 8%. [A1]**',
 '## United States turnover was 8%. [A1]',
 'Use the United States turnover rate of 8% [A1] to prioritize manager support.',
 'Review the United States baseline of 8% [A1] before setting a target.',
 'Use the United States 8% turnover rate [A1] to prioritize manager support.',
 'Use the 8% United States turnover rate [A1] to prioritize manager support.',
 'Use the United States turnover rate (8%) [A1] to prioritize manager support.',
 'Use the United States baseline (8%) [A1] to prioritize manager support.',
 'Target a 2-point turnover reduction from the United States baseline of 8% [A1].',
 'Propose a United States pilot for 100 employees based on the United States turnover rate of 8% [A1].',
 'Use a target turnover rate of 8% for the United States pilot, based on its current turnover rate of 10% [A1].',
 'Use a target turnover rate of 8% based on the 10% United States turnover rate [A1].',
 'Propose a United States pilot for 100 employees based on its turnover rate (8%) [A1].',
 'Review the existing United States workforce of 100 employees [A1].',
])test('rejects unsupported scoped evidence: '+text,()=>assert.equal(homeAnswerScopeViolation(text,pack),true));
for(const text of [
 'United States headcount is 5,000 [W1]. Company-wide exits were 100 [A1].',
 'The scenario has 5000 employees and helps us plan. [P1]',
 'Target a 2-percentage-point turnover reduction in the United States; the global evidence establishes context only [A1].',
 '## United States\n- Headcount is 5,000 [W1].\n- Company-wide exits were 100; a United States breakdown is unavailable [A1].',
 'Global scenario headcount is 15,000; this does not establish the United States forecast [P1, A1].',
 'The United States breakdown is unavailable. Company-wide exits were 100 [A1].',
 'Propose a United States manager-check-in pilot, using global exits as context rather than a country estimate [A1].',
 'The supplied company monthly series cannot establish why people left or the selected United States monthly rate. [A1]',
 '**United States**\nUse the headcount of 5,000 [W1] to size a proposed pilot; company-wide exits provide context [A1].',
 'Use a 2-percentage-point reduction target for United States turnover; company-wide evidence provides context [A1].',
 'Target a United States turnover rate of 8%; company-wide evidence provides context [A1].',
 'Propose a United States workforce pilot over 12 months with a $100,000 budget; effectiveness is unknown [A1].',
 'Use a 12-month United States workforce pilot whose proposed owner has time for review [A1].',
 'Propose a United States pilot for 100 employees, using company-wide evidence only as context [A1].',
 'Propose a United States pilot for 100 employees [A1].',
 'Offer manager check-ins to 100 employees in the United States; this is a proposed pilot [A1].',
 'Use a target turnover rate of 8% for the United States pilot [A1].',
 'Use a target turnover rate (8%) for the United States pilot [A1].',
 'Use an 8% United States turnover target for the proposed pilot [A1].',
])test('retains correctly qualified evidence and proposed actions: '+text,()=>assert.equal(homeAnswerScopeViolation(text,pack),false));
test('generated plan prose is checked against structured component references without rewriting it',async()=>{
 const proposal=bundleProposalFixture(goal);proposal.bundles=proposal.bundles.slice(0,1);proposal.bundles[0].components.forEach(c=>c.evidence=['A1:summary']);
 proposal.bundles[0].objective='Run manager check-ins for the United States pilot.';
 proposal.bundles[0].components[0].firstStep='United States exits were 100, based on the global source.';
 const result=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(proposal)}),goal,pack);
 assert.equal(result.proposal,null);assert.equal(result.diagnostic,'source_scope_mismatch');
});
test('scoped proposed actions with correctly labeled company evidence remain available',async()=>{
 const proposal=bundleProposalFixture(goal);proposal.bundles=proposal.bundles.slice(0,1);proposal.bundles[0].components.forEach(c=>c.evidence=['A1:summary']);
 proposal.bundles[0].objective='Run manager check-ins for the United States pilot.';
 proposal.bundles[0].components[0].firstStep='Propose manager check-ins in the United States; company-wide exits provide context, not a country estimate.';
 const result=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(proposal)}),goal,pack);
 assert.ok(result.proposal);assert.equal(result.proposal.bundles[0].components[0].firstStep,proposal.bundles[0].components[0].firstStep);
});
test('explicit country composition rows support only their recorded composition measures',()=>{
 const rowPack=normalizeHomePack({workforceScope:'All countries; All business units; All levels',sources:[{id:'W2',status:'loaded',facts:{headcount:10000,rows:[{kind:'Country composition',country_name:'Canada',headcount:700,fte:697.4}]}}]});
 assert.equal(homeAnswerScopeViolation('Canada headcount is 700. [W2:row:0]',rowPack),false);
 assert.equal(homeAnswerScopeViolation('Canada turnover was 6%. [W2:row:0]',rowPack),true);
 assert.equal(homeAnswerScopeViolation('United States headcount is 700. [W2:row:0]',rowPack),true);
});
test('bold factual claims and recommended factual quantities in generated plans retain structured source scope checks',async()=>{
 for(const firstStep of ['**United States turnover was 8%.**','Use the United States turnover rate of 8% to prioritize manager support.','Use the 8% United States turnover rate to prioritize manager support.','Use the United States turnover rate (8%) to prioritize manager support.']){
  const proposal=bundleProposalFixture(goal);proposal.bundles=proposal.bundles.slice(0,1);proposal.bundles[0].components.forEach(c=>c.evidence=['A1:summary']);proposal.bundles[0].components[0].firstStep=firstStep;
  const before=JSON.stringify(proposal),result=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(proposal)}),goal,pack);
  assert.equal(result.proposal,null,firstStep);assert.equal(result.diagnostic,'source_scope_mismatch',firstStep);assert.equal(JSON.stringify(proposal),before);
 }
});

test('explicit proposed participant counts and desired rates do not reject an otherwise valid generated plan',async()=>{
 for(const firstStep of ['Propose a United States pilot for 100 employees.','Offer manager check-ins to 100 employees in the United States.','Use a target turnover rate of 8% for the United States pilot.','Use a target turnover rate (8%) for the United States pilot.','Use an 8% United States turnover target for the proposed pilot.']){
  const explicitGoal=goal+'; proposed pilot: 100 employees; desired target rate: 8%',proposal=bundleProposalFixture(explicitGoal);proposal.bundles=proposal.bundles.slice(0,1);proposal.bundles[0].components.forEach(c=>c.evidence=['A1:summary']);proposal.bundles[0].components[0].firstStep=firstStep;
  const before=JSON.stringify(proposal),result=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(proposal)}),explicitGoal,pack);
  assert.ok(result.proposal,firstStep);assert.equal(result.proposal.bundles[0].components[0].firstStep,firstStep);assert.equal(JSON.stringify(proposal),before);
 }
});
