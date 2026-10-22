import test from 'node:test';import assert from 'node:assert/strict';
import {buildHomePack} from '../lib/home-pack.mjs';
import {answerEvidenceSeries,readChatEvidenceSeries} from '../lib/chat-evidence-series.ts';
import {omitDuplicateComparisonTable} from '../lib/home-comparison-visual.mjs';
const data={as_of:'2026-09-30',summary:{engagement_respondents:80},business_units:Array.from({length:8},(_,i)=>({org_code:'BU-'+i,org_name:'Group '+i,respondents:10,avg_score:3,favorable_pct:50-i}))};
const evidence=buildHomePack({'survey-sentiment':{status:'loaded',data}},'Company-wide');
const source=evidence.sources.find(s=>s.id==='S1');
const grounding={datasetToken:'fixture',packetSha256:'a'.repeat(64),sources:[{id:'S1',status:'loaded',scope:source.scope,asOf:source.date,basis:'database-backed-aggregate'}]};
const make=(q='List sentiments by business unit',a='Engagement favorability, not text sentiment (S1).',e=evidence,g=grounding)=>answerEvidenceSeries(e,g,'req',q,a);
test('complete source partition supplies sorted bars and table, with stable save/reload identity',()=>{
 for(const q of ['List sentiments by business unit','Which group has lowest engagement?','Compare survey favorability across business units']){
 const charts=make(q);assert.equal(charts.length,1);const c=charts[0];assert.equal(c.comparison.length,8);assert.equal(c.respondents,80);assert.equal(c.points[0].date,'BU-7');assert.equal(c.points[0].value,43);assert.equal(c.comparison[0].avg_score,3);assert.equal(readChatEvidenceSeries(JSON.parse(JSON.stringify(charts)),'req','fixture').length,1);assert.deepEqual(readChatEvidenceSeries(charts,'other','fixture'),[]);
 }
});
test('unrelated, unsupported dimension/history and uncited answers do not create comparison',()=>{
 for(const q of ['Turnover by business unit','Survey by department','Group sentiment last year','Survey by country','Headcount by business unit','Compare business-unit survey favorability in 2025','BU survey favorability previous quarter','BU engagement during September 2025'])assert.deepEqual(make(q),[]);
 assert.deepEqual(make(undefined,'No evidence cited'),[]);assert.deepEqual(make(undefined,undefined,evidence,{...grounding,sources:[]}),[]);
 for(const mutate of [c=>c.rows.pop(),c=>c.rows[0].suppressed=true,c=>c.rows[0].respondents=0,c=>c.asOf='2026-08-31']){const e=structuredClone(evidence);mutate(e.sources.find(s=>s.id==='S1').facts.businessUnitComparison);assert.deepEqual(make(undefined,undefined,e),[]);}
});
test('tampered table/point linkage, units, date, scope and partition fail reload validation',()=>{
 const c=make()[0];for(const mutate of [v=>v.points[0].value=99,v=>v.comparison.pop(),v=>v.respondents=79,v=>v.unit='days',v=>v.sourceId='R1',v=>v.scope='Teams',v=>v.metric='headcount',v=>v.limitation='unverified',v=>v.comparison.reverse()]){const v=structuredClone(c);mutate(v);assert.deepEqual(readChatEvidenceSeries([v],'req','fixture'),[]);}
});
test('only full duplicate table removed; narrative, qualifications, partial and unrelated tables retained',()=>{
 const rows=make()[0].comparison,table=['| Group | Favorable |','| --- | --- |',...rows.map(r=>`| ${r.org_code} | ${r.favorable_pct}% |`)].join('\n');
 const answer='Takeaway (S1).\n'+table+'\nNot text sentiment.';const trimmed=omitDuplicateComparisonTable(answer,rows);assert.match(trimmed,/Takeaway/);assert.match(trimmed,/Not text sentiment/);assert.doesNotMatch(trimmed,/\| BU-/);assert.equal(omitDuplicateComparisonTable(table.split('\n').slice(0,-1).join('\n'),rows),table.split('\n').slice(0,-1).join('\n'));
});

test('complete BU tables with unrelated metrics or additional notes are not removed',()=>{
 const rows=make()[0].comparison;
 for(const table of [ ['| Business unit | Turnover |','| --- | --- |',...rows.map(r=>'| '+r.org_code+' | 9% |')].join('\n'),['| Business unit | Favorability | Notes |','| --- | --- | --- |',...rows.map(r=>'| '+r.org_code+' | '+r.favorable_pct+'% | Unique caveat |')].join('\n')])assert.equal(omitDuplicateComparisonTable(table,rows),table);
});
