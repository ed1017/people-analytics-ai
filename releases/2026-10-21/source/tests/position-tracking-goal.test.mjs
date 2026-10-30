import test from 'node:test';import assert from 'node:assert/strict';
import {DecisionStore} from '../lib/local-decisions.ts';
import {DEMO_POSITION_INVENTORY} from '../lib/position-inventory.ts';
import {createPositionAllocation} from '../lib/position-allocation.ts';
import {savePositionScenario,POSITION_ALLOCATION_LEDGER_FIELD as A,POSITION_ALLOCATION_DRAFT_FIELD as D} from '../lib/position-allocation-store.ts';
import {savePositionFinanceScenario,positionAllocationSignature,POSITION_FINANCE_LEDGER_FIELD as F} from '../lib/position-finance-store.ts';
import {POSITION_FINANCE_MODEL,unknownPositionFinance} from '../lib/position-finance-assessment.ts';
import {preparePositionTrackingGoal as prepare,confirmPositionTrackingGoal as confirm} from '../lib/position-tracking-goal.ts';
import {preparePositionResultTarget} from '../lib/position-result-targets.ts';
import {encodeDecisionBackup,parseDecisionBackup} from '../lib/decision-backup.ts';
const at='2026-10-30T12:00:00.000Z';
function setup(){
 const values=new Map();let fail=false;const port={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('Quota');values.set(k,v)},removeItem:k=>values.delete(k)};
 const store=new DecisionStore();store.initialize(port);const token=store.getDatasetToken();
 const ids=DEMO_POSITION_INVENTORY.positions.filter(p=>p.status==='vacant'&&p.vacancyStatus!=='frozen').slice(0,12).map(p=>p.id),draft=createPositionAllocation(ids,true);
 const context=()=>({store,datasetToken:token,goalId:'',goal:'',revision:store.getSnapshot().data.revision,at});
 const first=savePositionScenario({...context(),draft,scenarioId:'one'});draft.input.budgetUsd=90000;
 const second=savePositionScenario({...context(),draft,scenarioId:'one',baseRevision:1});
 savePositionFinanceScenario({...context(),scenarioId:'one',allocationRevision:2,allocationSignature:positionAllocationSignature(second.draft),input:{version:1,modelVersion:POSITION_FINANCE_MODEL,allocation:second.draft,finance:unknownPositionFinance(second.draft),addition:{count:1,ftePerPosition:0.5,incrementalCashAllowanceUsd:10000,availableFromMonth:2}}});
 store.setField('','chat.messages',[{role:'user',content:'Keep draft'}]);store.setField('',D,{unsaved:'must stay here'});
 const review=()=>prepare({store,datasetToken:token,scenarioId:'one',allocationRevision:2});
 return {store,token,port,values,review,first,second,fail:()=>{fail=true}};
}
test('pure review and confirmation preserve exploration, all revisions and funding signatures',()=>{
 const h=setup(),original=structuredClone(h.store.getSnapshot().data),before=JSON.stringify([...h.values]),ticket=h.review();
 assert.equal(JSON.stringify([...h.values]),before);assert.equal(ticket.revisionCount,2);assert.equal(ticket.financeRevisionCount,1);
 const result=confirm({store:h.store,ticket,goalId:'tracking-one',at});assert.equal(result.goal,'Track position scenarios');
 const data=h.store.getSnapshot().data,fields=data.workspaces[result.goalId].fields;
 assert.deepEqual(data.exploration,original.exploration);assert.deepEqual(fields[A].records,original.exploration.fields[A].records);assert.deepEqual(fields[F].records,original.exploration.fields[F].records);assert.equal(fields[A].goalId,result.goalId);assert.equal(fields[F].goalId,result.goalId);
 assert.deepEqual(fields[D],h.second.draft);assert.equal(fields['chat.messages'],undefined);assert.equal(fields[F].records[0].addition.ftePerPosition,0.5);
 assert.throws(()=>confirm({store:h.store,ticket,goalId:'tracking-two',at}));assert.equal(h.store.getSnapshot().saved,true);
 const target=preparePositionResultTarget(h.store,{scenarioId:'one',allocationRevision:2,financeRevision:1,date:'2027-01-31'});assert.equal(target.target.position.allocationSignature,positionAllocationSignature(h.second.draft));
 const backup=parseDecisionBackup(encodeDecisionBackup(data,h.token,at),h.token);assert.deepEqual(backup.data.workspaces[result.goalId].fields,fields);
 const reopened=new DecisionStore();reopened.initialize(h.port);assert.deepEqual(reopened.getSnapshot().data,data);
});
test('cancel is pure, omitted selection does not copy an editable draft, names avoid collisions',()=>{
 const h=setup();h.store.saveGoals({version:1,activeId:'',goals:[{id:'existing',statement:'Track position scenarios'}]});h.store.setField('existing','keep',true);
 const before=structuredClone(h.store.getSnapshot().data),ticket=prepare({store:h.store,datasetToken:h.token});assert.equal(ticket.goal,'Track position scenarios (2)');assert.deepEqual(h.store.getSnapshot().data,before);
 confirm({store:h.store,ticket,goalId:'new',at});assert.equal(h.store.getSnapshot().data.workspaces.new.fields[D],undefined);assert.deepEqual(h.store.getSnapshot().data.workspaces.existing,before.workspaces.existing);
});
test('preflight rejects stale, foreign, forged, colliding and invalid confirmations without dirtying store',()=>{
 for(const kind of ['stale','forged','collision','date','foreign']){const h=setup(),ticket=h.review();let store=h.store,id='new',stamp=at,t=ticket;if(kind==='stale')h.store.setField('','other',1);if(kind==='forged')t={...ticket};if(kind==='collision')id='bad id';if(kind==='date')stamp='2026-02-30T12:00:00.000Z';if(kind==='foreign')store=setup().store;const before=JSON.stringify([...h.values]);assert.throws(()=>confirm({store,ticket:t,goalId:id,at:stamp}));assert.equal(JSON.stringify([...h.values]),before);assert.equal(h.store.getSnapshot().saved,true);}
});
test('corrupt funding, allocation, source and full goals reject before any mutation',()=>{
 for(const kind of ['funding','allocation','dataset','limit']){const h=setup();if(kind==='funding')h.store.setField('',F,{broken:true});if(kind==='allocation')h.store.setField('',A,{broken:true});if(kind==='limit')h.store.saveGoals({version:1,activeId:'',goals:Array.from({length:20},(_,i)=>({id:`g${i}`,statement:`Goal ${i}`}))});const before=JSON.stringify([...h.values]);assert.throws(()=>prepare({store:h.store,datasetToken:kind==='dataset'?'wrong':h.token}));assert.equal(JSON.stringify([...h.values]),before);assert.equal(h.store.getSnapshot().saved,true);}
});
test('quota failure retains saved bytes and candidate never replaces exploration; recovery blocks another attempt',()=>{
 const h=setup(),ticket=h.review(),before=JSON.stringify([...h.values]),data=structuredClone(h.store.getSnapshot().data);h.fail();assert.throws(()=>confirm({store:h.store,ticket,goalId:'new',at}),/Quota/);assert.equal(JSON.stringify([...h.values]),before);assert.deepEqual(h.store.getSnapshot().data,data);assert.equal(h.store.getSnapshot().saved,false);assert.throws(()=>h.review(),/recovery/);
});

