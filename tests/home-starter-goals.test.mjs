import test from 'node:test';
import assert from 'node:assert/strict';
import {homeStarterGoal,homeStarterForecast} from '../lib/home-starter-goals.ts';
import {homeGoalStarters} from '../lib/contextual-prompts.ts';
import artifact from '../lib/data/synthetic-domain-demo-v1.json' with {type:'json'};
import {formatDemoValue} from '../lib/synthetic-domain-demo.ts';
const pack={sources:['A1','R1','S1'].map(id=>({id,status:'loaded',facts:{count:1}}))};
test('five exact starters offer specific qualitative goals; unrelated and typed routing are unchanged',()=>{
 assert.equal(homeGoalStarters.length,5);
 for(const prompt of homeGoalStarters){const starter=homeStarterGoal(prompt);assert.ok(starter.goal&&starter.reason&&starter.pinLabel.startsWith('Pin '));assert.doesNotMatch(starter.goal,/\d|%/);}
 for(const prompt of ['Forecast turnover','What else?','Reduce turnover by 20%','How can we improve hiring?'])assert.equal(homeStarterGoal(prompt),null);
});
test('skills and training never acquire a fabricated forecast',()=>{for(const prompt of homeGoalStarters.slice(0,2))assert.equal(homeStarterForecast(homeStarterGoal(prompt),pack,''),null)});
for(const prompt of homeGoalStarters.slice(2,4))test('forecast compares identical simulated metric and population for '+prompt,()=>{
 const starter=homeStarterGoal(prompt),forecast=homeStarterForecast(starter,pack,'?country=all&org=all&level=all'),data=artifact.domains[starter.domain];
 assert.equal(forecast.domain,starter.domain);assert.match(forecast.summary,/separate simulated company-wide demo/);assert.match(forecast.summary,/Dec 2026 projections/);assert.match(forecast.summary,/forecast for your recorded workforce is unavailable/);
 assert.ok(forecast.summary.includes(formatDemoValue(starter.domain,data.history.findLast(row=>row.value!==null).value)));
 for(const value of data.rows.at(-1).values)assert.ok(forecast.summary.includes(formatDemoValue(starter.domain,value)));
 if(starter.domain==='turnover')assert.match(forecast.summary,/monthly counts, not a turnover rate/);
});
test('missing, excluded, null and invalid evidence or artifact fails closed without removing qualitative goal',()=>{
 for(const prompt of homeGoalStarters.slice(2)){const starter=homeStarterGoal(prompt);for(const status of ['unavailable','invalid','timeout','budget-excluded'])assert.equal(homeStarterForecast(starter,{sources:[{id:starter.sourceId,status,facts:{count:42}}]},''),null);
 for(const facts of [null,{}, {count:null},{count:NaN}])assert.equal(homeStarterForecast(starter,{sources:[{id:starter.sourceId,status:'loaded',facts}]},''),null);
 for(const query of ['?country=GB','?org=Technology','?level=Executive'])assert.equal(homeStarterForecast(starter,pack,query),null);
 for(const candidate of [null,{}, {...artifact,seed:123}])assert.equal(homeStarterForecast(starter,pack,'',candidate),null);
 assert.ok(starter.goal&&starter.pinLabel);
 }
});
