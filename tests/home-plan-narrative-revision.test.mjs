import test from 'node:test';
import assert from 'node:assert/strict';
import {bundleDisplayText} from '../lib/home-bundle-display.ts';
const bundle={components:[{id:'c1',name:'Manager check-ins'}]};
test('current participant narrative uses the current draft without changing unrelated numbers or stored text',()=>{
 const text='Pilot c1 with ten participants in a ten-person pilot group. Run three check-ins over ten weeks. Review a pilot group of ten.';
 const inputs={groups:[{count:{value:20}}]},before=structuredClone({text,bundle,inputs});
 assert.equal(bundleDisplayText(text,bundle,inputs),'Pilot Manager check-ins with 20 participants in a 20-person pilot group. Run three check-ins over ten weeks. Review a pilot group of 20.');
 assert.deepEqual({text,bundle,inputs},before);
 assert.match(bundleDisplayText(text,bundle),/ten participants/);
 assert.match(bundleDisplayText(text,bundle,{groups:[{count:{value:20}},{count:{value:5}}]}),/ten participants/);
});
