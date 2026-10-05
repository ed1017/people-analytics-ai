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
 const cycle=fixture();cycle.bundles[0].components[0].dependsOn=['c1'];assert.equal(inspectHomeBundleProposal(cycle,goal,pack).diagnostic,'dependency_self_reference');
 assert.equal(inspectHomeBundleOutput(' '.repeat(32769),goal,pack).diagnostic,'response_too_large');
});
test('accepts schema-valid nonsequential stable IDs without relabelling storage identity',()=>{
 const proposal=fixture();proposal.bundles=[proposal.bundles[1]];
 const validate=new Ajv({strict:false}).compile(buildHomeBundleFormat(goal,pack).schema);
 assert.equal(validate(proposal),true,JSON.stringify(validate.errors));
 assert.equal(inspectHomeBundleProposal(proposal,goal,pack).proposal.bundles[0].id,'B');
});
test('valid completed response preserves only approved usage counters',async()=>{
 const result=await inspectBundleResponse(async()=>({status:'completed',output_text:JSON.stringify(fixture()),usage:{input_tokens:100,output_tokens:2100,total_tokens:2200,secret:'SECRET'}}),goal,pack);
 assert.equal(result.diagnostic,null);assert.equal(result.proposal.bundles.length,3);assert.deepEqual(result.usage,{input_tokens:100,output_tokens:2100,total_tokens:2200});
});

test('production decoder preserves unordered IDs and accepts schema-valid optional result metadata',()=>{
 const validate=new Ajv({strict:false}).compile(buildHomeBundleFormat(goal,pack).schema);
 for(const proposal of [(()=>{const p=fixture();p.bundles.reverse();return p})(),{...fixture(),bundles:[],unavailableReason:null},{...fixture(),unavailableReason:'One limitation needs review.'}]){
  assert.equal(validate(proposal),true,JSON.stringify(validate.errors));assert.deepEqual(inspectHomeBundleOutput(JSON.stringify(proposal),goal,pack).proposal,proposal);
 }
 const duplicate=fixture();duplicate.bundles[1].id='A';assert.equal(inspectHomeBundleProposal(duplicate,goal,pack).diagnostic,'schema_rejected');
 const questions=fixture();questions.question='One? Two?';assert.equal(validate(questions),false);assert.equal(inspectHomeBundleProposal(questions,goal,pack).diagnostic,'schema_rejected');
});

for(const [name,change,expected,schemaValid] of [
 ['unknown target present only in another bundle',p=>{p.bundles[0].components=p.bundles[0].components.slice(0,1);p.bundles[0].components[0].dependsOn=['c6'];},'dependency_unknown_reference',true],
 ['self prerequisite',p=>{p.bundles[0].components[0].dependsOn=['c1'];},'dependency_self_reference',true],
 ['two-component cycle',p=>{p.bundles[0].components[0].dependsOn=['c2'];p.bundles[0].components[1].dependsOn=['c1'];},'dependency_cycle',true],
 ['three-component cycle',p=>{p.bundles[0].components[0].dependsOn=['c2'];p.bundles[0].components[1].dependsOn=['c3'];p.bundles[0].components[2].dependsOn=['c1'];},'dependency_cycle',true],
 ['duplicate component identity',p=>{p.bundles[0].components[1].id='c1';},'dependency_duplicate_component',true],
 ['duplicate prerequisite',p=>{p.bundles[0].components[1].dependsOn=['c1','c1'];},'dependency_duplicate_reference',true],
 ['qualified cross-bundle ID',p=>{p.bundles[0].components[0].dependsOn=['B:c1'];},'dependency_unknown_reference',false],
 ['invalid dependency shape',p=>{p.bundles[0].components[0].dependsOn=null;},'dependency_shape',false],
])test('raw production output classifies '+name,()=>{
 const p=fixture();change(p);const validate=new Ajv({strict:false}).compile(buildHomeBundleFormat(goal,pack).schema);assert.equal(validate(p),schemaValid,JSON.stringify(validate.errors));
 assert.deepEqual(inspectHomeBundleOutput(JSON.stringify(p),goal,pack),{proposal:null,diagnostic:expected});
});
test('valid unordered components and repeated IDs across distinct bundles are accepted unchanged',()=>{
 const p=fixture();for(const bundle of p.bundles)bundle.components.reverse();assert.deepEqual(inspectHomeBundleOutput(JSON.stringify(p),goal,pack),{proposal:p,diagnostic:null});
});
