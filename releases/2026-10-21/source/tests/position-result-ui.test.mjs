import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
const position={planId:'position-result-one',planNumber:1,revision:2,datasetToken:'test:1',metric:'position-ready-fte',unit:'FTE',value:6,date:'2026-10-30',population:'12 selected existing position slots',definition:'Ready capacity excludes proposed additional positions.',provenance:'Month 6, explicitly selected target date.',illustrative:true,startDate:null,measurementId:null,position:{financeRevision:1}};
const legacy={...position,planId:'legacy-plan',metric:'headcount',unit:'people',value:100,illustrative:false};
const plan={id:'legacy-plan',number:1,draft:{revision:1}};
function harness(file,{selected=position.planId,broken=false}={}){
 let hooks=[],cursor=0;const prepared=[],commits=[],selections=[],tracks=[];
 const targets=[position],catalog={plans:[plan],attachments:[{planId:plan.id}]};
 const results={readManualResults:()=>({targets:[],entries:[]}),activeResults:()=>[],resultTarget:()=>({target:legacy,reason:null}),resultDifference:()=>({difference:null,note:'Interim measurement.'}),prepareManualResult:(_,id)=>{prepared.push(id);return {target:id===position.planId?position:legacy};},commitManualResult:(_,ticket,value)=>{commits.push({ticket,value});},manualPlanResultsField:'results'};
 const exports={},code=ts.transpileModule(fs.readFileSync(new URL(`../components/${file}.tsx`,import.meta.url),'utf8'),{fileName:`${file}.tsx`,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{exports,crypto:{randomUUID:()=> 'result-one'},require:name=>name==='react'?{...React,useId:()=> 'test',useRef:()=>({current:null}),useState:init=>{const i=cursor++;if(!(i in hooks))hooks[i]=typeof init==='function'?init():init;return [hooks[i],v=>{hooks[i]=typeof v==='function'?v(hooks[i]):v}];}}:name==='@/lib/home-plan-alternatives'?{readPlanAlternatives:()=>catalog,planAlternativesField:'plans'}:name==='@/lib/position-result-targets'?{listPositionResultTargets:()=>{if(broken)throw Error('broken');return targets},positionFteAmount:n=>Number.isFinite(n)&&n>=0&&n<=1000&&Math.abs(n*100-Math.round(n*100))<1e-8}:name==='@/lib/manual-plan-results'?results:name==='@/lib/plan-result-review'?{reviewPlanResult:()=>({latest:null,difference:null,status:'Not recorded',corrected:false})}:name==='./decision-store'?{decisionStore:{}}:name==='./plan-alternative-card'?{PlanAlternativeCard:()=>React.createElement('div',null,'Legacy plan snapshot')}:require(name)});
 const props={goalId:'a',goal:'Goal',fields:{},datasetToken:'test:1',selectedPlanId:selected,selected,onSelectPlan:id=>selections.push(id),onSelect:id=>selections.push(id),onTrack:id=>tracks.push(id)};
 function render(){cursor=0;return exports[file==='manual-plan-results'?'ManualPlanResults':'PlanResultReview'](props);}
 function find(tree,predicate){if(!tree||typeof tree!=='object')return null;if(predicate(tree))return tree;for(const child of React.Children.toArray(tree.props?.children)){const found=find(child,predicate);if(found)return found;}return null;}
 const get=predicate=>{const e=find(render(),predicate);assert.ok(e,'Expected rendered control');return e;};
 return {prepared,commits,selections,tracks,render,text:()=>renderToStaticMarkup(render()),get,change:(suffix,value)=>get(e=>e.type==='input'&&e.props.id===`test-${suffix}`).props.onChange({target:{value}}),click:label=>get(e=>e.type==='button'&&React.Children.toArray(e.props.children).join('')===label).props.onClick(),submit:()=>get(e=>e.type==='form').props.onSubmit({preventDefault(){}})};
}
test('Track combines existing plans and position targets without a fake legacy snapshot',()=>{
 const h=harness('manual-plan-results');const html=h.text();assert.match(html,/legacy-plan/);assert.match(html,/position-result-one/);assert.match(html,/2026-10-30 - funding 1/);assert.match(html,/Saved position target/);assert.match(html,/6 FTE/);assert.doesNotMatch(html,/Legacy plan snapshot/);h.click('Record a result');assert.deepEqual(h.prepared,[position.planId]);assert.equal(h.get(e=>e.type==='input'&&e.props.id==='test-value').props.inputMode,'decimal');
});
test('FTE input rejects excess precision and bounds before review; valid fractional entry retains exact target',()=>{
 const h=harness('manual-plan-results');h.click('Record a result');h.change('value','4.251');h.submit();assert.match(h.text(),/at most two decimal places/);h.change('value','1001');h.submit();assert.match(h.text(),/at most two decimal places/);h.change('value','4.25');h.change('date','2026-10-01');h.get(e=>e.type==='textarea').props.onChange({target:{value:'Aggregate staffing report'}});h.get(e=>e.type==='input'&&e.props.type==='checkbox'&&e.props.required).props.onChange({target:{checked:true}});h.submit();assert.match(h.text(),/Review result before saving/);h.click('Save result');assert.equal(h.commits.length,1);assert.equal(h.commits[0].ticket.target.planId,position.planId);assert.equal(h.commits[0].value.value,4.25);
});
test('legacy count entry remains integer-only and keeps its original plan review',()=>{
 const h=harness('manual-plan-results',{selected:legacy.planId});assert.match(h.text(),/Legacy plan snapshot/);h.click('Record a result');assert.equal(h.get(e=>e.type==='input'&&e.props.id==='test-value').props.inputMode,'numeric');h.change('value','1.5');h.submit();assert.match(h.text(),/Enter a whole number/);assert.equal(h.commits.length,0);
});
test('Review chart and Track link use the same position selection; switching uses native callback',()=>{
 const h=harness('plan-result-review');assert.match(h.text(),/position-result-one/);assert.match(h.text(),/Ready capacity in selected vacancies/);assert.match(h.text(),/Ready capacity excludes proposed additional positions/);h.get(e=>e.type==='button'&&String(e.props.children).includes('Open Track')).props.onClick();assert.deepEqual(h.tracks,[position.planId]);h.get(e=>e.type==='select').props.onChange({target:{value:legacy.planId}});assert.deepEqual(h.selections,[legacy.planId]);
});
test('unavailable position targets report an error and do not fall back to another plan',()=>{
 for(const file of ['manual-plan-results','plan-result-review']){const h=harness(file,{broken:true});assert.match(h.text(),/Saved position targets could not be read/);assert.doesNotMatch(h.text(),/Saved headcount target|100 people/);assert.equal(h.prepared.length,0);}
});
