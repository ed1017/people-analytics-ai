import test from 'node:test';import a from 'node:assert/strict';import {compactPlanningInput} from '../releases/2026-10-21/source/lib/model-planning-context.mjs';
const prefix='CURRENT AUTHORITATIVE CONTEXT AND CONVERSATION DATA\n';
const expand=(v,d)=>!v||typeof v!=='object'?v:Object.keys(v).length===1&&Number.isInteger(v.planningContextRef)?structuredClone(d[v.planningContextRef]):Array.isArray(v)?v.map(x=>expand(x,d)):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,expand(x,d)]));
test('planning references reconstruct exact distinct revisions, provenance and all unrelated context',()=>{
 const common={quote:'An explicit synthetic assumption. '.repeat(30),value:160},old={budget:240000,bases:[common],monthly:Array.from({length:12},(_,i)=>({month:i,cost:4000}))},next={...old,budget:50000};
 const input=[{role:'user',content:prefix+JSON.stringify({currentMessage:{text:'Reduce budget'},businessPlanning:old,evidence:{unchanged:true}})},{type:'function_call',arguments:'unchanged',call_id:'a'},{type:'function_call_output',call_id:'a',output:JSON.stringify({businessPlanning:next,planningGuidance:{reference:'keep'}})}],before=structuredClone(input),out=compactPlanningInput(input),initial=JSON.parse(out[0].content.slice(prefix.length)),d=initial.planningContextDictionary.values;
 a.deepEqual(input,before);a.deepEqual(expand(initial.businessPlanning,d),old);a.deepEqual(expand(JSON.parse(out[2].output).businessPlanning,d),next);a.deepEqual(initial.evidence,{unchanged:true});a.deepEqual(out[1],input[1]);a.deepEqual(JSON.parse(out[2].output).planningGuidance,{reference:'keep'});a.ok(JSON.stringify(out).length<JSON.stringify(input).length);
});
test('small or nonplanning payload remains exactly unchanged',()=>{for(const input of [[],[{role:'user',content:prefix+JSON.stringify({currentMessage:{},businessPlanning:{budget:20}})}],[{type:'function_call_output',output:JSON.stringify({evidence:'same'.repeat(100)})}]])a.deepEqual(compactPlanningInput(input),input);});

test('working proposal factoring and Unicode reconstruct without altering tool protocol',()=>{
 const shared={quote:'The user supplied café and € assumptions. '.repeat(12),scope:'Finance'},plan={id:'p',basis:shared,details:[shared]},value={currentMessage:{text:'revise'},workingProposals:[plan,{...plan,id:'q'}],businessPlanning:{bases:[shared]}};
 const input=[{role:'user',content:prefix+JSON.stringify(value)}],out=compactPlanningInput(input),v=JSON.parse(out[0].content.slice(prefix.length)),d=v.planningContextDictionary.values;
 a.deepEqual(expand(v.workingProposals,d),value.workingProposals);a.deepEqual(expand(v.businessPlanning,d),value.businessPlanning);a.equal(input[0].content,prefix+JSON.stringify(value));
});
