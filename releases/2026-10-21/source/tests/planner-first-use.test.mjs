import test from 'node:test';import assert from 'node:assert/strict';
import {projectionEntryValues,isHeadcountEntry} from '../lib/projection-entry.ts';
import {groupWorkforceTrend} from '../lib/group-workforce-trend.ts';
test('ordinary explicit monthly projection words seed controls without submitting or inventing missing inputs',()=>{
 assert.deepEqual(projectionEntryValues('Project headcount over six months assuming five hires and three exits per month. Label this as a hypothetical scenario.'),{months:'6',hires:'5',exits:'3',transfersIn:'',transfersOut:''});
 assert.equal(projectionEntryValues('Model headcount for 4 months with 12 hires and 2 separations each month').hires,'12');
 assert.equal(projectionEntryValues('Project headcount with 12 hires this year').hires,'');
 assert.equal(projectionEntryValues('Project headcount with 0 hires and 0 exits per month for 2 months').exits,'0');
 assert.equal(projectionEntryValues('Project headcount for 2 months or 6 months').months,'');
 assert.equal(projectionEntryValues('Project headcount for 6 months with 12 hires per year and 3 exits per month').hires,'');
 assert.equal(projectionEntryValues('Project headcount for 6 months with -5 hires per month').hires,'');
 assert.equal(projectionEntryValues('Project headcount for 1.5 months').months,'');
 assert.equal(projectionEntryValues('Project headcount for 6 months with 5 hires per month and 8 hires per month, plus 3 exits per month').hires,'');
 assert.equal(projectionEntryValues('Project headcount with minus five hires per month').hires,'');
 assert.equal(isHeadcountEntry('Which groups have a capacity gap?'),false);
});
const history=[['2026-06-30',100,90],['2026-07-31',98,88],['2026-08-31',96,86],['2026-09-30',94,84]].map(([snapshot_date,headcount,fte])=>({snapshot_date,headcount,fte}));
const group={code:'A',label:'Group A',asOf:'2026-09-30',headcount:94,fte:84,history};
test('recent group stock trend preserves units, requested horizon and conditional values rather than inventing gross flows',()=>{
 const r=groupWorkforceTrend(group,3,3);assert.equal(r.from,'2026-06-30');assert.equal(r.observed.headcount,-2);assert.equal(r.deltaFte,-6);assert.equal(r.points.at(-1).month,'2026-12-31');assert.equal(r.points.at(-1).headcount,88);assert.equal('hires' in r,false);assert.equal('gap' in r,false);
 const flat=groupWorkforceTrend(group,3,3,{headcount:0,fte:0});assert.equal(flat.deltaFte,0);assert.equal(flat.points.at(-1).fte,84);assert.equal(group.history[0].headcount,100);
});
test('missing months, wrong snapshots, invalid stocks and infeasible edits fail without zero fill or clamps',()=>{
 assert.throws(()=>groupWorkforceTrend({...group,history:history.filter((_,i)=>i!==1)}));
 assert.throws(()=>groupWorkforceTrend({...group,history:[...history.slice(0,3),{...history[3],headcount:93}]}));
 assert.throws(()=>groupWorkforceTrend(group,3,3,{headcount:-40,fte:-40}));
 assert.throws(()=>groupWorkforceTrend(group,3,3,{headcount:0,fte:20}));
 assert.throws(()=>groupWorkforceTrend(group,3,0));assert.throws(()=>groupWorkforceTrend(group,3,2.5));
});
