import test from 'node:test';
import assert from 'node:assert/strict';
import {homeRecruitingKpi} from '../lib/home-kpi-source.ts';
const snapshot='2026-09-30';
const fixture=()=>({status:'loaded',data:{as_of:snapshot,summary:{hires:999},monthly:[{month:'2026-08-01',hires:12},{month:'2026-09-01',hires:7}]}});
const read=(source=fixture(),settled=true,token='legacy-v1:0',date=snapshot)=>homeRecruitingKpi(source,settled,token,date);
test('recruiting KPI uses only exact current-month recorded count, retaining its separate period',()=>{
 assert.deepEqual(read(),{hires:7,month:'2026-09',asOf:snapshot});
 const source=fixture();source.data.monthly[1].hires=0;
 assert.equal(read(source).hires,0);
});
test('unsettled, wrong dataset, stale cutoff, suppression and unknown counts stay unavailable',()=>{
 assert.equal(read(undefined,false),null);
 for(const token of ['legacy-v1:1','other:0'])assert.equal(read(undefined,true,token),null);
 for(const value of [null,-1,1.2,'7',Infinity]){const source=fixture();source.data.monthly[1].hires=value;assert.equal(read(source),null);}
 for(const change of [s=>s.status='timeout',s=>s.data.as_of='2026-08-31',s=>s.data.suppressed=true,s=>s.data.monthly[1].suppressed=true,s=>s.data.monthly.push(s.data.monthly[1]),s=>s.data.monthly.pop(),s=>s.data.data_meta={datasetId:'other'}]){const source=fixture();change(source);assert.equal(read(source),null);}
 assert.equal(read(undefined,true,'legacy-v1:0','2026-02-31'),null);
});
