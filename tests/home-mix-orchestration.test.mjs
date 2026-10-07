import test from 'node:test';
import assert from 'node:assert/strict';
import {createHomeMixOrchestration,homeMixRequestKey} from '../lib/home-mix-orchestration.ts';
import {readFileSync} from 'node:fs';
const turn=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function source(overrides={}){return {identity:{goalId:'g',bindingKey:'goal/evidence/planning',inputKey:'revision-1',bundleId:'A',revision:1,preparationId:'prepared'},source:{roles:5,budget:10000,cashPolicy:'cash-hours-v2',bounds:{build:[0,5],move:[0,5],buy:[0,5]},objective:'minimum-complete-cash',origins:{payroll:'illustrative'},...overrides}};}
function harness(options={}){
 const tasks=new Map(),calls=[],reads=[];let now=0,id=0;
 const scheduler={schedule:(fn,delay)=>{tasks.set(++id,{fn,at:now+delay});return id;},cancel:key=>tasks.delete(key)};
 const adapter={version:'fixture-v1',search:(request,signal)=>{const task=deferred();calls.push({request,signal,...task});return task.promise;},read:(raw,request,signal)=>{reads.push({raw,request,signal});return raw?.requestKey===homeMixRequestKey('fixture-v1',request)?raw:null;},...options.adapter};
 const coordinator=createHomeMixOrchestration(adapter,{scheduler,debounceMs:250,maxCached:options.maxCached??12});
 const run=(request=source(),trigger='initial',isCurrent=()=>true)=>coordinator.run({request,trigger,isCurrent});
 const advance=async(ms=0)=>{now+=ms;for(const [key,task] of tasks)if(task.at<=now){tasks.delete(key);task.fn();}await turn();};
 const reply=(index,extra={})=>calls[index].resolve({requestKey:homeMixRequestKey(adapter.version,calls[index].request),status:'complete',bestCandidateId:'buy-5',cash:487500,...extra});
 return {coordinator,adapter,run,advance,reply,calls,reads,tasks};
}
test('initial preparation runs automatically once and returns a verified immutable proposal without persistence',async()=>{
 const h=harness(),request=source(),before=JSON.stringify(request),a=h.run(request),b=h.run(structuredClone(request));
 assert.equal(a,b);assert.equal(h.coordinator.getSnapshot().status,'queued');await h.advance();assert.equal(h.calls.length,1);
 h.reply(0);const result=await a;assert.equal(result.status,'ready');assert.equal(result.report.cash,487500);assert.equal(h.reads.length,1);
 assert.equal(JSON.stringify(request),before);assert.throws(()=>result.report.cash=0,TypeError);assert.throws(()=>h.calls[0].request.source.budget=0,TypeError);
 assert.deepEqual(await h.run(request),result);assert.equal(h.calls.length,1);
 const saved=JSON.parse(readFileSync(new URL('./fixtures/home-capacity-cash-v1.json',import.meta.url))),history=JSON.stringify(saved);
 const preserved=h.run(source({saved}));await h.advance();h.reply(1);await preserved;assert.equal(JSON.stringify(saved),history);
 h.coordinator.dispose();
});
test('rapid changed constraints debounce, settle cancelled promises and search only the final complete source',async()=>{
 const h=harness(),a=h.run(source({budget:10000}),'constraint-change');await h.advance(100);
 const b=h.run(source({budget:20000}),'constraint-change');assert.equal((await a).status,'stale');await h.advance(100);
 const c=h.run(source({budget:30000}),'constraint-change');assert.equal((await b).status,'stale');await h.advance(249);assert.equal(h.calls.length,0);
 await h.advance(1);assert.equal(h.calls.length,1);assert.equal(h.calls[0].request.source.budget,30000);h.reply(0);assert.equal((await c).status,'ready');
});
test('identical full inputs share an in-flight request without restarting its debounce',async()=>{
 const h=harness(),a=h.run(source(),'constraint-change');await h.advance(200);const b=h.run(source(),'constraint-change');assert.equal(a,b);await h.advance(50);assert.equal(h.calls.length,1);h.reply(0);await a;
});
test('explanations, Compare, Attach and passive reads never start searches or discard a current result',async()=>{
 const h=harness();for(const trigger of ['explanation','compare','attach','passive'])assert.equal((await h.run(source(),trigger)).status,'ignored');assert.equal(h.calls.length,0);
 const a=h.run();await h.advance();for(const trigger of ['compare','attach','explanation'])await h.run(source(),trigger);assert.equal(h.calls[0].signal.aborted,false);
 h.reply(0);const result=await a;for(const trigger of ['explanation','compare','attach','passive']){await h.run(source(),trigger);assert.equal(h.coordinator.getSnapshot(),result);}assert.equal(h.calls.length,1);
 h.coordinator.invalidate();await h.run(source(),'passive');assert.equal(h.coordinator.getSnapshot(),result);assert.equal(h.calls.length,1);
});
test('superseded workers are cancelled immediately and ignored even if they reply late',async()=>{
 const h=harness(),a=h.run();await h.advance();const b=h.run(source({budget:500000}),'constraint-change');assert.equal(h.calls[0].signal.aborted,true);assert.equal((await a).status,'stale');
 h.reply(0);await turn();assert.equal(h.reads.length,0);assert.equal(h.coordinator.getSnapshot().status,'queued');await h.advance(250);h.reply(1);assert.equal((await b).report.requestKey,homeMixRequestKey('fixture-v1',source({budget:500000})));
});
test('cancellation while asynchronous report verification is pending cannot publish an old candidate',async()=>{
 const check=deferred(),h=harness({adapter:{read:()=>check.promise}}),a=h.run();await h.advance();h.reply(0);await turn();h.coordinator.invalidate();assert.equal((await a).status,'stale');check.resolve({status:'complete',cash:0});await turn();assert.equal(h.coordinator.getSnapshot().status,'idle');
});
test('switch-away/back uses a new flight; the previous goal reply cannot overwrite it',async()=>{
 const h=harness(),a=h.run();await h.advance();h.coordinator.invalidate();const b=h.run();await h.advance();assert.equal(h.calls.length,2);h.reply(0);await turn();assert.equal(h.coordinator.getSnapshot().status,'running');h.reply(1);assert.equal((await b).status,'ready');assert.equal((await a).status,'stale');
});
test('every identity, cost, bound, objective and provenance dimension participates in the full key',()=>{
 const a=source(),key=homeMixRequestKey('fixture-v1',a);
 for(const field of Object.keys(a.identity)){const b=structuredClone(a);b.identity[field]=field==='revision'?2:b.identity[field]+'changed';assert.notEqual(homeMixRequestKey('fixture-v1',b),key,field);}
 for(const [field,value] of Object.entries({roles:6,budget:1,cashPolicy:'different',bounds:{build:[0,2],move:[0,2],buy:[1,5]},objective:'earliest-coverage',origins:{payroll:'user-entered'}}))assert.notEqual(homeMixRequestKey('fixture-v1',source({[field]:value})),key,field);
 assert.notEqual(homeMixRequestKey('fixture-v2',a),key);
 const reordered={source:Object.fromEntries(Object.entries(a.source).reverse()),identity:Object.fromEntries(Object.entries(a.identity).reverse())};assert.equal(homeMixRequestKey('fixture-v1',reordered),key);
});
test('unavailable or changed live context blocks queued work and suppresses running results',async()=>{
 const h=harness();let current=false;assert.equal((await h.run(source(),'initial',()=>current)).status,'stale');current=true;const a=h.run(source(),'initial',()=>current);current=false;await h.advance();assert.equal((await a).status,'stale');assert.equal(h.calls.length,0);
 current=true;const b=h.run(source(),'initial',()=>current);await h.advance();current=false;h.reply(0);assert.equal((await b).status,'stale');assert.equal(h.reads.length,0);assert.equal(h.coordinator.getSnapshot().status,'idle');
});
test('failed and invalid reports do not retry on rerender, reveal adapter errors or become proposals',async()=>{
 const h=harness(),a=h.run();await h.advance();h.calls[0].reject(Error('sensitive fixture error'));const result=await a;assert.deepEqual(result,{status:'failed',key:homeMixRequestKey('fixture-v1',source()),reason:'search-unavailable'});
 assert.equal(await h.run(),result);assert.equal(h.calls.length,1);
 const b=h.run(source({budget:1}),'constraint-change');await h.advance(250);h.calls[1].resolve({requestKey:'wrong-source',cash:0});assert.equal((await b).reason,'invalid-report');assert.equal(h.coordinator.getSnapshot().status,'failed');
});
test('missing-input and no-match reports are preserved as verified reports, never rewritten to feasible',async()=>{
 for(const status of ['needs-inputs','no-feasible-candidate']){const h=harness(),a=h.run();await h.advance();h.reply(0,{status,bestCandidateId:null,cash:null});const result=await a;assert.equal(result.report.status,status);assert.equal(result.report.bestCandidateId,null);assert.equal(result.report.cash,null);}
});
test('bounded cache evicts oldest results; teardown cancels work without waiting for an uncooperative worker',async()=>{
 const h=harness({maxCached:2});for(let i=0;i<3;i++){const a=h.run(source({budget:i}));await h.advance();h.reply(i);await a;}
 await h.run(source({budget:2}));assert.equal(h.calls.length,3);const a=h.run(source({budget:0}));await h.advance();assert.equal(h.calls.length,4);h.coordinator.dispose();assert.equal((await a).status,'stale');assert.equal(h.calls[3].signal.aborted,true);assert.equal((await h.run()).status,'stale');
});
test('invalid and oversized input cannot execute search, and passive changed-source events invalidate old results',async()=>{
 const h=harness();const bad=source();bad.identity.revision=0;assert.equal((await h.run(bad)).reason,'invalid-input');assert.equal(h.calls.length,0);
 assert.throws(()=>homeMixRequestKey('fixture-v1',source({huge:'x'.repeat(300000)})),/bounded/);
 const a=h.run();await h.advance();h.reply(0);await a;await h.run(source({budget:1}),'passive');assert.equal(h.coordinator.getSnapshot().status,'idle');assert.equal(h.calls.length,1);
});
