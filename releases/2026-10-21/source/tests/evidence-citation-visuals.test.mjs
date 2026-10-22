import test from 'node:test';import assert from 'node:assert/strict';
import {homeScopeCitations,homeAnswerScopeViolation} from '../lib/home-answer-scope.ts';
import {buildHomePack} from '../lib/home-pack.mjs';
import {answerEvidenceSeries} from '../lib/chat-evidence-series.ts';
const evidence=buildHomePack({'talent-acquisition':{status:'loaded',data:{as_of:'2026-09-30',summary:{median_time_to_fill_days:33}}}},'Company-wide');
const source=evidence.sources.find(s=>s.id==='R1');const grounding={datasetToken:'fixture',packetSha256:'a'.repeat(64),sources:[{id:'R1',status:'loaded',scope:source.scope,asOf:source.date,basis:'database-backed-aggregate'}]};
test('matching bracket/parenthesis citations share parsing across scope and visuals',()=>{
 for(const cite of ['[R1]','(R1)','[R1:summary:median_time_to_fill_days]','(R1:summary:median_time_to_fill_days)','[W1, R1]','(W1; R1)']){
 const text=`Our company-wide median time to fill is **33 days**, according to the recruiting snapshot as of **September 30, 2026** ${cite}. This is the median—not the average—and comes from constructed synthetic recruiting history, not live operational data.`;
 assert.ok(homeScopeCitations(text).includes('R1'));assert.equal(answerEvidenceSeries(evidence,grounding,'r','whats our time to fill',text).length,1);
 }
});
test('citation punctuation cannot grant unverified evidence or accept wrong source IDs',()=>{
 for(const cite of ['R1','(R10)','(XR1)','[R1)','(R1]','(W1)'])assert.equal(answerEvidenceSeries(evidence,grounding,'r','time to fill',`Median 33 days ${cite}`).length,0,cite);
 assert.equal(answerEvidenceSeries(evidence,{...grounding,sources:[]},'r','time to fill','Median 33 days (R1)').length,0);
 assert.equal(homeAnswerScopeViolation('US turnover is 12% (A1).',buildHomePack({attrition:{status:'loaded',data:{as_of:'2026-09-30',summary:{total_turnover_ytd_pct:12}}}},'Company-wide')),true);
});
test('parenthesized detailed references preserve finance and survey validation',()=>{
 const p=buildHomePack({'survey-sentiment':{status:'loaded',data:{as_of:'2026-09-30',summary:{engagement_respondents:80},business_units:Array.from({length:8},(_,i)=>({org_code:'BU-'+i,org_name:'Group '+i,respondents:10,avg_score:3,favorable_pct:50-i}))}},finance:{status:'loaded',data:{as_of:'2026-09-30',current:{labor_cost_usd:100},by_business_unit:[{org_code:'BU-0',org_name:'Group 0',labor_cost_usd:100}]}}},'Company-wide');
 for(const [text,expected] of [['Group 7 has 43% favorable among 10 respondents [S1:businessUnit:7].',false],['Group 7 has 43% favorable [S1:businessUnit:99].',true],['Group 7 has 43% favorable [S1:businessUnit:1].',true],['Group 0 has labor cost USD 100 [F1:row:0:labor_cost_usd].',false],['Group 0 has labor cost USD 100 [F1:row:99:labor_cost_usd].',true]]){
 assert.equal(homeAnswerScopeViolation(text,p),expected,text);assert.equal(homeAnswerScopeViolation(text.replaceAll('[','(').replaceAll(']',')'),p),expected,text);
 }
});
