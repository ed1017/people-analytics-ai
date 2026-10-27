import test from 'node:test';
import assert from 'node:assert/strict';
import {marketCarryEvidence,canonicalMarketCarry,saveMarketReference} from '../lib/market-reference-carry.ts';
import {marketCarryEvidence as legacyEvidence} from '../lib/oews-reference.mjs';
import {UK_SOFTWARE_PAY_REFERENCE as uk,TORONTO_SOFTWARE_VACANCY_REFERENCE as toronto} from '../lib/external-workforce-evidence.ts';
import {DecisionStore,encodeDecisions} from '../lib/local-decisions.ts';
import {createPublicChatConversation} from '../lib/public-chat-conversation.mjs';
const goal='Compare hiring and development',at='2026-10-27T12:00:00.000Z';
const carry=id=>({version:1,kind:'external-workforce-reference',referenceId:id,goal});
function setup(){
 let raw=encodeDecisions({version:1,revision:1,goals:{version:1,activeId:'a',goals:[{id:'a',statement:goal},{id:'b',statement:'Other goal'}]},workspaces:{a:{savedAt:at,fields:{capacity:{costRate:'',volume:'1280'},development:{currency:'USD',cost:'25'}}},b:{savedAt:at,fields:{marketCarry:{soc:'15-1252',area:'99',goal:'Other goal'},savedPlan:{keep:true}}}}}),fail=false;
 const port={getItem:()=>raw,setItem:(_,value)=>{if(fail)throw Error('Storage blocked');raw=value;},removeItem:()=>{}};
 const store=new DecisionStore();store.initialize(port);
 return {store,port,raw:()=>raw,fail:()=>{fail=true;},externalChange:()=>{raw+=' ';},save:(reference,revision=store.getSnapshot().data.revision)=>saveMarketReference({store,datasetToken:store.getDatasetToken(),goalId:'a',goal,revision,carry:reference,at})};
}
test('canonical IDs reconstruct native source values and ignore forged values, URLs and mappings',()=>{
 for(const reference of [uk,toronto]){
  const input={...carry(reference.id),reference:{source:{url:'https://evil.invalid'},currency:'USD',estimates:{median:1}},sourceUrl:'https://evil.invalid',internalRole:'CEO'};
  const result=marketCarryEvidence(input,goal);assert.deepEqual(result.reference,reference);assert.deepEqual(canonicalMarketCarry(input),carry(reference.id));
  assert.doesNotMatch(JSON.stringify(result),/evil.invalid|CEO/);assert.equal(result.reference.availableCandidates,null);assert.equal(result.reference.timeToFillDays,null);
  result.reference.source.url='changed';assert.notEqual(marketCarryEvidence(input).reference.source.url,'changed');
 }
 assert.equal(marketCarryEvidence(carry(uk.id)).reference.currency,'GBP');assert.equal(marketCarryEvidence(carry(toronto.id)).reference.averageOfferedHourlyWage.quality,'A');
 for(const input of [carry('unknown'),{...carry(uk.id),version:2},{...carry(uk.id),kind:'custom'},{...carry(uk.id),goal:''}])assert.equal(marketCarryEvidence(input),null);
 assert.equal(marketCarryEvidence(carry(uk.id),'Other goal'),null);
});
test('legacy OEWS selections retain exact evidence and canonical values',()=>{
 const old={soc:'15-1252',area:'99',goal};assert.deepEqual(marketCarryEvidence(old),legacyEvidence(old));assert.deepEqual(canonicalMarketCarry(old),old);assert.equal(marketCarryEvidence({...old,soc:'invalid'}),null);
});
test('atomic carry saves and reloads, preserves scenarios and other goals, and removal retains history',()=>{
 const h=setup(),before=structuredClone(h.store.getSnapshot().data.workspaces);h.save(carry(uk.id));
 assert.equal(h.store.getSnapshot().data.revision,2);assert.deepEqual(h.store.getSnapshot().data.workspaces.b,before.b);assert.deepEqual(h.store.getField('a','capacity',null),before.a.fields.capacity);assert.deepEqual(h.store.getField('a','development',null),before.a.fields.development);
 const reopened=new DecisionStore();reopened.initialize(h.port);assert.deepEqual(reopened.getField('a','marketCarry',null),carry(uk.id));assert.deepEqual(marketCarryEvidence(reopened.getField('a','marketCarry',null)).reference,uk);
 h.save(carry(toronto.id));assert.equal(h.store.getField('a','evidence',[]).length,2);const history=structuredClone(h.store.getField('a','evidence',[]));h.save(null);assert.equal(h.store.getSnapshot().data.workspaces.a.fields.marketCarry,null);assert.deepEqual(h.store.getField('a','evidence',[]),history);
 const removed=new DecisionStore();removed.initialize(h.port);assert.equal(removed.getSnapshot().data.workspaces.a.fields.marketCarry,null);
});
test('duplicate carries do not duplicate audit evidence; legacy saved carries reopen',()=>{
 const h=setup(),old={soc:'15-1252',area:'99',goal};h.save(old);h.save(old);assert.equal(h.store.getField('a','evidence',[]).length,1);assert.deepEqual(h.store.getField('a','marketCarry',null),old);
});
test('invalid source, goal, dataset and stale revision never publish changes',()=>{
 for(const scenario of ['source','goal','dataset','revision','selection']){
  const h=setup(),before=h.raw(),snapshot=h.store.getSnapshot();
  if(scenario==='selection')h.store.saveGoals({...snapshot.data.goals,activeId:'b'});
  const saved=h.raw();
  assert.throws(()=>saveMarketReference({store:h.store,datasetToken:scenario==='dataset'?'wrong':h.store.getDatasetToken(),goalId:'a',goal,revision:scenario==='revision'?0:h.store.getSnapshot().data.revision,carry:scenario==='source'?carry('invalid'):scenario==='goal'?{...carry(uk.id),goal:'Other goal'}:carry(uk.id),at}));
  assert.equal(h.raw(),scenario==='selection'?saved:before);assert.equal(h.store.getField('a','marketCarry',null),null);
 }
});
test('storage failure and cross-tab changes preserve existing saved work',()=>{
 for(const failure of ['storage','concurrent']){const h=setup();h.save(carry(uk.id));const prior=structuredClone(h.store.getSnapshot().data);if(failure==='storage')h.fail();else h.externalChange();const raw=h.raw();assert.throws(()=>h.save(carry(toronto.id)));assert.equal(h.raw(),raw);assert.deepEqual(h.store.getSnapshot().data,prior);}
});
test('actual public conversation context reconstructs external evidence without paid calls',async()=>{
 const chat=createPublicChatConversation({inputs:{read:async()=>{throw Error('No read expected');}}});
 for(const reference of [uk,toronto]){
  let sent;const stop=Error('captured');
  await assert.rejects(()=>chat({page:'labor-market',message:'Compare hiring and development',goalContext:{goal},marketReference:{...carry(reference.id),sourceUrl:'https://evil.invalid',median:1}},async spec=>{sent=spec;throw stop;},new AbortController().signal),error=>error===stop);
  const context=JSON.parse(sent.input[0].content.slice(sent.input[0].content.indexOf('{')));assert.deepEqual(context.marketReference.reference,reference);assert.doesNotMatch(JSON.stringify(context.marketReference),/evil.invalid/);assert.match(context.marketReference.planningStatus,/cannot establish whether hiring or development/);
 }
});

