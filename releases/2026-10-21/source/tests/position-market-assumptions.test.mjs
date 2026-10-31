import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import test from 'node:test';import assert from 'node:assert/strict';
import {DecisionStore} from '../lib/local-decisions.ts';
import {generateCompanyPositionInventoryV2} from '../lib/company-position-model-v2.ts';
import {DEMO_POSITION_INVENTORY} from '../lib/position-inventory.ts';
import {createPositionAllocation} from '../lib/position-allocation.ts';
import {savePositionScenario,POSITION_ALLOCATION_DRAFT_FIELD as D,POSITION_ALLOCATION_LEDGER_FIELD as A} from '../lib/position-allocation-store.ts';
import {POSITION_MARKET_FIELD as M,POSITION_MARKET_REFERENCE,POSITION_MARKET_BI_REFERENCE,POSITION_MARKET_UK_REFERENCE,POSITION_MARKET_UK_ADDITIONAL_REFERENCES,POSITION_MARKET_US_ADDITIONAL_REFERENCES,positionMarketNativeAmounts,positionMarketEligibility,preparePositionMarketAdoption as prepare,confirmPositionMarketAdoption as confirm,updatePositionMarketDraft as edit,readPositionMarketLedger,currentPositionMarketEvidence,positionMarketForCapture} from '../lib/position-market-assumptions.ts';
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
 for(const position of [inventory.positions.find(p=>p.countryCode==='GB'&&p.role==='Corporate Development Analyst'&&p.status==='vacant'),inventory.positions.find(p=>p.countryCode==='US'&&p.role==='Financial Planning and Analysis Analyst'&&p.status==='vacant'),inventory.positions.find(p=>p.status==='filled'&&p.role==='Frontend Software Engineer'&&p.countryCode==='US')])assert.equal(positionMarketEligibility(createPositionAllocation([position.id],false,inventory)).eligible,false);
 const mixed=[ids[0],inventory.positions.find(p=>p.countryCode==='US'&&p.role==='Financial Planning and Analysis Analyst'&&p.status==='vacant').id];assert.equal(positionMarketEligibility(createPositionAllocation(mixed,false,inventory)).eligible,false);
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
test('expanded mappings cover exactly forty of197 real modeled vacancies, with no fuzzy fallback',()=>{
 const vacancies=inventory.positions.filter(p=>p.status==='vacant');assert.equal(vacancies.length,197);
 const eligible=vacancies.filter(p=>positionMarketEligibility(createPositionAllocation([p.id],false,inventory)).eligible);assert.equal(eligible.length,40);
 assert.equal(eligible.filter(p=>p.countryCode==='US'&&p.role==='Frontend Software Engineer').length,2);
 assert.equal(eligible.filter(p=>p.countryCode==='US'&&p.role==='Business Intelligence Analyst').length,1);
 assert.equal(eligible.filter(p=>p.countryCode==='GB').length,9);
 for(const role of ['HR Systems Specialist','Machine Learning Engineer','People Analytics Analyst']){const h=scoped(role,'US');assert.equal(positionMarketEligibility(h.fields()[D]).eligible,false);assert.throws(()=>h.review());}
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

const additionalCases=[['Legal Counsel','2412',3,57197.9,74738.3,7.7,6.3],['Cybersecurity Engineer','2135',1,55372.7,65521.6,6.2,5.3],['HR Business Partner','1136',1,61445.2,75399.7,3.8,4],['Talent Acquisition Specialist','3571',1,36612.2,42101.3,4.3,4.1]];
test('additional UK references pin exact reviewed pay, population, cells and broader mapping consent',()=>{
 assert.equal(POSITION_MARKET_UK_ADDITIONAL_REFERENCES.length,4);
 for(const [role,code,count,median,mean,medianCv,meanCv] of additionalCases){
  const h=scoped(role,'GB'),ref=positionMarketEligibility(h.fields()[D]).reference;
  assert.equal(h.fields()[D].input.selectedIds.length,count);assert.equal(ref.occupationCode,code);assert.equal(ref.mappedRole,role);assert.equal(ref.socMajorGroup,code[0]);assert.equal(ref.mappingScope,'broader-occupation');
  assert.deepEqual(positionMarketNativeAmounts(ref),{currency:'GBP',median,mean});assert.equal(ref.medianCvPercent,medianCv);assert.equal(ref.meanCvPercent,meanCv);assert.equal(ref.sourceSheet,'Full-Time');assert.match(ref.payWorkbook,/14.7a/);assert.match(ref.cvWorkbook,/14.7b/);assert.match(ref.mappingSourceUrl,/soc2020.*pdf/);assert.equal(Object.isFrozen(ref),true);
  assert.throws(()=>h.review({fx,mappingConfirmed:false}));assert.throws(()=>h.review({fx:null}));
  for(const statistic of ['median','mean']){const ticket=h.review({fx,statistic,employerOncostPercent:20});assert.equal(ticket.nativeWage,statistic==='median'?median:mean);assert.equal(ticket.annualCostUsd,Math.round(((statistic==='median'?median:mean)*1.25*1.2+Number.EPSILON)*100)/100);}
 }
 for(const role of ['Corporate Development Analyst','Accountant','Talent Management Specialist','Quality Assurance Engineer'])assert.equal(positionMarketEligibility(scoped(role,'GB').fields()[D]).eligible,false);
});
test('additional UK adoption preserves allocation inputs, immutable captures, backup and tracking bindings',()=>{
 for(const [role] of additionalCases){
  const h=scoped(role,'GB'),before=structuredClone(h.fields()[D]),ticket=h.review({fx});const updated=confirm({store:h.store,ticket,at});assert.deepEqual(updated,{...before,input:{...before.input,annualHireCostUsd:ticket.annualCostUsd}});
  const capture=h.save(),evidence=positionMarketForCapture(h.ledger(),capture);assert.equal(evidence.version,2);assert.equal(evidence.nativeCurrency,'GBP');
  const next=structuredClone(updated);next.input.annualHireCostUsd=null;edit({...h.options,draft:next});assert.equal(currentPositionMarketEvidence(h.ledger(),next),null);assert.deepEqual(positionMarketForCapture(h.ledger(),capture),evidence);
  const promote=preparePositionTrackingGoal({store:h.store,datasetToken:h.datasetToken});confirmPositionTrackingGoal({store:h.store,ticket:promote,goalId:'additional-uk',at});const data=h.store.getSnapshot().data;
  assert.deepEqual(parseDecisionBackup(encodeDecisionBackup(data,h.datasetToken,at),h.datasetToken).data,data);
  for(const mutate of [a=>a.reference.meanNative++,a=>a.reference.medianCvPercent=21,a=>a.reference.socMajorGroup='2x',a=>a.reference.mappedRole='Accountant',a=>a.reference.medianCell='D1',a=>a.nativeCurrency='USD']){const bad=structuredClone(data);mutate(bad.workspaces['additional-uk'].fields[M].records[0].adoption);assert.throws(()=>encodeDecisionBackup(bad,h.datasetToken,at));}
 }
});

test('legacy reference definitions retain exact prior UTF-8 bytes',()=>{
 const text=readFileSync(new URL('../lib/position-market-assumptions.ts',import.meta.url),'utf8');
 const expected={"POSITION_MARKET_REFERENCE": "1e939625ea4e9d9783d0740691d3ab6ff9af21839957ad6f75ad3b1a9eb1ead7", "POSITION_MARKET_BI_REFERENCE": "ef50f4d467e1bba5b187ac406361c69ef537a79cd717b367163749456b3c2e0c", "POSITION_MARKET_UK_REFERENCE": "4dff9137bde6501e94ea4b257105a043b8b7efab0047da325d9a3e80220b9406"};
 for(const [name,hash] of Object.entries(expected)){const block=text.match(new RegExp('export const '+name+'=Object.freeze\\(\\{[\\s\\S]*?\\n\\}\\);'))?.[0];assert.ok(block);assert.equal(createHash('sha256').update(block).digest('hex'),hash);}
});
test('reviewed fixture and emitted references agree on every source cell and estimate',()=>{
 const fixture=JSON.parse(readFileSync(new URL('../lib/data/ons-ashe2026-position-pay.json',import.meta.url),'utf8'));
 assert.equal(fixture.archiveSha256,'4719f364d596739679d1bb492a1fc42e4c8e980a5b93ffc791e350f4ba8f4f1d');assert.equal(fixture.payWorkbookSha256,'a26908bc4e68162649c3de46b5fdfad051adcb87f256c5f667c7e4e23d0e230a');assert.equal(fixture.cvWorkbookSha256,'124e8532d4abc6a4ab18f91f8b8ea5d97d191e6139dce7bc9d7a8a4770c695eb');
 for(const row of fixture.rows){const ref=POSITION_MARKET_UK_ADDITIONAL_REFERENCES.find(r=>r.mappedRole===row.role);for(const key of ['occupationCode','occupation','socMajorGroup','medianNative','meanNative','medianCvPercent','meanCvPercent','medianCell','meanCell','mappingSourceUrl','mappingPages'])assert.equal(ref[key],row[key]);}
});

const usCases=[['Accountant','13-2011',3,83680,94750],['Privacy Counsel','23-1011',3,159670,185840],['Legal Counsel','23-1011',1,159670,185840],['Project Manager','13-1082',3,102320,110740],['User Experience Designer','15-1255',3,104000,117490],['Information Security Analyst','15-1212',2,129180,132510],['Management Consultant','13-1111',2,101860,113790],['Communications Specialist','27-3031',2,74750,84120],['Data Architect','15-1243',2,139500,144440],['Total Rewards Specialist','13-1141',1,78210,84330]];
test('reviewed US source retains raw cells, flags, suppression definitions and original-workbook identity',()=>{
 const fixture=JSON.parse(readFileSync(new URL('../lib/data/oews-may2025-position-pay.json',import.meta.url),'utf8'));
 assert.equal(fixture.source.sha256,'852250997ceff9b721ff68f63e877d818f9c1ec8b1b69dd367958faedd5282b2');assert.equal(fixture.source.byteCount,289615);assert.equal(fixture.records.length,13);
 for(const row of fixture.records){assert.equal(row.raw.AREA,'99');assert.equal(row.raw.NAICS,'000000');assert.equal(row.raw.OWN_CODE,'1235');assert.equal(row.raw.I_GROUP,'cross-industry');assert.equal(row.raw.O_GROUP,'detailed');assert.equal(row.raw.ANNUAL,'');assert.equal(row.raw.HOURLY,'');assert.equal(row.cells.A_MEDIAN,`AB${row.row}`);assert.equal(row.cells.A_MEAN,`S${row.row}`);assert.equal(typeof row.raw.A_MEDIAN,'string');}
 for(const [soc,median,mean] of [['15-1252',135980,148100],['15-2051',120230,126800],['29-1141',97550,101420]]){const control=fixture.records.find(r=>r.raw.OCC_CODE===soc);assert.equal(control.purpose,'parity_control');assert.equal(Number(control.raw.A_MEDIAN),median);assert.equal(Number(control.raw.A_MEAN),mean);}
 assert.ok(fixture.sourceNotes.some(r=>r.text.includes('239,200')));assert.ok(fixture.sourceNotes.some(r=>r.text.startsWith('* ')));assert.ok(fixture.fieldDefinitions.ANNUAL.definition.includes('TRUE'));
});
test('US exact-role national references cover22 additional vacancies with reviewed wages and noFX',()=>{
 assert.equal(POSITION_MARKET_US_ADDITIONAL_REFERENCES.length,14);let count=0;
 for(const [role,soc,n,median,mean] of usCases){const h=scoped(role,'US'),ref=positionMarketEligibility(h.fields()[D]).reference;assert.equal(h.fields()[D].input.selectedIds.length,n);count+=n;
 assert.equal(ref.occupationCode,soc);assert.equal(ref.mappedRole,role);assert.equal(ref.mappingScope,'broader-occupation');assert.equal(ref.area,'99');assert.equal(ref.sourceSha256,'852250997ceff9b721ff68f63e877d818f9c1ec8b1b69dd367958faedd5282b2');assert.equal(ref.annualFlag,'');assert.equal(ref.hourlyFlag,'');assert.ok(ref.mappingDuties.length);assert.ok(ref.mappingLimit.length);
 assert.deepEqual(positionMarketNativeAmounts(ref),{currency:'USD',median,mean});assert.throws(()=>h.review({fx}));assert.throws(()=>h.review({mappingConfirmed:false}));
 for(const statistic of ['median','mean']){const ticket=h.review({statistic,employerOncostPercent:20});assert.equal(ticket.annualCostUsd,Math.round(((statistic==='median'?median:mean)*1.2+Number.EPSILON)*100)/100);assert.equal(ticket.fx,null);assert.equal(ticket.nativeCurrency,'USD');}
 }assert.equal(count,22);
 const sameSoc=[...scoped('Privacy Counsel','US').fields()[D].input.selectedIds,...scoped('Legal Counsel','US').fields()[D].input.selectedIds];assert.equal(positionMarketEligibility(createPositionAllocation(sameSoc,false,inventory)).eligible,false);
 for(const role of ['Financial Planning and Analysis Analyst','HR Systems Specialist'])assert.equal(positionMarketEligibility(scoped(role,'US').fields()[D]).eligible,false);
});
test('new US v2 captures preserve immutable native evidence, stale rejection, backup and tracking',()=>{
 for(const [role] of usCases){const h=scoped(role,'US'),before=structuredClone(h.fields()[D]),ticket=h.review();const adopted=confirm({store:h.store,ticket,at});assert.deepEqual(adopted,{...before,input:{...before.input,annualHireCostUsd:ticket.annualCostUsd}});
 const capture=h.save(),e=positionMarketForCapture(h.ledger(),capture);assert.equal(e.version,2);assert.equal(e.nativeCurrency,'USD');assert.equal(e.fx,null);
 const stale=h.review();h.store.setField('','other',1);assert.throws(()=>confirm({store:h.store,ticket:stale,at}));
 const next=structuredClone(adopted);next.input.annualHireCostUsd=null;edit({...h.options,draft:next});assert.equal(h.ledger().current,null);assert.deepEqual(positionMarketForCapture(h.ledger(),capture),e);
 const promote=preparePositionTrackingGoal({store:h.store,datasetToken:h.datasetToken});confirmPositionTrackingGoal({store:h.store,ticket:promote,goalId:'us-reviewed',at});const data=h.store.getSnapshot().data;assert.deepEqual(parseDecisionBackup(encodeDecisionBackup(data,h.datasetToken,at),h.datasetToken).data,data);
 for(const mutation of [a=>a.reference.area='36',a=>a.reference.sourceSha256=POSITION_MARKET_REFERENCE.sourceSha256,a=>a.reference.annualFlag='TRUE',a=>a.reference.medianCell='AB1',a=>a.reference.mappedRole='Data Engineer',a=>a.fx=fx,a=>a.reference.medianNative=null]){const bad=structuredClone(data);mutation(bad.workspaces['us-reviewed'].fields[M].records[0].adoption);assert.throws(()=>encodeDecisionBackup(bad,h.datasetToken,at));}
 }
});

const dutyCases=[['Data Engineer','15-1243','15-1243.00',2,139500,144440],['Business Intelligence Developer','15-2051','15-2051.01',2,120230,126800],['Transformation Consultant','13-1111','13-1111.00',1,101860,113790],['Quality Assurance Engineer','15-1253','15-1253.00',1,104300,111490]];
test('prior US registry bytes are unchanged; exact reviewed duty mappings add only six vacancies',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(POSITION_MARKET_US_ADDITIONAL_REFERENCES.slice(0,10))).digest('hex'),'4dd935ee477b41258ff8ad6ba995b180af3d33f585ce0ad2f5ee8d92fadd896f');
 let count=0;for(const [role,soc,onet,n,median,mean] of dutyCases){const h=scoped(role,'US'),ref=positionMarketEligibility(h.fields()[D]).reference;assert.equal(h.fields()[D].input.selectedIds.length,n);count+=n;assert.equal(ref.occupationCode,soc);assert.equal(ref.mappingSourceUrl,`https://www.onetonline.org/link/summary/${onet}`);assert.equal(ref.mappingScope,'broader-occupation');assert.deepEqual(positionMarketNativeAmounts(ref),{currency:'USD',median,mean});assert.throws(()=>h.review({mappingConfirmed:false}));assert.throws(()=>h.review({fx}));const ticket=h.review();assert.equal(ticket.annualCostUsd,Math.round((median*1.2+Number.EPSILON)*100)/100);}
 assert.equal(count,6);
 const refs=POSITION_MARKET_US_ADDITIONAL_REFERENCES;assert.match(refs.find(r=>r.mappedRole==='Data Engineer').mappingDuties,/warehouse.*integrate/);assert.match(refs.find(r=>r.mappedRole==='Business Intelligence Developer').mappingLimit,/not developer-specific/);assert.match(refs.find(r=>r.mappedRole==='Transformation Consultant').mappingDuties,/organizational processes/);
 for(const [a,b] of [['Data Architect','Data Engineer'],['Management Consultant','Transformation Consultant'],['Business Intelligence Analyst','Business Intelligence Developer']]){const selected=[...scoped(a,'US').fields()[D].input.selectedIds,...scoped(b,'US').fields()[D].input.selectedIds];assert.equal(positionMarketEligibility(createPositionAllocation(selected,false,inventory)).eligible,false);}
 for(const role of ['Sourcing Specialist','HR Systems Specialist','Machine Learning Engineer','People Analytics Analyst','Financial Planning and Analysis Analyst','Cloud Engineer'])assert.equal(positionMarketEligibility(scoped(role,'US').fields()[D]).eligible,false);
});
test('new duty-reference captures survive manual edits, restoration, backup and tracking without changing prior goals',()=>{
 for(const [role] of dutyCases){const h=scoped(role,'US'),before=structuredClone(h.fields()[D]);const ticket=h.review();const draft=confirm({store:h.store,ticket,at});assert.deepEqual(draft,{...before,input:{...before.input,annualHireCostUsd:ticket.annualCostUsd}});const capture=h.save(),evidence=positionMarketForCapture(h.ledger(),capture);assert.equal(evidence.version,2);assert.equal(evidence.fx,null);
 const edited=structuredClone(draft);edited.input.annualHireCostUsd=null;edit({...h.options,draft:edited});assert.equal(h.ledger().current,null);assert.deepEqual(positionMarketForCapture(h.ledger(),capture),evidence);edit({...h.options,draft:capture.draft,restoreCapture:capture});assert.deepEqual(h.ledger().current,evidence);
 const original=structuredClone(h.store.getSnapshot().data.exploration),promote=preparePositionTrackingGoal({store:h.store,datasetToken:h.datasetToken});confirmPositionTrackingGoal({store:h.store,ticket:promote,goalId:'duty-plan',at});const data=h.store.getSnapshot().data;assert.deepEqual(data.exploration,original);assert.deepEqual(parseDecisionBackup(encodeDecisionBackup(data,h.datasetToken,at),h.datasetToken).data,data);
 assert.doesNotThrow(()=>preparePositionResultTarget(h.store,{scenarioId:'one',allocationRevision:1,financeRevision:null,date:'2027-04-30'}));
 for(const mutate of [a=>a.reference.mappingDuties='Anything',a=>a.reference.mappingSourceUrl='https://example.com',a=>a.reference.mappedRole='HR Systems Specialist',a=>a.reference.occupationCode='15-1252']){const bad=structuredClone(data);mutate(bad.workspaces['duty-plan'].fields[M].records[0].adoption);assert.throws(()=>encodeDecisionBackup(bad,h.datasetToken,at));}
 }
});

