import test from 'node:test';import assert from 'node:assert/strict';
import {DecisionStore,encodeDecisions,parseDecisions} from '../lib/local-decisions.ts';
import {DEMO_POSITION_INVENTORY} from '../lib/position-inventory.ts';
import {createPositionAllocation} from '../lib/position-allocation.ts';
import {savePositionScenario,POSITION_ALLOCATION_LEDGER_FIELD as allocationField} from '../lib/position-allocation-store.ts';
import {POSITION_FINANCE_MODEL,unknownPositionFinance,noPositionAddition,assessPositionFinance} from '../lib/position-finance-assessment.ts';
import {savePositionFinanceScenario,readPositionFinanceLedger,positionFinanceForAllocation,positionAllocationSignature,buildPositionFinanceCapture,POSITION_FINANCE_LEDGER_FIELD as financeField} from '../lib/position-finance-store.ts';
import {encodeDecisionBackup,parseDecisionBackup} from '../lib/decision-backup.ts';
const at='2026-10-30T02:00:00.000Z',ids=DEMO_POSITION_INVENTORY.positions.filter(p=>p.status==='vacant'&&p.vacancyStatus!=='frozen').map(p=>p.id);
function setup(exploration=false){
 let raw=null,fail=false;const port={getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('Quota');raw=v},removeItem:()=>{raw=null}};
 const store=new DecisionStore();store.initialize(port);store.saveGoals({version:1,activeId:exploration?'':'a',goals:[{id:'a',statement:'Goal A'},{id:'b',statement:'Goal B'}]});store.setField('b','savedPlan',{keep:true});
 const goalId=exploration?'':'a',goal=exploration?'':'Goal A',context=()=>({store,datasetToken:store.getDatasetToken(),goalId,goal,revision:store.getSnapshot().data.revision,at});
 const saveAllocation=(draft=createPositionAllocation(ids,true),scenarioId='one',baseRevision=0)=>savePositionScenario({...context(),draft,scenarioId,baseRevision});
 const allocation=saveAllocation();
 const assessment=()=>({version:1,modelVersion:POSITION_FINANCE_MODEL,allocation:structuredClone(allocation.draft),finance:unknownPositionFinance(allocation.draft),addition:noPositionAddition()});
 const options=(input=assessment(),baseFinanceRevision=0,source=allocation)=>({...context(),scenarioId:source.scenarioId,allocationRevision:source.revision,allocationSignature:positionAllocationSignature(source.draft),input,baseFinanceRevision});
 const save=(input=assessment(),base=0,source=allocation)=>savePositionFinanceScenario(options(input,base,source));
 const read=()=>readPositionFinanceLedger(store.getField(goalId,financeField),store.getDatasetToken(),goalId,store.getField(goalId,allocationField));
 return {store,port,goalId,goal,allocation,assessment,options,save,read,saveAllocation,raw:()=>raw,fail:()=>{fail=true},externalChange:()=>{raw+=' '}};
}
test('Finance-only revisions retain v1 records, other goals and prior comparisons through reload',()=>{
 const h=setup(),original=structuredClone(h.store.getField('a',allocationField)),first=h.save(),input=h.assessment();input.addition={count:2,ftePerPosition:1,incrementalCashAllowanceUsd:20000,availableFromMonth:3};const second=h.save(input,1);
 assert.equal(first.revision,1);assert.equal(second.revision,2);assert.equal(first.result.status,'funding-unknown');assert.equal(second.result.status,'approval-required');assert.deepEqual(h.store.getField('a',allocationField),original);
 const reopened=new DecisionStore();reopened.initialize(h.port);const ledger=readPositionFinanceLedger(reopened.getField('a',financeField),reopened.getDatasetToken(),'a',reopened.getField('a',allocationField));assert.deepEqual(ledger.records,[first,second]);assert.deepEqual(reopened.getField('b','savedPlan'),{keep:true});
});
test('repeated saves are idempotent and exploration needs no mandatory text goal',()=>{
 for(const exploration of [false,true]){const h=setup(exploration),first=h.save();assert.deepEqual(h.save(h.assessment(),1),first);assert.equal(h.read().records.length,1);assert.equal(h.read().goalId,exploration?'':'a');}
});
test('different saved allocation revisions have exact references; old Finance does not bleed onto a new draft',()=>{
 const h=setup();const first=h.save(),draft=structuredClone(h.allocation.draft);draft.input.budgetUsd=100000;const secondAllocation=h.saveAllocation(draft,'one',1);
 assert.equal(positionFinanceForAllocation(h.read(),'one',2),null);const input=h.assessment();input.allocation=secondAllocation.draft;input.finance=unknownPositionFinance(secondAllocation.draft);const next=h.save(input,1,secondAllocation);
 assert.equal(next.allocationRevision,2);assert.equal(positionFinanceForAllocation(h.read(),'one',1).revision,first.revision);assert.equal(positionFinanceForAllocation(h.read(),'one',2).revision,2);assert.equal(h.read().records.length,2);
});
test('mismatched allocation signatures, drafts, missing revisions and stale Finance bases never write',()=>{
 for(const kind of ['signature','input','revision','scenario','stale']){const h=setup();h.save();const options=h.options(h.assessment(),1);if(kind==='signature')options.allocationSignature='wrong';if(kind==='input')options.input.allocation.input.hireFeeUsd=1;if(kind==='revision')options.allocationRevision=99;if(kind==='scenario')options.scenarioId='absent';if(kind==='stale')options.baseFinanceRevision=0;const before=h.raw();assert.throws(()=>savePositionFinanceScenario(options));assert.equal(h.raw(),before);}
});
test('malformed extension, invented result and detached allocation references fail closed without defaulting old work',()=>{
 const h=setup();h.save();const allocations=h.store.getField('a',allocationField),original=h.read();
 for(const kind of ['result','reference','version','sequence','date','key','foreign-goal']){const ledger=structuredClone(original);if(kind==='result')ledger.records[0].result.requiredCashUsd=1;if(kind==='reference')ledger.records[0].allocationRevision=99;if(kind==='version')ledger.version=2;if(kind==='sequence')ledger.records[0].sequence=2;if(kind==='date')ledger.records[0].savedAt='2026-02-30T02:00:00.000Z';if(kind==='key')ledger.records[0].extra='bad';if(kind==='foreign-goal')ledger.goalId='b';assert.equal(readPositionFinanceLedger(ledger,h.store.getDatasetToken(),'a',allocations),null);}
 assert.equal(readPositionFinanceLedger(original,h.store.getDatasetToken(),'a',undefined),null);assert.equal(readPositionFinanceLedger(original,'wrong','a',allocations),null);assert.equal(readPositionFinanceLedger(undefined,h.store.getDatasetToken(),'a',allocations).records.length,0);
});
test('quota, another tab, wrong dataset and switched goals preserve all saved bytes and in-memory records',()=>{
 for(const kind of ['quota','tab','dataset','goal']){const h=setup();h.save();if(kind==='quota')h.fail();if(kind==='tab')h.externalChange();if(kind==='goal')h.store.saveGoals({...h.store.getSnapshot().data.goals,activeId:'b'});const options=h.options(h.assessment(),1);options.input.addition={count:1,ftePerPosition:1,incrementalCashAllowanceUsd:0,availableFromMonth:2};if(kind==='dataset')options.datasetToken='other';const before=h.raw(),snapshot=structuredClone(h.store.getSnapshot().data);assert.throws(()=>savePositionFinanceScenario(options));assert.equal(h.raw(),before);assert.deepEqual(h.store.getSnapshot().data,snapshot);}
});
test('transaction builder only returns additive field and can compose with a candidate allocation ledger',()=>{
 const h=setup(),fields=structuredClone(h.store.getSnapshot().data.workspaces.a.fields),result=buildPositionFinanceCapture(fields,h.options());assert.deepEqual(Object.keys(result.patch),[financeField]);assert.equal(fields[financeField],undefined);assert.equal(result.capture.allocationSignature,positionAllocationSignature(h.allocation.draft));
});
test('portable backup retains extension bytes; explicit finance validator verifies relationships on reopened payload',()=>{
 const h=setup();h.save();const backup=encodeDecisionBackup(h.store.getSnapshot().data,h.store.getDatasetToken(),at),parsed=parseDecisionBackup(backup,h.store.getDatasetToken()),fields=parsed.data.workspaces.a.fields;
 assert.deepEqual(fields[financeField],h.read());assert.deepEqual(readPositionFinanceLedger(fields[financeField],h.store.getDatasetToken(),'a',fields[allocationField]),h.read());
 // Backup validation checks the new field against the same saved allocation ledger.
 const bad=structuredClone(fields[financeField]);bad.records[0].allocationSignature='other';assert.equal(readPositionFinanceLedger(bad,h.store.getDatasetToken(),'a',fields[allocationField]),null);const corrupt=structuredClone(parsed.data);corrupt.workspaces.a.fields[financeField]=bad;assert.throws(()=>encodeDecisionBackup(corrupt,h.store.getDatasetToken(),at),/funding comparisons/);const detached=structuredClone(parsed.data);delete detached.workspaces.a.fields[allocationField];assert.throws(()=>encodeDecisionBackup(detached,h.store.getDatasetToken(),at),/funding comparisons/);
});
test('capture limit and invalid timestamps fail without erasing prior Finance revisions',()=>{
 const h=setup();for(let i=0;i<20;i++){const input=h.assessment();input.addition={count:i+1,ftePerPosition:1,incrementalCashAllowanceUsd:i,availableFromMonth:2};h.save(input,i);}const before=h.raw();const input=h.assessment();input.addition={count:21,ftePerPosition:1,incrementalCashAllowanceUsd:21,availableFromMonth:2};assert.throws(()=>h.save(input,20),/limit/);assert.equal(h.raw(),before);
 const another=setup(),options=another.options();options.at='2026-02-30T02:00:00.000Z';assert.throws(()=>savePositionFinanceScenario(options),/timestamp/);
});

