import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveWorkforcePerformance as resolve, parsePerformanceFilters, PERFORMANCE_BUS} from '../lib/workforce-performance.ts';
import {performanceFixture as fixture} from './fixtures/workforce-performance-release.mjs';
const all={country:'all',org:'all',level:'all'};
test('company frozen totals and all eight BU signatures resolve',()=>{
 for(const org of ['all',...PERFORMANCE_BUS]){const f=fixture(org);assert.deepEqual(resolve(f,f.filters,f.counts.population),f)}
 assert.deepEqual(resolve(fixture(),all,10000).counts.ratings,[400,1200,5200,2600,600]);
});
test('unsupported scopes never return counts, even with matching spoofed filters',()=>{
 for(const filters of [{...all,country:'US'},{...all,level:'IC2'},{...all,org:'unknown'}]){const f=fixture();f.filters=filters;assert.equal(resolve(f,filters),null)}
 assert.equal(resolve(fixture(),{...all,org:'BU-TECH'}),null);
});
test('inactive, absent, error and malformed releases fail closed',()=>{
 for(const value of [null,[],{}, {error:'denied'}, {...fixture(),status:'inactive'}, {...fixture(),active:false}, {...fixture(),status:'unavailable'}, {...fixture(),status:'suppressed'}])assert.equal(resolve(value,all),null);
 for(const [key,value] of [['version','other'],['contentDigest','other'],['snapshotDate','2026-10-01'],['source','employee_snapshots.performance_rating'],['reviewPeriod','2026 Annual'],['availabilityKind','verified'],['originalAvailableAt','2026-09-30']])assert.equal(resolve({...fixture(),[key]:value},all),null);
 assert.equal(resolve(fixture(),all,9999),null);
 assert.equal(resolve(fixture(),all,null),null);
});
test('not-rated cannot become zero and malformed counts cannot become bars',()=>{
 for(const change of [{notRated:0},{notRatedStatus:'verified'},{rated:9999},{unavailable:1},{ratings:[400,1200,5200,2600,599]},{ratings:[400,1200,5200,2600,600,0]},{ratings:['400',1200,5200,2600,600]},{ratings:[401,1199,5200,2600,600]}]){const f=fixture();Object.assign(f.counts,change);assert.equal(resolve(f,all),null)}
 const f=fixture('BU-TECH');f.counts.ratings=[9,151,520,260,60];assert.equal(resolve(f,f.filters),null);
});
test('release projection strips unexpected top-level data',()=>{
 const f=fixture();assert.deepEqual(resolve({...f,employee_id:'never expose'},all),f);
});
test('request validation rejects duplicates, arrays, arbitrary periods and malformed scalars',()=>{
 assert.deepEqual(parsePerformanceFilters(new URLSearchParams()),all);
 for(const query of ['org=all&org=BU-TECH','org[]=BU-TECH','period=2025','org=BU-TECH,BU-CORP','country=','level=<x>'])assert.equal(parsePerformanceFilters(new URLSearchParams(query)),null);
});
test('UI uses no separate demo cohort and ratings stay outside AI context',()=>{
 const page=fs.readFileSync('components/pages/career-growth-mobility-page.tsx','utf8');assert(!page.includes('SyntheticCareerDemoPanel'));
 const ui=fs.readFileSync('components/workforce-performance.tsx','utf8');assert(!ui.includes('<select'));assert(!ui.includes('fixtures'));assert(ui.includes('Promotion rate'));assert(ui.includes('Median time in prior level'));
 const source=fs.readFileSync('app/page.tsx','utf8');const context=source.slice(source.indexOf('careerGrowthMobilityContext:'),source.indexOf('careerGrowthMobilityContext:')+1900);assert(!context.includes('workforcePerformance'));
});
