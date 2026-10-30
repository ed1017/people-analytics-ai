import test from 'node:test';import assert from 'node:assert/strict';
import {DecisionStore} from '../lib/local-decisions.ts';
import {DEMO_POSITION_INVENTORY,COMPANY_POSITION_INVENTORY} from '../lib/position-inventory.ts';
import {createPositionAllocation} from '../lib/position-allocation.ts';
import {savePositionScenario,readPositionScenarioLedger,POSITION_ALLOCATION_LEDGER_FIELD as field} from '../lib/position-allocation-store.ts';
import {encodeDecisionBackup,parseDecisionBackup} from '../lib/decision-backup.ts';
const at='2026-10-29T12:00:00.000Z',ids=DEMO_POSITION_INVENTORY.positions.filter(p=>p.status==='vacant'&&p.vacancyStatus!=='frozen').map(p=>p.id);
function setup(exploration=false){let raw=null,fail=false;const port={getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('Quota');raw=v},removeItem:()=>{raw=null}};const store=new DecisionStore();store.initialize(port);store.saveGoals({version:1,activeId:exploration?'':'a',goals:[{id:'a',statement:'Goal A'},{id:'b',statement:'Goal B'}]});store.setField('a','planning.oldScenario',{hiringCost:123,fte:0.5});store.setField('b','savedPlan',{keep:true});return {store,port,raw:()=>raw,fail:()=>{fail=true},externalChange:()=>{raw+=' '},save:(draft=createPositionAllocation(ids,true),id='one',baseRevision=0)=>savePositionScenario({store,datasetToken:store.getDatasetToken(),goalId:exploration?'':'a',goal:exploration?'':'Goal A',revision:store.getSnapshot().data.revision,at,draft,scenarioId:id,baseRevision})};}
test('immutable scenarios/revisions save, compare and reload with exact inventory, scope, assumptions and earlier plans',()=>{
 const h=setup(),first=h.save(),draft=structuredClone(first.draft);draft.input.budgetUsd=100000;const second=h.save(draft,'one',1);const third=h.save(draft,'two');
 assert.equal(first.revision,1);assert.equal(second.revision,2);assert.equal(first.scenarioNumber,second.scenarioNumber);assert.equal(third.scenarioNumber,2);assert.equal(first.draft.input.budgetUsd,150000);
 const reopened=new DecisionStore();reopened.initialize(h.port);const ledger=readPositionScenarioLedger(reopened.getField('a',field),reopened.getDatasetToken(),'a');assert.equal(ledger.records.length,3);assert.deepEqual(ledger.records[0],first);assert.deepEqual(reopened.getField('a','planning.oldScenario'),{hiringCost:123,fte:0.5});assert.deepEqual(reopened.getField('b','savedPlan'),{keep:true});
 assert.throws(()=>h.save(draft,'one',1),/newer/);
});
test('repeated save preserves history and General exploration saves need no goal text',()=>{
 for(const exploration of [false,true]){const h=setup(exploration),first=h.save();h.save(first.draft,'one',1);assert.equal(h.store.getField(exploration?'':'a',field).records.length,1);const again=new DecisionStore();again.initialize(h.port);assert.equal(again.getField(exploration?'':'a',field).records.length,1);}
});
test('overallocated drafts, corrupt ledgers and inventory/model substitutions never write a capture',()=>{
 for(const kind of ['over','ledger','inventory','model']){const h=setup(),draft=createPositionAllocation(ids,true);if(kind==='over')draft.input.hire=20;if(kind==='ledger')h.store.setField('a',field,{version:99});if(kind==='inventory')draft.inventory.version='future';if(kind==='model')draft.modelVersion='future';const before=h.raw();assert.throws(()=>h.save(draft));assert.equal(h.raw(),before);}
});
test('storage failure, wrong goal/dataset and cross-tab conflicts retain all saved work',()=>{
 for(const kind of ['quota','other-tab','goal','dataset']){const h=setup();h.save();if(kind==='quota')h.fail();if(kind==='other-tab')h.externalChange();if(kind==='goal')h.store.saveGoals({...h.store.getSnapshot().data.goals,activeId:'b'});const before=h.raw(),snapshot=structuredClone(h.store.getSnapshot().data);assert.throws(()=>savePositionScenario({store:h.store,datasetToken:kind==='dataset'?'wrong':h.store.getDatasetToken(),goalId:'a',goal:'Goal A',revision:h.store.getSnapshot().data.revision,at,draft:createPositionAllocation(ids,true),scenarioId:'two'}));assert.equal(h.raw(),before);assert.deepEqual(h.store.getSnapshot().data,snapshot);}
});
test('backup/restore retains new position captures and old saved plans without changing backup format',()=>{
 const h=setup();h.save();const snapshot=h.store.getSnapshot(),backup=encodeDecisionBackup(snapshot.data,h.store.getDatasetToken(),at),parsed=parseDecisionBackup(backup,h.store.getDatasetToken());assert.deepEqual(parsed.data,snapshot.data);assert.equal(parsed.data.workspaces.a.fields[field].records[0].draft.inventory.version,'position-register-demo-v1');
 const old=structuredClone(snapshot.data);delete old.workspaces.a.fields[field];assert.deepEqual(parseDecisionBackup(encodeDecisionBackup(old,h.store.getDatasetToken(),at),h.store.getDatasetToken()).data,old);
 const corrupt=structuredClone(snapshot.data);corrupt.workspaces.a.fields[field].records[0].result.cashTotal=1;assert.throws(()=>encodeDecisionBackup(corrupt,h.store.getDatasetToken(),at),/position scenarios/);
});

test('all197 company vacancies can save and restore as two distinct compact scenarios without invented raw position facts',()=>{
 const h=setup(),companyIds=COMPANY_POSITION_INVENTORY.positions.filter(p=>p.status==='vacant').map(p=>p.id),draft=createPositionAllocation(companyIds,false,COMPANY_POSITION_INVENTORY);draft.input.hire=197;draft.input.budgetUsd=10000000;h.save(draft,'company-a');draft.input.budgetUsd=9000000;h.save(draft,'company-b');
 const snapshot=h.store.getSnapshot(),backup=encodeDecisionBackup(snapshot.data,h.store.getDatasetToken(),at),restored=parseDecisionBackup(backup,h.store.getDatasetToken());const records=restored.data.workspaces.a.fields[field].records;
 assert.equal(records.length,2);assert.equal(records[0].draft.input.selectedIds.length,197);assert.equal(records[0].draft.inventory.source,'aggregate-constrained-model');assert.equal(records[0].result.baseline.positionFte,null);assert.ok(h.raw().length<200000);assert.equal(records[0].draft.input.budgetUsd,10000000);
});
