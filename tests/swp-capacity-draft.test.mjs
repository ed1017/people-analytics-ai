import test from 'node:test';
import assert from 'node:assert/strict';
import {capacitySpec,emptyCapacityDraft} from '../lib/swp-capacity-draft.ts';
import {calculateMonthlyWorkload} from '../lib/swp-monthly-workload.ts';
const draft=()=>({...emptyCapacityDraft,scope:'Service desk — tickets',openingDate:'2026-09-30',people:'10',fte:'8',volume:'800',effort:'1',hours:'160',hires:'0',exits:'0',allocation:'50',productivity:'0',fullTimeMovements:true,confirmed:true});
test('recurring manual form expands months and units without a second engine',()=>{
 const spec=capacitySpec(draft()),result=calculateMonthlyWorkload(spec);
 assert.deepEqual(spec.months.map(m=>m.month),['2026-10','2026-11','2026-12']);
 assert.equal(capacitySpec({...draft(),hireFte:'invalid hidden input'}).months[0].hires.fte.quantity.value,1);
 assert.equal(spec.months[0].allocation.value,0.5);assert.equal(result.points[0].gapFte,1);
 assert.equal(spec.opening.contractedFte.basis.kind,'user-assumption');assert.equal(spec.months[0].transfersIn.people.value,0);
});
test('requires explicit confirmation and metadata; no implicit zero or full-time movements',()=>{
 assert.throws(()=>capacitySpec({...draft(),confirmed:false}),/Confirm/);
 for(const patch of [{scope:''},{openingDate:''},{months:''},{months:'0'},{months:'7'},{months:'1.5'}])assert.throws(()=>capacitySpec({...draft(),...patch}));
 const spec=capacitySpec({...draft(),hires:'',fullTimeMovements:false});
 assert.equal(spec.months[0].hires.people.value,null);assert.equal(spec.months[0].hires.fte.quantity.value,null);
 assert.equal(calculateMonthlyWorkload(spec).points[0].capacityHours,null);
});
test('blank and zero remain distinct and invalid values never become zero',()=>{
 const zero=calculateMonthlyWorkload(capacitySpec({...draft(),people:'0',fte:'0',volume:'0',allocation:'0'}));assert.equal(zero.points[0].gapFte,0);
 const missing=calculateMonthlyWorkload(capacitySpec({...draft(),fte:''}));assert.equal(missing.points[0].requiredFte,5);assert.equal(missing.points[0].allocatedFte,null);
 for(const value of ['-1','NaN','Infinity','1e3','1.0000001'])assert.throws(()=>capacitySpec({...draft(),volume:value}));
 for(const patch of [{allocation:'101'},{productivity:'101'},{openingDate:'2026-09-29'},{people:'2.5'},{fte:'11'},{hours:'0'}])assert.throws(()=>calculateMonthlyWorkload(capacitySpec({...draft(),...patch})));
});
test('explicit fractional movements and productivity use the reviewed accounting only',()=>{
 const r=calculateMonthlyWorkload(capacitySpec({...draft(),fullTimeMovements:false,hireFte:'0.5',exitFte:'0.25',hires:'2',exits:'1',productivity:'25'}));
 assert.equal(r.points[0].headcount,11);assert.equal(r.points[0].contractedFte,8.75);assert.equal(r.points[0].requiredFte,4);assert.equal(r.points[0].gapFte,-0.375);
});

test('fractional percentages normalize both inputs to the engine precision without changing meaning',()=>{
 for(const [input,expected] of [['33.3',0.333],['66.6',0.666],['33.3333',0.333333],['0.0001',0.000001],['99.9999',0.999999],['0',0],['100',1]]){
  const spec=capacitySpec({...draft(),allocation:input,productivity:input});
  assert.equal(spec.months[0].allocation.value,expected);assert.equal(spec.months[0].productivityUplift.value,expected);
  const r=calculateMonthlyWorkload(spec);assert.equal(r.status,'calculated');assert.equal(r.points[0].allocatedFte,8*expected);assert.equal(r.points[0].requiredFte,800/(160*(1+expected)));
 }
});
test('percentage precision is explicit, excessive precision is rejected and missing stays unknown',()=>{
 for(const key of ['allocation','productivity']){
  for(const value of ['33.33333','66.666666','0.00001','100.00001','101'])assert.throws(()=>capacitySpec({...draft(),[key]:value}),/0–100 with at most four decimal places/);
  const spec=capacitySpec({...draft(),[key]:''}),field=key==='allocation'?'allocation':'productivityUplift';
  assert.equal(spec.months[0][field].value,null);assert.equal(spec.months[0][field].basis.kind,'unknown');
  assert.equal(calculateMonthlyWorkload(spec).status,'needs-inputs');
 }
});