test('client save cannot manufacture verified Finance approval even with matching evidence and recalculated costs',()=>{
 const h=setup(),input=h.assessment();Object.assign(input.finance,{basis:'approved-source',reference:'Client-supplied Finance approval claim',fundedPositionIds:[...ids],incrementalFundingUsd:150000});
 assert.equal(assessPositionFinance(input).status,'within-supplied-approved-envelope'); // Pure calculation is not authentication.
 const before=h.raw();assert.throws(()=>h.save(input),/cannot be created/);assert.equal(h.raw(),before);assert.equal(h.store.getField('a',financeField),undefined);
});
test('direct local records and valid-checksum imports cannot certify client-asserted approved-source',()=>{
 const h=setup();h.save();const data=structuredClone(h.store.getSnapshot().data),f=data.workspaces.a.fields,row=f[financeField].records[0];
 Object.assign(row.finance,{basis:'approved-source',reference:'Fabricated but well-shaped Finance approval',fundedPositionIds:[...ids],incrementalFundingUsd:150000});
 const {allocation:ignoredAllocation,evidence:ignoredEvidence,...recomputed}=assessPositionFinance({version:1,modelVersion:POSITION_FINANCE_MODEL,allocation:h.allocation.draft,finance:row.finance,addition:row.addition});row.result=recomputed;
 assert.equal(row.result.status,'within-supplied-approved-envelope');assert.equal(readPositionFinanceLedger(f[financeField],h.store.getDatasetToken(),'a',f[allocationField]),null);
 const envelope=encodeDecisions(data);assert.deepEqual(parseDecisions(envelope).workspaces.a.fields[financeField],f[financeField]);
 const crafted=JSON.stringify({format:'workforce-decision-backup',version:1,datasetToken:h.store.getDatasetToken(),createdAt:at,decisions:envelope});
 assert.throws(()=>parseDecisionBackup(crafted,h.store.getDatasetToken()),/funding comparisons/);assert.throws(()=>encodeDecisionBackup(data,h.store.getDatasetToken(),at),/funding comparisons/);
 const original=h.raw();h.store.setField('a',financeField,f[financeField]);const stored=h.raw();assert.notEqual(stored,original);assert.equal(h.read(),null);assert.equal(h.raw(),stored); // Retained unreadable, never silently certified or deleted.
 const reopened=new DecisionStore();reopened.initialize(h.port);assert.deepEqual(reopened.getField('a',allocationField),f[allocationField]);assert.equal(readPositionFinanceLedger(reopened.getField('a',financeField),reopened.getDatasetToken(),'a',reopened.getField('a',allocationField)),null);
});
test('legacy allocations and explicit demo assumptions remain portable after the approval boundary is tightened',()=>{
 const h=setup(),legacy=encodeDecisionBackup(h.store.getSnapshot().data,h.store.getDatasetToken(),at);assert.equal(parseDecisionBackup(legacy,h.store.getDatasetToken()).data.workspaces.a.fields[financeField],undefined);
 const input=h.assessment();Object.assign(input.finance,{basis:'illustrative-demo',reference:'Explicit demo funding assumption',fundedPositionIds:[...ids],incrementalFundingUsd:150000});h.save(input);const backup=encodeDecisionBackup(h.store.getSnapshot().data,h.store.getDatasetToken(),at);assert.equal(parseDecisionBackup(backup,h.store.getDatasetToken()).data.workspaces.a.fields[financeField].records[0].result.status,'within-demo-envelope');
});
