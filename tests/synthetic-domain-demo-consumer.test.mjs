import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {buildSyntheticDomainDemo,domainDemoPath} from '../lib/ml/synthetic-domain-demo.mjs';
import {resolveSyntheticDomainDemo,syntheticDomainDemoPrompt,formatDemoValue} from '../lib/synthetic-domain-demo.ts';
const read=path=>readFile(new URL('../'+path,import.meta.url)),artifact=JSON.parse(await read(domainDemoPath));
test('fixed demo reproduces the verified report, keeps all candidates and correct clocks/units',async()=>{
 const fresh=await buildSyntheticDomainDemo();assert.deepEqual(fresh,artifact);const report=JSON.parse(await read('docs/evidence/synthetic-domain-predictions-v1/report.json'));
 for(const [domain,d] of Object.entries(fresh.domains)){assert.deepEqual(d.methods,report.protocol[domain].methods);assert.deepEqual(d.rows.map(row=>row.month),report.demo.domains[domain].predictions.map(row=>row.month));for(const [i,row] of d.rows.entries())for(const [j,method] of d.methods.entries())assert.equal(row.values[j],report.demo.domains[domain].predictions[i][method]);}
assert.equal(fresh.domains.turnover.support.lastPeriod,'2026-08');assert.equal(fresh.domains.satisfaction.support.lastPeriod,'2026-06');assert.equal(fresh.domains.satisfaction.rows.length,1);assert.equal(fresh.domains.satisfaction.rows[0].month,'2026-12');
 for(const d of Object.values(fresh.domains)){assert.equal(d.methods.length,3);assert.equal(d.interval,null);assert.equal(d.operationallyQualified,false);}
 assert.equal(formatDemoValue('turnover',79.6666666667),'79.7');assert.equal(formatDemoValue('hiring',.8054585152838428),'80.5%');assert.equal(formatDemoValue('satisfaction',64.51217292377801),'64.5%');
 const breaks=fresh.domains.satisfaction.assessment.find(s=>s.stage==='test'&&s.family==='survey-break');assert.equal(breaks.predicted,20);assert.equal(breaks.scored,0);assert.equal(breaks.blocked.length,20);assert.ok(breaks.blocked.every(b=>b.reasons.length));assert.ok(!Object.hasOwn(breaks,'error'));
 assert.equal(fresh.domains.turnover.assessment.filter(s=>s.stage==='training').reduce((n,s)=>n+s.cases-s.predicted,0),10);assert.equal(fresh.domains.hiring.assessment.filter(s=>s.stage==='training').reduce((n,s)=>n+s.cases-s.predicted,0),1);
});
test('corrupt report, scores or implementation and absent evidence fail closed without values',async()=>{
 for(const target of ['docs/evidence/synthetic-domain-predictions-v1/report.json','docs/evidence/synthetic-domain-predictions-v1/scores.json.gz','lib/ml/synthetic-domain-predictions/hiring.mjs']){
  for(const missing of [false,true]){const failed=await buildSyntheticDomainDemo({read:async path=>{if(path===target){if(missing)throw Error('missing');return Buffer.from('changed');}return read(path);}});assert.equal(failed.status,'unavailable');assert.equal(failed.domains,null);assert.equal(resolveSyntheticDomainDemo(failed).status,'unavailable');assert.doesNotMatch(syntheticDomainDemoPrompt('talent-acquisition','Explain the simulated demo',failed),/80\.5|"values"|logistic-trend/);}
 }
});
test('altered or missing projection withholds UI and AI values even with copied provenance',()=>{
 const stale=structuredClone(artifact);stale.domains.turnover.rows[0].values[0]=999;
 for(const candidate of [null,undefined,{},stale]){assert.equal(resolveSyntheticDomainDemo(candidate).status,'unavailable');const prompt=syntheticDomainDemoPrompt('attrition','Explain the synthetic projections',candidate===undefined?null:candidate);assert.match(prompt,/unavailable/);assert.doesNotMatch(prompt,/999|79\.7/);}
});
test('AI demo is explicit, matching-page only and never a cohort baseline or intervention estimate',()=>{
 for(const page of ['home','workforce','workforce-planning','__proto__'])assert.equal(syntheticDomainDemoPrompt(page,'Explain the simulated demo'),'');
 for(const request of ['Forecast turnover for France','Use current hiring as a planning baseline','Summarize my goal'])assert.equal(syntheticDomainDemoPrompt('attrition',request),'');
 for(const [page,domain] of [['attrition','turnover'],['talent-acquisition','hiring'],['survey-sentiment','satisfaction']]){const p=syntheticDomainDemoPrompt(page,'Explain the simulated demo projections');assert.match(p,new RegExp('"domain":"'+domain+'"'));assert.match(p,/independent of the selected country/);assert.match(p,/Never use these outputs as a filtered plan baseline/);assert.match(p,/avoided exits, added capacity, savings, ROI or an intervention effect/);assert.match(p,/interval.*null/);assert.match(p,/do not infer a winner/);}
});
