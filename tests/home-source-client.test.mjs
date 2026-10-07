import test from 'node:test';
import assert from 'node:assert/strict';
import {HomeSourceRequests,sameHomeSourceResults} from '../lib/home-source-client.ts';
import {SurveySourceRequests} from '../lib/survey-source-client.ts';
import {SourceRequests} from '../lib/source-request-cache.ts';

const loaded=value=>({status:'loaded',data:{summary:{value}}});
const failed={status:'unavailable',data:null};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};

test('Home observes Listening/Attrition recovery before its old five-minute bundle would expire',async()=>{
 let now=0,surveyCalls=0;const calls=new Map();
 const survey=new SurveySourceRequests(async()=>++surveyCalls===1?failed:loaded(23),()=>now);
 const home=new HomeSourceRequests(async url=>{calls.set(url,(calls.get(url)??0)+1);return loaded(1)},survey,()=>now);
 const first=await home.read('?country=all');assert.equal(first['survey-sentiment'].status,'unavailable');
 now=29999;assert.equal(sameHomeSourceResults(first,home.peek('?country=all')),true);
 now=30000;assert.equal(home.peek('?country=all'),null);
 const listening=await survey.read();assert.equal(listening.data.summary.value,23);
 const returned=await home.read('?country=all');
 assert.equal(returned['survey-sentiment'],listening);assert.equal(surveyCalls,2);
 assert.equal(sameHomeSourceResults(first,returned),false);
 assert.equal(sameHomeSourceResults(returned,await home.read('?country=all')),true);
 assert.ok([...calls.values()].every(count=>count===1),'healthy sources are not fetched again');
});

test('only failed Home sources retry on later entry, while success remains cached',async()=>{
 let now=0;const calls=new Map();const survey=new SurveySourceRequests(async()=>loaded(1),()=>now);
 const home=new HomeSourceRequests(async url=>{const count=(calls.get(url)??0)+1;calls.set(url,count);return url==='/api/workforce'&&count===1?failed:loaded(count)},survey,()=>now);
 const first=await home.read('');assert.equal(first.workforce.status,'unavailable');
 now=29999;await home.read('');assert.equal(calls.get('/api/workforce'),1);
 now=30000;assert.equal(calls.get('/api/workforce'),1,'time passing never starts a retry');
 const next=await home.read('');assert.equal(next.workforce.status,'loaded');assert.equal(calls.get('/api/workforce'),2);
 assert.equal(next.attrition,first.attrition);assert.equal(calls.get('/api/attrition'),1);
});

test('repeated failures use capped backoff, reset on success, and never auto-refresh',async()=>{
 let now=0,calls=0,recover=false;const source=new SourceRequests(async()=>{calls++;return recover?loaded(calls):failed},()=>now);
 await source.read();
 for(const [before,due,expectedCalls] of [[29999,30000,2],[89999,90000,3],[209999,210000,4],[329999,330000,5]]){
  now=before;await source.read();assert.equal(calls,expectedCalls-1);
  now=due;assert.equal(calls,expectedCalls-1);await source.read();assert.equal(calls,expectedCalls);
 }
 recover=true;now=450000;assert.equal((await source.read()).status,'loaded');assert.equal(calls,6);
 recover=false;now=750000;await source.read();assert.equal(calls,7);
 now+=30000;await source.read();assert.equal(calls,8,'a success resets failure backoff');
});

test('rapid navigation, explicit refresh and an aborted subscriber share one in-flight request per source',async()=>{
 const pending=deferred();const calls=new Map();let surveyCalls=0;
 const survey=new SurveySourceRequests(()=>{surveyCalls++;return pending.promise});
 const home=new HomeSourceRequests(url=>{calls.set(url,(calls.get(url)??0)+1);return pending.promise},survey);
 const controller=new AbortController();const leaving=home.read('',controller.signal);
 controller.abort();home.invalidate('');const returning=home.read(''),listening=survey.read();
 await Promise.resolve();assert.ok([...calls.values()].every(count=>count===1));assert.equal(surveyCalls,1);
 const cancelled=await leaving;assert.ok(Object.values(cancelled).every(result=>result.status==='unavailable'));
 pending.resolve(loaded(42));const next=await returning;assert.equal(next['survey-sentiment'],await listening);
 assert.equal(sameHomeSourceResults(next,home.peek('')),true);
});

test('changing workforce filters isolates dashboard data and reuses company-wide sources',async()=>{
 const calls=new Map();const survey=new SurveySourceRequests(async()=>loaded(1));
 const home=new HomeSourceRequests(async url=>{calls.set(url,(calls.get(url)??0)+1);return loaded(url)},survey);
 const first=await home.read('?country=US');const second=await home.read('?country=UK');
 assert.notEqual(first.dashboard,second.dashboard);assert.equal(first.workforce,second.workforce);
 assert.equal(second.dashboard.data.summary.value,'/api/dashboard?country=UK');
 assert.equal(sameHomeSourceResults(first,await home.read('?country=US')),true);
 assert.ok([...calls.values()].every(count=>count===1));
});

test('explicit refresh bypasses settled failures without resurrecting old successful data',async()=>{
 let fail=false;const survey=new SurveySourceRequests(async()=>fail?failed:loaded(1));
 const home=new HomeSourceRequests(async()=>fail?failed:loaded(1),survey);
 const first=await home.read('');fail=true;home.invalidate('');const next=await home.read('');
 assert.ok(Object.values(first).every(result=>result.status==='loaded'));
 assert.ok(Object.values(next).every(result=>result.status==='unavailable'&&result.data===null));
 fail=false;home.invalidate('');assert.ok(Object.values(await home.read('')).every(result=>result.status==='loaded'));
});

test('already cancelled Home read starts no network work',async()=>{
 let calls=0;const load=async()=>{calls++;return loaded(1)};const survey=new SurveySourceRequests(load),home=new HomeSourceRequests(load,survey);
 const controller=new AbortController();controller.abort();await home.read('',controller.signal);assert.equal(calls,0);
});
