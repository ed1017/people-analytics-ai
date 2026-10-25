import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardRiskSummary as summary} from '../../lib/dashboard-risk-summary.ts';
import {groupWorkforceTrend} from '../../lib/group-workforce-trend.ts';
const all={country:'all',org:'all',level:'all'},asOf='2026-09-30';
import {loadPublic9037Binding} from '../../lib/public-9037.server.mjs';
import {readCapacityRiskGroups} from '../../lib/group-capacity-risk-source.ts';
test('released synthetic API evidence produces the exact shared planner values',async()=>{const binding=await loadPublic9037Binding({hostname:'people-analytics-gkl61lnek-ed-56dc.vercel.app',production:true});const read=async path=>{const r=await binding.handle(new Request('https://www.ed-ai.app'+path));assert.equal(r.status,200);return r.json();};const a=await read('/api/attrition');const dashboards=await Promise.all([...a.business_units.map(g=>g.org_code),'all'].map(org=>read('/api/dashboard?'+new URLSearchParams({...all,org}))));const g=readCapacityRiskGroups(a,dashboards),r=summary(g,all,asOf);assert.equal(r.rows.length,8);assert.ok(r.declines.length>0);for(const {group,trend} of r.rows){assert.deepEqual(trend,groupWorkforceTrend(group));assert.equal(summary(g,{...all,org:group.code},asOf).rows[0].group.code,group.code);}console.log('Released risk comparison:',r.rows.map(x=>({group:x.group.code,deltaFte:x.trend.deltaFte})));});
