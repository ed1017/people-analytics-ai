import test from 'node:test';
import assert from 'node:assert/strict';
import {financeVacancyBasis} from '../lib/finance-vacancy-basis.ts';
const row=value=>({estimated_vacancy_cost_exposure_usd:value});
test('business-unit sum reproduces the headline independently of the company average formula',()=>{const rows=[row(90000000),row(6300000)],before=JSON.stringify(rows);assert.deepEqual(financeVacancyBasis(96300000,rows),{subtotal:96300000,difference:0,reconciles:true});assert.notEqual(205528*475,96300000);assert.equal(JSON.stringify(rows),before);});
test('a source mismatch remains visible without replacing the reported headline',()=>{assert.deepEqual(financeVacancyBasis(100,[row(40),row(50)]),{subtotal:90,difference:10,reconciles:false});});
test('missing/invalid rows do not become a reproducible zero, while actual zero is valid',()=>{for(const rows of [[],[row(NaN)],[row(-1)]])assert.equal(financeVacancyBasis(10,rows).subtotal,null);assert.equal(financeVacancyBasis(0,[row(0)]).reconciles,true);});
test('rounding tolerates only the small cent difference introduced by rounded source rows',()=>{assert.equal(financeVacancyBasis(1.01,[row(.5),row(.5)]).reconciles,true);assert.equal(financeVacancyBasis(1.1,[row(.5),row(.5)]).reconciles,false);});
