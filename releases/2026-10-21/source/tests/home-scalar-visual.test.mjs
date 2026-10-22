import test from 'node:test';import assert from 'node:assert/strict';
import {buildHomePack} from '../lib/home-pack.mjs';
import {answerEvidenceSeries,readChatEvidenceSeries} from '../lib/chat-evidence-series.ts';
const evidence=buildHomePack({'talent-acquisition':{status:'loaded',data:{as_of:'2026-09-30',summary:{median_time_to_fill_days:33}}}},'Company-wide');
const source=evidence.sources.find(s=>s.id==='R1');
const grounding={datasetToken:'fixture',packetSha256:'a'.repeat(64),sources:[{id:'R1',status:'loaded',scope:source.scope,asOf:source.date,basis:'database-backed-aggregate'}]};
test('cited scalar median produces grounded KPI for natural paraphrases and survives reload validation',()=>{
 for(const question of ["whats our time to fill?",'What is median time-to-fill?','How long does it take to fill roles?']){
  const charts=answerEvidenceSeries(evidence,grounding,'request1',question,'The company-wide median time to fill is 33 days [R1].');
  assert.equal(charts.length,1);assert.equal(charts[0].axis,'scalar');assert.deepEqual(charts[0].points,[{date:'2026-09-30',value:33}]);assert.equal(charts[0].unit,'days');assert.equal(readChatEvidenceSeries(JSON.parse(JSON.stringify(charts)),'request1','fixture').length,1);
  assert.equal(readChatEvidenceSeries(charts,'changed','fixture').length,0);
 }
});
test('no uncited, mean-only, unrelated or unverified scalar; malformed scalar is rejected',()=>{
 for(const [question,answer,g]of [['Time to fill?','33 days',grounding],['Time to fill?','Mean 33 days [R1]',grounding],['Turnover?','Median 33 days [R1]',grounding],['Time to fill?','Median 33 days [R1]',{...grounding,sources:[]} ]])assert.deepEqual(answerEvidenceSeries(evidence,g,'r',question,answer),[]);
 const chart=answerEvidenceSeries(evidence,grounding,'r','Time to fill?','Median 33 days [R1]')[0];
 for(const delta of [{unit:'people'},{metric:'hires'},{points:[{date:'2026-09-30',value:NaN}]},{points:[]},{asOf:'2026-08-31'},{sourceId:'A1'}])assert.deepEqual(readChatEvidenceSeries([{...chart,...delta}],'r','fixture'),[]);
});
