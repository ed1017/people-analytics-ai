import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {exactAcceptancePrompt as prompt,exactAcceptanceGoal as goal,deliveryAcceptanceWire} from './fixtures/home-exact-acceptance.mjs';
import {homeGoalForPin,homePlanningNoteParts,planningStatements,resolveHomePlanningIntent} from '../lib/home-planning-intent.ts';
import {emptyGoalRequirements,addGoalNote,normalizeGoalContext} from '../lib/goal-context.ts';
import {homeBundleTask,homeBundleTaskInstructions} from '../lib/home-bundle-task.ts';
import {buildHomeBundleFormat,readHomeBundleProposal} from '../lib/home-solution-bundles.ts';
import {inspectBundleResponse} from '../lib/home-bundle-response.ts';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {prepareIllustrativePilot} from '../lib/home-action-plan-pilot.ts';
import {createBundleDraft,reconcileBundle} from '../lib/home-bundle-reconciliation.ts';
const pack={sources:[{id:'W1',status:'loaded',facts:{headcount:5000}}]},require=createRequire(import.meta.url),Ajv=require('ajv');
const notes=homePlanningNoteParts(prompt).reduce((previous,text)=>addGoalNote(previous,text,'home','All countries'),emptyGoalRequirements());
const context=normalizeGoalContext({goal,...notes}),task=homeBundleTask(context);
const response=(wire,requestedTask=task)=>inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(wire),usage:{input_tokens:100,output_tokens:100}}),goal,pack,requestedTask);
test('verbatim 941-character prompt survives pin notes and normalization with its final instruction intact',()=>{
 assert.equal(prompt.length,941);assert.equal(homeGoalForPin([prompt]),goal);assert.equal(context.notes.map(n=>n.text).join(' '),prompt);assert.ok(context.notes.every(n=>n.text.length<=800&&!n.truncated));
 assert.equal(task,'delivery');assert.equal(homeBundleTask({...context,goal:'Investigate voluntary turnover signals'}),'delivery');assert.equal(homeBundleTask({goal:'Investigate turnover',notes:[{text:'Propose three Action Plan alternatives.'}]}),'delivery');
 assert.match(homeBundleTaskInstructions(context),/Classify each component activity/);
 assert.deepEqual(resolveHomePlanningIntent(planningStatements(context)),{goal,months:12,relativeReduction:20,pointReduction:null,participants:null,baseline:8.2,target:6.56,rateConflict:false,baselinePeriod:'annualized',budgetCap:500000,existingCapacity:true,companyWide:true});
});
test('suffix target is retained independently of relative arithmetic and conflicts stay unknown',async()=>{
 assert.equal(resolveHomePlanningIntent([prompt.replace('6.56% target','6.5% target')]).target,6.5);
 const binding=await actionBinding('exact',goal,pack,{}),proposal=(await response(deliveryAcceptanceWire(goal))).proposal;
 const draft=prepareIllustrativePilot(createBundleDraft(proposal.bundles[0],binding),'2026-10-05T00:00:00Z',{goalContext:{...context,notes:[{text:prompt.replace('6.56% target','6.5% target')}]}});
 assert.equal(draft.inputs.whatIf.target.value,null);assert.equal(draft.inputs.whatIf.baseline.value,8.2);
});
test('exact request schema and production response mapping accept concrete delivery with supporting diagnostics',async()=>{
 const wire=deliveryAcceptanceWire(goal),before=JSON.stringify(wire),validate=new Ajv({strict:false}).compile(buildHomeBundleFormat(goal,pack,task).schema);
 assert.equal(validate(wire),true,JSON.stringify(validate.errors));const result=await response(wire);assert.equal(result.diagnostic,null);assert.equal(JSON.stringify(wire),before);
 assert.deepEqual(result.proposal.bundles.map(b=>b.components[0].firstStep),wire.bundles.map(b=>b.components.c1.firstStep));assert.ok(result.proposal.bundles.every(b=>b.components.every(c=>!('activity' in c))));assert.deepEqual(readHomeBundleProposal(result.proposal,goal,pack),result.proposal);
 const binding=await actionBinding('exact',goal,pack,{});
 for(const bundle of result.proposal.bundles){const draft=prepareIllustrativePilot(createBundleDraft(bundle,binding),'2026-10-05T00:00:00Z',{goalContext:context}),input=draft.inputs,result=reconcileBundle(draft);assert.equal(input.whatIf.baseline.value,8.2);assert.equal(input.whatIf.target.value,6.56);assert.equal(input.whatIf.baseline.kind,'user-entered');assert.equal(input.whatIf.target.kind,'user-entered');assert.equal(input.whatIf.population.value,null);assert.equal(input.whatIf.ratePeriod,'annualized');assert.equal(input.scope.months.value,12);assert.equal(input.scope.capacityRequired.value,false);assert.match(input.scope.population.value,/all countries and business units/);assert.match(input.scope.requirements.value,/\$500,000 USD \(cap, not an expense\)/);assert.match(input.scope.requirements.value,/existing HR\/manager capacity/);assert.equal(result.whatIf.change,-1.64);assert.notEqual(result.whatIf.cash,500000);assert.deepEqual(prepareIllustrativePilot(draft,'2028-01-01T00:00:00Z',{goalContext:{}}),draft);}
});
test('diagnostic-only and unclassified output cannot pass a fresh delivery request; no retry or generated replacement',async()=>{
 const wire=deliveryAcceptanceWire(goal);for(const bundle of wire.bundles){bundle.components.c1.activity='diagnostic';bundle.components.c1.firstStep='Review turnover segments and triangulate exit signals before deciding whether to propose a pilot.';}
 let calls=0;const result=await inspectBundleResponse(async()=>{calls++;return {status:'completed',output_text:JSON.stringify(wire)}},goal,pack,'delivery');assert.equal(calls,1);assert.equal(result.proposal,null);assert.equal(result.diagnostic,'delivery_required');
 assert.equal((await response(wire,'diagnostic')).diagnostic,null);
 wire.bundles[0].components.c1.activity='delivery';assert.equal((await response(wire)).diagnostic,'delivery_required');
 delete wire.bundles[0].components.c1.activity;assert.equal((await response(wire)).diagnostic,'schema_rejected');
 assert.equal((await response({...wire,bundles:[],unavailableReason:'No responsible intervention can be proposed from the available evidence.'})).diagnostic,null);
});
test('oversized Home notes still use the existing truncation signal and six-part bound',()=>{const parts=homePlanningNoteParts('word '.repeat(1200));assert.equal(parts.length,6);const value=parts.reduce((previous,text)=>addGoalNote(previous,text,'home','All'),emptyGoalRequirements());assert.ok(value.notes.some(n=>n.truncated));});
