import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkforceOptionActions,isOptionActionLabel} from '../lib/workforce-option-actions.ts';
const offers=[{id:'compare',label:'Compare all 2 options'},{id:'adjust',label:'Adjust this option'},{id:'explore',label:'Explore more options'}];
test('staging is inert; exact Send dispatches once and only locally',()=>{
 const bridge=new WorkforceOptionActions(),calls=[];bridge.publish('owner','source','goal',offers,id=>calls.push(id));
 for(const offer of offers){const command=bridge.stage(offer.id);assert.deepEqual(calls,offers.slice(0,calls.length).map(item=>item.id));assert.equal(bridge.execute(command,command.label,'goal'),'');assert.ok(bridge.execute(command,command.label,'goal'));}
 assert.deepEqual(calls,['compare','adjust','explore']);
});
test('edited or wrong-goal commands never dispatch',()=>{
 const bridge=new WorkforceOptionActions();bridge.publish('owner','source','goal',offers,()=>assert.fail());const command=bridge.stage('adjust');
 assert.match(bridge.execute(command,'Adjust something else','goal'),/edited/);assert.match(bridge.execute({...command,edited:true},command.label,'goal'),/edited/);assert.match(bridge.execute(command,command.label,'other'),/changed/);
});
test('identity changes and unmount/roundtrip invalidate even identical final context',()=>{
 const bridge=new WorkforceOptionActions();bridge.publish('owner','source','goal',offers,()=>assert.fail());const command=bridge.stage('adjust');
 bridge.clear('other-owner');assert.equal(bridge.getSnapshot().generation,command.generation);
 bridge.clear('owner');bridge.publish('owner','source','goal',offers,()=>assert.fail());assert.match(bridge.execute(command,command.label,'goal'),/changed/);
 const next=bridge.stage('compare');bridge.publish('owner','new-result','goal',offers,()=>assert.fail());assert.match(bridge.execute(next,next.label,'goal'),/changed/);
});
test('unchanged publications refresh handlers without invalidating; unavailable actions are not staged',()=>{
 const bridge=new WorkforceOptionActions();bridge.publish('owner','source','goal',offers,()=>assert.fail());const command=bridge.stage('compare');let called=false;
 bridge.publish('owner','source','goal',offers,()=>{called=true});assert.equal(bridge.execute(command,command.label,'goal'),'');assert.ok(called);
 bridge.publish('owner','source','goal',[],()=>assert.fail());assert.equal(bridge.stage('explore'),null);
});
test('only exact reserved labels are recognized, including restored count labels',()=>{
 for(const offer of offers)assert.ok(isOptionActionLabel(offer.label));assert.ok(isOptionActionLabel('Compare all 3 options'));
 for(const text of ['Compare the workforce','Adjust this option please','Explore more','Compare all 0 options'])assert.equal(isOptionActionLabel(text),false);
});
