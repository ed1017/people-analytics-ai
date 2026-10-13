import test from 'node:test';
import assert from 'node:assert/strict';
import {capacitySpec,emptyCapacityDraft} from '../lib/swp-capacity-draft.ts';
import {calculateMonthlyWorkload} from '../lib/swp-monthly-workload.ts';
import {prepareCapacityRecord as prepare,readCapacityRecord as read,compareCapacityRecords as compare,capacityRecordIsCurrent as current} from '../lib/swp-capacity-record.ts';
import {monthlyScenarioInputKey as key} from '../lib/monthly-scenario-compatibility.mjs';
const draft=patch=>({...emptyCapacityDraft,scope:'Service desk — tickets',openingDate:'2026-09-30',people:'10',fte:'8',volume:'800',effort:'1',hours:'160',hires:'0',exits:'0',allocation:'50',productivity:'0',fullTimeMovements:true,confirmed:true,...patch});
const context=()=>({datasetToken:'legacy-v1:0',goalId:'goal-1',goal:'Review service capacity',scopeId:'scope-1',scopeLabel:'Service desk — tickets',workUnit:'Service desk — tickets'});
const meta=()=>({id:'record-1',name:'Base',createdAt:'2026-10-13T20:00:00.000Z'});
const session=(patch={})=>{const d=draft(patch);return {draft:d,result:calculateMonthlyWorkload(capacitySpec(d)),error:''};};
const record=(patch={})=>prepare(session(patch),context(),meta());
test('round trip recomputes and preserves separated quantities, signed gap and detached data',()=>{
 const s=session(),before=structuredClone(s),r=prepare(s,context(),meta());
 assert.equal(r.result.points[0].headcount,10);assert.equal(r.result.points[0].contractedFte,8);assert.equal(r.result.points[0].allocatedFte,4);assert.equal(r.result.points[0].gapFte,1);
 assert.deepEqual(read(JSON.parse(JSON.stringify(r)),context()),r);assert.equal(current(r,context(),s.draft),true);
 r.result.points[0].headcount=99;r.inputs.months[0].volume.value=0;assert.deepEqual(s,before);
});
test('every meaningful draft edit rejects stale outputs and current presentation',()=>{
 const changes={scope:'Other work',openingDate:'2026-08-31',months:'2',people:'11',fte:'7',volume:'900',effort:'2',hours:'150',hires:'1',exits:'1',allocation:'60',productivity:'20',fullTimeMovements:false,confirmed:false};
 for(const [field,value] of Object.entries(changes)){
  const s=session();s.draft[field]=value;
  assert.throws(()=>prepare(s,context(),meta()),field);assert.equal(current(record(),context(),s.draft),false,field);
 }
 for(const field of ['hireFte','exitFte']){const s=session({fullTimeMovements:false,hireFte:'0.5',exitFte:'0.5'});s.draft[field]='0.75';assert.throws(()=>prepare(s,context(),meta()));}
});
test('normalized equivalent draft formatting and ignored hidden fields stay current',()=>{
 const r=record();assert.equal(current(r,context(),draft({people:'10.0',hireFte:'ignored'})),true);
});
test('tampered outputs and assumptions fail even with a refreshed input key',()=>{
 for(const mutate of [r=>r.result.points[0].gapFte=-99,r=>r.result.assumptions.months[0].volume.value=9,r=>r.result.units.gapFte='people',r=>r.result.limitations=[],r=>r.result.gapConvention='opposite',r=>{r.inputs.months[0].volume.value=9;r.inputKey=key(r.inputs);}]){
  const r=record();mutate(r);assert.throws(()=>read(r,context()));
 }
 const s=session();s.result.points[0].headcount=99;assert.throws(()=>prepare(s,context(),meta()),/results changed/);
});
test('rejects absent, invalid, changed bindings, versions and legacy scenario shapes',()=>{
 for(const field of Object.keys(context())){
  for(const value of [null,''])assert.throws(()=>prepare(session(),{...context(),[field]:value},meta()),field);
  assert.throws(()=>read(record(),{...context(),[field]:field==='datasetToken'?'other:1':'changed'}),field);
 }
 for(const patch of [{schemaVersion:2},{calculatorVersion:'v2'},{kind:'legacy'},{inputKey:'wrong'},{extra:true},{createdAt:'2026-02-30T00:00:00.000Z'}])assert.throws(()=>read({...record(),...patch},context()));
 assert.throws(()=>read({id:'old',scenario:{summary:{}}},context()));
});
test('engine validation rejects missing, impossible, gapped and non-month-end inputs on reload',()=>{
 for(const mutate of [r=>r.inputs.opening.asOf='2026-09-29',r=>r.inputs.months[1].month='2027-01',r=>r.inputs.months[0].scopeId='other',r=>r.inputs.months[0].exits.people.value=11,r=>{r.inputs.months[0].volume.value=null;r.inputs.months[0].volume.basis.kind='unknown';}]){
  const r=record();mutate(r);r.inputKey=key(r.inputs);assert.throws(()=>read(r,context()));
 }
 assert.throws(()=>prepare(session({volume:''}),context(),meta()),/missing assumptions/);
 assert.throws(()=>prepare({...session(),result:null},context(),meta()));
 assert.throws(()=>prepare({...session(),error:'Calculation failed'},context(),meta()));
});
test('comparisons allow and expose monthly hires, exits, workload and productivity differences',()=>{
 const comparison=compare(record(),record({hires:'2',exits:'1',volume:'900',productivity:'20'}),context());
 assert.equal(comparison.compatible,true);
 for(const field of ['hires','exits','volume','productivityUplift'])assert.ok(comparison.assumptionDifferences.some(change=>change.path==='2026-10.'+field),field);
 assert.equal(compare(record(),record({months:'2'}),context()).compatible,false);
 assert.equal(compare(record(),record({openingDate:'2026-08-31'}),context()).compatible,false);
 const bad=record();bad.result.points[0].gapFte=0;assert.throws(()=>compare(record(),bad,context()));
});
test('departures cannot consume same-month hires and surplus sign is preserved',()=>{
 assert.throws(()=>record({hires:'20',exits:'11'}),/outflows exceed/);
 assert.ok(record({hires:'2'}).result.points[0].gapFte<record().result.points[0].gapFte);
 assert.ok(record({productivity:'100'}).result.points[0].gapFte<0);
});
test('runtime JSON boundary rejects malicious arrays, getters and invalid draft types',()=>{
 class Custom extends Array {}
 const r=record();r.inputs.months=Custom.from(r.inputs.months);assert.throws(()=>read(r,context()),/standard prototype/);
 const s=session();s.draft.confirmed='yes';assert.throws(()=>prepare(s,context(),meta()),/draft value type/);
 assert.equal(current(record(),context(),s.draft),false);
 const getter={get draft(){throw Error('getter ran');},result:null,error:''};assert.throws(()=>prepare(getter,context(),meta()),/plain data/);
});
