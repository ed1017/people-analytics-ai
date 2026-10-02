import test from 'node:test';
import assert from 'node:assert/strict';
import { developmentCatalog, blankDevelopmentQuote, quoteInputs, validateQuote, developmentCost } from '../lib/development-costs.ts';
test('per-person costs include every session and explicit employee time', () => {
  const q=developmentCatalog[0];
  const r=developmentCost(q,{...quoteInputs(q),participants:'10',additionalFees:'50',hourlyCost:'40'});
  assert.deepEqual([r.quoteTotal,r.employeeHours,r.timeCost,r.cashCost,r.total],[3600,60,2400,3650,6050]);
});
test('packages round up cohorts and charge each session', () => {
  const q=developmentCatalog[1];
  const r=developmentCost(q,{...quoteInputs(q),participants:'11',additionalFees:'0',hourlyCost:'0'});
  assert.equal(r.cohorts,2);assert.equal(r.quoteTotal,7200);assert.equal(r.employeeHours,66);assert.equal(r.total,7200);
});
test('unknown additional fees and hourly cost cannot silently become zero', () => {
  const q=developmentCatalog[0];
  const r=developmentCost(q,{...quoteInputs(q),participants:'10'});
  assert.equal(r.quoteTotal,3600);assert.equal(r.cashCost,null);assert.equal(r.timeCost,null);assert.equal(r.total,null);
  assert.equal(developmentCost(q,{...quoteInputs(q),participants:'10',fee:''}).quoteTotal,null);
});
test('invalid negative, fractional counts, overflow and nonfinite inputs are rejected', () => {
  const q=developmentCatalog[0];
  for(const participants of ['-1','0','1.5','10001','Infinity','NaN','1e3']) assert.ok(developmentCost(q,{...quoteInputs(q),participants}).errors.length);
  for(const fee of ['-1','1.234','1000001']) assert.ok(developmentCost(q,{...quoteInputs(q),fee}).errors.length);
});
test('fractional hours and explicit free fees are valid; money rounds to cents', () => {
  const q=developmentCatalog[0];
  const r=developmentCost(q,{participants:'3',sessions:'1',hours:'0.25',fee:'0',additionalFees:'0',hourlyCost:'10.50'});
  assert.deepEqual(r.errors,[]);assert.equal(r.employeeHours,0.75);assert.equal(r.total,7.88);
});
test('custom quote starts blank; named custom quote can preserve unknown numeric fields', () => {
  const q=blankDevelopmentQuote();assert.equal(q.fee,'');assert.equal(q.provider,'');assert.ok(validateQuote(q).length);
  assert.deepEqual(validateQuote({...q,provider:'Custom',focus:'Listening',format:'Virtual'}),[]);
  assert.ok(validateQuote({...q,provider:'Custom',focus:'Listening',format:'Virtual',capacity:'0'}).length);
  assert.ok(developmentCatalog.every(q=>q.provenance==='simulated'&&q.provider.startsWith('Fictional')));
});
