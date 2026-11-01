import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {projectPublic9037,public9037Fields} from '../lib/public-9037-projection.mjs';
import {create9037OfflineProvider,OFFLINE_9037_INTEGRITY_DIGEST} from '../lib/dataset-9037-offline-provider.mjs';
import {create9037JointDashboard} from '../lib/dataset-9037-joint-dashboard.mjs';
const digest='a'.repeat(64);
test('default public dashboard does not authorize new history fields',()=>{
 assert.equal(public9037Fields['/api/dashboard'].some(x=>x.startsWith('turnover_history')),false);
 assert.throws(()=>projectPublic9037('/api/dashboard',{turnover_history:[{month:'2024-01-01',total_exits:null,voluntary_exits:null,headcount:20}]},digest),/Unreviewed/);
});
// Actual private artifacts stay outside the public export. Set this variable for
// source acceptance; portable projection tests above always execute in public CI.
const directory=process.env.TURNOVER_HISTORY_ARTIFACT_DIR;
let reader,joint,rows;
async function actual(){
 if(reader)return reader;
 const read=name=>fs.readFileSync(path.join(directory,name));
 const bytes=read('joint-dashboard.json');assert.equal(createHash('sha256').update(bytes).digest('hex'),'bc2cee280389fa646dfdb7901ded66946b4552c65d59d00a0c616bd0cf28d8a8');
 const aggregate=read('captured-62-queries.json');assert.equal(createHash('sha256').update(aggregate).digest('hex'),'075bcb282ba21785d40190ff115bd20d7c0606f5615f314c5f60d7d30784bd7b');
 joint=JSON.parse(bytes);rows=JSON.parse(aggregate);
 const provider=create9037OfflineProvider({expectedIntegrityDigest:OFFLINE_9037_INTEGRITY_DIGEST,integrityBytes:read('integrity-manifest.json'),contractBytes:read('component-contracts.json'),componentBytes:read('components.json')});
 reader=await create9037JointDashboard({jointBytes:bytes,provider,rows});return reader;
}
const all={country:'all',org:'all',level:'all'};
test('actual pinned company rows reconcile every published stock and exit count; January group exits stay unknown',{skip:!directory},async()=>{
 const reader=await actual(),data=reader.dashboardResponse(all),history=reader.turnoverHistory(all);assert.equal(Object.hasOwn(data,'turnover_history'),false);assert.equal(history.length,33);
 history.forEach((r,i)=>{assert.equal(r.month,rows.attrition_monthly_trend[i].month);assert.equal(r.headcount,rows.dashboard_headcount_trend[i].headcount);assert.equal(r.total_exits,i?rows.attrition_monthly_trend[i].total_exits:null);assert.equal(r.voluntary_exits,i?rows.attrition_monthly_trend[i].voluntary_exits:null);});
 assert.deepEqual(data.overview,rows.dashboard[0].payload.overview);
 assert.deepEqual(data.trend,rows.dashboard_headcount_trend.map(({snapshot_date,headcount,fte})=>({snapshot_date,headcount,fte})));
});
test('actual country BU and level partitions reconcile to company without double counting',{skip:!directory},async()=>{
 const r=await actual(),company=r.turnoverHistory(all);
 for(const dimension of ['country','org','level']){
  const parts=joint.dimensions[dimension].map(value=>r.turnoverHistory({...all,[dimension]:value}));
  company.forEach((row,i)=>{for(const k of ['headcount','total_exits','voluntary_exits']){if(i===0&&k!=='headcount')assert.ok(parts.every(p=>p[i][k]===null));else assert.equal(parts.reduce((sum,p)=>sum+p[i][k],0),row[k]);}});
 }
});
test('actual intersections retain scoped history, sparse known zero and zero-headcount values',{skip:!directory},async()=>{
 const r=await actual();let empty=0,zeroFlows=0;
 const keys=joint.dimensions.country.flatMap(country=>joint.dimensions.org.flatMap(org=>joint.dimensions.level.map(level=>({country,org,level}))));
 for(let ci=0;ci<keys.length;ci++){
  const d=r.dashboardResponse(keys[ci]),history=r.turnoverHistory(keys[ci]);assert.equal(history.length,33);
  history.forEach((row,mi)=>{assert.equal(row.headcount,d.trend[mi].headcount);if(!mi){assert.equal(row.total_exits,null);return;}const flow=joint.flows.find(f=>f[0]===mi&&f[1]===ci);assert.equal(row.total_exits,flow?.[3]??0);assert.equal(row.voluntary_exits,flow?.[4]??0);if(!row.headcount)empty++;if(!flow)zeroFlows++;});
 }
 assert.ok(empty>0);assert.ok(zeroFlows>0);
 assert.throws(()=>r.dashboardResponse({...all,country:'unknown'}));
});

test('actual public default digest and responses equal the unchanged baseline binding',{skip:!directory||!process.env.TURNOVER_HISTORY_BASELINE_MODULE},async()=>{
 const {pathToFileURL}=await import('node:url');const priorCwd=process.cwd();
 try{process.chdir(path.dirname(directory));
 const {loadPublic9037Binding}=await import('../lib/public-9037.server.mjs');
 const baseline=await import(pathToFileURL(process.env.TURNOVER_HISTORY_BASELINE_MODULE).href);
 const options={hostname:'www.ed-ai.app'},current=await loadPublic9037Binding(options),old=await baseline.loadPublic9037Binding(options);
 assert.deepEqual(current.router.current(),old.router.current());
 for(const filters of [all,{country:'US',org:'BU-DIGITAL',level:'L7'}]){
 const query=new URLSearchParams(filters),request=()=>new Request('https://www.ed-ai.app/api/dashboard?'+query);
 const response=await current.handle(request()),expected=await old.handle(request());assert.equal(response.status,200);assert.deepEqual(await response.json(),await expected.json());
 const history=await current.turnoverHistory(filters);assert.equal(history.rows.length,33);assert.equal(history.bundleDigest,current.router.current().digest);assert.equal(history.contract,'public-group-turnover-history-v1');assert.deepEqual(history.filters,filters);assert.deepEqual(Object.keys(history.rows[0]).sort(),['headcount','month','total_exits','voluntary_exits']);
 }
 await assert.rejects(current.turnoverHistory({...all,country:'invalid'}));
 }finally{process.chdir(priorCwd);}
});
