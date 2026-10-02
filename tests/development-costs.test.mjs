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

for (const [hours, hourlyCost, expected] of [['0.35', '0.10', 0.04], ['0.25', '40.30', 10.08]]) {
  test(`decimal half-cent regression: ${hours} hours at ${hourlyCost}`, () => {
    const r = developmentCost(developmentCatalog[0], { participants: '1', sessions: '1', hours, fee: '0', additionalFees: '0', hourlyCost });
    assert.deepEqual(r.errors, []);
    assert.equal(r.timeCost, expected);
    assert.equal(r.total, expected);
  });
}
test('employee time rounds below, at and above a half-cent after summing hours', () => {
  for (const [hourlyCost, expected] of [['0.49', 0], ['0.50', 0.01], ['0.51', 0.01]]) {
    const r = developmentCost(developmentCatalog[0], { participants: '1', sessions: '1', hours: '0.01', fee: '0', additionalFees: '0', hourlyCost });
    assert.equal(r.timeCost, expected);
  }
  const r = developmentCost(developmentCatalog[0], { participants: '2', sessions: '1', hours: '0.35', fee: '0', additionalFees: '0', hourlyCost: '0.10' });
  assert.equal(r.timeCost, 0.07);
});
test('decimal fees retain exact per-person and rounded-up cohort totals', () => {
  for (const [q, quoteTotal, cashCost, total] of [[developmentCatalog[0], 66.66, 66.76, 67.37], [developmentCatalog[1], 12.12, 12.22, 12.83]]) {
    const r = developmentCost(q, { participants: '11', sessions: '2', hours: '0.25', fee: '3.03', additionalFees: '0.10', hourlyCost: '0.11' });
    assert.deepEqual(r.errors, []);
    assert.deepEqual([r.quoteTotal, r.cashCost, r.employeeHours, r.timeCost, r.total], [quoteTotal, cashCost, 5.5, 0.61, total]);
  }
});
test('explicit zero stays zero and blank numeric dependencies remain unknown', () => {
  const q = developmentCatalog[0];
  const input = { participants: '1', sessions: '1', hours: '0.35', fee: '0', additionalFees: '0', hourlyCost: '0' };
  const r = developmentCost(q, input);
  assert.deepEqual([r.quoteTotal, r.cashCost, r.timeCost, r.total], [0, 0, 0, 0]);
  for (const key of Object.keys(input)) {
    const unknown = developmentCost(q, { ...input, [key]: '' });
    assert.deepEqual(unknown.errors, []);
    assert.equal(unknown.total, null, key);
  }
});
