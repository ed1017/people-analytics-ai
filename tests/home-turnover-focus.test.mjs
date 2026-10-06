import test from 'node:test';
import assert from 'node:assert/strict';
import {homeTurnoverFocus} from '../lib/home-turnover-focus.ts';
const source=(id,facts,date='2026-09-30',status='loaded')=>({id,facts,date,status});
const pack={workforceScope:'Selected workforce snapshot: Canada; Corporate; All levels',sources:[source('A1',{total_exits:100,total_turnover_ytd_pct:10,voluntary_exits:60,voluntary_turnover_ytd_pct:6,regrettable_exits:20}),source('W1',{headcount:120,voluntary_turnover_ytd_pct:4})]};
const all='?country=all&org=all&level=all';
test('broad turnover means all types and pinning does not silently substitute voluntary or regrettable exits',()=>{
 const before=JSON.stringify(pack),focus=homeTurnoverFocus('Reduce turnover',pack,all);
 assert.equal(focus.metric,'Overall turnover');assert.equal(focus.scope,'Company-wide');assert.equal(focus.pinLabel,'Pin overall turnover goal');assert.match(focus.context,/10% YTD through 30 Sept? 2026/);assert.match(focus.context,/Recorded exits \(all types\): 100/);assert.doesNotMatch(focus.context,/\b60\b|\b20\b|regrettable|Voluntary/);
 assert.match(focus.voluntary.context,/Voluntary turnover: 6%.*total turnover: 10%/);assert.equal(focus.voluntary.goal,'Reduce voluntary turnover');assert.equal(JSON.stringify(pack),before);
});
test('selected scope uses W1 voluntary evidence only, retaining exact scope and constraints in optional goal',()=>{
 const goal='Reduce overall turnover in Canada within 90 days',focus=homeTurnoverFocus(goal,pack,'?country=CA&org=BU-CORP&level=all');
 assert.equal(focus.pinLabel,'Pin scoped turnover goal');assert.equal(focus.scope,'Canada; Corporate; All levels');assert.match(focus.context,/Overall turnover figures.*unavailable/);assert.doesNotMatch(focus.context,/100|10%|6%/);
 assert.equal(focus.voluntary.goal,'Reduce voluntary turnover in Canada within 90 days');assert.match(focus.voluntary.context,/4%.*Canada; Corporate; All levels.*\[W1\]/);assert.doesNotMatch(focus.voluntary.context,/total turnover:|Company-wide|6%/);
 const narrowed=homeTurnoverFocus(focus.voluntary.goal,pack,'?country=CA&org=BU-CORP&level=all');assert.equal(narrowed.pinLabel,'Pin voluntary turnover goal');assert.equal(narrowed.voluntary,null);assert.match(narrowed.context,/Voluntary turnover: 4%/);
});
test('missing selected-scope data cannot borrow company-wide numbers and explicit period mismatches stay unavailable',()=>{
 const missing={...pack,sources:[pack.sources[0]]};assert.equal(homeTurnoverFocus('Reduce turnover in Canada',missing,'?country=CA').voluntary,null);
 const historic=homeTurnoverFocus('Reduce turnover in 2025',pack,all);assert.equal(historic.voluntary,null);assert.match(historic.context,/requested period.*unavailable/);
 for(const facts of [{voluntary_turnover_ytd_pct:null},{voluntary_turnover_ytd_pct:NaN},{voluntary_turnover_ytd_pct:101},{voluntary_turnover_ytd_pct:6,suppressed:true},{voluntary_turnover_ytd_pct:11,total_turnover_ytd_pct:10}])assert.equal(homeTurnoverFocus('Reduce turnover',{sources:[source('A1',facts)]},all).voluntary,null);
 assert.equal(homeTurnoverFocus('Reduce turnover',{sources:[source('A1',{voluntary_turnover_ytd_pct:6},null)]},all).voluntary,null);
 assert.ok(homeTurnoverFocus('Reduce turnover',{sources:[source('A1',{voluntary_turnover_ytd_pct:0,total_turnover_ytd_pct:0,total_exits:0})]},all).voluntary);
});
test('raw group claims, reason shares and hypothetical engineers cannot become a group turnover ranking',()=>{
 const injected={...pack,sources:[{...pack.sources[0],facts:{...pack.sources[0].facts,groups:[{name:'Engineers',rate:99,highest:true}],rows:[{kind:'Group turnover',separation_reason:'Engineers',exits:50,pct_of_exits:50}]}}]};
 const focus=homeTurnoverFocus('Reduce turnover',injected,all);assert.match(focus.groupLimitation,/Comparable group turnover rates and denominators are unavailable/);assert.doesNotMatch(JSON.stringify(focus),/Engineers|highest|99|50/);
 assert.equal(homeTurnoverFocus('Build AI skills',pack,all),null);
});
