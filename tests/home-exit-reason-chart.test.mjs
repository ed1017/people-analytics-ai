import test from 'node:test';
import assert from 'node:assert/strict';
import {homeExitReasonChart,homeExitReasonChartMatches} from '../lib/home-exit-reason-chart.ts';
import {homeExitReasonChartFromPacket} from '../lib/home-exit-reason-chart.ts';
import {buildHomePack,normalizeHomePack} from '../lib/home-pack.mjs';
import {homeEvidenceSelection} from '../lib/home-conversation.ts';
import {exitReasonSurvey} from './fixtures/exit-reason-packet.mjs';
const fixture=()=>({status:'loaded',data:{as_of:'2026-09-30',summary:{exit_respondents:50,manager_favorable_pct:19.9},exit_reasons:[{primary_reason:'Other',exits:5,pct_of_exit_responses:10},{primary_reason:'Manager',exits:15,pct_of_exit_responses:30},{primary_reason:'Work-Life Balance',exits:20,pct_of_exit_responses:40},{primary_reason:'New Opportunity',exits:10,pct_of_exit_responses:20}],reasons:[{separation_reason:'Manager',exits:999}]}});
const facts=chart=>chart.rows.map(row=>`  - ${row.reason}: ${row.count.toLocaleString('en-US')} (${row.percentage}%). [S2]`).join('\n');
test('S2 chart ranks supplied primary-reason counts and preserves denominator, date and source, never A1 or S1 measures',()=>{
 const raw=fixture(),before=JSON.stringify(raw),chart=homeExitReasonChart(raw);
 assert.deepEqual(chart,{source:'S2',date:'2026-09-30',respondents:50,rows:[{reason:'Work-Life Balance',count:20,percentage:40},{reason:'Manager',count:15,percentage:30},{reason:'New Opportunity',count:10,percentage:20}]});assert.equal(JSON.stringify(raw),before);assert.doesNotMatch(JSON.stringify(chart),/999|19.9/);
 assert.ok(homeExitReasonChartMatches(facts(chart),chart));assert.equal(homeExitReasonChartMatches('Work-Life Balance and Manager were administrative exits. [A1]',chart),false);assert.equal(homeExitReasonChartMatches('Manager favorable score 19.9%. [S1]',chart),false);
});

test('exact exit survey reasons selects supplied primary reasons before experience-question keyword matches',()=>{
 const results={'survey-sentiment':{status:'loaded',data:exitReasonSurvey},attrition:{status:'loaded',data:{reasons:[{separation_reason:'Manager',exits:107}]}}};
 for(const question of ['exit survey reasons','What are the exit-survey reasons?','Why did exit survey respondents leave?']){
  const pack=buildHomePack(results,'Company',homeEvidenceSelection(question,[{role:'user',content:'Show survey work-life balance favorability'}]));
  const source=pack.sources.find(source=>source.id==='S2');
  assert.ok(source.facts.rows.every(row=>row.kind==='Reported primary reason'));
  assert.deepEqual(source.facts.rows.map(row=>row.exits),[244,243,242]);
  assert.deepEqual(homeExitReasonChartFromPacket(pack).rows.map(row=>row.percentage),[12.5,12.4,12.4]);
  assert.deepEqual(normalizeHomePack(pack),pack);
  assert.doesNotMatch(JSON.stringify(homeExitReasonChartFromPacket(pack)),/87.5|68.5|58.9|107/);
 }
 const current=homeEvidenceSelection('Exit survey work-life balance favorability',[{role:'user',content:'exit survey reasons'}]);
 assert.equal(buildHomePack(results,'Company',current).sources.find(source=>source.id==='S2').facts.rows[0].kind,'Exit experience question');
});

test('missing or suppressed reason evidence cannot become reasons through complements, refresh or A1 substitution',()=>{
 const data=structuredClone(exitReasonSurvey);data.exit_reasons=[];
 const pack=buildHomePack({'survey-sentiment':{status:'loaded',data},attrition:{status:'loaded',data:{reasons:[{separation_reason:'Manager',exits:107}]}}},'Company','exit survey reasons');
 assert.equal(homeExitReasonChartFromPacket(pack),null);
 assert.ok(pack.sources.find(source=>source.id==='S2').facts.rows.every(row=>row.kind==='Exit experience question'&&row.exits===null));
 for(const status of ['timeout','unavailable'])assert.equal(homeExitReasonChartFromPacket(buildHomePack({'survey-sentiment':{status,data:exitReasonSurvey}},'Company','exit survey reasons')),null);
 const suppressed=structuredClone(exitReasonSurvey);suppressed.exit_reasons[0].suppressed=true;
 assert.equal(homeExitReasonChartFromPacket(buildHomePack({'survey-sentiment':{status:'loaded',data:suppressed}},'Company','exit survey reasons')),null);
});
test('suppression, missing dates/counts, invalid percentages and mixed denominators omit the chart',()=>{
 const mutations=[r=>r.status='timeout',r=>r.data.suppressed=true,r=>r.data.summary.suppressed=true,r=>r.data.as_of='2026-02-31',r=>r.data.as_of=null,r=>r.data.summary.exit_respondents=0,r=>r.data.exit_reasons[0].suppressed=true,r=>r.data.exit_reasons[0].exits=null,r=>r.data.exit_reasons[0].exits=500,r=>r.data.exit_reasons[0].pct_of_exit_responses=90,r=>r.data.exit_reasons[0].primary_reason='Manager',r=>r.data.exit_reasons=r.data.exit_reasons.slice(0,1),r=>r.data.exit_reasons=Array(41).fill(r.data.exit_reasons[0])];
 for(const mutate of mutations){const raw=fixture();mutate(raw);assert.equal(homeExitReasonChart(raw),null,mutate.toString())}
});
test('rounded supplied percentages remain valid without turning primary-reason shares into workforce turnover',()=>{
 const raw={status:'loaded',data:{as_of:'2026-09-30',summary:{exit_respondents:19},exit_reasons:[{primary_reason:'A',exits:6,pct_of_exit_responses:31.6},{primary_reason:'B',exits:5,pct_of_exit_responses:26.3}]}};
 assert.equal(homeExitReasonChart(raw).rows[0].percentage,31.6);assert.equal(homeExitReasonChartMatches('A and B [S2]',null),false);
});

