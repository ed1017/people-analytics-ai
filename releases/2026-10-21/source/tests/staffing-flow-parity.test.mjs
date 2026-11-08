import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as swp from '../lib/swp-demo.ts';
import {guidedWorkloadResult} from '../lib/guided-workload.ts';
const jsx=(type,props)=>({type,props});
const exports={};const code=ts.transpileModule(fs.readFileSync(new URL('../components/simple-swp-demo.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
vm.runInNewContext(code,{exports,require:name=>name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name==='react'?{useState:value=>[value,()=>{}]}:name==='@/lib/swp-demo'?swp:name==='@/lib/guided-workload'?{guidedWorkloadResult}:name==='@/lib/staffing-option-title'?{staffingOptionTitle:mix=>`${mix.build}/${mix.move}/${mix.buy}`}:name==='@/lib/scenario-chat-continuity'?{staffingAssumptions:()=> 'Fictional assumptions'}:name==='@/lib/scenario-planning-parity'?{scenarioRecommendation:()=> 'Conditional recommendation'}:name==='@/lib/workforce-input-display'?{workforceInputDisplay:(key,value)=>({label:key,value})}:new Proxy({},{get:(_,key)=>key})});
const nodes=value=>!value||typeof value!=='object'?[]:Array.isArray(value)?value.flatMap(nodes):[value,...nodes(value.props?.children),...nodes(value.props?.levers)];
const draft=await swp.createSwpDemo('guided-flow-parity','2026-11-08T12:00:00Z'),comparison=await swp.compareSwpDemo(draft);
const props={draft,comparison:null,selection:null,reviewing:false,disabled:false,pending:false,editingDisabled:false,edit:null,alreadySaved:false,onCalculate(){},onSelect(){},onPrepare(){}};
const render=patch=>nodes(exports.SimpleSwpDemo({...props,...patch}));
test('normal workflow explicitly compares at step 2, chooses at step 3 and reviews at step 4',()=>{
 for(const [patch,step] of [[{},2],[{comparison},3],[{comparison,reviewing:true},4]]){
  const tree=render(patch),progress=tree.find(n=>n.type==='progress');assert.equal(progress.props.max,4);assert.equal(progress.props.value,step);
 }
 const initial=render({});const compare=initial.find(n=>n.type==='button'&&n.props.children==='Compare staffing options');assert.equal(compare.props.onClick,props.onCalculate);assert.equal(compare.props.disabled,false);
 assert.equal(initial.some(n=>n.type==='StaffingOptionsTable'),false);
});
test('normal choices stay free and review remains explicit; guided cash priority is disclosed',()=>{
 const tree=render({comparison}),table=tree.find(n=>n.type==='StaffingOptionsTable');assert.ok(table.props.options.length>1);
 for(const option of table.props.options){const radio=nodes(table.props.action(option)).find(n=>n.type==='input');assert.equal(radio.props.disabled,option.status==='invalid');}
 assert.equal(tree.find(n=>n.type==='button'&&n.props.children==='Review selected Action Plan').props.disabled,true);
 const source=fs.readFileSync(new URL('../components/simple-swp-demo.tsx',import.meta.url),'utf8');assert.match(source,/not the same as least uncovered work or best overall/);
});
test('entry and reopen never calculate implicitly, while previously requested comparison can refresh edited inputs',()=>{
 const source=fs.readFileSync(new URL('../components/swp-guided-journey.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(source,/resumeKey|resumeComparison|setResumeKey/);
 const resume=source.slice(source.indexOf(' function resumeDemo'),source.indexOf(' async function restartDemo'));assert.doesNotMatch(resume,/calculate\(/);
 const entry=source.slice(source.indexOf("  if(text===swpDemoPrompt){"),source.indexOf('  if(chatScenario&&matches'));assert.doesNotMatch(entry,/calculate\(/);
 assert.match(source,/showOptions&&draft\?\.inputs\.guidedWorkload&&matches&&active/);assert.match(source,/1 of 4\. Review shared planning inputs/);
});
test('post-save next steps require exact committed receipt, goal, dataset and reset context',()=>{
 const source=fs.readFileSync(new URL('../components/swp-guided-journey.tsx',import.meta.url),'utf8');
 assert.match(source,/const committed=readSwpSaveReview\(decisionStore\.getSnapshot\(\)\.data\.workspaces\[review\.goal\.id\]/);
 assert.match(source,/savedConfirmation\.datasetToken===token&&savedConfirmation\.resetEpoch===conversation\.resetEpoch&&savedConfirmation\.goalId===conversation\.activeGoalId/);
 assert.match(source,/committedConfirmation\.selectedPlanId===savedConfirmation\.planId/);
 assert.match(source,/if\(!draft\|\|!matches\)return savedContinuation/);
 assert.match(source,/Your staffing plan and goal are saved in this browser/);assert.match(source,/not completed staffing work/);
 assert.match(source,/onNavigate\('action-plans'\)/);assert.match(source,/onNavigate\('plan-track'\)/);
});

test('leaving whole-app guide removes tutorial locks before ordinary draft resume',()=>{
 const source=fs.readFileSync(new URL('../components/swp-guided-journey.tsx',import.meta.url),'utf8');
 const exit=source.slice(source.indexOf('if(!wholeAppDemo){if(tourSession.current)'),source.indexOf('if(tourSession.current===wholeAppDemo.session'));
 assert.match(exit,/setGuided\(false\)/);assert.match(exit,/closeDemo\(\)/);assert.doesNotMatch(exit,/setDraft\(null\)|setSelection\(null\)/);
 const normal=render({});assert.equal(normal.find(n=>n.type==='SwpDemoInputs').props.disabled,false);
});
