import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPositionActionsCalculator} from '../lib/public-fixture/position-actions.mjs';
import {canonicalJson,sha256} from '../lib/public-fixture/read-provider.mjs';
const dir=new URL('./fixtures/public-position-actions/',import.meta.url);
const text=await readFile(new URL('manifest.json',dir),'utf8'),pin=(await readFile(new URL('manifest.sha256',dir),'utf8')).trim();
const calculator=createPositionActionsCalculator(text,pin);
test('recorded invalid public requests are rejected locally; capture contains statuses only',async()=>{
 const raw=await readFile(new URL('errors.json',dir),'utf8'),digest=(await readFile(new URL('errors.sha256',dir),'utf8')).trim();assert.equal(sha256(raw),digest);
 for(const row of JSON.parse(raw).examples){assert.deepEqual(Object.keys(row),['input','status']);assert.equal(row.status,400);assert.throws(()=>calculator.calculate(row.input));}
});
test('closed pinned GET snapshot reproduces original public DATA and is immutable',()=>{
 const manifest=JSON.parse(text);assert.deepEqual(calculator.read(),manifest.document.body);
 assert.equal(calculator.read().current.filled_positions,9037);
 assert.equal(calculator.read().current.authorized_positions,calculator.read().current.filled_positions+calculator.read().current.open_vacancies+calculator.read().current.frozen_positions);
 assert.throws(()=>{calculator.read().current.filled_positions=1;},TypeError);
 assert.equal(Object.hasOwn(calculator.read(),'data_meta'),false);
});
test('exact DATA parity for three captured bounded public POST examples, offline and without fetch',async()=>{
 const parityText=await readFile(new URL('parity.json',dir),'utf8'),expectedPin=(await readFile(new URL('parity.sha256',dir),'utf8')).trim();
 assert.equal(sha256(parityText),expectedPin);
 const oldFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('Network forbidden');};
 try{for(const example of JSON.parse(parityText).examples)assert.deepEqual(calculator.calculate(example.input),example.expected);}
 finally{globalThis.fetch=oldFetch;}
});
test('rejects malformed/oversized/unpinned or semantically inconsistent snapshots',()=>{
 assert.throws(()=>createPositionActionsCalculator(text,'0'.repeat(64)));
 assert.throws(()=>createPositionActionsCalculator(text+' ',pin));
 const oversized=' '.repeat(16385);assert.throws(()=>createPositionActionsCalculator(oversized,sha256(oversized)));
 for(const change of [
  m=>{m.document.body.current.filled_positions=-1;},
  m=>{m.document.body.current.authorized_positions++;},
  m=>{m.document.body.defaults.add_positions=1;},
  m=>{m.document.body.bounds.add_positions.max=1000000;},
  m=>{m.document.body.data_meta={token:'forged'};},
  m=>{m.document.target='/api/position-actions?x=1';},
  m=>{m.provenance.parity='all-calculators';},
  m=>{m.document.body.as_of='2027-01-01';},
 ]){
  const m=JSON.parse(text);change(m);m.document.sha256=sha256(canonicalJson(m.document.body));const edited=JSON.stringify(m);assert.throws(()=>createPositionActionsCalculator(edited,sha256(edited)));
 }
});
test('strict request validation rejects strings/null/arrays/extra fields and out-of-bounds numbers',()=>{
 for(const input of [null,[],{unknown:1},{add_positions:'1'},{add_positions:null},{add_positions:1.5},{add_positions:-1},{add_positions:5001},{vacancy_fill_pct:101},{vacancy_fill_pct:NaN},{vacancy_fill_pct:Infinity}])assert.throws(()=>calculator.calculate(input));
});
test('stock conservation holds across zeros, clamps, fractional fills and input ordering',()=>{
 for(const add of [0,1,5000])for(const close of [0,3,5000])for(const freeze of [0,2,5000])for(const fill of [0,33.333,100]){
  const input={add_positions:add,close_vacant_positions:close,freeze_vacancies:freeze,vacancy_fill_pct:fill},r=calculator.calculate(input),a=r.accounting.after;
  assert.ok(Math.abs(a.authorized-a.filled-a.vacant-a.frozen)<1e-7);
  assert.ok(a.vacant>=0&&a.frozen>=0);assert.equal(r.accounting.effective_fill_pct,fill);
  assert.equal(r.modeled.projected_fills,r.accounting.conditional_fills);
  assert.deepEqual(r,calculator.calculate(Object.fromEntries(Object.entries(input).reverse())));
 }
 const r=calculator.calculate({vacancy_fill_pct:33.333});assert.equal(r.assumptions.vacancy_fill_pct,33.3);assert.equal(r.accounting.effective_fill_pct,33.333);
 assert.throws(()=>{r.modeled.filled_positions=0;},TypeError);
});
