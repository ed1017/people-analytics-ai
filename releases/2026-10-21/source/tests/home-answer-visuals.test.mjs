import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
function load(file){const exports={};const js=ts.transpileModule(fs.readFileSync(new URL('../components/'+file,import.meta.url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(js,{exports,require:name=>name==='./chat-evidence-chart'?load('chat-evidence-chart.tsx'):name==='@/components/assumptions-disclosure'?load('assumptions-disclosure.tsx'):require(name)});return exports;}
const {HomeAnswerVisuals,currentHomeVisualAnswer,HomeConversationSplit}=load('home-answer-visuals.tsx');
const series={metric:'turnover',title:'Monthly turnover',unit:'%',scope:'Company-wide',synthetic:true,points:[{date:'2026-09-01',value:1.42}],asOf:'2026-09-30',sourceId:'A1',limitation:'Recorded rates.'};
test('only latest current answer can supply the visual panel',()=>{
 const q={role:'user',content:'Turnover?'},a={role:'assistant',content:'1.42%'},next={role:'user',content:'Costs?'},stale={role:'assistant',content:'Old'},map=new Map([[a,{context:'current'}],[stale,{context:'old'}]]);
 assert.equal(currentHomeVisualAnswer([q,a],map,'current',true,false,false),a);
 for(const args of [[[q,a,next],map,'current',true,false,false],[[q,a],map,'changed',true,false,false],[[q,a],map,'current',false,false,false],[[q,a],map,'current',true,true,false],[[q,a],map,'current',true,false,true],[[q,a,next,stale],map,'current',true,false,false],[[q,{...a}],map,'current',true,false,false]])assert.equal(currentHomeVisualAnswer(...args),null);
});
test('pending, error, unsupported and stale states never render previous chart',()=>{
 for(const state of [{pending:true,error:false,current:true},{pending:false,error:true,current:true},{pending:false,error:false,current:false}]){const html=renderToStaticMarkup(React.createElement(HomeAnswerVisuals,{...state,series:[series]}));assert.doesNotMatch(html,/<figure/);assert.match(html,/role="status"/);}
 const empty=renderToStaticMarkup(React.createElement(HomeAnswerVisuals,{pending:false,error:false,current:true,series:[]}));assert.match(empty,/No chart available/);assert.doesNotMatch(empty,/<h3|home-answer-visuals/);
});
test('current chart retains contract and follows conversation in DOM',()=>{
 const html=renderToStaticMarkup(React.createElement(HomeConversationSplit,{enabled:true,visuals:React.createElement(HomeAnswerVisuals,{pending:false,error:false,current:true,series:[series]})},React.createElement('textarea',{'aria-label':'Question',defaultValue:'Keep draft'})));
 assert.ok(html.indexOf('<textarea')<html.indexOf('<aside'));assert.equal((html.match(/<figure/g)||[]).length,1);assert.match(html,/1.42%/);assert.match(html,/2026-09-01/);assert.match(html,/Recorded rates/);assert.match(html,/Current answer visuals/);
});

test('planning supplements remain fully rendered when no chart exists',()=>{const html=renderToStaticMarkup(React.createElement(HomeAnswerVisuals,{pending:false,error:false,current:true,series:[],supplement:React.createElement('button',null,'Save plan')}));assert.match(html,/Save plan/);assert.match(html,/home-answer-visuals/);assert.doesNotMatch(html,/No chart available/);});

test('scalar KPI uses readable value and provenance without inventing a chart',()=>{
 const card={...series,axis:'scalar',metric:'median_time_to_fill_days',title:'Median time to fill',unit:'days',sourceId:'R1',points:[{date:'2026-09-30',value:33}]};
 const html=renderToStaticMarkup(React.createElement(HomeAnswerVisuals,{pending:false,error:false,current:true,series:[card]}));
 assert.match(html,/Median time to fill/);assert.match(html,/33/);assert.match(html,/days/);assert.match(html,/2026-09-30/);assert.doesNotMatch(html,/No chart available|role="region"/);
});
