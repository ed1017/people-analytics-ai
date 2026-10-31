import test from 'node:test';import assert from 'node:assert/strict';
import {DecisionStore} from '../lib/local-decisions.ts';
import {generateCompanyPositionInventoryV2} from '../lib/company-position-model-v2.ts';
import {DEMO_POSITION_INVENTORY} from '../lib/position-inventory.ts';
import {createPositionAllocation} from '../lib/position-allocation.ts';
import {savePositionScenario,POSITION_ALLOCATION_DRAFT_FIELD as D,POSITION_ALLOCATION_LEDGER_FIELD as A} from '../lib/position-allocation-store.ts';
import {POSITION_MARKET_FIELD as M,positionMarketEligibility,preparePositionMarketAdoption as prepare,confirmPositionMarketAdoption as confirm,updatePositionMarketDraft as edit,readPositionMarketLedger,currentPositionMarketEvidence,positionMarketForCapture} from '../lib/position-market-assumptions.ts';
import {preparePositionTrackingGoal,confirmPositionTrackingGoal} from '../lib/position-tracking-goal.ts';
import {encodeDecisionBackup,parseDecisionBackup} from '../lib/decision-backup.ts';
import {preparePositionResultTarget} from '../lib/position-result-targets.ts';
const at='2026-10-31T01:00:00.000Z';
const inventory=generateCompanyPositionInventoryV2();
const ids=inventory.positions.filter(p=>p.status==='vacant'&&p.role==='Frontend Software Engineer'&&p.countryCode==='US').map(p=>p.id);
function setup(){const values=new Map();let fail=false;const port={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('Quota');values.set(k,v)},removeItem:k=>values.delete(k)};const store=new DecisionStore();store.initialize(port);const datasetToken=store.getDatasetToken(),draft=createPositionAllocation(ids,false,inventory);draft.input.hire=1;draft.input.repurpose=0;draft.input.train=0;draft.input.hireMonth=3;draft.input.horizonMonths=6;store.setField('',D,draft);const options={store,datasetToken,goalId:''};const fields=()=>store.getSnapshot().data.exploration.fields;const ledger=()=>readPositionMarketLedger(fields()[M],datasetToken,'',fields()[A]);const review=(extra={})=>prepare({...options,draft:fields()[D],statistic:'median',employerOncostPercent:20,mappingConfirmed:true,fullTimeBasisConfirmed:true,...extra});const save=(scenarioId='one',baseRevision=0)=>savePositionScenario({...options,goal:'',revision:store.getSnapshot().data.revision,at,draft:fields()[D],scenarioId,baseRevision});return {store,datasetToken,draft,options,values,port,fields,ledger,review,save,fail:()=>{fail=true}};}
test('only exact supported US software vacancy scopes can adopt the national reference',()=>{
 assert.equal(ids.length,2);const h=setup(),eligible=positionMarketEligibility(h.draft);assert.equal(eligible.eligible,true);assert.equal(eligible.reference.medianUsd,135980);
 assert.ok(ids.every(id=>inventory.positions.find(p=>p.id===id).fte===1));
 const demo=createPositionAllocation(DEMO_POSITION_INVENTORY.positions.filter(p=>p.status==='vacant').slice(0,12).map(p=>p.id),true);assert.equal(positionMarketEligibility(demo).eligible,false);
 for(const position of [inventory.positions.find(p=>p.countryCode==='GB'&&p.status==='vacant'),inventory.positions.find(p=>p.countryCode==='US'&&p.role==='Accountant'&&p.status==='vacant'),inventory.positions.find(p=>p.status==='filled'&&p.role==='Frontend Software Engineer'&&p.countryCode==='US')])assert.equal(positionMarketEligibility(createPositionAllocation([position.id],false,inventory)).eligible,false);
 const mixed=[ids[0],inventory.positions.find(p=>p.countryCode==='US'&&p.role==='Accountant'&&p.status==='vacant').id];assert.equal(positionMarketEligibility(createPositionAllocation(mixed,false,inventory)).eligible,false);
});
test('review is pure; explicit adoption changes only annual cost and provenance atomically',()=>{
 const h=setup(),before=structuredClone(h.store.getSnapshot().data),ticket=h.review();assert.deepEqual(h.store.getSnapshot().data,before);assert.equal(ticket.annualCostUsd,163176);
 const updated=confirm({store:h.store,ticket,at});assert.deepEqual(updated,{...h.draft,input:{...h.draft.input,annualHireCostUsd:163176}});assert.equal(h.ledger().current.wageUsd,135980);assert.equal(h.ledger().current.employerOncostPercent,20);assert.equal(h.ledger().records.length,0);
 assert.throws(()=>confirm({store:h.store,ticket,at}));assert.equal(h.store.getSnapshot().saved,true);
 const capture=h.save();assert.equal(capture.result.cash.hirePayroll,54392);assert.equal(capture.result.cash.hiringFees,6000);assert.equal(positionMarketForCapture(h.ledger(),capture).annualCostUsd,163176);
});
test('mean and zero on-cost are explicit wage-only inputs; malformed choices reject',()=>{
 const h=setup(),ticket=h.review({statistic:'mean',employerOncostPercent:0});assert.equal(ticket.wageUsd,148100);assert.equal(ticket.annualCostUsd,148100);
 for(const extra of [{mappingConfirmed:false},{fullTimeBasisConfirmed:false},{statistic:'candidateCount'},{employerOncostPercent:-1},{employerOncostPercent:201},{employerOncostPercent:NaN},{employerOncostPercent:'20'}])assert.throws(()=>h.review(extra));
});
test('stale, forged, foreign and cross-goal tickets never apply',()=>{
 for(const kind of ['stale','forged','foreign','goal']){const h=setup(),ticket=h.review();if(kind==='stale')h.store.setField('','unrelated',1);if(kind==='goal')h.store.saveGoals({version:1,activeId:'another',goals:[{id:'another',statement:'Other'}]});const before=JSON.stringify([...h.values]);assert.throws(()=>confirm({store:kind==='foreign'?setup().store:h.store,ticket:kind==='forged'?{...ticket}:ticket,at}));assert.equal(JSON.stringify([...h.values]),before);assert.equal(h.store.getSnapshot().saved,true);}
});
test('annual references survive horizon edits; manual cost/scope edits clear current without erasing history',()=>{
 const h=setup();confirm({store:h.store,ticket:h.review(),at});const first=h.save();const history=structuredClone(h.ledger().records);
 let next=structuredClone(h.fields()[D]);next.input.horizonMonths=12;edit({...h.options,draft:next});assert.ok(currentPositionMarketEvidence(h.ledger(),next));const second=h.save('one',1);assert.equal(second.revision,2);assert.equal(second.result.cash.hirePayroll,135980);assert.equal(h.ledger().records.length,2);
 next=structuredClone(next);next.input.annualHireCostUsd=90000;edit({...h.options,draft:next});assert.equal(h.ledger().current,null);assert.deepEqual(h.ledger().records[0],history[0]);
 next.input.annualHireCostUsd=163176;edit({...h.options,draft:next});assert.equal(h.ledger().current,null);
 edit({...h.options,draft:first.draft,restoreCapture:first});assert.equal(h.ledger().current.annualCostUsd,163176);
 next=structuredClone(first.draft);next.input.selectedIds=[ids[0]];edit({...h.options,draft:next});assert.equal(h.ledger().current,null);assert.equal(h.ledger().records.length,2);
});
test('evidence-only changes create a new immutable revision; old saves remain compatible',()=>{
 const h=setup();let draft=structuredClone(h.fields()[D]);draft.input.annualHireCostUsd=163176;edit({...h.options,draft});const old=h.save();assert.equal(h.fields()[M],undefined);
 confirm({store:h.store,ticket:h.review(),at});const adopted=h.save('one',1);assert.equal(adopted.revision,2);assert.equal(positionMarketForCapture(h.ledger(),old),null);assert.ok(positionMarketForCapture(h.ledger(),adopted));assert.equal(h.save('one',2).revision,2);
});
test('saved reference bindings are validated during backup and tracking goal copy',()=>{
 const h=setup();confirm({store:h.store,ticket:h.review(),at});const capture=h.save(),original=structuredClone(h.store.getSnapshot().data.exploration);
 const ticket=preparePositionTrackingGoal({store:h.store,datasetToken:h.datasetToken});confirmPositionTrackingGoal({store:h.store,ticket,goalId:'track-market',at});const data=h.store.getSnapshot().data,fields=data.workspaces['track-market'].fields;assert.deepEqual(data.exploration,original);assert.deepEqual(fields[M].records,original.fields[M].records);assert.equal(fields[M].goalId,'track-market');assert.equal(fields[M].current,null);
 const target=preparePositionResultTarget(h.store,{scenarioId:capture.scenarioId,allocationRevision:capture.revision,financeRevision:null,date:'2027-04-30'});assert.equal(target.target.position.allocationRevision,1);
 const imported=parseDecisionBackup(encodeDecisionBackup(data,h.datasetToken,at),h.datasetToken);assert.deepEqual(imported.data.workspaces['track-market'].fields[M],fields[M]);
 for(const mutate of [v=>v.records[0].adoption.reference.medianUsd++,v=>v.records[0].adoption.selectedIds=[ids[0]],v=>v.records[0].allocationSignature+='x',v=>v.goalId='other',v=>v.records.push(v.records[0])]){const broken=structuredClone(data);mutate(broken.workspaces['track-market'].fields[M]);assert.throws(()=>encodeDecisionBackup(broken,h.datasetToken,at));}
});
test('quota and cross-tab failures preserve existing stored draft and do not publish adoption',()=>{
 for(const kind of ['quota','tab']){const h=setup(),ticket=h.review(),data=structuredClone(h.store.getSnapshot().data);if(kind==='quota')h.fail();else {const key=[...h.values.keys()][0];h.values.set(key,h.values.get(key)+' ');}const before=JSON.stringify([...h.values]);assert.throws(()=>confirm({store:h.store,ticket,at}));assert.equal(JSON.stringify([...h.values]),before);assert.deepEqual(h.store.getSnapshot().data,data);assert.equal(h.store.getSnapshot().saved,false);}
});
test('unknown annual cost clears applicability; old stale current data is retained but never matched',()=>{
 const h=setup();confirm({store:h.store,ticket:h.review(),at});h.save();const next=structuredClone(h.fields()[D]);next.input.annualHireCostUsd=null;
 // Older draft writers may leave the sidecar untouched: validation retains evidence but no current claim is returned.
 h.store.setField('',D,next);assert.equal(currentPositionMarketEvidence(h.ledger(),next),null);assert.doesNotThrow(()=>parseDecisionBackup(encodeDecisionBackup(h.store.getSnapshot().data,h.datasetToken,at),h.datasetToken));
 edit({...h.options,draft:next});assert.equal(h.ledger().current,null);assert.equal(h.ledger().records.length,1);
});
