import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptPerformanceRelease,loadPerformanceRelease,parsePerformanceFilters} from '../lib/workforce-performance.ts';
import {performanceFixture,performanceWireFixture} from './fixtures/workforce-performance-release.mjs';
const filters={country:'all',org:'all',level:'all'};
test('verified wire contract projects only safe internal aggregate',()=>{
 const wire=performanceWireFixture();assert.deepEqual(adaptPerformanceRelease(wire,filters,10000),{...performanceFixture(),release:wire.release});
 const bu=performanceWireFixture('BU-TECH');assert.deepEqual(adaptPerformanceRelease(bu,bu.filters,1000),{...performanceFixture('BU-TECH'),release:bu.release});
});
test('unpublished/malformed wire cannot become available',()=>{
 for(const publishedAt of [null,'<actual activation UTC timestamp>','2026-09-30T23:59:59Z','bad','2026-10-06']){const f=performanceWireFixture();f.release.publishedAt=publishedAt;assert.equal(adaptPerformanceRelease(f,filters,10000),null)}
 for(const change of [{notRatedStatus:'verified'},{periodKind:'annual'},{provenance:'real'}, {release:null}])assert.equal(adaptPerformanceRelease({...performanceWireFixture(),...change},filters,10000),null);
 assert.equal(adaptPerformanceRelease(performanceFixture(),filters,10000),null);
});
test('only exact invoker name with all named scalar arguments is called',async()=>{
 const calls=[];const value=await loadPerformanceRelease(async(name,args)=>{calls.push([name,args]);return {data:performanceWireFixture(),error:null}},filters,10000);
 assert.deepEqual(value,{...performanceFixture(),release:performanceWireFixture().release});assert.deepEqual(calls,[['workforce_performance_release_v1',{p_country_code:'all',p_org_code:'all',p_level_code:'all'}]]);
});
test('inactive/null/error/throw and invalid filters never have a fallback',async()=>{
 for(const rpc of [async()=>({data:null,error:null}),async()=>({data:performanceWireFixture(),error:'denied'}),async()=>{throw Error('down')}])assert.equal(await loadPerformanceRelease(rpc,filters,10000),null);
 let calls=0;for(const f of [null,{...filters,country:'US'},{...filters,level:'IC2'},{...filters,org:'bu-tech'},parsePerformanceFilters(new URLSearchParams('org=all&org=BU-TECH'))])assert.equal(await loadPerformanceRelease(async()=>{calls++;throw Error('must not call')},f,10000),null);assert.equal(calls,0);
});
