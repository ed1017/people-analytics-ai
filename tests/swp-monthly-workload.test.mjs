import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateMonthlyWorkload as calculate,monthlyWorkloadVersion} from '../lib/swp-monthly-workload.ts';
const q=(value,unit)=>({value,unit,basis:{kind:value===null?'unknown':'user-assumption',note:value===null?'Not supplied':'Explicit manual scenario assumption'}});
const move=(people=0,fte=0,mode='explicit')=>({people:q(people,'people'),fte:{mode,quantity:q(fte,mode==='explicit'?'FTE':'FTE/person')}});
const month=(date='2026-10')=>({month:date,scopeId:'service-a',hires:move(),exits:move(),transfersIn:move(),transfersOut:move(),volume:q(800,'work-units/month'),hoursPerUnit:q(1,'hours/work-unit'),productiveHoursPerFte:q(160,'hours/FTE/month'),allocation:q(0.5,'fraction'),productivityUplift:q(0,'fraction')});
const fixture=()=>({version:monthlyWorkloadVersion,scope:{id:'service-a',label:'Service A analysts',kind:'workload-group',workUnit:'resolved service ticket'},accounting:{timing:'start-of-month-outflows-from-opening',exits:'all-separations-including-retirement',movements:'disjoint',workload:'before-productivity',productiveHours:'net-of-non-work-time-before-allocation'},opening:{scopeId:'service-a',asOf:'2026-09-30',headcount:q(10,'people'),contractedFte:q(8,'FTE')},months:[month(),month('2026-11')]});
const first=s=>calculate(s).points[0];

