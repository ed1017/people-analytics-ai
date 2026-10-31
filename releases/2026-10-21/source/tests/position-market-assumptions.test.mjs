import test from 'node:test';import assert from 'node:assert/strict';
import {DecisionStore} from '../lib/local-decisions.ts';
import {generateCompanyPositionInventoryV2} from '../lib/company-position-model-v2.ts';
import {DEMO_POSITION_INVENTORY} from '../lib/position-inventory.ts';
import {createPositionAllocation} from '../lib/position-allocation.ts';
import {savePositionScenario,POSITION_ALLOCATION_DRAFT_FIELD as D,POSITION_ALLOCATION_LEDGER_FIELD as A} from '../lib/position-allocation-store.ts';
import {POSITION_MARKET_FIELD as M,POSITION_MARKET_REFERENCE,POSITION_MARKET_BI_REFERENCE,POSITION_MARKET_UK_REFERENCE,positionMarketNativeAmounts,positionMarketEligibility,preparePositionMarketAdoption as prepare,confirmPositionMarketAdoption as confirm,updatePositionMarketDraft as edit,readPositionMarketLedger,currentPositionMarketEvidence,positionMarketForCapture} from '../lib/position-market-assumptions.ts';
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
const fx={basis:'user-assumption',from:'GBP',to:'USD',usdPerGbp:1.25,date:'2026-10-30',confirmed:true};
function scoped(role,country){const h=setup(),positions=inventory.positions.filter(p=>p.role===role&&p.countryCode===country&&p.status==='vacant');assert.ok(positions.length);const draft=createPositionAllocation(positions.map(p=>p.id),false,inventory);draft.input.hire=1;h.store.setField('',D,draft);return h;}
test('expanded mappings cover exactly six of197 real modeled vacancies, with no fuzzy fallback',()=>{
 const vacancies=inventory.positions.filter(p=>p.status==='vacant');assert.equal(vacancies.length,197);
 const eligible=vacancies.filter(p=>positionMarketEligibility(createPositionAllocation([p.id],false,inventory)).eligible);assert.equal(eligible.length,6);
 assert.equal(eligible.filter(p=>p.countryCode==='US'&&p.role==='Frontend Software Engineer').length,2);
 assert.equal(eligible.filter(p=>p.countryCode==='US'&&p.role==='Business Intelligence Analyst').length,1);
 assert.deepEqual(eligible.filter(p=>p.countryCode==='GB').map(p=>p.role).sort(),['Backend Software Engineer','Frontend Software Engineer','Software Engineer']);
 for(const role of ['Business Intelligence Developer','Machine Learning Engineer','Data Engineer']){const h=scoped(role,'US');assert.equal(positionMarketEligibility(h.fields()[D]).eligible,false);assert.throws(()=>h.review());}
 const mixed=[...scoped('Frontend Software Engineer','US').fields()[D].input.selectedIds,...scoped('Frontend Software Engineer','GB').fields()[D].input.selectedIds];assert.equal(positionMarketEligibility(createPositionAllocation(mixed,false,inventory)).eligible,false);
 const ukMixed=eligible.filter(p=>p.countryCode==='GB').map(p=>p.id);assert.equal(positionMarketEligibility(createPositionAllocation(ukMixed,false,inventory)).eligible,false);
});
test('legacy software adoption emits unchanged v1 shape and preserves source reference byte semantics',()=>{
 const h=setup();confirm({store:h.store,ticket:h.review(),at});const old=h.ledger().current;
 assert.equal(old.version,1);assert.deepEqual(Object.keys(old),['version','sourceVersion','reference','inventoryVersion','inventoryKey','selectedIds','role','statistic','wageUsd','employerOncostPercent','annualCostUsd','mappingConfirmed','fullTimeBasisConfirmed','adoptedAt']);
 assert.equal(JSON.stringify(old.reference),JSON.stringify(POSITION_MARKET_REFERENCE));assert.equal('nativeCurrency' in old,false);assert.equal('fx' in old,false);
 h.save();const before=JSON.stringify(h.ledger());parseDecisionBackup(encodeDecisionBackup(h.store.getSnapshot().data,h.datasetToken,at),h.datasetToken);assert.equal(JSON.stringify(h.ledger()),before);
});
test('BI uses broader Data Scientists pay with nativeUSD and no currency conversion',()=>{
 const h=scoped('Business Intelligence Analyst','US'),e=positionMarketEligibility(h.fields()[D]);assert.equal(e.reference,POSITION_MARKET_BI_REFERENCE);assert.equal(e.reference.mappingScope,'broader-occupation');assert.equal(e.reference.occupationCode,'15-2051');assert.equal(e.reference.mappingOccupationCode,'15-2051.01');
 const ticket=h.review({statistic:'mean',employerOncostPercent:10});assert.equal(ticket.nativeWage,126800);assert.equal(ticket.nativeCurrency,'USD');assert.equal(ticket.annualCostUsd,139480);assert.equal(ticket.fx,null);assert.throws(()=>h.review({fx}));
 confirm({store:h.store,ticket,at});const record=h.save();assert.equal(h.ledger().current.version,2);assert.equal(positionMarketForCapture(h.ledger(),record).reference.occupation,'Data Scientists');
});
test('UK retains native gross pay and explicit datedFX; rounds only final USD annual amount',()=>{
 const h=scoped('Backend Software Engineer','GB');assert.equal(positionMarketEligibility(h.fields()[D]).reference,POSITION_MARKET_UK_REFERENCE);assert.deepEqual(positionMarketNativeAmounts(POSITION_MARKET_UK_REFERENCE),{currency:'GBP',median:59862.5,mean:69120.6});
 assert.throws(()=>h.review());const ticket=h.review({fx:{...fx,usdPerGbp:1.234567},employerOncostPercent:17.5});assert.equal(ticket.nativeWage,59862.5);assert.equal(ticket.wageUsd,59862.5*1.234567);assert.equal(ticket.annualCostUsd,Math.round((59862.5*1.234567*1.175+Number.EPSILON)*100)/100);assert.equal(Object.isFrozen(ticket.fx),true);
 confirm({store:h.store,ticket,at});const first=h.save(),a=positionMarketForCapture(h.ledger(),first);assert.equal(a.version,2);assert.equal(a.nativeCurrency,'GBP');assert.equal(a.nativeWage,59862.5);assert.equal(a.fx.from,'GBP');assert.equal(a.fx.to,'USD');assert.equal(a.fx.date,'2026-10-30');
 let next=structuredClone(h.fields()[D]);next.input.horizonMonths=12;edit({...h.options,draft:next});assert.ok(currentPositionMarketEvidence(h.ledger(),next));h.save('one',1);assert.deepEqual(positionMarketForCapture(h.ledger(),first),a);
 next.input.annualHireCostUsd=null;edit({...h.options,draft:next});assert.equal(h.ledger().current,null);edit({...h.options,draft:first.draft,restoreCapture:first});assert.deepEqual(h.ledger().current,a);
});
test('UK missing, reversed, zero, future, invalid and unconfirmedFX fail without mutating state',()=>{
 const h=scoped('Software Engineer','GB'),before=JSON.stringify([...h.values]);
 for(const input of [undefined,null,{...fx,usdPerGbp:0},{...fx,usdPerGbp:-1},{...fx,usdPerGbp:10.01},{...fx,usdPerGbp:Infinity},{...fx,usdPerGbp:'1.25'},{...fx,from:'USD',to:'GBP'},{...fx,basis:'official-rate'},{...fx,confirmed:false},{...fx,date:'2026-02-30'},{...fx,date:'2099-01-01'},{...fx,extra:true}])assert.throws(()=>h.review({fx:input}));
 assert.equal(JSON.stringify([...h.values]),before);const ticket=h.review({fx});assert.throws(()=>confirm({store:h.store,ticket,at:'2026-10-29T00:00:00.000Z'}));assert.equal(JSON.stringify([...h.values]),before);
});
test('v2 backups and goal promotion retain source/FX versions and reject changed source, rates or scope',()=>{
 for(const [role,country,input] of [['Business Intelligence Analyst','US',null],['Frontend Software Engineer','GB',fx]]){
  const h=scoped(role,country);confirm({store:h.store,ticket:h.review({fx:input}),at});h.save();const original=structuredClone(h.store.getSnapshot().data.exploration),ticket=preparePositionTrackingGoal({store:h.store,datasetToken:h.datasetToken});confirmPositionTrackingGoal({store:h.store,ticket,goalId:'new-market',at});const data=h.store.getSnapshot().data,fields=data.workspaces['new-market'].fields;
  assert.deepEqual(data.exploration,original);assert.deepEqual(fields[M].records,original.fields[M].records);assert.equal(fields[M].current,null);assert.doesNotThrow(()=>preparePositionResultTarget(h.store,{scenarioId:'one',allocationRevision:1,financeRevision:null,date:'2027-04-30'}));assert.deepEqual(parseDecisionBackup(encodeDecisionBackup(data,h.datasetToken,at),h.datasetToken).data,data);
  for(const change of [a=>a.reference.sourceSha256='bad',a=>a.reference.occupationCode='15-1252',a=>a.nativeCurrency='CAD',a=>a.nativeWage++,a=>a.wageUsd++,a=>a.sourceVersion='unknown',a=>a.annualCostUsd++,a=>a.reference.period='May 2026',a=>a.fx=input?{...fx,usdPerGbp:1.26}:fx]){const bad=structuredClone(data);change(bad.workspaces['new-market'].fields[M].records[0].adoption);assert.throws(()=>encodeDecisionBackup(bad,h.datasetToken,at));}
 }
});
