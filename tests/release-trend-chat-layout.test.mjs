import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const app=new URL('../releases/2026-10-21/source/',import.meta.url),require=createRequire(new URL('package.json',app));
const ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const el=React.createElement;
function load(name,modules={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(new URL('components/'+name,app),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;new Function('module','exports','require',code)(module,module.exports,id=>modules[id]??require(id));return module.exports;}
const calls=[];
const results=load('planner-results.tsx',{'react-dom':{createPortal(child,target){calls.push(target);return el('div',{'data-test-portal':target.id},child);}}});
const {PlannerResultsProvider:Provider,PlannerResultsVisibility:Visibility,PlannerResults:Results}=results;
const target={id:'right-results'};
function render(tree){calls.length=0;return renderToStaticMarkup(tree);}
function result(){return el(Results,null,el('span',null,'Computed result'));}
test('standalone results remain inline and visibility wrapper does not create a split layout',()=>{
 assert.equal(render(result()),'<span>Computed result</span>');assert.equal(calls.length,0);
 assert.equal(render(el(Visibility,{active:false},result())),'<span>Computed result</span>');assert.equal(calls.length,0);
});
test('parent visibility controls the portal without unmounting calculated content',()=>{
 for(const active of [true,false]){const html=render(el(Provider,{target,active},result()));assert.deepEqual(calls,[target]);assert.match(html,/Computed result/);assert.equal(html.includes('hidden=""'),!active);}
});
test('nested visibility can hide but cannot reactivate inactive ancestors',()=>{
 for(const parent of [true,false])for(const first of [true,false])for(const second of [true,false]){
 const html=render(el(Provider,{target,active:parent},el(Visibility,{active:first},el(Visibility,{active:second},result()))));assert.deepEqual(calls,[target]);assert.equal(html.includes('hidden=""'),!(parent&&first&&second));assert.match(html,/Computed result/);
 }
});
test('a missing target withholds only split results and produces no portal',()=>{
 const html=render(el(Provider,{target:null,active:true},el(React.Fragment,null,el('button',null,'Controls'),el(Visibility,{active:true},result()))));assert.equal(html,'<button>Controls</button>');assert.equal(calls.length,0);
});
const planner=load('interactive-planner.tsx',{'./planner-results':results,'./interactive-planner.module.css':{default:{}},'./decision-style.module.css':{default:{}},'@/lib/catalog-display':{catalogProseDisplay:value=>value}}).InteractivePlanner;
const props={scope:'Scope',outcome:'Decision',metrics:[{label:'FTE',value:2}],levers:el('button',null,'Adjust inputs'),visual:el('span',null,'Chart'),actions:el('button',null,'Save'),assumptions:'Entered assumptions'};
test('InteractivePlanner uses optional result label in split mode and retains standalone controls and values',()=>{
 for(const label of [undefined,'Workforce trend results']){const html=render(el(Provider,{target,active:true},el(planner,{...props,...(label?{resultsLabel:label}:{})})));assert.match(html,new RegExp('aria-label="'+(label??'Position scenario results')+'"'));assert.equal((html.match(/Adjust inputs/g)||[]).length,1);assert.equal((html.match(/Chart/g)||[]).length,1);assert.match(html,/FTE/);assert.deepEqual(calls,[target]);}
 const html=render(el(planner,{...props,resultsLabel:'Custom result'}));assert.equal(calls.length,0);for(const text of ['Adjust inputs','Chart','FTE','Save','Entered assumptions'])assert.ok(html.includes(text));assert.doesNotMatch(html,/aria-label="Custom result"/);
});
test('Overview wiring keeps chat visible for trend mode and supplies trend results with the split provider',()=>{
 const source=ts.createSourceFile('overview.tsx',fs.readFileSync(new URL('components/pages/overall-overview-page.tsx',app),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),elements=[];
 const walk=n=>{if(ts.isJsxElement(n))elements.push(n);ts.forEachChild(n,walk);};walk(source);
 const attr=(node,name)=>node.openingElement.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.getText(source)===name);
 const chat=elements.find(n=>attr(n,'aria-label')?.initializer?.getText(source)==='"Home chat workspace"');assert.ok(chat);assert.equal(attr(chat,'hidden'),undefined);
 for(let node=chat.parent;node;node=node.parent){if(ts.isJsxElement(node)){const hidden=attr(node,'hidden');if(hidden)assert.doesNotMatch(hidden.getText(source),/trendOpen/);}}
 const provider=elements.find(n=>n.openingElement.tagName.getText(source)==='PlannerResultsProvider'&&attr(n,'target')?.initializer?.getText(source)==='{trendResultsTarget}');assert.ok(provider);assert.equal(attr(provider,'active').initializer.getText(source),'{trendOpen}');assert.match(provider.getText(source),/<GroupCapacityRisk\b/);
 const targetNode=[];const scan=n=>{if(ts.isJsxSelfClosingElement(n)&&n.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.getText(source)==='ref'&&p.initializer?.getText(source)==='{setTrendResultsTarget}'))targetNode.push(n);ts.forEachChild(n,scan);};scan(source);assert.equal(targetNode.length,1);
});
