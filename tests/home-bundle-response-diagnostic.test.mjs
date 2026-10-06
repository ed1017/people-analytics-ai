import test from 'node:test';import assert from 'node:assert/strict';
import {bundleResponseDiagnostic,readBundleResponseDiagnostic,bundleResponseDiagnosticText,homeBundleOutputTokens} from '../lib/home-bundle-response-diagnostic.ts';
import {inspectBundleResponse} from '../lib/home-bundle-response.ts';
import {createHomeBundlePreparation} from '../lib/home-bundle-preparation.ts';
import {actionBinding} from '../lib/home-action-drafts.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
const goal='Build AI skills',pack={sources:[{id:'W1',status:'loaded',facts:{headcount:100}}]};
test('failure details retain bounded classifications and counts, never provider text',()=>{
 const detail=bundleResponseDiagnostic({status:'incomplete',incomplete_details:{reason:'max_output_tokens',secret:'PRIVATE'},output_text:'PRIVATE',usage:{output_tokens:5000,output_tokens_details:{reasoning_tokens:4100},secret:'PRIVATE'},id:'PRIVATE',error:{message:'PRIVATE'}},'output_token_limit',homeBundleOutputTokens);
 assert.ok(readBundleResponseDiagnostic(detail));assert.equal(detail.outputBytes,7);assert.equal(detail.outputTokens,5000);assert.equal(detail.reasoningTokens,4100);assert.ok(!JSON.stringify(detail).includes('PRIVATE'));assert.ok(!bundleResponseDiagnosticText(detail).includes('PRIVATE'));
 for(const edit of [x=>x.extra='PRIVATE',x=>x.status='PRIVATE',x=>x.reason='PRIVATE',x=>x.textField='PRIVATE',x=>x.outputTokens=-1,x=>x.reasoningTokens=Infinity,x=>x.outputBytes=1e12,x=>x.version=2]){const copy={...detail};edit(copy);assert.equal(readBundleResponseDiagnostic(copy),null);}
 const invalid=bundleResponseDiagnostic({status:'PRIVATE',incomplete_details:{reason:'PRIVATE'},usage:{output_tokens:'5000',output_tokens_details:{reasoning_tokens:-1}}},'incomplete_response',homeBundleOutputTokens);assert.equal(invalid.status,'unknown');assert.equal(invalid.incompleteReason,'other');assert.equal(invalid.outputTokens,null);assert.equal(invalid.reasoningTokens,null);
});
test('completed text rejection identifies the bounded field without exposing its contents',async()=>{
 for(const [field,change] of [['objective',p=>p.bundles[0].objective='Run the practice and'],['coordination',p=>p.bundles[0].coordination='Combine the sessions and'],['limitation',p=>p.bundles[0].limitation='Requires review and'],['firstStep',p=>p.bundles[0].components[0].firstStep='Introduce practice and'],['component_limitation',p=>p.bundles[0].components[0].limitation='Costs unknown and']]){
  const raw=bundleProposalFixture(goal);change(raw);let calls=0;const result=await inspectBundleResponse(async()=>{calls++;return {status:'completed',output_text:JSON.stringify(raw)}},goal,pack);assert.equal(calls,1);assert.equal(result.proposal,null);assert.equal(result.responseDiagnostic.reason,'incomplete_text');assert.equal(result.responseDiagnostic.textField,field);assert.equal(result.responseDiagnostic.status,'completed');assert.ok(!JSON.stringify(result).includes('Run the practice'));
 }
});
test('failed explicit preparation retains saved work; only an explicit new attempt can recover',async()=>{
 const worker=createHomeBundlePreparation(),binding=await actionBinding('goal-a',goal,pack,{}),proposal=bundleProposalFixture(goal),prior={sentinel:'Saved work'},before=JSON.stringify(prior);let calls=0,commits=0;
 const detail=bundleResponseDiagnostic({status:'incomplete',incomplete_details:{reason:'max_output_tokens'}},'output_token_limit',homeBundleOutputTokens);
 const args={mode:'new-pin',binding,packet:pack,stored:prior,isCurrent:()=>true,prepare:async()=>{calls++;return {proposal:null,diagnostic:'incomplete_output',responseDiagnostic:detail}},commit:()=>commits++};
 const result=await worker.run(args);assert.deepEqual(result,{status:'failed',diagnostic:'incomplete_output',responseDiagnostic:detail});assert.equal(JSON.stringify(prior),before);assert.equal(commits,0);assert.equal((await worker.run(args)).status,'explicit_required');assert.equal((await worker.run({...args,mode:'passive'})).status,'explicit_required');assert.equal(calls,1);
 assert.equal((await worker.run({...args,mode:'explicit',prepare:async()=>{calls++;return {proposal}}})).status,'ready');assert.equal(calls,2);assert.equal(commits,1);
});
test('late failure metadata cannot cross a stale response boundary',async()=>{
 const worker=createHomeBundlePreparation(),binding=await actionBinding('goal-a',goal,pack,{});let release,commits=0;const detail=bundleResponseDiagnostic(null,'api_error',homeBundleOutputTokens);
 const pending=worker.run({mode:'explicit',binding,packet:pack,stored:null,isCurrent:()=>true,prepare:()=>new Promise(resolve=>release=resolve),commit:()=>commits++});await Promise.resolve();worker.invalidate();release({proposal:null,diagnostic:'api_error',responseDiagnostic:detail});assert.deepEqual(await pending,{status:'stale'});assert.equal(commits,0);
});
