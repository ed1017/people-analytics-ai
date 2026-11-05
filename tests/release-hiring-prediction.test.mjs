import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createRequire} from 'node:module';
import * as demo from '../releases/2026-10-21/source/lib/hiring-prediction-demo.ts';
import {homePromptCategories} from '../releases/2026-10-21/source/lib/home-prompt-categories.ts';
import {converseSolutions} from '../releases/2026-10-21/source/lib/home-solution-conversation-service.ts';
import {emptySolutionState} from '../releases/2026-10-21/source/lib/home-solution-conversation.ts';
import {buildHomePack} from '../releases/2026-10-21/source/lib/home-pack.mjs';
const root=new URL('../releases/2026-10-21/source/',import.meta.url),require=createRequire(import.meta.url);
test('actual model payload carries verified experiment only for explicit experiment questions',async()=>{
 for(const text of ['Explain the synthetic hiring classifier','Discuss training options without making a plan']){
  const request={version:1,requestId:'prediction-context',goal:{id:'',statement:''},scope:'Company-wide',filters:{country:'all',org:'all',level:'all'},timeZone:'UTC',evidence:buildHomePack({},'Company-wide',text),goalContext:null,selectedId:null,catalog:null,state:emptySolutionState(),message:{id:'prediction-question',text}};
  const stop=Error('verified mocked payload');let calls=0;
  await assert.rejects(converseSolutions(request,{loadProjection:()=>assert.fail('no projection'),complete:async input=>{calls++;const context=JSON.parse(input[0].content.slice(input[0].content.indexOf('{')));assert.deepEqual(context.syntheticHiringExperiment,demo.hiringPredictionAiContext(text));assert.equal(context.goalContext,null);throw stop;}},new AbortController().signal),e=>e===stop);assert.equal(calls,1);
 }
});
test('Explore exposes the explicitly synthetic prompt after existing risk and market entries',()=>{const p=homePromptCategories[0].prompts;assert.equal(p.length,4);assert.equal(p[3],demo.hiringPredictionPrompt);assert.ok(demo.isHiringPredictionQuestion(p[3]+'?'));assert.equal(demo.isHiringPredictionQuestion('Predict our October hires'),false);});
test('saved text contains complete versioned results without falsely claiming company applicability',()=>{
 const a=demo.hiringPredictionMatrixAnswer;assert.equal(a,JSON.parse(JSON.stringify({content:a})).content);assert.match(a,/separate from the October workforce/);assert.match(a,/Threshold: probability >= 50%/);assert.match(a,/precision Not defined/);for(const f of demo.hiringPredictionReport.families)for(const m of Object.values(f.methods))assert.ok(a.includes(`TP ${m.tp}, FP ${m.fp}, FN ${m.fn}, TN ${m.tn}`));
 assert.equal(demo.hiringPredictionAiContext('What about backfill?'),null);assert.match(demo.hiringPredictionAiContext('Explain the synthetic hiring classifier').scope,/never apply/);
});
test('accessible matrix orientation, labels, all families and undefined metric explanation are rendered',()=>{
 const exports={},code=ts.transpileModule(fs.readFileSync(new URL('components/hiring-prediction-demo.tsx',root),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{exports,require:name=>name==='@/lib/hiring-prediction-demo'?demo:require(name)});
 const defaultHtml=renderToStaticMarkup(React.createElement(exports.HiringPredictionDemo));assert.equal((defaultHtml.match(/<table/g)||[]).length,3);assert.doesNotMatch(defaultHtml,/Confusion matrix|Actual \/ Predicted|TP [0-9]/);
 const html=renderToStaticMarkup(React.createElement(exports.HiringPredictionDemo,{showMatrices:true}));assert.equal((html.match(/<table/g)||[]).length,9);assert.equal((html.match(/<caption/g)||[]).length,9);assert.match(html,/Actual \/ Predicted/);assert.match(html,/Unexpected reversal/);assert.match(html,/Undefined precision/);assert.match(html,/50%/);assert.match(html,/not a current hiring forecast/);assert.match(html,/scope="row"/);
});
test('local route precedes provider and scenario dispatch, and renderer uses exact retained answer',()=>{
 const source=fs.readFileSync(new URL('components/pages/overall-overview-page.tsx',root),'utf8');const start=source.indexOf('if(localPredictionReply)');assert.ok(start>0&&start<source.indexOf('if(marketFollowup?.workspace',start));const block=source.slice(start,source.indexOf('if(marketFollowup?.workspace',start));assert.match(block,/conversation.storageReady/);assert.match(block,/conversation.saved/);assert.match(block,/if\(!keepComposer\)/);assert.doesNotMatch(block,/solutions.send|fetch\(|setRiskRequest|setModel|clear/);assert.match(source,/showMatrices=\{message.content===hiringPredictionMatrixAnswer\}/);
});

test('ordinary explanations bind to latest exact demo, never stale or unrelated planning context',()=>{for(const q of ['Why is recall zero?','What does that mean?','Is this good enough?']){assert.equal(demo.localHiringPredictionReply(q,demo.hiringPredictionAnswer),demo.hiringPredictionExplanation);assert.equal(demo.localHiringPredictionReply(q,undefined),null);assert.equal(demo.localHiringPredictionReply(q,'Another scenario'),null);}for(const q of ['What about backfill?','Change the budget','Predict our October hires',"What is this year's turnover?",'How do I use the headcount forecast?' ])assert.equal(demo.localHiringPredictionReply(q,demo.hiringPredictionAnswer),null);});

test('matrices require an explicit request and retained experiment context',()=>{assert.doesNotMatch(demo.hiringPredictionPrompt,/matrix/);assert.doesNotMatch(demo.hiringPredictionAnswer,/TP [0-9]/);for(const q of ['Show the confusion matrix','Can you show me the confusion matrix?','confusion matrix']){assert.equal(demo.localHiringPredictionReply(q,demo.hiringPredictionAnswer),demo.hiringPredictionMatrixAnswer);assert.equal(demo.localHiringPredictionReply(q,'Unrelated staffing plan'),null);}assert.equal(demo.localHiringPredictionReply('Show the confusion matrix for the synthetic hiring test',undefined),demo.hiringPredictionMatrixAnswer);assert.equal(demo.localHiringPredictionReply(demo.hiringPredictionPrompt,undefined),demo.hiringPredictionAnswer);});

test('AI explanation context does not volunteer matrix cells',()=>{const c=demo.hiringPredictionAiContext('Explain the synthetic hiring classifier');assert.match(c.presentation,/only when the user explicitly asks/);assert.doesNotMatch(c.report,/TP [0-9]/);assert.match(demo.hiringPredictionAiContext('Show the confusion matrix for the synthetic hiring test').report,/TP [0-9]/);});

test('local prediction messages are not mislabeled as external market insights',()=>{const s=fs.readFileSync(new URL('components/goal-conversation-messages.tsx',root),'utf8');assert.match(s,/local&&message.marketInsights\?"Market insights":message.role/);});
