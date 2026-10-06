import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateSignalHistory} from '../../lib/ml/observable-turnover-signals/generator.mjs';
import {forecastGroup} from '../../lib/ml/group-turnover/evaluation.mjs';
import {replaySynthetic} from '../../lib/ml/synthetic-workforce/pipeline.mjs';
import {inputs,caseRows,maskLatest,shortHistory} from './extract.mjs';
const old=readFileSync('lib/ml/observable-turnover-signals/generator.mjs','utf8');
const history=generateSignalHistory(4001,'training');
const origin='2025-06-30T23:59:59.999Z';
const snapshot=replaySynthetic('turnover',history.branches['no-shock'].groups.releases,origin);
test('isolated generator is byte-identical after only declared import substitutions',()=>{
 assert.equal(readFileSync('experiments/group_turnover_trees_v1/generator.mjs','utf8'),old.replace("'./protocol.json'","'./generator-protocol.json'").replaceAll("'../synthetic-workforce/","'../../lib/ml/synthetic-workforce/"));
});
test('original monthly and quarter baselines preserved exactly',()=>{
 const rows=caseRows(history,'informative');
 for(const row of rows){const f=forecastGroup(snapshot,{groupId:row.groupId});
  assert.deepEqual(row.baselines,Object.fromEntries(f.methods.map(m=>[m.method,[...m.points.map(p=>p.expectedExits),m.expectedTotal]])));
 }
});
test('suppressed groups emit neither labels nor features nor baselines',()=>{
 for(const scenario of ['informative','no-signal','reversed','delayed-signal','missing-signal'])for(const row of caseRows(history,scenario).slice(2)){
  assert.equal(row.actual,null);assert.equal(row.features,null);assert.deepEqual(row.baselines,{});assert.equal(row.labelAvailableAt,null);
 }
});
test('reporting and short-history controls retain native blocks',()=>{
 for(const changed of [maskLatest(snapshot),shortHistory(snapshot)])for(const group of ['group-a','group-b','group-c','group-d'])assert.equal(inputs(changed,[],group).features,null);
 for(const scenario of ['reporting-incomplete','short-history'])for(const row of caseRows(history,scenario))assert.equal(row.actual,null);
});
test('future outcomes never change released feature vector',()=>{
 const mutated=structuredClone(history.branches['no-shock'].groups.releases);
 for(const row of mutated)if(row.simulatedAvailableAt>origin&&row.status==='complete'){row.value.voluntaryExits+=row.value.otherExits;row.value.otherExits=0;}
 assert.deepEqual(inputs(replaySynthetic('turnover',mutated,origin),[history.signalRelease],'group-a'),inputs(snapshot,[history.signalRelease],'group-a'));
});
test('late or future-effective signal is unavailable, unknown fields reject',()=>{
 assert.equal(inputs(snapshot,[{...history.signalRelease,simulatedAvailableAt:'2025-07-01T00:00:00.000Z'}],'group-a').signal,null);
 assert.equal(inputs(snapshot,[{...history.signalRelease,effectiveAt:'2025-07-01T00:00:00.000Z',simulatedAvailableAt:'2025-07-02T00:00:00.000Z'}],'group-a').signal,null);
 assert.throws(()=>inputs(snapshot,[{...history.signalRelease,seed:4001}],'group-a'));
});
test('seed guards reject previous and test seeds in training split',async()=>{
 const {generateSignalHistory:isolated}=await import('./generator.mjs');
 assert.throws(()=>isolated(4001,'training'));assert.throws(()=>isolated(18301,'training'));assert.throws(()=>isolated(18101,'test'));
});
