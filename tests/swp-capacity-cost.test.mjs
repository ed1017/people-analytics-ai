import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {capacityCostAssumptions as rate,calculateCapacityCost as cost,capacityCalculationKey} from '../lib/swp-capacity-cost.ts';
import {capacitySpec,emptyCapacityDraft} from '../lib/swp-capacity-draft.ts';
import {calculateMonthlyWorkload} from '../lib/swp-monthly-workload.ts';
import {prepareCapacityRecord as prepare,readCapacityRecord as read,capacityRecordIsCurrent as current,compareCapacityRecords as compare} from '../lib/swp-capacity-record.ts';
import {readCapacityBucket,capacityBinding,openCapacityScenario,monthlyCapacityField} from '../lib/swp-capacity-store.ts';
import {DecisionStore,encodeDecisions} from '../lib/local-decisions.ts';
const scope={id:'scope-a',label:'Service desk — tickets',workUnit:'Service desk — tickets'},context={datasetToken:'legacy-v1:0',goalId:'a',goal:'Review capacity'},binding=capacityBinding(context,scope),at='2026-10-13T20:00:00.000Z';
const draft=(patch={})=>({...emptyCapacityDraft,scope:scope.label,openingDate:'2026-09-30',people:'10',fte:'8',volume:'800',effort:'1',hours:'160',hires:'0',exits:'0',allocation:'50',productivity:'0',fullTimeMovements:true,confirmed:true,...patch});
const session=(patch={})=>{const d=draft({costRate:'12.34',...patch}),result=calculateMonthlyWorkload(capacitySpec(d));return {draft:d,result,cost:cost(result,rate(d.costRate)),error:''};};
const record=(patch={})=>prepare(session(patch),binding,{id:'cost-a',name:'Cost scenario',createdAt:at});
const cents=(fte,r)=>cost({points:[{month:'2026-10',contractedFte:fte}]},rate(r)).points[0].runRateCents;
test('rate syntax, bounds and provenance preserve unknown and explicit zero',()=>{
 assert.equal(rate('').rateCents,null);assert.equal(rate('   ').basis,'unknown');assert.equal(rate('0').rateCents,0);assert.equal(rate('0.00').basis,'user-assumption');assert.equal(rate('12.34').rateCents,1234);assert.equal(rate(' 12.3 ').rateCents,1230);assert.equal(rate('100000.00').rateCents,10000000);
 for(const value of ['-1','+1','1e2','1,000','NaN','Infinity','.5','1.','1.001','100000.01','9'.repeat(200),null,0,{},undefined])assert.throws(()=>rate(value));
});
test('micro-FTE half-cent rounding and max product use checked exact arithmetic',()=>{
 assert.equal(cents(8,'12.34'),9872);
 for(const [fte,r,expected] of [[.499999,'0.01',0],[.5,'0.01',1],[.500001,'0.01',1],[.5,'0.03',2],[.000001,'5000',1],[1000000,'100000',10000000000000],[999999.999999,'99999.99',9999998999990],[null,'0',null],[0,'',null],[0,'12.34',0],[8,'0',0]])assert.equal(cents(fte,r),expected,`${fte} × ${r}`);
 for(const fte of [-1,1000000.000001,Infinity,NaN,.0000001,Number.MAX_SAFE_INTEGER])assert.throws(()=>cents(fte,'100000'));
 // Independent rational oracle over boundaries and deterministic integer samples.
 let seed=17;
 for(let i=0;i<500;i++){
  seed=(seed*48271)%2147483647;const micro=seed*431;const rc=seed%10000001;
  const numerator=BigInt(micro)*BigInt(rc),q=numerator/1000000n,remainder=numerator%1000000n;
  const expected=Number(q+(remainder>=500000n?1n:0n));
  assert.equal(cents(micro/1000000,(rc/100).toFixed(2)),expected);
 }
});
test('cost follows contracted supply, independent of people, assignment and productivity',()=>{
 const base=session();assert.equal(base.cost.points[0].runRateCents,9872);
 for(const patch of [{people:'20'},{allocation:'0'},{allocation:'100'},{productivity:'100'},{volume:'1000'}])assert.deepEqual(session(patch).cost,base.cost);
 assert.deepEqual(session({hires:'1'}).cost.points.map(p=>p.runRateCents),[11106,12340,13574]);
 assert.equal(session({fte:''}).cost.points[0].runRateCents,null);
});
test('v2 roundtrip, cost tampering and combined input identity',()=>{
 const original=record(),json=JSON.stringify(original);assert.equal(original.schemaVersion,2);assert.equal(JSON.stringify(read(JSON.parse(json),binding)),json);assert.equal(current(original,binding,session().draft),true);
 assert.equal(original.inputKey,capacityCalculationKey(session().result,session().cost));
 for(const mutate of [r=>r.cost.points[0].runRateCents++,r=>r.cost.points[0].month='2026-11',r=>r.cost.points=[],r=>r.cost.assumptions.rateCents=0,r=>r.cost.assumptions.currency='EUR',r=>r.cost.assumptions.rateUnit='USD/person/month',r=>r.cost.assumptions.method='gap',r=>r.cost.assumptions.rounding='floor',r=>r.cost.assumptions.basis='source',r=>r.cost.assumptions.extra=true,r=>r.cost.assumptions.version='v2',r=>r.schemaVersion=3,r=>delete r.cost]){
  const changed=structuredClone(original);mutate(changed);assert.throws(()=>read(changed,binding));
 }
 for(const value of ['','0','12.35']){const s=session();s.draft.costRate=value;assert.throws(()=>prepare(s,binding,{id:'b',name:'B',createdAt:at}));assert.equal(current(original,binding,s.draft),false);}
 const altered=session();altered.cost.points[0].runRateCents=99;assert.throws(()=>prepare(altered,binding,{id:'b',name:'B',createdAt:at}));
 assert.equal(current(original,binding,{...session().draft,costRate:'12.340'}),false);
});
test('v2 different rates compare and delta subtracts already rounded monthly costs',()=>{
 const a=record({fte:'0.5',costRate:'0.01'}),b=record({fte:'0.5',costRate:'0.02'}),comparison=compare(a,b,binding);
 assert.equal(comparison.compatible,true);assert.equal(comparison.costComparison.compatible,true);assert.equal(comparison.costComparison.leftRateCents,1);assert.equal(comparison.costComparison.rightRateCents,2);assert.equal(comparison.costComparison.points[0].deltaCents,0);
 assert.equal(compare(record(),record({costRate:'0'}),binding).costComparison.points[0].deltaCents,-9872);
 assert.equal(compare(record({costRate:''}),record({costRate:'0'}),binding).costComparison.points[0].deltaCents,null);
});
test('frozen production v1 bytes and identities reopen unchanged; mixed versions retain capacity comparison with unknown cost',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/swp-capacity-v1.json',import.meta.url),'utf8'));
 const before=JSON.stringify(fixture),old=fixture.entries[0];
 assert.equal(JSON.stringify(readCapacityBucket(fixture,context)),before);assert.equal(old.record.schemaVersion,1);assert.equal(Object.hasOwn(old.draft,'costRate'),false);
 const mixed={...fixture,entries:[old,{draft:session().draft,record:record()}]};
 assert.equal(readCapacityBucket(mixed,context).entries.length,2);
 const comparison=compare(old.record,record(),binding);assert.equal(comparison.compatible,true);assert.equal(comparison.costComparison.compatible,false);assert.equal(comparison.costComparison.points[0].leftCents,null);assert.equal(comparison.costComparison.points[0].deltaCents,null);
 const encoded=encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:context.goal}]},workspaces:{a:{savedAt:at,fields:{[monthlyCapacityField]:fixture}}}});
 const store=new DecisionStore();store.initialize({getItem:()=>encoded,setItem:()=>assert.fail('reopen must not write'),removeItem:()=>{}});
 const opened=openCapacityScenario(store,context,old.record.id,1,()=>{});assert.equal(JSON.stringify(opened.entry),JSON.stringify(old));assert.equal(current(old.record,binding,{...old.draft,costRate:''}),true);assert.equal(current(old.record,binding,{...old.draft,costRate:'0'}),false);
});
