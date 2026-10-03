import test from 'node:test';
import assert from 'node:assert/strict';
import {localWorkforceTask} from '../lib/workforce-search-client.ts';
async function withWorker(check){
 const previous=globalThis.Worker,workers=[];
 globalThis.Worker=class {constructor(){this.terminations=0;workers.push(this)}postMessage(value){this.request=value}terminate(){this.terminations++}};
 try{await check(workers)}finally{if(previous===undefined)delete globalThis.Worker;else globalThis.Worker=previous}
}
test('cancelling terminates worker and ignores even a deliberately late successful reply',()=>withWorker(async workers=>{
 const c=new AbortController(),request=localWorkforceTask('search',{},c.signal);const rejected=assert.rejects(request,/cancelled/);c.abort();workers[0].onmessage({data:{ok:true,value:'late'}});await rejected;assert.equal(workers[0].terminations,1);
}));
test('completed worker cannot resolve twice and is terminated once',()=>withWorker(async workers=>{
 const request=localWorkforceTask('search',{saved:'fixture'},new AbortController().signal);workers[0].onmessage({data:{ok:true,value:1}});workers[0].onmessage({data:{ok:true,value:2}});assert.equal(await request,1);assert.equal(workers[0].terminations,1);
}));
test('already cancelled tasks do not create a worker',()=>withWorker(async workers=>{
 const c=new AbortController();c.abort();await assert.rejects(()=>localWorkforceTask('search',{},c.signal),/cancelled/);assert.equal(workers.length,0);
}));
test('worker failure terminates locally without a transport fallback',()=>withWorker(async workers=>{
 const request=localWorkforceTask('search',{},new AbortController().signal),rejected=assert.rejects(request,/no service fallback/);workers[0].onerror({message:'fixture'});await rejected;assert.equal(workers[0].terminations,1);
}));
