import test from 'node:test';
import assert from 'node:assert/strict';
import {selectHiringDevelopmentRidge as select,lockHiringRidgeSettings as lock,evaluateLockedHiringRidge as evaluate} from '../lib/ml/hiring-ridge.ts';
import {freezeHiringProtocol} from '../lib/ml/hiring-evaluation.ts';
import {syntheticHiringManifest as manifest,syntheticHiringHistory as history} from './fixtures/hiring-evaluation.mjs';
const settings=s=>({penalty:s.selectedPenalty,methodVersion:s.methodVersion,contractFingerprint:s.contractFingerprint});
const provenance=()=>({experimentId:'independent-review',sourceDefinitionSha256:'a'.repeat(64),candidateCodeSha256:'b'.repeat(64),evaluatorGitSha:'c'.repeat(40)});
const cutoff=freezeHiringProtocol(manifest).holdout.trainBefore;
const held=rows=>rows.filter(row=>row.openedDate>=cutoff);
const issue=rows=>{const s=select(manifest,rows);return lock(s,settings(s),provenance())};

for(const field of ['settings','provenance'])test(`reentrant ${field} inspection cannot issue two locks from one selection`,()=>{
 const s=select(manifest,history()),fixed=settings(s),source=provenance();let nestedCalls=0;
 const proxy=new Proxy(field==='settings'?fixed:source,{ownKeys(target){
  nestedCalls++;
  assert.throws(()=>lock(s,fixed,source),/issuance already in progress/);
  return Reflect.ownKeys(target);
 }});
 const handle=lock(s,field==='settings'?proxy:fixed,field==='provenance'?proxy:source);
 assert.equal(nestedCalls,1);
 assert.throws(()=>lock(s,fixed,source),/issued/);
 let loads=0;
 assert.throws(()=>evaluate(handle,()=>{loads++;throw Error('loader failed')}),/loader failed/);
 assert.throws(()=>evaluate(handle,()=>{loads++;return []}),/consumed/);
 assert.equal(loads,1);
});

test('failed descriptor inspection releases issuance reservation without issuing a lock',()=>{
 const s=select(manifest,history());
 const proxy=new Proxy(settings(s),{ownKeys(){throw Error('descriptor inspection failed')}});
 assert.throws(()=>lock(s,proxy,provenance()),/descriptor inspection failed/);
 const handle=lock(s,settings(s),provenance());
 assert.ok(Object.isFrozen(handle));
 assert.throws(()=>lock(s,settings(s),provenance()),/issued/);
});

test('loader, outcome accessor and malformed-result failures all consume the issued lock',()=>{
 const rows=history();
 for(const loader of [
  ()=>{throw Error('loader failed')},
  ()=>null,
  ()=>held(rows).map((row,index)=>index?row:{...row,get status(){throw Error('outcome failed')}}),
 ]){
  const handle=issue(rows);assert.throws(()=>evaluate(handle,loader));
  let retried=false;
  assert.throws(()=>evaluate(handle,()=>{retried=true;return held(rows)}),/consumed/);
  assert.equal(retried,false);
 }
});

test('serialized or cloned selections and locks cannot recreate process identity',()=>{
 const s=select(manifest,history());
 for(const copy of [structuredClone(s),JSON.parse(JSON.stringify(s))])assert.throws(()=>lock(copy,settings(copy),provenance()),/issued/);
 const handle=lock(s,settings(s),provenance());
 for(const copy of [structuredClone(handle),JSON.parse(JSON.stringify(handle))]){
  let loaded=false;assert.throws(()=>evaluate(copy,()=>{loaded=true;return []}),/lock/);assert.equal(loaded,false);
 }
 // Rejecting a copy does not consume the original identity.
 assert.equal(evaluate(handle,()=>held(history())).status,'synthetic-explicit-final-evaluation-only');
});

test('selection snapshots remain fixed when caller rows change before settings are locked',()=>{
 const rows=history(),saved=structuredClone(rows),s=select(manifest,rows);
 for(const row of rows){row.openedDate='2099-01-01';row.startDate='2099-02-01';row.status='open'}
 const handle=lock(s,settings(s),provenance());
 assert.deepEqual(evaluate(handle,()=>held(saved)),evaluate(issue(saved),()=>held(saved)));
});
