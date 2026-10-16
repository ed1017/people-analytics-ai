import test from 'node:test';
import assert from 'node:assert/strict';
import {createSwpDemo,compareSwpDemo} from '../lib/swp-demo.ts';
import {primarySwpRequest,primarySwpValuesValid} from '../lib/simple-swp-controls.ts';
import {previewBundleChatEdit,acceptBundleChatEdit} from '../lib/home-bundle-chat-edit.ts';
test('interactive volume round trip retains reviewed search limits and choices',async()=>{
 const original=await createSwpDemo('guided-primary-roundtrip','2026-10-16T12:00:00Z');
 const apply=(d,value)=>{const request=primarySwpRequest(d,original.inputs.mixScenario.bounds,'Service units per month',value);return acceptBundleChatEdit(d,previewBundleChatEdit(d,request));};
 const smaller=apply(original,'1120');assert.equal(smaller.inputs.scope.demand.value,4);assert.equal(smaller.inputs.mixScenario.bounds.buy.value.max,4);
 const restored=apply(smaller,'1280');assert.equal(restored.inputs.mixScenario.bounds.buy.value.max,5);assert.deepEqual(restored.inputs.groups,original.inputs.groups);
 const a=await compareSwpDemo(original),b=await compareSwpDemo(restored);assert.deepEqual(b.options.map(o=>o.candidate.mix),a.options.map(o=>o.candidate.mix));
});
test('both displayed primary values must be valid independently',()=>{
 for(const invalid of ['', '0','1.5','-1','2000001','abc'])assert.equal(primarySwpValuesValid(invalid,'1280'),false);
 for(const invalid of ['', '-1','1.5','1000001','abc'])assert.equal(primarySwpValuesValid('500000',invalid),false);
 assert.equal(primarySwpValuesValid('500000','1120'),true);
});
