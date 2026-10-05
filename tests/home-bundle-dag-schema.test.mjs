import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {buildHomeBundleFormat,inspectHomeBundleOutput} from '../lib/home-solution-bundles.ts';
import {bundleProposalFixture} from './fixtures/home-bundles.mjs';
const require=createRequire(import.meta.url),Ajv=require('ajv'),goal='Review manager experience and exits',pack={sources:[{id:'W1',status:'loaded',facts:{headcount:100}}]};
const format=buildHomeBundleFormat(goal,pack),validate=new Ajv({strict:false}).compile(format.schema);
function wire(count,mode='chain'){
 const proposal=bundleProposalFixture(goal);proposal.bundles=proposal.bundles.slice(0,1);const original=proposal.bundles[0].components;
 proposal.bundles[0].components=Object.fromEntries(original.slice(0,count).map((component,index)=>{const value=structuredClone(component);delete value.id;value.dependsOn=mode==='none'?[]:mode==='all'?Array.from({length:index},(_,i)=>`c${i+1}`):index?[`c${index}`]:[];return [`c${index+1}`,value]}));return proposal;
}
for(let count=1;count<=6;count++){
 test(`exact ${count}-component request schema and production decoder agree for independent/chain/shared prerequisites`,()=>{
  for(const mode of ['none','chain','all']){const value=wire(count,mode),raw=JSON.stringify(value);assert.equal(validate(value),true,JSON.stringify(validate.errors));const result=inspectHomeBundleOutput(raw,goal,pack);assert.equal(result.diagnostic,null);assert.equal(result.proposal.bundles[0].components.length,count);for(let i=0;i<count;i++){const component=result.proposal.bundles[0].components[i];assert.equal(component.id,`c${i+1}`);assert.deepEqual(component.dependsOn,value.bundles[0].components[component.id].dependsOn);assert.equal(component.name,value.bundles[0].components[component.id].name);}assert.equal(JSON.stringify(value),raw);}
 });
 test(`exact ${count}-component schema blocks missing/self/future targets and identity injection`,()=>{
  for(const [change,reason] of [
   [v=>{v.bundles[0].components.c1.dependsOn=['c1']},'dependency_self_reference'],
   [v=>{v.bundles[0].components.c1.dependsOn=[`c${count+1}`]},'dependency_unknown_reference'],
   [v=>{delete v.bundles[0].components.c1},'dependency_unknown_reference'],
   [v=>{v.bundles[0].components.c1.id='c2'},'dependency_duplicate_component'],
  ]){const value=wire(count);change(value);assert.equal(validate(value),false);assert.equal(inspectHomeBundleOutput(JSON.stringify(value),goal,pack).diagnostic,reason);}
  if(count>1){const value=wire(count);value.bundles[0].components.c1.dependsOn=['c2'];value.bundles[0].components.c2.dependsOn=['c1'];assert.equal(validate(value),false);assert.equal(inspectHomeBundleOutput(JSON.stringify(value),goal,pack).diagnostic,'dependency_cycle');}
 });
}
test('all strict objects require their complete property set; no tuple or unsupported composition',()=>{
 function inspect(node){if(!node||typeof node!=='object')return;if(node.type==='object'){assert.equal(node.additionalProperties,false);assert.deepEqual([...node.required].sort(),Object.keys(node.properties).sort());}for(const key of ['prefixItems','additionalItems','allOf','oneOf','not','if','then','else','dependentRequired','dependentSchemas'])assert.ok(!Object.hasOwn(node,key),key);if(node.items)assert.ok(!Array.isArray(node.items));for(const value of Object.values(node))if(Array.isArray(value))value.forEach(inspect);else inspect(value);}
 inspect(format.schema);assert.equal(format.schema.type,'object');assert.ok(!format.schema.anyOf);assert.ok(Buffer.byteLength(JSON.stringify(format))<8000);
});
test('absent evidence still permits only the empty result with no unusable definitions',()=>{
 const empty=buildHomeBundleFormat(goal,{sources:[]}),check=new Ajv({strict:false}).compile(empty.schema);assert.ok(!empty.schema.$defs);const value={version:1,goal,bundles:[],question:null,unavailableReason:null};assert.equal(check(value),true);assert.equal(inspectHomeBundleOutput(JSON.stringify(value),goal,{sources:[]}).diagnostic,null);
});

test('schema-valid repeated identical prerequisite normalizes without adding or losing an edge',()=>{const value=wire(3);value.bundles[0].components.c3.dependsOn=['c1','c1'];assert.equal(validate(value),true);const result=inspectHomeBundleOutput(JSON.stringify(value),goal,pack);assert.deepEqual(result.proposal.bundles[0].components[2].dependsOn,['c1']);});
