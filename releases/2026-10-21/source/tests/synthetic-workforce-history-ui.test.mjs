import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import * as history from '../lib/synthetic-workforce-history.ts';
import * as scopeModel from '../lib/dashboard-scope.ts';
import {PUBLIC_9037 as P} from '../lib/public-9037-contract.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const source=fs.readFileSync(new URL('../components/synthetic-workforce-history.tsx',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{fileName:'synthetic-workforce-history.tsx',compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal(compiled.diagnostics.length,0);
const filters={country:'all',org:'all',level:'all'};
const receipt=(selected=filters)=>({version:3,status:'verified_public_aggregate',requested:{...selected},effective:{...selected},label:'Selected workforce',basis:'Verified public synthetic aggregate',datasetToken:P.token,contract:P.contract,cutoff:P.cutoff,metricContract:'voluntary-ytd-nine-month-average-stock-v2',stockStatus:'positive'});
function harness(overrides={}){
 let states=[],cursor=0,lastKey;
 const react={...React,useId:()=>':history-qa:',useMemo:fn=>fn(),useState:initial=>{const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],value=>states[i]=typeof value==='function'?value(states[i]):value];}};
 const module={exports:{}};
 vm.runInNewContext(compiled.outputText,{module,exports:module.exports,require:name=>name==='react'?react:name==='@/lib/synthetic-workforce-history'?{...history,...overrides}:name==='@/lib/dashboard-scope'?scopeModel:require(name)});
 let props={filters,scopeReceipt:receipt(),loading:false};
 return {api:module.exports,render(next={}){props={...props,...next};const outer=module.exports.SyntheticWorkforceHistory(props);if(typeof outer.type!=='function'){states=[];lastKey=undefined;return outer;}if(outer.key!==lastKey){states=[];lastKey=outer.key;}cursor=0;return outer.type(outer.props);},states:()=>states};
}
function nodes(tree){if(!tree||typeof tree!=='object')return[];if(Array.isArray(tree))return tree.flatMap(nodes);if(typeof tree.type==='function')return nodes(tree.type(tree.props));return[tree,...nodes(tree.props?.children)];}
function text(tree){if(tree===null||tree===undefined||typeof tree==='boolean')return'';if(typeof tree!=='object')return String(tree);if(Array.isArray(tree))return tree.map(text).join('');if(typeof tree.type==='function')return text(tree.type(tree.props));return text(tree.props?.children);}
const find=(tree,predicate)=>{const n=nodes(tree).find(predicate);assert.ok(n,'Expected control');return n;};
const button=(tree,label)=>find(tree,n=>n.type==='button'&&(n.props['aria-label']??text(n))===label);
const select=(tree,label)=>find(tree,n=>n.type==='select'&&n.props['aria-label']===label);
const click=(tree,label)=>button(tree,label).props.onClick();
const choose=(tree,label,value)=>select(tree,label).props.onChange({target:{value}});
const open=h=>{let tree=h.render();click(tree,'History and survey filters');return h.render();};