test('software QA uses the newly verified lexical row; procurement has no approved fallback',()=>{
 const fixture=JSON.parse(readFileSync(new URL('../lib/data/oews-may2025-position-pay.json',import.meta.url),'utf8')),row=fixture.records.find(r=>r.raw.OCC_CODE==='15-1253');
 assert.equal(row.worksheet,'national_M2025_dl');assert.equal(row.row,150);assert.deepEqual(row.cells,{A_MEDIAN:'AB150',A_MEAN:'S150'});assert.equal(row.raw.A_MEDIAN,'104300');assert.equal(row.raw.A_MEAN,'111490');assert.equal(row.raw.ANNUAL,'');assert.equal(row.raw.HOURLY,'');assert.equal(row.raw.TOT_EMP,'186740');assert.equal(row.raw.EMP_PRSE,'2.2999999999999998');assert.equal(row.raw.MEAN_PRSE,'0.7');
 const ref=positionMarketEligibility(scoped('Quality Assurance Engineer','US').fields()[D]).reference;assert.match(ref.mappingDuties,/software tests/);assert.match(ref.mappingLimit,/not manufacturing/);assert.equal(ref.mappingSourceUrl,'https://www.onetonline.org/link/summary/15-1253.00');
 assert.equal(positionMarketEligibility(scoped('Sourcing Specialist','US').fields()[D]).eligible,false);assert.equal(POSITION_MARKET_US_ADDITIONAL_REFERENCES.some(r=>r.occupationCode==='13-1020'||r.occupationCode==='13-1023'),false);
});
