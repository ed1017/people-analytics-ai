import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {createRequire} from 'node:module';
import * as demo from '../releases/2026-10-21/source/lib/opening-known-hiring-demo.ts';
import * as old from '../releases/2026-10-21/source/lib/hiring-prediction-demo.ts';
const root=new URL('../releases/2026-10-21/source/',import.meta.url),require=createRequire(import.meta.url);
test('new entry and request-only matrix keep old snapshots distinct',()=>{
 assert.equal(demo.localOpeningKnownReply(old.hiringPredictionPrompt,undefined),demo.openingKnownAnswer);
 assert.doesNotMatch(demo.openingKnownAnswer,/TP [0-9]/);
 assert.equal(demo.localOpeningKnownReply('Show the confusion matrix',demo.openingKnownAnswer),demo.openingKnownMatrixAnswer);
 assert.equal(demo.localOpeningKnownReply('Show the confusion matrix',old.hiringPredictionAnswer),null);
 assert.equal(old.localHiringPredictionReply('Show the confusion matrix',old.hiringPredictionAnswer),old.hiringPredictionMatrixAnswer);
 const dispatch=(q,p)=>demo.localOpeningKnownReply(q,p)??old.localHiringPredictionReply(q,p);
 for(const previous of [old.hiringPredictionAnswer,old.hiringPredictionMatrixAnswer,old.hiringPredictionExplanation])assert.equal(dispatch('Show the confusion matrix for the synthetic hiring test',previous),old.hiringPredictionMatrixAnswer);
 assert.equal(dispatch('Show the confusion matrix for the synthetic hiring test',demo.openingKnownAnswer),demo.openingKnownMatrixAnswer);
 for(const q of ['What does that mean?','Is this good enough?','Explain balanced accuracy','Explain Brier score']){
  assert.equal(demo.localOpeningKnownReply(q,demo.openingKnownAnswer),demo.openingKnownExplanation);
  assert.equal(demo.localOpeningKnownReply(q,'A staffing plan'),null);
 }
 assert.equal(demo.localOpeningKnownReply('What about backfill?',demo.openingKnownAnswer),null);
 assert.notEqual(demo.openingKnownAnswer,old.hiringPredictionAnswer);
 assert.equal(JSON.parse(JSON.stringify({content:demo.openingKnownMatrixAnswer})).content,demo.openingKnownMatrixAnswer);
});
test('UI shows all stress results by default without matrices; request adds accessible matrices',()=>{
 const exports={},code=ts.transpileModule(fs.readFileSync(new URL('components/opening-known-hiring-demo.tsx',root),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{exports,require:n=>n==='@/lib/opening-known-hiring-demo'?demo:n==='@/lib/hiring-prediction-demo'?old:require(n)});
 const render=showMatrices=>renderToStaticMarkup(React.createElement(exports.OpeningKnownHiringDemo,{showMatrices}));
 const initial=render(false);assert.equal((initial.match(/<table/g)||[]).length,3);assert.doesNotMatch(initial,/Actual \/ Predicted|TP [0-9]/);
 for(const phrase of ['27.3%','Relationships reverse','Feature-group baseline','not hiring decisions','then-known features','not a current hiring forecast'])assert.ok(initial.includes(phrase));
 const requested=render(true);assert.equal((requested.match(/<table/g)||[]).length,12);assert.match(requested,/Actual \/ Predicted/);assert.match(requested,/scope="row"/);
});
test('model context uses same results, excludes matrix unless requested and rejects unrelated topics',()=>{
 const context=demo.openingKnownAiContext('Explain the synthetic hiring classifier');assert.equal(context.report,demo.openingKnownAnswer);assert.doesNotMatch(context.report,/TP [0-9]/);assert.match(context.scope,/reversal failure/);
 assert.equal(demo.openingKnownAiContext('Show the confusion matrix for the synthetic hiring test').report,demo.openingKnownMatrixAnswer);
 assert.equal(demo.openingKnownAiContext('Forecast current turnover'),null);
 assert.equal(demo.openingKnownAiContext('Explain the calendar-only synthetic hiring test'),null);
});
test('published totals, calibration, exact threshold and saved numeric content agree',()=>{
 const report=demo.openingKnownReport;assert.equal(report.educationalGatePassed,true);assert.equal(report.operationallyQualified,false);
 assert.equal(report.families.reduce((s,f)=>s+f.methods['logistic-features'].openings,0),50400);
 for(const f of report.families)for(const m of Object.values(f.methods)){
  assert.equal(m.tp+m.fp+m.fn+m.tn,m.openings);
  assert.equal(m.calibration.reduce((s,b)=>s+b.openings,0),m.openings);
  assert.equal(m.calibration.reduce((s,b)=>s+b.started,0),m.positives);
  assert.ok(demo.openingKnownMatrixAnswer.includes(`TP ${m.tp}, FP ${m.fp}, FN ${m.fn}, TN ${m.tn}`));
 }
 const page=fs.readFileSync(new URL('components/pages/overall-overview-page.tsx',root),'utf8');assert.match(page,/localOpeningKnownReply\(message,previousPrediction\)\?\?localHiringPredictionReply/);assert.match(page,/message.content===openingKnownMatrixAnswer/);assert.match(page,/message.content===hiringPredictionMatrixAnswer/);
});
