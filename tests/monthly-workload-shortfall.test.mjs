import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwpDemo,compareSwpDemo,createServiceStaffingDemo,serviceOptionEffort} from '../lib/swp-demo.ts';
import {guidedOptionEffort,optionMonthlyCoverage,monthlyCapacityEffort,guidedPlanSummary} from '../lib/guided-plan-summary.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
import {reviewBundleProposal,bundleInputKey,reviseBundleDraft} from '../lib/home-bundle-reconciliation.ts';
import {illustrativeServiceReview,createDemandReview,SWP_DEMAND_MODE} from '../lib/swp-demand.ts';
const at='2026-10-16T12:00:00Z';
const change=(d,text)=>acceptBundleChatEdit(d,previewBundleChatEdit(d,text));

test('each month retains its shortage even when later rounded-role capacity exceeds demand',()=>{
 assert.deepEqual(monthlyCapacityEffort([0,2,5],1200,480,160),{additionalHours:1120,totalHours:2560,shortfallHours:1120});
 assert.equal(monthlyCapacityEffort([0,10],800,0,160).shortfallHours,800,'later surplus cannot recover earlier work');
 for(const baseline of [800,1000])assert.equal(monthlyCapacityEffort([0,3,5],800,baseline,160).shortfallHours,0,'zero or negative gap');
 assert.equal(monthlyCapacityEffort([0,0],800,0,160).shortfallHours,1600);
});

test('default and fractional demand give exact shortages for both offered mixes and multiple horizons',async()=>{
 const base=await createSwpDemo('guided-monthly-shortfall',at);
 for(const months of [3,6,12])for(const volume of [1280,1200]){
  const draft=change(base,`Set Service units per month to ${volume}`),compared=await compareSwpDemo(draft);
  for(const [build,buy,expected] of [[3,0,volume===1280?1280:1120],[0,3,volume===1280?320:240]]){
   const original=compared.options.find(o=>o.candidate.mix.build===build&&o.candidate.mix.buy===buy&&o.candidate.mix.move===2);assert.ok(original);
   const resizedInput=change(original.draft,`Set shared horizon to ${months} months`).inputs;resizedInput.capacity.input.deadlineMonth=months===3?"2027-01":months===6?"2027-04":"2027-10";
   const resized=reviseBundleDraft(original.draft,resizedInput),option={...original,draft:resized,coverage:reviewBundleProposal(resized).conditionalCoverage};
   const key=bundleInputKey(option.draft),cash=structuredClone(option.candidate.cash),effort=guidedOptionEffort(option);
   assert.equal(option.draft.inputs.scope.demand.value,5,'whole-role rounding retained');
   assert.equal(effort.shortfallHours,expected);assert.equal(effort.totalHours,480*months+effort.additionalHours);
   assert.deepEqual(guidedPlanSummary(option.draft).effort,effort);assert.equal(bundleInputKey(option.draft),key);assert.deepEqual(option.candidate.cash,cash);
  }
 }
});

test('effective first-day, mid-month and dependency readiness retain monthly gating and unknowns',async()=>{
 const base=await createSwpDemo('guided-monthly-ready',at),compared=await compareSwpDemo(change(base,'Set Service units per month to 1200'));
 const mix=compared.options.find(o=>o.candidate.mix.buy===3&&o.candidate.mix.move===2);
 for(const [date,expected] of [['2026-12-01',720],['2026-12-15',1120]]){
  const draft=change(mix.draft,`Set Hire arrival date to ${date}`),option={draft,coverage:reviewBundleProposal(draft).conditionalCoverage};
  assert.equal(guidedOptionEffort(option).shortfallHours,expected);
 }
 const internal=compared.options.find(o=>o.candidate.mix.build===3&&o.candidate.mix.move===2),late=change(internal.draft,'Set Build effective month to 2027-02');
 const option={draft:late,coverage:reviewBundleProposal(late).conditionalCoverage};
 assert.equal(guidedOptionEffort(option).shortfallHours,1520,'later development adds another month of uncovered work');
 for(const coverage of [null,[0],Array(12).fill(null)])assert.equal(guidedOptionEffort({...mix,coverage}),null);
 const missing=change(mix.draft,'Set Hire arrival date to Unknown');assert.equal(optionMonthlyCoverage({draft:missing,coverage:reviewBundleProposal(missing).conditionalCoverage}),null);
});

test('service bridge monthly, annual and horizon rates preserve early shortages and units',async()=>{
 const context={conversationMode:SWP_DEMAND_MODE,classification:'unverified-business-inputs',intakeId:'monthly-service',datasetToken:'legacy-v1:0',boundGoal:{id:'',statement:''},revision:1},base=illustrativeServiceReview(context,at);
 for(const months of [3,6])for(const period of ['month','year','horizon']){
  const spec=structuredClone(base.spec);spec.months=months;spec.startMonth='2026-11';spec.contracts.value=2;spec.existingRoles.value=3;spec.existingFtePerRole.value=1;spec.availabilityPct.value=100;
  spec.hoursPerContract.period=period;spec.hoursPerContract.value=600*(period==='month'?1:period==='year'?12:months);
  spec.productiveHoursPerFte.period=period;spec.productiveHoursPerFte.value=160*(period==='month'?1:period==='year'?12:months);
  const review=createDemandReview(spec,context,'monthly-rates',base.basisTurns),bridge={review,reviewedAt:at,staffingReviewedAt:at,priorAccepted:[]};
  const initial=await createServiceStaffingDemo('guided-service-monthly',bridge,at),draft=change(initial,'Set Hire arrival date to 2026-12-01'),options=(await compareSwpDemo(draft)).options;
  const option=options.find(o=>o.candidate.mix.buy===5);assert.ok(option);const effort=serviceOptionEffort(option,bridge);
  assert.equal(effort.shortfallHours,720);assert.equal(effort.status,'shortfall');assert.equal(effort.additionalHours,(months-1)*800);assert.equal(effort.totalHours,months*480+(months-1)*800);
  assert.match(effort.assumption,/surplus is not carried/);
  assert.equal(serviceOptionEffort({...option,coverage:null},bridge).status,'unknown');
 }
});
