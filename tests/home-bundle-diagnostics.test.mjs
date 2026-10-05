import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
import {buildHomeBundleFormat,inspectHomeBundleOutput,inspectHomeBundleProposal} from '../lib/home-solution-bundles.ts';
import {inspectBundleResponse} from '../lib/home-bundle-response.ts';
const require=createRequire(import.meta.url),Ajv=require('ajv');
const goal='Investigate whether manager experience and recorded voluntary exits show a retention-risk pattern across workforce segments.',pack={sources:[{id:'W1',status:'loaded',facts:{headcount:100}}]};
const fixture=()=>bundleProposalFixture(goal);
test('distinguishes API, incomplete, JSON and contract rejection without response text',async()=>{
 for(const [call,expected] of [
  [async()=>{throw Error('SECRET exception detail')},'api_error'],
  [async()=>({status:'incomplete',output_text:'SECRET partial answer'}),'incomplete_output'],
  [async()=>({status:'completed',output_text:'SECRET invalid json'}),'parse_error'],
  [async()=>({status:'completed',output_text:'{}'}),'schema_rejected'],
 ]){const result=await inspectBundleResponse(call,goal,pack);assert.deepEqual(result,{proposal:null,diagnostic:expected});assert.ok(!JSON.stringify(result).includes('SECRET'));}
});
test('source reference, dependency and size rejections are separately classified',()=>{
 const invalid=fixture();invalid.bundles[0].components[0].evidence=['S999:summary'];assert.equal(inspectHomeBundleProposal(invalid,goal,pack).diagnostic,'reference_rejected');
 const cycle=fixture();cycle.bundles[0].components[0].dependsOn=['c1'];assert.equal(inspectHomeBundleProposal(cycle,goal,pack).diagnostic,'dependency_rejected');
 assert.equal(inspectHomeBundleOutput(' '.repeat(32769),goal,pack).diagnostic,'response_too_large');
});
test('reproduces a schema-valid but locally rejected nonsequential option ID',()=>{
 const proposal=fixture();proposal.bundles=[proposal.bundles[1]];
 const validate=new Ajv({strict:false}).compile(buildHomeBundleFormat(goal,pack).schema);
 assert.equal(validate(proposal),true,JSON.stringify(validate.errors));
 assert.equal(inspectHomeBundleProposal(proposal,goal,pack).diagnostic,'schema_rejected');
});
test('valid completed response preserves only approved usage counters',async()=>{
 const result=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(fixture()),usage:{input_tokens:100,output_tokens:2100,total_tokens:2200,secret:'SECRET'}}),goal,pack);
 assert.equal(result.diagnostic,null);assert.equal(result.proposal.bundles.length,3);assert.deepEqual(result.usage,{input_tokens:100,output_tokens:2100,total_tokens:2200});
});
