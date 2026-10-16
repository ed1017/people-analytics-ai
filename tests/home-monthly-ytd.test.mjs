import test from 'node:test';
import assert from 'node:assert/strict';
import {selectHomeMonthlyRows} from '../lib/home-monthly-evidence.ts';
import {buildHomePack,normalizeHomePack,HOME_MONTHLY_SOURCE_BYTES} from '../lib/home-pack.mjs';
const trend=Array.from({length:12},(_,i)=>({month:`2026-${String(i+1).padStart(2,'0')}-01`,monthly_turnover_pct:1+i/100,total_exits:10+i}));
test('monthly YTD keeps January through source cutoff across packet normalization',()=>{
 const pack=buildHomePack({attrition:{status:'loaded',data:{as_of:'2026-09-30',summary:{},trend}}},'All workforce','Earlier question\n\nCURRENT USER TURN:\nby month ytd');
 const source=pack.sources.find(s=>s.id==='A1');
 assert.deepEqual(source.facts.monthly.map(r=>r.month),trend.slice(0,9).map(r=>r.month));
 assert.deepEqual(normalizeHomePack(pack),pack);
 assert.ok(Buffer.byteLength(JSON.stringify(source.facts))<=HOME_MONTHLY_SOURCE_BYTES);
});
test('monthly YTD preserves missing and suppressed observations without deriving or filling values',()=>{
 const input=trend.filter((_,i)=>i!==2).map((r,i)=>i===0?{...r,suppressed:true}:r);
 const rows=selectHomeMonthlyRows(input,'monthly year-to-date','2026-09-30');
 assert.equal(rows.length,8);assert.equal(rows[0].monthly_turnover_pct,null);
 assert.ok(!rows.some(r=>r.month==='2026-03-01'));
 assert.deepEqual(selectHomeMonthlyRows(trend,'by month ytd'),[]);
 assert.deepEqual(selectHomeMonthlyRows(trend,'by month ytd 2025','2026-09-30'),[]);
 assert.deepEqual(selectHomeMonthlyRows(trend,'by month ytd 2025 2026','2026-09-30'),[]);
});
test('ordinary context remains bounded to three observations',()=>{
 assert.equal(selectHomeMonthlyRows(trend,'turnover','2026-09-30').length,3);
 assert.equal(selectHomeMonthlyRows(trend,'April 2026 compared to May 2026','2026-09-30').length,3);
});