test('chart uses only the same normalized request snapshot as the answer across timeout and refresh',async()=>{
 const {homeExitReasonChartFromPacket}=await import('../lib/home-exit-reason-chart.ts');
 const {buildHomePack}=await import('../lib/home-pack.mjs');
 const raw=fixture(),packet=buildHomePack({'survey-sentiment':raw},'Company','Work-Life Balance Manager New Opportunity');
 const chart=homeExitReasonChartFromPacket(packet);
 assert.deepEqual(chart.rows.map(row=>row.reason),['Work-Life Balance','Manager','New Opportunity']);
 const timeout=buildHomePack({'survey-sentiment':{status:'timeout',data:raw.data}},'Company');
 assert.equal(homeExitReasonChartFromPacket(timeout),null);
 assert.equal(homeExitReasonChartFromPacket(packet).respondents,50);
 assert.equal(homeExitReasonChartMatches('Exit-survey feedback is unavailable. Work-Life Balance and Manager were earlier reasons. [S2]',chart),false);
 assert.equal(homeExitReasonChartMatches(facts(chart)+'\nFieldwork dates are unavailable. [S2]',chart),true);
 const sampled=structuredClone(packet);sampled.sources.find(row=>row.id==='S2').facts.rows=sampled.sources.find(row=>row.id==='S2').facts.rows.slice(0,1);
 assert.equal(homeExitReasonChartFromPacket(sampled),null);
});

test('every plotted count and share must agree while normal prose, bold labels and number formatting remain supported',()=>{
 const chart=homeExitReasonChart(fixture()),answer=facts(chart);
 for(const invalid of [answer.replace('20 (40%)','21 (42%)'),answer.replace('20 (40%)','20 (41%)'),answer.replace('20 (40%)','40%'),answer.replace('20 (40%). [S2]','20 (40%). [A1]'),answer+'\n- Manager: 19 (38%). [S2]','Work-Life Balance and Manager were reported. [S2]'])assert.equal(homeExitReasonChartMatches(invalid,chart),false,invalid);
 assert.ok(homeExitReasonChartMatches(answer.replace('Work-Life Balance: 20 (40%)','**Work-Life Balance**: 20 respondents, or 40%'),chart));
 assert.ok(homeExitReasonChartMatches(answer.replaceAll(' (',' responses ('),chart));
 const large={...chart,respondents:5000,rows:chart.rows.map(row=>({...row,count:row.count*100}))};assert.ok(homeExitReasonChartMatches(facts(large),large));
});

test('current missing-count claims reject the chart; explicit historical absence and metadata limitations do not',()=>{
 const chart=homeExitReasonChart(fixture()),answer=facts(chart);
 for(const denial of ["I don't have exit-survey counts.",'S2 reason counts are still unavailable.','Exit-survey feedback is unavailable.','No current S2 data is available.','S2 timed out.','S2 data are unavailable.','S2 was unavailable earlier, but S2 is still unavailable.'])assert.equal(homeExitReasonChartMatches(denial+'\n'+answer,chart),false,denial);
 for(const context of ['Exit-survey feedback was unavailable before refresh.','S2 was unavailable earlier; current reason counts have recovered.','Fieldwork dates and complete suppression metadata are unavailable.','No causal evidence can be established from exit-survey reasons.'])assert.ok(homeExitReasonChartMatches(context+'\n'+answer,chart),context);
});

test('root and summary suppression propagate through the S2 packet before chart or model consumption',()=>{
 for(const scope of ['root','summary']){
  const data=structuredClone(exitReasonSurvey);(scope==='root'?data:data.summary).suppressed=true;
  const packet=buildHomePack({'survey-sentiment':{status:'loaded',data}},'Company','exit survey reasons'),source=packet.sources.find(source=>source.id==='S2');
  assert.equal(source.facts.exit_respondents,null);assert.ok(source.facts.rows.every(row=>row.suppressed===true&&row.exits===null&&row.pct_of_exit_responses===null));assert.equal(homeExitReasonChartFromPacket(packet),null);
 }
});
