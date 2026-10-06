import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createRequire} from 'node:module';
import * as goalContext from '../lib/goal-context.ts';
const require=createRequire(import.meta.url),exports={};
const source=fs.readFileSync(new URL('../components/goal-takeaway.tsx',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(js,{exports,require:name=>name==='@/lib/goal-context'?goalContext:name==='@/components/decision-store'?{recordDecisionEvidence:()=>{throw Error('Rendering must not save evidence')}}:name==='@/components/chat-content'?{ChatContent:({content})=>React.createElement('p',null,content)}:require(name)});
const goal='Review skill coverage in the sample workforce.';
const render=(displayedGoal,focusedIssue=goal,overrides={})=>renderToStaticMarkup(React.createElement('div',null,React.createElement('p',null,'Goal: '+displayedGoal),React.createElement(exports.GoalTakeaway,{goalId:'synthetic',goalContext:{goal:focusedIssue,currentScope:'Company-wide; unfiltered'},displayedGoal,payload:{page:'skills'},active:true,ready:false,paused:true,validGoalIds:['synthetic'],unavailable:'Company-wide evidence is unavailable.',...overrides})));

test('selected goal and identical focused issue appear once while evidence context remains visible',()=>{
 const html=render(goal);
 assert.equal(html.split(goal).length-1,1);
 assert.doesNotMatch(html,/Focused issue/);
 assert.match(html,/aria-label="Goal takeaway"/);
 assert.match(html,/Company-wide evidence is unavailable/);
});
test('formatting-only differences are deduplicated but scope, targets and questions remain distinct',()=>{
 for(const issue of ['  Review  skill coverage in the sample workforce.  ','REVIEW SKILL COVERAGE IN THE SAMPLE WORKFORCE','Review skill coverage in the sample workforce'])assert.equal(goalContext.hasDistinctFocusedIssue(goal,issue),false);
 for(const issue of ['Review skill coverage in Canada.','Reduce turnover to 5%.','Review skill coverage in the sample workforce?']){
  assert.equal(goalContext.hasDistinctFocusedIssue(goal,issue),true);
  const html=render(goal,issue);assert.match(html,/aria-label="Focused issue"/);assert.ok(html.includes(issue));assert.ok(html.includes(goal));
 }
 assert.match(render('',goal),/Focused issue/);
});
test('display deduplication does not alter goal context, request scope or reset visibility',()=>{
 const context={goal,constraints:'Keep the existing budget.',currentScope:'Canada'},payload={page:'skills'};
 const before=JSON.stringify(context),request=goalContext.goalSummaryRequest(payload,context);
 render(goal,goal,{goalContext:context,payload});
 assert.equal(JSON.stringify(context),before);assert.deepEqual(goalContext.goalSummaryRequest(payload,context),request);
 for(const overrides of [{goalId:''},{active:false}])assert.doesNotMatch(render('',goal,overrides),/Focused issue|Goal takeaway|Company-wide evidence/);
});
