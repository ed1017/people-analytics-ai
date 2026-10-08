import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {liveBudget} from './helpers/solution-live-budget.mjs';
test('live reservations survive restarts, keep failed generation cost and stop at both ceilings',()=>{
 const path=join(mkdtempSync(join(tmpdir(),'live-budget-')),'ledger.jsonl'),first=liveBudget(path,'one',{batchLimit:110000,totalLimit:150000});
 first.reserve('generation',56000);assert.throws(()=>liveBudget(path,'parallel'),/EEXIST/);const count=first.reserve('token-count-allowance',50000);first.settleCount(count,10000);assert.deepEqual(first.totals(),{batch:58500,total:58500});assert.throws(()=>first.reserve('generation',56000),/budget exhausted/);first.close();
 const second=liveBudget(path,'two',{batchLimit:110000,totalLimit:150000});second.reserve('generation',56000);assert.throws(()=>second.reserve('token-count-allowance',50000),/budget exhausted/);assert.deepEqual(second.totals(),{batch:56000,total:114500});second.close();
});
