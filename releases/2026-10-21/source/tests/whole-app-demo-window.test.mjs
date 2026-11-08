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

test('document keyboard containment survives unmounted focused controls and cleans up',()=>{
 assert.match(source,/document.addEventListener\('keydown',keydown,true\)/);
 assert.match(source,/document.removeEventListener\('keydown',keydown,true\)/);
 assert.match(source,/const leave=useEffectEvent\(onExit\)/);
 assert.equal((source.match(/event.key==='Escape'/g)??[]).length,1);
 assert.match(source,/document.activeElement===document.body\|\|document.activeElement===document.documentElement/);
});

test('bounded popup retains only an inert visual snapshot behind the stable live app',()=>{
 assert.match(source,/key="live-app"/);assert.match(source,/copy.inert=true/);assert.match(source,/host\?\.replaceChildren\(\)/);
 assert.match(source,/ids.set\(old,replacement\)/);assert.match(source,/node.removeAttribute\('href'\)/);
 const css=fs.readFileSync(new URL('../components/whole-app-demo-window.module.css',import.meta.url),'utf8');
 assert.match(css,/width:min\(1100px,calc\(100vw - 80px\)\)/);assert.match(css,/height:82dvh/);assert.match(css,/width:calc\(100vw - 24px\)/);
});

test('background snapshot is captured only by the explicit launch event',()=>{
 assert.match(source,/window.addEventListener\('whole-app-demo-start',capture\)/);
 assert.match(source,/window.removeEventListener\('whole-app-demo-start',capture\)/);
 assert.doesNotMatch(source,/MutationObserver\(capture\)/);
 assert.doesNotMatch(source,/addEventListener\('(?:scroll|resize)',capture/);
 assert.match(source,/source,title'/);
});

test('actual sidebar destinations and mobile disclosure use the same gated tour contract',()=>{
 const sidebar=fs.readFileSync(new URL('../components/app-sidebar.tsx',import.meta.url),'utf8');
 assert.match(sidebar,/data-tour-page=\{item.page\} data-nav-destination=\{item.page\}/);
 assert.match(sidebar,/data-tour-page=\{page\}\s+data-nav-destination=\{page\}/);
 assert.match(sidebar,/data-tour-menu popoverTarget="phone-navigation"/);
 assert.match(source,/destinations.some\(visible\)/);
 assert.match(source,/surface.addEventListener\('toggle',refresh,true\)/);
 assert.match(source,/surface.removeEventListener\('toggle',refresh,true\)/);
 assert.doesNotMatch(sidebar,/<aside[^>]*data-tour-menu/);
});

test('phone navigation stays bounded only within the guided popup',()=>{
 const css=fs.readFileSync(new URL('../components/whole-app-demo-window.module.css',import.meta.url),'utf8');
 const drawer=css.match(/\.window :global\(\.app-sidebar\[popover\]:popover-open\) \{([^}]+)\}/)?.[1];
 assert.ok(drawer);assert.match(drawer,/top:var\(--tour-menu-top,20dvh\)/);assert.match(drawer,/bottom:auto; margin:0 auto/);
 assert.match(drawer,/width:min\(280px,calc\(100vw - 48px\)\)/);
 assert.match(drawer,/height:auto; max-height:var\(--tour-menu-height,60dvh\); overflow-y:auto/);
 assert.match(drawer,/border-radius:12px/);
});

test('phase changes and tour exit retire native top-layer navigation',()=>{
 assert.match(source,/return\(\)=>\{for\(const node of surface.querySelectorAll<HTMLElement>\('\[popover\]'\)\)/);
 assert.match(source,/typeof node.hidePopover==='function'&&node.matches\(':popover-open'\)\)node.hidePopover\(\)/);
 assert.match(source,/\[active,title,nextPage\]/);
});

test('phone menu starts below the coach and restores measured variables on cleanup',()=>{
 assert.match(source,/coach.getBoundingClientRect\(\).bottom\+8/);
 assert.match(source,/surface!\.getBoundingClientRect\(\).bottom-8/);
 assert.match(source,/style.removeProperty\('--tour-menu-top'\)/);
 assert.match(source,/style.removeProperty\('--tour-menu-height'\)/);
});
