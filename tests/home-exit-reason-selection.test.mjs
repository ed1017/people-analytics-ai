import test from 'node:test';
import assert from 'node:assert/strict';
import {wantsHomeExitReasons} from '../lib/home-exit-reason-selection.ts';
import {homeEvidenceSelection} from '../lib/home-conversation.ts';
import {buildHomePack} from '../lib/home-pack.mjs';
import {exitReasonSurvey} from './fixtures/exit-reason-packet.mjs';
const question='What reasons do employees give for leaving in the exit survey?';
const history=[{role:'user',content:question}];
const data=structuredClone(exitReasonSurvey);
data.exit_dimensions=Array.from({length:12},(_,index)=>({...data.exit_dimensions[0],question_code:'Q'+index,question_text:question}));
const pack=selection=>buildHomePack({'survey-sentiment':{status:'loaded',data}},'Company',selection).sources.find(source=>source.id==='S2');
test('direct and contextual reason requests retain primary reasons ahead of lexical question matches',()=>{
 for(const current of ['exit survey reasons','exit surveys reasons','Why did exit survey respondents leave?','What did exit-survey respondents report?','Show the chart now','Which reason was most common?','Why?','What are those counts again?','The evidence has been refreshed. What reasons do employees give for leaving in the exit survey? Show a chart using exit-survey reasons and distinguish them from administrative separation records.']){
  const selection=homeEvidenceSelection(current,history);assert.ok(wantsHomeExitReasons(selection),current);assert.ok(pack(selection).facts.rows.every(row=>row.kind==='Reported primary reason'),current);assert.equal(pack(selection).coverage.rowsAvailable,16);
 }
});
test('explicit measure switches and later shorthand do not resurrect an older S2 reason topic',()=>{
 for(const current of ['Exit survey work-life balance favorability','Show manager ratings instead','Show turnover rates now','Show attrition rates instead','Show administrative separation records','How many people are in the workforce?','Show exit-survey ratings instead of reasons']){
  const selection=homeEvidenceSelection(current,history);assert.equal(wantsHomeExitReasons(selection),false,current);
  assert.equal(wantsHomeExitReasons(homeEvidenceSelection('Show the chart now',[...history,{role:'user',content:current}])),false,current);
 }
 assert.equal(wantsHomeExitReasons('Show the chart now'),false);
});
test('missing primary reasons retain canonical experience-question fallback without inventing counts',()=>{
 const missing=structuredClone(data);missing.exit_reasons=[];
 const source=buildHomePack({'survey-sentiment':{status:'loaded',data:missing}},'Company',homeEvidenceSelection('Show the chart now',history)).sources.find(source=>source.id==='S2');
 assert.ok(source.facts.rows.every(row=>row.kind==='Exit experience question'&&row.exits===null));
});
