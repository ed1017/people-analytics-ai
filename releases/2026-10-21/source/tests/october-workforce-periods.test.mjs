import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateQuarterlyTurnover} from '../lib/home-quarterly-turnover.mjs';
import {queryWorkforceHistory} from '../lib/home-history-query.mjs';
import {POSITION_INVENTORIES} from '../lib/position-inventory.ts';
import {isPublicProjectionVersion,isStoredPublicProjectionVersion} from '../lib/public-projection-contract.mjs';
import {businessUnitTurnoverReply} from '../lib/home-bu-turnover-chat.mjs';

test('October does not turn a partial fourth quarter into a full quarterly rate',()=>{
 const history=Array.from({length:34},(_,i)=>({month:new Date(Date.UTC(2024,i,1)).toISOString().slice(0,10),headcount:100,total_exits:i?2:null,voluntary_exits:i?1:null}));
 const result=calculateQuarterlyTurnover(history,{year:2026,quarters:[],metric:'voluntary'},'2026-10-31');
 assert.equal(result[2].ratePct,3);
 assert.equal(result[3].status,'unavailable');assert.equal(result[3].ratePct,null);assert.equal(result[3].exitCount,null);
 assert.match(result[3].reason,/not fully observed/);
});
test('history includes October, preserves September, and refuses a future stock',()=>{
 const trend=Array.from({length:34},(_,i)=>({snapshot_date:new Date(Date.UTC(2024,i+1,0)).toISOString().slice(0,10),headcount:100+i,fte:90+i}));
 const result=queryWorkforceHistory({trend},{metric:'headcount',start:'2026-09-30',end:'2026-10-31'});
 assert.equal(result.status,'available');assert.equal(result.change,1);assert.equal(result.points.length,2);
 assert.match(queryWorkforceHistory({trend},{metric:'headcount',start:'2026-09-30',end:'2026-11-30'}).answer,/through 2026-10-31/);
 assert.equal(queryWorkforceHistory({trend:trend.slice(0,33)},{metric:'headcount',start:'2026-08-31',end:'2026-09-30'}).status,'available');
});
test('new October positions coexist with immutable September inventory versions',()=>{
 const current=POSITION_INVENTORIES.find(i=>i.version==='company-position-model-v3');
 const prior=POSITION_INVENTORIES.find(i=>i.version==='company-position-model-v2');
 assert.equal(current.asOf,'2026-10-31');assert.equal(current.positions.length,9254);
 assert.equal(current.positions.filter(p=>p.status==='vacant').length,162);
 assert.ok(Math.abs(current.positions.filter(p=>p.status==='filled').reduce((n,p)=>n+p.fte,0)-8904.8)<0.001);
 assert.equal(prior.asOf,'2026-09-30');assert.equal(prior.positions.length,9234);assert.equal(prior.positions.filter(p=>p.status==='vacant').length,197);
 const ids=new Set(prior.positions.map(p=>p.id));assert.ok(current.positions.every(p=>!ids.has(p.id)));
});
test('saved September public references remain readable but cannot authorize October evidence',()=>{
 const old={datasetId:'workforce-demo-9037-public-aggregates-v4',datasetToken:'workforce-demo-9037-public-aggregates-v4:5',publicDigest:'a'.repeat(64),cutoff:'2026-09-30',provenance:'approved-public-projection-v1',contract:'public-synthetic-aggregates-and-calculations-v1',publicationReceiptId:'edwin-coordinated-synthetic-realism-2026-10-23'};
 assert.equal(isStoredPublicProjectionVersion(old),true);assert.equal(isPublicProjectionVersion(old),false);
 assert.equal(isStoredPublicProjectionVersion({...old,cutoff:'2026-10-31'}),false);
});
test('an explicit September BU request is not silently changed to October YTD',async()=>{
 const result=await businessUnitTurnoverReply('Show voluntary turnover by business unit January-September 2026',[],()=>assert.fail('must ask before changing period'),new AbortController().signal);
 assert.equal(result.charts.length,0);assert.match(result.answer,/January-October 2026/);assert.match(result.answer,/Would you like/);
});
