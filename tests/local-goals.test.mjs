import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLocalGoals,emptyLocalGoals,MAX_GOALS} from '../lib/local-goals.ts';
test('local goal storage restores bounded statements and selection only',()=>{
 const parsed=parseLocalGoals(JSON.stringify({version:1,activeId:'a',goals:[{id:'a',statement:'  Reduce turnover  ',messages:[{content:'must not persist'}]}],evidence:'excluded'}));
 assert.deepEqual(parsed,{version:1,activeId:'a',goals:[{id:'a',statement:'Reduce turnover'}]});
 assert.deepEqual(parseLocalGoals(null),emptyLocalGoals());
});
test('corrupt oversized unsupported or ambiguous saved goals fail closed',()=>{
 for(const raw of ['{','x'.repeat(20001),JSON.stringify({version:2,activeId:'',goals:[]}),JSON.stringify({version:1,activeId:'missing',goals:[]}),...[
 [{id:'a',statement:''}], [{id:'a',statement:'x'.repeat(241)}], [{id:'a',statement:'one'},{id:'a',statement:'two'}], [{id:'__proto__',statement:'bad'}], Array.from({length:MAX_GOALS+1},(_,i)=>({id:String(i),statement:'goal'}))
 ].map(goals=>JSON.stringify({version:1,activeId:'',goals}))]) assert.throws(()=>parseLocalGoals(raw));
});
test('user goal text is retained as plain text, never a stored evidence object',()=>{
 const goal={id:'safe-id',statement:'<script>alert(1)</script>'};
 assert.deepEqual(parseLocalGoals(JSON.stringify({version:1,activeId:goal.id,goals:[goal]})).goals,[goal]);
});
