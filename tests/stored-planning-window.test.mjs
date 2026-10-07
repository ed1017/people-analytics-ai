import test from 'node:test';
import assert from 'node:assert/strict';
import {hasCompleteReturnedMonthWindow,summarizeStoredPlanning} from '../lib/stored-planning.ts';

const point=(planning_month,planned_hires=0,planned_exits=0,planned_headcount=100)=>({planning_month,planned_hires,planned_exits,planned_headcount,planned_fte:100,planned_labor_cost_usd:0});
const unavailable=points=>assert.deepEqual(summarizeStoredPlanning(points),{headcount_change:null,hires:null,exits:null,months:points.length});

test('an omitted middle month cannot produce a partial flow total',()=>{
  unavailable([point('2026-10-01',2),point('2026-12-01',3)]);
});
test('duplicate calendar months cannot be double counted, including distinct dates in one month',()=>{
  unavailable([point('2026-10-01',2),point('2026-10-01',3),point('2026-11-01',4)]);
  unavailable([point('2026-10-01',2),point('2026-10-15',3)]);
});
test('invalid, noncanonical and missing month values invalidate the returned window',()=>{
  for(const month of ['2026-13-01','2026-02-30','2026-2-01','2026-11','not-a-date','',null,undefined]) unavailable([point('2026-10-01'),point(month)]);
  unavailable([]);
});
test('all present months preserve legitimate zero flow totals',()=>{
  assert.deepEqual(summarizeStoredPlanning([point('2026-10-01'),point('2026-11-01'),point('2026-12-01')]),{headcount_change:0,hires:0,exits:0,months:3});
});
test('unordered complete windows and year boundaries use chronological endpoints without mutating inputs',()=>{
  const points=[point('2027-01-01',3,1,110),point('2026-12-01',2,0,100)],before=structuredClone(points);
  assert.deepEqual(summarizeStoredPlanning(points),{headcount_change:10,hires:5,exits:1,months:2});
  assert.deepEqual(points,before);
});
test('known returned endpoints do not assert a wider horizon, and unknown flows remain unavailable',()=>{
  assert.equal(hasCompleteReturnedMonthWindow(['2026-11-01']),true);
  assert.deepEqual(summarizeStoredPlanning([point('2026-11-01',null,0)]),{headcount_change:0,hires:null,exits:0,months:1});
});
