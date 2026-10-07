import test from 'node:test';
import assert from 'node:assert/strict';
import {homeTurnPurpose,homeEvidenceSelection,homeConversationInstructions} from '../lib/home-conversation.ts';
import {buildHomePack,normalizeHomePack,HOME_SOURCE_BYTES} from '../lib/home-pack.mjs';

const prior=[{role:'user',content:'why was turnover high in April 2026'},{role:'assistant',content:'Monthly company counts do not explain why people left.'}];
test('questions stay conversational, including with a prior goal and appended session context',()=>{
 for(const message of ['why was turnover high in april','What about March?','Why?','What does FTE mean?','Explain turnover','How many people work here?','Compare April with March','Can we reduce turnover?']) {
  assert.equal(homeTurnPurpose(message,prior),'answer');
  assert.equal(homeTurnPurpose(message+'\n\nFocused issue: Reduce turnover',[{role:'user',content:'Reduce turnover'}]),'answer');
 }
 assert.equal(homeTurnPurpose('I want to reduce turnover',prior),'goal');
 assert.equal(homeTurnPurpose('Budget is $20000',[{role:'user',content:'Reduce turnover'}]),'goal');
 assert.equal(homeTurnPurpose('Find another issue',prior),'discovery');
 assert.equal(homeTurnPurpose('Develop a full action plan',prior),'plan');
 assert.equal(homeTurnPurpose('Make a plan to reduce turnover',prior),'plan');
 assert.equal(homeTurnPurpose('Refine investigation options: review retention evidence',prior),'discovery');
 assert.equal(homeTurnPurpose('Prepare coordinated solution bundles for my exact pinned goal.'),'plan');
});
const row=(month,count,rate)=>({month,total_exits:count,voluntary_exits:count-1,monthly_turnover_pct:rate,monthly_voluntary_turnover_pct:rate-0.1,employee_name:'PRIVATE_SENTINEL'});
const data={attrition:{status:'loaded',data:{as_of:'2026-09-30',summary:{voluntary_exits:88},trend:[row('2025-04-01',5,1),row('2026-02-01',6,1.2),row('2026-03-01',8,1.6),row('2026-04-01',12,2.4),row('2026-09-01',10,2)]}}};
const source=(question)=>buildHomePack(data,'Canada; Engineering; all levels',question).sources.find(s=>s.id==='A1');
test('April includes exact requested year, prior month and prior year without changing company scope',()=>{
 const selected=source('why was turnover high in April 2026');
 assert.deepEqual(selected.facts.monthly.map(r=>r.month),['2026-04-01','2026-03-01','2025-04-01']);
 assert.equal(selected.facts.monthly[0].total_exits,12);assert.equal(selected.facts.monthly[0].monthly_turnover_pct,2.4);
 assert.equal(selected.scope,'Company-wide; unfiltered');assert.match(selected.coverage.monthly.denominator,/Unavailable/);
 assert.ok(new TextEncoder().encode(JSON.stringify(selected.facts)).length<=HOME_SOURCE_BYTES);
 assert.doesNotMatch(JSON.stringify(selected),/PRIVATE_SENTINEL/);
 const pack=buildHomePack(data,'Canada','April 2026');assert.deepEqual(normalizeHomePack(pack),pack);
});
test('month-only ambiguity, absent periods and unavailable monthly values are explicit, not replaced by YTD totals',()=>{
 assert.deepEqual(source('why was turnover high in april').facts.monthly.map(r=>r.month),['2025-04-01','2026-04-01']);
 assert.deepEqual(source('April 2024').facts.monthly,[]);
 const missing=buildHomePack({attrition:{status:'loaded',data:{summary:{voluntary_exits:88}}}},'Canada','April').sources.find(s=>s.id==='A1');
 assert.equal(missing.facts.monthly,undefined);assert.equal(missing.facts.voluntary_exits,88);
 const normalized=normalizeHomePack({sources:[{id:'A1',status:'loaded',facts:{monthly:[{...row('2026-04-01',4,1),suppressed:true},row('2026-02-31',4,1),{...row('2026-03-01',-4,101),voluntary_exits:1.5}]}}]}).sources.find(s=>s.id==='A1');
 assert.equal(normalized.facts.monthly.length,2);assert.equal(normalized.facts.monthly[0].total_exits,null);assert.equal(normalized.facts.monthly[1].monthly_turnover_pct,null);assert.equal(normalized.facts.monthly[1].voluntary_exits,null);
});
test('follow-up selection retains the referenced month, then honors a corrected month and year',()=>{
 assert.equal(source(homeEvidenceSelection('Why?',prior)).facts.monthly[0].month,'2026-04-01');
 assert.equal(source(homeEvidenceSelection('What about March?',prior)).facts.monthly[0].month,'2026-03-01');
 assert.deepEqual(source(homeEvidenceSelection('Actually April 2025',prior)).facts.monthly.map(r=>r.month),['2025-04-01']);
 assert.deepEqual(source(homeEvidenceSelection('I mean 2025',prior)).facts.monthly.map(r=>r.month),['2025-04-01']);
 assert.ok(homeEvidenceSelection('x'.repeat(6000),Array(8).fill({role:'user',content:'x'.repeat(6000)}),'x'.repeat(240)).length<12000);
});


test('exact April clarification carries both requested months from sources, ignoring assistant numbers',()=>{
 const first='why was turnover high in april';
 const followup='I mean April 2025. How did it compare with March 2025, and can the available evidence explain the difference?';
 const sourceData={attrition:{status:'loaded',data:{as_of:'2026-09-30',summary:{voluntary_exits:88},trend:[row('2024-04-01',4,0.8),row('2025-02-01',6,1.2),row('2025-03-01',8,1.6),row('2025-04-01',12,2.4),row('2026-04-01',10,2)]}}};
 const get=question=>buildHomePack(sourceData,'Company-wide',question).sources.find(s=>s.id==='A1');
 assert.deepEqual(get(first).facts.monthly.map(r=>r.month),['2024-04-01','2025-04-01','2026-04-01']);
 const history=[{role:'user',content:first},{role:'assistant',content:'April 2025 had 99999 exits and a rate of 99%.'}];
 for(const message of [followup,'Compare April and March 2025.','Compare April 2025 with March 2025.\n\nCan this explain the difference?']){
  const packet=get(homeEvidenceSelection(message,history)),monthly=packet.facts.monthly;
  assert.deepEqual(monthly.slice(0,2).map(r=>r.month),['2025-04-01','2025-03-01']);
  assert.equal(monthly[0].total_exits,12);assert.equal(monthly[0].monthly_turnover_pct,2.4);
  assert.equal(monthly[1].total_exits,8);assert.equal(monthly[1].monthly_turnover_pct,1.6);
  assert.doesNotMatch(JSON.stringify(packet),/99999|99%/);
 }
 const missing=structuredClone(sourceData);missing.attrition.data.trend=missing.attrition.data.trend.filter(r=>r.month!=='2025-04-01');
 const packet=buildHomePack(missing,'Company-wide',homeEvidenceSelection(followup,history));
 assert.ok(!packet.sources.find(s=>s.id==='A1').facts.monthly.some(r=>r.month==='2025-04-01'));
});

test('Home answers keep Action Plan budgets cash-only and never monetize staff hours',()=>{
 for(const purpose of ['answer','goal','discovery','plan']){
  const instructions=homeConversationInstructions(purpose);
  assert.match(instructions,/cash expenses only and report employee effort in hours/);
  assert.match(instructions,/Do not price staff hours/);assert.match(instructions,/keep unentered cash costs unknown/);
 }
});
