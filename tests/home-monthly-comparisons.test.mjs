import test from 'node:test';
import assert from 'node:assert/strict';
import {homeMonthlyComparisons} from '../lib/home-monthly-comparisons.ts';
const pack=(monthly,status='loaded')=>({sources:[{id:'A1',status,facts:{monthly}}]});
const row=(month,rate,count)=>({month,monthly_turnover_pct:rate,total_exits:count});
test('April 2026 0.93% is below April 2024 0.96% and April 2025 1.05% with exact percentage-point deltas',()=>{
 const input=pack([row('2024-04-01',0.96),row('2025-04-01',1.05),row('2026-04-01',0.93)]),before=JSON.stringify(input);
 const result=homeMonthlyComparisons(input).filter(item=>item.month==='2026-04-01');
 assert.deepEqual(result.map(({comparedWith,value,baseline,delta,direction,unit})=>({comparedWith,value,baseline,delta,direction,unit})),[
  {comparedWith:'2025-04-01',value:0.93,baseline:1.05,delta:-0.12,direction:'below',unit:'percentage points'},
  {comparedWith:'2024-04-01',value:0.93,baseline:0.96,delta:-0.03,direction:'below',unit:'percentage points'},
 ]);
 for(const item of result){assert.equal(item.scope,'Company-wide; unfiltered');assert.match(item.statement,/ is below /);assert.match(item.statement,/\[A1\]/)}
 assert.equal(JSON.stringify(input),before);
});
test('counts and rates remain separate metrics with independently computed directions; zero remains a value',()=>{
 const result=homeMonthlyComparisons(pack([row('2026-03-01',1.05,0),row('2026-04-01',0.93,3)]));
 assert.deepEqual(result.map(({metric,delta,unit,direction})=>({metric,delta,unit,direction})),[
  {metric:'total_exits',delta:3,unit:'exits',direction:'above'},
  {metric:'monthly_turnover_pct',delta:-0.12,unit:'percentage points',direction:'below'},
 ]);
 const equal=homeMonthlyComparisons(pack([row('2026-03-01',0),row('2026-04-01',0)]))[0];assert.equal(equal.direction,'equal to');assert.equal(equal.delta,0);
});
test('missing, suppressed, invalid and duplicate periods cannot create comparisons or denominators',()=>{
 const first=row('2026-03-01',1),second=row('2026-04-01',0.93);
 for(const rows of [[],[first],[first,{...second,suppressed:true}],[first,row('2026-04-01',null)],[first,row('2026-04-01','0.93')],[first,row('invalid',0.93)],[first,row('2026-04-01',101)],[first,second,{...second}]])assert.deepEqual(homeMonthlyComparisons(pack(rows)),[]);
 for(const status of ['timeout','unavailable','budget-excluded'])assert.deepEqual(homeMonthlyComparisons(pack([first,second],status)),[]);
 assert.doesNotMatch(JSON.stringify(homeMonthlyComparisons(pack([first,second]))),/denominator|headcount|percent_change/);
});
test('all six normalized metrics are bounded to three supplied periods, including scientific decimal notation',()=>{
 const result=homeMonthlyComparisons(pack([row('2024-04-01',0),row('2025-04-01',1e-7),row('2026-04-01',2e-7),row('2027-04-01',100)]));
 assert.equal(result.length,3);assert.equal(result[0].delta,1e-7);assert.doesNotMatch(JSON.stringify(result),/2027/);
 const complete=['2024-04-01','2025-04-01','2026-04-01'].map((month,index)=>({month,total_exits:index,voluntary_exits:index,involuntary_exits:index,regrettable_exits:index,monthly_turnover_pct:index,monthly_voluntary_turnover_pct:index}));
 const bounded=homeMonthlyComparisons(pack(complete));assert.equal(bounded.length,18);assert.equal(new Set(bounded.map(item=>item.metric)).size,6);
});
