import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const exports={};
const source=fs.readFileSync(new URL('../components/whole-app-demo-window.tsx',import.meta.url),'utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>({})});
const target=(selector,page)=>({closest:query=>query===selector?{getAttribute:()=>page}:null});
test('only prescribed navigation, safe disclosures, coach and real plan controls are admitted',()=>{
 const allowed=exports.wholeAppDemoTargetAllowed;
 for(const selector of ['[data-tour-controls]','[data-whole-app-demo-plan]','[data-tour-menu]','summary'])assert.equal(allowed(target(selector)),true);
 assert.equal(allowed(target('[data-tour-page]','workforce'),'workforce'),true);
 assert.equal(allowed(target('[data-tour-page]','home'),'workforce'),false);
 assert.equal(allowed(target('[data-tour-page]','home')),false);
 assert.equal(allowed(target('button')),false);
});
test('window preserves keyed app content and restores original inert state',()=>{
 assert.match(source,/key="app-content"/);assert.match(source,/node.inert=prior.inert/);
 assert.match(source,/observer.disconnect\(\)/);assert.match(source,/document.body.style.overflow=previous/);
 assert.match(source,/event.key==='Escape'/);assert.match(source,/event.key==='Tab'/);
});

test('phase changes reset internal scroll and announce coach without mutation focus stealing',()=>{
 assert.match(source,/content.current.scrollTop=0/);assert.match(source,/heading.current\?\.focus\(\{preventScroll:true\}\)/);
 assert.match(source,/\[active,title,nextPage\]/);assert.match(source,/<h2 ref=\{heading\} tabIndex=\{-1\}/);
 assert.match(source,/focused===heading.current/);assert.match(source,/restoreHighlights\(\)/);
 const refresh=source.split('function refresh(){')[1].split('refresh();const observer')[0];assert.doesNotMatch(refresh,/\.focus\(/);
});