import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import {createRequire} from 'node:module';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import * as oews from '../lib/oews-reference.mjs';import * as outlook from '../lib/labor-outlook.mjs';
const require=createRequire(import.meta.url);
test('carried reference presentation retains native pay units, period, scope and quality without editable model controls',()=>{
 const exports={},code=ts.transpileModule(fs.readFileSync(new URL('../components/market-reference.tsx',import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,require:name=>name==='@/components/key-findings'?{KeyFindings:()=>null}:name==='@/lib/oews-reference.mjs'?oews:name==='@/lib/labor-outlook.mjs'?outlook:name==='@/lib/market-reference-carry'?{marketCarryEvidence}:require(name)});
 const render=value=>renderToStaticMarkup(React.createElement(exports.CarriedMarketReference,{carry:value,onClear:()=>{}}));
 const ukHtml=render(carry(uk.id)),caHtml=render(carry(toronto.id)),legacy=render({soc:'15-1252',area:'99',goal});
 assert.match(ukHtml,/Median annual gross pay: GBP 59,862.50/);assert.match(ukHtml,/2025-04-06 to 2026-04-05/);assert.match(ukHtml,/UK SOC 2020/);assert.match(ukHtml,/Median CV: 2.4%/);
 assert.match(caHtml,/Average offered hourly wage: CAD 60.95\/hour/);assert.match(caHtml,/economic region/);assert.match(caHtml,/Estimated vacancies: 1065; quality C/);assert.match(caHtml,/Offered wage quality A/);assert.match(legacy,/BLS OEWS May 2025/);
 for(const html of [ukHtml,caHtml,legacy]){assert.match(html,/Remove market reference/);assert.doesNotMatch(html,/<input|<select|<textarea/);}
});