test('explicit monthly dimensions produce separate HC, contracted/allocated FTE and signed gaps',()=>{
 const s=fixture(),r=calculate(s),p=r.points[0];
 assert.equal(r.status,'calculated');assert.equal(p.headcount,10);assert.equal(p.contractedFte,8);assert.equal(p.allocatedFte,4);
 assert.equal(p.workloadHours,800);assert.equal(p.capacityHours,640);assert.equal(p.requiredFte,5);assert.equal(p.gapFte,1);assert.equal(p.gapHours,160);
 assert.equal(r.units.workloadHours,'hours/month');assert.equal(r.units.gapFte,'FTE');assert.equal(r.gapConvention,'positive-shortfall-negative-surplus');
 s.months[0].volume=q(320,'work-units/month');assert.equal(first(s).gapFte,-2);assert.equal(first(s).gapHours,-320);
 assert.equal('cost' in r,false);assert.equal('confidence' in r,false);assert.equal('additionalPeople' in p,false);
});
test('count movements conserve both stocks with explicit FTE and assumed FTE/person',()=>{
 const s=fixture();s.months[0].hires=move(2,0.5,'per-person');s.months[0].exits=move(1,0.5);s.months[0].transfersIn=move(1,0.75);s.months[0].transfersOut=move(2,0.75,'per-person');
 const r=calculate(s),p=r.points[0];assert.equal(p.headcount,10);assert.equal(p.contractedFte,7.75);assert.equal(p.allocatedFte,3.875);
 assert.equal(p.movements.hires.contractedFte,1);assert.deepEqual(r.points[1].opening,{headcount:10,contractedFte:7.75});
 for(const x of r.points){assert.equal(x.headcount,x.opening.headcount+x.movements.hires.people-x.movements.exits.people+x.movements.transfersIn.people-x.movements.transfersOut.people);assert.equal(x.contractedFte,x.opening.contractedFte+x.movements.hires.contractedFte-x.movements.exits.contractedFte+x.movements.transfersIn.contractedFte-x.movements.transfersOut.contractedFte);}
});
test('fixed-precision FTE ledger avoids accumulated stock drift',()=>{
 const s=fixture();s.opening.headcount=q(3,'people');s.opening.contractedFte=q(0.3,'FTE');s.months=[month(),month('2026-11'),month('2026-12')];for(const m of s.months)m.exits=move(1,0.1);
 assert.deepEqual(calculate(s).points.map(p=>p.contractedFte),[0.2,0.1,0]);
});
test('productivity is a single throughput uplift, not a second hire or workload adjustment',()=>{
 const s=fixture();s.months[0].productivityUplift=q(0.25,'fraction');const p=first(s);
 assert.equal(p.workloadHours,800);assert.equal(p.headcount,10);assert.equal(p.contractedFte,8);assert.equal(p.effectiveHoursPerFte,200);assert.equal(p.requiredFte,4);assert.equal(p.gapFte,0);
 s.months[0].productivity_hiring_reduction_pct=25;assert.throws(()=>calculate(s),/unsupported/);
 delete s.months[0].productivity_hiring_reduction_pct;s.accounting.workload='after-productivity';assert.throws(()=>calculate(s),/accounting.workload/);
});
test('partial inputs stay unknown without suppressing independent demand calculations',()=>{
 const s=fixture();s.opening.contractedFte=q(null,'FTE');let r=calculate(s);assert.equal(r.status,'needs-inputs');assert.ok(r.missing.includes('opening.contractedFte'));
 for(const p of r.points){assert.equal(p.headcount,10);assert.equal(p.contractedFte,null);assert.equal(p.gapFte,null);assert.equal(p.requiredFte,5);}
 s.opening.contractedFte=q(8,'FTE');s.months[0].hires.people=q(null,'people');r=calculate(s);assert.equal(r.points[0].headcount,null);assert.equal(r.points[1].headcount,null);assert.equal(r.points[0].contractedFte,8);
 s.months[0].volume=q(null,'work-units/month');assert.equal(first(s).requiredFte,null);assert.equal(first(s).capacityHours,640);
});
test('explicit zero is valid, while missing values are never silently zeroed',()=>{
 const s=fixture();s.opening.headcount=q(0,'people');s.opening.contractedFte=q(0,'FTE');s.months[0].volume=q(0,'work-units/month');s.months[0].allocation=q(0,'fraction');const p=first(s);assert.equal(p.headcount,0);assert.equal(p.requiredFte,0);assert.equal(p.gapFte,0);
 s.months[0].volume=q(null,'work-units/month');assert.equal(first(s).workloadHours,null);
 s.months[0].hires=move(0,null,'per-person');assert.equal(first(s).contractedFte,null);
 s.months[0].productiveHoursPerFte=q(0,'hours/FTE/month');assert.throws(()=>calculate(s),/positive/);
});
test('dates support non-January windows, leap months and exact opening boundaries',()=>{
 const s=fixture();assert.deepEqual(calculate(s).points.map(p=>p.month),['2026-10','2026-11']);
 s.opening.asOf='2024-01-31';s.months=[month('2024-02')];s.months[0].productiveHoursPerFte=q(696,'hours/FTE/month');assert.equal(first(s).effectiveHoursPerFte,696);
 s.opening.asOf='2023-01-31';s.months[0].month='2023-02';assert.throws(()=>calculate(s),/bound/);
 for(const bad of ['2026-09-29','2026-09-31','2026-9-30','2026-09-30T00:00:00Z']){const x=fixture();x.opening.asOf=bad;assert.throws(()=>calculate(x));}
});
test('rejects wrong scope, calendar gaps, duplicates, ordering and unsupported horizons',()=>{
 for(const edit of [s=>s.opening.scopeId='other',s=>s.months[0].scopeId='other',s=>s.months[0].month='2027-01',s=>s.months[1].month='2026-10',s=>s.months.reverse(),s=>s.months=[],s=>s.months=Array(25).fill(month()),s=>s.months[0].month='2026-13']){const s=fixture();edit(s);assert.throws(()=>calculate(s));}
});
test('month and unit denominators cannot be silently converted or inferred',()=>{
 for(const [field,unit] of [['volume','work-units/year'],['hoursPerUnit','hours/month'],['productiveHoursPerFte','hours/FTE/year'],['allocation','percent'],['productivityUplift','percent']]){const s=fixture();s.months[0][field].unit=unit;assert.throws(()=>calculate(s),/expected/);}
 const s=fixture();s.months[0].volume.period='year';assert.throws(()=>calculate(s),/unsupported/);
});
test('rejects sparse month arrays instead of skipping missing rows',()=>{
 for(const rows of [new Array(1),[month(),,month('2026-12')],[undefined]]){
  const s=fixture();s.months=rows;assert.throws(()=>calculate(s),/missing month row|unsupported or missing fields/);
 }
});
test('rejects infeasible opening, aggregate outflows, remainders and count/FTE pairs',()=>{
 for(const edit of [s=>s.opening.contractedFte=q(11,'FTE'),s=>s.months[0].exits=move(11,8),s=>{s.months[0].exits=move(6,4);s.months[0].transfersOut=move(5,4)},s=>s.months[0].exits=move(4,1),s=>s.months[0].hires=move(0,1),s=>s.months[0].hires=move(1,2),s=>{s.months[0].exits=move(11,8);s.months[0].hires=move(100,100)},s=>{s.months[0].exits=move(11,null);s.months[0].transfersOut=move(null,null)}]){const s=fixture();edit(s);assert.throws(()=>calculate(s),/exceed|infeasible|outflows/);}
});
test('company scope cannot count internal transfers as new supply or canceled gross flows',()=>{
 const s=fixture();s.scope.kind='company';assert.equal(first(s).headcount,10);
 s.months[0].transfersIn=move(1,1);s.months[0].transfersOut=move(1,1);assert.throws(()=>calculate(s),/internal transfers/);
 s.months[0].transfersIn=move(null,null);assert.throws(()=>calculate(s),/internal transfers/);
});
test('unknown departure counts cannot conceal impossible remaining FTE or be repaired by inflows',()=>{
 for(const swap of [false,true])for(const inflows of [false,true]){
  const s=fixture();s.months[0].exits=move(4,1);s.months[0].transfersOut=move(null,0);
  if(swap)[s.months[0].exits,s.months[0].transfersOut]=[s.months[0].transfersOut,s.months[0].exits];
  if(inflows)s.months[0].hires=move(100,100);
  assert.throws(()=>calculate(s),/remaining supply bound: contracted FTE exceeds people/);
 }
});
test('remaining headcount bound is validation only and does not replace unknown counts',()=>{
 const s=fixture();s.months[0].exits=move(4,2);s.months[0].transfersOut=move(null,0);
 const r=calculate(s);assert.equal(r.status,'needs-inputs');assert.ok(r.missing.includes('months[0].transfersOut.people'));
 assert.equal(r.points[0].headcount,null);assert.equal(r.points[0].contractedFte,6);assert.equal(r.points[0].capacityHours,480);
 s.months[0].transfersOut=move(null,null);
 const p=first(s);assert.equal(p.headcount,null);assert.equal(p.contractedFte,null);assert.equal(p.capacityHours,null);assert.equal(p.requiredFte,5);
});
test('rejects duplicate flow/rate/retirement adjustments and ambiguous accounting',()=>{
 for(const edit of [s=>s.months[0].retirements=move(1,1),s=>s.months[0].attritionRate=0.1,s=>s.months[0].hires.fte.ratio=1,s=>s.accounting.movements='overlapping',s=>s.accounting.exits='voluntary-only',s=>s.accounting.productiveHours='already-allocated',s=>s.accounting.timing='end-of-month',s=>s.version='v2']){const s=fixture();edit(s);assert.throws(()=>calculate(s));}
});
test('bounds reject nonnumeric, nonfinite, negative, excessive precision and fractional people',()=>{
 for(const n of [undefined,'1',NaN,Infinity,-1,1.0000001,1000001]){const s=fixture();s.months[0].volume=q(n,'work-units/month');assert.throws(()=>calculate(s));}
 for(const n of [0.1,1000001]){const s=fixture();s.months[0].hires.people=q(n,'people');assert.throws(()=>calculate(s));}
 for(const field of ['allocation','productivityUplift']){const s=fixture();s.months[0][field]=q(1.000001,'fraction');assert.throws(()=>calculate(s));}
 const s=fixture();s.months[0].hires=move(1,1.01,'per-person');assert.throws(()=>calculate(s));
});
test('supported extremes stay bounded and excessively amplified demand fails closed',()=>{
 const s=fixture();s.opening.headcount=q(1e6,'people');s.opening.contractedFte=q(1e6,'FTE');s.months[0].volume=q(1e6,'work-units/month');s.months[0].hoursPerUnit=q(1e6,'hours/work-unit');s.months[0].productiveHoursPerFte=q(1,'hours/FTE/month');assert.equal(first(s).requiredFte,1e12);
 s.months[0].productiveHoursPerFte=q(0.000001,'hours/FTE/month');assert.throws(()=>calculate(s),/magnitude/);
 s.months[0].productiveHoursPerFte=q(160,'hours/FTE/month');s.months[0].hires=move(1,1);assert.throws(()=>calculate(s),/infeasible/);
});
test('provenance cannot promote assumptions to source facts; outputs do not alias inputs',()=>{
 const s=fixture(),before=structuredClone(s),r=calculate(s);assert.deepEqual(s,before);assert.deepEqual(r.assumptions,s);r.assumptions.scope.label='Edited';assert.equal(s.scope.label,'Service A analysts');
 for(const kind of ['observed','model-proposed','unknown']){const x=fixture();x.opening.headcount.basis.kind=kind;assert.throws(()=>calculate(x),/assumptions/);}
 const x=fixture();x.opening.headcount.value=null;assert.throws(()=>calculate(x),/unknown provenance/);
});
test('unknown inflows cannot conceal a known closing headcount ceiling breach',()=>{
 for(const swap of [false,true]){
  const s=fixture();s.opening.headcount=q(999999,'people');s.months[0].hires=move(2,0);s.months[0].transfersIn=move(null,0);
  if(swap)[s.months[0].hires,s.months[0].transfersIn]=[s.months[0].transfersIn,s.months[0].hires];
  assert.throws(()=>calculate(s),/closing supply bound: infeasible headcount/);
 }
 const s=fixture();s.opening.headcount=q(999999,'people');s.months[0].hires=move(1,0);s.months[0].transfersIn=move(null,0);
 const r=calculate(s);assert.equal(r.status,'needs-inputs');assert.equal(r.points[0].headcount,null);assert.equal(r.points[0].contractedFte,8);assert.equal(r.points[0].capacityHours,640);assert.equal(r.points[0].requiredFte,5);
 s.months[0].exits=move(1,0);s.months[0].hires=move(2,0);assert.equal(first(s).headcount,null);
});
