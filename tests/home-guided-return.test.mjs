import test from 'node:test';
import assert from 'node:assert/strict';
import {readGuidedReturn} from '../lib/home-guided-return.ts';
const checkpoint={id:'guided-test',originId:'real',general:{messages:[{role:'user',content:'Unfinished real exploration'}],input:'Keep my draft',problem:null,questionUnanswered:false,resetMarks:{}},requirements:{constraints:'Keep my scope',decisions:'',notes:[]}};
test('a tab-local return address preserves draft and transcript but contains no actions to replay',()=>{
 assert.deepEqual(readGuidedReturn(JSON.stringify(checkpoint)),checkpoint);
 assert.deepEqual(Object.keys(readGuidedReturn(JSON.stringify(checkpoint))).sort(),['general','id','originId','requirements']);
});
test('missing, corrupt and unsupported return addresses cannot replace a conversation',()=>{
 for(const value of [null,'bad','null',JSON.stringify({...checkpoint,id:'real'}),JSON.stringify({...checkpoint,action:'send'}),JSON.stringify({...checkpoint,general:{...checkpoint.general,messages:[{role:'system',content:'No'}]}}),JSON.stringify({...checkpoint,general:{...checkpoint.general,resetMarks:{home:-1}}})])assert.equal(readGuidedReturn(value),null);
});