test('history opens explicitly with current modeled totals and preserves closed state without querying',()=>{
 let calls=0;const h=harness({queryWorkforceHistory:(...args)=>{calls++;return history.queryWorkforceHistory(...args);}});
 const closed=h.render();assert.equal(calls,0);assert.doesNotMatch(text(closed),/9,037 people/);assert.equal(button(closed,'History and survey filters').props['aria-expanded'],false);
 const tree=open(h);assert.match(text(tree),/9,037 people/);assert.match(text(tree),/7,028 survey respondents/);assert.match(text(tree),/Modeled history/);assert.match(text(tree),/Filters apply to this view/);assert.equal(calls,1);
 assert.match(text(tree),/not an anonymization guarantee/);assert.match(text(tree),/6 minus the raw score/);assert.match(text(tree),new RegExp(history.HISTORY_SEED));
});
test('matched review years recalculate totals, and unfavorable selects respondents rather than all people',()=>{
 const h=harness();let tree=open(h);choose(tree,'History review year','2024');tree=h.render();assert.match(text(tree),/8,636 people/);assert.match(text(tree),/6,687 survey respondents/);assert.match(text(tree),/Dec 31, 2024/);
 choose(tree,'History review year','2025');tree=h.render();assert.match(text(tree),/8,831 people/);assert.match(text(tree),/6,987 survey respondents/);
 choose(tree,'History respondent group','unfavorable');tree=h.render();const result=history.queryWorkforceHistory({...history.defaultHistoryFilters(),period:'2025',sentiment:'unfavorable'},{datasetToken:history.HISTORY_DATASET_TOKEN,bundleDigest:history.HISTORY_BUNDLE_DIGEST});assert.match(text(tree),new RegExp(result.totals.people.toLocaleString('en-US')+' respondents'));assert.doesNotMatch(text(tree),/8,831 people/);
 choose(tree,'History composition dimension','levels');tree=h.render();assert.equal(select(tree,'History composition dimension').props.value,'levels');
});
test('multiselect unions, clear/no-data, and reset use real controls without text input or storage',()=>{
 const h=harness();let tree=open(h);click(tree,'Clear business units');tree=h.render();assert.match(text(tree),/No people match/);assert.doesNotMatch(text(tree),/9,037 people/);
 for(const option of history.HISTORY_OPTIONS.orgs.slice(0,2)){find(tree,n=>n.type==='input'&&n.props['aria-label']===`business unit: ${option.label}`).props.onChange({target:{checked:true}});tree=h.render();}
 assert.equal(h.states()[1].orgs.length,2);assert.equal(new Set(h.states()[1].orgs).size,2);assert.match(text(tree),/2 business units/);
 click(tree,'Reset history filters');tree=h.render();assert.match(text(tree),/9,037 people/);assert.equal(select(tree,'History respondent group').props.value,'all');assert.equal(select(tree,'History review year').props.value,'2026');
 assert.equal(nodes(tree).some(n=>n.type==='input'&&n.props.type!=='checkbox'),false);assert.doesNotMatch(source,/localStorage|sessionStorage|fetch\(|useEffect/);
});
test('L11 small cohort and its complement show no counts, chart bars or detail totals',()=>{
 const h=harness();let tree=open(h);click(tree,'Clear levels');tree=h.render();const tiny=history.HISTORY_OPTIONS.levels.find(x=>x.value==='L11');assert.ok(tiny);find(tree,n=>n.type==='input'&&n.props['aria-label']===`level: ${tiny.label}`).props.onChange({target:{checked:true}});tree=h.render();assert.match(text(tree),/withheld for small groups/);assert.equal(nodes(tree).filter(n=>n.type==='figure').length,0);assert.equal(nodes(tree).filter(n=>n.type==='dd').length,0);assert.doesNotMatch(text(tree),/4 people|3 survey respondents/);
 click(tree,'Select all levels');tree=h.render();find(tree,n=>n.type==='input'&&n.props['aria-label']===`level: ${tiny.label}`).props.onChange({target:{checked:false}});tree=h.render();assert.match(text(tree),/withheld for small groups/);assert.doesNotMatch(text(tree),/9,033 people/);
});
test('source loading, stale or mismatched receipts remove prior history immediately and reset after valid return',()=>{
 const h=harness();let tree=open(h);choose(tree,'History review year','2024');tree=h.render();assert.match(text(tree),/8,636 people/);
 tree=h.render({loading:true});assert.match(text(tree),/Loading the selected workforce/);assert.doesNotMatch(text(tree),/8,636|Historical workforce composition/);
 tree=h.render({loading:false});assert.match(text(tree),/8,636 people/);assert.equal(select(tree,'History review year').props.value,'2024');
 tree=h.render({loading:false,scopeReceipt:{...receipt(),datasetToken:'other:1'}});assert.equal(button(tree,'History and survey filters').props.disabled,true);
 tree=h.render({scopeReceipt:receipt()});assert.equal(button(tree,'History and survey filters').props['aria-expanded'],false);click(tree,'History and survey filters');tree=h.render();assert.match(text(tree),/9,037 people/);
 const selected={...filters,org:history.HISTORY_OPTIONS.orgs[0].value};tree=h.render({filters:selected,scopeReceipt:receipt()});assert.equal(button(tree,'History and survey filters').props.disabled,true);tree=h.render({scopeReceipt:receipt(selected)});click(tree,'History and survey filters');tree=h.render();assert.deepEqual([...h.states()[1].orgs],[selected.org]);assert.equal(select(tree,'History review year').props.value,'2026');
});
test('new model supports verified country/level scope independently from unavailable legacy ratings',()=>{
 const selected={country:history.HISTORY_OPTIONS.countries[0].value,org:'all',level:'all'},h=harness();const tree=h.render({filters:selected,scopeReceipt:receipt(selected)});assert.equal(button(tree,'History and survey filters').props.disabled,undefined);assert.ok(h.api.historyScopeKey(selected,receipt(selected)));assert.equal(h.api.historyScopeKey(selected,{...receipt(selected),cutoff:'2025-12-31'}),null);
});
test('closing/reopening retains this visit filters; a fresh mount starts from current scope',()=>{
 const h=harness();let tree=open(h);choose(tree,'History review year','2024');tree=h.render();click(tree,'Current ratings');tree=h.render();assert.doesNotMatch(text(tree),/8,636 people/);click(tree,'History and survey filters');tree=h.render();assert.match(text(tree),/8,636 people/);assert.match(text(open(harness())),/9,037 people/);
});
test('suppressed cells render Withheld with no numeric bar or percentage',()=>{
 const base=history.queryWorkforceHistory(history.defaultHistoryFilters(),{datasetToken:history.HISTORY_DATASET_TOKEN,bundleDigest:history.HISTORY_BUNDLE_DIGEST});const h=harness({queryWorkforceHistory:()=>({...base,ratings:[{id:'protected',label:'Protected rating',count:null,percent:null,status:'suppressed'}]})});const tree=open(h);const figure=find(tree,n=>n.type==='figure'&&n.props['aria-label']==='Historical ratings distribution');assert.match(text(figure),/Protected ratingWithheld/);assert.equal(nodes(figure).some(n=>n.props?.style?.width!==undefined),false);assert.doesNotMatch(renderToStaticMarkup(figure),/NaN|undefined%|width:0%/);
});

test('history view replaces current ratings while keeping original available',()=>{const h=harness();let tree=h.render({children:React.createElement('p',null,'Original current ratings')});assert.match(text(tree),/Original current ratings/);click(tree,'History and survey filters');tree=h.render();assert.doesNotMatch(text(tree),/Original current ratings/);click(tree,'Current ratings');tree=h.render();assert.match(text(tree),/Original current ratings/);});
