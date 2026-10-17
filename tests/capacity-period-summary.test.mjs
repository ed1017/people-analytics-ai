import test from 'node:test';
import assert from 'node:assert/strict';
import {capacityPeriodSummary,formatShortfallFte} from '../lib/capacity-period-summary.ts';
import {capacitySpec} from '../lib/swp-capacity-draft.ts';
import {calculateMonthlyWorkload} from '../lib/swp-monthly-workload.ts';
const draft={scope:'Service desk - tickets',openingDate:'2026-09-30',months:'6',people:'40',fte:'40',volume:'8000',effort:'1',hours:'160',hires:'4',exits:'1',hireFte:'1',exitFte:'1',allocation:'100',productivity:'0',costRate:'',fullTimeMovements:true,confirmed:true};
const calculate=(changes={})=>calculateMonthlyWorkload(capacitySpec({...draft,...changes}));

test('early monthly shortfalls survive a final surplus without mutating calculations',()=>{
 const result=calculate(),before=structuredClone(result);
 assert.deepEqual(result.points.map(p=>p.gapFte),[7,4,1,-2,-5,-8]);
 assert.deepEqual(capacityPeriodSummary(result),{months:6,knownMonths:6,unknownMonths:0,shortfallMonths:3,firstShortfall:'2026-10',peakShortfall:{month:'2026-10',fte:7}});
 assert.deepEqual(result,before);
});
test('all covered months, exact coverage and repeated shortages remain distinct',()=>{
 assert.equal(capacityPeriodSummary(calculate({people:'60',fte:'60'})).shortfallMonths,0);
 assert.equal(capacityPeriodSummary(calculate({people:'50',fte:'50',hires:'1'})).shortfallMonths,0);
 const all=capacityPeriodSummary(calculate({hires:'1'}));
 assert.equal(all.shortfallMonths,6);assert.deepEqual(all.peakShortfall,{month:'2026-10',fte:10});
});
test('unknown gaps never become covered months or zero shortages',()=>{
 const spec=capacitySpec(draft);spec.months[1].volume={value:null,unit:'work-units/month',basis:{kind:'unknown',note:'Not supplied'}};
 const summary=capacityPeriodSummary(calculateMonthlyWorkload(spec));
 assert.equal(summary.knownMonths,5);assert.equal(summary.unknownMonths,1);assert.equal(summary.shortfallMonths,2);
 const unknown=capacityPeriodSummary(calculate({volume:''}));
 assert.equal(unknown.unknownMonths,6);assert.equal(unknown.knownMonths,0);assert.equal(unknown.peakShortfall,null);assert.equal(unknown.firstShortfall,null);
 assert.equal(capacityPeriodSummary(null),null);
});
test('positive sub-cent FTE gaps stay visible and are counted',()=>{
 const result=calculate({volume:'6400.001',hires:'1'});
 assert.equal(capacityPeriodSummary(result).shortfallMonths,6);
 assert.equal(formatShortfallFte(result.points[0].gapFte),'<0.01');
 assert.equal(formatShortfallFte(0.01),'0.01');assert.equal(formatShortfallFte(7),'7');
});