test('existing and removed identities cannot be reused; active goal changes preserve other work',()=>{
 for(const kind of ['existing','removed','active']){const h=setup();h.store.saveGoals({version:1,activeId:'',goals:[{id:'old',statement:'Existing goal'}]});if(kind==='removed')h.store.saveGoals({version:1,activeId:'',goals:[]});const ticket=h.review();if(kind==='active')h.store.saveGoals({...h.store.getSnapshot().data.goals,activeId:'old'});const data=structuredClone(h.store.getSnapshot().data),bytes=JSON.stringify([...h.values]);assert.throws(()=>confirm({store:h.store,ticket,goalId:'old',at}));assert.deepEqual(h.store.getSnapshot().data,data);assert.equal(JSON.stringify([...h.values]),bytes);assert.equal(h.store.getSnapshot().saved,true);}
});
test('another tab changing saved bytes cannot publish the reviewed candidate',()=>{
 const h=setup(),ticket=h.review(),key=[...h.values.keys()][0];h.values.set(key,h.values.get(key)+' ');const bytes=JSON.stringify([...h.values]),data=structuredClone(h.store.getSnapshot().data);assert.throws(()=>confirm({store:h.store,ticket,goalId:'new',at}),/Another tab/);assert.equal(JSON.stringify([...h.values]),bytes);assert.deepEqual(h.store.getSnapshot().data,data);assert.equal(h.store.getSnapshot().saved,false);
});
