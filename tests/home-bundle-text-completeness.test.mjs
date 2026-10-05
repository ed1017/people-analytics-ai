import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectBundleResponse} from '../lib/home-bundle-response.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
const goal='Review workforce planning constraints',pack={sources:[{id:'W1',status:'loaded',facts:{headcount:20}}]};
test('reported budget feasibility ending rejects the whole fresh response without modifying it',async()=>{
 const raw=bundleProposalFixture(goal);raw.bundles[1].limitation='Review cost against the USD 20,000 planning budget; feasibility is not';const before=structuredClone(raw);let calls=0;
 const result=await inspectBundleResponse(async()=>{calls++;return {status:'completed',output_text:JSON.stringify(raw)}},goal,pack);
 assert.equal(result.proposal,null);assert.equal(result.responseDiagnostic.reason,'incomplete_text');assert.equal(result.responseDiagnostic.textField,'limitation');assert.equal(calls,1);assert.deepEqual(raw,before);
});

test('auxiliary chains and negation reject across every fresh prose field, including punctuation and contractions',async()=>{
 const endings=['is not','are not','was not','were not','has not','have not','had not','has not been','have not yet been','is being','is not currently','is not fully','may','might','must','should','will','would','can','could','may not','might not be','will not have been','must still be','should already have','ought to','needs to','has yet to','would have to','does not','do not','did not','cannot','cannot yet',"isn't","aren’t","hasn’t been","won't","couldn’t yet"];
 const fields=[['objective',b=>b,'objective'],['coordination',b=>b,'coordination'],['limitation',b=>b,'limitation'],['firstStep',b=>b.components[0],'firstStep'],['limitation',b=>b.components[0],'component_limitation']];
 for(const ending of endings)for(const [key,target,expected] of fields)for(const suffix of ['', '.', '.”']){
  const raw=bundleProposalFixture(goal);target(raw.bundles[0])[key]='Feasibility '+ending+suffix;
  const result=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(raw)}),goal,pack);
  assert.equal(result.proposal,null,expected+': '+ending+suffix);assert.equal(result.responseDiagnostic.reason,'incomplete_text');assert.equal(result.responseDiagnostic.textField,expected);
 }
});

test('complete constraints, negation, codes and indirect review statements are preserved byte for byte',async()=>{
 const complete=['Feasibility is not established.','Costs have not been verified.','Delivery timing within 90 days cannot yet be confirmed.','Costs may not fit the USD 20,000 planning budget.','The plan does not establish a retention effect.','Feasibility isn’t established.','Participant availability won’t be assumed.','Review what the budget is','Describe how participant availability has been','Keep assumptions as is.','Keep assumptions as they are.','Escalate to Legal (U.S.)','Source: OR','Source: IS','Capacity: TBD','Review planning needs','Review what the programme is for'];
 for(const text of complete){
  const raw=bundleProposalFixture(goal);raw.bundles[0].limitation=text;raw.bundles[0].components[0].limitation=text;const original=JSON.stringify(raw);
  const result=await inspectBundleResponse(async()=>({status:'completed',output_text:original}),goal,pack);assert.ok(result.proposal,text);assert.equal(JSON.stringify(result.proposal),original);
 }
});

test('wire normalization, preparation, preset, calculation, attachment and display preserve full constraints',async()=>{
 const {deliveryAcceptanceWire}=await import('./fixtures/home-exact-acceptance.mjs');
 const {completeComponentLimitation}=await import('./fixtures/home-complete-limitation.mjs');
 const {actionBinding,actionBindingKey}=await import('../lib/home-action-drafts.ts');
 const {createHomeBundlePreparation,readBundlePreparation}=await import('../lib/home-bundle-preparation.ts');
 const {createBundleDraft,readBundleDraft,reconcileBundle,bundleInputKey}=await import('../lib/home-bundle-reconciliation.ts');
 const {prepareIllustrativePilot}=await import('../lib/home-action-plan-pilot.ts');
 const {saveBundleDraftPatch,saveBundleCalculationPatch,attachBundlePatch,readBundleWorkspace}=await import('../lib/home-bundle-records.ts');
 const {bundleDisplayText}=await import('../lib/home-bundle-display.ts');
 const binding=await actionBinding('text-preservation',goal,pack,{}),wire=deliveryAcceptanceWire(goal);
 const limitation='Review cost against the USD 20,000 planning budget; feasibility is not established. Delivery within 90 days and existing capacity remains unverified; no retention improvement is promised.';
 wire.bundles[1].limitation=limitation;wire.bundles[1].components.c1.limitation=completeComponentLimitation;
 const inspected=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(wire)}),goal,pack,'delivery');assert.ok(inspected.proposal);
 const patches=[],outcome=await createHomeBundlePreparation().run({mode:'explicit',binding,packet:pack,stored:null,isCurrent:()=>true,prepare:async()=>inspected,commit:patch=>patches.push(patch)});assert.equal(outcome.status,'ready');
 const stored=readBundlePreparation(JSON.parse(JSON.stringify(patches[0].value)),binding,pack),bundle=stored.proposal.bundles[1];assert.equal(bundle.limitation,limitation);assert.equal(bundle.components[0].limitation,completeComponentLimitation);
 const draft=prepareIllustrativePilot(createBundleDraft(bundle,binding),'2026-10-05T00:00:00Z');assert.deepEqual(readBundleDraft(draft).bundle,bundle);
 const saved=saveBundleDraftPatch(undefined,draft),calculated=saveBundleCalculationPatch(saved.value,draft,reconcileBundle(draft));
 const attached=attachBundlePatch(calculated.value,draft,{confirmed:true,acknowledgeUnknowns:true,bindingKey:actionBindingKey(binding),inputKey:bundleInputKey(draft)},'text-attachment','2026-10-05T01:00:00Z');
 const restored=readBundleWorkspace(JSON.parse(JSON.stringify(attached.value)),binding.goalId);for(const item of [restored.drafts[0],restored.calculations[0].draft,restored.attachments[0].draft]){assert.deepEqual(item.bundle,bundle);assert.equal(bundleDisplayText(item.bundle.limitation,item.bundle),limitation);assert.equal(bundleDisplayText(item.bundle.components[0].limitation,item.bundle),completeComponentLimitation);}
});
