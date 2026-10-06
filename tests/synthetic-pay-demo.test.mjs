import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {aggregateSyntheticPay,buildSyntheticPayDemo,payStatistics,payDemoPath} from '../lib/simulation/pay-demo.mjs';
const protocol=JSON.parse(await readFile(new URL('../lib/simulation/pay-demo-protocol.json',import.meta.url)));
const bands=protocol.locations.map(location=>({id:location.code,job:'software-developer',level:'L2',location:location.code,midpoint:100,currency:'USD',effectiveDate:protocol.effectiveDate,basis:protocol.rangeBasis}));
const record=(id,location='austin',pay=100,fte=1)=>({recordId:id,job:'software-developer',level:'L2',location,rangeId:location,currency:'USD',effectiveDate:protocol.effectiveDate,payPeriod:protocol.payPeriod,payBasis:protocol.payBasis,eligibility:'active-salaried',basePay:pay,fte});
const rows=(count,location='austin')=>Array.from({length:count},(_,i)=>record(location+i,location));
const published=(records,customBands=bands)=>aggregateSyntheticPay(records,customBands,protocol).find(row=>row.location==='austin');
test('FTE normalization, ratio of sums and equal-person distribution use the same eligible population',()=>{
 const a=published([record('a','austin',25,.5),record('b'),record('c'),record('d','austin',150),record('e','austin',200),...rows(5,'chicago'),...rows(5,'seattle')]);
 assert.equal(a.status,'published');assert.deepEqual(a.metrics,{compaRatioPct:120,rangeMidpoint:100,mean:120,median:100,q1:100,q3:150,sd:50.99});assert.equal(a.coverage.eligible,5);
 const midpoint=published([...rows(5),...rows(5,'chicago'),...rows(5,'seattle')]);assert.equal(midpoint.metrics.compaRatioPct,100);
});
test('quartiles interpolate and SD is descriptive population SD, not a fitted normal curve',()=>{assert.deepEqual(payStatistics([1,2,3,4,5,6]),{mean:3.5,median:3.5,q1:2.25,q3:4.75,sd:1.71});assert.equal(payStatistics([5,5,5,5,5]).sd,0);assert.throws(()=>payStatistics([1,2,3,4]));});
test('wrong salary currency/date/FTE/period/basis/eligibility and mismatched range are excluded without zero filling',()=>{
 for(const changed of [{currency:'CAD'},{effectiveDate:'2026-08-31'},{fte:0},{fte:null},{fte:1.1},{basePay:null},{basePay:0},{basePay:Infinity},{payPeriod:'monthly'},{payBasis:'total-compensation'},{eligibility:'inactive'},{rangeId:'wrong'}]){
  const result=published([...rows(5),{...record('missing'),...changed},...rows(5,'chicago'),...rows(5,'seattle')]);assert.equal(result.metrics.compaRatioPct,100);assert.deepEqual(result.coverage,{eligible:5,status:'partial',excluded:null,total:null});
 }
});
test('range midpoint and matching range currency/date/base-pay basis are mandatory',()=>{
 for(const changed of [{midpoint:null},{midpoint:0},{midpoint:-1},{currency:'CAD'},{effectiveDate:'2026-08-31'},{basis:'annual-total-compensation'}]){
  const result=published([...rows(7),...rows(8,'chicago'),...rows(9,'seattle')],bands.map(band=>band.location==='austin'?{...band,...changed}:band));assert.equal(result.status,'suppressed');assert.equal(result.metrics,null);assert.equal(result.coverage,null);
 }
});
test('small cells and complementary cells expose no counts, coverage, midpoint or distribution; no parent totals',()=>{
 const result=aggregateSyntheticPay([...rows(4),...rows(5,'chicago'),...rows(8,'seattle')],bands,protocol);assert.deepEqual(result.map(row=>row.status),['suppressed','suppressed','published']);
 for(const cell of result.slice(0,2))assert.deepEqual(Object.keys(cell).sort(),['coverage','id','job','level','location','metrics','status'].sort());
 assert.equal(result[0].metrics,null);assert.equal(result[1].coverage,null);assert.equal(result[2].coverage.eligible,8);assert.equal(result.length,3);
 const two=aggregateSyntheticPay([...rows(3),...rows(4,'chicago'),...rows(8,'seattle')],bands,protocol);assert.deepEqual(two.map(row=>row.status),['suppressed','suppressed','published']);
});
test('missing-count coverage releases zero or >=5, never 1–4 or a reconstructing total',()=>{
 for(const n of [0,1,4,5]){const result=published([...rows(8),...Array.from({length:n},(_,i)=>({...record('excluded'+i),basePay:null})),...rows(8,'chicago'),...rows(8,'seattle')]);assert.equal(result.coverage.excluded,n>0&&n<5?null:n);assert.equal(result.coverage.total,n>0&&n<5?null:8+n);}
});
test('duplicate identities, unknown cohorts and duplicate ranges fail closed',()=>{
 assert.throws(()=>published([...rows(5),record('austin0')]),/Unique/);assert.throws(()=>published([{...record('x'),location:'unknown'}]),/Unmapped/);assert.throws(()=>published(rows(5),[...bands,bands[0]]),/Duplicate/);
});
test('fixed generator is deterministic, aggregate-only and independent of dashboard/BLS evidence',async()=>{
 const a=await buildSyntheticPayDemo(),b=await buildSyntheticPayDemo();assert.deepEqual(a,b);assert.equal(a.dataset,'separate-synthetic-pay-v1');assert.equal(a.cohorts.length,18);assert.equal(a.cohorts.filter(row=>row.status==='suppressed').length,4);assert.equal(a.evidence.rowRecordsPublished,false);assert.equal(a.evidence.overallTotalsPublished,false);assert.ok(!/recordId|basePay\"|fte\"|employeeId/.test(JSON.stringify(a)));assert.ok(a.cohorts.every(row=>row.status==='suppressed'?row.metrics===null&&row.coverage===null:row.coverage.eligible>=5));assert.deepEqual(a,JSON.parse(await readFile(new URL('../'+payDemoPath,import.meta.url))));
});

test('consumer rejects altered/missing evidence and exposes only exact fixed cells',async()=>{
 const {resolveSyntheticPayDemo,selectSyntheticPayCohort}=await import('../lib/synthetic-pay-demo.ts');const data=await buildSyntheticPayDemo();assert.equal(resolveSyntheticPayDemo(data).status,'ready');assert.equal(resolveSyntheticPayDemo(null).status,'unavailable');assert.equal(resolveSyntheticPayDemo({...data,seed:0}).status,'unavailable');assert.equal(selectSyntheticPayCohort(data,'all','L2','austin'),null);const hidden=selectSyntheticPayCohort(data,'people-operations','L2','seattle');assert.equal(hidden.status,'suppressed');assert.equal(hidden.metrics,null);
});
