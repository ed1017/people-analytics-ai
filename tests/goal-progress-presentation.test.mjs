import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import {progressFixture,day} from './fixtures/goal-progress-summary.mjs';
import {readProgressSnapshot} from '../lib/goal-progress-summary.ts';
import {emptyGoalProgress} from '../lib/goal-progress.ts';

const require=createRequire(import.meta.url),filename=path.resolve('components/goal-progress-summary.tsx');
const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const loaded=new Module(filename);loaded.filename=filename;
// The read-only summary uses props; the selected-store wrapper is not mounted.
loaded.require=id=>id.startsWith('@/')||id==='./decision-store'?{}:require(id);
loaded._compile(compiled.outputText,filename);
const {GoalProgressSummary}=loaded.exports;
const render=(snapshot,extra={})=>renderToStaticMarkup(React.createElement(GoalProgressSummary,{context:snapshot.context,snapshot,...extra}));

for(const [direction,label] of [['increase','Higher is better'],['decrease','Lower is better'],['maintain','Maintain the target'],['ceiling','At or below the limit']])test(`${direction} target is visible before the disclosure with its own direction`,()=>{
 const snapshot=readProgressSnapshot(progressFixture('goal',direction),'goal',day),before=structuredClone(snapshot);
 const html=render(snapshot,{pinnedPlanName:'Service plan',goal:'Review the team'}),compact=html.split('<details>')[0];
 assert.match(compact,/Pinned proposal:.*Service plan/);assert.match(compact,/Selection is not approval or execution/);
 assert.ok(compact.includes(`${direction==='increase'?120:80} people by 2026-12-31`));assert.ok(compact.includes(label));
 assert.match(compact,/Measured progress:.*2026-09-20.*User-reported/);assert.match(compact,/Execution not recorded/);
 assert.match(html,/Plan link:<\/strong> No saved plan link\. Progress entries are recorded separately from pinned proposals\./);assert.doesNotMatch(html,/No confirmed measurement link|Review and confirm progress in chat/);assert.doesNotMatch(html,/<details[^>]*open/);
 if(direction==='maintain')assert.doesNotMatch(html,/At or below the limit/);
 assert.deepEqual(snapshot,before);
});

test('missing, unsupported, stale and expired progress retains honest target and observation states',()=>{
 const empty=render(readProgressSnapshot(emptyGoalProgress('goal'),'goal',day));
 const pinnedEmpty=render(readProgressSnapshot(emptyGoalProgress('goal'),'goal',day),{pinnedPlanName:'Service plan'});
 assert.match(pinnedEmpty,/No saved plan link/);assert.match(pinnedEmpty,/Not yet measured/);assert.doesNotMatch(pinnedEmpty,/No confirmed measurement link|Review and confirm progress in chat/);
 assert.match(empty,/Target:<\/strong> Not defined/);assert.match(empty,/Not yet measured/);assert.doesNotMatch(empty,/Pinned proposal/);
 const unsupported=render(readProgressSnapshot(progressFixture('goal','increase',{unsupported:true}),'goal',day));
 assert.match(unsupported.split('<details>')[0],/120 percent by 2026-12-31/);assert.match(unsupported,/Comparable measurement unavailable/);assert.match(unsupported,/no supported measurement summary/);
 const stale=render(readProgressSnapshot(progressFixture('goal','increase',{stale:true}),'goal',day));
 assert.match(stale.split('<details>')[0],/2026-08-20.*Stale under saved freshness policy/);
 const expired=render(readProgressSnapshot(progressFixture('goal'),'goal','2027-01-01'));
 assert.match(expired.split('<details>')[0],/Deadline passed \(2026-12-31\)/);assert.match(expired,/No trajectory, forecast, on-track status or completion claim is inferred/);
});
