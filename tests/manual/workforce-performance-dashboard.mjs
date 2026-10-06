// Actual built Next route + loopback-only fake Supabase. No remote database or credentials.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {performanceWireFixture} from '../fixtures/workforce-performance-release.mjs';
const sourcePort=4250,appPort=3243;let mode='inactive',calls=[];
const source=createServer(async(req,res)=>{
 let body='';for await(const chunk of req)body+=chunk;const args=JSON.parse(body||'{}');calls.push({path:req.url,args});res.setHeader('Content-Type','application/json');
 if(req.url==='/rest/v1/rpc/dashboard_overview_filtered')return res.end(JSON.stringify({overview:{snapshot_date:'2026-09-30',headcount:args.p_org_code?1000:10000},trend:[],filter_options:{countries:[],business_units:[],levels:[]}}));
 assert.equal(req.url,'/rest/v1/rpc/workforce_performance_release_v1','no source/private fallback');
 if(mode==='error'){res.statusCode=403;return res.end(JSON.stringify({message:'fixture denied'}))}
 const payload=mode==='inactive'?null:performanceWireFixture(args.p_org_code);
 if(mode==='malformed')payload.counts.notRated=0;
 res.end(JSON.stringify(payload));
});
await new Promise(resolve=>source.listen(sourcePort,'127.0.0.1',resolve));
const child=spawn('node',['node_modules/next/dist/bin/next','start','--port',String(appPort)],{env:{...process.env,SUPABASE_URL:`http://127.0.0.1:${sourcePort}`,SUPABASE_SECRET_KEY:'local-fixture-only',OPENAI_API_KEY:'local-fixture-only'},stdio:['ignore','pipe','pipe']});
let serverLog='';child.stdout.on('data',s=>serverLog+=s);child.stderr.on('data',s=>serverLog+=s);
try{
 for(let i=0;i<100&&!serverLog.includes('Ready');i++)await new Promise(resolve=>setTimeout(resolve,100));assert(serverLog.includes('Ready'),'local Next server starts');
 const get=async query=>{calls=[];const response=await fetch(`http://127.0.0.1:${appPort}/api/dashboard${query}`);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');return response.json()};
 for(const state of ['inactive','error','malformed']){mode=state;const data=await get('');assert.equal(data.overview.headcount,10000);assert.equal(data.performance_rating,null);assert.equal(calls.length,2);console.log('PASS dashboard preserved with '+state+' ratings')}
 mode='available';const data=await get('?org=BU-TECH');assert.deepEqual(data.performance_rating.counts.ratings,[40,120,520,260,60]);assert.deepEqual(calls[1].args,{p_country_code:'all',p_org_code:'BU-TECH',p_level_code:'all'});assert(data.performance_rating.release.publishedAt);console.log('PASS exact named args, BU scope and safe projection');
 for(const query of ['?country=US','?level=IC2','?org=bu-tech','?org=all&org=BU-TECH','?org[]=BU-TECH','?period=2025','?org=%20all']){const data=await get(query);assert.equal(data.performance_rating,null);assert.equal(calls.length,1);console.log('PASS no rating lookup for '+query)}
 console.log('PASS 11 actual-route cases; all service traffic stayed on loopback');
}finally{child.kill('SIGTERM');await new Promise(resolve=>source.close(resolve))}
