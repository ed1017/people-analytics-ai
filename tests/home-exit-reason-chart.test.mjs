import test from 'node:test';
import assert from 'node:assert/strict';
import {homeExitReasonChart,homeExitReasonChartMatches,homeExitReasonFactLines} from '../lib/home-exit-reason-chart.ts';
const fixture=()=>({status:'loaded',data:{as_of:'2026-09-30',summary:{exit_respondents:50,manager_favorable_pct:19.9},exit_reasons:[{primary_reason:'Other',exits:5,pct_of_exit_responses:10},{primary_reason:'Manager',exits:15,pct_of_exit_responses:30},{primary_reason:'Work-Life Balance',exits:20,pct_of_exit_responses:40},{primary_reason:'New Opportunity',exits:10,pct_of_exit_responses:20}],reasons:[{separation_reason:'Manager',exits:999}]}});
test('S2 chart ranks supplied primary-reason counts and preserves denominator, date and source, never A1 or S1 measures',()=>{
 const raw=fixture(),before=JSON.stringify(raw),chart=homeExitReasonChart(raw);
 assert.deepEqual(chart,{source:'S2',date:'2026-09-30',respondents:50,rows:[{reason:'Work-Life Balance',count:20,percentage:40},{reason:'Manager',count:15,percentage:30},{reason:'New Opportunity',count:10,percentage:20}]});assert.equal(JSON.stringify(raw),before);assert.doesNotMatch(JSON.stringify(chart),/999|19.9/);
 assert.ok(homeExitReasonChartMatches('Reported reasons:\n'+homeExitReasonFactLines(chart).map(line=>'  - '+line).join('\n'),chart));assert.equal(homeExitReasonChartMatches('Work-Life Balance and Manager were administrative exits. [A1]',chart),false);assert.equal(homeExitReasonChartMatches('Manager favorable score 19.9%. [S1]',chart),false);
});
test('suppression, missing dates/counts, invalid percentages and mixed denominators omit the chart',()=>{
 const mutations=[r=>r.status='timeout',r=>r.data.suppressed=true,r=>r.data.summary.suppressed=true,r=>r.data.as_of='2026-02-31',r=>r.data.as_of=null,r=>r.data.summary.exit_respondents=0,r=>r.data.exit_reasons[0].suppressed=true,r=>r.data.exit_reasons[0].exits=null,r=>r.data.exit_reasons[0].exits=500,r=>r.data.exit_reasons[0].pct_of_exit_responses=90,r=>r.data.exit_reasons[0].primary_reason='Manager',r=>r.data.exit_reasons=r.data.exit_reasons.slice(0,1),r=>r.data.exit_reasons=Array(41).fill(r.data.exit_reasons[0])];
 for(const mutate of mutations){const raw=fixture();mutate(raw);assert.equal(homeExitReasonChart(raw),null,mutate.toString())}
});
test('rounded supplied percentages remain valid without turning primary-reason shares into workforce turnover',()=>{
 const raw={status:'loaded',data:{as_of:'2026-09-30',summary:{exit_respondents:19},exit_reasons:[{primary_reason:'A',exits:6,pct_of_exit_responses:31.6},{primary_reason:'B',exits:5,pct_of_exit_responses:26.3}]}};
 assert.equal(homeExitReasonChart(raw).rows[0].percentage,31.6);assert.equal(homeExitReasonChartMatches('A and B [S2]',null),false);
});
