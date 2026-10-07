import test from 'node:test';
import assert from 'node:assert/strict';
import {homeStarterExploration,buildHomeStarterExplorationPrompt} from '../lib/home-starter-exploration.ts';
import {homeStarterGoal} from '../lib/home-starter-goals.ts';
import {homeGoalStarters} from '../lib/contextual-prompts.ts';
const starters=homeGoalStarters.map(homeStarterGoal);
const ids=['T1','T2','A1','S2','S1','R1'];
const facts=[{skills_with_demand:12},{current_gap_skills:4},{total_exits:20},{exit_respondents:9},{engagement_respondents:80},{applications:60}];
const pack={workforceScope:'Country: Canada',sources:ids.map((id,index)=>({id,status:'loaded',facts:facts[index]}))};
const expected=[['T1','T2'],['T2','T1'],['A1','S2'],['S1'],['R1']];
for(const [index,starter] of starters.entries())test(starter.goal+' offers only bounded relevant source questions',()=>{
 const choices=homeStarterExploration(starter,pack);
 assert.deepEqual(choices.map(item=>item.sourceId),expected[index]);
 for(const item of choices){assert.equal(item.id,item.sourceId);assert.ok(item.label&&item.prompt.endsWith('?'));assert.deepEqual(item.evidence,[item.sourceId+':summary']);assert.match(item.scope,/Company-wide/);assert.ok(!item.scope.includes('Canada'));assert.match(buildHomeStarterExplorationPrompt(item),/Do not infer causes, individual risk, group rankings, intervention effects/);assert.match(buildHomeStarterExplorationPrompt(item),/current supplied Home evidence/);}
 assert.ok(choices.length<=2);
});
test('unrelated or missing starter provenance gets no local topics',()=>{
 for(const starter of [undefined,{goal:'Invent a highest risk group'},{goal:'Forecast turnover'}])assert.deepEqual(homeStarterExploration(starter,pack),[]);
});
test('unavailable, denied, loading, excluded and invalid sources never gain actions from stale facts',()=>{
 for(const status of ['unavailable','timeout','invalid','budget-excluded','loading','forbidden','permission-denied'])for(const starter of starters)assert.deepEqual(homeStarterExploration(starter,{sources:pack.sources.map(source=>({...source,status}))}),[]);
});
test('null, nonfinite, strings, nonallowlisted numbers and missing sources do not manufacture evidence',()=>{
 for(const facts of [null,{}, {skills_with_demand:null},{skills_with_demand:NaN},{skills_with_demand:Infinity},{skills_with_demand:'50'},{unrecognized_metric:4}])assert.deepEqual(homeStarterExploration(starters[0],{sources:[{id:'T1',status:'loaded',facts}]}),[]);
 assert.deepEqual(homeStarterExploration(starters[0],null),[]);
});
test('zero is available; one unavailable topic never removes another eligible topic',()=>{
 assert.deepEqual(homeStarterExploration(starters[0],{sources:[{id:'T1',status:'loaded',facts:{skills_with_demand:0}}]}).map(item=>item.sourceId),['T1']);
 assert.deepEqual(homeStarterExploration(starters[2],{sources:[pack.sources[3]]}).map(item=>item.sourceId),['S2']);
});
test('suppressed summary or detail values never enable an action; an unsuppressed sampled row can',()=>{
 for(const facts of [{skills_with_demand:9,suppressed:true},{rows:[{skill_name:'Not displayed',requirement_met_pct:20,suppressed:true}]}])assert.deepEqual(homeStarterExploration(starters[0],{sources:[{id:'T1',status:'loaded',facts}]}),[]);
 const choices=homeStarterExploration(starters[0],{sources:[{id:'T1',status:'loaded',facts:{rows:[{skill_name:'Recorded sample',requirement_met_pct:0}]}}]});
 assert.deepEqual(choices[0].evidence,['T1:row:0']);assert.match(choices[0].prompt,/uncertain/);
});
test('canonical source labels and scope survive untrusted supplied labels without changing input',()=>{
 const input=structuredClone(pack);input.sources[0].label='Highest risk employees';input.sources[0].scope='Canada only';const before=JSON.stringify(input),choices=homeStarterExploration(starters[0],input);
 assert.equal(choices[0].label,'Skills Intelligence');assert.equal(choices[0].scope,'Company-wide; unfiltered');assert.equal(JSON.stringify(input),before);
});
